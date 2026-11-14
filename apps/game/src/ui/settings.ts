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

  /** 外部读取洗牌次数 */
  getShuffleRounds(): number {
    return this.shuffleRounds;
  }

  setShuffleRounds(n: number): void {
    this.shuffleRounds = Math.max(0, Math.min(10, n));
  }

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
    ctx.fillStyle = 'rgba(0,0,0,0.82)';
    ctx.fillRect(0, 0, W, H);

    // 面板 — 深色背景
    const pw = Math.min(L.s(540), W * 0.68);
    const ph = Math.min(L.s(480), H * 0.7);
    const px = (W - pw) / 2;
    const py = (H - ph) / 2;

    // 面板背景
    drawPanel(ctx, px, py, pw, ph, 'rgba(20,40,28,0.97)');
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(px, py, pw, ph, 20);
    ctx.stroke();

    // 标题
    drawText(ctx, '⚙ 游戏设置', W / 2, py + L.gapXL, L.fontXL, COLORS.TEXT_YELLOW, 'center');
    drawText(ctx, '─── 音量调节 ───', W / 2, py + L.gapXL * 2, L.fontS, 'rgba(255,255,255,0.3)', 'center');

    // BGM 音量
    const sliderW = pw * 0.55;
    const sliderH = L.gapM;
    const sliderX = px + (pw - sliderW) / 2;

    const bgmY = py + L.s(130);
    drawText(ctx, `背景音乐  ${Math.round(this.bgmVol * 100)}%`, px + pw / 2, bgmY - L.gapM, L.fontM, '#fff', 'center');
    this.drawSlider(ctx, sliderX, bgmY + 12, sliderW, sliderH, this.bgmVol, '#27ae60');
    this.bgmSlider = { x: sliderX, y: bgmY - 4, w: sliderW, h: 50 };

    // SFX 音量
    const sfxY = py + L.s(220);
    drawText(ctx, `音效音量  ${Math.round(this.sfxVol * 100)}%`, px + pw / 2, sfxY - L.gapM, L.fontM, '#fff', 'center');
    this.drawSlider(ctx, sliderX, sfxY + 12, sliderW, sliderH, this.sfxVol, '#3498db');
    this.sfxSlider = { x: sliderX, y: sfxY - 4, w: sliderW, h: 50 };

    // 洗牌次数
    const shuffleY = py + L.s(310);
    drawText(ctx, '─── 游戏规则 ───', W / 2, shuffleY - L.gapL, L.fontS, 'rgba(255,255,255,0.3)', 'center');
    drawText(ctx, '洗牌重置次数', W / 2, shuffleY + L.gapS, L.fontM, '#fff', 'center');

    const btnS = L.btnSmallH;
    this.btnShuffleMinus = { x: W / 2 - 110, y: shuffleY + 36, w: btnS, h: btnS };
    this.btnShufflePlus = { x: W / 2 + 62, y: shuffleY + 36, w: btnS, h: btnS };

    drawButton(ctx, '−', this.btnShuffleMinus.x, this.btnShuffleMinus.y, btnS, btnS, '#c0392b');
    drawButton(ctx, '+', this.btnShufflePlus.x, this.btnShufflePlus.y, btnS, btnS, '#27ae60');
    drawText(ctx, this.shuffleRounds === 0 ? '不洗牌' : String(this.shuffleRounds), W / 2, shuffleY + L.gapXL, L.fontXL, COLORS.TEXT_YELLOW, 'center', 'middle');

    // 测试按钮
    const testW = L.btnSmallW * 1.3; const testH = L.btnH;
    const testY = py + ph - L.btnH - L.gapL;
    this.btnTestBgm = { x: W / 2 - testW - 12, y: testY, w: testW, h: testH };
    this.btnTestSfx = { x: W / 2 + 12, y: testY, w: testW, h: testH };
    drawButton(ctx, '🎵 测试', this.btnTestBgm.x, testY, testW, testH, '#2980b9');
    drawButton(ctx, '🔊 测试', this.btnTestSfx.x, testY, testW, testH, '#8e44ad');

    // 关闭按钮
    this.btnClose = { x: px + pw - L.btnSmallH - L.gapM, y: py + L.gapM, w: L.btnSmallH, h: L.btnSmallH };
    drawButton(ctx, '✕', this.btnClose.x, this.btnClose.y, L.btnSmallH, L.btnSmallH, '#c0392b');
  }

  private drawSlider(ctx: any, x: number, y: number, w: number, h: number, value: number, color: string): void {
    // 轨道
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    roundRect(ctx, x, y, w, h, h / 2);
    ctx.fill();

    // 填充
    const fillW = w * value;
    if (fillW > 2) {
      const grad = ctx.createLinearGradient(x, y, x + fillW, y);
      grad.addColorStop(0, color);
      grad.addColorStop(1, color + 'cc');
      ctx.fillStyle = grad;
      roundRect(ctx, x, y, fillW, h, h / 2);
      ctx.fill();
    }

    // 滑块
    const knobX = x + fillW;
    const knobR = 16;
    ctx.beginPath();
    ctx.arc(knobX, y + h / 2, knobR, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  touch(x: number, y: number): boolean {
    if (!this.visible) return false;

    if (hitTest(this.btnClose, x, y)) {
      this.hide();
      sfx.click();
      return true;
    }
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
    if (hitTest(this.btnTestBgm, x, y)) {
      bgm.play();
      sfx.click();
      return true;
    }
    if (hitTest(this.btnTestSfx, x, y)) {
      sfx.playCard();
      return true;
    }

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
}
