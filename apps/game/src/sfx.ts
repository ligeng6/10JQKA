declare const wx: any;

/**
 * 音效管理器 — 从 CDN 加载音效
 * 音频不打进包体，运行时远程加载
 */
const SFX_CDN_BASE = 'https://your-cdn.com/audio/sfx/'; // TODO: 替换为实际 CDN 地址

const SFX_FILES: Record<string, string> = {
  card: 'card.mp3',
  click: 'click.mp3',
  win: 'win.mp3',
  lose: 'lose.mp3',
  coin: 'coin.mp3',
  whoosh: 'whoosh.mp3',
};

class SFXManager {
  private sounds: Record<string, any> = {};
  private _volume = 0.7;
  private _loaded = false;

  get volume(): number {
    return this._volume;
  }

  get loaded(): boolean {
    return this._loaded;
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
    for (const audio of Object.values(this.sounds)) {
      try {
        (audio as any).volume = this._volume;
      } catch (e) {}
    }
  }

  init(): void {
    for (const [name, file] of Object.entries(SFX_FILES)) {
      try {
        const audio = wx.createInnerAudioContext();
        audio.src = SFX_CDN_BASE + file;
        audio.volume = this._volume;
        audio.onCanplay(() => {
          this._loaded = true;
        });
        audio.onError(() => {});
        this.sounds[name] = audio;
      } catch (e) {}
    }
  }

  private play(name: string): void {
    const audio = this.sounds[name];
    if (!audio || this._volume <= 0) return;
    try {
      audio.volume = this._volume;
      audio.stop();
      audio.play();
    } catch (e) {}
  }

  playCard(): void { this.play('card'); }
  click(): void { this.play('click'); }
  selectCard(): void { this.play('click'); }
  win(): void { this.play('win'); }
  lose(): void { this.play('lose'); }
  steal(): void { this.play('coin'); }
  pass(): void { this.play('whoosh'); }
  bomb(): void { this.play('whoosh'); }
}

export const sfx = new SFXManager();
