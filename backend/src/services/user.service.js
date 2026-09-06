const User = require('../models/user.model');

class UserService {
  async updateProfile(userId, { displayName, bio, avatarUrl, email, status, aiPreferences }) {
    const user = await User.findById(userId);
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }

    if (displayName !== undefined) user.displayName = displayName;
    if (bio !== undefined) user.bio = bio;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    if (email !== undefined) user.email = email.toLowerCase().trim();
    if (status && ['ONLINE', 'AWAY', 'OFFLINE'].includes(status)) user.status = status;
    if (aiPreferences) {
      user.aiPreferences = { ...user.aiPreferences, ...aiPreferences };
    }

    await user.save();
    return user;
  }

  async searchUsers(query, currentUserId) {
    if (!query || query.trim() === '') return [];

    // Escape regex special characters to prevent ReDoS
    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    const users = await User.find({
      _id: { $ne: currentUserId },
      $or: [
        { username: { $regex: sanitizedQuery, $options: 'i' } },
        { displayName: { $regex: sanitizedQuery, $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(20);

    return users;
  }

  async getUserById(userId) {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 404;
      error.code = 'USER_NOT_FOUND';
      throw error;
    }
    return user;
  }
}

module.exports = new UserService();
