import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { Send, Smile, X, Paperclip } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🎉', '🚀', '💡', '❤️', '🙌', '✨', '👏', '💯', '🤔', '👀', '😎'];

const MessageComposer = () => {
  const { sendMessage, sendTyping, replyingTo, setReplyingTo } = useChat();
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const typingTimeoutRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [replyingTo]);

  const handleInputChange = (e) => {
    const val = e.target.value;
    setText(val);

    // Typing debounce trigger
    sendTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 2000);
  };

  const handleSend = (e) => {
    if (e) e.preventDefault();
    if (!text.trim()) return;

    sendMessage(text);
    setText('');
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    setShowEmojis(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInsertEmoji = (emoji) => {
    setText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  return (
    <div className="composer-container">
      {/* 1. Reply Banner */}
      {replyingTo && (
        <div className="composer-reply-banner">
          <div className="reply-banner-info">
            <span className="reply-banner-title">
              Replying to @{replyingTo.senderUsername || replyingTo.sender?.username || 'user'}
            </span>
            <span className="reply-banner-snippet">{replyingTo.content}</span>
          </div>
          <button
            className="reply-banner-close-btn"
            onClick={() => setReplyingTo(null)}
            title="Cancel Reply"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* 2. Emoji Popover */}
      {showEmojis && (
        <div className="composer-emoji-tray">
          <div className="emoji-grid">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className="emoji-grid-btn"
                onClick={() => handleInsertEmoji(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. Composer Form */}
      <form onSubmit={handleSend} className="composer-form">
        <button
          type="button"
          className="composer-icon-btn"
          onClick={() => setShowEmojis(!showEmojis)}
          title="Insert Emoji"
        >
          <Smile size={20} color={showEmojis ? '#4f46e5' : '#64748b'} />
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Write a message... (Press Enter to send, Shift+Enter for new line)"
          rows={1}
          className="composer-textarea"
        />

        <button
          type="submit"
          className="composer-send-btn"
          disabled={!text.trim()}
          title="Send message"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default MessageComposer;
