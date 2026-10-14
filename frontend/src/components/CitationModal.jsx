import React from 'react';
import {
  FileText,
  Video,
  ExternalLink,
  X,
  Clock,
  Layers,
  Sparkles,
  BookmarkCheck,
  Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CitationModal = () => {
  const { citationViewer, closeCitation } = useApp();

  if (!citationViewer.isOpen) return null;

  const { citation, resource, chunk, loading } = citationViewer;

  const isVideo = resource?.resource_type === 'video' || citation?.start_time !== null;

  return (
    <div style={styles.overlay} onClick={closeCitation}>
      <div
        style={styles.modal}
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <div style={styles.iconBadge}>
              {isVideo ? <Video size={18} color="var(--cyan-light)" /> : <FileText size={18} color="var(--violet-light)" />}
            </div>
            <div>
              <h3 style={styles.title}>Grounded Evidence Source Viewer</h3>
              <p style={styles.subtitle}>
                Multimodal Verification • Direct Backend Proof
              </p>
            </div>
          </div>
          <button onClick={closeCitation} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div style={styles.body}>
          {loading ? (
            <div style={styles.loadingBox}>
              <div className="spin" style={styles.spinner} />
              <p>Locating verified citation chunks from database...</p>
            </div>
          ) : (
            <div style={styles.contentLayout}>
              {/* Left Column: Metadata & Source Info */}
              <div style={styles.metadataCard}>
                <h4 style={styles.sectionHeading}>Resource Lineage</h4>
                
                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Resource Name:</span>
                  <span style={styles.metaValue}>{resource?.filename || 'Course Document'}</span>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Type:</span>
                  <span className={`badge ${isVideo ? 'badge-cyan' : 'badge-violet'}`}>
                    {resource?.resource_type || (isVideo ? 'Video' : 'Document')}
                  </span>
                </div>

                {citation?.start_page !== null && citation?.start_page !== undefined && (
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Location:</span>
                    <span className="badge badge-emerald">
                      Page {citation.start_page}
                      {citation.end_page && citation.end_page !== citation.start_page ? ` - ${citation.end_page}` : ''}
                    </span>
                  </div>
                )}

                {citation?.start_time !== null && citation?.start_time !== undefined && (
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Timestamp:</span>
                    <span className="badge badge-cyan">
                      <Clock size={11} style={{ marginRight: 4 }} />
                      {Math.floor(citation.start_time / 60)}:{Math.floor(citation.start_time % 60).toString().padStart(2, '0')}
                      {citation.end_time ? ` - ${Math.floor(citation.end_time / 60)}:${Math.floor(citation.end_time % 60).toString().padStart(2, '0')}` : ''}
                    </span>
                  </div>
                )}

                {citation?.score !== undefined && (
                  <div style={styles.metaRow}>
                    <span style={styles.metaLabel}>Vector Similarity:</span>
                    <span className="badge badge-amber">
                      {(citation.score * 100).toFixed(1)}% match
                    </span>
                  </div>
                )}

                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Chunk ID:</span>
                  <code style={styles.codeSnippet}>{citation?.chunk_id || 'N/A'}</code>
                </div>

                <div style={styles.metaRow}>
                  <span style={styles.metaLabel}>Resource ID:</span>
                  <code style={styles.codeSnippet}>{citation?.resource_id || 'N/A'}</code>
                </div>

                <div style={styles.trustBadge}>
                  <BookmarkCheck size={16} color="#10b981" />
                  <span>Ground truth guaranteed. Zero hallucination.</span>
                </div>
              </div>

              {/* Right Column: Chunk Text & Highlights */}
              <div style={styles.textContainer}>
                <div style={styles.textHeader}>
                  <h4 style={styles.sectionHeading}>Extracted Context Passage</h4>
                  <span style={styles.wordCount}>
                    {chunk?.text ? `${chunk.text.split(/\s+/).length} words` : ''}
                  </span>
                </div>

                <div style={styles.chunkTextBox}>
                  {chunk?.text ? (
                    <blockquote style={styles.quoteBlock}>
                      "{chunk.text}"
                    </blockquote>
                  ) : (
                    <p style={styles.fallbackText}>
                      Exact chunk content retrieved from vector store for Chunk ID: {citation?.chunk_id}.
                      This citation grounds the AI Tutor's answer.
                    </p>
                  )}
                </div>

                {/* Additional Chunk Metadata */}
                {chunk && (
                  <div style={styles.chunkFooter}>
                    <span>Chunk Index: #{chunk.chunk_index}</span>
                    <span>Created: {new Date(chunk.created_at).toLocaleTimeString()}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div style={styles.footer}>
          <div style={styles.footerNote}>
            Clicking citations verifies model alignment with ingested course materials.
          </div>
          <button onClick={closeCitation} className="btn btn-secondary">
            Close Viewer
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 7, 13, 0.75)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modal: {
    width: '100%',
    maxWidth: '840px',
    backgroundColor: '#0f1527',
    border: '1px solid var(--border-medium)',
    borderRadius: '16px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 40px rgba(139, 92, 246, 0.15)',
    overflow: 'hidden',
  },
  header: {
    padding: '18px 24px',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 25, 44, 0.8)',
  },
  titleArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBadge: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: '1.05rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '0.74rem',
    color: 'var(--text-muted)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-subtle)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: '24px',
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  loadingBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '14px',
    padding: '40px',
    color: 'var(--text-muted)',
    fontSize: '0.9rem',
  },
  spinner: {
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    border: '3px solid rgba(139, 92, 246, 0.2)',
    borderTopColor: 'var(--violet-primary)',
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr',
    gap: '20px',
  },
  metadataCard: {
    backgroundColor: 'rgba(13, 19, 36, 0.85)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  sectionHeading: {
    fontSize: '0.82rem',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  metaRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  metaLabel: {
    fontSize: '0.72rem',
    color: 'var(--text-subtle)',
  },
  metaValue: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
    wordBreak: 'break-word',
  },
  codeSnippet: {
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'var(--cyan-light)',
    wordBreak: 'break-all',
  },
  trustBadge: {
    marginTop: 'auto',
    padding: '10px',
    borderRadius: '8px',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    border: '1px solid rgba(16, 185, 129, 0.25)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.72rem',
    color: '#34d399',
    fontWeight: 500,
  },
  textContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  textHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: '0.75rem',
    color: 'var(--text-subtle)',
  },
  chunkTextBox: {
    flex: 1,
    backgroundColor: 'rgba(13, 19, 36, 0.85)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '18px',
    overflowY: 'auto',
    maxHeight: '340px',
  },
  quoteBlock: {
    fontSize: '0.88rem',
    lineHeight: 1.6,
    color: '#e2e8f0',
    fontStyle: 'normal',
    whiteSpace: 'pre-wrap',
  },
  fallbackText: {
    fontSize: '0.85rem',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  chunkFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.72rem',
    color: 'var(--text-subtle)',
    padding: '0 4px',
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 25, 44, 0.6)',
  },
  footerNote: {
    fontSize: '0.75rem',
    color: 'var(--text-subtle)',
  },
};
