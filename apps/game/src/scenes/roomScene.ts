import { COLORS } from '../render/constants';
import { drawButton, drawText, drawPanel, roundRect, hitTest, type Rect } from '../render/draw';
import { L } from '../render/layout';
import { sfx } from '../sfx';
import { roomManager, type Room } from '../network/room';
import { ShareManager } from '../network/share';

export class RoomScene {
  private W = 0;
  private H = 0;
  private room: Room;
  private onBack: () => void;
  private onStart: (room: Room) => void;
  private message = '';
  private messageTimer = 0;

  private btnBack: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnShare: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnCopy: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnReady: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnStart: Rect = { x: 0, y: 0, w: 0, h: 0 };
  private btnInvite: Rect = { x: 0, y: 0, w: 0, h: 0 };

  constructor(w: number, h: number, room: Room, onBack: () => void, onStart: (room: Room) => void) {
    this.room = room;
    this.onBack = onBack;
    this.onStart = onStart;
    this.resize(w, h);
  }

  resize(w: number, h: number): void {
    this.W = w;
    this.H = h;
    L.update(w, h);
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
    this.btnBack = { x: L.margin, y: (L.topBarH - L.btnSmallH) / 2, w: L.btnSmallW * 0.7, h: L.btnSmallH };
    drawButton(ctx, '←', this.btnBack.x, this.btnBack.y, this.btnBack.w, this.btnBack.h, 'rgba(255,255,255,0.15)');
    drawText(ctx, '联机房间', W / 2, L.topBarH / 2, L.fontL, COLORS.TEXT_YELLOW, 'center', 'middle');

    // 房间码
    const codeY = L.topBarH + L.gapXL;
    drawPanel(ctx, W / 2 - L.s(200), codeY, L.s(400), L.s(120), 'rgba(255,255,255,0.08)');
    drawText(ctx, '房间码', W / 2, codeY + L.gapM, L.fontS, COLORS.TEXT_GRAY, 'center');
    drawText(ctx, this.room.code, W / 2, codeY + L.s(55), L.fontXXL, COLORS.TEXT_YELLOW, 'center');

    // 复制/分享按钮
    const btnY = codeY + L.s(130);
    const bw = L.btnSmallW * 1.3;
    const bh = L.btnH;
    this.btnCopy = { x: W / 2 - bw - L.gapS, y: btnY, w: bw, h: bh };
    this.btnShare = { x: W / 2 + L.gapS, y: btnY, w: bw, h: bh };
    drawButton(ctx, '📋 复制', this.btnCopy.x, btnY, bw, bh, '#2980b9');
    drawButton(ctx, '📤 邀请', this.btnShare.x, btnY, bw, bh, '#8e44ad');

    // 玩家列表
    const listY = btnY + bh + L.gapXL;
    drawText(ctx, `玩家 (${this.room.players.length}/${this.room.maxPlayers})`, W / 2, listY, L.fontM, COLORS.TEXT_WHITE, 'center');

    const slotH = L.s(72);
    this.room.players.forEach((p, i) => {
      const sy = listY + L.fontM + L.gapM + i * (slotH + L.gapS);
      drawPanel(ctx, W / 2 - L.s(280), sy, L.s(560), slotH, 'rgba(255,255,255,0.06)');
      drawText(ctx, `${i === 0 ? '👑' : '🎮'} ${p.nickname}`, W / 2 - L.s(240), sy + slotH / 2, L.fontS, '#fff', 'left', 'middle');
      drawText(ctx, p.isReady ? '✅ 已准备' : '⏳ 等待中', W / 2 + L.s(200), sy + slotH / 2, L.fontS, p.isReady ? '#27ae60' : COLORS.TEXT_GRAY, 'right', 'middle');
    });

    // 空位提示
    for (let i = this.room.players.length; i < this.room.maxPlayers; i++) {
      const sy = listY + L.fontM + L.gapM + i * (slotH + L.gapS);
      drawPanel(ctx, W / 2 - L.s(280), sy, L.s(560), slotH, 'rgba(255,255,255,0.03)');
      drawText(ctx, '虚位以待...', W / 2, sy + slotH / 2, L.fontS, 'rgba(255,255,255,0.15)', 'center', 'middle');
    }

    // 底部按钮
    const bottomY = H - L.btnH - L.gapL;
    const isHost = this.room.hostId === roomManager.currentPlayerId;

    if (isHost) {
      this.btnStart = { x: W / 2 - L.btnW / 2, y: bottomY, w: L.btnW, h: L.btnH };
      drawButton(ctx, '开始游戏', this.btnStart.x, bottomY, L.btnW, L.btnH, '#27ae60');
    } else {
      this.btnReady = { x: W / 2 - L.btnW / 2, y: bottomY, w: L.btnW, h: L.btnH };
      const me = this.room.players.find((p) => p.id === roomManager.currentPlayerId);
      drawButton(ctx, me?.isReady ? '取消准备' : '准备', this.btnReady.x, bottomY, L.btnW, L.btnH, me?.isReady ? '#e67e22' : '#2980b9');
    }

    // 消息
    if (this.messageTimer > 0) {
      this.messageTimer--;
      drawPanel(ctx, W / 2 - L.btnW, codeY - L.btnH, L.btnW * 2, L.btnH, 'rgba(0,0,0,0.7)');
      drawText(ctx, this.message, W / 2, codeY - L.btnH / 2, L.fontS, '#ff6b6b', 'center', 'middle');
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
      this.onStart(this.room);
      return;
    }
  }

  touchMove(_x: number, _y: number): void {}
  touchEnd(): void {}
}
