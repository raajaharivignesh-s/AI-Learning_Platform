import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Video,
  FileCheck2,
  Trash2,
  Play,
  Layers,
  Sparkles,
  AlertCircle,
  Clock,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';

export const KnowledgeBaseView = ({ onSelectResourceForInspection }) => {
  const { selectedCourse } = useApp();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  // Selected resource for inspecting chunks
  const [inspectingResource, setInspectingResource] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loadingChunks, setLoadingChunks] = useState(false);

  useEffect(() => {
    if (selectedCourse) {
      loadResources();
    }
  }, [selectedCourse]);

  const loadResources = async () => {
    if (!selectedCourse) return;
    try {
      setLoading(true);
      const res = await api.getCourseResources(selectedCourse.id);
      setResources(res?.items || []);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files) => {
    if (!selectedCourse || !files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await api.uploadResource(selectedCourse.id, file);
      }
      await loadResources();
    } catch (err) {
      setUploadError(err.message || 'File upload or extraction failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource and its extracted embeddings?')) return;
    try {
      await api.deleteResource(resourceId);
      if (inspectingResource?.id === resourceId) {
        setInspectingResource(null);
        setChunks([]);
      }
      await loadResources();
    } catch (err) {
      alert('Failed to delete resource: ' + err.message);
    }
  };

  const handleProcessResource = async (resourceId) => {
    try {
      await api.processResource(resourceId);
      await loadResources();
    } catch (err) {
      alert('Failed to process text: ' + err.message);
    }
  };

  const handleInspectChunks = async (resource) => {
    setInspectingResource(resource);
    setLoadingChunks(true);
    try {
      const res = await api.getResourceChunks(resource.id, 50);
      setChunks(res?.items || []);
    } catch (err) {
      console.error('Error fetching chunks:', err);
    } finally {
      setLoadingChunks(false);
    }
  };

  if (!selectedCourse) {
    return (
      <div style={styles.emptyContainer}>
        <div style={styles.emptyCard} className="glass-panel">
          <Layers size={40} color="var(--violet-light)" />
          <h3>No Course Selected</h3>
          <p>Please select or create a course from the sidebar to manage its knowledge base.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner / Upload Section */}
      <div style={styles.topSection}>
        <div>
          <div className="badge badge-violet" style={{ marginBottom: 8 }}>MULTIMODAL INGESTION PIPELINE</div>
          <h2 style={styles.pageTitle}>Knowledge Base & Course Materials</h2>
          <p style={styles.pageSubtitle}>
            Ground Cognify AI with lecture slides, PDF textbooks, research papers, and video lectures.
          </p>
        </div>

        <button
          onClick={loadResources}
          className="btn btn-secondary"
          style={{ fontSize: '0.82rem' }}
          title="Refresh resources"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {uploadError && (
        <div style={styles.errorBanner}>
          <AlertCircle size={16} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Drag & Drop Upload Zone */}
      <div
        style={{
          ...styles.dropZone,
          ...(dragActive ? styles.dropZoneActive : {}),
        }}
        onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (e.dataTransfer.files) handleFileUpload(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          id="kb-file-input"
          multiple
          accept=".pdf,.pptx,.ppt,.mp4,.mov,.mkv,.wav,.mp3"
          onChange={(e) => {
            if (e.target.files) handleFileUpload(e.target.files);
          }}
          style={{ display: 'none' }}
        />
        <label htmlFor="kb-file-input" style={styles.dropZoneLabel}>
          <div style={styles.uploadIconBadge}>
            <UploadCloud size={28} color="var(--cyan-light)" />
          </div>
          <div style={styles.uploadInstructions}>
            <span style={styles.uploadPrimary}>
              {uploading ? 'Processing & extracting multimodal content...' : 'Click to browse or drag and drop course files'}
            </span>
            <span style={styles.uploadSecondary}>
              Supports PDF documents, PPTX slides, MP4/MKV lecture videos, and audio (Auto-transcribed & embedded)
            </span>
          </div>
          {uploading ? (
            <div className="spin" style={styles.spinner} />
          ) : (
            <span className="btn btn-cyan" style={{ fontSize: '0.82rem' }}>
              Select Materials
            </span>
          )}
        </label>
      </div>

      {/* Main Content Layout: Resource List + Chunk Inspection Drawer */}
      <div style={styles.mainGrid}>
        {/* Resources Table / Cards */}
        <div style={styles.resourcesContainer} className="glass-panel">
          <div style={styles.tableHeader}>
            <h3 style={styles.sectionTitle}>
              Ingested Materials ({resources.length})
            </h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-subtle)' }}>
              Processed by Gemini Multimodal & all-MiniLM-L6-v2
            </span>
          </div>

          {loading ? (
            <div style={styles.loadingBox}>
              <div className="spin" style={styles.spinner} />
              <p>Loading course resources...</p>
            </div>
          ) : resources.length === 0 ? (
            <div style={styles.emptyState}>
              <FileCheck2 size={36} color="var(--text-subtle)" />
              <p>No learning materials uploaded yet for this course.</p>
              <label htmlFor="kb-file-input" className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                Upload First File
              </label>
            </div>
          ) : (
            <div style={styles.resourceList}>
              {resources.map((res) => {
                const isVideo = res.resource_type === 'video';
                const isProcessed = res.processing_status === 'completed';
                const isFailed = res.processing_status === 'failed';
                const isSelected = inspectingResource?.id === res.id;

                return (
                  <div
                    key={res.id}
                    style={{
                      ...styles.resourceCard,
                      ...(isSelected ? styles.resourceCardSelected : {}),
                    }}
                  >
                    <div style={styles.resourceLeft}>
                      <div
                        style={{
                          ...styles.resourceTypeIcon,
                          background: isVideo ? 'rgba(6, 182, 212, 0.15)' : 'rgba(139, 92, 246, 0.15)',
                        }}
                      >
                        {isVideo ? (
                          <Video size={20} color="var(--cyan-light)" />
                        ) : (
                          <FileText size={20} color="var(--violet-light)" />
                        )}
                      </div>
                      <div style={styles.resourceInfo}>
                        <div style={styles.resourceTitleRow}>
                          <span style={styles.resourceFilename}>{res.filename}</span>
                          <span
                            className={`badge ${
                              isProcessed
                                ? 'badge-emerald'
                                : isFailed
                                ? 'badge-amber'
                                : 'badge-violet'
                            }`}
                          >
                            {res.processing_status}
                          </span>
                        </div>
                        <div style={styles.resourceMetaRow}>
                          <span>Type: {res.resource_type}</span>
                          <span>•</span>
                          <span>Uploaded: {new Date(res.created_at).toLocaleDateString()}</span>
                          {res.error_details && (
                            <>
                              <span>•</span>
                              <span style={{ color: '#f43f5e' }}>{res.error_details}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={styles.resourceActions}>
                      <button
                        onClick={() => handleInspectChunks(res)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                        title="View Extracted Chunks & Grounding"
                      >
                        <Eye size={14} />
                        <span>Inspect Chunks</span>
                      </button>

                      {res.processing_status !== 'completed' && (
                        <button
                          onClick={() => handleProcessResource(res.id)}
                          className="btn btn-cyan"
                          style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                          title="Trigger extraction"
                        >
                          <Play size={14} />
                          <span>Process</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(res.id)}
                        style={styles.deleteBtn}
                        title="Delete Resource"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chunks Inspector Panel */}
        {inspectingResource && (
          <div style={styles.chunksInspector} className="glass-panel animate-fade-in">
            <div style={styles.inspectorHeader}>
              <div>
                <div className="badge badge-cyan" style={{ marginBottom: 4 }}>CHUNK EMBEDDING INSPECTOR</div>
                <h4 style={styles.inspectorTitle}>{inspectingResource.filename}</h4>
              </div>
              <button
                onClick={() => setInspectingResource(null)}
                style={styles.closeInspectorBtn}
              >
                ✕
              </button>
            </div>

            <div style={styles.inspectorBody}>
              {loadingChunks ? (
                <div style={styles.loadingBox}>
                  <div className="spin" style={styles.spinner} />
                  <p>Fetching chunk breakdown from Postgres...</p>
                </div>
              ) : chunks.length === 0 ? (
                <div style={styles.emptyState}>
                  <p>No text chunks generated yet for this resource.</p>
                </div>
              ) : (
                <div style={styles.chunkStream}>
                  <div style={styles.chunkCountBar}>
                    <span>{chunks.length} extracted semantic chunks indexed in Qdrant</span>
                  </div>
                  {chunks.map((chk, i) => (
                    <div key={chk.id || i} style={styles.chunkItem}>
                      <div style={styles.chunkItemHeader}>
                        <span className="badge badge-violet">Chunk #{chk.chunk_index}</span>
                        {chk.start_page !== null && chk.start_page !== undefined && (
                          <span className="badge badge-cyan">Page {chk.start_page}</span>
                        )}
                        {chk.start_time !== null && chk.start_time !== undefined && (
                          <span className="badge badge-cyan">
                            <Clock size={10} style={{ marginRight: 2 }} />
                            {Math.floor(chk.start_time)}s
                          </span>
                        )}
                        <span style={styles.chunkId}>{chk.id.slice(0, 8)}...</span>
                      </div>
                      <p style={styles.chunkText}>{chk.text}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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
  topSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  pageTitle: {
    fontSize: '1.6rem',
    fontWeight: 800,
    color: '#ffffff',
  },
  pageSubtitle: {
    fontSize: '0.86rem',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  dropZone: {
    border: '2px dashed var(--border-medium)',
    borderRadius: '16px',
    backgroundColor: 'rgba(15, 21, 39, 0.4)',
    backdropFilter: 'blur(10px)',
    transition: 'all var(--transition-normal)',
    cursor: 'pointer',
  },
  dropZoneActive: {
    borderColor: 'var(--cyan-primary)',
    backgroundColor: 'rgba(6, 182, 212, 0.08)',
  },
  dropZoneLabel: {
    padding: '32px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    cursor: 'pointer',
    width: '100%',
  },
  uploadIconBadge: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    backgroundColor: 'rgba(6, 182, 212, 0.15)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  uploadInstructions: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  uploadPrimary: {
    fontSize: '0.98rem',
    fontWeight: 700,
    color: '#ffffff',
  },
  uploadSecondary: {
    fontSize: '0.78rem',
    color: 'var(--text-subtle)',
  },
  errorBanner: {
    padding: '12px 16px',
    borderRadius: '10px',
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: '#fda4af',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '0.85rem',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr',
    gap: '20px',
  },
  resourcesContainer: {
    padding: '24px',
  },
  tableHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '1.05rem',
    fontWeight: 700,
  },
  resourceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  resourceCard: {
    padding: '14px 18px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    transition: 'all 0.15s ease',
  },
  resourceCardSelected: {
    borderColor: 'var(--cyan-primary)',
    backgroundColor: 'rgba(6, 182, 212, 0.05)',
  },
  resourceLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flex: 1,
    overflow: 'hidden',
  },
  resourceTypeIcon: {
    width: '42px',
    height: '42px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  resourceInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'hidden',
  },
  resourceTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  resourceFilename: {
    fontSize: '0.9rem',
    fontWeight: 600,
    color: '#ffffff',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  resourceMetaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '0.74rem',
    color: 'var(--text-subtle)',
  },
  resourceActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-subtle)',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.15s',
  },
  chunksInspector: {
    padding: '20px',
    border: '1px solid rgba(6, 182, 212, 0.3)',
  },
  inspectorHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '12px',
  },
  inspectorTitle: {
    fontSize: '0.98rem',
    fontWeight: 700,
  },
  closeInspectorBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-subtle)',
    cursor: 'pointer',
    fontSize: '1rem',
  },
  inspectorBody: {
    maxHeight: '400px',
    overflowY: 'auto',
  },
  chunkStream: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  chunkCountBar: {
    fontSize: '0.78rem',
    color: 'var(--cyan-light)',
    fontWeight: 600,
    padding: '6px 0',
  },
  chunkItem: {
    padding: '12px 14px',
    borderRadius: '10px',
    backgroundColor: 'rgba(13, 19, 36, 0.8)',
    border: '1px solid var(--border-subtle)',
  },
  chunkItemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  chunkId: {
    marginLeft: 'auto',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.68rem',
    color: 'var(--text-subtle)',
  },
  chunkText: {
    fontSize: '0.82rem',
    color: 'var(--text-main)',
    lineHeight: 1.5,
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
  emptyState: {
    padding: '36px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-muted)',
    fontSize: '0.85rem',
  },
  loadingBox: {
    padding: '36px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: 'var(--text-muted)',
  },
  spinner: {
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    border: '3px solid rgba(6, 182, 212, 0.2)',
    borderTopColor: 'var(--cyan-primary)',
  },
};
