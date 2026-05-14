import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";

export function PublicFooter() {
  return (
    <footer
      className="border-t bg-white/80 backdrop-blur-xl"
      style={{ borderColor: "var(--border-soft)" }}
    >
      <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-3">
            <div
              className="grid h-10 w-10 place-items-center rounded-xl"
              style={{ background: "var(--grad-navy)", boxShadow: "var(--shadow-btn)" }}
            >
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-brand">BUMDes Inovasi Desa</p>
              <p className="text-xs text-brand-muted mt-0.5 max-w-sm">
                Sistem akuntansi & konsolidasi multi-unit untuk Badan Usaha Milik Desa.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-brand-muted">
            <Link to="/tentang" preload="intent" className="hover:text-brand transition-colors">
              Tentang
            </Link>
            <Link to="/unit-usaha" preload="intent" className="hover:text-brand transition-colors">
              Unit usaha
            </Link>
            <Link to="/transparansi" preload="intent" className="hover:text-brand transition-colors">
              Transparansi
            </Link>
            <Link to="/kontak" preload="intent" className="hover:text-brand transition-colors">
              Kontak
            </Link>
            <Link to="/login" preload="intent" className="hover:text-brand transition-colors">
              Login admin
            </Link>
          </div>
        </div>

        <div
          className="mt-8 border-t pt-5 text-xs text-brand-muted"
          style={{ borderColor: "var(--border-soft)" }}
        >
          © {new Date().getFullYear()} BUMDes Inovasi Desa. Semua hak dilindungi.
        </div>
      </div>
    </footer>
  );
}
