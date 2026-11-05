import type { GameMode } from '@pokergame/shared';
import { GameScene } from './scenes/gameScene';

declare const wx: any;

function main(): void {
  // 小游戏：wx.createCanvas() 首次调用返回共享主画布
  const canvas = wx.createCanvas();
  const dpr = wx.getSystemInfoSync().pixelRatio || 1;
  const w = canvas.width / dpr;
  const h = canvas.height / dpr;

  const ctx = canvas.getContext('2d');

  const scene = new GameScene(w, h, 'ffa');

  // 触摸事件
  wx.onTouchStart((e: any) => {
    const touch = e.touches[0];
    scene.touch(touch.clientX * dpr, touch.clientY * dpr);
  });

  // 游戏循环
  function loop(): void {
    scene.render(ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
