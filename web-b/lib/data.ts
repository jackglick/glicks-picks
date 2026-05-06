import { supabase } from './supabase';
import type { BankrollPoint, MarketStat, Pick, SeasonSummaryRow } from './types';

export async function fetchPicksByDate(season: number, date: string): Promise<Pick[]> {
  const { data, error } = await supabase
    .from('picks')
    .select('*')
    .eq('season', season)
    .eq('date', date)
    .order('stars', { ascending: false });
  if (error) throw error;
  return (data ?? []) as Pick[];
}

export async function fetchPicksIndex(season: number): Promise<{ date: string; n: number }[]> {
  const { data, error } = await supabase.rpc('picks_index', { p_season: season });
  if (error) throw error;
  return (data ?? []) as { date: string; n: number }[];
}

export async function fetchSeasonSummary(season: number): Promise<SeasonSummaryRow | null> {
  const { data, error } = await supabase
    .from('season_summaries')
    .select('*')
    .eq('season', season)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as SeasonSummaryRow | null;
}

export async function fetchMarketStats(season: number): Promise<MarketStat[]> {
  const { data, error } = await supabase
    .from('market_stats')
    .select('*')
    .eq('season', season);
  if (error) throw error;
  return (data ?? []) as MarketStat[];
}

export async function fetchBankrollCurve(season: number): Promise<BankrollPoint[]> {
  const { data, error } = await supabase
    .from('bankroll_curve')
    .select('*')
    .eq('season', season)
    .order('date');
  if (error) throw error;
  return (data ?? []) as BankrollPoint[];
}

export function todayISO(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}
