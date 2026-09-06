const { verifyToken } = require('../config/jwt');
const User = require('../models/user.model');

const socketAuthMiddleware = async (socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace('Bearer ', '');

    const legacyUsername = socket.handshake.auth?.username;

    if (token) {
      const decoded = verifyToken(token);
      if (decoded && decoded.userId) {
        const user = await User.findById(decoded.userId).select('-password');
        if (user) {
          socket.user = user;
          return next();
        }
      }
    }

    // Fallback for legacy clients providing username
    if (legacyUsername) {
      const user = await User.findOne({ username: legacyUsername.toLowerCase().trim() }).select('-password');
      if (user) {
        socket.user = user;
        return next();
      }
    }

    // If no token or user could be resolved, allow connection with guest/anonymous or reject
    return next(new Error('Authentication required for socket connection'));
  } catch (error) {
    console.error('[SocketAuth] Handshake error:', error.message);
    return next(new Error('Authentication failed'));
  }
};

module.exports = socketAuthMiddleware;
