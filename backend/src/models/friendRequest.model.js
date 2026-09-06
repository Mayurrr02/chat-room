const mongoose = require('mongoose');

const FriendRequestSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'REJECTED'],
      default: 'PENDING',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate pending friend requests between same two users
FriendRequestSchema.index({ sender: 1, recipient: 1 }, { unique: true });

const FriendRequest =
  mongoose.models.FriendRequest ||
  mongoose.model('FriendRequest', FriendRequestSchema);

module.exports = FriendRequest;
