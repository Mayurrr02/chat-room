const mongoose = require('mongoose');

const ConversationMemberSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ['OWNER', 'ADMIN', 'MEMBER'],
      default: 'MEMBER',
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index ensuring a user can only be a member of a conversation once
ConversationMemberSchema.index({ conversationId: 1, userId: 1 }, { unique: true });

const ConversationMember =
  mongoose.models.ConversationMember ||
  mongoose.model('ConversationMember', ConversationMemberSchema);

module.exports = ConversationMember;
