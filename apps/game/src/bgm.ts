declare const wx: any;

class BGMManager {
  private audio: any = null;
  private _enabled = true;
  private _volume = 0.6;

  get enabled(): boolean {
    return this._enabled;
  }

  init(src: string): void {
    try {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = src;
      this.audio.loop = true;
      this.audio.volume = this._volume;
      this.audio.onPlay(() => {});
      this.audio.onError((err: any) => {
        console.warn('BGM error:', err);
      });
    } catch (e) {
      console.warn('BGM init failed:', e);
    }
  }

  play(): void {
    if (!this.audio || !this._enabled) return;
    try {
      this.audio.play();
    } catch (e) {}
  }

  pause(): void {
    if (!this.audio) return;
    try {
      this.audio.pause();
    } catch (e) {}
  }

  toggle(): void {
    this._enabled = !this._enabled;
    if (this._enabled) this.play();
    else this.pause();
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.audio) this.audio.volume = this._volume;
  }

  destroy(): void {
    if (this.audio) {
      try {
        this.audio.destroy();
      } catch (e) {}
      this.audio = null;
    }
  }
}

export const bgm = new BGMManager();
