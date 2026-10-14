import React, { useState } from 'react';
import { Sparkles, ArrowRight, ShieldCheck, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const AuthView = () => {
  const { loginUser } = useApp();
  const [isRegister, setIsRegister] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('demo@cognify.ai');
  const [password, setPassword] = useState('CognifySecure2026!');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleToggleTab = (registerMode) => {
    setIsRegister(registerMode);
    setError(null);
    if (registerMode) {
      if (email === 'demo@cognify.ai') {
        setEmail('');
        setPassword('');
        setFullName('');
      }
    } else {
      if (!email) {
        setEmail('demo@cognify.ai');
        setPassword('CognifySecure2026!');
      }
    }
  };

  const handleFillDemo = () => {
    setIsRegister(false);
    setEmail('demo@cognify.ai');
    setPassword('CognifySecure2026!');
    setFullName('Demo Learner');
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        if (!fullName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        await api.register(email.trim(), password, fullName.trim());
      }
      await loginUser(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Decorative Orbs */}
      <div style={styles.glowOrb1} />
      <div style={styles.glowOrb2} />

      <div style={styles.card} className="glass-panel animate-fade-in">
        {/* Logo & Headline */}
        <div style={styles.header}>
          <div style={styles.iconWrapper}>
            <Sparkles size={24} color="#8b5cf6" />
          </div>
          <h1 style={styles.title}>
            COGNIFY <span style={{ color: 'var(--cyan-primary)' }}>AI</span>
          </h1>
          <p style={styles.tagline}>
            Multimodal Adaptive Learning Platform • Hackathon Track D
          </p>
        </div>

        {/* Tab Toggle */}
        <div style={styles.toggleBar}>
          <button
            type="button"
            onClick={() => handleToggleTab(false)}
            style={{
              ...styles.toggleBtn,
              ...(isRegister ? {} : styles.toggleBtnActive),
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => handleToggleTab(true)}
            style={{
              ...styles.toggleBtn,
              ...(isRegister ? styles.toggleBtnActive : {}),
            }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <span>{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {isRegister && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name</label>
              <div style={styles.inputWrapper}>
                <User size={16} color="var(--text-subtle)" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Rivera"
                  style={styles.input}
                />
              </div>
            </div>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Learner Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={16} color="var(--text-subtle)" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@university.edu"
                style={styles.input}
              />
            </div>
          </div>

          <div style={styles.fieldGroup}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={styles.label}>Password</label>
              {isRegister && (
                <span style={{ fontSize: '0.72rem', color: 'var(--text-subtle)' }}>
                  Min 8 characters
                </span>
              )}
            </div>
            <div style={styles.inputWrapper}>
              <Lock size={16} color="var(--text-subtle)" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={styles.input}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--text-subtle)',
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={styles.submitBtn}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{isRegister ? 'Register & Enter Platform' : 'Sign In to Workspace'}</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Pre-fill */}
        <div style={styles.footer}>
          <button
            type="button"
            onClick={handleFillDemo}
            style={styles.demoNote}
            title="Click to fill evaluation credentials"
          >
            <ShieldCheck size={14} color="#10b981" />
            <span>Pre-filled credentials for competition evaluation (Click to autofill)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    position: 'relative',
    overflow: 'hidden',
  },
  glowOrb1: {
    position: 'absolute',
    top: '20%',
    left: '25%',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(139, 92, 246, 0.18) 0%, transparent 70%)',
    filter: 'blur(60px)',
    pointerEvents: 'none',
  },
  glowOrb2: {
    position: 'absolute',
    bottom: '20%',
    right: '25%',
    width: '450px',
    height: '450px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)',
    filter: 'blur(70px)',
    pointerEvents: 'none',
  },
  card: {
    width: '100%',
    maxWidth: '460px',
    padding: '36px',
    position: 'relative',
    zIndex: 10,
    border: '1px solid var(--border-medium)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '28px',
  },
  iconWrapper: {
    width: '52px',
    height: '52px',
    borderRadius: '16px',
    margin: '0 auto 16px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-glow)',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 800,
    letterSpacing: '-0.02em',
    marginBottom: '6px',
  },
  tagline: {
    fontSize: '0.82rem',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  toggleBar: {
    display: 'flex',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '4px',
    marginBottom: '24px',
  },
  toggleBtn: {
    flex: 1,
    padding: '8px 12px',
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    fontWeight: 600,
    fontSize: '0.82rem',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  toggleBtnActive: {
    background: 'rgba(139, 92, 246, 0.25)',
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)',
  },
  errorAlert: {
    padding: '10px 14px',
    borderRadius: '8px',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: '#fda4af',
    fontSize: '0.82rem',
    marginBottom: '18px',
  },
  form: {
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
    fontSize: '0.78rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '10px 14px',
    transition: 'border-color 0.2s',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.88rem',
    outline: 'none',
  },
  submitBtn: {
    width: '100%',
    padding: '12px',
    marginTop: '6px',
    fontSize: '0.92rem',
  },
  footer: {
    marginTop: '24px',
    textAlign: 'center',
  },
  demoNote: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--text-subtle)',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '20px',
    padding: '6px 14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};
