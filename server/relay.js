/**
 * 扑克游戏 WebSocket 中继服务器
 * 功能：房间管理 + 消息广播 + 玩家匹配
 * 启动: node relay.js [端口]
 */
const { WebSocketServer } = require('ws');

const PORT = process.argv[2] || 9527;
const wss = new WebSocketServer({ port: PORT });

// 房间表: roomCode -> { players: Map<playerId, ws>, hostId, mode, state }
const rooms = new Map();

// 连接表: ws -> { playerId, roomCode }
const connections = new Map();

console.log(`[Server] WebSocket relay started on ws://localhost:${PORT}`);

wss.on('connection', (ws) => {
  console.log('[Server] Client connected');

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch (e) {
      return;
    }

    const conn = connections.get(ws) || {};
    handleMessage(ws, conn, msg);
  });

  ws.on('close', () => {
    const conn = connections.get(ws);
    if (conn) {
      handleLeave(ws, conn);
      connections.delete(ws);
    }
    console.log('[Server] Client disconnected');
  });

  ws.on('error', (err) => {
    console.error('[Server] Socket error:', err.message);
  });
});

function handleMessage(ws, conn, msg) {
  switch (msg.type) {
    case 'join':
      handleJoin(ws, conn, msg);
      break;
    case 'ready':
      handleReady(ws, conn, msg);
      break;
    case 'game-start':
      handleGameStart(ws, conn, msg);
      break;
    case 'action':
      handleAction(ws, conn, msg);
      break;
    case 'state-sync':
      handleStateSync(ws, conn, msg);
      break;
    case 'chat':
      handleChat(ws, conn, msg);
      break;
    case 'ping':
      ws.send(JSON.stringify({ type: 'pong', ts: Date.now() }));
      break;
  }
}

function handleJoin(ws, conn, msg) {
  const { roomCode, playerId, nickname } = msg;

  // 加入房间
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      players: new Map(),
      hostId: playerId,
      mode: msg.mode || 'ffa',
      state: null,
    });
  }

  const room = rooms.get(roomCode);

  // 分配座位
  const usedSeats = new Set([...room.players.values()].map((p) => p.seatIndex));
  let seatIndex = 0;
  while (usedSeats.has(seatIndex)) seatIndex++;

  room.players.set(playerId, { ws, nickname, seatIndex, ready: false });

  conn.playerId = playerId;
  conn.roomCode = roomCode;
  connections.set(ws, conn);

  // 通知房间内所有人
  broadcast(roomCode, {
    type: 'player-joined',
    playerId,
    nickname,
    seatIndex,
  }, playerId);

  // 给加入者发当前房间状态
  ws.send(JSON.stringify({
    type: 'room-state',
    roomCode,
    hostId: room.hostId,
    players: [...room.players.entries()].map(([id, p]) => ({
      playerId: id,
      nickname: p.nickname,
      seatIndex: p.seatIndex,
      ready: p.ready,
    })),
  }));

  console.log(`[Room ${roomCode}] ${nickname}(${playerId}) joined, seat=${seatIndex}`);
}

function handleReady(ws, conn, msg) {
  const room = rooms.get(conn.roomCode);
  if (!room) return;
  const player = room.players.get(msg.playerId);
  if (player) {
    player.ready = msg.ready;
    broadcast(conn.roomCode, {
      type: 'ready',
      playerId: msg.playerId,
      ready: msg.ready,
    });
    console.log(`[Room ${conn.roomCode}] ${msg.playerId} ready=${msg.ready}`);
  }
}

function handleGameStart(ws, conn, msg) {
  const room = rooms.get(conn.roomCode);
  if (!room) return;

  // 只有房主能开始
  if (msg.playerId !== room.hostId) return;

  broadcast(conn.roomCode, {
    type: 'game-start',
    seed: msg.seed || Date.now(),
    mode: room.mode,
    shuffleRounds: msg.shuffleRounds || 3,
  });
  console.log(`[Room ${conn.roomCode}] Game started`);
}

function handleAction(ws, conn, msg) {
  // 广播给房间内其他人
  broadcast(conn.roomCode, {
    type: 'action',
    playerId: msg.playerId,
    action: msg.action,
  }, msg.playerId);
  console.log(`[Room ${conn.roomCode}] Action from ${msg.playerId}: ${msg.action?.kind}`);
}

function handleStateSync(ws, conn, msg) {
  const room = rooms.get(conn.roomCode);
  if (!room) return;
  room.state = msg.state;
  broadcast(conn.roomCode, {
    type: 'state-sync',
    state: msg.state,
  }, msg.playerId);
}

function handleChat(ws, conn, msg) {
  broadcast(conn.roomCode, {
    type: 'chat',
    playerId: msg.playerId,
    message: msg.message,
  }, msg.playerId);
}

function handleLeave(ws, conn) {
  const { roomCode, playerId } = conn;
  if (!roomCode || !playerId) return;

  const room = rooms.get(roomCode);
  if (!room) return;

  room.players.delete(playerId);

  broadcast(roomCode, {
    type: 'player-left',
    playerId,
  });

  // 房间空了就删除
  if (room.players.size === 0) {
    rooms.delete(roomCode);
    console.log(`[Room ${roomCode}] Room closed (empty)`);
  } else {
    // 如果房主走了，转移房主
    if (room.hostId === playerId) {
      const firstPlayer = room.players.keys().next().value;
      room.hostId = firstPlayer;
      broadcast(roomCode, { type: 'host-changed', hostId: firstPlayer });
      console.log(`[Room ${roomCode}] Host transferred to ${firstPlayer}`);
    }
    console.log(`[Room ${roomCode}] ${playerId} left, ${room.players.size} remaining`);
  }
}

function broadcast(roomCode, msg, excludePlayerId = null) {
  const room = rooms.get(roomCode);
  if (!room) return;
  const data = JSON.stringify(msg);
  for (const [playerId, player] of room.players) {
    if (playerId === excludePlayerId) continue;
    try {
      player.ws.send(data);
    } catch (e) {}
  }
}

// 定期清理死连接
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.readyState === ws.CLOSED) {
      const conn = connections.get(ws);
      if (conn) {
        handleLeave(ws, conn);
        connections.delete(ws);
      }
    }
  });
}, 30000);

// 打印状态
setInterval(() => {
  console.log(`[Status] Rooms: ${rooms.size}, Connections: ${connections.size}`);
}, 60000);
