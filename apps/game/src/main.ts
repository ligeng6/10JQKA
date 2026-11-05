import type { GameMode } from '@pokergame/shared';
import { GameScene } from './scenes/gameScene';

declare const wx: any;
declare const canvas: any;

let scene: GameScene;

function main(): void {
  const dpr = wx.getSystemInfoSync().pixelRatio;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  const ctx = canvas.getContext('2d');

  scene = new GameScene(w, h, 'ffa');

  // 触摸事件
  wx.onTouchStart((e: any) => {
    const touch = e.touches[0];
    scene.touch(touch.clientX, touch.clientY);
  });

  // 游戏循环
  function loop(): void {
    scene.render(ctx);
    requestAnimationFrame(loop);
  }
  loop();
}

main();
