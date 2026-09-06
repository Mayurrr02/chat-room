const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect } = require('../middlewares/auth.middleware');

router.get('/search', userController.searchUsers);
router.put('/profile', protect, userController.updateProfile);
router.get('/:id', protect, userController.getUserById);

module.exports = router;
