import type { GameState, Card, GameMode } from '@pokergame/shared';
import { createGame, playCards, passTurn, getScores } from '@pokergame/core';
import { COLORS, SIZES } from '../render/constants';
import {
  drawCard, drawButton, drawText, drawPanel, drawTableFelt,
  hitTest, type Rect,
} from '../render/draw';
import { generateCardTextures, type CardTextures } from '../render/cardTextures';

export class GameScene {
  private state: GameState;
  private selectedCards: Card[] = [];
  private message: string = '';
  private messageTimer: number = 0;
  private myIndex = 0;
  private W: number;
  private H: number;
  private textures: CardTextures;

  private cardRects: { card: Card; rect: Rect }[] = [];
  private btnPlay: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnPass: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnRestart: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnBack: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private onBack: () => void;

  constructor(w: number, h: number, mode: GameMode, onBack: () => void) {
    this.W = w;
    this.H = h;
    this.onBack = onBack;
    this.state = createGame({ mode });
    this.textures = generateCardTextures();
  }

  update(w: number, h: number): void {
    this.W = w;
    this.H = h;
  }

  render(ctx: any): void {
    const W = this.W;
    const H = this.H;

    // 背景
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d2b1a');
    bg.addColorStop(0.5, '#1a472a');
    bg.addColorStop(1, '#0d2b1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    this.renderTopBar(ctx);
    this.renderTable(ctx);
    this.renderOpponents(ctx);
    this.renderMyHand(ctx);
    this.renderActions(ctx);
    this.renderMessage(ctx);
  }

  // ─── 顶部栏 ─────────────────────────────────────────
  private renderTopBar(ctx: any): void {
    const W = this.W;
    const barH = 48;

    drawPanel(ctx, 0, 0, W, barH, 'rgba(0,0,0,0.35)');

    // 返回按钮
    this.btnBack = { x: 12, y: 8, w: 64, h: barH - 16 };
    drawButton(ctx, '←', this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h, 'rgba(255,255,255,0.15)');

    drawText(ctx, `第${this.state.roundNumber}轮`, 100, barH / 2, 22, COLORS.TEXT_WHITE, 'left', 'middle');
    drawText(ctx, `牌库:${this.state.deck.length}`, W / 2, barH / 2, 22, COLORS.TEXT_GRAY, 'center', 'middle');

    const scores = getScores(this.state);
    drawText(ctx, `分数:${scores[this.myIndex]}`, W - 20, barH / 2, 22, COLORS.TEXT_YELLOW, 'right', 'middle');

    if (this.state.phase === 'finished') {
      const won = this.state.winnerIndexes.includes(this.myIndex);
      drawText(ctx, won ? '🏆 你赢了！' : '游戏结束', W / 2, barH + 20, 32, won ? COLORS.TEXT_YELLOW : '#ff6b6b', 'center');
    }
  }

  // ─── 对手（横屏：左右各一个，上方中间一个） ─────────
  private renderOpponents(ctx: any): void {
    const scores = getScores(this.state);
    const opponents = this.state.players.filter((p) => p.index !== this.myIndex);
    const W = this.W;
    const H = this.H;
    const pw = 120, ph = 90;

    // 上方中间
    const top = opponents[0];
    if (top) {
      const x = W / 2 - pw / 2;
      const y = 56;
      drawPanel(ctx, x, y, pw, ph);
      this.drawOpponentInfo(ctx, top, x, y, pw, ph, scores);
    }

    // 左侧
    const left = opponents[1];
    if (left) {
      const x = 16;
      const y = H / 2 - ph / 2 - 40;
      drawPanel(ctx, x, y, pw, ph);
      this.drawOpponentInfo(ctx, left, x, y, pw, ph, scores);
    }

    // 右侧
    const right = opponents[2];
    if (right) {
      const x = W - pw - 16;
      const y = H / 2 - ph / 2 - 40;
      drawPanel(ctx, x, y, pw, ph);
      this.drawOpponentInfo(ctx, right, x, y, pw, ph, scores);
    }
  }

  private drawOpponentInfo(ctx: any, p: any, x: number, y: number, w: number, h: number, scores: number[]): void {
    const isTurn = this.state.currentPlayerIndex === p.index;
    if (isTurn) {
      ctx.strokeStyle = COLORS.TEXT_YELLOW;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 12);
      ctx.stroke();
    }
    drawText(ctx, `玩家${p.index}`, x + w / 2, y + 12, 20, isTurn ? COLORS.TEXT_YELLOW : COLORS.TEXT_WHITE, 'center');
    drawText(ctx, `手牌:${p.hand.length}`, x + w / 2, y + 36, 18, COLORS.TEXT_GRAY, 'center');
    drawText(ctx, `分数:${scores[p.index]}`, x + w / 2, y + 56, 18, COLORS.TEXT_GRAY, 'center');
    if (p.benliu.length > 0) {
      drawText(ctx, `奔流:${p.benliu.length}`, x + w / 2, y + 74, 16, COLORS.TEXT_YELLOW, 'center');
    }
  }

  // ─── 牌桌中央 ─────────────────────────────────────
  private renderTable(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const tX = W * 0.22, tY = H * 0.15, tW = W * 0.56, tH = H * 0.38;

    drawTableFelt(ctx, tX, tY, tW, tH);

    const trick = this.state.currentTrick.filter((t) => !t.isPass);
    if (trick.length === 0) {
      drawText(ctx, '等待出牌...', W / 2, tY + tH / 2, 26, 'rgba(255,255,255,0.12)', 'center', 'middle');
      return;
    }

    // 横屏：牌桌内排列出牌
    const cw = 52, ch = 72, gap = 8;
    let startX = tX + 30;
    const y = tY + tH / 2 - ch / 2;

    trick.forEach((play) => {
      drawText(ctx, `P${play.playerIndex}`, startX, y - 18, 16, COLORS.TEXT_GRAY);
      play.cards.forEach((card, j) => {
        drawCard(ctx, card, startX + j * (cw + gap), y, cw, ch, false, this.textures);
      });
      startX += play.cards.length * (cw + gap) + 20;
    });
  }

  // ─── 我的手牌（横屏底部） ─────────────────────────
  private renderMyHand(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const hand = this.state.players[this.myIndex]?.hand ?? [];
    const benliu = this.state.players[this.myIndex]?.benliu ?? [];

    // 手牌区域
    const areaY = H - 160;
    drawPanel(ctx, 0, areaY, W, 160, 'rgba(0,0,0,0.25)');

    // 信息
    const info = `手牌:${hand.length}${benliu.length ? ` | 奔流:${benliu.length}` : ''}`;
    drawText(ctx, info, W / 2, areaY + 14, 18, COLORS.TEXT_GRAY, 'center');

    // 手牌（紧凑排列，可滚动）
    this.cardRects = [];
    const cw = 72, ch = 100;
    const gap = 6;
    const totalW = hand.length * (cw + gap) - gap;
    const startX = Math.max(16, (W - totalW) / 2);
    const cardY = areaY + 36;

    hand.forEach((card, i) => {
      const x = startX + i * (cw + gap);
      const selected = this.selectedCards.some((c) => c.id === card.id);
      const y = selected ? cardY - 12 : cardY;
      drawCard(ctx, card, x, y, cw, ch, selected, this.textures);
      this.cardRects.push({ card, rect: { x, y, w: cw, h: ch } });
    });
  }

  // ─── 操作按钮 ─────────────────────────────────────
  private renderActions(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const isFinished = this.state.phase === 'finished';
    const isMyTurn = this.state.currentPlayerIndex === this.myIndex;

    // 按钮区：右下角
    const bw = 110, bh = 50;
    const btnY = H - 150;
    const btnX = W - bw - 20;

    this.btnPlay = { x: 0, y: 0, w: 0, h: 0 };
    this.btnPass = { x: 0, y: 0, w: 0, h: 0 };
    this.btnRestart = { x: 0, y: 0, w: 0, h: 0 };

    if (isFinished) {
      this.btnRestart = { x: W / 2 - 80, y: H / 2 + 40, w: 160, h: 56 };
      drawButton(ctx, '再来一局', this.btnRestart.x, this.btnRestart.y, this.btnRestart.w, this.btnRestart.h, COLORS.BTN_RESTART);
    } else if (isMyTurn) {
      this.btnPlay = { x: btnX, y: btnY, w: bw, h: bh };
      this.btnPass = { x: btnX, y: btnY - bh - 12, w: bw, h: bh };
      drawButton(ctx, `出牌(${this.selectedCards.length})`, this.btnPlay.x, this.btnPlay.y, bw, bh, COLORS.BTN_PLAY);
      drawButton(ctx, '过牌', this.btnPass.x, this.btnPass.y, bw, bh, COLORS.BTN_PASS);
    } else {
      drawText(ctx, '等待其他玩家...', W - 20, btnY + bh / 2, 18, 'rgba(255,255,255,0.2)', 'right', 'middle');
    }
  }

  // ─── 提示消息 ─────────────────────────────────────
  private renderMessage(ctx: any): void {
    if (!this.message || this.messageTimer <= 0) return;
    this.messageTimer--;
    const W = this.W;
    drawPanel(ctx, W / 2 - 160, 120, 320, 44, 'rgba(0,0,0,0.7)');
    drawText(ctx, this.message, W / 2, 142, 22, '#ff6b6b', 'center', 'middle');
  }

  // ─── 触摸 ─────────────────────────────────────────
  touch(x: number, y: number): void {
    if (hitTest(this.btnBack, x, y)) {
      this.onBack();
      return;
    }

    for (const { card, rect } of this.cardRects) {
      if (hitTest(rect, x, y)) {
        this.toggleCard(card);
        return;
      }
    }

    if (this.state.phase === 'finished') {
      if (hitTest(this.btnRestart, x, y)) { this.restart(); return; }
    } else if (this.state.currentPlayerIndex === this.myIndex) {
      if (hitTest(this.btnPlay, x, y)) { this.handlePlay(); return; }
      if (hitTest(this.btnPass, x, y)) { this.handlePass(); return; }
    }
  }

  private toggleCard(card: Card): void {
    const idx = this.selectedCards.findIndex((c) => c.id === card.id);
    if (idx >= 0) this.selectedCards.splice(idx, 1);
    else this.selectedCards.push(card);
    this.message = '';
  }

  private showMessage(msg: string): void {
    this.message = msg;
    this.messageTimer = 90;
  }

  private handlePlay(): void {
    if (this.selectedCards.length === 0) { this.showMessage('请先选牌'); return; }
    const { state, error } = playCards(this.state, this.myIndex, [...this.selectedCards]);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    this.selectedCards = [];
    this.message = '';
  }

  private handlePass(): void {
    const { state, error } = passTurn(this.state, this.myIndex);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    this.selectedCards = [];
    this.message = '';
  }

  private restart(): void {
    this.state = createGame({ mode: this.state.mode });
    this.selectedCards = [];
    this.message = '';
  }
}
