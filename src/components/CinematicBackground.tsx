/**
 * Premium light "soft sky" background.
 * Kept the same export name so existing imports keep working,
 * but the visual is now white→soft-blue with subtle blue glows
 * to match the GovTech / fintech design system.
 */
export function CinematicBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base wash */}
      <div className="absolute inset-0 bg-grad-soft" />

      {/* Soft drifting blue blobs */}
      <div
        className="absolute -top-40 -left-40 h-[40rem] w-[40rem] rounded-full animate-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(47,111,237,0.18), transparent 70%)",
        }}
      />
      <div
        className="absolute -bottom-48 -right-40 h-[36rem] w-[36rem] rounded-full animate-drift"
        style={{
          background:
            "radial-gradient(circle, rgba(15,42,95,0.14), transparent 70%)",
          animationDelay: "-10s",
        }}
      />
      <div
        className="absolute top-1/3 right-1/4 h-[22rem] w-[22rem] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(111,160,255,0.18), transparent 70%)",
        }}
      />

      {/* Subtle grid */}
      <div className="absolute inset-0 grid-bg opacity-60" />

      {/* Soft top vignette to add depth */}
      <div
        className="absolute inset-x-0 top-0 h-[40vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.6), transparent)",
        }}
      />
    </div>
  );
}
