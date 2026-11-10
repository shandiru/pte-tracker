/**
 * Unified API Client with PIN support and error handling
 */

const PIN_STORAGE_KEY = 'pte_tracker_app_pin';

export function getStoredPin(): string {
  return localStorage.getItem(PIN_STORAGE_KEY) || '';
}

export function setStoredPin(pin: string): void {
  localStorage.setItem(PIN_STORAGE_KEY, pin.trim());
}

export function clearStoredPin(): void {
  localStorage.removeItem(PIN_STORAGE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const pin = getStoredPin();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (pin) {
    headers.set('x-app-pin', pin);
  }

  const rawBase = (import.meta.env.VITE_API_URL || '').trim();
  const apiBase = rawBase.replace(/\/+$/, '');
  const url = endpoint.startsWith('http') ? endpoint : `${apiBase}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('pte_auth_required'));
    throw new ApiError('Unauthorized: PIN required or invalid', 401);
  }

  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.error) errMsg = data.error;
    } catch {
      // ignore json parse error
    }
    throw new ApiError(errMsg, response.status);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  getAuthStatus: () => request<{ pinRequired: boolean }>('/api/auth/status'),
  verifyPin: (pin: string) =>
    request<{ success: boolean; message?: string }>('/api/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    }),

  // Meta
  getToday: () => request<{ today: string; timezone: string }>('/api/today'),

  // Settings
  getSettings: () => request<import('../types/index.js').ISettings>('/api/settings'),
  updateSettings: (data: Partial<import('../types/index.js').ISettings>) =>
    request<import('../types/index.js').ISettings>('/api/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Roadmap
  getRoadmap: () => request<import('../types/index.js').IRoadmapWeek[]>('/api/roadmap'),
  updateTopic: (weekId: string, topicId: string, updates: { done?: boolean; text?: string }) =>
    request<import('../types/index.js').IRoadmapWeek>(
      `/api/roadmap/${weekId}/topics/${topicId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }
    ),
  addTopic: (weekId: string, text: string) =>
    request<import('../types/index.js').IRoadmapWeek>(`/api/roadmap/${weekId}/topics`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  deleteTopic: (weekId: string, topicId: string) =>
    request<import('../types/index.js').IRoadmapWeek>(
      `/api/roadmap/${weekId}/topics/${topicId}`,
      {
        method: 'DELETE',
      }
    ),
  shiftRoadmap: (startWeekNo: number | string, days: number) =>
    request<import('../types/index.js').IRoadmapWeek[]>('/api/roadmap/shift', {
      method: 'POST',
      body: JSON.stringify({ startWeekNo, days }),
    }),

  // Logs
  getLogs: (from?: string, to?: string) => {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const qs = params.toString();
    return request<import('../types/index.js').IDailyLog[]>(`/api/logs${qs ? `?${qs}` : ''}`);
  },
  getLogByDate: (date: string) =>
    request<import('../types/index.js').IDailyLog>(`/api/logs/${date}`),
  upsertLog: (date: string, logData: Partial<import('../types/index.js').IDailyLog>) =>
    request<import('../types/index.js').IDailyLog>(`/api/logs/${date}`, {
      method: 'PUT',
      body: JSON.stringify(logData),
    }),
  deleteLog: (date: string) =>
    request<{ success: boolean }>(`/api/logs/${date}`, {
      method: 'DELETE',
    }),

  // Notes
  getNotes: (filters?: { skill?: string; tag?: string; pinned?: boolean; search?: string }) => {
    const params = new URLSearchParams();
    if (filters?.skill) params.set('skill', filters.skill);
    if (filters?.tag) params.set('tag', filters.tag);
    if (typeof filters?.pinned === 'boolean') params.set('pinned', String(filters.pinned));
    if (filters?.search) params.set('search', filters.search);
    const qs = params.toString();
    return request<import('../types/index.js').INote[]>(`/api/notes${qs ? `?${qs}` : ''}`);
  },
  addNote: (note: {
    date?: string;
    title?: string;
    body: string;
    skill?: string;
    tags?: string[];
    pinned?: boolean;
  }) =>
    request<import('../types/index.js').INote>('/api/notes', {
      method: 'POST',
      body: JSON.stringify(note),
    }),
  updateNote: (id: string, updates: Partial<import('../types/index.js').INote>) =>
    request<import('../types/index.js').INote>(`/api/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteNote: (id: string) =>
    request<{ success: boolean }>(`/api/notes/${id}`, {
      method: 'DELETE',
    }),

  // Mock Scores
  getMocks: () => request<import('../types/index.js').IMockScore[]>('/api/mocks'),
  addMock: (mock: Omit<import('../types/index.js').IMockScore, '_id'>) =>
    request<import('../types/index.js').IMockScore>('/api/mocks', {
      method: 'POST',
      body: JSON.stringify(mock),
    }),
  updateMock: (id: string, updates: Partial<import('../types/index.js').IMockScore>) =>
    request<import('../types/index.js').IMockScore>(`/api/mocks/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteMock: (id: string) =>
    request<{ success: boolean }>(`/api/mocks/${id}`, {
      method: 'DELETE',
    }),

  // Analytics
  getAnalyticsSummary: () =>
    request<import('../types/index.js').IAnalyticsSummary>('/api/analytics/summary'),

  // History
  getActivity: (filters?: { kind?: string; from?: string; to?: string }) => {
    const params = new URLSearchParams();
    if (filters?.kind) params.set('kind', filters.kind);
    if (filters?.from) params.set('from', filters.from);
    if (filters?.to) params.set('to', filters.to);
    const qs = params.toString();
    return request<import('../types/index.js').IActivity[]>(`/api/activity${qs ? `?${qs}` : ''}`);
  },

  // Export / Import / Reset
  getExportUrl: () => {
    const rawBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const pin = getStoredPin();
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${rawBase}/api/export${query}`;
  },
  getExportMarkdownUrl: () => {
    const rawBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const pin = getStoredPin();
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${rawBase}/api/export/markdown${query}`;
  },
  getDownloadZipUrl: () => {
    const rawBase = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
    const pin = getStoredPin();
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : '';
    return `${rawBase}/api/download-zip${query}`;
  },
  importData: (data: unknown) =>
    request<{ success: boolean; message: string }>('/api/import', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resetDatabase: () =>
    request<{ success: boolean; message: string }>('/api/reset', {
      method: 'POST',
    }),
};
