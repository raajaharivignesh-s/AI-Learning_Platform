import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Bookmark,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const AITutorView = () => {
  const { selectedCourse, openCitation } = useApp();
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am Cognify's multimodal grounded tutor. Ask me any conceptual question, problem, or derivation from your uploaded course slides, textbook, and lectures. Every claim I make will be strictly cited with evidence.",
      citations: [],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [sourceOnly, setSourceOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [suggestedPrompts, setSuggestedPrompts] = useState([
    'Explain the core mechanism introduced in the latest chapter.',
    'What are the key prerequisites needed before tackling this subject?',
    'Summarize the primary takeaways from our lecture material.',
  ]);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (queryText = null) => {
    const question = (queryText || inputQuery).trim();
    if (!question || !selectedCourse || loading) return;

    const userMsg = {
      id: Date.now().toString(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setLoading(true);

    try {
      const response = await api.chatWithCourse(selectedCourse.id, question, sourceOnly, 5);

      const aiMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response.answer || (response.insufficient_evidence ? "I cannot find sufficient evidence in the uploaded course materials to answer this with certainty." : "No answer returned."),
        citations: response.citations || [],
        insufficientEvidence: response.insufficient_evidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Error contacting RAG tutor: ${err.message}. Ensure Gemini API key and materials are present.`,
        citations: [],
        isError: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to render AI response text with clickable citation badges
  const renderMessageContent = (msg) => {
    if (msg.sender === 'user') {
      return <p style={styles.messageText}>{msg.text}</p>;
    }

    // Replace citation tags like [Citation: <UUID>] with custom badges
    const citationRegex = /\[Citation:\s*([^\]]+)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(msg.text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(msg.text.substring(lastIndex, match.index));
      }

      const chunkId = match[1].trim();
      const matchedCitation = msg.citations?.find((c) => c.chunk_id === chunkId) || {
        chunk_id: chunkId,
        score: 1.0,
      };

      parts.push(
        <button
          key={match.index}
          onClick={() => openCitation(matchedCitation)}
          style={styles.inlineCitationBadge}
          title="Inspect grounded source evidence"
        >
          <Bookmark size={11} color="var(--violet-light)" />
          <span>Evidence [{chunkId.slice(0, 6)}...]</span>
        </button>
      );

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < msg.text.length) {
      parts.push(msg.text.substring(lastIndex));
    }

    return (
      <div>
        <div style={styles.messageText}>{parts.length > 0 ? parts : msg.text}</div>

        {/* Display Citation pills below message if available */}
        {msg.citations && msg.citations.length > 0 && (
          <div style={styles.citationsContainer}>
            <div style={styles.citationsHeader}>
              <ShieldCheck size={13} color="#10b981" />
              <span>Verified Multimodal Citations ({msg.citations.length})</span>
            </div>
            <div style={styles.citationPillsList}>
              {msg.citations.map((c, idx) => (
                <button
                  key={idx}
                  onClick={() => openCitation(c)}
                  style={styles.citationPill}
                  title="Click to view exact page/timestamp"
                >
                  <Bookmark size={12} color="var(--cyan-light)" />
                  <span>
                    {c.start_page !== null && c.start_page !== undefined
                      ? `Page ${c.start_page}`
                      : c.start_time !== null && c.start_time !== undefined
                      ? `Video @ ${Math.floor(c.start_time)}s`
                      : `Chunk ${c.chunk_id.slice(0, 6)}`}
                  </span>
                  <span style={styles.citationScore}>
                    {(c.score * 100).toFixed(0)}% match
                  </span>
                  <ExternalLink size={11} color="var(--text-subtle)" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!selectedCourse) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyCard} className="glass-panel">
          <Layers size={40} color="var(--violet-light)" />
          <h3>No Course Selected</h3>
          <p>Please select a course to engage with the AI Grounded Tutor.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Header Bar */}
      <div style={styles.topHeader}>
        <div>
          <div className="badge badge-violet" style={{ marginBottom: 6 }}>
            RAG GROUNDED MULTIMODAL TUTOR
          </div>
          <h2 style={styles.title}>AI Learning Companion: {selectedCourse.title}</h2>
          <p style={styles.subtitle}>
            Conversational RAG agent grounded strictly against your vector embeddings.
          </p>
        </div>

        {/* Source Strictness Toggle */}
        <div style={styles.strictnessToggle}>
          <button
            onClick={() => setSourceOnly(!sourceOnly)}
            style={{
              ...styles.toggleBtn,
              backgroundColor: sourceOnly ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
              borderColor: sourceOnly ? 'rgba(16, 185, 129, 0.4)' : 'var(--border-subtle)',
              color: sourceOnly ? '#34d399' : 'var(--text-muted)',
            }}
          >
            <ShieldCheck size={14} color={sourceOnly ? '#34d399' : 'var(--text-subtle)'} />
            <span>{sourceOnly ? 'Strict Source Only (No Hallucination)' : 'Hybrid Knowledge Mode'}</span>
          </button>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div style={styles.chatStream} className="glass-panel">
        {messages.map((msg) => {
          const isAi = msg.sender === 'ai';
          return (
            <div
              key={msg.id}
              style={{
                ...styles.messageRow,
                justifyContent: isAi ? 'flex-start' : 'flex-end',
              }}
            >
              {isAi && (
                <div style={styles.aiAvatar}>
                  <Bot size={18} color="#ffffff" />
                </div>
              )}

              <div
                style={{
                  ...styles.messageBubble,
                  backgroundColor: isAi ? 'rgba(18, 25, 44, 0.9)' : 'rgba(139, 92, 246, 0.25)',
                  borderColor: isAi ? 'var(--border-subtle)' : 'rgba(139, 92, 246, 0.45)',
                }}
              >
                <div style={styles.bubbleHeader}>
                  <span style={styles.senderName}>{isAi ? 'Cognify Tutor' : 'You'}</span>
                  <span style={styles.timestamp}>{msg.timestamp}</span>
                </div>

                {renderMessageContent(msg)}
              </div>

              {!isAi && (
                <div style={styles.userAvatar}>
                  <User size={18} color="#ffffff" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div style={styles.messageRow}>
            <div style={styles.aiAvatar}>
              <Bot size={18} color="#ffffff" />
            </div>
            <div style={{ ...styles.messageBubble, padding: '16px 20px' }}>
              <div style={styles.loadingDots}>
                <span className="badge badge-violet">Searching Qdrant Vector DB</span>
                <span className="badge badge-cyan">Reasoning with Gemini</span>
                <div className="spin" style={styles.spinner} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompts */}
      <div style={styles.suggestedBar}>
        <span style={styles.suggestedLabel}>Suggested:</span>
        {suggestedPrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p)}
            style={styles.suggestedPill}
            disabled={loading}
          >
            <span>{p}</span>
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        style={styles.inputForm}
      >
        <div style={styles.inputContainer} className="glass-panel">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about lecture notes, derivations, code, or videos..."
            disabled={loading}
            style={styles.inputField}
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="btn btn-primary"
            style={{ borderRadius: '10px', padding: '10px 18px' }}
          >
            <span>Ask Tutor</span>
            <Send size={15} />
          </button>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100vh - var(--header-height) - 48px)',
    gap: '14px',
  },
  topHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  strictnessToggle: {
    display: 'flex',
    alignItems: 'center',
  },
  toggleBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  chatStream: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    maxWidth: '85%',
  },
  aiAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: 'var(--shadow-glow)',
  },
  userAvatar: {
    width: '36px',
    height: '36px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  messageBubble: {
    padding: '16px 20px',
    borderRadius: '16px',
    border: '1px solid',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  bubbleHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  senderName: {
    fontSize: '0.76rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  timestamp: {
    fontSize: '0.7rem',
    color: 'var(--text-subtle)',
  },
  messageText: {
    fontSize: '0.9rem',
    lineHeight: 1.6,
    color: '#f8fafc',
    whiteSpace: 'pre-wrap',
  },
  inlineCitationBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '2px 8px',
    margin: '0 4px',
    borderRadius: '6px',
    background: 'rgba(139, 92, 246, 0.2)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
    color: 'var(--violet-light)',
    fontSize: '0.74rem',
    fontWeight: 600,
    cursor: 'pointer',
    verticalAlign: 'baseline',
  },
  citationsContainer: {
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  citationsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.74rem',
    fontWeight: 700,
    color: '#34d399',
    textTransform: 'uppercase',
  },
  citationPillsList: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  citationPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(6, 182, 212, 0.25)',
    color: '#ffffff',
    fontSize: '0.76rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  citationScore: {
    color: 'var(--cyan-light)',
    fontSize: '0.68rem',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    padding: '1px 5px',
    borderRadius: '4px',
  },
  suggestedBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    overflowX: 'auto',
    padding: '2px 4px',
  },
  suggestedLabel: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-subtle)',
    flexShrink: 0,
  },
  suggestedPill: {
    padding: '6px 12px',
    borderRadius: '999px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    fontSize: '0.75rem',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.15s ease',
  },
  inputForm: {
    width: '100%',
  },
  inputContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '8px 12px',
    borderRadius: '14px',
  },
  inputField: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.92rem',
    outline: 'none',
    padding: '6px 8px',
  },
  loadingDots: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  spinner: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: 'var(--violet-primary)',
  },
  emptyContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
  },
  emptyCard: {
    padding: '40px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '14px',
    maxWidth: '400px',
  },
};
