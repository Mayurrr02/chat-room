const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const friendRoutes = require('./friend.routes');
const conversationRoutes = require('./conversation.routes');
const messageRoutes = require('./message.routes');
const aiRoutes = require('./ai.routes');

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/friends', friendRoutes);
router.use('/conversations', conversationRoutes);
router.use('/messages', messageRoutes);
router.use('/ai', aiRoutes);

module.exports = router;
