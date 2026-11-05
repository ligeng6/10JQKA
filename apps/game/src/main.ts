import type { GameMode } from '@pokergame/shared';
import { GameScene } from './scenes/gameScene';

declare const wx: any;

function main(): void {
  const canvas = wx.createCanvas();
  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;
  const screenW = sys.windowWidth;
  const screenH = sys.windowHeight;

  // 画布物理像素 = 屏幕逻辑像素 × DPR
  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;

  const ctx = canvas.getContext('2d');
  // 缩放上下文，之后用逻辑像素绘制
  ctx.scale(dpr, dpr);

  const scene = new GameScene(screenW, screenH, 'ffa');

  wx.onTouchStart((e: any) => {
    const t = e.touches[0];
    // touch 坐标就是逻辑像素，直接用
    scene.touch(t.clientX, t.clientY);
  });

  function loop(): void {
    scene.render(ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
