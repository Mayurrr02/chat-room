import React, { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import MarkdownRenderer from '../common/MarkdownRenderer';
import { Sparkles, X, Copy, Check, RefreshCw } from 'lucide-react';

const AiSummaryModal = ({ isOpen, onClose }) => {
  const { activeConversation, summarizeConversation } = useChat();
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  const fetchSummary = async () => {
    if (!activeConversation) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await summarizeConversation(activeConversation._id);
      if (res && res.summary) {
        setSummaryData(res);
      } else {
        setErrorMsg('Could not generate summary from this conversation.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to generate AI summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    } else {
      setSummaryData(null);
      setErrorMsg('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!summaryData?.summary) return;
    navigator.clipboard.writeText(summaryData.summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-large">
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="ai-badge-icon-bubble">
              <Sparkles size={18} color="#ffffff" />
            </div>
            <div>
              <h3>AI Conversation Summary</h3>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {activeConversation?.displayTitle}
              </span>
            </div>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ minHeight: '300px', maxHeight: '70vh', overflowY: 'auto' }}>
          {loading && (
            <div className="ai-thinking-state">
              <div className="ai-sparkle-loader">
                <Sparkles size={32} className="spin-icon" color="#6366F1" />
              </div>
              <h4>Analyzing Conversation...</h4>
              <p>Extracting topics, key decisions, and action items with Gemini 2.5</p>
            </div>
          )}

          {errorMsg && !loading && (
            <div className="alert-error">{errorMsg}</div>
          )}

          {summaryData && !loading && (
            <div className="ai-summary-content-card">
              <MarkdownRenderer content={summaryData.summary} />
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={fetchSummary}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Regenerate
          </button>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleCopy}
              disabled={!summaryData || loading}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {copied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
              {copied ? 'Copied!' : 'Copy Summary'}
            </button>

            <button type="button" className="btn-primary" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiSummaryModal;
