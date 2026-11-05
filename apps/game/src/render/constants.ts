export const COLORS = {
  TABLE_BG: '#1a472a',
  TABLE_FELT: '#2d8b5e',
  CARD_BG: '#ffffff',
  CARD_BORDER: '#333333',
  CARD_RED: '#d32f2f',
  CARD_BLACK: '#222222',
  CARD_SELECTED: '#ffd700',
  CARD_SELECTED_BG: '#fff8e1',
  TEXT_WHITE: '#ffffff',
  TEXT_GRAY: 'rgba(255,255,255,0.6)',
  TEXT_YELLOW: '#ffd700',
  BTN_PLAY: '#2d8b5e',
  BTN_PASS: '#666666',
  BTN_RESTART: '#d4a017',
  OVERLAY: 'rgba(0,0,0,0.5)',
  JOKER_BIG: '#ee5a24',
  JOKER_SMALL: '#0c2461',
};

export const SIZES = {
  CARD_W: 80,
  CARD_H: 112,
  CARD_W_SMALL: 56,
  CARD_H_SMALL: 78,
  CARD_RADIUS: 8,
  CARD_GAP: 10,
  CARD_GAP_SMALL: 6,
  FONT_RANK: 28,
  FONT_SUIT: 22,
  FONT_SMALL: 18,
  FONT_NORMAL: 24,
  FONT_LARGE: 36,
  BTN_W: 200,
  BTN_H: 72,
  BTN_RADIUS: 12,
  MARGIN: 20,
  OPPONENT_W: 120,
  OPPONENT_H: 100,
};

export const SUIT_SYMBOLS: Record<string, string> = {
  spade: '♠',
  heart: '♥',
  diamond: '♦',
  club: '♣',
};

export const RANK_LABELS: Record<number, string> = {
  3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
  10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
};
