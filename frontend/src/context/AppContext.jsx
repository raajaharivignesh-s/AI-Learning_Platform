import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(() => api.user);
  const [token, setToken] = useState(() => api.token);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [backendOnline, setBackendOnline] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(false);
  
  // Inspection modal state for citations
  const [citationViewer, setCitationViewer] = useState({
    isOpen: false,
    citation: null,
    resource: null,
    chunk: null,
  });

  // Check user authentication & backend health on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const health = await api.checkHealth().catch(() => null);
        setBackendOnline(health?.status === 'ok');

        if (api.token) {
          const me = await api.getMe();
          setUser(me);
          api.setToken(api.token, me);
          loadCourses();
        }
      } catch (err) {
        console.warn('Initial session check failed:', err);
        if (api.token) {
          api.setToken(null);
          setUser(null);
          setToken(null);
        }
      }
    };

    const handleAuthChange = () => {
      setUser(null);
      setToken(null);
      setCourses([]);
      setSelectedCourse(null);
    };

    window.addEventListener('cognify_auth_change', handleAuthChange);
    initAuth();

    return () => window.removeEventListener('cognify_auth_change', handleAuthChange);
  }, []);

  const loadCourses = async () => {
    if (!api.token) return;
    try {
      setLoadingCourses(true);
      const res = await api.getCourses();
      const items = res?.items || [];
      setCourses(items);
      if (items.length > 0 && !selectedCourse) {
        setSelectedCourse(items[0]);
      } else if (selectedCourse) {
        const updated = items.find((c) => c.id === selectedCourse.id);
        if (updated) setSelectedCourse(updated);
      }
    } catch (err) {
      console.error('Error loading courses:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  const loginUser = async (email, password) => {
    const res = await api.login(email, password);
    setToken(res.token);
    setUser(res.user);
    await loadCourses();
    return res;
  };

  const logoutUser = () => {
    api.setToken(null);
    setUser(null);
    setToken(null);
    setCourses([]);
    setSelectedCourse(null);
  };

  const openCitation = async (citation) => {
    setCitationViewer({
      isOpen: true,
      citation,
      resource: null,
      chunk: null,
      loading: true,
    });

    try {
      const resource = await api.getResource(citation.resource_id).catch(() => null);
      let chunk = null;
      if (citation.chunk_id) {
        // Fetch chunks for detail
        const chunksRes = await api.getResourceChunks(citation.resource_id, 50).catch(() => null);
        if (chunksRes?.items) {
          chunk = chunksRes.items.find((c) => c.id === citation.chunk_id);
        }
      }

      setCitationViewer({
        isOpen: true,
        citation,
        resource,
        chunk,
        loading: false,
      });
    } catch (err) {
      console.error('Error fetching citation preview:', err);
      setCitationViewer((prev) => ({ ...prev, loading: false }));
    }
  };

  const closeCitation = () => {
    setCitationViewer({
      isOpen: false,
      citation: null,
      resource: null,
      chunk: null,
      loading: false,
    });
  };

  return (
    <AppContext.Provider
      value={{
        user,
        token,
        backendOnline,
        courses,
        selectedCourse,
        setSelectedCourse,
        activeTab,
        setActiveTab,
        loadingCourses,
        loadCourses,
        loginUser,
        logoutUser,
        citationViewer,
        openCitation,
        closeCitation,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
