import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from './components/Navbar.jsx';
import { PinModal } from './components/PinModal.jsx';
import { TodayPage } from './pages/TodayPage.jsx';
import { RoadmapPage } from './pages/RoadmapPage.jsx';
import { LogsPage } from './pages/LogsPage.jsx';
import { NotesPage } from './pages/NotesPage.jsx';
import { MocksPage } from './pages/MocksPage.jsx';
import { AnalyticsPage } from './pages/AnalyticsPage.jsx';
import { HistoryPage } from './pages/HistoryPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';
import { api, getStoredPin } from "./lib/api.js";
export default function App() {
  const [pinModalOpen, setPinModalOpen] = useState(false);
  useEffect(() => {
    async function checkAuth() {
      try {
        const { pinRequired } = await api.getAuthStatus();
        if (pinRequired && !getStoredPin()) {
          setPinModalOpen(true);
        }
      } catch {
      }
    }
    checkAuth();
    const handleAuthRequired = () => {
      setPinModalOpen(true);
    };
    window.addEventListener("pte_auth_required", handleAuthRequired);
    return () => {
      window.removeEventListener("pte_auth_required", handleAuthRequired);
    };
  }, []);
  return <BrowserRouter>
      <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 font-sans selection:bg-indigo-500 selection:text-white">
        <Navbar />

        <main className="flex-1 pb-16">
          <Routes>
            <Route path="/" element={<TodayPage />} />
            <Route path="/roadmap" element={<RoadmapPage />} />
            <Route path="/logs" element={<LogsPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/mocks" element={<MocksPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>

        <footer className="border-t border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900 py-4 px-4 sm:px-6 text-center text-xs text-neutral-500 dark:text-neutral-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>PTE Academic Prep Tracker &bull; Timezone: Asia/Colombo</span>
            <span>Target: 58 min / 70 stretch &bull; Exam: Mar 30 – Apr 5, 2027</span>
          </div>
        </footer>

        <PinModal
    isOpen={pinModalOpen}
    onSuccess={() => {
      setPinModalOpen(false);
      window.location.reload();
    }}
  />
      </div>
    </BrowserRouter>;
}
