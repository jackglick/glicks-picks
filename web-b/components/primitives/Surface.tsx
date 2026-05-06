import { CSSProperties, ReactNode } from 'react';

export function Surface({
  children,
  hi = false,
  className = '',
  style,
}: {
  children: ReactNode;
  hi?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`border border-border rounded-[10px] ${hi ? 'bg-surface-hi' : 'bg-surface'} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
