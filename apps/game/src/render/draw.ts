import type { Card } from '@pokergame/shared';
import { COLORS, SIZES, SUIT_SYMBOLS, RANK_LABELS } from './constants';
import type { CardTextures } from './cardTextures';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function getTexture(card: Card, textures: CardTextures): HTMLCanvasElement | null {
  if (card.kind === 'joker') {
    return textures[card.joker === 'big' ? 'joker-big' : 'joker-small'] ?? null;
  }
  return textures[`${card.suit}-${card.rank}`] ?? null;
}

export function drawCard(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  w: number = SIZES.CARD_W,
  h: number = SIZES.CARD_H,
  selected: boolean = false,
  textures?: CardTextures,
): void {
  // 优先用纹理
  if (textures) {
    const tex = getTexture(card, textures);
    if (tex) {
      ctx.save();
      if (selected) {
        ctx.shadowColor = COLORS.CARD_SELECTED;
        ctx.shadowBlur = 16;
      }
      ctx.drawImage(tex, x, y, w, h);
      ctx.restore();

      if (selected) {
        ctx.save();
        ctx.strokeStyle = COLORS.CARD_SELECTED;
        ctx.lineWidth = 3;
        roundRect(ctx, x - 1, y - 1, w + 2, h + 2, SIZES.CARD_RADIUS + 1);
        ctx.stroke();
        ctx.restore();
      }
      return;
    }
  }

  // 回退：程序化绘制
  drawCardFallback(ctx, card, x, y, w, h, selected);
}

function drawCardFallback(
  ctx: CanvasRenderingContext2D,
  card: Card,
  x: number,
  y: number,
  w: number,
  h: number,
  selected: boolean,
): void {
  const r = SIZES.CARD_RADIUS;
  ctx.save();
  ctx.fillStyle = selected ? COLORS.CARD_SELECTED_BG : COLORS.CARD_BG;
  ctx.strokeStyle = selected ? COLORS.CARD_SELECTED : COLORS.CARD_BORDER;
  ctx.lineWidth = selected ? 3 : 1;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.stroke();

  if (card.kind === 'joker') {
    const isBig = card.joker === 'big';
    ctx.fillStyle = isBig ? COLORS.JOKER_BIG : COLORS.JOKER_SMALL;
    ctx.font = `bold ${Math.floor(w * 0.35)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isBig ? '大' : '小', x + w / 2, y + h * 0.35);
    ctx.fillText('王', x + w / 2, y + h * 0.65);
  } else {
    const isRed = card.suit === 'heart' || card.suit === 'diamond';
    ctx.fillStyle = isRed ? COLORS.CARD_RED : COLORS.CARD_BLACK;
    const rankLabel = RANK_LABELS[card.rank] ?? String(card.rank);
    const suitSymbol = SUIT_SYMBOLS[card.suit] ?? '';
    ctx.font = `bold ${Math.floor(w * 0.3)}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(rankLabel, x + w * 0.1, y + h * 0.06);
    ctx.font = `${Math.floor(w * 0.22)}px sans-serif`;
    ctx.fillText(suitSymbol, x + w * 0.1, y + h * 0.28);
    ctx.font = `${Math.floor(w * 0.45)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(suitSymbol, x + w / 2, y + h * 0.62);
  }
  ctx.restore();
}

export function drawCardBack(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number = SIZES.CARD_W,
  h: number = SIZES.CARD_H,
  textures?: CardTextures,
): void {
  if (textures && textures['back']) {
    ctx.drawImage(textures['back'], x, y, w, h);
    return;
  }
  const r = SIZES.CARD_RADIUS;
  ctx.save();
  ctx.fillStyle = '#34495e';
  ctx.strokeStyle = '#2c3e50';
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.7, r / 2);
  ctx.fill();
  ctx.restore();
}

export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function drawButton(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  ctx.save();
  // 渐变按钮
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, lightenColor(color, 20));
  grad.addColorStop(1, color);
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, SIZES.BTN_RADIUS);
  ctx.fill();
  // 高光
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, x, y, w, h / 2, SIZES.BTN_RADIUS);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${SIZES.FONT_NORMAL}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + w / 2, y + h / 2);
  ctx.restore();
}

export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number = SIZES.FONT_NORMAL,
  color: string = COLORS.TEXT_WHITE,
  align: CanvasTextAlign = 'left',
  baseline: CanvasTextBaseline = 'top',
): void {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = `${size}px sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawPanel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string = 'rgba(0,0,0,0.3)',
): void {
  ctx.save();
  ctx.fillStyle = color;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.restore();
}

export function drawTableFelt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
): void {
  ctx.save();
  // 毛毡渐变
  const grad = ctx.createRadialGradient(
    x + w / 2, y + h / 2, 0,
    x + w / 2, y + h / 2, Math.max(w, h) * 0.7,
  );
  grad.addColorStop(0, '#2d8b5e');
  grad.addColorStop(1, '#1a6b42');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 20);
  ctx.fill();
  // 边缘阴影
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

export function hitTest(rect: Rect, px: number, py: number): boolean {
  return px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, (num >> 16) + percent);
  const g = Math.min(255, ((num >> 8) & 0x00ff) + percent);
  const b = Math.min(255, (num & 0x0000ff) + percent);
  return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
}
