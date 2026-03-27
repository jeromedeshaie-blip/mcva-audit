import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/audit-express", label: "Audit Express" },
  { href: "/audit-complet", label: "Audit Complet" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/siteaudit", label: "Site Audit" },
  { href: "/llmwatch", label: "LLM Watch" },
  { href: "/classements", label: "Classements" },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* MCVA Logo placeholder */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">
                  +
                </span>
              </div>
              <span className="font-bold text-lg">MCVA Audit</span>
            </Link>
            <nav className="flex gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Palier 1 — Construction
            </span>
          </div>
        </div>
        {/* MCVA accent bar */}
        <div className="h-1 bg-primary" />
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
