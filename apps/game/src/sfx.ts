declare const wx: any;

// 配置 CDN 后改为 true 并替换 URL
const SFX_ENABLED = false;
const SFX_CDN_BASE = '';

class SFXManager {
  private sounds: Record<string, any> = {};
  private _volume = 0.7;

  get volume(): number {
    return this._volume;
  }

  setVolume(v: number): void {
    this._volume = Math.max(0, Math.min(1, v));
  }

  init(): void {
    if (!SFX_ENABLED) return;
    const files: Record<string, string> = {
      card: 'card.mp3',
      click: 'click.mp3',
      win: 'win.mp3',
      lose: 'lose.mp3',
      coin: 'coin.mp3',
      whoosh: 'whoosh.mp3',
    };
    for (const [name, file] of Object.entries(files)) {
      try {
        const audio = wx.createInnerAudioContext();
        audio.src = SFX_CDN_BASE + file;
        audio.volume = this._volume;
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
