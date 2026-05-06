'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS: { href: string; label: string; icon: string; matches: (p: string) => boolean }[] = [
  { href: '/', label: 'Home', icon: '⌂', matches: (p) => p === '/' },
  { href: '/picks', label: 'Picks', icon: '◆', matches: (p) => p.startsWith('/picks') },
  { href: '/track-record', label: 'Track', icon: '▲', matches: (p) => p.startsWith('/track-record') },
];

export function MTabs() {
  const pathname = usePathname() ?? '/';
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-20 h-16 border-t border-border flex"
      style={{ background: 'rgba(10, 12, 15, 0.94)', backdropFilter: 'blur(12px)' }}
      aria-label="Primary mobile"
    >
      {TABS.map((t) => {
        const active = t.matches(pathname);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 no-underline ${
              active ? 'text-green' : 'text-text-faint'
            }`}
          >
            <span className="text-[18px] leading-none" aria-hidden>{t.icon}</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.1em]">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
