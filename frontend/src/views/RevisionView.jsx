import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  BookOpen,
  Calendar,
  RotateCcw,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Zap,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const RevisionView = () => {
  const { selectedCourse } = useApp();
  const [concepts, setConcepts] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [studyPlanDays, setStudyPlanDays] = useState([
    { day: 'Day 1', task: 'Foundational Definitions & Terminology Extraction', status: 'Completed' },
    { day: 'Day 2', task: 'Core Architectural Mechanics & RAG Grounding', status: 'In Progress' },
    { day: 'Day 3', task: 'Prerequisite Tree Verification & Cycle Elimination', status: 'Upcoming' },
    { day: 'Day 4', task: 'Adaptive Assessment & Benchmark Diagnostics', status: 'Upcoming' },
  ]);

  useEffect(() => {
    if (selectedCourse) {
      loadConcepts();
    }
  }, [selectedCourse]);

  const loadConcepts = async () => {
    setLoading(true);
    try {
      const topicsRes = await api.getKnowledgeMap(selectedCourse.id).catch(() => []);
      const allConcepts = topicsRes.flatMap((t) => t.concepts || []);
      setConcepts(allConcepts);
    } catch (err) {
      console.error('Error loading concepts for revision:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev + 1) % concepts.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev - 1 + concepts.length) % concepts.length);
  };

  if (!selectedCourse) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyCard} className="glass-panel">
          <Layers size={40} color="var(--violet-light)" />
          <h3>No Course Selected</h3>
          <p>Please select a course to access flashcards and study schedules.</p>
        </div>
      </div>
    );
  }

  const currentConcept = concepts[currentIdx];

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner */}
      <div style={styles.header}>
        <div>
          <div className="badge badge-violet" style={{ marginBottom: 6 }}>
            ACTIVE RECALL & RETENTION WORKSPACE
          </div>
          <h2 style={styles.title}>Revision Workspace: {selectedCourse.title}</h2>
          <p style={styles.subtitle}>
            Spaced repetition flashcards generated from verified concept definitions and daily study plans.
          </p>
        </div>
      </div>

      <div style={styles.mainGrid}>
        {/* Flashcard Active Recall Arena */}
        <div style={styles.flashcardSection}>
          <div style={styles.sectionHeader}>
            <h3 style={styles.sectionTitle}>Interactive Concept Flashcard</h3>
            <span style={styles.cardCounter}>
              {concepts.length > 0 ? `${currentIdx + 1} of ${concepts.length}` : '0 concepts'}
            </span>
          </div>

          {concepts.length === 0 ? (
            <div style={styles.emptyCardBox} className="glass-panel">
              <BookOpen size={36} color="var(--text-subtle)" />
              <p>No concepts extracted yet for flashcards.</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-subtle)' }}>
                Trigger "Extract Knowledge Map" to populate flashcard deck automatically.
              </span>
            </div>
          ) : (
            <div style={styles.cardDeck}>
              {/* Flip Card Container */}
              <div
                onClick={() => setIsFlipped(!isFlipped)}
                style={{
                  ...styles.flashcard,
                  borderColor: isFlipped ? 'var(--cyan-primary)' : 'var(--border-medium)',
                }}
                className="glass-panel"
              >
                <div style={styles.cardHeaderPill}>
                  <span className={`badge ${isFlipped ? 'badge-cyan' : 'badge-violet'}`}>
                    {isFlipped ? 'Answer & Definition' : 'Prompt / Concept'}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                    Click to flip
                  </span>
                </div>

                <div style={styles.cardBody}>
                  {!isFlipped ? (
                    <div style={styles.promptContent}>
                      <h3 style={styles.conceptPromptTitle}>{currentConcept.title}</h3>
                      <p style={styles.promptInstruction}>
                        Recall definition and foundational role before flipping.
                      </p>
                    </div>
                  ) : (
                    <div style={styles.answerContent}>
                      <h4 style={styles.conceptAnswerTitle}>{currentConcept.title}</h4>
                      <p style={styles.definitionBody}>{currentConcept.definition}</p>
                      {currentConcept.sources?.length > 0 && (
                        <div style={styles.groundingNote}>
                          <span>Grounded across {currentConcept.sources.length} chunks</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={styles.cardFooter}>
                  <RotateCcw size={13} color="var(--text-subtle)" />
                  <span style={styles.flipHint}>
                    {isFlipped ? 'Click to view front' : 'Click to reveal definition'}
                  </span>
                </div>
              </div>

              {/* Navigation Controls */}
              <div style={styles.cardControls}>
                <button onClick={handlePrev} className="btn btn-secondary" style={styles.ctrlBtn}>
                  <ChevronLeft size={16} />
                  <span>Previous</span>
                </button>
                <button onClick={handleNext} className="btn btn-primary" style={styles.ctrlBtn}>
                  <span>Next Concept</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Personalized Study Plan / Schedule */}
        <div style={styles.studyPlanSection} className="glass-panel">
          <div style={styles.planHeader}>
            <div style={styles.planIconWrapper}>
              <Calendar size={20} color="var(--cyan-light)" />
            </div>
            <div>
              <h3 style={styles.sectionTitle}>Structured Revision Pathway</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Targeted timeline to master prerequisite dependencies.
              </p>
            </div>
          </div>

          <div style={styles.daysList}>
            {studyPlanDays.map((item, idx) => {
              const isDone = item.status === 'Completed';
              const isInProgress = item.status === 'In Progress';

              return (
                <div key={idx} style={styles.dayItem}>
                  <div style={styles.dayLeft}>
                    <div
                      style={{
                        ...styles.statusCircle,
                        backgroundColor: isDone
                          ? 'rgba(16, 185, 129, 0.2)'
                          : isInProgress
                          ? 'rgba(6, 182, 212, 0.2)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderColor: isDone
                          ? '#10b981'
                          : isInProgress
                          ? 'var(--cyan-primary)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {isDone && <Check size={12} color="#10b981" />}
                      {isInProgress && <Zap size={12} color="var(--cyan-light)" />}
                    </div>
                    <div>
                      <div style={styles.dayTitle}>{item.day}</div>
                      <div style={styles.dayTask}>{item.task}</div>
                    </div>
                  </div>

                  <span
                    className={`badge ${
                      isDone
                        ? 'badge-emerald'
                        : isInProgress
                        ? 'badge-cyan'
                        : 'badge-violet'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
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
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.3fr 1fr',
    gap: '22px',
  },
  flashcardSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  cardCounter: {
    fontSize: '0.82rem',
    fontFamily: 'var(--font-mono)',
    color: 'var(--cyan-light)',
  },
  cardDeck: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  flashcard: {
    minHeight: '320px',
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    cursor: 'pointer',
    transition: 'all 0.25s ease',
  },
  cardHeaderPill: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardBody: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 0',
    textAlign: 'center',
  },
  promptContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    alignItems: 'center',
  },
  conceptPromptTitle: {
    fontSize: '1.45rem',
    fontWeight: 800,
    color: '#ffffff',
    lineHeight: 1.3,
  },
  promptInstruction: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  answerContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    textAlign: 'left',
  },
  conceptAnswerTitle: {
    fontSize: '1.1rem',
    fontWeight: 700,
    color: 'var(--cyan-light)',
  },
  definitionBody: {
    fontSize: '0.92rem',
    lineHeight: 1.6,
    color: '#f8fafc',
  },
  groundingNote: {
    fontSize: '0.72rem',
    color: 'var(--text-subtle)',
    marginTop: '6px',
  },
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    borderTop: '1px solid var(--border-subtle)',
    paddingTop: '14px',
  },
  flipHint: {
    fontSize: '0.75rem',
    color: 'var(--text-subtle)',
  },
  cardControls: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '12px',
  },
  ctrlBtn: {
    flex: 1,
  },
  studyPlanSection: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  planHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '16px',
  },
  planIconWrapper: {
    width: '42px',
    height: '42px',
    borderRadius: '12px',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  daysList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  dayItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
  },
  dayLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  statusCircle: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayTitle: {
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
  },
  dayTask: {
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#ffffff',
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
  emptyCardBox: {
    padding: '50px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
};
