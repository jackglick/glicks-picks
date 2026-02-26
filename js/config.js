/* ============================================
   Glick's Picks — Config & Constants
   ============================================ */
window.GP = {};

GP.CURRENT_SEASON = '2026';
GP.AVAILABLE_SEASONS = ['2025', '2024'];

GP.BOOK_COLORS = {
  'draftkings': '#53d337',
  'fanduel': '#1493ff',
  'betmgm': '#c5a05e',
  'caesars': '#8c1d40',
  'williamhill_us': '#8c1d40',
  'pointsbet': '#e4002b',
  'betrivers': '#1a3668',
  'bovada': '#cc0000',
  'bet365': '#027b5b',
  'fanatics': '#004bed',
  'betonlineag': '#ff6600',
  'mybookieag': '#d4af37'
};

GP.BOOK_DISPLAY = {
  'draftkings': 'DraftKings',
  'fanduel': 'FanDuel',
  'betmgm': 'BetMGM',
  'caesars': 'Caesars',
  'williamhill_us': 'Caesars',
  'pointsbet': 'PointsBet',
  'betrivers': 'BetRivers',
  'bovada': 'Bovada',
  'bet365': 'bet365',
  'fanatics': 'Fanatics',
  'betonlineag': 'BetOnline',
  'mybookieag': 'MyBookie'
};

GP.TEAM_LOGO_IDS = {
  'ATH': 133, 'AZ': 109, 'ATL': 144, 'BAL': 110, 'BOS': 111,
  'CHC': 112, 'CIN': 113, 'CLE': 114, 'COL': 115, 'CWS': 145,
  'DET': 116, 'HOU': 117, 'KC': 118, 'LAA': 108, 'LAD': 119,
  'MIA': 146, 'MIL': 158, 'MIN': 142, 'NYM': 121, 'NYY': 147,
  'PHI': 143, 'PIT': 134, 'SD': 135, 'SEA': 136, 'SF': 137,
  'STL': 138, 'TB': 139, 'TEX': 140, 'TOR': 141, 'WSH': 120
};

GP.supabase = supabase.createClient(
  'https://ajjruzolkbzardssopos.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqanJ1em9sa2J6YXJkc3NvcG9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxMTgwODUsImV4cCI6MjA4NzY5NDA4NX0.Jfl4-BGDBnGvpL-qVJMBfhI3jw4-v5GTshk2Y58ts4I'
);

GP.getSeasonInt = function () {
  return parseInt(GP.getSeason(), 10);
};
