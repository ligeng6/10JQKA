import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';
import { bgm } from './bgm';
import { sfx } from './sfx';

declare const wx: any;

let currentScene: any;
let canvas: any;
let ctx: any;
let screenW = 0;
let screenH = 0;

function switchToMenu(): void {
  currentScene = new MenuScene(screenW, screenH, (mode, shuffleRounds) => {
    currentScene = new GameScene(screenW, screenH, mode, switchToMenu, shuffleRounds);
    bgm.play();
  });
}

function main(): void {
  canvas = wx.createCanvas();
  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;
  screenW = sys.windowWidth;
  screenH = sys.windowHeight;

  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;

  ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  // 初始化 BGM
  bgm.init('assets/audio/bgm.mp3');
  bgm.play();
  sfx.init();

  switchToMenu();

  wx.onTouchStart((e: any) => {
    const t = e.touches[0];
    currentScene.touch(t.clientX, t.clientY);
  });

  wx.onTouchMove((e: any) => {
    const t = e.touches[0];
    if (currentScene.touchMove) currentScene.touchMove(t.clientX, t.clientY);
  });

  wx.onTouchEnd(() => {
    if (currentScene.touchEnd) currentScene.touchEnd();
  });

  wx.onWindowResize?.(() => {
    const info = wx.getSystemInfoSync();
    const d = info.pixelRatio || 1;
    screenW = info.windowWidth;
    screenH = info.windowHeight;
    canvas.width = screenW * d;
    canvas.height = screenH * d;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(d, d);
    if (currentScene.resize) currentScene.resize(screenW, screenH);
  });

  function loop(): void {
    currentScene.render(ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
