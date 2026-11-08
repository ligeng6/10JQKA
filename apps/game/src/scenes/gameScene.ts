import type { GameState, Card, GameMode } from '@pokergame/shared';
import { createGame, playCards, passTurn, getScores, skipEmptyPlayers, canDiscardSmall, discardSmall } from '@pokergame/core';
import { isScoringCard, cardScoreValue } from '@pokergame/shared';
import { COLORS } from '../render/constants';
import {
  drawCard, drawButton, drawText, drawPanel, drawTableFelt,
  hitTest, type Rect,
} from '../render/draw';
import { generateCardTextures, type CardTextures } from '../render/cardTextures';
import { decideAction, pickStealTarget } from '../ai';
import { sfx } from '../sfx';

export class GameScene {
  private state: GameState;
  private selectedCards: Card[] = [];
  private message: string = '';
  private messageTimer = 0;
  private myIndex = 0;
  private W: number;
  private H: number;
  private textures: CardTextures;

  // 触摸区域
  private handRects: { card: Card; rect: Rect }[] = [];
  private btnPlay: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnPass: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnRestart: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnDiscard: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnBack: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // 偷牌选牌
  private stealMode: 'none' | 'select-target' | 'select-card' = 'none';
  private stealTargetIndex = -1;
  private stealTargetRects: { playerIndex: number; rect: Rect }[] = [];
  private stealCardRects: { card: Card; rect: Rect }[] = [];
  private stealSelectedIds: string[] = [];
  private pendingStealCount = 0;
  private btnStealBack: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnStealConfirm: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnStealCancel: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private onBack: () => void;
  private aiTimer = 0;
  private readonly AI_DELAY = 40;

  constructor(w: number, h: number, mode: GameMode, onBack: () => void, shuffleRounds: number = 3) {
    this.W = w;
    this.H = h;
    this.onBack = onBack;
    this.state = createGame({ mode, shuffleRounds });
    this.textures = generateCardTextures();
  }

  update(w: number, h: number): void {
    this.W = w;
    this.H = h;
  }

  render(ctx: any): void {
    if (this.stealMode === 'none') this.processAI();

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

    if (this.stealMode !== 'none') this.renderStealOverlay(ctx);
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
    if (action.type === 'play' && action.cards?.length) {
      const t = pickStealTarget(this.state, idx);
      const { state, error } = playCards(this.state, idx, action.cards, t >= 0 ? t : undefined);
      if (!error) { this.state = state; skipEmptyPlayers(this.state); }
      else { const r = passTurn(this.state, idx); this.state = r.state; skipEmptyPlayers(this.state); }
    } else {
      const r = passTurn(this.state, idx);
      this.state = r.state;
      skipEmptyPlayers(this.state);
    }
  }

  // ─── 顶部栏 ─────────────────────────────────────────
  private renderTopBar(ctx: any): void {
    const W = this.W;
    drawPanel(ctx, 0, 0, W, 48, 'rgba(0,0,0,0.35)');
    this.btnBack = { x: 12, y: 8, w: 64, h: 32 };
    drawButton(ctx, '←', 12, 8, 64, 32, 'rgba(255,255,255,0.15)');
    drawText(ctx, `第${this.state.roundNumber}轮`, 100, 24, 22, COLORS.TEXT_WHITE, 'left', 'middle');
    drawText(ctx, `牌库:${this.state.deck.length}`, W / 2, 24, 22, COLORS.TEXT_GRAY, 'center', 'middle');
    drawText(ctx, `分数:${getScores(this.state)[this.myIndex]}`, W - 20, 24, 22, COLORS.TEXT_YELLOW, 'right', 'middle');

    if (this.state.phase === 'finished') {
      const won = this.state.winnerIndexes.includes(this.myIndex);
      drawText(ctx, won ? '🏆 你赢了！' : '游戏结束', W / 2, 80, 32, won ? COLORS.TEXT_YELLOW : '#ff6b6b', 'center');
    }
  }

  // ─── 对手 ─────────────────────────────────────────
  private renderOpponents(ctx: any): void {
    const scores = getScores(this.state);
    const opponents = this.state.players.filter((p) => p.index !== this.myIndex);
    const W = this.W;
    const H = this.H;
    const pw = 130, ph = 88;
    const positions = [
      { x: W / 2 - pw / 2, y: 56 },
      { x: 12, y: H / 2 - ph / 2 - 60 },
      { x: W - pw - 12, y: H / 2 - ph / 2 - 60 },
    ];
    opponents.forEach((p, i) => {
      const pos = positions[i];
      if (!pos) return;
      const isTurn = this.state.currentPlayerIndex === p.index;
      drawPanel(ctx, pos.x, pos.y, pw, ph, isTurn ? 'rgba(255,215,0,0.12)' : 'rgba(0,0,0,0.3)');
      if (isTurn) {
        ctx.strokeStyle = COLORS.TEXT_YELLOW;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(pos.x, pos.y, pw, ph, 12);
        ctx.stroke();
      }
      drawText(ctx, `🤖 P${p.index}`, pos.x + pw / 2, pos.y + 16, 20, isTurn ? COLORS.TEXT_YELLOW : '#fff', 'center');
      drawText(ctx, `手牌:${p.hand.length}`, pos.x + pw / 2, pos.y + 42, 17, COLORS.TEXT_GRAY, 'center');
      drawText(ctx, `分数:${scores[p.index]}`, pos.x + pw / 2, pos.y + 62, 17, COLORS.TEXT_GRAY, 'center');
      if (p.benliu.length) drawText(ctx, `奔流:${p.benliu.length}`, pos.x + pw / 2, pos.y + 78, 15, COLORS.TEXT_YELLOW, 'center');
    });
  }

  // ─── 牌桌（桌上牌小，刚出的牌放大） ─────────────────
  private renderTable(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const tX = W * 0.2, tY = 150, tW = W * 0.6, tH = H * 0.32;
    drawTableFelt(ctx, tX, tY, tW, tH);

    const trick = this.state.currentTrick.filter((t) => !t.isPass);

    if (trick.length === 0) {
      drawText(ctx, '等待出牌...', W / 2, tY + tH / 2, 24, 'rgba(255,255,255,0.1)', 'center', 'middle');
      return;
    }

    // 历史出牌：小牌横排
    const miniW = 32, miniH = 44, miniGap = 4;
    const historyTrick = trick.slice(0, -1);
    if (historyTrick.length > 0) {
      const totalMini = historyTrick.reduce((s, p) => s + p.cards.length * (miniW + miniGap) + 30, 0);
      let hx = W / 2 - totalMini / 2;
      const hy = tY + 16;
      historyTrick.forEach((play) => {
        drawText(ctx, `P${play.playerIndex}`, hx, hy + miniH / 2, 13, 'rgba(255,255,255,0.3)', 'left', 'middle');
        hx += 28;
        play.cards.forEach((c) => {
          drawCard(ctx, c, hx, hy, miniW, miniH, false, this.textures);
          hx += miniW + miniGap;
        });
        hx += 18;
      });
    }

    // 最新一手：放大显示在牌桌中央
    const lastPlay = trick[trick.length - 1];
    if (lastPlay) {
      const bigW = 64, bigH = 88, bigGap = 8;
      const cards = lastPlay.cards;
      const totalW = cards.length * (bigW + bigGap) - bigGap;
      const bx = W / 2 - totalW / 2;
      const by = tY + tH * 0.42;

      drawText(ctx, `P${lastPlay.playerIndex} 出牌`, W / 2, by - 18, 18, COLORS.TEXT_YELLOW, 'center');

      cards.forEach((card, i) => {
        const x = bx + i * (bigW + bigGap);
        drawCard(ctx, card, x, by, bigW, bigH, false, this.textures);
      });

      // 牌型标签
      if (lastPlay.pattern) {
        const label = patternLabel(lastPlay.pattern.type, lastPlay.pattern.isBomb);
        drawText(ctx, label, W / 2, by + bigH + 16, 18, 'rgba(255,215,0,0.6)', 'center');
      }
    }
  }

  // ─── 手牌 ─────────────────────────────────────────
  private renderMyHand(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const hand = this.state.players[this.myIndex]?.hand ?? [];
    const benliu = this.state.players[this.myIndex]?.benliu ?? [];
    const areaY = H - 160;

    drawPanel(ctx, 0, areaY, W, 160, 'rgba(0,0,0,0.25)');
    drawText(ctx, `手牌:${hand.length}${benliu.length ? ` | 奔流:${benliu.length}` : ''}`, W / 2, areaY + 14, 18, COLORS.TEXT_GRAY, 'center');

    this.handRects = [];
    const cw = 72, ch = 100, gap = 6;
    const totalW = hand.length * (cw + gap) - gap;
    const startX = Math.max(16, (W - totalW) / 2);
    const cardY = areaY + 36;

    hand.forEach((card, i) => {
      const x = startX + i * (cw + gap);
      const sel = this.selectedCards.some((c) => c.id === card.id);
      const y = sel ? cardY - 12 : cardY;
      drawCard(ctx, card, x, y, cw, ch, sel, this.textures);
      this.handRects.push({ card, rect: { x, y, w: cw, h: ch } });
    });
  }

  // ─── 按钮 ─────────────────────────────────────────
  private renderActions(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const isFinished = this.state.phase === 'finished';
    const isMyTurn = this.state.currentPlayerIndex === this.myIndex;

    this.btnPlay = { x: 0, y: 0, w: 0, h: 0 };
    this.btnPass = { x: 0, y: 0, w: 0, h: 0 };
    this.btnRestart = { x: 0, y: 0, w: 0, h: 0 };
    this.btnDiscard = { x: 0, y: 0, w: 0, h: 0 };

    const bw = 110, bh = 50;
    const bx = W - bw - 20;
    const by = H - 155;

    if (isFinished) {
      this.btnRestart = { x: W / 2 - 80, y: H / 2 + 60, w: 160, h: 56 };
      drawButton(ctx, '再来一局', this.btnRestart.x, this.btnRestart.y, 160, 56, COLORS.BTN_RESTART);
    } else if (this.stealMode === 'none' && isMyTurn) {
      this.btnPlay = { x: bx, y: by, w: bw, h: bh };
      this.btnPass = { x: bx, y: by - bh - 12, w: bw, h: bh };
      drawButton(ctx, `出牌(${this.selectedCards.length})`, bx, by, bw, bh, COLORS.BTN_PLAY);
      drawButton(ctx, '过牌', bx, by - bh - 12, bw, bh, COLORS.BTN_PASS);
    } else if (this.stealMode === 'none') {
      drawText(ctx, '🤖 AI 思考中...', W - 20, by + bh / 2, 18, 'rgba(255,255,255,0.2)', 'right', 'middle');
    }

    // 弃牌换牌按钮：任何时候都显示（只要手牌全≤8）
    if (this.stealMode === 'none' && this.state.phase === 'playing' && canDiscardSmall(this.state, this.myIndex)) {
      this.btnDiscard = { x: 16, y: H - 155, w: bw, h: bh };
      drawButton(ctx, '弃牌换牌', 16, H - 155, bw, bh, '#8e44ad');
    }
  }

  // ─── 偷牌覆盖层 ────────────────────────────────────
  private renderStealOverlay(ctx: any): void {
    const W = this.W;
    const H = this.H;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(0, 0, W, H);

    this.stealTargetRects = [];
    this.stealCardRects = [];
    this.btnStealBack = { x: 0, y: 0, w: 0, h: 0 };
    this.btnStealConfirm = { x: 0, y: 0, w: 0, h: 0 };
    this.btnStealCancel = { x: 0, y: 0, w: 0, h: 0 };

    if (this.stealMode === 'select-target') {
      drawText(ctx, '🎯 选择偷牌目标', W / 2, H * 0.12, 30, COLORS.TEXT_YELLOW, 'center');
      drawText(ctx, `可偷 ${this.pendingStealCount} 张`, W / 2, H * 0.12 + 38, 20, COLORS.TEXT_GRAY, 'center');

      const opponents = this.state.players.filter((p) => p.index !== this.myIndex && p.hand.length > 0);
      const pw = 160, ph = 110;
      const totalW = opponents.length * (pw + 24) - 24;
      const sx = (W - totalW) / 2;

      opponents.forEach((p, i) => {
        const x = sx + i * (pw + 24);
        const y = H * 0.35;
        drawPanel(ctx, x, y, pw, ph, 'rgba(255,255,255,0.08)');
        // 高亮边框提示可点击
        ctx.strokeStyle = 'rgba(255,215,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, pw, ph, 12);
        ctx.stroke();

        drawText(ctx, `🤖 P${p.index}`, x + pw / 2, y + 18, 22, '#fff', 'center');
        drawText(ctx, `手牌:${p.hand.length}`, x + pw / 2, y + 48, 18, COLORS.TEXT_GRAY, 'center');
        const sc = p.hand.filter((c) => isScoringCard(c)).length;
        if (sc > 0) drawText(ctx, `计分牌:${sc}`, x + pw / 2, y + 74, 18, COLORS.TEXT_YELLOW, 'center');

        this.stealTargetRects.push({ playerIndex: p.index, rect: { x, y, w: pw, h: ph } });
      });

      // 取消
      this.btnStealCancel = { x: W / 2 - 60, y: H * 0.78, w: 120, h: 48 };
      drawButton(ctx, '取消', W / 2 - 60, H * 0.78, 120, 48, COLORS.BTN_PASS);

    } else if (this.stealMode === 'select-card') {
      const target = this.state.players[this.stealTargetIndex];
      if (!target) { this.stealMode = 'none'; return; }

      drawText(ctx, `🎯 从 P${this.stealTargetIndex} 手中选牌`, W / 2, H * 0.08, 28, COLORS.TEXT_YELLOW, 'center');
      drawText(ctx, `选 ${this.stealSelectedIds.length}/${this.pendingStealCount} 张 · 计分牌黄框标注`, W / 2, H * 0.08 + 36, 18, COLORS.TEXT_GRAY, 'center');

      // 目标手牌
      const hand = target.hand;
      const cw = 68, ch = 94, gap = 8;
      const cols = Math.min(hand.length, 13);
      const perRow = cols;
      const totalW = perRow * (cw + gap) - gap;
      const sx = Math.max(16, (W - totalW) / 2);

      hand.forEach((card, i) => {
        const row = Math.floor(i / 13);
        const col = i % 13;
        const x = sx + col * (cw + gap);
        const y = H * 0.22 + row * (ch + 30);
        const selected = this.stealSelectedIds.includes(card.id);

        drawCard(ctx, card, x, y, cw, ch, selected, this.textures);

        if (isScoringCard(card)) {
          ctx.strokeStyle = COLORS.TEXT_YELLOW;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x - 2, y - 2, cw + 4, ch + 4, 10);
          ctx.stroke();
          drawText(ctx, `${cardScoreValue(card)}分`, x + cw / 2, y + ch + 6, 16, COLORS.TEXT_YELLOW, 'center');
        }

        this.stealCardRects.push({ card, rect: { x, y, w: cw, h: ch } });
      });

      // 底部按钮
      const btnY = H * 0.82;
      this.btnStealBack = { x: W / 2 - 180, y: btnY, w: 110, h: 48 };
      this.btnStealConfirm = { x: W / 2 + 70, y: btnY, w: 110, h: 48 };
      this.btnStealCancel = { x: W / 2 - 55, y: btnY, w: 110, h: 48 };

      drawButton(ctx, '换目标', this.btnStealBack.x, btnY, 110, 48, COLORS.BTN_PASS);
      drawButton(ctx, `偷(${this.stealSelectedIds.length})`, this.btnStealConfirm.x, btnY, 110, 48, COLORS.BTN_PLAY);
      drawButton(ctx, '取消', this.btnStealCancel.x, btnY, 110, 48, '#c0392b');
    }
  }

  private renderMessage(ctx: any): void {
    if (!this.message || this.messageTimer <= 0) return;
    this.messageTimer--;
    drawPanel(ctx, this.W / 2 - 160, 100, 320, 44, 'rgba(0,0,0,0.7)');
    drawText(ctx, this.message, this.W / 2, 122, 22, '#ff6b6b', 'center', 'middle');
  }

  // ─── 触摸 ─────────────────────────────────────────
  touch(x: number, y: number): void {
    if (this.stealMode !== 'none') {
      this.handleStealTouch(x, y);
      return;
    }
    if (hitTest(this.btnBack, x, y)) { this.onBack(); return; }
    for (const { card, rect } of this.handRects) {
      if (hitTest(rect, x, y)) { this.toggleCard(card); return; }
    }
    if (hitTest(this.btnDiscard, x, y)) { this.handleDiscard(); return; }
    if (this.state.phase === 'finished') {
      if (hitTest(this.btnRestart, x, y)) { this.restart(); return; }
    } else if (this.state.currentPlayerIndex === this.myIndex) {
      if (hitTest(this.btnPlay, x, y)) { sfx.click(); this.handlePlay(); return; }
      if (hitTest(this.btnPass, x, y)) { sfx.click(); this.handlePass(); return; }

    }
  }

  private handleStealTouch(x: number, y: number): void {
    if (this.stealMode === 'select-target') {
      if (hitTest(this.btnStealCancel, x, y)) {
        this.stealMode = 'none';
        this.pendingStealCount = 0;
        this.stealSelectedIds = [];
        return;
      }
      for (const { playerIndex, rect } of this.stealTargetRects) {
        if (hitTest(rect, x, y)) {
          this.stealTargetIndex = playerIndex;
          this.stealMode = 'select-card';
          this.stealSelectedIds = [];
          return;
        }
      }
      return;
    }

    if (this.stealMode === 'select-card') {
      if (hitTest(this.btnStealConfirm, x, y)) {
        this.executeSteal();
        return;
      }
      if (hitTest(this.btnStealBack, x, y)) {
        this.stealMode = 'select-target';
        this.stealSelectedIds = [];
        return;
      }
      if (hitTest(this.btnStealCancel, x, y)) {
        this.stealMode = 'none';
        this.pendingStealCount = 0;
        this.stealSelectedIds = [];
        return;
      }
      for (const { card, rect } of this.stealCardRects) {
        if (hitTest(rect, x, y)) {
          const idx = this.stealSelectedIds.indexOf(card.id);
          if (idx >= 0) this.stealSelectedIds.splice(idx, 1);
          else if (this.stealSelectedIds.length < this.pendingStealCount) this.stealSelectedIds.push(card.id);
          return;
        }
      }
    }
  }

  private executeSteal(): void {
    sfx.steal();
    if (this.stealSelectedIds.length === 0) {
      this.showMessage('请选择要偷的牌');
      return;
    }
    const target = this.state.players[this.stealTargetIndex];
    if (!target) { this.stealMode = 'none'; return; }

    for (const id of this.stealSelectedIds) {
      const hi = target.hand.findIndex((c) => c.id === id);
      if (hi >= 0) {
        const card = target.hand.splice(hi, 1)[0]!;
        this.state.players[this.myIndex]!.hand.push(card);
      }
    }

    this.stealSelectedIds = [];
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
    sfx.selectCard();
    this.message = '';
  }

  private showMessage(msg: string): void {
    this.message = msg;
    this.messageTimer = 90;
  }

  private handlePlay(): void {
    if (this.selectedCards.length === 0) { this.showMessage('请先选牌'); return; }
    const eights = this.selectedCards.filter((c) => c.kind === 'normal' && c.rank === 8).length;
    const { state, error } = playCards(this.state, this.myIndex, [...this.selectedCards]);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    skipEmptyPlayers(this.state);
    sfx.playCard();
    if (eights > 0) {
      sfx.steal();
    }
    this.selectedCards = [];
    this.message = '';
    if (eights > 0) {
      this.pendingStealCount = eights;
      this.stealMode = 'select-target';
    }
  }

  private handleDiscard(): void {
    const { state, error } = discardSmall(this.state, this.myIndex);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    skipEmptyPlayers(this.state);
    this.selectedCards = [];
    this.message = '';
  }

  private handlePass(): void {
    const { state, error } = passTurn(this.state, this.myIndex);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    skipEmptyPlayers(this.state);
    this.selectedCards = [];
    this.message = '';
  }

  private restart(): void {
    this.state = createGame({ mode: this.state.mode, shuffleRounds: this.state.shuffleRounds });
    this.selectedCards = [];
    this.message = '';
    this.stealMode = 'none';
  }
}

function patternLabel(type: string, isBomb: boolean): string {
  const map: Record<string, string> = {
    single: '单张', pair: '对子', triple: '三张',
    straight: '顺子', flushStraight: '同花顺', bomb4: '四张炸弹',
  };
  const name = map[type] ?? type;
  return isBomb ? `💣 ${name}` : name;
}
