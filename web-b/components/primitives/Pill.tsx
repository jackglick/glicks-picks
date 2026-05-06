import { CSSProperties, ReactNode } from 'react';

export function Pill({
  children,
  color,
  bg = 'transparent',
  border,
  className = '',
}: {
  children: ReactNode;
  color?: string;
  bg?: string;
  border?: string;
  className?: string;
}) {
  const style: CSSProperties = {
    color: color ?? 'var(--color-text)',
    background: bg,
    borderColor: border ?? 'var(--color-border)',
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-[3px] font-mono text-[10px] uppercase tracking-[0.06em] font-medium border rounded-[4px] ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}
