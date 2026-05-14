import { Link } from "@tanstack/react-router";

export function PublicFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6 md:flex-row md:items-center md:justify-between">
        <p>© {new Date().getFullYear()} BUMDes. Sistem akuntansi & konsolidasi multi-unit.</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/tentang" preload="intent" className="hover:text-foreground">
            Tentang
          </Link>
          <Link to="/transparansi" preload="intent" className="hover:text-foreground">
            Transparansi
          </Link>
          <Link to="/kontak" preload="intent" className="hover:text-foreground">
            Kontak
          </Link>
          <Link to="/login" preload="intent" className="hover:text-foreground">
            Login admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
