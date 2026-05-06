import { Pill } from './primitives/Pill';
import { Surface } from './primitives/Surface';
import { americanOdds, bookLabel, formatGameTime, isOver, marketLabel, teamColor } from '@/lib/format';
import type { Pick } from '@/lib/types';

function StarBar({ stars }: { stars: number }) {
  // 5-segment bar (one per star) instead of the prototype's 20-segment
  // confidence bar. Faithful to design: filled = green, empty = border color.
  return (
    <div className="flex gap-[2px]">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex-1 h-1 rounded-[1px]"
          style={{ background: i < stars ? 'var(--color-green)' : 'var(--color-border)' }}
        />
      ))}
    </div>
  );
}

function TeamTile({ abbr, size = 40 }: { abbr?: string; size?: number }) {
  const c = teamColor(abbr);
  const label = (abbr ?? '—').slice(0, 3).toUpperCase();
  return (
    <div
      className="rounded-lg flex items-center justify-center font-bold text-white border border-border shrink-0"
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${c}, ${c}80)`,
        fontSize: size <= 28 ? 10 : 13,
      }}
      aria-hidden
    >
      {label}
    </div>
  );
}

export function PickCard({ pick, dense = false }: { pick: Pick; dense?: boolean }) {
  const stars = pick.stars ?? 0;
  const isHighEdge = stars >= 4;
  const over = isOver(pick.direction);
  const directionColor = over ? 'var(--color-red)' : 'var(--color-blue)';
  const sideLabel = over ? 'Over' : 'Under';

  // Best price: prefer top-level columns, fall back to first book_prices entry.
  const bestPrice =
    pick.best_price ??
    (pick.book_prices && pick.book_prices.length > 0 ? pick.book_prices[0]?.price ?? pick.book_prices[0]?.odds : null);
  const bestBook = pick.best_book ?? pick.book_prices?.[0]?.book ?? pick.book_prices?.[0]?.name;
  const bookCount = pick.book_prices?.length ?? 0;

  const matchupAbbr = pick.player_team ?? pick.team;
  const oppAbbr = pick.opponent ?? (matchupAbbr === pick.home_team ? pick.away_team : pick.home_team);
  const role = pick.category === 'pitcher' ? 'Starting Pitcher' : pick.category === 'batter' ? 'Batter' : '';

  const lineMoving = false; // No line-history field in current schema; treated as stable for v1.

  return (
    <Surface className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border-soft">
        <TeamTile abbr={matchupAbbr} />
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-semibold text-text leading-tight truncate">{pick.player}</div>
          <div className="font-mono text-[10px] text-text-dim tracking-[0.06em] uppercase mt-0.5 truncate">
            {role && <>{role} · </>}
            {matchupAbbr ?? ''} {oppAbbr ? `vs ${oppAbbr}` : ''}
          </div>
        </div>
        <Pill
          color={isHighEdge ? 'var(--color-green)' : 'var(--color-amber)'}
          border={isHighEdge ? 'var(--color-green-dim)' : 'var(--color-border)'}
          bg={isHighEdge ? 'rgba(34, 224, 122, 0.06)' : 'transparent'}
        >
          {'★'.repeat(Math.max(stars, 1))} EDGE
        </Pill>
      </div>

      {/* The Call */}
      <div className="px-4 py-4 flex justify-between items-end bg-bg-2">
        <div className="min-w-0">
          <div className="font-mono text-[9px] text-text-faint uppercase tracking-[0.1em]">The Call</div>
          <div className="font-sans font-bold text-[26px] md:text-[26px] text-text mt-0.5 leading-tight tracking-[-0.02em]">
            <span style={{ color: directionColor }}>
              <span className="md:inline hidden">{sideLabel}</span>
              <span className="md:hidden inline">{over ? 'O' : 'U'}</span>
            </span>{' '}
            {pick.line}
          </div>
          <div className="text-[12px] text-text-dim">{marketLabel(pick.market)}</div>
        </div>
        <div className="text-right shrink-0 pl-3">
          <div className="font-mono text-[9px] text-text-faint uppercase tracking-[0.1em]">
            <span className="md:inline hidden">Best Price</span>
            <span className="md:hidden inline">Best</span>
          </div>
          <div className="font-mono text-[22px] font-semibold text-green mt-0.5">{americanOdds(bestPrice)}</div>
          {bestBook && <div className="text-[11px] text-text-dim">{bookLabel(bestBook)}</div>}
        </div>
      </div>

      {/* Confidence (stars) — hidden on mobile per spec */}
      {!dense && (
        <div className="px-4 py-2.5 border-t border-border-soft hidden md:block">
          <div className="flex justify-between font-mono text-[9px] text-text-faint uppercase tracking-[0.1em] mb-[5px]">
            <span>Confidence</span>
            <span className="text-text">{stars}/5 stars</span>
          </div>
          <StarBar stars={stars} />
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border-soft font-mono text-[11px] text-text-dim flex justify-between">
        <span>{formatGameTime(pick.game_time) || '—'} ET</span>
        <span>
          {bookCount} book{bookCount === 1 ? '' : 's'} ·{' '}
          {lineMoving ? <span className="text-amber">line moving</span> : <span>line stable</span>}
        </span>
      </div>
    </Surface>
  );
}

export function PickCardSkeleton() {
  return (
    <Surface className="overflow-hidden">
      <div className="px-4 py-3.5 border-b border-border-soft flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-border-soft" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-border-soft rounded w-32" />
          <div className="h-2 bg-border-soft rounded w-20 mt-2" />
        </div>
      </div>
      <div className="px-4 py-4 bg-bg-2">
        <div className="h-3 bg-border-soft rounded w-16" />
        <div className="h-7 bg-border-soft rounded w-40 mt-2" />
      </div>
      <div className="px-4 py-2.5 border-t border-border-soft">
        <div className="font-mono text-[9px] text-text-faint uppercase tracking-[0.1em]">Loading…</div>
      </div>
    </Surface>
  );
}
