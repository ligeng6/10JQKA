import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';
import { RoomScene } from './scenes/roomScene';
import { bgm } from './bgm';
import { sfx } from './sfx';
import { ShareManager } from './network/share';

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

  // 联机入口
  currentScene.onCreateRoom = (room: any) => {
    currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r: any) => {
      currentScene = new GameScene(screenW, screenH, r.mode, switchToMenu, r.shuffleRounds);
    });
    sfx.click();
  };
  currentScene.onJoinRoom = () => {
    // TODO: 输入房间码界面
    sfx.click();
  };
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

  bgm.init('assets/audio/bgm.mp3');
  bgm.play();
  sfx.init();

  // 解析启动参数（好友分享进入）
  const launch = ShareManager.parseLaunchOptions();
  if (launch.action === 'join' && launch.roomCode) {
    // 自动加入房间
    // TODO: 连接房间
  }

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

  function loop(): void {
    currentScene.render(ctx);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

main();
