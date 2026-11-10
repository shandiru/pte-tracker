import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Award,
  AlertTriangle,
  X,
  TrendingUp,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { api } from '../lib/api.js';
import { getTodayColombo, formatReadableDate, formatShortDate } from '../lib/dateUtils.js';
import { IMockScore, MockType, ISettings } from '../types/index.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export function MocksPage() {
  const today = getTodayColombo();
  const [mocks, setMocks] = useState<IMockScore[]>([]);
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMockId, setEditingMockId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(today);
  const [formType, setFormType] = useState<MockType>('mock');
  const [formLabel, setFormLabel] = useState('');
  const [formOverall, setFormOverall] = useState(58);
  const [formSpeaking, setFormSpeaking] = useState(58);
  const [formWriting, setFormWriting] = useState(58);
  const [formReading, setFormReading] = useState(58);
  const [formListening, setFormListening] = useState(58);
  const [formNotes, setFormNotes] = useState('');
  const [savingMock, setSavingMock] = useState(false);

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; label: string }>({
    isOpen: false,
    id: '',
    label: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [mockList, sett] = await Promise.all([
        api.getMocks(),
        api.getSettings(),
      ]);
      setMocks(mockList);
      setSettings(sett);
    } catch (err) {
      console.error('Failed to load mock scores:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const minScore = settings?.minScore || 58;
  const targetScore = settings?.targetScore || 70;
  const minSkillScore = settings?.minSkillScore || 50;

  const openAddModal = () => {
    setEditingMockId(null);
    setFormDate(today);
    setFormType('mock');
    setFormLabel(`Mock ${mocks.length + 1}`);
    setFormOverall(60);
    setFormSpeaking(60);
    setFormWriting(60);
    setFormReading(60);
    setFormListening(60);
    setFormNotes('');
    setModalOpen(true);
  };

  const openEditModal = (mock: IMockScore) => {
    setEditingMockId(mock._id);
    setFormDate(mock.date);
    setFormType(mock.type);
    setFormLabel(mock.label);
    setFormOverall(mock.overall);
    setFormSpeaking(mock.speaking);
    setFormWriting(mock.writing);
    setFormReading(mock.reading);
    setFormListening(mock.listening);
    setFormNotes(mock.notes || '');
    setModalOpen(true);
  };

  const handleSaveMock = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMock(true);
    try {
      if (editingMockId) {
        await api.updateMock(editingMockId, {
          date: formDate,
          type: formType,
          label: formLabel.trim(),
          overall: Number(formOverall),
          speaking: Number(formSpeaking),
          writing: Number(formWriting),
          reading: Number(formReading),
          listening: Number(formListening),
          notes: formNotes.trim(),
        });
      } else {
        await api.addMock({
          date: formDate,
          type: formType,
          label: formLabel.trim(),
          overall: Number(formOverall),
          speaking: Number(formSpeaking),
          writing: Number(formWriting),
          reading: Number(formReading),
          listening: Number(formListening),
          notes: formNotes.trim(),
        });
      }
      setModalOpen(false);
      await loadData();
    } catch (err) {
      console.error('Failed to save mock score:', err);
    } finally {
      setSavingMock(false);
    }
  };

  const confirmDeleteMock = async () => {
    try {
      await api.deleteMock(deleteModal.id);
      await loadData();
    } catch (err) {
      console.error('Failed to delete mock score:', err);
    } finally {
      setDeleteModal({ isOpen: false, id: '', label: '' });
    }
  };

  // Warning checks for scores below threshold
  const getScoreWarnings = (mock: IMockScore): string[] => {
    const warnings: string[] = [];
    if (mock.overall < minScore) {
      warnings.push(`Warning: Overall score (${mock.overall}) is below minimum target (${minScore})`);
    }
    const skills = [
      { name: 'Speaking', val: mock.speaking },
      { name: 'Writing', val: mock.writing },
      { name: 'Reading', val: mock.reading },
      { name: 'Listening', val: mock.listening },
    ];
    for (const s of skills) {
      if (s.val < minSkillScore) {
        warnings.push(`Warning: ${s.name} score (${s.val}) is below minimum skill target (${minSkillScore})`);
      }
    }
    return warnings;
  };

  // Chart data sorted by date asc
  const chartData = useMemo(() => {
    return [...mocks]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        date: m.date,
        shortDate: formatShortDate(m.date),
        label: m.label,
        overall: m.overall,
        speaking: m.speaking,
        writing: m.writing,
        reading: m.reading,
        listening: m.listening,
      }));
  }, [mocks]);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Mock Test Scores
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Log diagnostic, checkpoint, and full mock scores. Track progression against the {minScore} minimum and {targetScore} stretch targets.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="px-3.5 py-2 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors flex items-center justify-center gap-1.5 shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Add Mock Score</span>
        </button>
      </div>

      {/* Target Reference Banner */}
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-neutral-400 block mb-0.5">Dec 7 Checkpoint</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">Baseline + 5</span>
        </div>
        <div>
          <span className="text-neutral-400 block mb-0.5">Jan 17 Mock 1</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">50–55</span>
        </div>
        <div>
          <span className="text-neutral-400 block mb-0.5">Feb 28 Mock 2</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">60–65</span>
        </div>
        <div>
          <span className="text-neutral-400 block mb-0.5">Mar 29 Mock 6</span>
          <span className="font-semibold text-neutral-800 dark:text-neutral-200">68–72</span>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overall Score Trend Chart */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-indigo-600" />
                <span>Overall Score Over Time</span>
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                Min: {minScore} | Target: {targetScore}
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-md">
                <span>No mock scores recorded yet.</span>
                <span className="mt-1">Add your diagnostic mock to see the trend line.</span>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="shortDate" textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis domain={[10, 90]} ticks={[20, 40, 50, 58, 70, 90]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val ?? 0} / 90`, 'Overall Score']}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <ReferenceLine
                      y={minScore}
                      stroke="#dc2626"
                      strokeDasharray="4 4"
                      label={{ value: `Min: ${minScore}`, fill: '#dc2626', fontSize: 11, position: 'right' }}
                    />
                    <ReferenceLine
                      y={targetScore}
                      stroke="#16a34a"
                      strokeDasharray="4 4"
                      label={{ value: `Target: ${targetScore}`, fill: '#16a34a', fontSize: 11, position: 'right' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="overall"
                      stroke="#4f46e5"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: '#4f46e5' }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* 4 Skills Comparison Chart */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm sm:text-base font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-600" />
                <span>4 Skills Breakdown Over Time</span>
              </h2>
              <span className="text-xs text-neutral-400 font-mono">
                Min Skill: {minSkillScore}
              </span>
            </div>

            {chartData.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-md">
                <span>No skill score data available.</span>
                <span className="mt-1">Add a mock test to track Speaking, Writing, Reading & Listening.</span>
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="shortDate" textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis domain={[10, 90]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                    <ReferenceLine
                      y={minSkillScore}
                      stroke="#ea580c"
                      strokeDasharray="3 3"
                      label={{ value: `Min: ${minSkillScore}`, fill: '#ea580c', fontSize: 10, position: 'right' }}
                    />
                    <Line type="monotone" dataKey="speaking" stroke="#2563eb" strokeWidth={1.8} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="writing" stroke="#059669" strokeWidth={1.8} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="reading" stroke="#d97706" strokeWidth={1.8} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="listening" stroke="#9333ea" strokeWidth={1.8} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mock Scores Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
            Recorded Scores Table ({mocks.length})
          </h2>
        </div>

        {mocks.length === 0 ? (
          <div className="p-8 text-center text-sm text-neutral-500">
            No mock tests recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-500 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Label</th>
                  <th className="py-3 px-4 font-semibold">Type</th>
                  <th className="py-3 px-4 font-semibold text-center">Overall</th>
                  <th className="py-3 px-4 font-semibold text-center">Speaking</th>
                  <th className="py-3 px-4 font-semibold text-center">Writing</th>
                  <th className="py-3 px-4 font-semibold text-center">Reading</th>
                  <th className="py-3 px-4 font-semibold text-center">Listening</th>
                  <th className="py-3 px-4 font-semibold">Warnings / Notes</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {mocks.map((mock) => {
                  const warnings = getScoreWarnings(mock);
                  return (
                    <tr
                      key={mock._id}
                      className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono whitespace-nowrap text-neutral-600 dark:text-neutral-400">
                        {mock.date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-neutral-900 dark:text-neutral-100 whitespace-nowrap">
                        {mock.label}
                      </td>
                      <td className="py-3 px-4 capitalize whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                          {mock.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded ${
                            mock.overall >= targetScore
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                              : mock.overall >= minScore
                              ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                              : 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {mock.overall}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={mock.speaking < minSkillScore ? 'text-red-600 font-bold' : ''}>
                          {mock.speaking}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={mock.writing < minSkillScore ? 'text-red-600 font-bold' : ''}>
                          {mock.writing}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={mock.reading < minSkillScore ? 'text-red-600 font-bold' : ''}>
                          {mock.reading}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono">
                        <span className={mock.listening < minSkillScore ? 'text-red-600 font-bold' : ''}>
                          {mock.listening}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {warnings.length > 0 && (
                          <div className="space-y-1 mb-1">
                            {warnings.map((w, i) => (
                              <div
                                key={i}
                                className="text-[11px] text-red-600 dark:text-red-400 font-medium"
                              >
                                {w}
                              </div>
                            ))}
                          </div>
                        )}
                        {mock.notes && (
                          <div className="text-neutral-500 italic max-w-xs truncate">
                            {mock.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(mock)}
                            className="p-1.5 rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                            aria-label="Edit mock score"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setDeleteModal({
                                isOpen: true,
                                id: mock._id,
                                label: mock.label,
                              })
                            }
                            className="p-1.5 rounded text-neutral-400 hover:text-red-600"
                            aria-label="Delete mock score"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Mock Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                {editingMockId ? 'Edit Mock Score' : 'Record Mock Test Score'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMock} className="space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    required
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as MockType)}
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  >
                    <option value="diagnostic">Diagnostic</option>
                    <option value="checkpoint">Checkpoint</option>
                    <option value="mock">Mock Test</option>
                    <option value="exam">Official Exam</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Label
                  </label>
                  <input
                    type="text"
                    value={formLabel}
                    onChange={(e) => setFormLabel(e.target.value)}
                    placeholder="e.g. Mock 1 (ApeUni)"
                    required
                    className="w-full px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
                  />
                </div>
              </div>

              {/* Overall & 4 Skills */}
              <div className="p-3 rounded border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 space-y-3">
                <div>
                  <label className="block font-semibold text-neutral-800 dark:text-neutral-200 mb-1">
                    Overall Score (10–90)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="90"
                    value={formOverall}
                    onChange={(e) => setFormOverall(parseInt(e.target.value, 10) || 10)}
                    required
                    className="w-full px-3 py-1.5 font-bold text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                  />
                </div>

                <div className="grid grid-cols-4 gap-2">
                  <div>
                    <label className="block font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Speaking
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={formSpeaking}
                      onChange={(e) => setFormSpeaking(parseInt(e.target.value, 10) || 10)}
                      required
                      className="w-full px-2 py-1 text-center font-semibold rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Writing
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={formWriting}
                      onChange={(e) => setFormWriting(parseInt(e.target.value, 10) || 10)}
                      required
                      className="w-full px-2 py-1 text-center font-semibold rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Reading
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={formReading}
                      onChange={(e) => setFormReading(parseInt(e.target.value, 10) || 10)}
                      required
                      className="w-full px-2 py-1 text-center font-semibold rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                      Listening
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="90"
                      value={formListening}
                      onChange={(e) => setFormListening(parseInt(e.target.value, 10) || 10)}
                      required
                      className="w-full px-2 py-1 text-center font-semibold rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Notes & Analysis
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Mistake details, sections to drill..."
                  className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingMock || !formLabel.trim()}
                  className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
                >
                  {savingMock ? 'Saving...' : 'Save Mock Score'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Mock Score"
        message={`Delete the score entry for "${deleteModal.label}"?`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDeleteMock}
        onCancel={() => setDeleteModal({ isOpen: false, id: '', label: '' })}
      />
    </div>
  );
}
