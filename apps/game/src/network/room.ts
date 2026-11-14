import { ShareManager } from './share';

declare const wx: any;

export interface Player {
  id: string;
  nickname: string;
  avatar: string;
  seatIndex: number;
  isReady: boolean;
}

export interface Room {
  code: string;
  hostId: string;
  mode: 'ffa' | '2v2';
  maxPlayers: number;
  players: Player[];
  status: 'waiting' | 'playing' | 'finished';
  shuffleRounds: number;
}

export type RoomEvent =
  | { type: 'player-joined'; player: Player }
  | { type: 'player-left'; playerId: string }
  | { type: 'game-start'; room: Room }
  | { type: 'action'; playerId: string; data: any }
  | { type: 'error'; message: string };

type RoomEventListener = (event: RoomEvent) => void;

/**
 * 房间管理 — 创建/加入/分享/状态同步
 * 基于微信云开发 或 WebSocket 后端
 */
export class RoomManager {
  private room: Room | null = null;
  private myPlayerId = '';
  private listeners: RoomEventListener[] = [];
  private ws: any = null;

  get currentRoom(): Room | null {
    return this.room;
  }

  get currentPlayerId(): string {
    return this.myPlayerId;
  }

  get mySeatIndex(): number {
    const me = this.room?.players.find((p) => p.id === this.myPlayerId);
    return me?.seatIndex ?? -1;
  }

  onEvent(listener: RoomEventListener): void {
    this.listeners.push(listener);
  }

  private emit(event: RoomEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (e) {}
    }
  }

  /** 创建房间 */
  createRoom(mode: 'ffa' | '2v2', shuffleRounds: number): Room {
    const code = ShareManager.generateRoomCode();
    this.myPlayerId = this.getPlayerId();

    const room: Room = {
      code,
      hostId: this.myPlayerId,
      mode,
      maxPlayers: 4,
      players: [
        {
          id: this.myPlayerId,
          nickname: '房主',
          avatar: '',
          seatIndex: 0,
          isReady: false,
        },
      ],
      status: 'waiting',
      shuffleRounds,
    };

    this.room = room;
    ShareManager.setupPassiveShare(code, mode);
    ShareManager.shareRoom(code, mode);

    return room;
  }

  /** 加入房间 */
  joinRoom(code: string): Room | null {
    this.myPlayerId = this.getPlayerId();

    // TODO: 连接后端获取房间信息
    // 当前为占位实现
    const room: Room = {
      code,
      hostId: '',
      mode: 'ffa',
      maxPlayers: 4,
      players: [
        {
          id: this.myPlayerId,
          nickname: '玩家',
          avatar: '',
          seatIndex: 1,
          isReady: false,
        },
      ],
      status: 'waiting',
      shuffleRounds: 3,
    };

    this.room = room;
    return room;
  }

  /** 准备 */
  setReady(ready: boolean): void {
    const me = this.room?.players.find((p) => p.id === this.myPlayerId);
    if (me) {
      me.isReady = ready;
      this.broadcastState();
    }
  }

  /** 房主开始游戏 */
  startGame(): void {
    if (!this.room) return;
    this.room.status = 'playing';
    this.emit({ type: 'game-start', room: this.room });
  }

  /** 发送游戏操作 */
  sendAction(data: any): void {
    // TODO: 通过 WebSocket 发送
    this.broadcastState();
  }

  /** 离开房间 */
  leaveRoom(): void {
    this.room = null;
    this.closeConnection();
  }

  /** 连接后端 */
  connect(serverUrl: string): void {
    // TODO: 建立 WebSocket 连接
    try {
      this.ws = wx.connectSocket({ url: serverUrl });
      this.ws.onMessage((res: any) => {
        try {
          const event: RoomEvent = JSON.parse(res.data);
          this.emit(event);
        } catch (e) {}
      });
    } catch (e) {
      this.emit({ type: 'error', message: '连接服务器失败' });
    }
  }

  private broadcastState(): void {
    // TODO: 同步房间状态到后端
  }

  private closeConnection(): void {
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
  }

  private getPlayerId(): string {
    try {
      // 使用 openid 或随机 ID
      const stored = wx.getStorageSync('playerId');
      if (stored) return stored;
      const id = 'p_' + Math.random().toString(36).slice(2, 10);
      wx.setStorageSync('playerId', id);
      return id;
    } catch (e) {
      return 'p_' + Math.random().toString(36).slice(2, 10);
    }
  }
}

export const roomManager = new RoomManager();
