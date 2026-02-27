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
      origin: '*',
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
  if (!sockets || sockets.size === 0) {
    return;
  }

  for (const socketId of sockets.values()) {
    io.to(socketId).emit(eventName, payload);
  }
};
