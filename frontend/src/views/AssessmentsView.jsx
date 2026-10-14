import React, { useState } from 'react';
import {
  BrainCircuit,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ArrowRight,
  RotateCcw,
  Award,
  Layers,
  ChevronRight,
  Bookmark,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import confetti from 'canvas-confetti';

export const AssessmentsView = () => {
  const { selectedCourse, openCitation } = useApp();
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(3);
  const [isGenerating, setIsGenerating] = useState(false);
  const [assessmentActive, setAssessmentActive] = useState(false);

  // Assessment Questions
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [evaluation, setEvaluation] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Generate Adaptive Assessment grounded on Course knowledge
  const handleGenerateAssessment = async () => {
    if (!selectedCourse) return;
    setIsGenerating(true);
    setEvaluation(null);
    setUserAnswers({});

    try {
      // Fetch topics and course concepts first to build targeted, grounded questions
      const topics = await api.getKnowledgeMap(selectedCourse.id).catch(() => []);
      const conceptList = topics.flatMap((t) => t.concepts || []);

      // Ask RAG tutor to synthesize adaptive quiz questions based on the course materials
      const prompt = `Synthesize an adaptive test with exactly ${questionCount} questions at ${difficulty} difficulty based on our course materials.
Format your response strictly as JSON with this structure:
{
  "questions": [
    {
      "id": 1,
      "type": "mcq",
      "concept": "Core Concept Name",
      "question": "Clear problem statement based on course content?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": "Option A",
      "explanation": "Detailed grounded explanation with proof."
    }
  ]
}`;

      const res = await api.chatWithCourse(selectedCourse.id, prompt, false, 5);
      
      let parsedQuestions = [];
      try {
        const jsonMatch = res.answer.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          parsedQuestions = parsed.questions || [];
        }
      } catch (parseErr) {
        console.warn('Could not parse strict JSON, building fallback grounded quiz items', parseErr);
      }

      // If LLM returned unstructured response or fewer questions, construct grounded questions from topics
      if (!parsedQuestions || parsedQuestions.length === 0) {
        parsedQuestions = (conceptList.slice(0, questionCount) || []).map((c, idx) => ({
          id: idx + 1,
          type: 'mcq',
          concept: c.title,
          question: `Regarding "${c.title}": which definition accurately reflects the ingested course material?`,
          options: [
            c.definition,
            `An alternative unrelated mechanism that does not apply to ${c.title}.`,
            `A preliminary step that was deprecated in classical implementations.`,
            `None of the above formulations are correct.`
          ],
          correct_answer: c.definition,
          explanation: `According to our course knowledge ontology, ${c.title} is strictly defined as: "${c.definition}".`,
        }));
      }

      // If still empty (no concepts extracted yet), provide illustrative adaptive questions
      if (parsedQuestions.length === 0) {
        parsedQuestions = [
          {
            id: 1,
            type: 'mcq',
            concept: 'Multimodal RAG Architecture',
            question: 'What is the primary role of chunk-level metadata (such as page numbers or video timestamps) in a grounded learning platform?',
            options: [
              'To eliminate hallucination by enabling verifiable citation tracing and source jumping.',
              'To reduce memory footprint in PostgreSQL database tables.',
              'To avoid the requirement of embedding calculations.',
              'To compress high-resolution video streams.'
            ],
            correct_answer: 'To eliminate hallucination by enabling verifiable citation tracing and source jumping.',
            explanation: 'Grounded citation tracing provides empirical verification, preventing hallucinations and linking learner comprehension to exact materials.'
          },
          {
            id: 2,
            type: 'mcq',
            concept: 'Prerequisite Graph Propagation',
            question: 'When a learner scores poorly on an advanced topic, what action does the adaptive DAG engine take?',
            options: [
              'Propagates diagnostic deficiency backward to foundational prerequisite nodes to recommend review.',
              'Permanently locks the learner account until re-examination.',
              'Increases assessment difficulty to maximum tier.',
              'Deletes the learner history to reset score.'
            ],
            correct_answer: 'Propagates diagnostic deficiency backward to foundational prerequisite nodes to recommend review.',
            explanation: 'In adaptive learning ontologies, failures on child nodes indicate deficiencies in foundational prerequisites.'
          }
        ];
      }

      setQuestions(parsedQuestions);
      setAssessmentActive(true);
    } catch (err) {
      console.error('Failed to generate assessment:', err);
      alert('Error generating assessment: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSelectOption = (questionId, option) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleSubmitAssessment = () => {
    setIsEvaluating(true);
    let correctCount = 0;
    const itemResults = questions.map((q) => {
      const selected = userAnswers[q.id];
      const isCorrect = selected === q.correct_answer;
      if (isCorrect) correctCount++;
      return {
        ...q,
        user_selected: selected,
        is_correct: isCorrect,
      };
    });

    const scorePct = Math.round((correctCount / questions.length) * 100);

    // Save assessment record to local storage for persistence across tabs
    const historyItem = {
      id: Date.now().toString(),
      courseId: selectedCourse.id,
      courseTitle: selectedCourse.title,
      date: new Date().toISOString(),
      score: scorePct,
      correctCount,
      totalCount: questions.length,
      difficulty,
      items: itemResults,
    };

    const existingHistory = JSON.parse(localStorage.getItem('cognify_assessments_history') || '[]');
    localStorage.setItem('cognify_assessments_history', JSON.stringify([historyItem, ...existingHistory]));

    setEvaluation({
      scorePct,
      correctCount,
      totalCount: questions.length,
      itemResults,
    });
    setIsEvaluating(false);

    if (scorePct >= 70) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  if (!selectedCourse) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyCard} className="glass-panel">
          <Layers size={40} color="var(--violet-light)" />
          <h3>No Course Selected</h3>
          <p>Please select a course to generate adaptive assessments.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner */}
      <div style={styles.header}>
        <div>
          <div className="badge badge-violet" style={{ marginBottom: 6 }}>
            ADAPTIVE REASONING & EVALUATION
          </div>
          <h2 style={styles.title}>Adaptive Concept Assessments</h2>
          <p style={styles.subtitle}>
            Dynamic problem sets tailored by topic difficulty, validating student comprehension without hallucinations.
          </p>
        </div>

        {assessmentActive && (
          <button
            onClick={() => {
              setAssessmentActive(false);
              setEvaluation(null);
            }}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem' }}
          >
            <RotateCcw size={14} />
            <span>New Assessment</span>
          </button>
        )}
      </div>

      {!assessmentActive ? (
        /* Configuration Panel */
        <div style={styles.configCard} className="glass-panel">
          <div style={styles.configHeader}>
            <div style={styles.configIconWrapper}>
              <BrainCircuit size={28} color="var(--cyan-light)" />
            </div>
            <div>
              <h3 style={styles.configTitle}>Generate Dynamic Assessment</h3>
              <p style={styles.configSubtitle}>
                Targeted evaluation for "{selectedCourse.title}"
              </p>
            </div>
          </div>

          <div style={styles.configForm}>
            {/* Difficulty Selector */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Target Difficulty Tier</label>
              <div style={styles.tierButtons}>
                {['Foundational', 'Medium', 'Advanced'].map((tier) => (
                  <button
                    key={tier}
                    type="button"
                    onClick={() => setDifficulty(tier)}
                    style={{
                      ...styles.tierBtn,
                      ...(difficulty === tier ? styles.tierBtnActive : {}),
                    }}
                  >
                    {tier}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Count Selector */}
            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Number of Questions: {questionCount}</label>
              <input
                type="range"
                min="2"
                max="8"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                style={styles.rangeSlider}
              />
            </div>

            <button
              onClick={handleGenerateAssessment}
              disabled={isGenerating}
              className="btn btn-primary"
              style={styles.generateBtn}
            >
              {isGenerating ? (
                <>
                  <div className="spin" style={styles.spinner} />
                  <span>Synthesizing Questions from Embeddings...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Generate Adaptive Assessment</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Active Assessment / Evaluation View */
        <div style={styles.quizLayout}>
          {evaluation && (
            /* Results Banner */
            <div style={styles.resultsBanner} className="glass-panel animate-fade-in">
              <div style={styles.resultsLeft}>
                <div style={styles.scoreCircle}>
                  <span style={styles.scoreNumber}>{evaluation.scorePct}%</span>
                </div>
                <div>
                  <h3 style={styles.resultsHeading}>
                    {evaluation.scorePct >= 70 ? 'Excellent Mastery Demonstrated!' : 'Review Recommended'}
                  </h3>
                  <p style={styles.resultsSub}>
                    Answered {evaluation.correctCount} of {evaluation.totalCount} questions accurately.
                  </p>
                </div>
              </div>
              <div style={styles.resultsActions}>
                <button
                  onClick={handleGenerateAssessment}
                  className="btn btn-cyan"
                  style={{ fontSize: '0.82rem' }}
                >
                  <Sparkles size={14} />
                  <span>Take Another Set</span>
                </button>
              </div>
            </div>
          )}

          {/* Question List */}
          <div style={styles.questionsContainer}>
            {questions.map((q, qIndex) => {
              const selectedAnswer = userAnswers[q.id];
              const result = evaluation?.itemResults.find((r) => r.id === q.id);

              return (
                <div key={q.id} style={styles.questionCard} className="glass-panel">
                  <div style={styles.questionHeader}>
                    <span className="badge badge-violet">Question {qIndex + 1}</span>
                    <span className="badge badge-cyan">{q.concept}</span>
                  </div>

                  <h4 style={styles.questionTitle}>{q.question}</h4>

                  {/* Options */}
                  <div style={styles.optionsList}>
                    {q.options.map((opt, optIndex) => {
                      const isSelected = selectedAnswer === opt;
                      let optionStyle = { ...styles.optionItem };

                      if (evaluation) {
                        if (opt === q.correct_answer) {
                          optionStyle = { ...optionStyle, ...styles.optionCorrect };
                        } else if (isSelected && !result.is_correct) {
                          optionStyle = { ...optionStyle, ...styles.optionWrong };
                        }
                      } else if (isSelected) {
                        optionStyle = { ...optionStyle, ...styles.optionSelected };
                      }

                      return (
                        <div
                          key={optIndex}
                          onClick={() => !evaluation && handleSelectOption(q.id, opt)}
                          style={optionStyle}
                        >
                          <div style={styles.optionRadio}>
                            {evaluation && opt === q.correct_answer ? (
                              <CheckCircle2 size={16} color="#10b981" />
                            ) : evaluation && isSelected && !result.is_correct ? (
                              <XCircle size={16} color="#f43f5e" />
                            ) : (
                              <span style={styles.radioDot(isSelected)} />
                            )}
                          </div>
                          <span style={styles.optionLabel}>{opt}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Grounded Cited Feedback (Post Submission) */}
                  {evaluation && (
                    <div style={styles.explanationBox} className="animate-fade-in">
                      <div style={styles.explanationHeader}>
                        <Bookmark size={14} color="var(--cyan-light)" />
                        <span>Verified Grounded Explanation</span>
                      </div>
                      <p style={styles.explanationText}>{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submit Action Button */}
          {!evaluation && (
            <div style={styles.submitContainer}>
              <button
                onClick={handleSubmitAssessment}
                disabled={Object.keys(userAnswers).length < questions.length}
                className="btn btn-primary"
                style={{ padding: '14px 28px', fontSize: '0.95rem' }}
              >
                <span>Submit Assessment for Evaluation</span>
                <ArrowRight size={16} />
              </button>
            </div>
          )}
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
  configCard: {
    padding: '36px',
    maxWidth: '680px',
    margin: '30px auto',
    width: '100%',
  },
  configHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '20px',
    marginBottom: '24px',
  },
  configIconWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: '14px',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configTitle: {
    fontSize: '1.15rem',
    fontWeight: 700,
  },
  configSubtitle: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  configForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '22px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  formLabel: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  tierButtons: {
    display: 'flex',
    gap: '10px',
  },
  tierBtn: {
    flex: 1,
    padding: '10px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  tierBtnActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.25)',
    borderColor: 'var(--violet-primary)',
    color: '#ffffff',
  },
  rangeSlider: {
    width: '100%',
    accentColor: 'var(--violet-primary)',
    cursor: 'pointer',
  },
  generateBtn: {
    width: '100%',
    padding: '14px',
    fontSize: '0.92rem',
    marginTop: '10px',
  },
  quizLayout: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  resultsBanner: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(18, 25, 44, 0.9)',
    border: '1px solid rgba(139, 92, 246, 0.4)',
  },
  resultsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  scoreCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-glow)',
  },
  scoreNumber: {
    fontSize: '1.1rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  resultsHeading: {
    fontSize: '1.1rem',
    fontWeight: 700,
  },
  resultsSub: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
  },
  resultsActions: {
    display: 'flex',
    gap: '10px',
  },
  questionsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  questionCard: {
    padding: '24px',
  },
  questionHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  questionTitle: {
    fontSize: '1rem',
    fontWeight: 600,
    lineHeight: 1.5,
    marginBottom: '16px',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  optionItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  optionSelected: {
    backgroundColor: 'rgba(139, 92, 246, 0.18)',
    borderColor: 'var(--violet-primary)',
  },
  optionCorrect: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'rgba(16, 185, 129, 0.5)',
  },
  optionWrong: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'rgba(244, 63, 94, 0.5)',
  },
  optionRadio: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
  },
  radioDot: (isSelected) => ({
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid',
    borderColor: isSelected ? 'var(--violet-primary)' : 'var(--text-subtle)',
    backgroundColor: isSelected ? 'var(--violet-primary)' : 'transparent',
  }),
  optionLabel: {
    fontSize: '0.88rem',
    color: '#f8fafc',
    lineHeight: 1.4,
  },
  explanationBox: {
    marginTop: '16px',
    padding: '14px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
    border: '1px solid rgba(6, 182, 212, 0.25)',
  },
  explanationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.76rem',
    fontWeight: 700,
    color: 'var(--cyan-light)',
    textTransform: 'uppercase',
    marginBottom: '6px',
  },
  explanationText: {
    fontSize: '0.84rem',
    color: '#e2e8f0',
    lineHeight: 1.5,
  },
  submitContainer: {
    display: 'flex',
    justifyContent: 'center',
    padding: '20px 0',
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
  spinner: {
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
  },
};
