import React, { useState } from 'react';
import { BookPlus, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const CreateCourseModal = ({ isOpen, onClose }) => {
  const { loadCourses, setSelectedCourse } = useApp();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const newCourse = await api.createCourse(title.trim(), description.trim());
      await loadCourses();
      setSelectedCourse(newCourse);
      setTitle('');
      setDescription('');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create course');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div
        style={styles.modal}
        className="glass-panel animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div style={styles.header}>
          <div style={styles.titleArea}>
            <div style={styles.iconBadge}>
              <BookPlus size={18} color="var(--cyan-light)" />
            </div>
            <div>
              <h3 style={styles.title}>Create Learning Course</h3>
              <p style={styles.subtitle}>Initialize a new knowledge domain & vector space</p>
            </div>
          </div>
          <button onClick={onClose} style={styles.closeBtn}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Course Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Advanced Deep Learning & Transformers"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Description (Optional)</label>
            <textarea
              rows="3"
              placeholder="e.g. Multimodal architectures, attention mechanics, and grounding..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field"
              style={{ resize: 'vertical' }}
            />
          </div>

          <div style={styles.footer}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim()}
              className="btn btn-primary"
            >
              {loading ? 'Creating...' : 'Create Course'}
            </button>
          </div>
        </form>
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
    maxWidth: '520px',
    backgroundColor: '#0f1527',
    border: '1px solid var(--border-medium)',
    borderRadius: '16px',
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
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
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
  },
  errorAlert: {
    margin: '16px 24px 0',
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: '#fda4af',
    fontSize: '0.82rem',
  },
  form: {
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '0.8rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '10px',
  },
};
