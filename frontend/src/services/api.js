// Centralized API Client for Cognify AI Backend
const API_BASE = '/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('cognify_token') || null;
    this.user = JSON.parse(localStorage.getItem('cognify_user') || 'null');
  }

  setToken(token, user = null) {
    this.token = token;
    if (token) {
      localStorage.setItem('cognify_token', token);
    } else {
      localStorage.removeItem('cognify_token');
    }

    if (user) {
      this.user = user;
      localStorage.setItem('cognify_user', JSON.stringify(user));
    } else if (!token) {
      this.user = null;
      localStorage.removeItem('cognify_user');
    }
  }

  getHeaders(isMultipart = false) {
    const headers = {};
    if (!isMultipart) {
      headers['Content-Type'] = 'application/json';
    }
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request(endpoint, options = {}) {
    const isMultipart = options.body instanceof FormData;
    const headers = { ...this.getHeaders(isMultipart), ...(options.headers || {}) };
    
    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        // Clear token on 401 unauthorized
        this.setToken(null);
        window.dispatchEvent(new CustomEvent('cognify_auth_change'));
      }

      if (response.status === 204) {
        return null;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        let errorMsg = `API Request failed with status ${response.status}`;
        if (typeof data?.detail === 'string') {
          errorMsg = data.detail;
        } else if (Array.isArray(data?.detail)) {
          errorMsg = data.detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
        } else if (data?.message) {
          errorMsg = data.message;
        }
        throw new Error(errorMsg);
      }

      return data;
    } catch (err) {
      console.error(`API Error on [${options.method || 'GET'}] ${endpoint}:`, err);
      throw err;
    }
  }

  // --- Auth Endpoints ---
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.access_token);
    const me = await this.getMe();
    this.setToken(data.access_token, me);
    return { token: data.access_token, user: me };
  }

  async register(email, password, fullName = 'Demo Learner') {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName }),
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // --- Courses Endpoints ---
  async getCourses(limit = 50, offset = 0) {
    return this.request(`/courses?limit=${limit}&offset=${offset}`);
  }

  async getCourse(courseId) {
    return this.request(`/courses/${courseId}`);
  }

  async createCourse(title, description = '') {
    return this.request('/courses', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    });
  }

  async updateCourse(courseId, payload) {
    return this.request(`/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteCourse(courseId) {
    return this.request(`/courses/${courseId}`, {
      method: 'DELETE',
    });
  }

  // --- Resources Endpoints ---
  async getCourseResources(courseId, limit = 50, offset = 0) {
    return this.request(`/courses/${courseId}/resources?limit=${limit}&offset=${offset}`);
  }

  async uploadResource(courseId, file) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request(`/courses/${courseId}/resources`, {
      method: 'POST',
      body: formData,
    });
  }

  async getResource(resourceId) {
    return this.request(`/resources/${resourceId}`);
  }

  async getResourceStatus(resourceId) {
    return this.request(`/resources/${resourceId}/processing-status`);
  }

  async getResourceChunks(resourceId, limit = 20, offset = 0) {
    return this.request(`/resources/${resourceId}/chunks?limit=${limit}&offset=${offset}`);
  }

  async getResourcePages(resourceId, limit = 20, offset = 0) {
    return this.request(`/resources/${resourceId}/pages?limit=${limit}&offset=${offset}`);
  }

  async processResource(resourceId) {
    return this.request(`/resources/${resourceId}/process`, {
      method: 'POST',
    });
  }

  async deleteResource(resourceId) {
    return this.request(`/resources/${resourceId}`, {
      method: 'DELETE',
    });
  }

  // --- AI Tutor / Chat Endpoints ---
  async chatWithCourse(courseId, question, sourceOnly = true, limit = 5) {
    return this.request(`/courses/${courseId}/chat?limit=${limit}`, {
      method: 'POST',
      body: JSON.stringify({
        question,
        source_only: sourceOnly,
      }),
    });
  }

  // --- Semantic Search Endpoints ---
  async searchCourse(courseId, query, limit = 5) {
    return this.request(`/courses/${courseId}/search?limit=${limit}`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }

  // --- Knowledge Map & Topics Endpoints ---
  async getKnowledgeMapStatus(courseId) {
    return this.request(`/courses/${courseId}/knowledge-map/status`);
  }

  async buildKnowledgeMap(courseId) {
    return this.request(`/courses/${courseId}/knowledge-map/build`, {
      method: 'POST',
    });
  }

  async getKnowledgeMap(courseId) {
    return this.request(`/courses/${courseId}/knowledge-map`);
  }

  async getTopic(courseId, topicId) {
    return this.request(`/courses/${courseId}/topics/${topicId}`);
  }

  // --- Health Endpoints ---
  async checkHealth() {
    return this.request('/health');
  }
}

export const api = new ApiClient();
