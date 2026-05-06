// Schema mirrors the actual Supabase tables that A queries today.
// Field optionality reflects what the legacy JS treats as defensible — keep
// strict only where every consumer relies on the field.

export type BookPrice = {
  book?: string;
  name?: string;
  line?: number;
  price?: number;
  odds?: number;
};

export type Pick = {
  season: number;
  date: string;
  game_pk?: number;
  game_time?: string;
  player: string;
  player_id?: number;
  player_team?: string;
  team?: string;
  home_team?: string;
  away_team?: string;
  opponent?: string;
  category?: 'pitcher' | 'batter' | string;
  market: string;
  direction: 'OVER' | 'UNDER' | string;
  line: number;
  best_book?: string;
  best_price?: number;
  book_prices?: BookPrice[];
  stars?: number;
  sizing?: number;
  result?: 'W' | 'L' | 'P' | null;
  actual?: number | null;
  pnl?: number | null;
  bbref_id?: string;
  injury_flag?: boolean;
  injury_note?: string;
  clv_cents?: number;
  clv_favorable?: boolean;
};

export type BankrollPoint = {
  date: string;
  flat: number;
  pct: number;
  n_bets?: number;
  flat_day_pnl?: number;
  pct_day_pnl?: number;
};

export type MarketStat = {
  season?: number;
  market: string;
  category?: string;
  dataset?: string;
  bets: number;
  wins: number;
  losses: number;
  pushes?: number;
  win_rate: number;
  roi: number;
};

export type SeasonSummaryRow = {
  season: number;
  updated_at?: string;
  summary: {
    total_bets: number;
    wins: number;
    losses: number;
    pushes: number;
    win_rate: number;
    initial_bankroll: number;
    bet_roi?: number;
    flat?: { final_bankroll: number; return_pct: number; max_drawdown_pct?: number };
    pct?: { final_bankroll: number; return_pct: number };
  } | null;
  player_attention?: unknown;
};
