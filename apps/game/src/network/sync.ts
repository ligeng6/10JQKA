import type { GameState, Card, GameMode } from '@pokergame/shared';
import { createGame, playCards, passTurn, discardSmall, skipEmptyPlayers } from '@pokergame/core';
import { GameSocket } from './socket';

export type SyncMessage =
  | { type: 'join'; roomCode: string; playerId: string; nickname: string }
  | { type: 'player-joined'; playerId: string; nickname: string; seatIndex: number }
  | { type: 'player-left'; playerId: string }
  | { type: 'ready'; playerId: string; ready: boolean }
  | { type: 'game-start'; seed: number; mode: GameMode; shuffleRounds: number }
  | { type: 'action'; playerId: string; action: GameAction }
  | { type: 'state-sync'; state: any }
  | { type: 'chat'; playerId: string; message: string };

export type GameAction =
  | { kind: 'play'; cards: Card[]; stealTarget?: number; stealCardId?: string }
  | { kind: 'pass' }
  | { kind: 'discard-small' }
  | { kind: 'steal-select'; targetIndex: number; cardId: string };

export type SyncEvent =
  | { type: 'connected' }
  | { type: 'player-joined'; playerId: string; nickname: string; seatIndex: number }
  | { type: 'player-left'; playerId: string }
  | { type: 'game-started'; seed: number; mode: GameMode; shuffleRounds: number }
  | { type: 'remote-action'; playerId: string; action: GameAction }
  | { type: 'state-synced'; state: any }
  | { type: 'disconnected' }
  | { type: 'error'; message: string };

type SyncListener = (event: SyncEvent) => void;

/**
 * 游戏状态同步管理器
 * 负责：动作广播 / 状态合并 / 断线重连同步
 */
export class SyncManager {
  private socket = new GameSocket();
  private listeners: SyncListener[] = [];
  private playerId = '';
  private roomCode = '';
  private isHost = false;

  get connected(): boolean {
    return this.socket.connected;
  }

  onSync(listener: SyncListener): void {
    this.listeners.push(listener);
  }

  private emit(event: SyncEvent): void {
    for (const l of this.listeners) {
      try {
        l(event);
      } catch (e) {}
    }
  }

  /** 连接服务器 */
  connect(serverUrl: string, roomCode: string, playerId: string): void {
    this.roomCode = roomCode;
    this.playerId = playerId;

    this.socket.connect(serverUrl, {
      onOpen: () => {
        this.emit({ type: 'connected' });
        // 加入房间
        this.socket.send({
          type: 'join',
          roomCode,
          playerId,
          nickname: '玩家',
        });
      },
      onClose: () => {
        this.emit({ type: 'disconnected' });
      },
      onError: (err) => {
        this.emit({ type: 'error', message: '连接失败' });
      },
      onMessage: (data) => {
        this.handleMessage(data);
      },
    });
  }

  private handleMessage(data: SyncMessage): void {
    switch (data.type) {
      case 'player-joined':
        this.emit({
          type: 'player-joined',
          playerId: data.playerId,
          nickname: data.nickname,
          seatIndex: data.seatIndex,
        });
        break;

      case 'player-left':
        this.emit({ type: 'player-left', playerId: data.playerId });
        break;

      case 'game-start':
        this.emit({
          type: 'game-started',
          seed: data.seed,
          mode: data.mode,
          shuffleRounds: data.shuffleRounds,
        });
        break;

      case 'action':
        this.emit({
          type: 'remote-action',
          playerId: data.playerId,
          action: data.action,
        });
        break;

      case 'state-sync':
        this.emit({ type: 'state-synced', state: data.state });
        break;
    }
  }

  /** 发送游戏操作（广播给其他玩家） */
  sendAction(action: GameAction): void {
    this.socket.send({
      type: 'action',
      playerId: this.playerId,
      action,
    });
  }

  /** 准备 */
  sendReady(ready: boolean): void {
    this.socket.send({
      type: 'ready',
      playerId: this.playerId,
      ready,
    });
  }

  /** 房主发起开始 */
  sendGameStart(seed: number, mode: GameMode, shuffleRounds: number): void {
    this.socket.send({
      type: 'game-start',
      seed,
      mode,
      shuffleRounds,
    });
  }

  /** 断线后同步完整状态 */
  sendStateSync(state: any): void {
    this.socket.send({
      type: 'state-sync',
      state,
    });
  }

  /** 发送聊天 */
  sendChat(message: string): void {
    this.socket.send({
      type: 'chat',
      playerId: this.playerId,
      message,
    });
  }

  disconnect(): void {
    this.socket.close();
    this.listeners = [];
  }
}

export const syncManager = new SyncManager();
