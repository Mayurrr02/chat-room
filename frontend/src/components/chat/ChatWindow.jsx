import React, { useState } from 'react';
import { useChat } from '../../context/ChatContext';
import { useSocket } from '../../context/SocketContext';
import Avatar from '../common/Avatar';
import MessageList from './MessageList';
import MessageComposer from './MessageComposer';
import ConversationDetailsSidebar from './ConversationDetailsSidebar';
import AiSummaryModal from '../ai/AiSummaryModal';
import { Info, Users, Bot, MessageSquare, Sparkles } from 'lucide-react';

const ChatWindow = () => {
  const { activeConversation } = useChat();
  const { presenceMap } = useSocket();
  const [showDetails, setShowDetails] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);

  if (!activeConversation) {
    return (
      <div className="chat-window-empty">
        <div className="empty-hero-card">
          <div className="empty-hero-icon-bubble">
            <MessageSquare size={36} color="#4F46E5" />
          </div>
          <h2>Welcome to your AI-Native Chat</h2>
          <p>
            Select a conversation from the sidebar or search for users to start real-time messaging with humans and AI.
          </p>
        </div>
      </div>
    );
  }

  const isGroup = activeConversation.type === 'GROUP';
  const isAI = activeConversation.type === 'AI';

  let presenceStatus = activeConversation.peerUser?.status || 'OFFLINE';
  if (activeConversation.peerUser && presenceMap[activeConversation.peerUser._id]) {
    presenceStatus = presenceMap[activeConversation.peerUser._id].status;
  }

  return (
    <div className="chat-window-container">
      {/* 1. Chat Header */}
      <div className="chat-window-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Avatar
            name={activeConversation.displayTitle}
            src={activeConversation.displayAvatar}
            size={42}
            status={!isGroup && !isAI ? presenceStatus : undefined}
          />
          <div>
            <h3 className="chat-header-title">{activeConversation.displayTitle}</h3>
            <span className="chat-header-subtitle">
              {isGroup ? (
                <>
                  <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  {activeConversation.members?.length || 0} participants
                </>
              ) : isAI ? (
                <>
                  <Bot size={12} style={{ display: 'inline', marginRight: '4px' }} />
                  AI Copilot • Always online
                </>
              ) : presenceStatus === 'ONLINE' ? (
                '🟢 Online'
              ) : presenceStatus === 'AWAY' ? (
                '🟡 Away'
              ) : (
                '⚪ Offline'
              )}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* AI Summary Header Button */}
          <button
            className="ai-summary-header-btn"
            onClick={() => setShowSummaryModal(true)}
            title="Generate AI Summary of this conversation"
          >
            <Sparkles size={14} />
            <span>AI Summary</span>
          </button>

          <button
            className={`header-action-btn ${showDetails ? 'active' : ''}`}
            onClick={() => setShowDetails(!showDetails)}
            title="Conversation Details"
          >
            <Info size={18} />
          </button>
        </div>
      </div>

      {/* 2. Main Chat Area & Drawer */}
      <div className="chat-window-body">
        <div className="chat-feed-column">
          <MessageList />
          <MessageComposer />
        </div>

        {showDetails && (
          <ConversationDetailsSidebar
            isOpen={showDetails}
            onClose={() => setShowDetails(false)}
          />
        )}
      </div>

      {/* AI Summary Modal */}
      <AiSummaryModal
        isOpen={showSummaryModal}
        onClose={() => setShowSummaryModal(false)}
      />
    </div>
  );
};

export default ChatWindow;
