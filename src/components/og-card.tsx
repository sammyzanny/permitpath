/**
 * Shared layout for the Open Graph / social preview images rendered by
 * `opengraph-image.tsx` routes (next/og → Satori). Satori only supports a
 * subset of CSS: flexbox, no grid, inline styles only.
 */

export const OG_SIZE = { width: 1200, height: 630 };

const NAVY = "#0f172a";
const GREEN = "#10b981";

/** The TownCert mark: village hall carrying a certification seal (same as icon.svg). */
export function OgMark({ size = 120 }: { size?: number }) {
  return (
    <svg viewBox="0 0 512 512" width={size} height={size}>
      <rect width="512" height="512" rx="112" fill={NAVY} />
      <path d="M256 84 L428 196 H84 Z" fill="#fff" />
      <rect x="100" y="204" width="312" height="30" rx="4" fill="#fff" />
      <rect x="118" y="246" width="40" height="124" rx="6" fill="#fff" />
      <rect x="196" y="246" width="40" height="124" rx="6" fill="#fff" />
      <rect x="276" y="246" width="40" height="124" rx="6" fill="#fff" />
      <rect x="354" y="246" width="40" height="124" rx="6" fill="#fff" />
      <rect x="100" y="382" width="312" height="26" rx="4" fill="#fff" />
      <rect x="84" y="416" width="344" height="24" rx="4" fill="#fff" />
      <circle cx="392" cy="388" r="88" fill={NAVY} />
      <circle cx="392" cy="388" r="70" fill={GREEN} />
      <path d="M354 390 L381 417 L432 358" fill="none" stroke="#fff" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function OgCard(props: { eyebrow: string; title: string; subtitle: string; chips?: string[]; footer: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        color: "#fff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <OgMark size={96} />
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>TownCert</div>
          <div style={{ fontSize: 24, color: "#94a3b8" }}>{props.eyebrow}</div>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ fontSize: props.title.length > 40 ? 56 : 68, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1.5 }}>{props.title}</div>
        <div style={{ fontSize: 30, color: "#cbd5e1", lineHeight: 1.3 }}>{props.subtitle}</div>
        {props.chips && props.chips.length > 0 ? (
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {props.chips.map((c) => (
              <div key={c} style={{ display: "flex", padding: "10px 20px", borderRadius: 999, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 26 }}>
                {c}
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 26, color: "#94a3b8" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 14, height: 14, borderRadius: 999, background: GREEN }} />
          <div>{props.footer}</div>
        </div>
        <div style={{ fontWeight: 600, color: "#e2e8f0" }}>towncert.com</div>
      </div>
    </div>
  );
}
