const ADMIN_PIN = process.env.ADMIN_PIN || "8899";
const STAFF_PIN = process.env.STAFF_PIN || "1122";
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "larb-raek-phob-super-secret-key-2026";

async function computeSignature(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(AUTH_SECRET);
  const cryptoObj = globalThis.crypto;
  const key = await cryptoObj.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await cryptoObj.subtle.sign(
    "HMAC",
    key,
    encoder.encode(payload)
  );
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export function checkPin(pin: string): {
  valid: boolean;
  role?: "admin" | "scanner";
} {
  const clean = pin.trim();
  if (clean === ADMIN_PIN) return { valid: true, role: "admin" };
  if (clean === STAFF_PIN) return { valid: true, role: "scanner" };
  return { valid: false };
}

export async function generateSessionToken(role: "admin" | "scanner"): Promise<string> {
  const timestamp = Date.now().toString();
  const signature = await computeSignature(`${role}:${timestamp}`);
  return `${role}.${timestamp}.${signature}`;
}

export async function parseSessionToken(
  token?: string | null
): Promise<{ valid: boolean; role?: "admin" | "scanner" }> {
  if (!token) return { valid: false };
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };
    const [role, timestamp, signature] = parts;
    if (role !== "admin" && role !== "scanner") return { valid: false };

    const time = parseInt(timestamp, 10);
    if (isNaN(time)) return { valid: false };

    const now = Date.now();
    // Reject timestamps > 5 minutes in the future to prevent forged replay tokens
    if (time > now + 5 * 60 * 1000) {
      return { valid: false };
    }
    // Valid for 7 days
    if (now - time > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false };
    }

    const expected = await computeSignature(`${role}:${timestamp}`);
    if (safeCompare(signature, expected)) {
      return { valid: true, role: role as "admin" | "scanner" };
    }
  } catch {
    return { valid: false };
  }
  return { valid: false };
}

export async function getVerifiedStaffSession(req: Request): Promise<{
  valid: boolean;
  role?: "admin" | "scanner";
  staffId: string;
}> {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    const match = cookieHeader.match(/staff_session=([^;]+)/);
    const token = match ? decodeURIComponent(match[1]) : null;
    const { valid, role } = await parseSessionToken(token);
    if (!valid || !role) {
      return { valid: false, staffId: "anonymous" };
    }
    return {
      valid: true,
      role,
      staffId: role === "admin" ? "staff-admin" : "staff-scanner",
    };
  } catch {
    return { valid: false, staffId: "anonymous" };
  }
}
