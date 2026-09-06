const User = require('../models/user.model');
const { signToken } = require('../config/jwt');

class AuthService {
  async register({ username, password, email, displayName }) {
    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      const error = new Error('Username is already taken');
      error.statusCode = 400;
      error.code = 'USERNAME_TAKEN';
      throw error;
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      email: email ? email.toLowerCase().trim() : undefined,
      displayName: displayName || username,
    });

    await user.save();

    const token = signToken({ userId: user._id, username: user.username });
    return {
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
        lastSeen: user.lastSeen,
      },
      token,
      isNew: true,
    };
  }

  async login({ username, password }) {
    const user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
    if (!user) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Invalid username or password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    // Update status to ONLINE and lastSeen
    user.status = 'ONLINE';
    user.lastSeen = new Date();
    await user.save();

    const token = signToken({ userId: user._id, username: user.username });
    return {
      user: {
        id: user._id,
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatarUrl: user.avatarUrl,
        avatar: user.avatar,
        bio: user.bio,
        status: user.status,
        lastSeen: user.lastSeen,
      },
      token,
      isNew: false,
    };
  }

  // Backward-compatible auth: if user exists, login; if not, register
  async handleLegacyAuth({ username, password }) {
    let user = await User.findOne({ username: username.toLowerCase().trim() }).select('+password');
    if (!user) {
      return this.register({ username, password, displayName: username });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const error = new Error('Incorrect password');
      error.statusCode = 401;
      error.code = 'INVALID_CREDENTIALS';
      throw error;
    }

    user.status = 'ONLINE';
    user.lastSeen = new Date();
    await user.save();

    const token = signToken({ userId: user._id, username: user.username });
    return {
      username: user.username,
      displayName: user.displayName || user.username,
      _id: user._id,
      id: user._id,
      token,
      isNew: false,
    };
  }

  async getMe(userId) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }
}

module.exports = new AuthService();
