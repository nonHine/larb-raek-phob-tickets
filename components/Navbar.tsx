import Link from "next/link";
import { EVENT } from "@/config/event.config";
import { Search } from "lucide-react";

export function Navbar() {
  return (
    <header className="w-full bg-surface border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-40">
      <Link href="/" className="flex items-center gap-2 group">
        <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white font-bold text-sm shadow-sm group-hover:bg-brand-pressed transition-colors">
          ลบ
        </div>
        <div className="flex flex-col">
          <span className="font-semibold text-content text-base leading-tight">
            {EVENT.name}
          </span>
          <span className="text-xs text-content-muted">
            {EVENT.venue}
          </span>
        </div>
      </Link>

      <Link
        href="/orders/lookup"
        className="flex items-center gap-1.5 text-xs font-medium text-content-muted hover:text-brand px-2.5 py-1.5 rounded-lg border border-border hover:border-brand/40 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span>หาออเดอร์ของฉัน</span>
      </Link>
    </header>
  );
}
