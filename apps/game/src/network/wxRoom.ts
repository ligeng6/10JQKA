declare const wx: any;

/**
 * 微信原生房间服务封装
 * 文档: https://developers.weixin.qq.com/minigame/dev/guide/open-ability/roomservice.html
 *
 * 核心 API:
 * - wx.createRoomService() / wx.getRoomService()
 * - roomService.createRoom() / joinRoom() / leaveRoom()
 * - roomService.onPlayerJoin / onPlayerLeave / onMessage
 * - roomService.sendGameMessage()
 */

export interface WXRoomPlayer {
  openid: string;
  nickname: string;
  avatarUrl: string;
  seatIndex: number;
  isReady: boolean;
  isAI: boolean;
}

export interface WXRoomInfo {
  roomId: string;
  ownerId: string;
  mode: 'ffa' | '2v2';
  maxPlayers: number;
  players: WXRoomPlayer[];
  status: 'waiting' | 'playing' | 'finished';
  shuffleRounds: number;
}

export type WXRoomEvent =
  | { type: 'created'; roomId: string }
  | { type: 'joined'; roomId: string; players: WXRoomPlayer[] }
  | { type: 'player-joined'; player: WXRoomPlayer }
  | { type: 'player-left'; openid: string }
  | { type: 'player-ready'; openid: string; ready: boolean }
  | { type: 'game-started'; seed: number; mode: string; shuffleRounds: number }
  | { type: 'message'; fromOpenid: string; data: any }
  | { type: 'error'; code: number; message: string };

type WXRoomListener = (event: WXRoomEvent) => void;

export class WXRoomManager {
  private roomService: any = null;
  private listeners: WXRoomListener[] = [];
  private _room: WXRoomInfo | null = null;
  private _myOpenid = '';

  get room(): WXRoomInfo | null {
    return this._room;
  }

  get myOpenid(): string {
    return this._myOpenid;
  }

  get isOwner(): boolean {
    return this._room?.ownerId === this._myOpenid;
  }

  get mySeatIndex(): number {
    return this._room?.players.find((p) => p.openid === this._myOpenid)?.seatIndex ?? -1;
  }

  onEvent(listener: WXRoomListener): void {
    this.listeners.push(listener);
  }

  private emit(event: WXRoomEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (e) {}
    }
  }

  /** 初始化房间服务 */
  init(): void {
    try {
      this.roomService = wx.createRoomService
        ? wx.createRoomService()
        : wx.getRoomService?.();
      if (!this.roomService) {
        console.warn('Room service not available');
        return;
      }

      // 监听房间事件
      this.roomService.onRoomMessage?.((res: any) => {
        try {
          const data = JSON.parse(res.data);
          this.emit({ type: 'message', fromOpenid: res.fromOpenid || '', data });
        } catch (e) {}
      });

      this.roomService.onPlayerJoin?.((res: any) => {
        const player: WXRoomPlayer = {
          openid: res.openid,
          nickname: res.nickname || '玩家',
          avatarUrl: res.avatarUrl || '',
          seatIndex: res.seatIndex ?? this._room?.players.length ?? 0,
          isReady: false,
          isAI: false,
        };
        if (this._room) {
          this._room.players.push(player);
        }
        this.emit({ type: 'player-joined', player });
      });

      this.roomService.onPlayerLeave?.((res: any) => {
        if (this._room) {
          this._room.players = this._room.players.filter((p) => p.openid !== res.openid);
        }
        this.emit({ type: 'player-left', openid: res.openid });
      });

      this.roomService.onRoomClose?.(() => {
        this._room = null;
      });
    } catch (e) {
      console.warn('Init room service failed:', e);
    }
  }

  /** 创建房间 */
  async createRoom(mode: 'ffa' | '2v2', shuffleRounds: number): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.roomService) {
        reject(new Error('Room service not available'));
        return;
      }

      try {
        this.roomService.createRoom({
          maxPlayers: 4,
          extraData: JSON.stringify({ mode, shuffleRounds }),
          success: (res: any) => {
            const roomId = res.roomId || res.room_id || '';
            this._myOpenid = res.openid || '';

            this._room = {
              roomId,
              ownerId: this._myOpenid,
              mode,
              maxPlayers: 4,
              players: [
                {
                  openid: this._myOpenid,
                  nickname: '房主',
                  avatarUrl: '',
                  seatIndex: 0,
                  isReady: true,
                  isAI: false,
                },
              ],
              status: 'waiting',
              shuffleRounds,
            };

            this.emit({ type: 'created', roomId });
            resolve(roomId);
          },
          fail: (err: any) => {
            reject(new Error(err.errMsg || 'Create room failed'));
          },
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /** 加入房间 */
  async joinRoom(roomId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.roomService) {
        reject(new Error('Room service not available'));
        return;
      }

      try {
        this.roomService.joinRoom({
          roomId,
          success: (res: any) => {
            this._myOpenid = res.openid || '';
            const extraData = res.extraData ? JSON.parse(res.extraData) : {};

            this._room = {
              roomId,
              ownerId: res.ownerId || res.owner_id || '',
              mode: extraData.mode || 'ffa',
              maxPlayers: 4,
              players: (res.players || []).map((p: any, i: number) => ({
                openid: p.openid,
                nickname: p.nickname || `玩家${i}`,
                avatarUrl: p.avatarUrl || '',
                seatIndex: p.seatIndex ?? i,
                isReady: p.isReady ?? false,
                isAI: false,
              })),
              status: 'waiting',
              shuffleRounds: extraData.shuffleRounds || 3,
            };

            this.emit({ type: 'joined', roomId, players: this._room.players });
            resolve();
          },
          fail: (err: any) => {
            reject(new Error(err.errMsg || 'Join room failed'));
          },
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /** 离开房间 */
  leaveRoom(): void {
    try {
      this.roomService?.leaveRoom?.({
        success: () => {},
        fail: () => {},
      });
    } catch (e) {}
    this._room = null;
  }

  /** 发送准备状态 */
  setReady(ready: boolean): void {
    const me = this._room?.players.find((p) => p.openid === this._myOpenid);
    if (me) me.isReady = ready;
    this.sendMessage({ type: 'ready', openid: this._myOpenid, ready });
    if (me) {
      this.emit({ type: 'player-ready', openid: this._myOpenid, ready });
    }
  }

  /** 房主发起开始游戏 */
  startGame(seed: number): void {
    if (!this.isOwner || !this._room) return;
    this._room.status = 'playing';
    this.sendMessage({
      type: 'game-start',
      seed,
      mode: this._room.mode,
      shuffleRounds: this._room.shuffleRounds,
    });
    this.emit({
      type: 'game-started',
      seed,
      mode: this._room.mode,
      shuffleRounds: this._room.shuffleRounds,
    });
  }

  /** 发送游戏消息（广播给房间内所有人） */
  sendMessage(data: any): void {
    try {
      this.roomService?.sendGameMessage?.({
        data: JSON.stringify(data),
        success: () => {},
        fail: () => {},
      });
    } catch (e) {}
  }

  /** 添加 AI 玩家（本地模拟） */
  addAIPlayer(name: string): void {
    if (!this._room || this._room.players.length >= 4) return;
    const seatIndex = this.findEmptySeat();
    const ai: WXRoomPlayer = {
      openid: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nickname: name,
      avatarUrl: '',
      seatIndex,
      isReady: true,
      isAI: true,
    };
    this._room.players.push(ai);
    this.emit({ type: 'player-joined', player: ai });
  }

  /** 移除 AI 玩家 */
  removeAIPlayer(): void {
    if (!this._room) return;
    const idx = this._room.players.findLastIndex((p) => p.isAI);
    if (idx >= 0) {
      const removed = this._room.players.splice(idx, 1)[0];
      this.emit({ type: 'player-left', openid: removed.openid });
    }
  }

  private findEmptySeat(): number {
    const used = new Set(this._room?.players.map((p) => p.seatIndex) || []);
    for (let i = 0; i < 4; i++) {
      if (!used.has(i)) return i;
    }
    return 0;
  }

  /** 销毁 */
  destroy(): void {
    this.leaveRoom();
    this.listeners = [];
    this.roomService = null;
  }
}

export const wxRoomManager = new WXRoomManager();
