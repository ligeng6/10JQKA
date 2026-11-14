import { COLORS } from '../render/constants';
import { drawButton, drawText, drawPanel, hitTest, type Rect } from '../render/draw';
import { L } from '../render/layout';
import { sfx } from '../sfx';
import { roomManager, type Room, type Player } from '../network/room';
import { ShareManager } from '../network/share';
import { syncManager, type SyncEvent } from '../network/sync';

export class RoomScene {
  private W = 0;
  private H = 0;
  room: Room;
  private onBack: () => void;
  private onStart: (room: Room) => void;
  private message = '';
  private messageTimer = 0;

  private btnBack: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnShare: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnCopy: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnReady: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnStart: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnAddAI: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnRemoveAI: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(w: number, h: number, room: Room, onBack: () => void, onStart: (room: Room) => void) {
    this.room = room;
    this.onBack = onBack;
    this.onStart = onStart;
    this.resize(w, h);
    ShareManager.setupPassiveShare(room.code, room.mode);
    ShareManager.shareRoom(room.code, room.mode);
  }

  resize(w: number, h: number): void {
    this.W = w;
    this.H = h;
    L.update(w, h);
  }

  connectOnline(serverUrl: string): void {
    syncManager.onSync((event: SyncEvent) => {
      if (event.type === 'player-joined') {
        this.room.players.push({
          id: event.playerId,
          nickname: event.nickname,
          avatar: '',
          seatIndex: event.seatIndex,
          isReady: false,
        });
      } else if (event.type === 'player-left') {
        this.room.players = this.room.players.filter((p) => p.id !== event.playerId);
      } else if (event.type === 'game-started') {
        this.onStart(this.room);
      }
    });
    syncManager.connect(serverUrl, this.room.code, roomManager.currentPlayerId);
  }

  render(ctx: any): void {
    const W = this.W;
    const H = this.H;

    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0d2b1a');
    bg.addColorStop(0.5, '#1a472a');
    bg.addColorStop(1, '#0d2b1a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // 顶栏
    drawPanel(ctx, 0, 0, W, L.topBarH, 'rgba(0,0,0,0.35)');
    this.btnBack = { x: L.margin, y: (L.topBarH - L.btnSmallH) / 2, w: L.btnSmallW * 0.8, h: L.btnSmallH };
    drawButton(ctx, '←', this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h, 'rgba(255,255,255,0.15)');
    drawText(ctx, this.room.mode === '2v2' ? '2V2 房间' : '混战房间', W / 2, L.topBarH / 2, L.fontL, COLORS.TEXT_YELLOW, 'center', 'middle');

    // 房间码
    const codeY = L.topBarH + L.gapL;
    const codeW = L.s(380);
    const codeH = L.s(100);
    drawPanel(ctx, W / 2 - codeW / 2, codeY, codeW, codeH, 'rgba(255,255,255,0.08)');
    drawText(ctx, '房间码', W / 2, codeY + L.gapM, L.fontS, COLORS.TEXT_GRAY, 'center');
    drawText(ctx, this.room.code, W / 2, codeY + codeH * 0.6, L.fontXXL, COLORS.TEXT_YELLOW, 'center');

    // 复制/邀请按钮
    const btnY = codeY + codeH + L.gapM;
    const bw = L.btnSmallW * 1.4;
    const bh = L.btnH;
    this.btnCopy = { x: W / 2 - bw - L.gapS, y: btnY, w: bw, h: bh };
    this.btnShare = { x: W / 2 + L.gapS, y: btnY, w: bw, h: bh };
    drawButton(ctx, '📋 复制码', this.btnCopy.x, btnY, bw, bh, '#2980b9');
    drawButton(ctx, '📤 邀请好友', this.btnShare.x, btnY, bw, bh, '#8e44ad');

    // 玩家列表
    const listY = btnY + bh + L.gapL;
    const humanCount = this.room.players.filter((p) => !p.id.startsWith('ai_')).length;
    const aiCount = this.room.players.filter((p) => p.id.startsWith('ai_')).length;
    drawText(ctx, `玩家 (${this.room.players.length}/${this.room.maxPlayers})  真人:${humanCount} AI:${aiCount}`, W / 2, listY, L.fontM, COLORS.TEXT_WHITE, 'center');

    const slotH = L.s(68);
    this.room.players.forEach((p, i) => {
      const sy = listY + L.fontM + L.gapS + i * (slotH + L.gapS);
      const isAI = p.id.startsWith('ai_');
      drawPanel(ctx, W / 2 - L.s(280), sy, L.s(560), slotH, isAI ? 'rgba(142,68,173,0.12)' : 'rgba(255,255,255,0.06)');
      drawText(ctx, `${isAI ? '🤖' : i === 0 ? '👑' : '🎮'} ${p.nickname}${isAI ? ' (AI)' : ''}`, W / 2 - L.s(250), sy + slotH / 2, L.fontS, isAI ? '#bb8fce' : '#fff', 'left', 'middle');
      drawText(ctx, p.isReady ? '✅' : '⏳', W / 2 + L.s(230), sy + slotH / 2, L.fontS, p.isReady ? '#27ae60' : COLORS.TEXT_GRAY, 'right', 'middle');
    });

    // 空位
    for (let i = this.room.players.length; i < this.room.maxPlayers; i++) {
      const sy = listY + L.fontM + L.gapS + i * (slotH + L.gapS);
      drawPanel(ctx, W / 2 - L.s(280), sy, L.s(560), slotH, 'rgba(255,255,255,0.03)');
      drawText(ctx, '虚位以待...', W / 2, sy + slotH / 2, L.fontS, 'rgba(255,255,255,0.15)', 'center', 'middle');
    }

    // AI 管理按钮
    const aiY = listY + L.fontM + L.gapS + this.room.maxPlayers * (slotH + L.gapS) + L.gapS;
    const aiW = L.btnSmallW * 1.3;
    this.btnAddAI = { x: W / 2 - aiW - L.gapS, y: aiY, w: aiW, h: L.btnSmallH };
    this.btnRemoveAI = { x: W / 2 + L.gapS, y: aiY, w: aiW, h: L.btnSmallH };
    drawButton(ctx, '+ 添加AI', this.btnAddAI.x, aiY, aiW, L.btnSmallH, aiCount < 3 ? '#8e44ad' : '#555');
    drawButton(ctx, '- 移除AI', this.btnRemoveAI.x, aiY, aiW, L.btnSmallH, aiCount > 0 ? '#c0392b' : '#555');

    // 底部按钮
    const bottomY = H - L.btnH - L.gapL;
    const isHost = this.room.hostId === roomManager.currentPlayerId;

    if (isHost) {
      const canStart = this.room.players.length >= 2;
      this.btnStart = { x: W / 2 - L.btnW / 2, y: bottomY, w: L.btnW, h: L.btnH };
      drawButton(ctx, canStart ? `开始游戏 (${this.room.players.length}人)` : '至少需要2人', this.btnStart.x, bottomY, L.btnW, L.btnH, canStart ? '#27ae60' : '#555');
    } else {
      this.btnReady = { x: W / 2 - L.btnW / 2, y: bottomY, w: L.btnW, h: L.btnH };
      const me = this.room.players.find((p) => p.id === roomManager.currentPlayerId);
      drawButton(ctx, me?.isReady ? '取消准备' : '准备', this.btnReady.x, bottomY, L.btnW, L.btnH, me?.isReady ? '#e67e22' : '#2980b9');
    }

    // 消息
    if (this.messageTimer > 0) {
      this.messageTimer--;
      drawPanel(ctx, W / 2 - L.btnW, L.topBarH + L.gapS, L.btnW * 2, L.btnH, 'rgba(0,0,0,0.7)');
      drawText(ctx, this.message, W / 2, L.topBarH + L.gapS + L.btnH / 2, L.fontS, '#ff6b6b', 'center', 'middle');
    }
  }

  touch(x: number, y: number): void {
    if (hitTest(this.btnBack, x, y)) {
      sfx.click();
      roomManager.leaveRoom();
      this.onBack();
      return;
    }
    if (hitTest(this.btnCopy, x, y)) {
      sfx.click();
      ShareManager.copyRoomCode(this.room.code);
      return;
    }
    if (hitTest(this.btnShare, x, y)) {
      sfx.click();
      ShareManager.shareRoom(this.room.code, this.room.mode);
      return;
    }
    if (hitTest(this.btnAddAI, x, y)) {
      sfx.click();
      this.addAIPlayer();
      return;
    }
    if (hitTest(this.btnRemoveAI, x, y)) {
      sfx.click();
      this.removeAIPlayer();
      return;
    }
    if (hitTest(this.btnReady, x, y)) {
      sfx.click();
      const me = this.room.players.find((p) => p.id === roomManager.currentPlayerId);
      if (me) {
        me.isReady = !me.isReady;
        roomManager.setReady(me.isReady);
      }
      return;
    }
    if (hitTest(this.btnStart, x, y)) {
      sfx.click();
      // AI 自动准备
      this.room.players.forEach((p) => {
        if (p.id.startsWith('ai_')) p.isReady = true;
      });
      this.onStart(this.room);
      return;
    }
  }

  private addAIPlayer(): void {
    const aiCount = this.room.players.filter((p) => p.id.startsWith('ai_')).length;
    if (this.room.players.length >= this.room.maxPlayers) {
      this.showMessage('房间已满');
      return;
    }
    const seatIndex = this.findEmptySeat();
    const aiNames = ['小明', '小红', '小刚', '小美', '小李', '小张'];
    const ai: Player = {
      id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      nickname: aiNames[aiCount % aiNames.length],
      avatar: '',
      seatIndex,
      isReady: true,
    };
    this.room.players.push(ai);
  }

  private removeAIPlayer(): void {
    const aiIndex = this.room.players.findLastIndex((p) => p.id.startsWith('ai_'));
    if (aiIndex >= 0) {
      this.room.players.splice(aiIndex, 1);
    }
  }

  private findEmptySeat(): number {
    const used = new Set(this.room.players.map((p) => p.seatIndex));
    for (let i = 0; i < this.room.maxPlayers; i++) {
      if (!used.has(i)) return i;
    }
    return this.room.players.length;
  }

  private showMessage(msg: string): void {
    this.message = msg;
    this.messageTimer = 90;
  }

  touchMove(_x: number, _y: number): void {}
  touchEnd(): void {}
}
