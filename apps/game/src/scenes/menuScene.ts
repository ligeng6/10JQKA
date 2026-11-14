import { COLORS } from '../render/constants';
import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';
import { L } from '../render/layout';
import { bgm } from '../bgm';
import { sfx } from '../sfx';
import { SettingsPanel } from '../ui/settings';
import { roomManager } from '../network/room';

type MenuPage = 'main' | 'solo' | 'online';

export class MenuScene {
  private W = 0;
  private H = 0;
  private page: MenuPage = 'main';

  // 回调
  onStartSolo: (mode: 'ffa' | '2v2', shuffleRounds: number) => void = () => {};
  onCreateRoom: (mode: 'ffa' | '2v2', shuffleRounds: number) => void = () => {};
  onJoinRoom: () => void = () => {};

  // 按钮
  private btnSolo: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnOnline: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnSettings: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnBack: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // solo 模式按钮
  private btnSoloFfa: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnSolo2v2: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // online 模式按钮
  private btnCreateFfa: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnCreate2v2: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnJoin: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private settings = new SettingsPanel();
  private particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];

  constructor(w: number, h: number) {
    this.resize(w, h);
  }

  resize(w: number, h: number): void {
    this.W = w;
    this.H = h;
    L.update(w, h);
    if (this.particles.length === 0) {
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
          r: Math.random() * 3 + 1, a: Math.random() * 0.3 + 0.1,
        });
      }
    }
  }

  render(ctx: any): void {
    const W = this.W;
    const H = this.H;

    // 背景
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d2b1a');
    bg.addColorStop(0.5, '#1a472a');
    bg.addColorStop(1, '#0d2b1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    for (const p of this.particles) {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,0,${p.a})`;
      ctx.fill();
    }

    // 标题（所有页面共用）
    const titleY = H * 0.12;
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    drawText(ctx, '原创扑克', W / 2, titleY, L.fontXXL, COLORS.TEXT_YELLOW, 'center');
    ctx.restore();

    // 设置按钮
    this.btnSettings = { x: W - L.btnSmallW * 2 - L.margin * 2, y: L.margin, w: L.btnSmallW, h: L.btnSmallH };
    drawButton(ctx, '⚙ 设置', this.btnSettings.x, this.btnSettings.y, this.btnSettings.w, this.btnSettings.h, 'rgba(255,255,255,0.15)');

    if (this.page === 'main') {
      this.renderMainPage(ctx);
    } else if (this.page === 'solo') {
      this.renderSoloPage(ctx);
    } else {
      this.renderOnlinePage(ctx);
    }

    this.drawCornerCards(ctx, W, H);
    if (this.settings.isVisible) this.settings.render(ctx);
  }

  // ─── 主页：两大入口 ─────────────────────────────────
  private renderMainPage(ctx: any): void {
    const W = this.W;
    const H = this.H;

    drawText(ctx, '一副牌就能玩的对战', W / 2, H * 0.12 + L.fontXXL + L.gapS, L.fontM, COLORS.TEXT_GRAY, 'center');

    const bw = Math.min(L.s(320), W * 0.32);
    const bh = Math.min(L.s(100), H * 0.14);
    const gap = L.gapXL;
    const y = H * 0.38;

    this.btnSolo = { x: W / 2 - bw - gap / 2, y, w: bw, h: bh };
    this.btnOnline = { x: W / 2 + gap / 2, y, w: bw, h: bh };

    // 人机对战
    drawPanel(ctx, this.btnSolo.x, y, bw, bh, 'rgba(45,139,94,0.3)');
    ctx.strokeStyle = '#2d8b5e';
    ctx.lineWidth = L.s(3);
    ctx.beginPath();
    ctx.roundRect(this.btnSolo.x, y, bw, bh, L.panelRadius);
    ctx.stroke();
    drawText(ctx, '🤖', W / 2 - bw / 2 - gap / 2, y + bh * 0.28, L.fontXXL, '#fff', 'center');
    drawText(ctx, '人机对战', W / 2 - bw / 2 - gap / 2, y + bh * 0.68, L.fontL, '#fff', 'center');

    // 联机对战
    drawPanel(ctx, this.btnOnline.x, y, bw, bh, 'rgba(41,128,185,0.3)');
    ctx.strokeStyle = '#2980b9';
    ctx.lineWidth = L.s(3);
    ctx.beginPath();
    ctx.roundRect(this.btnOnline.x, y, bw, bh, L.panelRadius);
    ctx.stroke();
    drawText(ctx, '🌐', W / 2 + bw / 2 + gap / 2, y + bh * 0.28, L.fontXXL, '#fff', 'center');
    drawText(ctx, '联机对战', W / 2 + bw / 2 + gap / 2, y + bh * 0.68, L.fontL, '#fff', 'center');

    drawText(ctx, '4人对战 · 计分牌5/10/K共100分', W / 2, H * 0.82, L.fontS, 'rgba(255,255,255,0.25)', 'center');
    drawText(ctx, '集齐4张奔流牌获胜', W / 2, H * 0.82 + L.fontS + L.gapS, L.fontS, 'rgba(255,255,255,0.25)', 'center');
  }

  // ─── 人机模式选择 ─────────────────────────────────
  private renderSoloPage(ctx: any): void {
    const W = this.W;
    const H = this.H;

    this.renderBackButton(ctx);

    drawText(ctx, '人机对战', W / 2, H * 0.24, L.fontXL, COLORS.TEXT_YELLOW, 'center');
    drawText(ctx, '与 3 名 AI 电脑对战', W / 2, H * 0.24 + L.fontXL + L.gapS, L.fontM, COLORS.TEXT_GRAY, 'center');

    const bw = L.btnW;
    const bh = L.btnH * 1.2;
    const gap = L.gapXL;
    const y = H * 0.44;

    this.btnSoloFfa = { x: W / 2 - bw - gap / 2, y, w: bw, h: bh };
    this.btnSolo2v2 = { x: W / 2 + gap / 2, y, w: bw, h: bh };

    drawButton(ctx, '混战模式', this.btnSoloFfa.x, y, bw, bh, '#2d8b5e');
    drawButton(ctx, '2V2 组队', this.btnSolo2v2.x, y, bw, bh, '#2980b9');

    drawText(ctx, '各自为战，分数最高者胜', W / 2 - bw / 2 - gap / 2, y + bh + L.gapM, L.fontXS, COLORS.TEXT_GRAY, 'center');
    drawText(ctx, '与 AI 队友配合作战', W / 2 + bw / 2 + gap / 2, y + bh + L.gapM, L.fontXS, COLORS.TEXT_GRAY, 'center');
  }

  // ─── 联机模式选择 ─────────────────────────────────
  private renderOnlinePage(ctx: any): void {
    const W = this.W;
    const H = this.H;

    this.renderBackButton(ctx);

    drawText(ctx, '联机对战', W / 2, H * 0.22, L.fontXL, COLORS.TEXT_YELLOW, 'center');
    drawText(ctx, '邀请好友或添加 AI 一起玩', W / 2, H * 0.22 + L.fontXL + L.gapS, L.fontM, COLORS.TEXT_GRAY, 'center');

    // 创建房间
    drawText(ctx, '─── 创建房间 ───', W / 2, H * 0.36, L.fontS, 'rgba(255,255,255,0.3)', 'center');

    const bw = L.btnW;
    const bh = L.btnH;
    const gap = L.gapL;
    const y = H * 0.42;

    this.btnCreateFfa = { x: W / 2 - bw - gap / 2, y, w: bw, h: bh };
    this.btnCreate2v2 = { x: W / 2 + gap / 2, y, w: bw, h: bh };

    drawButton(ctx, '混战房间', this.btnCreateFfa.x, y, bw, bh, '#2d8b5e');
    drawButton(ctx, '2V2 房间', this.btnCreate2v2.x, y, bw, bh, '#2980b9');

    // 加入房间
    drawText(ctx, '─── 加入房间 ───', W / 2, H * 0.58, L.fontS, 'rgba(255,255,255,0.3)', 'center');

    const jw = Math.min(L.s(300), W * 0.3);
    this.btnJoin = { x: W / 2 - jw / 2, y: H * 0.63, w: jw, h: bh };
    drawButton(ctx, '📱 输入房间码加入', this.btnJoin.x, H * 0.63, jw, bh, '#e67e22');

    drawText(ctx, '创建后分享房间码邀请好友', W / 2, H * 0.76, L.fontXS, 'rgba(255,255,255,0.2)', 'center');
    drawText(ctx, '房间内可添加 AI 补位', W / 2, H * 0.76 + L.fontXS + L.gapS, L.fontXS, 'rgba(255,255,255,0.2)', 'center');
  }

  private renderBackButton(ctx: any): void {
    this.btnBack = { x: L.margin, y: (L.topBarH - L.btnSmallH) / 2, w: L.btnSmallW * 0.8, h: L.btnSmallH };
    drawButton(ctx, '← 返回', this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h, 'rgba(255,255,255,0.15)');
  }

  private drawCornerCards(ctx: any, W: number, H: number): void {
    const cw = L.cardSmallW * 0.8;
    const ch = cw * 1.4;
    const corners = [
      { x: L.margin, y: L.margin, r: -0.15, rank: 'A', suit: '♥', color: '#c0392b' },
      { x: W - L.margin - cw, y: L.margin, r: 0.15, rank: 'K', suit: '♠', color: '#2c3e50' },
      { x: L.margin, y: H - L.margin - ch, r: 0.12, rank: 'Q', suit: '♣', color: '#2c3e50' },
      { x: W - L.margin - cw, y: H - L.margin - ch, r: -0.12, rank: 'J', suit: '♦', color: '#c0392b' },
    ];
    for (const c of corners) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = '#fff';
      roundRect(ctx, 0, 0, cw, ch, 6);
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.font = `bold ${Math.floor(cw * 0.32)}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(c.rank, cw * 0.1, ch * 0.08);
      ctx.font = `${Math.floor(cw * 0.22)}px sans-serif`;
      ctx.fillText(c.suit, cw * 0.1, ch * 0.28);
      ctx.restore();
    }
  }

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

    // 返回
    if (this.page !== 'main' && hitTest(this.btnBack, x, y)) {
      sfx.click();
      this.page = 'main';
      return;
    }

    if (this.page === 'main') {
      if (hitTest(this.btnSolo, x, y)) {
        sfx.click();
        this.page = 'solo';
        return;
      }
      if (hitTest(this.btnOnline, x, y)) {
        sfx.click();
        this.page = 'online';
        return;
      }
      return;
    }

    if (this.page === 'solo') {
      const shuffleRounds = this.settings.getShuffleRounds();
      if (hitTest(this.btnSoloFfa, x, y)) {
        sfx.click();
        this.onStartSolo('ffa', shuffleRounds);
        return;
      }
      if (hitTest(this.btnSolo2v2, x, y)) {
        sfx.click();
        this.onStartSolo('2v2', shuffleRounds);
        return;
      }
      return;
    }

    if (this.page === 'online') {
      const shuffleRounds = this.settings.getShuffleRounds();
      if (hitTest(this.btnCreateFfa, x, y)) {
        sfx.click();
        this.onCreateRoom('ffa', shuffleRounds);
        return;
      }
      if (hitTest(this.btnCreate2v2, x, y)) {
        sfx.click();
        this.onCreateRoom('2v2', shuffleRounds);
        return;
      }
      if (hitTest(this.btnJoin, x, y)) {
        sfx.click();
        this.onJoinRoom();
        return;
      }
    }
  }

  touchMove(x: number, y: number): void {
    if (this.settings.isVisible) this.settings.touchMove(x, y);
  }

  touchEnd(): void {
    if (this.settings.isVisible) this.settings.touchEnd();
  }
}
