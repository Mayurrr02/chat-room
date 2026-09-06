import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import Avatar from '../common/Avatar';
import MarkdownRenderer from '../common/MarkdownRenderer';
import {
  Smile,
  Reply,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  MoreVertical,
} from 'lucide-react';

const COMMON_EMOJIS = ['👍', '❤️', '🔥', '😂', '🎉', '🚀'];

const MessageItem = ({ message, isFirstInGroup, showAvatar }) => {
  const { user } = useAuth();
  const { toggleReaction, editMessage, deleteMessage, setReplyingTo } = useChat();

  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);

  const isMine =
    message.sender === user?._id ||
    message.sender?._id === user?._id ||
    message.senderUsername === user?.username;

  const isSystem = message.messageType === 'SYSTEM';

  if (isSystem) {
    return (
      <div className="system-message-row">
        <span className="system-message-text">{message.content}</span>
      </div>
    );
  }

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editContent.trim()) return;
    await editMessage(message._id, editContent.trim());
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (window.confirm('Delete this message?')) {
      await deleteMessage(message._id);
    }
  };

  const senderName =
    message.sender?.displayName || message.sender?.username || message.senderUsername || 'User';
  const senderAvatar = message.sender?.avatarUrl || message.sender?.avatar;

  return (
    <div
      className={`message-row ${isMine ? 'outgoing' : 'incoming'} ${
        isFirstInGroup ? 'first-in-group' : 'continuation'
      }`}
      onMouseLeave={() => {
        setShowEmojiPicker(false);
        setShowActionMenu(false);
      }}
    >
      {/* Left Avatar (for incoming messages) */}
      {!isMine && showAvatar ? (
        <Avatar name={senderName} src={senderAvatar} size={32} className="message-sender-avatar" />
      ) : (
        !isMine && <div style={{ width: '32px', flexShrink: 0 }} />
      )}

      <div className="message-content-wrapper">
        {/* Sender Name header if first in group */}
        {!isMine && isFirstInGroup && (
          <span className="message-sender-name">{senderName}</span>
        )}

        {/* Reply Preview Block */}
        {message.replyTo && (
          <div className="reply-preview-pill">
            <span className="reply-preview-author">
              Replying to @{message.replyTo.senderUsername || 'user'}:
            </span>
            <span className="reply-preview-snippet">{message.replyTo.content}</span>
          </div>
        )}

        {/* Bubble */}
        <div className={`message-bubble-card ${isMine ? 'mine' : 'theirs'} ${message.deletedAt ? 'deleted' : ''}`}>
          {isEditing ? (
            <form onSubmit={handleSaveEdit} className="edit-message-form">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                autoFocus
              />
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button
                  type="button"
                  className="btn-xs-secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-xs-primary">
                  Save
                </button>
              </div>
            </form>
          ) : (
            <>
              {message.deletedAt ? (
                <em style={{ color: '#94a3b8' }}>This message was deleted</em>
              ) : (
                <MarkdownRenderer content={message.content} />
              )}

              {/* Timestamp & Status Metadata */}
              <div className="message-meta-row">
                {message.isEdited && !message.deletedAt && (
                  <span className="message-edited-tag">edited</span>
                )}
                <span className="message-time-text">{formatTime(message.createdAt)}</span>
                {isMine && !message.deletedAt && (
                  <span className="message-status-icon">
                    {message.status === 'READ' ? (
                      <CheckCheck size={14} color="#38bdf8" />
                    ) : (
                      <Check size={14} color="#94a3b8" />
                    )}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Reaction Badges */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="message-reactions-row">
            {message.reactions.map((r, idx) => {
              const hasReacted = r.users.some(
                (u) => (u._id || u).toString() === user?._id?.toString()
              );
              return (
                <button
                  key={idx}
                  className={`reaction-pill-badge ${hasReacted ? 'active' : ''}`}
                  onClick={() => toggleReaction(message._id, r.emoji)}
                >
                  <span>{r.emoji}</span>
                  <span className="reaction-count">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover Action Toolbar */}
      {!message.deletedAt && !isEditing && (
        <div className="message-hover-toolbar">
          {/* Quick React Picker Trigger */}
          <div style={{ position: 'relative' }}>
            <button
              className="toolbar-btn"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              title="Add Reaction"
            >
              <Smile size={14} />
            </button>

            {showEmojiPicker && (
              <div className="quick-emoji-popup">
                {COMMON_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    className="emoji-choice-btn"
                    onClick={() => {
                      toggleReaction(message._id, emoji);
                      setShowEmojiPicker(false);
                    }}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="toolbar-btn"
            onClick={() => setReplyingTo(message)}
            title="Reply"
          >
            <Reply size={14} />
          </button>

          {isMine && (
            <>
              <button
                className="toolbar-btn"
                onClick={() => {
                  setEditContent(message.content);
                  setIsEditing(true);
                }}
                title="Edit"
              >
                <Edit2 size={14} />
              </button>
              <button
                className="toolbar-btn danger"
                onClick={handleDelete}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default MessageItem;
