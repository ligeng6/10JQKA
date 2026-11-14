import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';
import { COLORS } from '../render/constants';
import { L } from '../render/layout';
import { bgm } from '../bgm';
import { sfx } from '../sfx';

export class SettingsPanel {
  private visible = false;
  private W = 0;
  private H = 0;

  private bgmSlider: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private sfxSlider: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnShuffleMinus: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnShufflePlus: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnTestBgm: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnTestSfx: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnClose: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private dragging: 'bgm' | 'sfx' | null = null;

  private bgmVol = 0.6;
  private sfxVol = 0.7;
  private shuffleRounds = 3;

  getShuffleRounds(): number { return this.shuffleRounds; }
  setShuffleRounds(n: number): void {
    this.shuffleRounds = Math.max(0, Math.min(10, n));
  }

  show(w: number, h: number): void {
    this.visible = true;
    this.W = w;
    this.H = h;
  }

  hide(): void { this.visible = false; this.dragging = null; }
  get isVisible(): boolean { return this.visible; }

  render(ctx: any): void {
    if (!this.visible) return;

    const W = this.W;
    const H = this.H;

    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);

    // 面板尺寸自适应
    const pw = Math.min(L.s(520), W * 0.82);
    const ph = Math.min(L.s(480), H * 0.72);
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;

    drawPanel(ctx, px, py, pw, ph, 'rgba(20,40,28,0.97)');
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.lineWidth = L.s(3);
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, L.panelRadius);
    ctx.stroke();

    // 标题
    const pad = L.gapL;
    drawText(ctx, '⚙ 游戏设置', W / 2, py + pad, L.fontXL, COLORS.TEXT_YELLOW, 'center');

    // 分区标题：音量
    let y = py + pad + L.fontXL + L.gapL;
    drawText(ctx, '─── 音量调节 ───', W / 2, y, L.fontS, 'rgba(255,255,255,0.3)', 'center');
    y += L.gapL + L.gapS;

    // BGM 滑条
    const sliderW = pw * 0.58;
    const sliderH = L.gapM;
    const sliderX = px + (pw - sliderW) / 2;

    drawText(ctx, `背景音乐  ${Math.round(this.bgmVol * 100)}%`, W / 2, y, L.fontM, '#fff', 'center');
    y += L.fontM + L.gapS;
    this.drawSlider(ctx, sliderX, y, sliderW, sliderH, this.bgmVol, '#27ae60');
    this.bgmSlider = { x: sliderX, y: y - L.gapM, w: sliderW, h: sliderH + L.gapL };
    y += sliderH + L.gapL;

    // SFX 滑条
    drawText(ctx, `音效音量  ${Math.round(this.sfxVol * 100)}%`, W / 2, y, L.fontM, '#fff', 'center');
    y += L.fontM + L.gapS;
    this.drawSlider(ctx, sliderX, y, sliderW, sliderH, this.sfxVol, '#3498db');
    this.sfxSlider = { x: sliderX, y: y - L.gapM, w: sliderW, h: sliderH + L.gapL };
    y += sliderH + L.gapL;

    // 分区标题：规则
    drawText(ctx, '─── 游戏规则 ───', W / 2, y, L.fontS, 'rgba(255,255,255,0.3)', 'center');
    y += L.gapL;

    // 洗牌次数
    drawText(ctx, '洗牌重置次数', W / 2, y, L.fontM, '#fff', 'center');
    y += L.fontM + L.gapS;

    const btnS = L.btnSmallH;
    const btnY = y;
    this.btnShuffleMinus = { x: W / 2 - btnS * 2 - L.gapM, y: btnY, w: btnS, h: btnS };
    this.btnShufflePlus = { x: W / 2 + btnS + L.gapM, y: btnY, w: btnS, h: btnS };

    drawButton(ctx, '−', this.btnShuffleMinus.x, btnY, btnS, btnS, '#c0392b');
    drawButton(ctx, '+', this.btnShufflePlus.x, btnY, btnS, btnS, '#27ae60');
    drawText(ctx, this.shuffleRounds === 0 ? '不洗牌' : String(this.shuffleRounds), W / 2, btnY + btnS / 2, L.fontXL, COLORS.TEXT_YELLOW, 'center', 'middle');
    y += btnS + L.gapL;

    // 测试按钮
    const testW = L.btnSmallW * 1.2;
    const testH = L.btnH;
    const testY = py + ph - testH - L.gapL;
    this.btnTestBgm = { x: W / 2 - testW - L.gapS, y: testY, w: testW, h: testH };
    this.btnTestSfx = { x: W / 2 + L.gapS, y: testY, w: testW, h: testH };
    drawButton(ctx, '🎵 测试', this.btnTestBgm.x, testY, testW, testH, '#2980b9');
    drawButton(ctx, '🔊 测试', this.btnTestSfx.x, testY, testW, testH, '#8e44ad');

    // 关闭按钮
    const closeS = L.btnSmallH;
    this.btnClose = { x: px + pw - closeS - L.gapM, y: py + L.gapM, w: closeS, h: closeS };
    drawButton(ctx, '✕', this.btnClose.x, this.btnClose.y, closeS, closeS, '#c0392b');
  }

  private drawSlider(ctx: any, x: number, y: number, w: number, h: number, value: number, color: string): void {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();

    const fillW = w * value;
    if (fillW > 2) {
      const grad = ctx.createLinearGradient(x, y, x + fillW, y);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + 'cc');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, fillW, h, h / 2);
      ctx.fill();
    }

    const knobR = h * 0.75;
    const knobX = x + fillW;
    ctx.beginPath();
    ctx.arc(knobX, y + h / 2, knobR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = L.s(3);
    ctx.stroke();
  }

  touch(x: number, y: number): boolean {
    if (!this.visible) return false;

    if (hitTest(this.btnClose, x, y)) { this.hide(); sfx.click(); return true; }
    if (hitTest(this.btnShuffleMinus, x, y)) {
      sfx.click();
      if (this.shuffleRounds > 0) this.shuffleRounds--;
      return true;
    }
    if (hitTest(this.btnShufflePlus, x, y)) {
      sfx.click();
      if (this.shuffleRounds < 10) this.shuffleRounds++;
      return true;
    }
    if (hitTest(this.btnTestBgm, x, y)) { bgm.play(); sfx.click(); return true; }
    if (hitTest(this.btnTestSfx, x, y)) { sfx.playCard(); return true; }

    if (hitTest(this.bgmSlider, x, y)) {
      this.dragging = 'bgm';
      this.updateBgmFromX(x);
      return true;
    }
    if (hitTest(this.sfxSlider, x, y)) {
      this.dragging = 'sfx';
      this.updateSfxFromX(x);
      return true;
    }
    return true;
  }

  touchMove(x: number, _y: number): void {
    if (this.dragging === 'bgm') this.updateBgmFromX(x);
    else if (this.dragging === 'sfx') this.updateSfxFromX(x);
  }

  touchEnd(): void { this.dragging = null; }

  private updateBgmFromX(x: number): void {
    const t = (x - this.bgmSlider.x) / this.bgmSlider.w;
    this.bgmVol = Math.max(0, Math.min(1, t));
    bgm.setVolume(this.bgmVol);
  }

  private updateSfxFromX(x: number): void {
    const t = (x - this.sfxSlider.x) / this.sfxSlider.w;
    this.sfxVol = Math.max(0, Math.min(1, t));
    sfx.setVolume(this.sfxVol);
    sfx.click();
  }
}
