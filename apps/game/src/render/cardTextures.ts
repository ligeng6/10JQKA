import type { Card } from '@pokergame/shared';
import { SUIT_SYMBOLS, RANK_LABELS } from './constants';

export interface CardTextures {
  [id: string]: HTMLCanvasElement;
}

/**
 * 程序化生成精美的牌面纹理（比简单绘制精美很多）
 * 生成后缓存为离屏 Canvas，渲染时直接 drawImage
 */
export function generateCardTextures(): CardTextures {
  const textures: CardTextures = {};
  const W = 160;
  const H = 224;

  // 生成 4 花色 × 13 点数 = 52 张
  const suits = ['spade', 'heart', 'diamond', 'club'] as const;
  const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];

  for (const suit of suits) {
    for (const rank of ranks) {
      const key = `${suit}-${rank}`;
      textures[key] = drawCardFace(suit, rank, W, H);
    }
  }

  // 大小王
  textures['joker-small'] = drawJoker('small', W, H);
  textures['joker-big'] = drawJoker('big', W, H);
  textures['back'] = drawCardBack(W, H);

  return textures;
}

function drawCardFace(
  suit: string,
  rank: number,
  w: number,
  h: number,
): HTMLCanvasElement {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  const isRed = suit === 'heart' || suit === 'diamond';
  const color = isRed ? '#c0392b' : '#2c3e50';
  const rankLabel = RANK_LABELS[rank] ?? String(rank);
  const symbol = SUIT_SYMBOLS[suit] ?? '';

  // 牌面背景（带微妙渐变）
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(1, '#f5f0e8');
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#d4c5a9';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 内边框
  roundRect(ctx, 8, 8, w - 16, h - 16, 10);
  ctx.strokeStyle = isRed ? 'rgba(192,57,43,0.2)' : 'rgba(44,62,80,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;

  // 左上角
  ctx.font = `bold ${Math.floor(w * 0.2)}px "Georgia", serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankLabel, w * 0.1, h * 0.06);
  ctx.font = `${Math.floor(w * 0.14)}px "Georgia", serif`;
  ctx.fillText(symbol, w * 0.1, h * 0.22);

  // 右下角（倒置）
  ctx.save();
  ctx.translate(w, h);
  ctx.rotate(Math.PI);
  ctx.font = `bold ${Math.floor(w * 0.2)}px "Georgia", serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(rankLabel, w * 0.1, h * 0.06);
  ctx.font = `${Math.floor(w * 0.14)}px "Georgia", serif`;
  ctx.fillText(symbol, w * 0.1, h * 0.22);
  ctx.restore();

  // 中央大花色
  ctx.font = `${Math.floor(w * 0.52)}px "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.85;
  ctx.fillText(symbol, w / 2, h * 0.58);
  ctx.globalAlpha = 1;

  return canvas;
}

function drawJoker(kind: 'small' | 'big', w: number, h: number): HTMLCanvasElement {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d')!;
  const isBig = kind === 'big';

  // 背景
  const grad = ctx.createLinearGradient(0, 0, w, h);
  if (isBig) {
    grad.addColorStop(0, '#e74c3c');
    grad.addColorStop(1, '#c0392b');
  } else {
    grad.addColorStop(0, '#2c3e50');
    grad.addColorStop(1, '#1a252f');
  }
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = isBig ? '#f39c12' : '#3498db';
  ctx.lineWidth = 3;
  ctx.stroke();

  // 装饰纹样
  ctx.save();
  ctx.globalAlpha = 0.15;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w * 0.15 + i * w * 0.06, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();

  // 王字
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(w * 0.32)}px "Georgia", serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isBig ? '大' : '小', w / 2, h * 0.32);

  ctx.font = `bold ${Math.floor(w * 0.32)}px "Georgia", serif`;
  ctx.fillText('王', w / 2, h * 0.62);

  // 底部星星
  ctx.font = `${Math.floor(w * 0.12)}px sans-serif`;
  ctx.fillText('★', w / 2, h * 0.85);

  return canvas;
}

function drawCardBack(w: number, h: number): HTMLCanvasElement {
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext('2d')!;

  // 背景
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#2980b9');
  grad.addColorStop(1, '#1a5276');
  roundRect(ctx, 0, 0, w, h, 14);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.strokeStyle = '#154360';
  ctx.lineWidth = 2;
  ctx.stroke();

  // 菱形网格纹
  ctx.save();
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  const step = w / 6;
  for (let x = -h; x < w + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + h, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + h, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.restore();

  // 中心圆装饰
  ctx.beginPath();
  ctx.arc(w / 2, h / 2, w * 0.28, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.font = `${Math.floor(w * 0.18)}px sans-serif`;
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♠', w / 2, h / 2);

  return canvas;
}

function createCanvas(w: number, h: number): HTMLCanvasElement {
  // 小游戏环境用 wx.createCanvas，浏览器用 document
  if (typeof wx !== 'undefined' && wx.createCanvas) {
    return wx.createCanvas();
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  return canvas;
}

function roundRect(
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

declare const wx: any;
declare const document: any;
