export function CrackerLoader({
  label,
  variant = "order",
}: {
  label?: string;
  variant?: "order" | "track";
}) {
  return (
    <div className="flex flex-col items-center gap-3" role="status" aria-live="polite">
      {variant === "order" ? <ChakraLoader /> : <FuseLoader />}
      {label && (
        <p className="cracker-text text-center text-sm font-semibold text-primary">{label}</p>
      )}
    </div>
  );
}

/* Spinning ground chakra (wheel) with sparks — shown while placing an order */
function ChakraLoader() {
  return (
    <div className="relative flex h-16 w-16 items-center justify-center">
      <svg viewBox="0 0 64 64" className="chakra-wheel h-14 w-14" aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill="none" stroke="var(--color-gold)" strokeWidth="3" />
        <circle
          cx="32"
          cy="32"
          r="18"
          fill="var(--color-primary)"
          stroke="var(--color-gold)"
          strokeWidth="1.5"
        />
        {Array.from({ length: 8 }).map((_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={32 + Math.cos(a) * 6}
              y1={32 + Math.sin(a) * 6}
              x2={32 + Math.cos(a) * 24}
              y2={32 + Math.sin(a) * 24}
              stroke="var(--color-gold)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          );
        })}
        <circle cx="32" cy="32" r="5" fill="var(--color-gold)" />
      </svg>
      {/* sparks flying outward */}
      <span
        className="chakra-spark"
        style={{ "--sa": "0deg" } as React.CSSProperties}
        aria-hidden="true"
      />
      <span
        className="chakra-spark"
        style={{ "--sa": "60deg", animationDelay: "0.12s" } as React.CSSProperties}
        aria-hidden="true"
      />
      <span
        className="chakra-spark"
        style={{ "--sa": "140deg", animationDelay: "0.24s" } as React.CSSProperties}
        aria-hidden="true"
      />
      <span
        className="chakra-spark"
        style={{ "--sa": "210deg", animationDelay: "0.36s" } as React.CSSProperties}
        aria-hidden="true"
      />
      <span
        className="chakra-spark"
        style={{ "--sa": "290deg", animationDelay: "0.48s" } as React.CSSProperties}
        aria-hidden="true"
      />
      <span className="chakra-glow" aria-hidden="true" />
    </div>
  );
}

/* Spark racing along a winding fuse toward a cracker — shown while tracking */
function FuseLoader() {
  const path = "M6 34 C 24 14, 44 54, 64 30 S 100 20, 112 34";
  return (
    <div className="relative">
      <svg viewBox="0 0 120 52" className="h-12 w-32" aria-hidden="true">
        {/* fuse cord */}
        <path
          d={path}
          fill="none"
          stroke="oklch(0.55 0.08 60)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="5 4"
        />
        {/* cracker at the end */}
        <g transform="translate(108 24)">
          <rect
            x="0"
            y="6"
            width="9"
            height="16"
            rx="2"
            fill="var(--color-primary)"
            stroke="var(--color-gold)"
            strokeWidth="1.2"
          />
          <rect x="0" y="11" width="9" height="3" fill="var(--color-gold)" />
          <line x1="4.5" y1="6" x2="4.5" y2="2" stroke="oklch(0.55 0.08 60)" strokeWidth="1.6" />
        </g>
        {/* travelling spark */}
        <circle r="5" fill="var(--color-gold)">
          <animateMotion dur="1.6s" repeatCount="indefinite" path={path} />
        </circle>
        <circle r="9" fill="oklch(0.9 0.12 90 / 0.35)">
          <animateMotion dur="1.6s" repeatCount="indefinite" path={path} />
        </circle>
      </svg>
    </div>
  );
}
