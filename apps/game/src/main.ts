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
  const menu = new MenuScene(screenW, screenH);

  menu.onStartSolo = (mode, shuffleRounds) => {
    currentScene = new GameScene(screenW, screenH, mode, switchToMenu, shuffleRounds, false);
    bgm.play();
    sfx.click();
  };

  menu.onCreateRoom = (mode, shuffleRounds) => {
    const room = {
      code: ShareManager.generateRoomCode(),
      hostId: 'local',
      mode,
      maxPlayers: 4,
      players: [
        { id: 'local', nickname: '房主', avatar: '', seatIndex: 0, isReady: true },
      ],
      status: 'waiting' as const,
      shuffleRounds,
    };
    currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r: any) => {
      const mode = r.mode || 'ffa';
      const online = r.players.some((p: any) => !p.id.startsWith('ai_'));
      currentScene = new GameScene(screenW, screenH, mode, switchToMenu, r.shuffleRounds, online);
      bgm.play();
    });
    sfx.click();
  };

  menu.onJoinRoom = () => {
    // TODO: 输入房间码界面
    sfx.click();
  };

  currentScene = menu;
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

  const launch = ShareManager.parseLaunchOptions();
  if (launch.action === 'join' && launch.roomCode) {
    // TODO: 自动加入房间
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
