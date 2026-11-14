/**
 * 屏幕适配工具 — 以 1280×720 为设计基准，等比缩放
 * 所有 UI 尺寸通过 L.xxx 获取，自动适配机型
 */

export class Layout {
  private _W = 1280;
  private _H = 720;

  // 基准尺寸
  private readonly BASE_W = 1280;
  private readonly BASE_H = 720;

  // 缩放系数
  private _s = 1; // uniform scale
  private _sx = 1;
  private _sy = 1;

  update(w: number, h: number): void {
    if (w <= 0 || h <= 0) return;
    this._W = w;
    this._H = h;
    this._sx = w / this.BASE_W;
    this._sy = h / this.BASE_H;
    this._s = Math.min(this._sx, this._sy);
  }

  get W(): number { return this._W; }
  get H(): number { return this._H; }

  /** 等比缩放 */
  s(px: number): number {
    return Math.round(px * this._s);
  }

  /** X轴缩放 */
  sx(px: number): number {
    return Math.round(px * this._sx);
  }

  /** Y轴缩放 */
  sy(px: number): number {
    return Math.round(px * this._sy);
  }

  /** 限制范围 */
  clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  // ─── 语义化尺寸 ─────────────────────────────────

  // 字体
  get fontXS(): number { return this.s(16); }
  get fontS(): number { return this.s(20); }
  get fontM(): number { return this.s(24); }
  get fontL(): number { return this.s(30); }
  get fontXL(): number { return this.s(38); }
  get fontXXL(): number { return this.s(52); }

  // 间距
  get gapXS(): number { return this.s(4); }
  get gapS(): number { return this.s(8); }
  get gapM(): number { return this.s(16); }
  get gapL(): number { return this.s(24); }
  get gapXL(): number { return this.s(36); }

  // 卡牌
  get cardW(): number { return this.clamp(this.sx(80), 56, 110); }
  get cardH(): number { return this.cardW * 1.4; }
  get cardSmallW(): number { return this.clamp(this.sx(44), 32, 64); }
  get cardSmallH(): number { return this.cardSmallW * 1.4; }
  get cardMiniW(): number { return this.clamp(this.sx(32), 24, 48); }
  get cardMiniH(): number { return this.cardMiniW * 1.4; }
  get cardGap(): number { return this.s(6); }

  // 按钮
  get btnW(): number { return this.clamp(this.sx(130), 100, 180); }
  get btnH(): number { return this.clamp(this.sy(56), 42, 72); }
  get btnSmallW(): number { return this.clamp(this.sx(80), 60, 110); }
  get btnSmallH(): number { return this.clamp(this.sy(40), 32, 56); }
  get btnRadius(): number { return this.s(12); }

  // 面板
  get panelRadius(): number { return this.s(14); }
  get margin(): number { return this.clamp(this.sx(20), 12, 32); }

  // 顶栏
  get topBarH(): number { return this.clamp(this.sy(52), 40, 68); }

  // 手牌区
  get handAreaH(): number { return this.clamp(this.sy(180), 140, 230); }

  // 对手面板
  get opponentW(): number { return this.clamp(this.sx(130), 100, 170); }
  get opponentH(): number { return this.clamp(this.sy(95), 72, 125); }

  // 牌桌
  get tableX(): number { return this.W * 0.2; }
  get tableY(): number { return this.topBarH + this.gapM; }
  get tableW(): number { return this.W * 0.6; }
  get tableH(): number { return this.H * 0.32; }
}

export const L = new Layout();
