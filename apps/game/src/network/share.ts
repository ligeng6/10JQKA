declare const wx: any;

/**
 * 微信分享模块 — 邀请好友联机
 * 文档: https://developers.weixin.qq.com/minigame/dev/guide/open-ability/share/share.html
 */
export class ShareManager {
  /** 生成房间邀请码 */
  static generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  /**
   * 分享邀请好友加入房间
   * 使用 wx.shareAppMessage 主动转发
   */
  static shareRoom(roomCode: string, mode: string): void {
    const title = `快来${mode === '2v2' ? '2V2' : '混战'}！房间 ${roomCode}`;
    try {
      wx.shareAppMessage({
        title,
        query: `action=join&room=${roomCode}`,
        imageUrl: 'assets/share.png', // 可选分享图
      });
    } catch (e) {
      console.warn('Share failed:', e);
    }
  }

  /** 设置被动转发（点击右上角分享） */
  static setupPassiveShare(roomCode?: string, mode?: string): void {
    try {
      if (roomCode) {
        wx.onShareAppMessage(() => ({
          title: `扑克对战邀你来！房间 ${roomCode}`,
          query: `action=join&room=${roomCode}`,
        }));
      } else {
        wx.onShareAppMessage(() => ({
          title: '原创扑克 — 一副牌就能玩的对战',
          query: 'action=menu',
        }));
      }
    } catch (e) {
      console.warn('Setup share failed:', e);
    }
  }

  /**
   * 解析启动参数（好友通过分享链接进入）
   * 返回 { action, roomCode }
   */
  static parseLaunchOptions(): { action: string; roomCode: string } {
    try {
      const options = wx.getLaunchOptionsSync();
      const query = options?.query || {};
      return {
        action: query.action || 'menu',
        roomCode: query.room || '',
      };
    } catch (e) {
      return { action: 'menu', roomCode: '' };
    }
  }

  /** 复制房间码到剪贴板 */
  static copyRoomCode(roomCode: string): void {
    try {
      wx.setClipboardData({
        data: roomCode,
        success: () => {
          wx.showToast({ title: '房间码已复制', icon: 'success' });
        },
      });
    } catch (e) {}
  }
}
