const express = require('express');
const router = express.Router();
const friendController = require('../controllers/friend.controller');
const { protect } = require('../middlewares/auth.middleware');

router.use(protect);

router.post('/request', friendController.sendRequest);
router.put('/request/:id/accept', friendController.acceptRequest);
router.put('/request/:id/reject', friendController.rejectRequest);
router.delete('/:friendId', friendController.removeFriend);
router.get('/', friendController.getFriends);
router.get('/pending', friendController.getPendingRequests);

module.exports = router;
