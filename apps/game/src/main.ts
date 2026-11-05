import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';

declare const wx: any;

type Scene = MenuScene | GameScene;
let currentScene: Scene;
let canvas: any;
let ctx: any;
let dpr = 1;
let screenW = 0;
let screenH = 0;

function switchToMenu(): void {
  currentScene = new MenuScene(screenW, screenH, (mode) => {
    currentScene = new GameScene(screenW, screenH, mode, switchToMenu);
  });
}

function main(): void {
  canvas = wx.createCanvas();
  const sys = wx.getSystemInfoSync();
  dpr = sys.pixelRatio || 1;
  // 横屏：width > height
  screenW = sys.windowWidth;
  screenH = sys.windowHeight;

  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;

  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  switchToMenu();

  wx.onTouchStart((e: any) => {
    const t = e.touches[0];
    currentScene.touch(t.clientX, t.clientY);
  });

  function loop(): void {
    currentScene.render(ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
