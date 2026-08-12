/*
  Generated placeholder artwork.

  Stock photography would undercut the whole point — three brands sharing one
  component layer should look distinct because their *tokens* differ, not because
  someone sourced different photos. So imagery is a token too: each brand picks a
  visual language, and every product's composition is derived from its own seed.

  Two axes, deliberately separated:

    - The *language* is per brand and never varies. Arcs are always concentric and
      organic; grids are always orthogonal; geometric is always angular. A Rook &
      Ridge product cannot accidentally render a Northaven-looking image.
    - The *composition* is per product. Shape count, scale, rotation, position,
      layering order and which palette entries get used all derive from the seed,
      so no two items in a catalogue look alike.

  Deterministic in, deterministic out: the same product renders identically on
  every request and every deploy. Pure SVG, no raster assets, no network request,
  and it scales to any viewport — which is most of why mobile page weight stays low.
*/

type Props = {
  seed: number;
  treatment: string;
  className?: string;
  /** Looser, larger composition for hero and detail placements. */
  hero?: boolean;
};

/** Deterministic PRNG. Same seed, same picture, forever. */
function rng(seed: number) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const PALETTE = [
  "var(--t-primary)",
  "var(--t-secondary)",
  "var(--t-accent)",
  "var(--t-surface-brand)",
];

/** Picks a palette entry, weighted so accent stays rare and deliberate. */
function pick(r: () => number, allowAccent: boolean): string {
  const n = r();
  if (allowAccent && n > 0.86) return PALETTE[2];
  if (n > 0.58) return PALETTE[1];
  if (n > 0.24) return PALETTE[0];
  return PALETTE[3];
}

/* --------------------------------------------------------------------------
   Arc — Rook & Ridge. Organic, concentric, off-centre. Rings and crescents.
   -------------------------------------------------------------------------- */
function Arc({ seed, hero }: { seed: number; hero: boolean }) {
  const r = rng(seed);
  const rings = 3 + Math.floor(r() * (hero ? 4 : 3));
  const cx = 18 + r() * 64;
  const cy = 22 + r() * 60;
  const spread = 9 + r() * 12;
  const rot = r() * 360;
  const accentRing = Math.floor(r() * rings);

  return (
    <>
      <rect width="100" height="100" fill="var(--t-surface-raise)" />
      <g transform={`rotate(${rot} 50 50)`}>
        {Array.from({ length: rings }).map((_, i) => {
          const radius = 10 + i * spread + r() * 5;
          const isAccent = i === accentRing;
          // Some rings are full circles, some are open crescents.
          const open = r() > 0.55;
          const dash = open ? `${radius * 2.6} ${radius * 6.3}` : undefined;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={isAccent ? PALETTE[2] : pick(r, false)}
              strokeWidth={isAccent ? 2.1 : 0.7 + r() * 1.5}
              strokeLinecap="round"
              strokeDasharray={dash}
              opacity={isAccent ? 0.95 : 0.3 + r() * 0.45}
            />
          );
        })}
      </g>
      <circle cx={cx} cy={cy} r={2 + r() * 4} fill={pick(r, true)} opacity={0.9} />
    </>
  );
}

/* --------------------------------------------------------------------------
   Grid — Northaven. Structured, orthogonal, engineered. Modular blocks.
   -------------------------------------------------------------------------- */
function Grid({ seed, hero }: { seed: number; hero: boolean }) {
  const r = rng(seed);
  const cols = (hero ? 7 : 5) + Math.floor(r() * 4);
  const cell = 100 / cols;
  const density = 0.16 + r() * 0.2;

  const cells: { i: number; w: number; fill: string; op: number }[] = [];
  for (let i = 0; i < cols * cols; i++) {
    if (r() > density) continue;
    // Occasional double-width blocks break the uniformity without breaking the grid.
    const w = r() > 0.82 ? 2 : 1;
    if ((i % cols) + w > cols) continue;
    const accent = r() > 0.88;
    cells.push({
      i,
      w,
      fill: accent ? PALETTE[2] : pick(r, false),
      op: accent ? 0.95 : 0.22 + r() * 0.6,
    });
  }

  return (
    <>
      <rect width="100" height="100" fill="var(--t-surface-raise)" />
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={i * cell}
          y1="0"
          x2={i * cell}
          y2="100"
          stroke="var(--t-border)"
          strokeWidth="0.35"
        />
      ))}
      {Array.from({ length: cols + 1 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1="0"
          y1={i * cell}
          x2="100"
          y2={i * cell}
          stroke="var(--t-border)"
          strokeWidth="0.35"
        />
      ))}
      {cells.map(({ i, w, fill, op }) => (
        <rect
          key={i}
          x={(i % cols) * cell}
          y={Math.floor(i / cols) * cell}
          width={cell * w}
          height={cell}
          fill={fill}
          opacity={op}
        />
      ))}
    </>
  );
}

/* --------------------------------------------------------------------------
   Geometric — Foundry. Angular, kinetic, overlapping. Triangles and bars.
   -------------------------------------------------------------------------- */
function Geometric({ seed, hero }: { seed: number; hero: boolean }) {
  const r = rng(seed);
  const count = 3 + Math.floor(r() * (hero ? 5 : 4));
  const accentAt = Math.floor(r() * count);

  return (
    <>
      <rect width="100" height="100" fill="var(--t-surface-raise)" />
      {Array.from({ length: count }).map((_, i) => {
        const size = 20 + r() * (hero ? 52 : 40);
        const x = -6 + r() * (100 - size * 0.5);
        const y = -6 + r() * (100 - size * 0.5);
        const rot = r() * 360;
        const accent = i === accentAt;
        const fill = accent ? PALETTE[2] : pick(r, false);
        // Opacity floor of 0.2 — below that the brand colour washes out to grey
        // and the shapes read as loading skeletons.
        const op = accent ? 0.94 : 0.2 + r() * 0.55;
        const kind = Math.floor(r() * 3);
        const t = `rotate(${rot} ${x + size / 2} ${y + size / 2})`;

        if (kind === 0) {
          return (
            <polygon
              key={i}
              points={`${x + size / 2},${y} ${x + size},${y + size} ${x},${y + size}`}
              fill={fill}
              opacity={op}
              transform={t}
            />
          );
        }
        if (kind === 1) {
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width={size}
              height={size * (0.16 + r() * 0.2)}
              fill={fill}
              opacity={op}
              transform={t}
            />
          );
        }
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={size}
            height={size}
            fill={fill}
            opacity={op}
            transform={t}
          />
        );
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
