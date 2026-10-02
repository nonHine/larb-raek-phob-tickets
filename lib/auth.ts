const ADMIN_PIN = process.env.ADMIN_PIN || "8899";
const STAFF_PIN = process.env.STAFF_PIN || "1122";
const AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "larb-raek-phob-super-secret-key-2026";

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36) + "_" + input.length.toString(36);
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

export function generateSessionToken(role: "admin" | "scanner"): string {
  const timestamp = Date.now().toString();
  const signature = simpleHash(`${role}:${timestamp}:${AUTH_SECRET}`);
  return `${role}.${timestamp}.${signature}`;
}

export function parseSessionToken(
  token?: string | null
): { valid: boolean; role?: "admin" | "scanner" } {
  if (!token) return { valid: false };
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { valid: false };
    const [role, timestamp, signature] = parts;
    if (role !== "admin" && role !== "scanner") return { valid: false };

    // Valid for 7 days
    const time = parseInt(timestamp, 10);
    if (isNaN(time) || Date.now() - time > 7 * 24 * 60 * 60 * 1000) {
      return { valid: false };
    }

    const expected = simpleHash(`${role}:${timestamp}:${AUTH_SECRET}`);
    if (signature === expected) {
      return { valid: true, role: role as "admin" | "scanner" };
    }
  } catch {
    return { valid: false };
  }
  return { valid: false };
}
