import type { GameState, Card, GameMode, NormalCard } from '@pokergame/shared';
import { createGame, playCards, passTurn, getScores } from '@pokergame/core';
import { isScoringCard, cardScoreValue, cardLabel } from '@pokergame/shared';
import { COLORS } from '../render/constants';
import {
  drawCard, drawButton, drawText, drawPanel, drawTableFelt,
  hitTest, type Rect,
} from '../render/draw';
import { generateCardTextures, type CardTextures } from '../render/cardTextures';
import { decideAction, pickStealTarget } from '../ai';

interface StealTarget {
  playerIndex: number;
  rect: Rect;
}

interface StealCard {
  card: Card;
  rect: Rect;
}

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

  // 偷牌选牌状态
  private stealMode: 'none' | 'select-target' | 'select-card' = 'none';
  private stealTargetIndex: number = -1;
  private stealTargetRects: StealTarget[] = [];
  private stealCardRects: StealCard[] = [];
  private pendingStealCards: Card[] = []; // 触发偷牌的8们
  private pendingStealCount: number = 0;
  private btnStealCancel: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private onBack: () => void;
  private aiTimer: number = 0;
  private readonly AI_DELAY = 40;

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
    if (this.stealMode === 'none') {
      this.processAI();
    }

    const W = this.W;
    const H = this.H;

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

    if (this.stealMode !== 'none') {
      this.renderStealOverlay(ctx);
    }

    this.renderMessage(ctx);
  }

  // ─── AI ────────────────────────────────────────────
  private processAI(): void {
    if (this.state.phase !== 'playing') return;
    const idx = this.state.currentPlayerIndex;
    if (idx === this.myIndex) { this.aiTimer = 0; return; }

    this.aiTimer++;
    if (this.aiTimer < this.AI_DELAY) return;
    this.aiTimer = 0;

    const action = decideAction(this.state, idx);
    if (action.type === 'play' && action.cards && action.cards.length > 0) {
      const stealTarget = pickStealTarget(this.state, idx);
      const { state, error } = playCards(this.state, idx, action.cards, stealTarget >= 0 ? stealTarget : undefined);
      if (!error) { this.state = state; }
      else { const { state: ps } = passTurn(this.state, idx); this.state = ps; }
    } else {
      const { state } = passTurn(this.state, idx);
      this.state = state;
    }
  }

  // ─── 顶部栏 ─────────────────────────────────────────
  private renderTopBar(ctx: any): void {
    const W = this.W;
    const barH = 48;
    drawPanel(ctx, 0, 0, W, barH, 'rgba(0,0,0,0.35)');
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

  // ─── 对手 ─────────────────────────────────────────
  private renderOpponents(ctx: any): void {
    const scores = getScores(this.state);
    const opponents = this.state.players.filter((p) => p.index !== this.myIndex);
    const W = this.W;
    const H = this.H;
    const pw = 120, ph = 90;
    const positions = [
      { x: W / 2 - pw / 2, y: 56 },
      { x: 16, y: H / 2 - ph / 2 - 40 },
      { x: W - pw - 16, y: H / 2 - ph / 2 - 40 },
    ];
    opponents.forEach((p, i) => {
      const pos = positions[i];
      if (!pos) return;
      drawPanel(ctx, pos.x, pos.y, pw, ph);
      const isTurn = this.state.currentPlayerIndex === p.index;
      if (isTurn) {
        ctx.save();
        ctx.strokeStyle = COLORS.TEXT_YELLOW;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pos.x + pw / 2, pos.y + ph / 2, Math.max(pw, ph) * 0.55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      drawText(ctx, `🤖 P${p.index}`, pos.x + pw / 2, pos.y + 12, 20, isTurn ? COLORS.TEXT_YELLOW : COLORS.TEXT_WHITE, 'center');
      drawText(ctx, `手牌:${p.hand.length}`, pos.x + pw / 2, pos.y + 36, 18, COLORS.TEXT_GRAY, 'center');
      drawText(ctx, `分数:${scores[p.index]}`, pos.x + pw / 2, pos.y + 56, 18, COLORS.TEXT_GRAY, 'center');
      if (p.benliu.length > 0) {
        drawText(ctx, `奔流:${p.benliu.length}`, pos.x + pw / 2, pos.y + 74, 16, COLORS.TEXT_YELLOW, 'center');
      }
    });
  }

  // ─── 牌桌 ─────────────────────────────────────────
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

  // ─── 手牌 ─────────────────────────────────────────
  private renderMyHand(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const hand = this.state.players[this.myIndex]?.hand ?? [];
    const benliu = this.state.players[this.myIndex]?.benliu ?? [];
    const areaY = H - 160;
    drawPanel(ctx, 0, areaY, W, 160, 'rgba(0,0,0,0.25)');
    const info = `手牌:${hand.length}${benliu.length ? ` | 奔流:${benliu.length}` : ''}`;
    drawText(ctx, info, W / 2, areaY + 14, 18, COLORS.TEXT_GRAY, 'center');
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

  // ─── 按钮 ─────────────────────────────────────────
  private renderActions(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const isFinished = this.state.phase === 'finished';
    const isMyTurn = this.state.currentPlayerIndex === this.myIndex;
    const bw = 110, bh = 50;
    const btnY = H - 150;
    const btnX = W - bw - 20;
    this.btnPlay = { x: 0, y: 0, w: 0, h: 0 };
    this.btnPass = { x: 0, y: 0, w: 0, h: 0 };
    this.btnRestart = { x: 0, y: 0, w: 0, h: 0 };

    if (isFinished) {
      this.btnRestart = { x: W / 2 - 80, y: H / 2 + 40, w: 160, h: 56 };
      drawButton(ctx, '再来一局', this.btnRestart.x, this.btnRestart.y, this.btnRestart.w, this.btnRestart.h, COLORS.BTN_RESTART);
    } else if (this.stealMode !== 'none') {
      // 偷牌模式下不显示常规按钮
    } else if (isMyTurn) {
      this.btnPlay = { x: btnX, y: btnY, w: bw, h: bh };
      this.btnPass = { x: btnX, y: btnY - bh - 12, w: bw, h: bh };
      drawButton(ctx, `出牌(${this.selectedCards.length})`, this.btnPlay.x, this.btnPlay.y, bw, bh, COLORS.BTN_PLAY);
      drawButton(ctx, '过牌', this.btnPass.x, this.btnPass.y, bw, bh, COLORS.BTN_PASS);
    } else {
      drawText(ctx, '🤖 AI 思考中...', W - 20, btnY + bh / 2, 18, 'rgba(255,255,255,0.2)', 'right', 'middle');
    }
  }

  // ─── 偷牌选牌覆盖层 ────────────────────────────────
  private renderStealOverlay(ctx: any): void {
    const W = this.W;
    const H = this.H;

    // 半透明遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    this.stealTargetRects = [];
    this.stealCardRects = [];

    if (this.stealMode === 'select-target') {
      // 步骤1：选择目标玩家
      drawText(ctx, '🎯 选择偷牌目标', W / 2, H * 0.15, 32, COLORS.TEXT_YELLOW, 'center');
      drawText(ctx, `可偷 ${this.pendingStealCount} 张`, W / 2, H * 0.15 + 40, 22, COLORS.TEXT_GRAY, 'center');

      const opponents = this.state.players.filter((p) => p.index !== this.myIndex && p.hand.length > 0);
      const pw = 180, ph = 120;
      const totalW = opponents.length * (pw + 24) - 24;
      const startX = (W - totalW) / 2;

      opponents.forEach((p, i) => {
        const x = startX + i * (pw + 24);
        const y = H * 0.35;
        drawPanel(ctx, x, y, pw, ph, 'rgba(255,255,255,0.1)');
        drawText(ctx, `🤖 P${p.index}`, x + pw / 2, y + 16, 24, COLORS.TEXT_WHITE, 'center');
        drawText(ctx, `手牌:${p.hand.length}`, x + pw / 2, y + 48, 20, COLORS.TEXT_GRAY, 'center');
        const scoreCards = p.hand.filter((c) => isScoringCard(c));
        if (scoreCards.length > 0) {
          drawText(ctx, `计分牌:${scoreCards.length}`, x + pw / 2, y + 76, 20, COLORS.TEXT_YELLOW, 'center');
        }
        this.stealTargetRects.push({ playerIndex: p.index, rect: { x, y, w: pw, h: ph } });
      });

      // 取消按钮
      this.btnStealCancel = { x: W / 2 - 60, y: H * 0.78, w: 120, h: 50 };
      drawButton(ctx, '取消', this.btnStealCancel.x, this.btnStealCancel.y, this.btnStealCancel.w, this.btnStealCancel.h, COLORS.BTN_PASS);

    } else if (this.stealMode === 'select-card') {
      // 步骤2：选择要偷的牌
      const target = this.state.players[this.stealTargetIndex];
      if (!target) { this.stealMode = 'none'; return; }

      drawText(ctx, `🎯 从 P${this.stealTargetIndex} 手中偷牌`, W / 2, H * 0.1, 32, COLORS.TEXT_YELLOW, 'center');
      drawText(ctx, '点击选择要偷的牌（可优先选计分牌）', W / 2, H * 0.1 + 40, 20, COLORS.TEXT_GRAY, 'center');

      // 显示目标手牌
      const hand = target.hand;
      const cw = 72, ch = 100, gap = 10;
      const totalW = hand.length * (cw + gap) - gap;
      const startX = Math.max(16, (W - totalW) / 2);
      const cardY = H * 0.32;

      hand.forEach((card, i) => {
        const x = startX + i * (cw + gap);
        drawCard(ctx, card, x, cardY, cw, ch, false, this.textures);

        // 计分牌高亮 + 分值标签
        if (isScoringCard(card)) {
          ctx.save();
          ctx.strokeStyle = COLORS.TEXT_YELLOW;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x - 2, cardY - 2, cw + 4, ch + 4, 10);
          ctx.stroke();
          ctx.restore();
          drawText(ctx, `${cardScoreValue(card)}分`, x + cw / 2, cardY + ch + 8, 18, COLORS.TEXT_YELLOW, 'center');
        }

        this.stealCardRects.push({ card, rect: { x, y: cardY, w: cw, h: ch } });
      });

      // 提示
      drawText(ctx, `还需偷 ${this.pendingStealCount} 张`, W / 2, H * 0.72, 22, COLORS.TEXT_GRAY, 'center');

      // 返回按钮（重新选目标）
      this.btnStealCancel = { x: W / 2 - 140, y: H * 0.82, w: 120, h: 50 };
      drawButton(ctx, '换目标', this.btnStealCancel.x, this.btnStealCancel.y, this.btnStealCancel.w, this.btnStealCancel.h, COLORS.BTN_PASS);

      // 确认偷牌按钮
      const btnOk = { x: W / 2 + 20, y: H * 0.82, w: 120, h: 50 };
      drawButton(ctx, '确认偷牌', btnOk.x, btnOk.y, btnOk.w, btnOk.h, COLORS.BTN_PLAY);
      this.btnPlay = btnOk;
    }
  }

  // ─── 消息 ─────────────────────────────────────────
  private renderMessage(ctx: any): void {
    if (!this.message || this.messageTimer <= 0) return;
    this.messageTimer--;
    const W = this.W;
    drawPanel(ctx, W / 2 - 160, 120, 320, 44, 'rgba(0,0,0,0.7)');
    drawText(ctx, this.message, W / 2, 142, 22, '#ff6b6b', 'center', 'middle');
  }

  // ─── 触摸 ─────────────────────────────────────────
  touch(x: number, y: number): void {
    if (this.stealMode !== 'none') {
      this.handleStealTouch(x, y);
      return;
    }

    if (hitTest(this.btnBack, x, y)) { this.onBack(); return; }
    for (const { card, rect } of this.cardRects) {
      if (hitTest(rect, x, y)) { this.toggleCard(card); return; }
    }
    if (this.state.phase === 'finished') {
      if (hitTest(this.btnRestart, x, y)) { this.restart(); return; }
    } else if (this.state.currentPlayerIndex === this.myIndex) {
      if (hitTest(this.btnPlay, x, y)) { this.handlePlay(); return; }
      if (hitTest(this.btnPass, x, y)) { this.handlePass(); return; }
    }
  }

  private handleStealTouch(x: number, y: number): void {
    if (hitTest(this.btnStealCancel, x, y)) {
      if (this.stealMode === 'select-card') {
        this.stealMode = 'select-target';
      } else {
        this.stealMode = 'none';
        this.pendingStealCount = 0;
      }
      return;
    }

    if (this.stealMode === 'select-target') {
      for (const { playerIndex, rect } of this.stealTargetRects) {
        if (hitTest(rect, x, y)) {
          this.stealTargetIndex = playerIndex;
          this.stealMode = 'select-card';
          return;
        }
      }
    } else if (this.stealMode === 'select-card') {
      // 检查是否点了"确认偷牌"
      if (hitTest(this.btnPlay, x, y)) {
        this.executeSteal();
        return;
      }
      // 选择要偷的牌（点击选中/取消选中）
      for (const { card, rect } of this.stealCardRects) {
        if (hitTest(rect, x, y)) {
          const idx = this.selectedCards.findIndex((c) => c.id === card.id);
          if (idx >= 0) {
            this.selectedCards.splice(idx, 1);
          } else if (this.selectedCards.length < this.pendingStealCount) {
            this.selectedCards.push(card);
          }
          return;
        }
      }
    }
  }

  private executeSteal(): void {
    if (this.selectedCards.length === 0) {
      this.showMessage('请选择要偷的牌');
      return;
    }

    // 偷选中的牌
    for (const card of this.selectedCards) {
      const target = this.state.players[this.stealTargetIndex];
      if (!target) continue;
      const handIdx = target.hand.findIndex((c) => c.id === card.id);
      if (handIdx >= 0) {
        target.hand.splice(handIdx, 1);
        this.state.players[this.myIndex]!.hand.push(card);
      }
    }

    this.selectedCards = [];
    this.pendingStealCount--;
    if (this.pendingStealCount <= 0) {
      this.stealMode = 'none';
      this.stealTargetIndex = -1;
    } else {
      this.stealMode = 'select-target';
      this.showMessage(`还需偷 ${this.pendingStealCount} 张`);
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

    // 检查是否含8（触发偷牌）
    const eights = this.selectedCards.filter((c) => c.kind === 'normal' && c.rank === 8).length;

    const { state, error } = playCards(this.state, this.myIndex, [...this.selectedCards]);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    this.selectedCards = [];
    this.message = '';

    // 进入选牌偷牌模式
    if (eights > 0) {
      this.pendingStealCount = eights;
      this.stealMode = 'select-target';
    }
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
    this.stealMode = 'none';
  }
}
