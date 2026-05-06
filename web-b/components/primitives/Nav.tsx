'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Dot } from './Dot';
import { Pill } from './Pill';

const NAV_ITEMS: { href: string; label: string; key: string }[] = [
  { href: '/picks', label: "Today's Picks", key: 'TODAY' },
  { href: '/track-record', label: 'Track Record', key: 'TRACK' },
];

function activeKey(pathname: string): string | null {
  if (pathname.startsWith('/picks')) return 'TODAY';
  if (pathname.startsWith('/track-record')) return 'TRACK';
  return null;
}

export function Nav({ livePickCount }: { livePickCount?: number }) {
  const pathname = usePathname() ?? '/';
  const active = activeKey(pathname);

  return (
    <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-3.5 border-b border-border bg-bg">
      <div className="flex items-center gap-3.5">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span
            className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center font-extrabold text-[13px] text-black"
            style={{ background: 'linear-gradient(135deg, var(--color-green), var(--color-cyan))' }}
            aria-hidden
          >
            G
          </span>
          <span className="text-[15px] font-bold tracking-[-0.01em] text-text">Glick&apos;s Picks</span>
        </Link>
        <span className="w-px h-[18px] bg-border ml-1.5" aria-hidden />
        <Pill color="var(--color-green)" border="var(--color-green-dim)">
          <Dot c="var(--color-green)" size={5} glow={false} pulse />
          LIVE{livePickCount != null ? ` · ${livePickCount} picks` : ''}
        </Pill>
      </div>

      <nav className="hidden md:flex gap-1 text-[13px]">
        {NAV_ITEMS.map(({ href, label, key }) => {
          const isActive = active === key;
          return (
            <Link
              key={key}
              href={href}
              className={`px-3.5 py-[7px] rounded-md font-medium transition-colors no-underline ${
                isActive
                  ? 'bg-surface-hi text-text border border-border'
                  : 'text-text-dim border border-transparent hover:text-text hover:bg-surface'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="hidden md:flex gap-2.5 items-center">
        <span className="font-mono text-[11px] text-text-dim">
          $5,338.36 <span className="text-green">+6.8%</span>
        </span>
        <button
          type="button"
          className="px-3.5 py-[7px] bg-green text-black rounded-md text-[12px] font-semibold cursor-not-allowed opacity-90"
          aria-label="Sign in (placeholder)"
        >
          Sign in
        </button>
      </div>

      <span className="md:hidden font-mono text-[11px] text-text-dim">B</span>
    </div>
  );
}
