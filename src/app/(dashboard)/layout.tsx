import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/audit-express", label: "Audit Express" },
  { href: "/audit-complet", label: "Audit Complet" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/llmwatch", label: "LLM Watch" },
  { href: "/classements", label: "Classements" },
];

function SwissNetworkMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="MCVA Consulting"
    >
      <rect x="26" y="0" width="28" height="80" rx="4" fill="#8B2C2C" />
      <rect x="0" y="26" width="80" height="28" rx="4" fill="#8B2C2C" />
      <circle cx="40" cy="-10" r="5" fill="#D4553A" />
      <circle cx="40" cy="90" r="5" fill="#D4553A" />
      <circle cx="-10" cy="40" r="5" fill="#D4553A" />
      <circle cx="90" cy="40" r="5" fill="#D4553A" />
      <line x1="40" y1="0" x2="40" y2="-5" stroke="#8B2C2C" strokeWidth="2" />
      <line x1="40" y1="80" x2="40" y2="85" stroke="#8B2C2C" strokeWidth="2" />
      <line x1="0" y1="40" x2="-5" y2="40" stroke="#8B2C2C" strokeWidth="2" />
      <line x1="80" y1="40" x2="85" y2="40" stroke="#8B2C2C" strokeWidth="2" />
      <circle cx="40" cy="40" r="6" fill="#FFFFFF" stroke="#8B2C2C" strokeWidth="1.5" />
      <circle cx="40" cy="40" r="2.5" fill="#D4553A" />
    </svg>
  );
}

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
            {/* Swiss Network Mark + Wordmark */}
            <Link href="/" className="flex items-center gap-3">
              <SwissNetworkMark size={32} />
              <div className="flex items-center gap-1.5">
                <span
                  className="font-bold text-lg tracking-[0.12em]"
                  style={{ fontFamily: "var(--font-heading)", color: "#0E0E0E" }}
                >
                  MCVA
                </span>
                <span
                  className="w-px h-4 mx-1"
                  style={{ backgroundColor: "#D4553A" }}
                />
                <span
                  className="text-sm font-medium tracking-wide"
                  style={{ fontFamily: "var(--font-heading)", color: "#0E0E0E", opacity: 0.5 }}
                >
                  AUDIT
                </span>
              </div>
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
            <span className="text-xs font-medium tracking-[0.2em] uppercase text-muted-foreground">
              Palier 1
            </span>
          </div>
        </div>
        {/* MCVA spectrum accent bar */}
        <div
          className="h-1"
          style={{
            background: "linear-gradient(90deg, #4A1515 0%, #8B2C2C 20%, #D4553A 45%, #E8937A 65%, #F5C4B0 80%, #F8F6F1 100%)",
          }}
        />
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
