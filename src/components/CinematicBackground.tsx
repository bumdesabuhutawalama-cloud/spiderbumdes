const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: Math.random() * 4 + 2,
  delay: Math.random() * 8,
  duration: 6 + Math.random() * 8,
  color: i % 3 === 0 ? "var(--neon-green)" : "var(--neon-cyan)",
}));

export function CinematicBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_-20%,oklch(0.3_0.1_200/0.4),transparent_60%)]" />

      {/* Drifting blobs */}
      <div className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle,oklch(0.5_0.18_195/0.18),transparent_70%)] animate-drift" />
      <div
        className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-[radial-gradient(circle,oklch(0.5_0.2_160/0.15),transparent_70%)] animate-drift"
        style={{ animationDelay: "-10s" }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* Scanning line */}
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[oklch(0.85_0.18_195/0.5)] to-transparent animate-scan-line" />

      {/* Glowing particles */}
      {PARTICLES.map((p) => (
        <span
          key={p.id}
          className="absolute rounded-full animate-float-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            opacity: 0.7,
          }}
        />
      ))}

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,oklch(0.08_0.02_250/0.7))]" />
    </div>
  );
}
