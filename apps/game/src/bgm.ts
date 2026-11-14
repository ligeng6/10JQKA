declare const wx: any;

/**
 * BGM 管理器 — 从 CDN 加载音乐
 * 音频不打进包体，运行时远程加载
 */
const BGM_CDN_URL = 'https://your-cdn.com/audio/bgm.mp3'; // TODO: 替换为实际 CDN 地址

class BGMManager {
  private audio: any = null;
  private _enabled = true;
  private _volume = 0.6;
  private _loaded = false;

  get enabled(): boolean {
    return this._enabled;
  }

  get loaded(): boolean {
    return this._loaded;
  }

  init(src?: string): void {
    const url = src || BGM_CDN_URL;
    try {
      this.audio = wx.createInnerAudioContext();
      this.audio.src = url;
      this.audio.loop = true;
      this.audio.volume = this._volume;

      this.audio.onCanplay(() => {
        this._loaded = true;
      });

      this.audio.onError((err: any) => {
        console.warn('BGM load error (CDN not configured?):', err?.errMsg || err);
        this._loaded = false;
      });
    } catch (e) {
      console.warn('BGM init failed:', e);
    }
  }

  play(): void {
    if (!this.audio || !this._enabled || !this._loaded) return;
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
