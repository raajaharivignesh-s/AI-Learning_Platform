import React, { useState, useEffect } from 'react';
import {
  Network,
  Zap,
  GitFork,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
  CheckCircle2,
  Bookmark,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const KnowledgeGraphView = ({ onTriggerBuildMap, isBuildingMap }) => {
  const { selectedCourse, openCitation } = useApp();
  const [topics, setTopics] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedConcept, setSelectedConcept] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mapStatus, setMapStatus] = useState(null);

  useEffect(() => {
    if (selectedCourse) {
      loadGraphData();
    }
  }, [selectedCourse]);

  const loadGraphData = async () => {
    if (!selectedCourse) return;
    setLoading(true);
    try {
      const statusRes = await api.getKnowledgeMapStatus(selectedCourse.id).catch(() => null);
      setMapStatus(statusRes);

      const topicsRes = await api.getKnowledgeMap(selectedCourse.id).catch(() => []);
      setTopics(topicsRes || []);
      if (topicsRes?.length > 0 && !selectedTopic) {
        setSelectedTopic(topicsRes[0]);
        if (topicsRes[0].concepts?.length > 0) {
          setSelectedConcept(topicsRes[0].concepts[0]);
        }
      }
    } catch (err) {
      console.error('Failed to load knowledge graph:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCourse) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyCard} className="glass-panel">
          <Layers size={40} color="var(--violet-light)" />
          <h3>No Course Selected</h3>
          <p>Please select a course to explore its concept ontology and prerequisite tree.</p>
        </div>
      </div>
    );
  }

  const isCompleted = mapStatus?.status === 'completed';
  const isProcessing = mapStatus?.status === 'processing' || isBuildingMap;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner */}
      <div style={styles.header}>
        <div>
          <div className="badge badge-cyan" style={{ marginBottom: 6 }}>
            PHASE 3.3 KNOWLEDGE ONTOLOGY & DAG PREREQUISITES
          </div>
          <h2 style={styles.title}>Knowledge Graph & Concept Hierarchy</h2>
          <p style={styles.subtitle}>
            LLM-extracted directed acyclic graph mapping concepts, foundational dependencies, and learning paths.
          </p>
        </div>

        <div style={styles.headerActions}>
          <button
            onClick={loadGraphData}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem' }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
            <span>Refresh Graph</span>
          </button>

          <button
            onClick={onTriggerBuildMap}
            disabled={isProcessing}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            {isProcessing ? (
              <>
                <RefreshCw size={13} className="spin" />
                <span>Inferring Prerequisites...</span>
              </>
            ) : (
              <>
                <Zap size={13} />
                <span>{topics.length > 0 ? 'Regenerate Ontology' : 'Build Knowledge Map'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Ontology Explorer */}
      {isProcessing ? (
        <div style={styles.processingCard} className="glass-panel">
          <div className="spin" style={styles.largeSpinner} />
          <h3>Extracting Concepts & Inferring Prerequisite Graph...</h3>
          <p>
            Processing semantic chunks with Gemini structured outputs to build cycle-free directed relationships.
          </p>
        </div>
      ) : topics.length === 0 ? (
        <div style={styles.emptyGraphCard} className="glass-panel">
          <GitFork size={48} color="var(--violet-light)" />
          <h3>No Knowledge Graph Built Yet</h3>
          <p>
            Extract major topics, concepts, and causal prerequisites directly from your course materials.
          </p>
          <button
            onClick={onTriggerBuildMap}
            disabled={isProcessing}
            className="btn btn-primary"
            style={{ marginTop: '12px' }}
          >
            <Zap size={16} />
            <span>Build Knowledge Map Now</span>
          </button>
        </div>
      ) : (
        <div style={styles.graphLayout}>
          {/* Column 1: Topics Hierarchy */}
          <div style={styles.topicsCol} className="glass-panel">
            <div style={styles.colHeader}>
              <span style={styles.colTitle}>Topics & Modules ({topics.length})</span>
            </div>
            <div style={styles.topicsList}>
              {topics.map((top) => {
                const isSelected = selectedTopic?.id === top.id;
                return (
                  <div
                    key={top.id}
                    onClick={() => {
                      setSelectedTopic(top);
                      if (top.concepts?.length > 0) {
                        setSelectedConcept(top.concepts[0]);
                      } else {
                        setSelectedConcept(null);
                      }
                    }}
                    style={{
                      ...styles.topicItem,
                      ...(isSelected ? styles.topicItemActive : {}),
                    }}
                  >
                    <div style={styles.topicInfo}>
                      <span style={styles.topicName}>{top.title}</span>
                      <span style={styles.conceptCount}>
                        {top.concepts?.length || 0} core concepts
                      </span>
                    </div>
                    <ChevronRight size={14} color={isSelected ? 'var(--cyan-light)' : 'var(--text-subtle)'} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Column 2: Concepts in Topic */}
          <div style={styles.conceptsCol} className="glass-panel">
            <div style={styles.colHeader}>
              <span style={styles.colTitle}>
                Concepts in "{selectedTopic?.title || 'Selected Topic'}"
              </span>
            </div>
            {selectedTopic?.concepts?.length === 0 ? (
              <div style={styles.emptyCol}>No concepts extracted for this topic.</div>
            ) : (
              <div style={styles.conceptsList}>
                {selectedTopic?.concepts?.map((c) => {
                  const isSelected = selectedConcept?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConcept(c)}
                      style={{
                        ...styles.conceptCard,
                        ...(isSelected ? styles.conceptCardActive : {}),
                      }}
                    >
                      <div style={styles.conceptHeaderRow}>
                        <span style={styles.conceptTitle}>{c.title}</span>
                        <span className="badge badge-violet">Concept</span>
                      </div>
                      <p style={styles.conceptDefinitionPreview}>{c.definition}</p>
                      <div style={styles.conceptFooter}>
                        <span>{c.sources?.length || 0} Grounded Sources</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column 3: Concept Deep Dive & Prerequisites */}
          <div style={styles.detailCol} className="glass-panel">
            <div style={styles.colHeader}>
              <span style={styles.colTitle}>Concept Intelligence & Lineage</span>
            </div>

            {selectedConcept ? (
              <div style={styles.detailContent}>
                <div style={styles.detailHeader}>
                  <div className="badge badge-cyan" style={{ marginBottom: 6 }}>
                    TARGET NODE
                  </div>
                  <h3 style={styles.detailConceptTitle}>{selectedConcept.title}</h3>
                </div>

                <div style={styles.definitionBox}>
                  <div style={styles.defHeading}>Formal Definition:</div>
                  <p style={styles.defText}>{selectedConcept.definition}</p>
                </div>

                {/* Grounded Source Chunks */}
                <div style={styles.sourcesSection}>
                  <div style={styles.defHeading}>Evidence Chunks ({selectedConcept.sources?.length || 0})</div>
                  {selectedConcept.sources?.length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                      No direct chunk mapping found.
                    </p>
                  ) : (
                    <div style={styles.sourcesList}>
                      {selectedConcept.sources.map((src, i) => (
                        <button
                          key={src.id || i}
                          onClick={() =>
                            openCitation({
                              chunk_id: src.chunk_id,
                              resource_id: src.resource_id,
                              score: 0.95,
                            })
                          }
                          style={styles.sourcePill}
                          title="View verified text source"
                        >
                          <Bookmark size={12} color="var(--violet-light)" />
                          <span>Chunk [{src.chunk_id?.slice(0, 8)}]</span>
                          <span className="badge badge-emerald" style={{ fontSize: '0.65rem' }}>
                            View Evidence
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Learning Path Recommendation */}
                <div style={styles.adaptiveAdviceCard}>
                  <div style={styles.adviceHeader}>
                    <Sparkles size={16} color="var(--cyan-light)" />
                    <span>Mastery Recommendation</span>
                  </div>
                  <p style={styles.adviceBody}>
                    Master foundational concepts in this cluster before proceeding to dependent evaluation modules.
                  </p>
                </div>
              </div>
            ) : (
              <div style={styles.emptyCol}>Select a concept to inspect its prerequisites and evidence lineage.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: '1.55rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  subtitle: {
    fontSize: '0.84rem',
    color: 'var(--text-muted)',
    marginTop: '2px',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  graphLayout: {
    display: 'grid',
    gridTemplateColumns: '280px 340px 1fr',
    gap: '18px',
    height: 'calc(100vh - var(--header-height) - 140px)',
  },
  topicsCol: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '16px',
  },
  conceptsCol: {
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    padding: '16px',
  },
  detailCol: {
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    padding: '20px',
  },
  colHeader: {
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '10px',
    marginBottom: '12px',
  },
  colTitle: {
    fontSize: '0.8rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    letterSpacing: '0.04em',
  },
  topicsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    overflowY: 'auto',
  },
  topicItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  topicItemActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    borderColor: 'rgba(139, 92, 246, 0.4)',
    boxShadow: 'var(--shadow-glow)',
  },
  topicInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    overflow: 'hidden',
  },
  topicName: {
    fontSize: '0.86rem',
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  conceptCount: {
    fontSize: '0.72rem',
    color: 'var(--text-subtle)',
  },
  conceptsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    overflowY: 'auto',
  },
  conceptCard: {
    padding: '14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  conceptCardActive: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderColor: 'rgba(6, 182, 212, 0.4)',
  },
  conceptHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conceptTitle: {
    fontSize: '0.88rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  conceptDefinitionPreview: {
    fontSize: '0.78rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
  conceptFooter: {
    fontSize: '0.7rem',
    color: 'var(--text-subtle)',
  },
  detailContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  detailHeader: {
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  },
  detailConceptTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  definitionBox: {
    backgroundColor: 'rgba(13, 19, 36, 0.8)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '16px',
  },
  defHeading: {
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    marginBottom: '8px',
  },
  defText: {
    fontSize: '0.88rem',
    lineHeight: 1.6,
    color: '#f8fafc',
  },
  sourcesSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sourcesList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sourcePill: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    borderRadius: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-main)',
    cursor: 'pointer',
    fontSize: '0.78rem',
    transition: 'all 0.15s ease',
  },
  adaptiveAdviceCard: {
    padding: '16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.25)',
  },
  adviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--cyan-light)',
    marginBottom: '6px',
  },
  adviceBody: {
    fontSize: '0.8rem',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  emptyCol: {
    padding: '30px 10px',
    textAlign: 'center',
    color: 'var(--text-subtle)',
    fontSize: '0.82rem',
  },
  processingCard: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  emptyGraphCard: {
    padding: '60px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  largeSpinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(139, 92, 246, 0.2)',
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
