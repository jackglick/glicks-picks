export function Dot({
  c = 'var(--color-green)',
  size = 6,
  glow = true,
  pulse = false,
}: {
  c?: string;
  size?: number;
  glow?: boolean;
  pulse?: boolean;
}) {
  return (
    <span
      className={`inline-block rounded-full ${pulse ? 'b-live-glow' : ''}`}
      style={{
        width: size,
        height: size,
        background: c,
        boxShadow: glow && !pulse ? `0 0 8px ${c}` : undefined,
      }}
    />
  );
}
