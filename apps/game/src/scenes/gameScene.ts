import type { GameState, Card, GameMode } from '@pokergame/shared';
import { createGame, playCards, passTurn, getScores } from '@pokergame/core';
import { COLORS, SIZES } from '../render/constants';
import {
  drawCard,
  drawButton,
  drawText,
  drawPanel,
  drawTableFelt,
  hitTest,
  type Rect,
} from '../render/draw';
import { generateCardTextures, type CardTextures } from '../render/cardTextures';

export class GameScene {
  private state: GameState;
  private selectedCards: Card[] = [];
  private message: string = '';
  private myIndex = 0;
  private canvasW: number;
  private canvasH: number;
  private textures: CardTextures;

  private cardRects: { card: Card; rect: Rect }[] = [];
  private btnPlayRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnPassRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnRestartRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(canvasW: number, canvasH: number, mode: GameMode = 'ffa') {
    this.canvasW = canvasW;
    this.canvasH = canvasH;
    this.state = createGame({ mode });
    this.textures = generateCardTextures();
  }

  update(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasW;
    const H = this.canvasH;

    // 背景
    ctx.fillStyle = COLORS.TABLE_BG;
    ctx.fillRect(0, 0, W, H);

    this.renderTopBar(ctx);
    this.renderOpponents(ctx);
    this.renderTable(ctx);
    this.renderMyHand(ctx);
    this.renderActions(ctx);
    this.renderMessage(ctx);
  }

  private renderTopBar(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasW;
    drawPanel(ctx, SIZES.MARGIN, 40, W - SIZES.MARGIN * 2, 60);
    drawText(ctx, `第${this.state.roundNumber}轮`, SIZES.MARGIN + 16, 58, SIZES.FONT_NORMAL, COLORS.TEXT_WHITE);
    drawText(ctx, `牌库:${this.state.deck.length}`, W / 2, 58, SIZES.FONT_NORMAL, COLORS.TEXT_WHITE, 'center');
    if (this.state.phase === 'finished') {
      const won = this.state.winnerIndexes.includes(this.myIndex);
      drawText(ctx, won ? '你赢了！' : '游戏结束', W - SIZES.MARGIN - 16, 58, SIZES.FONT_NORMAL, COLORS.TEXT_YELLOW, 'right');
    }
  }

  private renderOpponents(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasW;
    const scores = getScores(this.state);
    const opponents = this.state.players.filter((p) => p.index !== this.myIndex);
    const panelW = SIZES.OPPONENT_W;
    const gap = (W - SIZES.MARGIN * 2 - panelW * 3) / 4;

    opponents.forEach((p, i) => {
      const x = SIZES.MARGIN + gap + i * (panelW + gap);
      const y = 110;
      drawPanel(ctx, x, y, panelW, SIZES.OPPONENT_H);
      drawText(ctx, `玩家${p.index}`, x + panelW / 2, y + 10, SIZES.FONT_SMALL, COLORS.TEXT_WHITE, 'center');
      drawText(ctx, `手牌:${p.hand.length}`, x + panelW / 2, y + 35, SIZES.FONT_SMALL, COLORS.TEXT_GRAY, 'center');
      drawText(ctx, `分数:${scores[p.index]}`, x + panelW / 2, y + 55, SIZES.FONT_SMALL, COLORS.TEXT_GRAY, 'center');
      if (p.benliu.length > 0) {
        drawText(ctx, `奔流:${p.benliu.length}`, x + panelW / 2, y + 75, SIZES.FONT_SMALL, COLORS.TEXT_YELLOW, 'center');
      }
    });
  }

  private renderTable(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasW;
    const H = this.canvasH;

    // 牌桌
    drawTableFelt(ctx, SIZES.MARGIN, 220, W - SIZES.MARGIN * 2, H - 560);

    const trick = this.state.currentTrick.filter((t) => !t.isPass);
    if (trick.length === 0) {
      drawText(ctx, '等待出牌...', W / 2, H / 2 - 40, SIZES.FONT_LARGE, 'rgba(255,255,255,0.15)', 'center');
      return;
    }

    const startY = H / 2 - 120;
    trick.forEach((play, i) => {
      const y = startY + i * (SIZES.CARD_H_SMALL + 20);
      drawText(ctx, `玩家${play.playerIndex}`, SIZES.MARGIN + 20, y + 10, SIZES.FONT_SMALL, COLORS.TEXT_GRAY);
      play.cards.forEach((card, j) => {
        drawCard(ctx, card, SIZES.MARGIN + 120 + j * (SIZES.CARD_W_SMALL + 6), y, SIZES.CARD_W_SMALL, SIZES.CARD_H_SMALL, false, this.textures);
      });
    });
  }

  private renderMyHand(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasW;
    const H = this.canvasH;
    const hand = this.state.players[this.myIndex]?.hand ?? [];
    const scores = getScores(this.state);
    const benliu = this.state.players[this.myIndex]?.benliu ?? [];

    drawPanel(ctx, SIZES.MARGIN, H - 320, W - SIZES.MARGIN * 2, 40);
    const info = `手牌:${hand.length} | 分数:${scores[this.myIndex]}${benliu.length ? ` | 奔流:${benliu.length}` : ''}`;
    drawText(ctx, info, W / 2, H - 308, SIZES.FONT_SMALL, COLORS.TEXT_WHITE, 'center');

    this.cardRects = [];
    const cardW = SIZES.CARD_W;
    const cardH = SIZES.CARD_H;
    const gap = SIZES.CARD_GAP;
    const totalW = hand.length * (cardW + gap) - gap;
    const startX = (W - totalW) / 2;
    const cardY = H - 270;

    hand.forEach((card, i) => {
      const x = startX + i * (cardW + gap);
      const selected = this.selectedCards.some((c) => c.id === card.id);
      const y = selected ? cardY - 16 : cardY;
      drawCard(ctx, card, x, y, cardW, cardH, selected, this.textures);
      this.cardRects.push({ card, rect: { x, y, w: cardW, h: cardH } });
    });
  }

  private renderActions(ctx: CanvasRenderingContext2D): void {
    const W = this.canvasW;
    const H = this.canvasH;
    const btnY = H - 140;
    const isMyTurn = this.state.currentPlayerIndex === this.myIndex;
    const isFinished = this.state.phase === 'finished';

    if (isFinished) {
      const bw = SIZES.BTN_W + 40;
      this.btnRestartRect = { x: (W - bw) / 2, y: btnY, w: bw, h: SIZES.BTN_H };
      drawButton(ctx, '再来一局', this.btnRestartRect.x, btnY, bw, SIZES.BTN_H, COLORS.BTN_RESTART);
      this.btnPlayRect = { x: 0, y: 0, w: 0, h: 0 };
      this.btnPassRect = { x: 0, y: 0, w: 0, h: 0 };
    } else if (isMyTurn) {
      const bw = SIZES.BTN_W;
      const gap = 30;
      const totalW = bw * 2 + gap;
      const startX = (W - totalW) / 2;
      this.btnPlayRect = { x: startX, y: btnY, w: bw, h: SIZES.BTN_H };
      this.btnPassRect = { x: startX + bw + gap, y: btnY, w: bw, h: SIZES.BTN_H };
      this.btnRestartRect = { x: 0, y: 0, w: 0, h: 0 };
      drawButton(ctx, `出牌(${this.selectedCards.length})`, startX, btnY, bw, SIZES.BTN_H, COLORS.BTN_PLAY);
      drawButton(ctx, '过牌', startX + bw + gap, btnY, bw, SIZES.BTN_H, COLORS.BTN_PASS);
    } else {
      drawText(ctx, '等待其他玩家...', W / 2, btnY + SIZES.BTN_H / 2, SIZES.FONT_NORMAL, 'rgba(255,255,255,0.2)', 'center', 'middle');
      this.btnPlayRect = { x: 0, y: 0, w: 0, h: 0 };
      this.btnPassRect = { x: 0, y: 0, w: 0, h: 0 };
      this.btnRestartRect = { x: 0, y: 0, w: 0, h: 0 };
    }
  }

  private renderMessage(ctx: CanvasRenderingContext2D): void {
    if (!this.message) return;
    const W = this.canvasW;
    drawPanel(ctx, W / 2 - 150, 200, 300, 50, COLORS.OVERLAY);
    drawText(ctx, this.message, W / 2, 225, SIZES.FONT_NORMAL, '#ff6b6b', 'center', 'middle');
  }

  touch(x: number, y: number): void {
    for (const { card, rect } of this.cardRects) {
      if (hitTest(rect, x, y)) {
        this.toggleCard(card);
        return;
      }
    }
    if (this.state.phase === 'finished') {
      if (hitTest(this.btnRestartRect, x, y)) { this.restart(); return; }
    } else if (this.state.currentPlayerIndex === this.myIndex) {
      if (hitTest(this.btnPlayRect, x, y)) { this.handlePlay(); return; }
      if (hitTest(this.btnPassRect, x, y)) { this.handlePass(); return; }
    }
  }

  private toggleCard(card: Card): void {
    const idx = this.selectedCards.findIndex((c) => c.id === card.id);
    if (idx >= 0) this.selectedCards.splice(idx, 1);
    else this.selectedCards.push(card);
    this.message = '';
  }

  private handlePlay(): void {
    if (this.selectedCards.length === 0) { this.message = '请先选牌'; return; }
    const { state, error } = playCards(this.state, this.myIndex, [...this.selectedCards]);
    if (error) { this.message = error; return; }
    this.state = state;
    this.selectedCards = [];
    this.message = '';
  }

  private handlePass(): void {
    const { state, error } = passTurn(this.state, this.myIndex);
    if (error) { this.message = error; return; }
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
