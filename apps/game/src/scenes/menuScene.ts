import { COLORS } from '../render/constants';
import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';
import { L } from '../render/layout';
import { bgm } from '../bgm';
import { sfx } from '../sfx';
import { SettingsPanel } from '../ui/settings';

export class MenuScene {
  private W = 0;
  private H = 0;
  private onModeSelect: (mode: 'ffa' | '2v2', shuffleRounds: number) => void;

  private btnFfa: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btn2v2: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnSettings: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private settings = new SettingsPanel();
  private particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];

  constructor(w: number, h: number, onModeSelect: (mode: 'ffa' | '2v2', shuffleRounds: number) => void) {
    this.onModeSelect = onModeSelect;
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

    // 标题
    const titleY = H * 0.14;
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    drawText(ctx, '原创扑克', W / 2, titleY, L.fontXXL, COLORS.TEXT_YELLOW, 'center');
    ctx.restore();
    drawText(ctx, '一副牌就能玩的对战', W / 2, titleY + L.fontXXL + L.gapM, L.fontM, COLORS.TEXT_GRAY, 'center');

    // 设置按钮
    this.btnSettings = { x: W - L.btnSmallW - L.margin, y: L.margin, w: L.btnSmallW, h: L.btnSmallH };
    drawButton(ctx, '⚙ 设置', this.btnSettings.x, this.btnSettings.y, this.btnSettings.w, this.btnSettings.h, 'rgba(255,255,255,0.15)');

    // 模式按钮
    const btnW = L.btnW;
    const btnH = L.btnH;
    const btnY = H * 0.44;
    const gap = L.gapXL;
    const totalW = btnW * 2 + gap;
    const startX = (W - totalW) / 2;

    this.btnFfa = { x: startX, y: btnY, w: btnW, h: btnH };
    this.btn2v2 = { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH };
    drawButton(ctx, '混战模式', startX, btnY, btnW, btnH, '#2d8b5e');
    drawButton(ctx, '2V2 组队', startX + btnW + gap, btnY, btnW, btnH, '#2980b9');

    // 规则提示
    drawText(ctx, '4人对战 · 计分牌5/10/K共100分', W / 2, H * 0.7, L.fontS, 'rgba(255,255,255,0.3)', 'center');
    drawText(ctx, '集齐4张奔流牌获胜', W / 2, H * 0.7 + L.fontS + L.gapS, L.fontS, 'rgba(255,255,255,0.3)', 'center');

    this.drawCornerCards(ctx, W, H);

    if (this.settings.isVisible) this.settings.render(ctx);
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
    if (hitTest(this.btnFfa, x, y)) {
      sfx.click();
      this.onModeSelect('ffa', this.settings.getShuffleRounds());
      return;
    }
    if (hitTest(this.btn2v2, x, y)) {
      sfx.click();
      this.onModeSelect('2v2', this.settings.getShuffleRounds());
      return;
    }
  }

  touchMove(x: number, y: number): void {
    if (this.settings.isVisible) this.settings.touchMove(x, y);
  }

  touchEnd(): void {
    if (this.settings.isVisible) this.settings.touchEnd();
  }
}
