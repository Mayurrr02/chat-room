const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['DM', 'GROUP', 'AI'],
      default: 'DM',
      index: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: '',
    },
    avatar: {
      type: String,
      default: '',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    lastMessage: {
      text: { type: String, default: '' },
      sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      senderUsername: { type: String, default: '' },
      timestamp: { type: Date, default: Date.now },
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ updatedAt: -1 });

const Conversation = mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);

module.exports = Conversation;
