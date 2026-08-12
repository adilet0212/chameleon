/*
  Generated placeholder artwork.

  Stock photography would undercut the whole point — three brands sharing one
  component layer should look distinct because their *tokens* differ, not because
  someone sourced different photos. So imagery is a token too: each brand picks a
  treatment, and the artwork is drawn from the product's stored artSeed.

  Deterministic in, deterministic out. The same product renders the same artwork on
  every request and every deploy, which also means these are stable under visual
  diffing rather than churning on each build.

  Pure SVG, no raster assets, no network request, and it scales to any viewport —
  which is most of why the mobile Lighthouse score holds up.
*/

type Props = {
  seed: number;
  treatment: string;
  className?: string;
  /** Larger, looser composition for hero placements. */
  hero?: boolean;
};

function rng(seed: number) {
  let s = (seed % 2147483647) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function Arc({ seed, hero }: { seed: number; hero: boolean }) {
  const r = rng(seed);
  const rings = hero ? 5 : 3;
  return (
    <>
      <rect width="100" height="100" fill="var(--t-surface-raise)" />
      {Array.from({ length: rings }).map((_, i) => {
        const radius = 18 + i * (hero ? 15 : 13) + r() * 6;
        const cx = 22 + r() * 20;
        const cy = 78 - r() * 16;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={i % 2 === 0 ? "var(--t-primary)" : "var(--t-accent)"}
            strokeWidth={i === 0 ? 1.6 : 0.9}
            opacity={0.22 + i * 0.13}
          />
        );
      })}
      <circle cx={22 + r() * 12} cy={78 - r() * 10} r={4 + r() * 3} fill="var(--t-accent)" />
    </>
  );
}

function Grid({ seed, hero }: { seed: number; hero: boolean }) {
  const r = rng(seed);
  const cols = hero ? 10 : 7;
  const cell = 100 / cols;
  const filled = new Set<number>();
  const count = Math.floor(cols * 1.6);
  for (let i = 0; i < count; i++) {
    filled.add(Math.floor(r() * cols * cols));
  }
  return (
    <>
      <rect width="100" height="100" fill="var(--t-surface-raise)" />
      {Array.from({ length: cols * cols }).map((_, i) => {
        if (!filled.has(i)) return null;
        const x = (i % cols) * cell;
        const y = Math.floor(i / cols) * cell;
        const accent = i % 5 === 0;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={cell}
            height={cell}
            fill={accent ? "var(--t-accent)" : "var(--t-primary)"}
            opacity={accent ? 0.9 : 0.13 + (i % 4) * 0.08}
          />
        );
      })}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * cell}
          y1={0}
          x2={i * cell}
          y2={100}
          stroke="var(--t-border)"
          strokeWidth={0.3}
        />
      ))}
    </>
  );
}

function Geometric({ seed, hero }: { seed: number; hero: boolean }) {
  const r = rng(seed);
  const shapes = hero ? 6 : 4;
  return (
    <>
      <rect width="100" height="100" fill="var(--t-surface-raise)" />
      {Array.from({ length: shapes }).map((_, i) => {
        const size = 22 + r() * (hero ? 42 : 30);
        const x = r() * (100 - size);
        const y = r() * (100 - size);
        const accent = i === shapes - 1;
        const kind = Math.floor(r() * 3);
        const fill = accent ? "var(--t-accent)" : "var(--t-primary)";
        // Floor raised from 0.1 — below about 0.18 the brand colour washes out to
        // a neutral grey and the shapes read as loading skeletons.
        const opacity = accent ? 0.92 : 0.18 + i * 0.13;
        if (kind === 0) {
          return (
            <rect key={i} x={x} y={y} width={size} height={size} rx={size * 0.5} fill={fill} opacity={opacity} />
          );
        }
        if (kind === 1) {
          return (
            <polygon
              key={i}
              points={`${x + size / 2},${y} ${x + size},${y + size} ${x},${y + size}`}
              fill={fill}
              opacity={opacity}
            />
          );
        }
        return <rect key={i} x={x} y={y} width={size} height={size * 0.34} rx={size * 0.17} fill={fill} opacity={opacity} />;
      })}
    </>
  );
}

export function BrandArt({ seed, treatment, className, hero = false }: Props) {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      {treatment === "grid" ? (
        <Grid seed={seed} hero={hero} />
      ) : treatment === "geometric" ? (
        <Geometric seed={seed} hero={hero} />
      ) : (
        <Arc seed={seed} hero={hero} />
      )}
    </svg>
  );
}
