import React, { useState } from 'react';
import { useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { CitationModal } from './components/CitationModal';
import { CreateCourseModal } from './components/CreateCourseModal';

// Views
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { KnowledgeBaseView } from './views/KnowledgeBaseView';
import { AITutorView } from './views/AITutorView';
import { KnowledgeGraphView } from './views/KnowledgeGraphView';
import { AssessmentsView } from './views/AssessmentsView';
import { AnalyticsView } from './views/AnalyticsView';
import { RevisionView } from './views/RevisionView';

import { api } from './services/api';

export function App() {
  const { user, token, activeTab, selectedCourse } = useApp();
  const [isCreateCourseOpen, setIsCreateCourseOpen] = useState(false);
  const [isBuildingMap, setIsBuildingMap] = useState(false);

  // If user is not authenticated, render AuthView
  if (!token || !user) {
    return <AuthView />;
  }

  // Trigger Knowledge Map LLM Extraction
  const handleTriggerBuildMap = async () => {
    if (!selectedCourse || isBuildingMap) return;
    setIsBuildingMap(true);
    try {
      await api.buildKnowledgeMap(selectedCourse.id);
      alert('Knowledge map extraction completed successfully! Topics and prerequisites inferred.');
    } catch (err) {
      alert('Failed to extract knowledge map: ' + err.message);
    } finally {
      setIsBuildingMap(false);
    }
  };

  // Semantic Search Query handler from Header
  const handleSemanticSearch = async (query) => {
    if (!selectedCourse) return [];
    try {
      const results = await api.searchCourse(selectedCourse.id, query, 5);
      return results || [];
    } catch (err) {
      console.error('Semantic search error:', err);
      return [];
    }
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'knowledge-base':
        return <KnowledgeBaseView />;
      case 'tutor':
        return <AITutorView />;
      case 'knowledge-graph':
        return (
          <KnowledgeGraphView
            onTriggerBuildMap={handleTriggerBuildMap}
            isBuildingMap={isBuildingMap}
          />
        );
      case 'assessments':
        return <AssessmentsView />;
      case 'analytics':
        return <AnalyticsView />;
      case 'revision':
        return <RevisionView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div style={styles.appContainer}>
      <Sidebar onOpenCreateCourse={() => setIsCreateCourseOpen(true)} />

      <div style={styles.mainContent}>
        <Header
          onSearchQuery={handleSemanticSearch}
          onTriggerBuildMap={handleTriggerBuildMap}
          isBuildingMap={isBuildingMap}
        />

        <main style={styles.pageBody}>
          {renderActiveView()}
        </main>
      </div>

      {/* Global Modals */}
      <CitationModal />
      <CreateCourseModal
        isOpen={isCreateCourseOpen}
        onClose={() => setIsCreateCourseOpen(false)}
      />
    </div>
  );
}

const styles = {
  appContainer: {
    display: 'flex',
    minHeight: '100vh',
    width: '100vw',
    backgroundColor: 'var(--bg-primary)',
    overflow: 'hidden',
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    overflow: 'hidden',
  },
  pageBody: {
    flex: 1,
    overflowY: 'auto',
    padding: '28px 32px 40px',
  },
};

export default App;
