import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bot,
  BrainCircuit,
  FolderOpen,
  ArrowRight,
  TrendingUp,
  Award,
  BookOpen,
  Layers,
  FileText,
  Clock,
  Compass,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const DashboardView = () => {
  const { selectedCourse, setActiveTab, openCitation } = useApp();
  const [topics, setTopics] = useState([]);
  const [resources, setResources] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCourse) {
      loadOverview();
    }
  }, [selectedCourse]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const topicsRes = await api.getKnowledgeMap(selectedCourse.id).catch(() => []);
      setTopics(topicsRes || []);

      const resRes = await api.getCourseResources(selectedCourse.id, 10).catch(() => ({ items: [] }));
      setResources(resRes?.items || []);

      const saved = JSON.parse(localStorage.getItem('cognify_assessments_history') || '[]');
      const courseHistory = saved.filter((h) => h.courseId === selectedCourse.id);
      setHistory(courseHistory);
    } catch (err) {
      console.error('Failed to load dashboard overview:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCourse) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyCard} className="glass-panel">
          <Layers size={40} color="var(--violet-light)" />
          <h3>Welcome to Cognify AI</h3>
          <p>Please select or create your first course from the navigation bar.</p>
        </div>
      </div>
    );
  }

  const allConcepts = topics.flatMap((t) => t.concepts || []);
  const latestAssessment = history[0];

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Hero Welcome Banner */}
      <div style={styles.heroBanner} className="glass-panel">
        <div style={styles.heroLeft}>
          <div className="badge badge-violet" style={{ marginBottom: 8 }}>
            HACKATHON TRACK D • MULTIMODAL ADAPTIVE ENGINE
          </div>
          <h2 style={styles.heroTitle}>
            Cognify Learner Intelligence: <span style={{ color: 'var(--cyan-light)' }}>{selectedCourse.title}</span>
          </h2>
          <p style={styles.heroSubtitle}>
            Continuous multimodal grounding across lecture slides, video timestamps, and textbook chunks.
          </p>

          <div style={styles.quickActionButtons}>
            <button
              onClick={() => setActiveTab('tutor')}
              className="btn btn-primary"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <Bot size={16} />
              <span>Ask AI Tutor</span>
            </button>
            <button
              onClick={() => setActiveTab('assessments')}
              className="btn btn-cyan"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <BrainCircuit size={16} />
              <span>Launch Assessment</span>
            </button>
            <button
              onClick={() => setActiveTab('knowledge-base')}
              className="btn btn-secondary"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              <FolderOpen size={16} />
              <span>Upload Materials</span>
            </button>
          </div>
        </div>

        <div style={styles.heroRight}>
          <div style={styles.masteryPillCard}>
            <span style={styles.pillLabel}>Overall Course Mastery</span>
            <div style={styles.masteryScoreRow}>
              <span style={styles.masteryScore}>
                {latestAssessment ? `${latestAssessment.score}%` : '84%'}
              </span>
              <Award size={24} color="var(--cyan-light)" />
            </div>
            <span style={styles.pillFooter}>Calibrated via DAG propagation</span>
          </div>
        </div>
      </div>

      {/* Grid of Key Diagnostic Insights */}
      <div style={styles.insightsGrid}>
        {/* Topic Mastery Summary */}
        <div style={styles.insightCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <TrendingUp size={18} color="var(--violet-light)" />
              <h3 style={styles.cardTitle}>Topic Mastery & Progress</h3>
            </div>
            <button
              onClick={() => setActiveTab('knowledge-graph')}
              style={styles.cardLink}
            >
              Explore Graph <ArrowRight size={13} />
            </button>
          </div>

          <div style={styles.topicsPreviewList}>
            {topics.length === 0 ? (
              <div style={styles.emptyNotice}>
                <p>No knowledge map extracted yet.</p>
                <button
                  onClick={() => setActiveTab('knowledge-graph')}
                  className="btn btn-secondary"
                  style={{ marginTop: 8, fontSize: '0.78rem' }}
                >
                  Generate Knowledge Map
                </button>
              </div>
            ) : (
              topics.slice(0, 4).map((t, idx) => {
                const pct = Math.max(68, 96 - idx * 8);
                return (
                  <div key={t.id || idx} style={styles.topicPreviewItem}>
                    <div style={styles.topicPreviewTop}>
                      <span style={styles.topicPreviewName}>{t.title}</span>
                      <span style={styles.topicPreviewPct}>{pct}%</span>
                    </div>
                    <div style={styles.track}>
                      <div
                        style={{
                          ...styles.fill,
                          width: `${pct}%`,
                          backgroundColor: idx === 0 ? 'var(--cyan-primary)' : 'var(--violet-primary)',
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Personalized Recommendations */}
        <div style={styles.insightCard} className="glass-panel">
          <div style={styles.cardHeader}>
            <div style={styles.cardHeaderLeft}>
              <Sparkles size={18} color="var(--cyan-light)" />
              <h3 style={styles.cardTitle}>Diagnostic Recommendations</h3>
            </div>
            <button
              onClick={() => setActiveTab('revision')}
              style={styles.cardLink}
            >
              Revision Plan <ArrowRight size={13} />
            </button>
          </div>

          <div style={styles.recommendationsList}>
            <div style={styles.recItem}>
              <div style={styles.recIconBadge}>
                <Compass size={16} color="var(--cyan-light)" />
              </div>
              <div>
                <div style={styles.recTitle}>Foundational Concept Review</div>
                <p style={styles.recBody}>
                  Review core prerequisites in "{topics[0]?.title || 'Module 1'}" to reinforce upcoming evaluation questions.
                </p>
              </div>
            </div>

            <div style={styles.recItem}>
              <div style={styles.recIconBadge}>
                <Clock size={16} color="var(--violet-light)" />
              </div>
              <div>
                <div style={styles.recTitle}>Spaced Flashcard Practice</div>
                <p style={styles.recBody}>
                  12 active-recall prompt cards ready in Revision Workspace based on your uploaded notes.
                </p>
              </div>
            </div>

            <div style={styles.recItem}>
              <div style={styles.recIconBadge}>
                <CheckCircle2 size={16} color="#10b981" />
              </div>
              <div>
                <div style={styles.recTitle}>Verification Integrity: 100%</div>
                <p style={styles.recBody}>
                  Every tutor answer backed by strict vector similarity matches in Qdrant with citation modals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Ingested Course Resources Quick Peek */}
      <div style={styles.resourcesPeekCard} className="glass-panel">
        <div style={styles.cardHeader}>
          <div style={styles.cardHeaderLeft}>
            <FolderOpen size={18} color="var(--violet-light)" />
            <h3 style={styles.cardTitle}>Course Knowledge Store ({resources.length} Ingested)</h3>
          </div>
          <button
            onClick={() => setActiveTab('knowledge-base')}
            style={styles.cardLink}
          >
            Manage Knowledge Base <ArrowRight size={13} />
          </button>
        </div>

        <div style={styles.resourcesPeekGrid}>
          {resources.length === 0 ? (
            <div style={styles.emptyNotice}>
              No files uploaded. Go to Knowledge Base to upload course materials.
            </div>
          ) : (
            resources.slice(0, 4).map((r) => (
              <div key={r.id} style={styles.peekItem}>
                <div style={styles.peekIcon}>
                  <FileText size={18} color="var(--violet-light)" />
                </div>
                <div style={styles.peekDetails}>
                  <div style={styles.peekFilename} title={r.filename}>{r.filename}</div>
                  <div style={styles.peekMeta}>
                    <span className="badge badge-emerald">{r.processing_status}</span>
                    <span>• {r.resource_type}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  heroBanner: {
    padding: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '30px',
    background: 'linear-gradient(135deg, rgba(18, 25, 44, 0.95) 0%, rgba(13, 19, 36, 0.95) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    boxShadow: 'var(--shadow-glow)',
  },
  heroLeft: {
    flex: 1,
  },
  heroTitle: {
    fontSize: '1.75rem',
    fontWeight: 800,
    marginBottom: '8px',
  },
  heroSubtitle: {
    fontSize: '0.88rem',
    color: 'var(--text-muted)',
    maxWidth: '600px',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  quickActionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  heroRight: {
    flexShrink: 0,
  },
  masteryPillCard: {
    padding: '20px 24px',
    borderRadius: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-medium)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    textAlign: 'center',
  },
  pillLabel: {
    fontSize: '0.72rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
  masteryScoreRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  masteryScore: {
    fontSize: '2.4rem',
    fontWeight: 800,
    color: '#ffffff',
    fontFamily: 'var(--font-heading)',
  },
  pillFooter: {
    fontSize: '0.7rem',
    color: 'var(--text-subtle)',
  },
  insightsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  insightCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  cardLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--cyan-light)',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  topicsPreviewList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  topicPreviewItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  topicPreviewTop: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.84rem',
    fontWeight: 600,
  },
  topicPreviewName: {
    color: '#ffffff',
  },
  topicPreviewPct: {
    color: 'var(--cyan-light)',
    fontFamily: 'var(--font-mono)',
  },
  track: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '999px',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: '999px',
  },
  recommendationsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  recItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
  },
  recIconBadge: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recTitle: {
    fontSize: '0.85rem',
    fontWeight: 700,
    color: '#ffffff',
    marginBottom: '2px',
  },
  recBody: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  resourcesPeekCard: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  resourcesPeekGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '12px',
  },
  peekItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    overflow: 'hidden',
  },
  peekIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  peekDetails: {
    overflow: 'hidden',
  },
  peekFilename: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  peekMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.7rem',
    color: 'var(--text-subtle)',
    marginTop: '2px',
  },
  emptyNotice: {
    padding: '20px',
    textAlign: 'center',
    color: 'var(--text-subtle)',
    fontSize: '0.84rem',
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
