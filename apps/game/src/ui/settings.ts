import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';
import { COLORS } from '../render/constants';
import { bgm } from '../bgm';
import { sfx } from '../sfx';

export class SettingsPanel {
  private visible = false;
  private W = 0;
  private H = 0;

  // 滑条
  private bgmSlider: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private sfxSlider: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnClose: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private dragging: 'bgm' | 'sfx' | null = null;

  // 当前音量 (0-1)
  private bgmVol = 0.6;
  private sfxVol = 0.7;

  show(w: number, h: number): void {
    this.visible = true;
    this.W = w;
    this.H = h;
  }

  hide(): void {
    this.visible = false;
    this.dragging = null;
  }

  get isVisible(): boolean {
    return this.visible;
  }

  render(ctx: any): void {
    if (!this.visible) return;

    const W = this.W;
    const H = this.H;

    // 遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, W, H);

    // 面板
    const pw = Math.min(500, W * 0.7);
    const ph = Math.min(360, H * 0.55);
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;

    drawPanel(ctx, px, py, pw, ph, 'rgba(30,60,40,0.95)');
    ctx.strokeStyle = 'rgba(255,215,0,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 16);
    ctx.stroke();

    // 标题
    drawText(ctx, '⚙ 设置', W / 2, py + 36, 30, COLORS.TEXT_YELLOW, 'center');

    // BGM 音量
    const sliderW = pw * 0.6;
    const sliderH = 12;
    const sliderX = px + (pw - sliderW) / 2;

    const bgmY = py + 100;
    drawText(ctx, `背景音乐 ${Math.round(this.bgmVol * 100)}%`, px + pw / 2, bgmY - 18, 22, COLORS.TEXT_WHITE, 'center');
    this.drawSlider(ctx, sliderX, bgmY, sliderW, sliderH, this.bgmVol);
    this.bgmSlider = { x: sliderX, y: bgmY - 20, w: sliderW, h: 50 };

    // SFX 音量
    const sfxY = py + 190;
    drawText(ctx, `音效 ${Math.round(this.sfxVol * 100)}%`, px + pw / 2, sfxY - 18, 22, COLORS.TEXT_WHITE, 'center');
    this.drawSlider(ctx, sliderX, sfxY, sliderW, sliderH, this.sfxVol);
    this.sfxSlider = { x: sliderX, y: sfxY - 20, w: sliderW, h: 50 };

    // 测试按钮
    const testW = 100, testH = 40;
    const testY = py + 260;
    drawButton(ctx, '测试音乐', W / 2 - testW - 10, testY, testW, testH, '#2980b9');
    drawButton(ctx, '测试音效', W / 2 + 10, testY, testW, testH, '#8e44ad');

    // 关闭按钮
    this.btnClose = { x: px + pw - 50, y: py + 12, w: 38, h: 38 };
    drawButton(ctx, '✕', this.btnClose.x, this.btnClose.y, 38, 38, '#c0392b');
  }

  private drawSlider(ctx: any, x: number, y: number, w: number, h: number, value: number): void {
    // 轨道
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();

    // 填充
    const fillW = w * value;
    if (fillW > 0) {
      const grad = ctx.createLinearGradient(x, y, x + fillW, y);
      grad.addColorStop(0, '#27ae60');
      grad.addColorStop(1, '#2ecc71');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, fillW, h, h / 2);
      ctx.fill();
    }

    // 滑块
    const knobX = x + fillW - 14;
    const knobY = y + h / 2 - 14;
    ctx.beginPath();
    ctx.arc(knobX + 14, knobY + 14, 14, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  touch(x: number, y: number): boolean {
    if (!this.visible) return false;

    if (hitTest(this.btnClose, x, y)) {
      this.hide();
      sfx.click();
      return true;
    }

    // 滑条拖动
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

    return true; // 拦截所有点击
  }

  touchMove(x: number, y: number): void {
    if (this.dragging === 'bgm') this.updateBgmFromX(x);
    else if (this.dragging === 'sfx') this.updateSfxFromX(x);
  }

  touchEnd(): void {
    this.dragging = null;
  }

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

  /** 测试音乐 */
  testBgm(): void {
    bgm.play();
    sfx.click();
  }

  /** 测试音效 */
  testSfx(): void {
    sfx.playCard();
  }
}
