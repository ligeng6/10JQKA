import { COLORS, SIZES } from '../render/constants';
import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';

export class MenuScene {
  private canvasW: number;
  private canvasH: number;
  private onModeSelect: (mode: 'ffa' | '2v2') => void;

  private btnFfa: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btn2v2: Rect = { x: 0, y: 0, w: 0, h: 0 };

  // 粒子装饰
  private particles: { x: number; y: number; vx: number; vy: number; r: number; a: number }[] = [];

  constructor(w: number, h: number, onModeSelect: (mode: 'ffa' | '2v2') => void) {
    this.canvasW = w;
    this.canvasH = h;
    this.onModeSelect = onModeSelect;
    this.initParticles();
  }

  private initParticles(): void {
    for (let i = 0; i < 30; i++) {
      this.particles.push({
        x: Math.random() * this.canvasW,
        y: Math.random() * this.canvasH,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        r: Math.random() * 3 + 1,
        a: Math.random() * 0.3 + 0.1,
      });
    }
  }

  update(w: number, h: number): void {
    this.canvasW = w;
    this.canvasH = h;
  }

  render(ctx: any): void {
    const W = this.canvasW;
    const H = this.canvasH;

    // 背景渐变
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d2b1a');
    bg.addColorStop(0.5, '#1a472a');
    bg.addColorStop(1, '#0d2b1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 粒子
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,215,0,${p.a})`;
      ctx.fill();
    }

    // 标题
    const titleY = H * 0.22;
    ctx.save();
    ctx.shadowColor = '#ffd700';
    ctx.shadowBlur = 30;
    drawText(ctx, '原创扑克', W / 2, titleY, Math.min(72, W * 0.08), COLORS.TEXT_YELLOW, 'center');
    ctx.restore();
    drawText(ctx, '一副牌就能玩的对战', W / 2, titleY + 60, Math.min(28, W * 0.028), COLORS.TEXT_GRAY, 'center');

    // 按钮
    const btnW = Math.min(280, W * 0.28);
    const btnH = Math.min(80, H * 0.12);
    const btnY = H * 0.52;
    const gap = 40;
    const totalW = btnW * 2 + gap;
    const startX = (W - totalW) / 2;

    this.btnFfa = { x: startX, y: btnY, w: btnW, h: btnH };
    this.btn2v2 = { x: startX + btnW + gap, y: btnY, w: btnW, h: btnH };

    drawButton(ctx, '混战模式', startX, btnY, btnW, btnH, '#2d8b5e');
    drawButton(ctx, '2V2 组队', startX + btnW + gap, btnY, btnW, btnH, '#2980b9');

    // 底部提示
    drawText(ctx, '4人对战 · 计分牌5/10/K共100分 · 集齐4张奔流牌获胜', W / 2, H * 0.85, Math.min(22, W * 0.022), 'rgba(255,255,255,0.3)', 'center');

    // 装饰角标
    this.drawCornerCards(ctx, W, H);
  }

  private drawCornerCards(ctx: any, W: number, H: number): void {
    const cw = 50, ch = 70;
    // 左上
    ctx.save();
    ctx.translate(40, 40);
    ctx.rotate(-0.15);
    ctx.fillStyle = '#fff';
    roundRect(ctx, 0, 0, cw, ch, 6);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.font = `bold ${cw * 0.35}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('A', cw * 0.1, ch * 0.08);
    ctx.font = `${cw * 0.25}px sans-serif`;
    ctx.fillText('♥', cw * 0.1, ch * 0.28);
    ctx.restore();

    // 右上
    ctx.save();
    ctx.translate(W - 40 - cw, 40);
    ctx.rotate(0.15);
    ctx.fillStyle = '#fff';
    roundRect(ctx, 0, 0, cw, ch, 6);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.font = `bold ${cw * 0.35}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('K', cw * 0.1, ch * 0.08);
    ctx.font = `${cw * 0.25}px sans-serif`;
    ctx.fillText('♠', cw * 0.1, ch * 0.28);
    ctx.restore();

    // 左下
    ctx.save();
    ctx.translate(40, H - 40 - ch);
    ctx.rotate(0.12);
    ctx.fillStyle = '#fff';
    roundRect(ctx, 0, 0, cw, ch, 6);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.font = `bold ${cw * 0.35}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('Q', cw * 0.1, ch * 0.08);
    ctx.font = `${cw * 0.25}px sans-serif`;
    ctx.fillText('♣', cw * 0.1, ch * 0.28);
    ctx.restore();

    // 右下
    ctx.save();
    ctx.translate(W - 40 - cw, H - 40 - ch);
    ctx.rotate(-0.12);
    ctx.fillStyle = '#fff';
    roundRect(ctx, 0, 0, cw, ch, 6);
    ctx.fill();
    ctx.fillStyle = '#c0392b';
    ctx.font = `bold ${cw * 0.35}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('J', cw * 0.1, ch * 0.08);
    ctx.font = `${cw * 0.25}px sans-serif`;
    ctx.fillText('♦', cw * 0.1, ch * 0.28);
    ctx.restore();
  }

  touch(x: number, y: number): void {
    if (hitTest(this.btnFfa, x, y)) {
      this.onModeSelect('ffa');
      return;
    }
    if (hitTest(this.btn2v2, x, y)) {
      this.onModeSelect('2v2');
      return;
    }
  }
}
