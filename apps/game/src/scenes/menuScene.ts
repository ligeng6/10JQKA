import { COLORS } from '../render/constants';
import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';

export class MenuScene {
  private W: number;
  private H: number;
  private onModeSelect: (mode: 'ffa' | '2v2', shuffleRounds: number) => void;

  private shuffleRounds = 3;
  private btnFfa: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btn2v2: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnMinus: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnPlus: Rect = { x: 0, y: 0, w: 0, h: 0 };

  private particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];

  constructor(w: number, h: number, onModeSelect: (mode: 'ffa' | '2v2', shuffleRounds: number) => void) {
    this.W = w;
    this.H = h;
    this.onModeSelect = onModeSelect;
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 3 + 1, a: Math.random() * 0.3 + 0.1,
      });
    }
  }

  update(w: number, h: number): void {
    this.W = w;
    this.H = h;
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

    // 粒子
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
    const titleY = H * 0.15;
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    drawText(ctx, '原创扑克', W / 2, titleY, Math.min(68, W * 0.07), COLORS.TEXT_YELLOW, 'center');
    ctx.restore();
    drawText(ctx, '一副牌就能玩的对战', W / 2, titleY + 52, Math.min(24, W * 0.024), COLORS.TEXT_GRAY, 'center');

    // 设置区
    const settingsY = H * 0.38;
    drawPanel(ctx, W / 2 - 200, settingsY, 400, 64, 'rgba(255,255,255,0.06)');
    drawText(ctx, '洗牌重置次数', W / 2 - 160, settingsY + 32, 22, COLORS.TEXT_WHITE, 'left', 'middle');

    // - 和 + 按钮
    const btnS = 40;
    this.btnMinus = { x: W / 2 + 60, y: settingsY + 12, w: btnS, h: btnS };
    this.btnPlus = { x: W / 2 + 150, y: settingsY + 12, w: btnS, h: btnS };

    drawButton(ctx, '-', this.btnMinus.x, this.btnMinus.y, btnS, btnS, '#c0392b');
    drawButton(ctx, '+', this.btnPlus.x, this.btnPlus.y, btnS, btnS, '#27ae60');
    drawText(ctx, this.shuffleRounds === 0 ? '不洗牌' : String(this.shuffleRounds), W / 2 + 125, settingsY + 32, 28, COLORS.TEXT_YELLOW, 'center', 'middle');

    drawText(ctx, '0 = 牌库空后不恢复', W / 2, settingsY + 72, 16, 'rgba(255,255,255,0.25)', 'center');

    // 模式按钮
    const btnW = Math.min(240, W * 0.24);
    const btnH = Math.min(72, H * 0.1);
    const btnY = H * 0.58;
    const gap = 36;
    const totalW = btnW * 2 + gap;
    const startX = (W - totalW) / 2;

    this.btnFfa = { x: startX, y: btnY, w: btnW, h: btnH };
    this.btn2v2 = { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH };

    drawButton(ctx, '混战模式', startX, btnY, btnW, btnH, '#2d8b5e');
    drawButton(ctx, '2V2 组队', startX + btnW + gap, btnY, btnW, btnH, '#2980b9');

    // 规则提示
    drawText(ctx, '4人对战 · 计分牌5/10/K共100分 · 集齐4张奔流牌获胜', W / 2, H * 0.88, Math.min(18, W * 0.018), 'rgba(255,255,255,0.2)', 'center');

    this.drawCornerCards(ctx, W, H);
  }

  private drawCornerCards(ctx: any, W: number, H: number): void {
    const cw = 44, ch = 62;
    const corners = [
      { x: 30, y: 30, r: -0.15, rank: 'A', suit: '♥', color: '#c0392b' },
      { x: W - 30 - cw, y: 30, r: 0.15, rank: 'K', suit: '♠', color: '#2c3e50' },
      { x: 30, y: H - 30 - ch, r: 0.12, rank: 'Q', suit: '♣', color: '#2c3e50' },
      { x: W - 30 - cw, y: H - 30 - ch, r: -0.12, rank: 'J', suit: '♦', color: '#c0392b' },
    ];
    for (const c of corners) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.r);
      ctx.fillStyle = '#fff';
      roundRect(ctx, 0, 0, cw, ch, 5);
      ctx.fill();
      ctx.fillStyle = c.color;
      ctx.font = `bold ${cw * 0.32}px sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(c.rank, cw * 0.1, ch * 0.08);
      ctx.font = `${cw * 0.22}px sans-serif`;
      ctx.fillText(c.suit, cw * 0.1, ch * 0.28);
      ctx.restore();
    }
  }

  touch(x: number, y: number): void {
    if (hitTest(this.btnMinus, x, y)) {
      if (this.shuffleRounds > 0) this.shuffleRounds--;
      return;
    }
    if (hitTest(this.btnPlus, x, y)) {
      if (this.shuffleRounds < 10) this.shuffleRounds++;
      return;
    }
    if (hitTest(this.btnFfa, x, y)) {
      this.onModeSelect('ffa', this.shuffleRounds);
      return;
    }
    if (hitTest(this.btn2v2, x, y)) {
      this.onModeSelect('2v2', this.shuffleRounds);
      return;
    }
  }
}
