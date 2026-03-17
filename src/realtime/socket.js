import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

let io;
const socketsByUser = new Map();

const getUserSocketSet = (userId) => {
  if (!socketsByUser.has(userId)) {
    socketsByUser.set(userId, new Set());
  }

  return socketsByUser.get(userId);
};

const extractToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const authHeader = socket.handshake.headers.authorization;
  const queryToken = socket.handshake.query?.token;

  if (typeof authToken === 'string' && authToken.trim().length > 0) {
    return authToken.trim();
  }

  if (typeof authHeader === 'string' && authHeader.trim().length > 0) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }

    // Accept "Bearer<token>" format from some clients.
    if (authHeader.startsWith('Bearer')) {
      return authHeader.slice(6).trim();
    }

    return authHeader.trim();
  }

  if (typeof queryToken === 'string' && queryToken.trim().length > 0) {
    return queryToken.trim();
  }

  return '';
};

const registerNamespace = (namespace) => {
  namespace.use((socket, next) => {
    try {
      const token = extractToken(socket);
      if (!token) {
        return next(new Error('Unauthorized'));
      }

      const payload = jwt.verify(token, env.jwtSecret);
      socket.data.userId = String(payload.sub);
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  namespace.on('connection', (socket) => {
    const userId = socket.data.userId;
    const userSockets = getUserSocketSet(userId);
    userSockets.add(socket.id);

    socket.on('message:send', async (payload, callback) => {
      try {
        const { messagingService } = await import('../services/messaging.service.js');

        if (!payload || typeof payload !== 'object') {
          throw new Error('Invalid payload');
        }

        const { connectionId, text } = payload;
        if (!connectionId || !text) {
          throw new Error('connectionId and text are required');
        }

        const message = await messagingService.sendMessage(userId, connectionId, text);
        if (typeof callback === 'function') {
          callback({ ok: true, data: message });
        }
      } catch (err) {
        if (typeof callback === 'function') {
          callback({
            ok: false,
            error: err?.message ?? 'Failed to send message'
          });
        }
      }
    });

    socket.on('typing:start', async (payload) => {
      try {
        const { messagingService } = await import('../services/messaging.service.js');

        if (!payload || typeof payload !== 'object') {
          return;
        }

        const { connectionId } = payload;
        if (!connectionId) {
          return;
        }

        const connections = await messagingService.listMyConnections(userId);

        const target = connections.find((c) => String(c._id) === String(connectionId));
        if (!target || !target.otherUser?._id) {
          console.log('⚠️ ~ typing:start ~ no target connection/otherUser found');
          return;
        }

        const otherUserId = String(target.otherUser._id);
        emitToUser(otherUserId, 'typing', { connectionId, userId, isTyping: true });
      } catch (err) {
        console.log('⚠️ ~ typing:start ~ error:', err?.message || err);
      }
    });

    socket.on('typing:stop', async (payload) => {
      try {
        const { messagingService } = await import('../services/messaging.service.js');

        if (!payload || typeof payload !== 'object') {
          return;
        }

        const { connectionId } = payload;
        if (!connectionId) {
          return;
        }

        const connections = await messagingService.listMyConnections(userId);

        const target = connections.find((c) => String(c._id) === String(connectionId));
        if (!target || !target.otherUser?._id) {
          console.log('⚠️ ~ typing:stop ~ no target connection/otherUser found');
          return;
        }

        const otherUserId = String(target.otherUser._id);
        console.log('🚀 ~ typing:stop ~ emitting to otherUserId:', otherUserId);
        emitToUser(otherUserId, 'typing', { connectionId, userId, isTyping: false });
      } catch (err) {
        console.log('⚠️ ~ typing:stop ~ error:', err?.message || err);
      }
    });

    socket.on('disconnect', () => {
      const set = socketsByUser.get(userId);
      if (!set) {
        return;
      }

      set.delete(socket.id);
      if (set.size === 0) {
        socketsByUser.delete(userId);
      }
    });
  });
};

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: true,
      credentials: true,
      methods: ['GET', 'POST']
    }
  });

  registerNamespace(io);
  // Namespaces that raw WebSocket/Postman may send (path-based).
  registerNamespace(io.of('/socket.io'));
  registerNamespace(io.of('/socket.io/'));

  return io;
};

export const emitToUser = (userId, eventName, payload) => {
  if (!io) {
    return;
  }

  const sockets = socketsByUser.get(String(userId));
  console.log("🚀 ~ emitToUser ~ sockets:", sockets)
  if (!sockets || sockets.size === 0) {
    return;
  }

  for (const socketId of sockets.values()) {
    io.to(socketId).emit(eventName, payload);
  }
};
