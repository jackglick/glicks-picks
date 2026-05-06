// MLB team primary colors keyed by 2- or 3-letter abbr. Mirrors the prototype's
// TEAMS map so the gradient logo tile renders consistently.
export const TEAM_COLORS: Record<string, string> = {
  ARI: '#A71930', AZ: '#A71930',
  ATL: '#CE1141',
  BAL: '#DF4601',
  BOS: '#BD3039',
  CHC: '#0E3386',
  CWS: '#27251F', CHW: '#27251F',
  CIN: '#C6011F',
  CLE: '#00385D',
  COL: '#33006F',
  DET: '#0C2340',
  HOU: '#002D62',
  KC: '#004687', KCR: '#004687',
  LAA: '#BA0021',
  LAD: '#005A9C',
  MIA: '#00A3E0',
  MIL: '#12284B',
  MIN: '#002B5C',
  NYM: '#FF5910',
  NYY: '#003087',
  ATH: '#003831', OAK: '#003831',
  PHI: '#E81828',
  PIT: '#FDB827',
  SD: '#2F241D', SDP: '#2F241D',
  SF: '#FD5A1E', SFG: '#FD5A1E',
  SEA: '#0C2C56',
  STL: '#C41E3A',
  TB: '#092C5C', TBR: '#092C5C',
  TEX: '#003278',
  TOR: '#134A8E',
  WSH: '#AB0003', WAS: '#AB0003',
};

export function teamColor(abbr?: string): string {
  if (!abbr) return '#3a4150';
  return TEAM_COLORS[abbr.toUpperCase()] ?? '#3a4150';
}

export function americanOdds(price?: number | null): string {
  if (price == null || Number.isNaN(price)) return '—';
  return price > 0 ? `+${price}` : `${price}`;
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits)}%`;
}

export function signedPct(n: number, digits = 1): string {
  if (n > 0) return `+${n.toFixed(digits)}%`;
  if (n < 0) return `${n.toFixed(digits)}%`;
  return `${n.toFixed(digits)}%`;
}

export function formatGameTime(iso?: string): string {
  if (!iso) return '';
  // game_time is typically an ISO timestamp from Supabase; fall back to the raw
  // string if parsing fails.
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' });
}

// Approximate stars→edge mapping for the edge pill. The picks table doesn't
// expose raw edge percent — stars are the published proxy. These breakpoints
// align with how export_web.py bucketed edges historically.
export function starsToApproxEdge(stars?: number): number {
  if (!stars) return 0;
  if (stars >= 5) return 12;
  if (stars >= 4) return 9;
  if (stars >= 3) return 7;
  if (stars >= 2) return 5;
  return 3;
}

export function isOver(direction?: string): boolean {
  return (direction ?? '').toUpperCase() === 'OVER';
}

export function marketLabel(market: string): string {
  const map: Record<string, string> = {
    pitcher_strikeouts: 'Strikeouts',
    pitcher_earned_runs: 'Earned Runs',
    pitcher_outs: 'Outs',
    pitcher_hits_allowed: 'Hits Allowed',
    pitcher_walks: 'Walks',
    batter_hits: 'Hits',
    batter_total_bases: 'Total Bases',
  };
  return map[market] ?? market.replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function bookLabel(book?: string): string {
  if (!book) return '';
  const map: Record<string, string> = {
    draftkings: 'DraftKings',
    fanduel: 'FanDuel',
    betmgm: 'BetMGM',
    caesars: 'Caesars',
    williamhill_us: 'Caesars',
    pointsbet: 'PointsBet',
    betrivers: 'BetRivers',
    bovada: 'Bovada',
    bet365: 'bet365',
    fanatics: 'Fanatics',
    betonlineag: 'BetOnline',
    mybookieag: 'MyBookie',
    hardrockbet: 'Hard Rock Bet',
    espnbet: 'ESPN Bet',
    ballybet: 'Bally Bet',
  };
  return map[book.toLowerCase()] ?? book;
}
