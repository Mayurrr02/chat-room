const authService = require('../services/auth.service');

const register = async (req, res, next) => {
  try {
    const { username, password, email, displayName } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' },
      });
    }

    const result = await authService.register({ username, password, email, displayName });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Username and password are required' },
      });
    }

    const result = await authService.login({ username, password });
    res.status(200).json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
};

const legacyAuth = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await authService.handleLegacyAuth({ username, password });
    // Returns backward-compatible shape while also providing token
    res.status(200).json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message });
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user._id);
    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    if (req.user) {
      req.user.status = 'OFFLINE';
      req.user.lastSeen = new Date();
      await req.user.save();
    }
    res.status(200).json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  legacyAuth,
  getMe,
  logout,
};
