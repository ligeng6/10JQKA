declare const wx: any;

export type MessageHandler = (data: any) => void;

export interface SocketEvents {
  onOpen: () => void;
  onClose: () => void;
  onError: (err: any) => void;
  onMessage: MessageHandler;
}

/**
 * WebSocket 客户端封装 — 自动重连 + 心跳
 */
export class GameSocket {
  private ws: any = null;
  private url = '';
  private events: SocketEvents | null = null;
  private reconnectTimer: any = null;
  private heartbeatTimer: any = null;
  private reconnectCount = 0;
  private maxReconnect = 10;
  private _connected = false;

  get connected(): boolean {
    return this._connected;
  }

  connect(url: string, events: SocketEvents): void {
    this.url = url;
    this.events = events;
    this.doConnect();
  }

  private doConnect(): void {
    try {
      this.ws = wx.connectSocket({ url: this.url });

      this.ws.onOpen(() => {
        this._connected = true;
        this.reconnectCount = 0;
        this.startHeartbeat();
        this.events?.onOpen();
      });

      this.ws.onMessage((res: any) => {
        try {
          const data = JSON.parse(res.data);
          if (data.type === 'pong') return; // 心跳回复
          this.events?.onMessage(data);
        } catch (e) {}
      });

      this.ws.onClose(() => {
        this._connected = false;
        this.stopHeartbeat();
        this.events?.onClose();
        this.tryReconnect();
      });

      this.ws.onError((err: any) => {
        this._connected = false;
        this.events?.onError(err);
        this.tryReconnect();
      });
    } catch (e) {
      this.events?.onError(e);
      this.tryReconnect();
    }
  }

  private tryReconnect(): void {
    if (this.reconnectCount >= this.maxReconnect) return;
    this.reconnectCount++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 10000);

    this.reconnectTimer = setTimeout(() => {
      this.doConnect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'ping', ts: Date.now() });
    }, 15000);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  send(data: any): void {
    if (!this.ws || !this._connected) return;
    try {
      this.ws.send({ data: JSON.stringify(data) });
    } catch (e) {}
  }

  close(): void {
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }
    this._connected = false;
  }
}
