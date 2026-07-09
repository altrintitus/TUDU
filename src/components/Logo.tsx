// TUDU wordmark — stroked letterforms from design/Logo. Uses currentColor so it
// follows the theme (light ink on dark, dark ink on light).
export function Logo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 300 106"
      fill="none"
      role="img"
      aria-label="TUDU"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* T */}
      <line x1="18" y1="12" x2="78" y2="12" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />
      <line x1="48" y1="12" x2="48" y2="88" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" />
      {/* U */}
      <path d="M 94 12 L 94 62 Q 94 88 116 88 Q 138 88 138 62 L 138 12" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* D */}
      <path d="M 158 12 L 158 88 M 158 12 Q 222 12 222 50 Q 222 88 158 88" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* U */}
      <path d="M 238 12 L 238 62 Q 238 88 260 88 Q 282 88 282 62 L 282 12" stroke="currentColor" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* accent underline */}
      <line x1="222" y1="98" x2="282" y2="98" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
