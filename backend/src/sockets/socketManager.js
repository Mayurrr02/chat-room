const User = require('../models/user.model');
const registerChatHandlers = require('./chat.handler');

class SocketManager {
  constructor() {
    this.io = null;
    // Map<userId, Set<socketId>>
    this.userSockets = new Map();
    // Map<socketId, userId>
    this.socketToUser = new Map();
  }

  init(io) {
    this.io = io;

    io.on('connection', async (socket) => {
      const user = socket.user;
      if (!user) {
        socket.disconnect(true);
        return;
      }

      const userId = user._id.toString();
      const socketId = socket.id;

      // Register socket in user map
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId).add(socketId);
      this.socketToUser.set(socketId, userId);

      // Join personal user room for direct notifications
      socket.join(`user:${userId}`);

      // Set user status to ONLINE in DB and broadcast
      await User.findByIdAndUpdate(userId, { status: 'ONLINE', lastSeen: new Date() });
      this.broadcastPresence(userId, 'ONLINE');

      console.log(`[Socket] User connected: @${user.username} (${userId}) on socket ${socketId}`);

      // Register feature event handlers
      registerChatHandlers(io, socket, this);

      // Presence status update from client (e.g. user toggles Away or Online)
      socket.on('user:set-status', async (newStatus) => {
        if (['ONLINE', 'AWAY', 'OFFLINE'].includes(newStatus)) {
          await User.findByIdAndUpdate(userId, { status: newStatus, lastSeen: new Date() });
          this.broadcastPresence(userId, newStatus);
        }
      });

      // Disconnect lifecycle
      socket.on('disconnect', async () => {
        const userSet = this.userSockets.get(userId);
        if (userSet) {
          userSet.delete(socketId);
          if (userSet.size === 0) {
            this.userSockets.delete(userId);
            // Mark user offline in DB
            await User.findByIdAndUpdate(userId, { status: 'OFFLINE', lastSeen: new Date() });
            this.broadcastPresence(userId, 'OFFLINE');
          }
        }
        this.socketToUser.delete(socketId);
        console.log(`[Socket] User disconnected: @${user.username} (${userId})`);
      });
    });
  }

  isUserOnline(userId) {
    const userSet = this.userSockets.get(userId.toString());
    return !!(userSet && userSet.size > 0);
  }

  broadcastPresence(userId, status) {
    if (this.io) {
      this.io.emit('presence:update', {
        userId,
        status,
        lastSeen: new Date(),
      });
    }
  }

  emitToUser(userId, event, data) {
    if (this.io) {
      this.io.to(`user:${userId.toString()}`).emit(event, data);
    }
  }

  emitToRoom(roomId, event, data) {
    if (this.io) {
      this.io.to(roomId).emit(event, data);
    }
  }
}

module.exports = new SocketManager();
