const userService = require('../services/user.service');

const updateProfile = async (req, res, next) => {
  try {
    const updated = await userService.updateProfile(req.user._id, req.body);
    res.status(200).json({ success: true, user: updated });
  } catch (err) {
    next(err);
  }
};

const searchUsers = async (req, res, next) => {
  try {
    const { query } = req.query;
    const currentUserId = req.user ? req.user._id : null;
    const users = await userService.searchUsers(query, currentUserId);
    res.status(200).json(users);
  } catch (err) {
    next(err);
  }
};

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  updateProfile,
  searchUsers,
  getUserById,
};
