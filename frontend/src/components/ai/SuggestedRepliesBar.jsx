import React from 'react';
import { useChat } from '../../context/ChatContext';
import { Sparkles } from 'lucide-react';

const SuggestedRepliesBar = ({ onSelectReply }) => {
  const { suggestedReplies, setSuggestedReplies, isLoadingSuggestions } = useChat();

  if (isLoadingSuggestions) {
    return (
      <div className="suggested-replies-loading">
        <Sparkles size={12} className="spin-icon" color="#6366F1" />
        <span>Generating suggested replies...</span>
      </div>
    );
  }

  if (!suggestedReplies || suggestedReplies.length === 0) return null;

  return (
    <div className="suggested-replies-tray">
      <div className="suggested-replies-header">
        <Sparkles size={12} color="#6366F1" />
        <span>AI Suggestions:</span>
      </div>
      <div className="suggested-replies-list">
        {suggestedReplies.map((reply, idx) => (
          <button
            key={idx}
            className="suggested-reply-pill"
            onClick={() => {
              onSelectReply(reply);
              setSuggestedReplies([]);
            }}
          >
            {reply}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SuggestedRepliesBar;
