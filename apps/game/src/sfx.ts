declare const wx: any;

/**
 * 音效管理器 — Web Audio API 生成简单音效
 * 支持：出牌 / 选牌 / 按钮 / 偷牌 / 胜利 / 失败
 */
class SFXManager {
  private ctx: any = null;
  private _volume = 0.7;

  get volume(): number {
    return this._volume;
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
  }

  private getAudioCtx(): any {
    if (!this.ctx) {
      try {
        // 小游戏环境
        this.ctx = wx.createWebAudioContext();
      } catch (e) {
        try {
          this.ctx = new (wx.AudioContext || AudioContext)();
        } catch (e2) {
          this.ctx = null;
        }
      }
    }
    return this.ctx;
  }

  /** 播放音调 */
  private playTone(freq: number, duration: number, type: string = 'sine', volume: number = 1): void {
    const ac = this.getAudioCtx();
    if (!ac || this._volume <= 0) return;

    try {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ac.currentTime);
      gain.gain.setValueAtTime(this._volume * volume * 0.3, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime);
      osc.stop(ac.currentTime + duration);
    } catch (e) {}
  }

  /** 出牌音效 */
  playCard(): void {
    this.playTone(600, 0.15, 'triangle', 1);
    setTimeout(() => this.playTone(800, 0.1, 'triangle', 0.8), 50);
  }

  /** 选牌音效 */
  selectCard(): void {
    this.playTone(500, 0.08, 'sine', 0.6);
  }

  /** 按钮点击 */
  click(): void {
    this.playTone(400, 0.06, 'square', 0.4);
  }

  /** 偷牌 */
  steal(): void {
    this.playTone(300, 0.12, 'sawtooth', 0.7);
    setTimeout(() => this.playTone(200, 0.15, 'sawtooth', 0.5), 80);
  }

  /** 过牌 */
  pass(): void {
    this.playTone(250, 0.1, 'sine', 0.4);
  }

  /** 胜利 */
  win(): void {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.25, 'triangle', 0.8), i * 120);
    });
  }

  /** 失败 */
  lose(): void {
    const notes = [400, 350, 300, 250];
    notes.forEach((f, i) => {
      setTimeout(() => this.playTone(f, 0.3, 'triangle', 0.6), i * 150);
    });
  }

  /** 炸弹 */
  bomb(): void {
    this.playTone(150, 0.3, 'sawtooth', 1);
    setTimeout(() => this.playTone(100, 0.4, 'sawtooth', 0.8), 100);
    setTimeout(() => this.playTone(80, 0.5, 'sawtooth', 0.6), 200);
  }
}

export const sfx = new SFXManager();
