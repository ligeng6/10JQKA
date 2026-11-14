import type { GameState, Card, GameMode } from '@pokergame/shared';
import { createGame, playCards, passTurn, getScores, skipEmptyPlayers, canDiscardSmall, discardSmall } from '@pokergame/core';
import { isScoringCard, cardScoreValue } from '@pokergame/shared';
import { COLORS } from '../render/constants';
import { drawCard, drawButton, drawText, drawPanel, drawTableFelt, hitTest, type Rect } from '../render/draw';
import { generateCardTextures, type CardTextures } from '../render/cardTextures';
import { L } from '../render/layout';
import { decideAction, pickStealTarget } from '../ai';
import { sfx } from '../sfx';
import { SettingsPanel } from '../ui/settings';

export class GameScene {
  private state: GameState;
  private selectedCards: Card[] = [];
  private message = '';
  private messageTimer = 0;
  private myIndex = 0;
  private W = 0;
  private H = 0;
  private textures: CardTextures;

  private handRects: { card: Card; rect: Rect }[] = [];
  private btnPlay: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnPass: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnRestart: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnBack: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnDiscard: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnSettings: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private stealMode: 'none' | 'select-target' | 'select-card' = 'none';
  private stealTargetIndex = -1;
  private stealTargetRects: { playerIndex: number; rect: Rect }[] = [];
  private stealCardRects: { card: Card; rect: Rect }[] = [];
  private stealSelectedIds: string[] = [];
  private pendingStealCount = 0;
  private btnStealBack: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnStealConfirm: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnStealCancel: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private settings = new SettingsPanel();
  private onBack: () => void;
  private aiTimer = 0;
  private readonly AI_DELAY = 40;

  constructor(w: number, h: number, mode: GameMode, onBack: () => void, shuffleRounds: number = 3) {
    this.onBack = onBack;
    this.state = createGame({ mode, shuffleRounds });
    this.textures = generateCardTextures();
    this.resize(w, h);
  }

  resize(w: number, h: number): void {
    this.W = w;
    this.H = h;
    L.update(w, h);
  }

  render(ctx: any): void {
    if (this.stealMode === 'none' && !this.settings.isVisible) this.processAI();

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
    if (this.settings.isVisible) this.settings.render(ctx);
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

  // ─── 顶栏 ─────────────────────────────────────────
  private renderTopBar(ctx: any): void {
    const W = this.W;
    const barH = L.topBarH;
    drawPanel(ctx, 0, 0, W, barH, 'rgba(0,0,0,0.35)');

    this.btnBack = { x: L.margin, y: (barH - L.btnSmallH) / 2, w: L.btnSmallW * 0.7, h: L.btnSmallH };
    drawButton(ctx, '←', this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h, 'rgba(255,255,255,0.15)');

    drawText(ctx, `第${this.state.roundNumber}轮`, this.btnBack.x + this.btnBack.w + L.gapM, barH / 2, L.fontS, COLORS.TEXT_WHITE, 'left', 'middle');
    drawText(ctx, `牌库:${this.state.deck.length}`, W / 2, barH / 2, L.fontS, COLORS.TEXT_GRAY, 'center', 'middle');

    this.btnSettings = { x: W - L.btnSmallW - L.margin, y: (barH - L.btnSmallH) / 2, w: L.btnSmallW, h: L.btnSmallH };
    drawButton(ctx, '⚙', this.btnSettings.x, this.btnSettings.y, this.btnSettings.w, this.btnSettings.h, 'rgba(255,255,255,0.12)');

    drawText(ctx, `分数:${getScores(this.state)[this.myIndex]}`, this.btnSettings.x - L.gapM, barH / 2, L.fontS, COLORS.TEXT_YELLOW, 'right', 'middle');

    if (this.state.phase === 'finished') {
      const won = this.state.winnerIndexes.includes(this.myIndex);
      drawText(ctx, won ? '🏆 你赢了！' : '游戏结束', W / 2, barH + L.gapL, L.fontXL, won ? COLORS.TEXT_YELLOW : '#ff6b6b', 'center');
    }
  }

  // ─── 对手 ─────────────────────────────────────────
  private renderOpponents(ctx: any): void {
    const scores = getScores(this.state);
    const opponents = this.state.players.filter((p) => p.index !== this.myIndex);
    const W = this.W;
    const H = this.H;
    const pw = L.opponentW;
    const ph = L.opponentH;

    const positions = [
      { x: W / 2 - pw / 2, y: L.topBarH + L.gapS },
      { x: L.margin, y: H / 2 - ph / 2 - L.handAreaH * 0.3 },
      { x: W - pw - L.margin, y: H / 2 - ph / 2 - L.handAreaH * 0.3 },
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
        ctx.roundRect(pos.x, pos.y, pw, ph, L.panelRadius);
        ctx.stroke();
      }
      const cx = pos.x + pw / 2;
      drawText(ctx, `🤖 P${p.index}`, cx, pos.y + ph * 0.18, L.fontS, isTurn ? COLORS.TEXT_YELLOW : '#fff', 'center');
      drawText(ctx, `手牌:${p.hand.length}`, cx, pos.y + ph * 0.42, L.fontXS, COLORS.TEXT_GRAY, 'center');
      drawText(ctx, `分数:${scores[p.index]}`, cx, pos.y + ph * 0.62, L.fontXS, COLORS.TEXT_GRAY, 'center');
      if (p.benliu.length) drawText(ctx, `奔流:${p.benliu.length}`, cx, pos.y + ph * 0.82, L.fontXS, COLORS.TEXT_YELLOW, 'center');
    });
  }

  // ─── 牌桌 ─────────────────────────────────────────
  private renderTable(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const tX = L.tableX;
    const tY = L.topBarH + L.gapM + L.opponentH + L.gapS;
    const tW = L.tableW;
    const tH = H - tY - L.handAreaH - L.btnH - L.gapL * 2;

    drawTableFelt(ctx, tX, tY, tW, tH);

    const trick = this.state.currentTrick.filter((t) => !t.isPass);
    if (trick.length === 0) {
      drawText(ctx, '等待出牌...', W / 2, tY + tH / 2, L.fontL, 'rgba(255,255,255,0.1)', 'center', 'middle');
      return;
    }

    // 历史出牌：小牌
    const miniW = L.cardMiniW;
    const miniH = L.cardMiniH;
    const miniGap = L.gapXS;
    const history = trick.slice(0, -1);
    if (history.length > 0) {
      let hx = tX + L.gapM;
      const hy = tY + L.gapS;
      history.forEach((play) => {
        drawText(ctx, `P${play.playerIndex}`, hx, hy + miniH / 2, L.fontXS, 'rgba(255,255,255,0.3)', 'left', 'middle');
        hx += miniW * 0.6;
        play.cards.forEach((c) => {
          drawCard(ctx, c, hx, hy, miniW, miniH, false, this.textures);
          hx += miniW + miniGap;
        });
        hx += L.gapM;
      });
    }

    // 最新一手放大
    const lastPlay = trick[trick.length - 1];
    if (lastPlay) {
      const bigW = L.cardSmallW;
      const bigH = L.cardSmallH;
      const bigGap = L.gapS;
      const cards = lastPlay.cards;
      const totalW = cards.length * (bigW + bigGap) - bigGap;
      const bx = W / 2 - totalW / 2;
      const by = tY + tH * 0.35;

      drawText(ctx, `P${lastPlay.playerIndex} 出牌`, W / 2, by - L.fontS, L.fontS, COLORS.TEXT_YELLOW, 'center');

      cards.forEach((card, i) => {
        drawCard(ctx, card, bx + i * (bigW + bigGap), by, bigW, bigH, false, this.textures);
      });

      if (lastPlay.pattern) {
        const label = patternLabel(lastPlay.pattern.type, lastPlay.pattern.isBomb);
        drawText(ctx, label, W / 2, by + bigH + L.gapS, L.fontXS, 'rgba(255,215,0,0.6)', 'center');
      }
    }
  }

  // ─── 手牌 ─────────────────────────────────────────
  private renderMyHand(ctx: any): void {
    const W = this.W;
    const H = this.H;
    const hand = this.state.players[this.myIndex]?.hand ?? [];
    const benliu = this.state.players[this.myIndex]?.benliu ?? [];
    const areaY = H - L.handAreaH;

    drawPanel(ctx, 0, areaY, W, L.handAreaH, 'rgba(0,0,0,0.25)');
    drawText(ctx, `手牌:${hand.length}${benliu.length ? ` | 奔流:${benliu.length}` : ''}`, W / 2, areaY + L.gapM, L.fontXS, COLORS.TEXT_GRAY, 'center');

    this.handRects = [];
    const cw = L.cardW;
    const ch = L.cardH;
    const gap = L.cardGap;
    const totalW = hand.length * (cw + gap) - gap;
    const startX = Math.max(L.margin, (W - totalW) / 2);
    const cardY = areaY + L.gapL + L.fontXS;

    hand.forEach((card, i) => {
      const x = startX + i * (cw + gap);
      const sel = this.selectedCards.some((c) => c.id === card.id);
      const y = sel ? cardY - L.gapM : cardY;
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

    const bw = L.btnW;
    const bh = L.btnH;
    const bx = W - bw - L.margin;
    const by = H - L.handAreaH - bh - L.gapM;

    if (isFinished) {
      this.btnRestart = { x: W / 2 - bw / 2, y: H / 2 + L.gapXL, w: bw, h: bh };
      drawButton(ctx, '再来一局', this.btnRestart.x, this.btnRestart.y, bw, bh, COLORS.BTN_RESTART);
    } else if (this.stealMode === 'none' && isMyTurn) {
      this.btnPlay = { x: bx, y: by, w: bw, h: bh };
      this.btnPass = { x: bx, y: by - bh - L.gapS, w: bw, h: bh };
      drawButton(ctx, `出牌(${this.selectedCards.length})`, bx, by, bw, bh, COLORS.BTN_PLAY);
      drawButton(ctx, '过牌', bx, by - bh - L.gapS, bw, bh, COLORS.BTN_PASS);
    } else if (this.stealMode === 'none') {
      drawText(ctx, '🤖 AI 思考中...', W - L.margin, by + bh / 2, L.fontXS, 'rgba(255,255,255,0.2)', 'right', 'middle');
    }

    // 弃牌换牌
    if (this.stealMode === 'none' && this.state.phase === 'playing' && canDiscardSmall(this.state, this.myIndex)) {
      this.btnDiscard = { x: L.margin, y: by, w: bw, h: bh };
      drawButton(ctx, '弃牌换牌', L.margin, by, bw, bh, '#8e44ad');
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
      drawText(ctx, '🎯 选择偷牌目标', W / 2, H * 0.12, L.fontXL, COLORS.TEXT_YELLOW, 'center');
      drawText(ctx, `可偷 ${this.pendingStealCount} 张`, W / 2, H * 0.12 + L.fontXL + L.gapS, L.fontM, COLORS.TEXT_GRAY, 'center');

      const opponents = this.state.players.filter((p) => p.index !== this.myIndex && p.hand.length > 0);
      const pw = L.opponentW * 1.3;
      const ph = L.opponentH * 1.2;
      const gap = L.gapL;
      const totalW = opponents.length * (pw + gap) - gap;
      const sx = (W - totalW) / 2;

      opponents.forEach((p, i) => {
        const x = sx + i * (pw + gap);
        const y = H * 0.32;
        drawPanel(ctx, x, y, pw, ph, 'rgba(255,255,255,0.08)');
        ctx.strokeStyle = 'rgba(255,215,0,0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(x, y, pw, ph, L.panelRadius);
        ctx.stroke();
        drawText(ctx, `🤖 P${p.index}`, x + pw / 2, y + ph * 0.2, L.fontL, '#fff', 'center');
        drawText(ctx, `手牌:${p.hand.length}`, x + pw / 2, y + ph * 0.48, L.fontS, COLORS.TEXT_GRAY, 'center');
        const sc = p.hand.filter((c) => isScoringCard(c)).length;
        if (sc > 0) drawText(ctx, `计分牌:${sc}`, x + pw / 2, y + ph * 0.72, L.fontS, COLORS.TEXT_YELLOW, 'center');
        this.stealTargetRects.push({ playerIndex: p.index, rect: { x, y, w: pw, h: ph } });
      });

      this.btnStealCancel = { x: W / 2 - L.btnW / 2, y: H * 0.78, w: L.btnW, h: L.btnH };
      drawButton(ctx, '取消', this.btnStealCancel.x, this.btnStealCancel.y, L.btnW, L.btnH, COLORS.BTN_PASS);

    } else if (this.stealMode === 'select-card') {
      const target = this.state.players[this.stealTargetIndex];
      if (!target) { this.stealMode = 'none'; return; }

      drawText(ctx, `🎯 从 P${this.stealTargetIndex} 手中选牌`, W / 2, H * 0.08, L.fontL, COLORS.TEXT_YELLOW, 'center');
      drawText(ctx, `选 ${this.stealSelectedIds.length}/${this.pendingStealCount} 张 · 计分牌黄框标注`, W / 2, H * 0.08 + L.fontL + L.gapS, L.fontS, COLORS.TEXT_GRAY, 'center');

      const hand = target.hand;
      const cw = L.cardW * 0.85;
      const ch = cw * 1.4;
      const gap = L.cardGap;
      const perRow = Math.min(hand.length, 13);
      const totalW = perRow * (cw + gap) - gap;
      const sx = Math.max(L.margin, (W - totalW) / 2);

      hand.forEach((card, i) => {
        const row = Math.floor(i / 13);
        const col = i % 13;
        const x = sx + col * (cw + gap);
        const y = H * 0.22 + row * (ch + L.gapXL);
        const selected = this.stealSelectedIds.includes(card.id);
        drawCard(ctx, card, x, y, cw, ch, selected, this.textures);
        if (isScoringCard(card)) {
          ctx.strokeStyle = COLORS.TEXT_YELLOW;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.roundRect(x - 2, y - 2, cw + 4, ch + 4, 10);
          ctx.stroke();
          drawText(ctx, `${cardScoreValue(card)}分`, x + cw / 2, y + ch + L.gapXS, L.fontXS, COLORS.TEXT_YELLOW, 'center');
        }
        this.stealCardRects.push({ card, rect: { x, y, w: cw, h: ch } });
      });

      const btnY = H * 0.82;
      const bw = L.btnSmallW;
      const bh = L.btnH;
      this.btnStealBack = { x: W / 2 - bw * 1.6, y: btnY, w: bw, h: bh };
      this.btnStealConfirm = { x: W / 2 + bw * 0.6, y: btnY, w: bw, h: bh };
      this.btnStealCancel = { x: W / 2 - bw / 2, y: btnY, w: bw, h: bh };
      drawButton(ctx, '换目标', this.btnStealBack.x, btnY, bw, bh, COLORS.BTN_PASS);
      drawButton(ctx, `偷(${this.stealSelectedIds.length})`, this.btnStealConfirm.x, btnY, bw, bh, COLORS.BTN_PLAY);
      drawButton(ctx, '取消', this.btnStealCancel.x, btnY, bw, bh, '#c0392b');
    }
  }

  private renderMessage(ctx: any): void {
    if (!this.message || this.messageTimer <= 0) return;
    this.messageTimer--;
    drawPanel(ctx, this.W / 2 - L.btnW, 100, L.btnW * 2, L.btnH, 'rgba(0,0,0,0.7)');
    drawText(ctx, this.message, this.W / 2, 100 + L.btnH / 2, L.fontS, '#ff6b6b', 'center', 'middle');
  }

  // ─── 触摸 ─────────────────────────────────────────
  touch(x: number, y: number): void {
    if (this.settings.isVisible) {
      this.settings.touch(x, y);
      return;
    }
    if (hitTest(this.btnSettings, x, y)) {
      sfx.click();
      this.settings.show(this.W, this.H);
      return;
    }
    if (hitTest(this.btnBack, x, y)) {
      sfx.click();
      this.onBack();
      return;
    }
    if (this.stealMode !== 'none') {
      this.handleStealTouch(x, y);
      return;
    }
    for (const { card, rect } of this.handRects) {
      if (hitTest(rect, x, y)) { this.toggleCard(card); return; }
    }
    if (this.state.phase === 'finished') {
      if (hitTest(this.btnRestart, x, y)) { sfx.click(); this.restart(); return; }
    }
    if (hitTest(this.btnDiscard, x, y)) { sfx.click(); this.handleDiscard(); return; }
    if (this.state.currentPlayerIndex === this.myIndex) {
      if (hitTest(this.btnPlay, x, y)) { sfx.click(); this.handlePlay(); return; }
      if (hitTest(this.btnPass, x, y)) { sfx.click(); this.handlePass(); return; }
    }
  }

  touchMove(x: number, y: number): void {
    if (this.settings.isVisible) this.settings.touchMove(x, y);
  }

  touchEnd(): void {
    if (this.settings.isVisible) this.settings.touchEnd();
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
      if (hitTest(this.btnStealConfirm, x, y)) { this.executeSteal(); return; }
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
    if (this.stealSelectedIds.length === 0) { this.showMessage('请选择要偷的牌'); return; }
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
    if (eights > 0) sfx.steal();
    this.selectedCards = [];
    this.message = '';
    if (eights > 0) {
      this.pendingStealCount = eights;
      this.stealMode = 'select-target';
    }
  }

  private handlePass(): void {
    const { state, error } = passTurn(this.state, this.myIndex);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    skipEmptyPlayers(this.state);
    sfx.pass();
    this.selectedCards = [];
    this.message = '';
  }

  private handleDiscard(): void {
    const { state, error } = discardSmall(this.state, this.myIndex);
    if (error) { this.showMessage(error); return; }
    this.state = state;
    skipEmptyPlayers(this.state);
    sfx.click();
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
