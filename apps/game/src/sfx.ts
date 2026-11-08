declare const wx: any;

/**
 * 音效管理器 — 加载 .mp3 音效文件
 */
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
    const files: Record<string, string> = {
      card: 'assets/audio/sfx/card.mp3',
      click: 'assets/audio/sfx/click.mp3',
      win: 'assets/audio/sfx/win.mp3',
      lose: 'assets/audio/sfx/lose.mp3',
      coin: 'assets/audio/sfx/coin.mp3',
      whoosh: 'assets/audio/sfx/whoosh.mp3',
    };

    for (const [name, src] of Object.entries(files)) {
      try {
        const audio = wx.createInnerAudioContext();
        audio.src = src;
        audio.volume = this._volume;
        this.sounds[name] = audio;
      } catch (e) {
        console.warn('SFX load failed:', name, e);
      }
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

  setVolumeFor(name: string, v: number): void {
    const audio = this.sounds[name];
    if (audio) audio.volume = v;
  }
}

export const sfx = new SFXManager();
