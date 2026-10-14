import React, { useState } from 'react';
import {
  Search,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const Header = ({ onSearchQuery, onTriggerBuildMap, isBuildingMap }) => {
  const { selectedCourse, backendOnline, openCitation } = useApp();
  const [searchInput, setSearchInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState(null);

  const handleSearchSubmit = async (e) => {
    e.preventDefault();
    if (!searchInput.trim() || !selectedCourse) return;
    setIsSearching(true);
    if (onSearchQuery) {
      const results = await onSearchQuery(searchInput);
      setSearchResults(results);
    }
    setIsSearching(false);
  };

  return (
    <header style={styles.header}>
      {/* Search Input for Semantic Grounding */}
      <div style={styles.searchContainer}>
        <form onSubmit={handleSearchSubmit} style={styles.searchForm}>
          <Search size={16} color="var(--text-subtle)" style={{ flexShrink: 0 }} />
          <input
            type="text"
            placeholder={
              selectedCourse
                ? `Search course materials & embeddings in "${selectedCourse.title}"...`
                : 'Select a course to search grounded context...'
            }
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            disabled={!selectedCourse}
            style={styles.searchInput}
          />
          {searchInput && (
            <button
              type="submit"
              disabled={isSearching}
              className="btn btn-primary"
              style={{ padding: '6px 12px', fontSize: '0.78rem' }}
            >
              {isSearching ? <RefreshCw size={13} className="spin" /> : 'Search'}
            </button>
          )}
        </form>

        {/* Floating Search Results Dropdown */}
        {searchResults && (
          <div style={styles.searchResultsDropdown} className="glass-panel">
            <div style={styles.searchResultsHeader}>
              <span>Semantic Search Matches ({searchResults.length})</span>
              <button
                onClick={() => setSearchResults(null)}
                style={styles.closeSearchBtn}
              >
                ✕
              </button>
            </div>
            {searchResults.length === 0 ? (
              <div style={styles.searchEmpty}>No matching chunks found in course knowledge base.</div>
            ) : (
              <div style={styles.searchResultsList}>
                {searchResults.map((res, idx) => (
                  <div
                    key={idx}
                    style={styles.searchResultItem}
                    onClick={() => {
                      openCitation({
                        chunk_id: res.chunk_id,
                        resource_id: res.resource_id,
                        start_page: res.metadata?.start_page,
                        end_page: res.metadata?.end_page,
                        score: res.score,
                      });
                      setSearchResults(null);
                    }}
                  >
                    <div style={styles.searchResultMeta}>
                      <span className="badge badge-violet">
                        Score: {(res.score * 100).toFixed(0)}%
                      </span>
                      {res.metadata?.start_page && (
                        <span className="badge badge-cyan">Page {res.metadata.start_page}</span>
                      )}
                    </div>
                    <p style={styles.searchResultText}>{res.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Badges & Buttons */}
      <div style={styles.actionsContainer}>
        {/* Knowledge Map Extraction Trigger */}
        {selectedCourse && (
          <button
            onClick={onTriggerBuildMap}
            disabled={isBuildingMap}
            className="btn btn-secondary"
            style={{ fontSize: '0.82rem', padding: '8px 14px' }}
            title="Trigger LLM Knowledge Graph & Prerequisite Map Extraction"
          >
            {isBuildingMap ? (
              <>
                <RefreshCw size={14} className="spin" color="var(--violet-light)" />
                <span>Extracting Ontology...</span>
              </>
            ) : (
              <>
                <Zap size={14} color="var(--violet-light)" />
                <span>Extract Knowledge Map</span>
              </>
            )}
          </button>
        )}

        {/* Backend System Health Pill */}
        <div style={styles.healthPill}>
          {backendOnline ? (
            <>
              <CheckCircle2 size={14} color="#10b981" />
              <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: 600 }}>FastAPI Online</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} color="#f43f5e" />
              <span style={{ color: '#f43f5e', fontSize: '0.78rem', fontWeight: 600 }}>Backend Disconnected</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

const styles = {
  header: {
    height: 'var(--header-height)',
    borderBottom: '1px solid var(--border-subtle)',
    padding: '0 28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(10, 13, 23, 0.8)',
    backdropFilter: 'blur(20px)',
    position: 'sticky',
    top: 0,
    zIndex: 30,
  },
  searchContainer: {
    position: 'relative',
    width: '520px',
  },
  searchForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    backgroundColor: 'var(--bg-input)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '12px',
    padding: '7px 14px',
    transition: 'border-color 0.2s',
  },
  searchInput: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#ffffff',
    fontSize: '0.86rem',
    outline: 'none',
  },
  actionsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  healthPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '999px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid var(--border-subtle)',
  },
  searchResultsDropdown: {
    position: 'absolute',
    top: 'calc(100% + 8px)',
    left: 0,
    right: 0,
    zIndex: 50,
    maxHeight: '380px',
    overflowY: 'auto',
    padding: '12px',
  },
  searchResultsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.8rem',
    fontWeight: 700,
    color: 'var(--text-muted)',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '8px',
    marginBottom: '8px',
  },
  closeSearchBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-subtle)',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  searchEmpty: {
    padding: '16px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  searchResultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  searchResultItem: {
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  searchResultMeta: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
  },
  searchResultText: {
    fontSize: '0.82rem',
    color: 'var(--text-main)',
    lineHeight: 1.4,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  },
};
