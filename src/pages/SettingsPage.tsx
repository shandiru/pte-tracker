import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
  Check,
  FileText,
  Lock,
} from 'lucide-react';
import { api, getStoredPin, setStoredPin, clearStoredPin } from '../lib/api.js';
import { ISettings } from '../types/index.js';

export function SettingsPage() {
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');

  // PIN settings state
  const [pinRequired, setPinRequired] = useState(false);
  const [currentPin, setCurrentPin] = useState(getStoredPin());
  const [pinNotice, setPinNotice] = useState('');

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importNotice, setImportNotice] = useState<{ isError: boolean; text: string } | null>(null);

  // Reset Double Confirmation state
  const [resetModalStep, setResetModalStep] = useState<0 | 1 | 2>(0);
  const [resetConfirmInput, setResetConfirmInput] = useState('');
  const [resetting, setResetting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sett, auth] = await Promise.all([
        api.getSettings(),
        api.getAuthStatus(),
      ]);
      setSettings(sett);
      setPinRequired(auth.pinRequired);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setSaveNotice('');
    try {
      const updated = await api.updateSettings({
        examDate: settings.examDate,
        bufferEndDate: settings.bufferEndDate,
        minScore: Number(settings.minScore),
        targetScore: Number(settings.targetScore),
        minSkillScore: Number(settings.minSkillScore),
        dailyGoalMinutes: Number(settings.dailyGoalMinutes),
      });
      setSettings(updated);
      setSaveNotice('Settings updated successfully.');
      setTimeout(() => setSaveNotice(''), 3000);
    } catch (err) {
      console.error('Failed to update settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredPin(currentPin);
    setPinNotice('Saved local app PIN.');
    setTimeout(() => setPinNotice(''), 3000);
  };

  const handleClearPin = () => {
    clearStoredPin();
    setCurrentPin('');
    setPinNotice('Cleared local PIN.');
    setTimeout(() => setPinNotice(''), 3000);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportNotice(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const res = await api.importData(parsed);
      setImportNotice({ isError: false, text: res.message || 'Data imported successfully' });
      await loadData();
    } catch (err) {
      setImportNotice({
        isError: true,
        text: `Import failed: ${(err as Error).message}`,
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmReset = async () => {
    if (resetConfirmInput.trim() !== 'RESET') return;
    setResetting(true);
    try {
      await api.resetDatabase();
      setResetModalStep(0);
      setResetConfirmInput('');
      await loadData();
      alert('Database has been reset to initial seed roadmap and default settings.');
    } catch (err) {
      alert(`Reset failed: ${(err as Error).message}`);
    } finally {
      setResetting(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="h-64 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Page Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Settings & Data Management
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Configure exam parameters, score thresholds, export backups, and reset options.
        </p>
      </div>

      {/* Target Parameters Form */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
        <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
          Exam & Score Targets
        </h2>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          All timeline computations, charts, and threshold warnings are based on these values.
        </p>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Exam Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={settings.examDate}
                onChange={(e) => setSettings({ ...settings, examDate: e.target.value })}
                required
                className="w-full px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Buffer End Date (YYYY-MM-DD)
              </label>
              <input
                type="date"
                value={settings.bufferEndDate}
                onChange={(e) => setSettings({ ...settings, bufferEndDate: e.target.value })}
                required
                className="w-full px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-1">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Min Score (Overall)
              </label>
              <input
                type="number"
                min="10"
                max="90"
                value={settings.minScore}
                onChange={(e) =>
                  setSettings({ ...settings, minScore: parseInt(e.target.value, 10) || 58 })
                }
                required
                className="w-full px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Target Score (Overall)
              </label>
              <input
                type="number"
                min="10"
                max="90"
                value={settings.targetScore}
                onChange={(e) =>
                  setSettings({ ...settings, targetScore: parseInt(e.target.value, 10) || 70 })
                }
                required
                className="w-full px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Min Skill Score
              </label>
              <input
                type="number"
                min="10"
                max="90"
                value={settings.minSkillScore}
                onChange={(e) =>
                  setSettings({ ...settings, minSkillScore: parseInt(e.target.value, 10) || 50 })
                }
                required
                className="w-full px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Daily Goal (Minutes)
              </label>
              <input
                type="number"
                min="15"
                max="720"
                value={settings.dailyGoalMinutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    dailyGoalMinutes: parseInt(e.target.value, 10) || 105,
                  })
                }
                required
                className="w-full px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800">
            {saveNotice && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5" />
                <span>{saveNotice}</span>
              </span>
            )}
            <div className="ml-auto">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* App PIN Management */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-1">
          <Lock className="w-4 h-4 text-indigo-500" />
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Access PIN Configuration
          </h2>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
          {pinRequired
            ? 'The backend server requires an APP_PIN. Your browser sends this pin in the x-app-pin header.'
            : 'No APP_PIN is currently enforced on the server. You can store one in your browser if enabled.'}
        </p>

        <form onSubmit={handleSavePin} className="flex flex-wrap items-center gap-3 text-xs">
          <input
            type="password"
            value={currentPin}
            onChange={(e) => setCurrentPin(e.target.value)}
            placeholder="Enter app PIN..."
            className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 w-48"
          />
          <button
            type="submit"
            className="px-3 py-1.5 rounded bg-neutral-800 dark:bg-neutral-700 text-white hover:bg-neutral-900 font-medium"
          >
            Store PIN
          </button>
          {currentPin && (
            <button
              type="button"
              onClick={handleClearPin}
              className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
            >
              Clear Stored PIN
            </button>
          )}
          {pinNotice && (
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {pinNotice}
            </span>
          )}
        </form>
      </div>

      {/* Backup & Export / Import */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs space-y-4">
        <div>
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
            Data Backup & Summary Export
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Export complete database JSON for safekeeping, generate Markdown progress reports, or restore from a backup.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Vercel Clean ZIP (JS Only) */}
          <a
            href={api.getDownloadZipUrl()}
            download="pte-tracker.zip"
            className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs"
          >
            <Download className="w-4 h-4" />
            <span>Download Vercel ZIP (backend + frontend)</span>
          </a>

          {/* JSON Export */}
          <a
            href={api.getExportUrl()}
            download="pte_tracker_backup.json"
            className="px-3.5 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4 text-indigo-500" />
            <span>Export JSON Backup</span>
          </a>

          {/* Markdown Export */}
          <a
            href={api.getExportMarkdownUrl()}
            download="pte_tracker_summary.md"
            className="px-3.5 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            <span>Export Markdown Summary</span>
          </a>

          {/* Import JSON */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="px-3.5 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Upload className="w-4 h-4 text-blue-500" />
            <span>{importing ? 'Importing...' : 'Import JSON Backup'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleImportFile}
            className="hidden"
          />
        </div>

        {importNotice && (
          <div
            className={`p-3 rounded text-xs ${
              importNotice.isError
                ? 'bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border border-red-200'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200'
            }`}
          >
            {importNotice.text}
          </div>
        )}
      </div>

      {/* Danger Zone: Database Reset */}
      <div className="border border-red-200 dark:border-red-900/60 bg-red-50/20 dark:bg-red-950/10 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-1">
          <AlertTriangle className="w-4 h-4" />
          <h2 className="text-base font-semibold">Danger Zone</h2>
        </div>
        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
          Resetting clears all daily study logs, notes, mock scores, and history, restoring the roadmap weeks to the original seed state.
        </p>

        <button
          type="button"
          onClick={() => setResetModalStep(1)}
          className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Database</span>
        </button>
      </div>

      {/* Double Confirmation Modal Step 1 */}
      {resetModalStep === 1 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-red-300 dark:border-red-800 bg-white dark:bg-neutral-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Step 1: Confirm Database Reset</span>
            </h3>
            <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mb-6">
              This will permanently delete all your logged study sessions, mock scores, notes, and activity history. Are you sure you wish to continue?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setResetModalStep(0)}
                className="px-3.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setResetModalStep(2)}
                className="px-4 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white font-medium"
              >
                Proceed to Step 2
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Double Confirmation Modal Step 2 */}
      {resetModalStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-lg border border-red-500 bg-white dark:bg-neutral-900 p-6 shadow-xl">
            <h3 className="text-base font-semibold text-red-600 dark:text-red-400 mb-2">
              Step 2: Type RESET to Confirm
            </h3>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-4">
              To prevent accidental deletion, please type <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">RESET</span> in capital letters into the field below:
            </p>
            <input
              type="text"
              value={resetConfirmInput}
              onChange={(e) => setResetConfirmInput(e.target.value)}
              placeholder="Type RESET"
              autoFocus
              className="w-full px-3 py-2 text-sm font-mono rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 mb-4 focus:ring-2 focus:ring-red-500 focus:outline-hidden"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setResetModalStep(0);
                  setResetConfirmInput('');
                }}
                className="px-3.5 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={resetting || resetConfirmInput.trim() !== 'RESET'}
                onClick={handleConfirmReset}
                className="px-4 py-1.5 text-xs rounded bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-40"
              >
                {resetting ? 'Resetting...' : 'Permanently Wipe and Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
