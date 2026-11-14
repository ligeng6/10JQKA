import { MenuScene } from './scenes/menuScene';
import { GameScene } from './scenes/gameScene';
import { RoomScene } from './scenes/roomScene';
import { bgm } from './bgm';
import { sfx } from './sfx';
import { ShareManager } from './network/share';
import { wxRoomManager, type WXRoomInfo } from './network/wxRoom';

declare const wx: any;

let currentScene: any;
let canvas: any;
let ctx: any;
let screenW = 0;
let screenH = 0;
let dpr = 1;
let running = false;

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
      await wxRoomManager.createRoom(mode, shuffleRounds);
      const room = wxRoomManager.room;
      if (room) {
        currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r: WXRoomInfo) => {
          currentScene = new GameScene(screenW, screenH, r.mode, switchToMenu, r.shuffleRounds, true);
          bgm.play();
        });
      }
    } catch (e) {
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
  menu.onJoinRoom = () => {
    sfx.click();
  };
  currentScene = menu;
}

function initCanvas(): void {
  canvas = wx.createCanvas();

  const sys = wx.getSystemInfoSync();
  dpr = sys.pixelRatio || 1;

  const rawW = sys.windowWidth;
  const rawH = sys.windowHeight;
  screenW = Math.max(rawW, rawH);
  screenH = Math.min(rawW, rawH);

  // 设置画布尺寸为物理像素
  canvas.width = screenW * dpr;
  canvas.height = screenH * dpr;

  ctx = canvas.getContext('2d');
  // 缩放到逻辑像素
  ctx.scale(dpr, dpr);

  console.log('[PokerGame] screen=' + screenW + 'x' + screenH + ' dpr=' + dpr + ' canvas=' + canvas.width + 'x' + canvas.height);
}

function startRenderLoop(): void {
  if (running) return;
  running = true;

  function frame(): void {
    if (!currentScene || !ctx) return;
    try {
      currentScene.render(ctx);
    } catch (e) {
      console.error('[PokerGame] render error:', e);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  console.log('[PokerGame] render loop started');
}

function bindTouch(): void {
  wx.onTouchStart((e: any) => {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    if (currentScene && currentScene.touch) {
      try {
        currentScene.touch(t.clientX, t.clientY);
      } catch (err) {
        console.error('[PokerGame] touch error:', err);
      }
    }
  });
  wx.onTouchMove((e: any) => {
    if (!e.touches || !e.touches[0]) return;
    const t = e.touches[0];
    if (currentScene && currentScene.touchMove) {
      currentScene.touchMove(t.clientX, t.clientY);
    }
  });
  wx.onTouchEnd(() => {
    if (currentScene && currentScene.touchEnd) {
      currentScene.touchEnd();
    }
  });
}

function main(): void {
  try {
    initCanvas();
  } catch (e) {
    console.error('[PokerGame] initCanvas error:', e);
  }

  bgm.init();
  sfx.init();

  // 解析分享链接
  const launch = ShareManager.parseLaunchOptions();
  if (launch.action === 'join' && launch.roomCode) {
    wxRoomManager.init();
    wxRoomManager.joinRoom(launch.roomCode).then(() => {
      const room = wxRoomManager.room;
      if (room) {
        currentScene = new RoomScene(screenW, screenH, room, switchToMenu, (r) => {
          currentScene = new GameScene(screenW, screenH, r.mode, switchToMenu, r.shuffleRounds, true);
        });
      }
    }).catch(() => {
      switchToMenu();
    });
  } else {
    switchToMenu();
  }

  bindTouch();
  startRenderLoop();
}

main();
