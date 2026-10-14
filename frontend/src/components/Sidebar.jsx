import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  Bot,
  BrainCircuit,
  Network,
  BarChart3,
  Sparkles,
  Layers,
  BookOpen,
  LogOut,
  ChevronDown,
  Plus,
  Compass,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Sidebar = ({ onOpenCreateCourse }) => {
  const {
    activeTab,
    setActiveTab,
    courses,
    selectedCourse,
    setSelectedCourse,
    user,
    logoutUser,
  } = useApp();

  const navigationItems = [
    { id: 'dashboard', label: 'Overview & Mastery', icon: LayoutDashboard, badge: null },
    { id: 'knowledge-base', label: 'Knowledge Base', icon: FolderOpen, count: selectedCourse ? null : null },
    { id: 'tutor', label: 'AI Multimodal Tutor', icon: Bot, badge: 'RAG' },
    { id: 'knowledge-graph', label: 'Prerequisite Graph', icon: Network, badge: 'Ontology' },
    { id: 'assessments', label: 'Adaptive Assessments', icon: BrainCircuit, badge: 'Adaptive' },
    { id: 'analytics', label: 'Analytics & Mastery', icon: BarChart3, badge: null },
    { id: 'revision', label: 'Revision Workspace', icon: Layers, badge: 'Flashcards' },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Brand Header */}
      <div style={styles.brandContainer}>
        <div style={styles.brandIconWrapper}>
          <Sparkles size={20} color="#8b5cf6" />
        </div>
        <div>
          <div style={styles.brandTitle}>COGNIFY <span style={{ color: 'var(--cyan-primary)' }}>AI</span></div>
          <div style={styles.brandSubtitle}>Adaptive Learning Engine</div>
        </div>
      </div>

      {/* Course Selector Dropdown */}
      <div style={styles.courseSelectSection}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>ACTIVE COURSE</span>
          <button
            onClick={onOpenCreateCourse}
            title="Create new course"
            style={styles.addCourseBtn}
          >
            <Plus size={14} />
          </button>
        </div>

        {courses.length === 0 ? (
          <button onClick={onOpenCreateCourse} style={styles.emptyCourseBtn}>
            <Plus size={16} />
            <span>Create First Course</span>
          </button>
        ) : (
          <div style={styles.selectWrapper}>
            <BookOpen size={16} color="var(--violet-light)" style={{ flexShrink: 0 }} />
            <select
              value={selectedCourse?.id || ''}
              onChange={(e) => {
                const found = courses.find((c) => c.id === e.target.value);
                if (found) setSelectedCourse(found);
              }}
              style={styles.selectDropdown}
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id} style={{ background: '#0f1527', color: '#f8fafc' }}>
                  {course.title}
                </option>
              ))}
            </select>
            <ChevronDown size={14} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
          </div>
        )}
      </div>

      {/* Nav Menu */}
      <nav style={styles.navMenu}>
        <div style={{ ...styles.sectionTitle, padding: '0 12px 6px' }}>EXPLORE & LEARN</div>
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              <div style={styles.navItemContent}>
                <Icon
                  size={18}
                  color={isActive ? 'var(--cyan-light)' : 'var(--text-muted)'}
                />
                <span style={{ color: isActive ? '#ffffff' : 'var(--text-muted)' }}>
                  {item.label}
                </span>
              </div>
              {item.badge && (
                <span
                  style={{
                    ...styles.navBadge,
                    backgroundColor: isActive ? 'rgba(6, 182, 212, 0.2)' : 'rgba(139, 92, 246, 0.15)',
                    color: isActive ? 'var(--cyan-light)' : 'var(--violet-light)',
                    borderColor: isActive ? 'rgba(6, 182, 212, 0.4)' : 'rgba(139, 92, 246, 0.3)',
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Footer */}
      <div style={styles.footerSection}>
        <div style={styles.userInfo}>
          <div style={styles.avatar}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={styles.userDetails}>
            <div style={styles.userEmail} title={user?.email}>
              {user?.email || 'Learner'}
            </div>
            <div style={styles.userStatus}>
              <span style={styles.onlineDot} /> Online • Track D
            </div>
          </div>
        </div>
        <button onClick={logoutUser} title="Sign Out" style={styles.logoutBtn}>
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
};

const styles = {
  sidebar: {
    width: 'var(--sidebar-width)',
    height: '100vh',
    backgroundColor: 'rgba(10, 13, 23, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRight: '1px solid var(--border-subtle)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    zIndex: 40,
  },
  brandContainer: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  brandIconWrapper: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(6, 182, 212, 0.2) 100%)',
    border: '1px solid rgba(139, 92, 246, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: 'var(--shadow-glow)',
  },
  brandTitle: {
    fontFamily: 'var(--font-heading)',
    fontSize: '1.25rem',
    fontWeight: 800,
    letterSpacing: '0.04em',
    color: '#ffffff',
  },
  brandSubtitle: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    letterSpacing: '0.02em',
  },
  courseSelectSection: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--border-subtle)',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '0.68rem',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: 'var(--text-subtle)',
  },
  addCourseBtn: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-muted)',
    borderRadius: '6px',
    padding: '4px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  emptyCourseBtn: {
    width: '100%',
    padding: '10px',
    borderRadius: '8px',
    border: '1px dashed var(--violet-primary)',
    background: 'rgba(139, 92, 246, 0.08)',
    color: 'var(--violet-light)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '0.82rem',
    fontWeight: 600,
  },
  selectWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    padding: '8px 12px',
  },
  selectDropdown: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.85rem',
    fontWeight: 600,
    outline: 'none',
    cursor: 'pointer',
    appearance: 'none',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  navMenu: {
    flex: 1,
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflowY: 'auto',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderRadius: '10px',
    background: 'transparent',
    border: '1px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    textAlign: 'left',
  },
  navItemActive: {
    background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.18) 0%, rgba(6, 182, 212, 0.08) 100%)',
    borderColor: 'rgba(139, 92, 246, 0.35)',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
  },
  navItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '0.88rem',
    fontWeight: 600,
  },
  navBadge: {
    fontSize: '0.65rem',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '999px',
    border: '1px solid',
  },
  footerSection: {
    padding: '16px 20px',
    borderTop: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    background: 'rgba(15, 21, 39, 0.6)',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    overflow: 'hidden',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.9rem',
    color: '#ffffff',
    flexShrink: 0,
  },
  userDetails: {
    overflow: 'hidden',
  },
  userEmail: {
    fontSize: '0.82rem',
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  userStatus: {
    fontSize: '0.7rem',
    color: 'var(--text-subtle)',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
  },
  onlineDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    display: 'inline-block',
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-subtle)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
};
