const PIN_STORAGE_KEY = "pte_tracker_app_pin";
export function getStoredPin() {
  return localStorage.getItem(PIN_STORAGE_KEY) || "";
}
export function setStoredPin(pin) {
  localStorage.setItem(PIN_STORAGE_KEY, pin.trim());
}
export function clearStoredPin() {
  localStorage.removeItem(PIN_STORAGE_KEY);
}
export class ApiError extends Error {
  status;
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}
async function request(endpoint, options = {}) {
  const pin = getStoredPin();
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (pin) {
    headers.set("x-app-pin", pin);
  }
  const rawBase = (import.meta.env.VITE_API_URL || "").trim();
  const apiBase = rawBase.replace(/\/+$/, "");
  const url = endpoint.startsWith("http") ? endpoint : `${apiBase}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent("pte_auth_required"));
    throw new ApiError("Unauthorized: PIN required or invalid", 401);
  }
  if (!response.ok) {
    let errMsg = `Request failed: ${response.statusText}`;
    try {
      const data = await response.json();
      if (data.error) errMsg = data.error;
    } catch {
    }
    throw new ApiError(errMsg, response.status);
  }
  return response.json();
}
export const api = {
  // Auth
  getAuthStatus: () => request("/api/auth/status"),
  verifyPin: (pin) => request("/api/auth/verify", {
    method: "POST",
    body: JSON.stringify({ pin })
  }),
  // Meta
  getToday: () => request("/api/today"),
  // Settings
  getSettings: () => request("/api/settings"),
  updateSettings: (data) => request("/api/settings", {
    method: "PUT",
    body: JSON.stringify(data)
  }),
  // Roadmap
  getRoadmap: () => request("/api/roadmap"),
  updateTopic: (weekId, topicId, updates) => request(
    `/api/roadmap/${weekId}/topics/${topicId}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates)
    }
  ),
  addTopic: (weekId, text) => request(`/api/roadmap/${weekId}/topics`, {
    method: "POST",
    body: JSON.stringify({ text })
  }),
  deleteTopic: (weekId, topicId) => request(
    `/api/roadmap/${weekId}/topics/${topicId}`,
    {
      method: "DELETE"
    }
  ),
  shiftRoadmap: (startWeekNo, days) => request("/api/roadmap/shift", {
    method: "POST",
    body: JSON.stringify({ startWeekNo, days })
  }),
  // Logs
  getLogs: (from, to) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return request(`/api/logs${qs ? `?${qs}` : ""}`);
  },
  getLogByDate: (date) => request(`/api/logs/${date}`),
  upsertLog: (date, logData) => request(`/api/logs/${date}`, {
    method: "PUT",
    body: JSON.stringify(logData)
  }),
  deleteLog: (date) => request(`/api/logs/${date}`, {
    method: "DELETE"
  }),
  // Notes
  getNotes: (filters) => {
    const params = new URLSearchParams();
    if (filters?.skill) params.set("skill", filters.skill);
    if (filters?.tag) params.set("tag", filters.tag);
    if (typeof filters?.pinned === "boolean") params.set("pinned", String(filters.pinned));
    if (filters?.search) params.set("search", filters.search);
    const qs = params.toString();
    return request(`/api/notes${qs ? `?${qs}` : ""}`);
  },
  addNote: (note) => request("/api/notes", {
    method: "POST",
    body: JSON.stringify(note)
  }),
  updateNote: (id, updates) => request(`/api/notes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  }),
  deleteNote: (id) => request(`/api/notes/${id}`, {
    method: "DELETE"
  }),
  // Mock Scores
  getMocks: () => request("/api/mocks"),
  addMock: (mock) => request("/api/mocks", {
    method: "POST",
    body: JSON.stringify(mock)
  }),
  updateMock: (id, updates) => request(`/api/mocks/${id}`, {
    method: "PATCH",
    body: JSON.stringify(updates)
  }),
  deleteMock: (id) => request(`/api/mocks/${id}`, {
    method: "DELETE"
  }),
  // Analytics
  getAnalyticsSummary: () => request("/api/analytics/summary"),
  // History
  getActivity: (filters) => {
    const params = new URLSearchParams();
    if (filters?.kind) params.set("kind", filters.kind);
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    const qs = params.toString();
    return request(`/api/activity${qs ? `?${qs}` : ""}`);
  },
  // Export / Import / Reset
  getExportUrl: () => {
    const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
    const pin = getStoredPin();
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : "";
    return `${rawBase}/api/export${query}`;
  },
  getExportMarkdownUrl: () => {
    const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
    const pin = getStoredPin();
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : "";
    return `${rawBase}/api/export/markdown${query}`;
  },
  getDownloadZipUrl: () => {
    const rawBase = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
    const pin = getStoredPin();
    const query = pin ? `?pin=${encodeURIComponent(pin)}` : "";
    return `${rawBase}/api/download-zip${query}`;
  },
  importData: (data) => request("/api/import", {
    method: "POST",
    body: JSON.stringify(data)
  }),
  resetDatabase: () => request("/api/reset", {
    method: "POST"
  })
};
