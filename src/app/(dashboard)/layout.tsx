import Link from "next/link";

const NAV_ITEMS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/audit-express", label: "Audit Express" },
  { href: "/audit-complet", label: "Audit Complet" },
  { href: "/benchmarks", label: "Benchmarks" },
  { href: "/llmwatch", label: "LLM Watch" },
  { href: "/classements", label: "Classements" },
];

/**
 * Logo Tessellation MCVA v2.3
 * Grille 2x2 de carres avec degrade diagonal du spectre signature.
 * Le carre bas-droite contient le drapeau suisse (croix blanche).
 * Micro-connexions Blush entre les blocs.
 */
function TessellationMark({ size = 36 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 84 84"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="tessellation-g" x1="0" y1="0" x2="84" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4A1515" />
          <stop offset="20%" stopColor="#6B2020" />
          <stop offset="40%" stopColor="#8B2C2C" />
          <stop offset="60%" stopColor="#A83D33" />
          <stop offset="80%" stopColor="#C44A38" />
          <stop offset="100%" stopColor="#D4553A" />
        </linearGradient>
      </defs>
      {/* 4 carres de la grille */}
      <rect x="2" y="2" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      <rect x="34" y="2" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      <rect x="2" y="34" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      <rect x="34" y="34" width="28" height="28" rx="4" fill="url(#tessellation-g)" />
      {/* Croix suisse dans le carre bas-droite */}
      <rect x="44" y="38" width="8" height="20" rx="1.5" fill="#F8F6F1" />
      <rect x="38" y="44" width="20" height="8" rx="1.5" fill="#F8F6F1" />
      {/* Micro-connexions Blush */}
      <line x1="30" y1="16" x2="34" y2="16" stroke="#E8937A" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      <line x1="16" y1="30" x2="16" y2="34" stroke="#E8937A" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
      <line x1="30" y1="48" x2="34" y2="48" stroke="#E8937A" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
      <line x1="48" y1="30" x2="48" y2="34" stroke="#E8937A" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
      <circle cx="31" cy="16" r="1.5" fill="#E8937A" opacity="0.35" />
      <circle cx="16" cy="31" r="1.5" fill="#E8937A" opacity="0.35" />
      <circle cx="31" cy="48" r="1.5" fill="#E8937A" opacity="0.45" />
      <circle cx="48" cy="31" r="1.5" fill="#E8937A" opacity="0.45" />
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
      {/* Header — dark abyss style matching mcva-site */}
      <header className="bg-[#0A0808]">
        <div className="max-w-7xl mx-auto px-6 h-16 md:h-20 flex items-center justify-between">
          <div className="flex items-center gap-8">
            {/* Tessellation Mark v2.3 + Wordmark */}
            <Link href="/" className="inline-flex items-center gap-3 group">
              <TessellationMark size={36} />
              <div className="flex flex-col leading-none">
                <span className="font-display font-bold text-lg tracking-[0.12em] text-white">
                  MCVA
                </span>
                <div className="w-full h-[2px] bg-[#D4553A] my-[3px]" />
                <span className="font-display font-medium text-[9px] tracking-[0.25em] uppercase whitespace-nowrap text-white/45">
                  Audit Platform
                </span>
              </div>
            </Link>
            <nav className="hidden lg:flex items-center gap-5 xl:gap-6">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-[13px] font-display font-medium text-white/70 hover:text-white uppercase tracking-widest transition-colors whitespace-nowrap"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs font-display font-medium tracking-[0.2em] uppercase text-white/50">
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
