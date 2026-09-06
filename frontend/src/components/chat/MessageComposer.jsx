import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import SuggestedRepliesBar from '../ai/SuggestedRepliesBar';
import { Send, Smile, X, Bot, Sparkles, Command } from 'lucide-react';

const EMOJIS = ['😀', '😂', '😍', '🔥', '👍', '🎉', '🚀', '💡', '❤️', '🙌', '✨', '👏', '💯', '🤔', '👀', '😎'];

const AI_COMMANDS = [
  { cmd: '@ai summarize', label: 'Summarize Discussion', desc: 'Synthesize key decisions and actions' },
  { cmd: '@ai explain', label: 'Explain Concept', desc: 'Clear in-depth conceptual breakdown' },
  { cmd: '@ai extract-actions', label: 'Extract Action Items', desc: 'List tasks, owners, and deliverables' },
  { cmd: '@ai brainstorm', label: 'Brainstorm Ideas', desc: 'Generate innovative architectural solutions' },
  { cmd: '@ai translate', label: 'Translate Text', desc: 'Accurate multilingual translation' },
  { cmd: '@ai rewrite', label: 'Rewrite Professionally', desc: 'Enhance tone and clarity' },
];

const MessageComposer = () => {
  const { sendMessage, sendTyping, replyingTo, setReplyingTo } = useChat();
  const [text, setText] = useState('');
  const [showEmojis, setShowEmojis] = useState(false);
  const [showAiCommands, setShowAiCommands] = useState(false);
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
    setShowAiCommands(false);
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

  const handleInsertAiCommand = (cmd) => {
    setText((prev) => (prev ? `${prev} ${cmd} ` : `${cmd} `));
    setShowAiCommands(false);
    inputRef.current?.focus();
  };

  const handleSelectSuggestedReply = (reply) => {
    setText(reply);
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

      {/* 2. AI Suggested Replies Bar */}
      <SuggestedRepliesBar onSelectReply={handleSelectSuggestedReply} />

      {/* 3. AI Commands Popover */}
      {showAiCommands && (
        <div className="composer-ai-menu">
          <div className="ai-menu-header">
            <Sparkles size={14} color="#6366F1" />
            <span>AI Copilot Commands</span>
          </div>
          <div className="ai-command-list">
            {AI_COMMANDS.map((item) => (
              <button
                key={item.cmd}
                className="ai-command-item"
                onClick={() => handleInsertAiCommand(item.cmd)}
              >
                <div style={{ fontWeight: 600, color: '#4f46e5', fontSize: '13px' }}>
                  {item.cmd}
                </div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{item.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 4. Emoji Popover */}
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

      {/* 5. Composer Form */}
      <form onSubmit={handleSend} className="composer-form">
        {/* Quick @AI Mention / Command Trigger */}
        <button
          type="button"
          className="composer-ai-badge-btn"
          onClick={() => setShowAiCommands(!showAiCommands)}
          title="AI Copilot Commands (@ai)"
        >
          <Bot size={18} />
          <span>@AI</span>
        </button>

        <button
          type="button"
          className="composer-icon-btn"
          onClick={() => setShowEmojis(!showEmojis)}
          title="Insert Emoji"
        >
          <Smile size={19} color={showEmojis ? '#4f46e5' : '#64748b'} />
        </button>

        <textarea
          ref={inputRef}
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message or use @ai to collaborate... (Enter to send)"
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
