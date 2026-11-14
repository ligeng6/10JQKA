import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';
import { RoomScene } from './scenes/roomScene';
import { bgm } from './bgm';
import { sfx } from './sfx';
import { ShareManager } from './network/share';
import { wxRoomManager, type WXRoomInfo, type WXRoomEvent } from './network/wxRoom';

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

  menu.onCreateRoom = async (mode, shuffleRounds) => {
    sfx.click();
    try {
      wxRoomManager.init();
      const roomId = await wxRoomManager.createRoom(mode, shuffleRounds);
      const room = wxRoomManager.room;
      if (room) {
        currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r: WXRoomInfo) => {
          currentScene = new GameScene(screenW, screenH, r.mode, switchToMenu, r.shuffleRounds, true);
          bgm.play();
        });
      }
    } catch (e) {
      console.warn('Create room failed:', e);
      // 降级：本地房间
      const room: WXRoomInfo = {
        roomId: ShareManager.generateRoomCode(),
        ownerId: 'local',
        mode,
        maxPlayers: 4,
        players: [{ openid: 'local', nickname: '房主', avatarUrl: '', seatIndex: 0, isReady: true, isAI: false }],
        status: 'waiting',
        shuffleRounds,
      };
      currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r) => {
        currentScene = new GameScene(screenW, screenH, r.mode, switchToMenu, r.shuffleRounds, false);
        bgm.play();
      });
    }
  };

  menu.onJoinRoom = async () => {
    sfx.click();
    // TODO: 房间码输入界面
  };

  currentScene = menu;
}

function main(): void {
  canvas = wx.createCanvas();
  const sys = wx.getSystemInfoSync();
  const dpr = sys.pixelRatio || 1;

  // 强制横屏：取较大值为宽，较小值为高
  const rawW = sys.windowWidth;
  const rawH = sys.windowHeight;
  screenW = Math.max(rawW, rawH);
  screenH = Math.min(rawW, rawH);

  // 设置画布物理像素
  try {
    canvas.width = screenW * dpr;
    canvas.height = screenH * dpr;
  } catch (e) {}

  ctx = canvas.getContext('2d');
  try {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  } catch (e) {}
  ctx.scale(dpr, dpr);

  console.log('[Main] screen:', screenW, 'x', screenH, 'dpr:', dpr);

  bgm.init('assets/audio/bgm.mp3');
  bgm.play();
  sfx.init();

  // 解析分享链接进入房间
  const launch = ShareManager.parseLaunchOptions();
  if (launch.action === 'join' && launch.roomCode) {
    wxRoomManager.init();
    wxRoomManager.joinRoom(launch.roomCode).then(() => {
      const room = wxRoomManager.room;
      if (room) {
        currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r) => {
          currentScene = new GameScene(screenW, screenH, r.mode, switchToMenu, r.shuffleRounds, true);
          bgm.play();
        });
      }
    }).catch(() => {
      switchToMenu();
    });
  } else {
    switchToMenu();
  }

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
