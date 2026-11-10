import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  ChevronDown,
  ChevronUp,
  MoveRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { formatShortDate, addDays, getTodayColombo } from '../lib/dateUtils.js';
import { IRoadmapWeek, IRoadmapTopic } from '../types/index.js';
import { ConfirmModal } from '../components/ConfirmModal.js';

export function RoadmapPage() {
  const today = getTodayColombo();
  const [weeks, setWeeks] = useState<IRoadmapWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  // Topic editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [editingTopicText, setEditingTopicText] = useState('');

  // Add topic state
  const [addingWeekId, setAddingWeekId] = useState<string | null>(null);
  const [newTopicText, setNewTopicText] = useState('');

  // Delete topic confirmation modal
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    weekId: string;
    topicId: string;
    topicText: string;
  }>({
    isOpen: false,
    weekId: '',
    topicId: '',
    topicText: '',
  });

  // Shift Roadmap Modal state
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftStartWeekNo, setShiftStartWeekNo] = useState<string>('5');
  const [shiftDays, setShiftDays] = useState<number>(3);
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [shiftNotice, setShiftNotice] = useState('');

  const loadRoadmap = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getRoadmap();
      setWeeks(data);

      // Expand current week by default
      const initialExp: Record<string, boolean> = {};
      data.forEach((w) => {
        if (w.status === 'current') {
          initialExp[w._id] = true;
        }
      });
      setExpandedWeeks((prev) => ({ ...initialExp, ...prev }));
    } catch (err) {
      console.error('Failed to load roadmap:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoadmap();
  }, [loadRoadmap]);

  const toggleExpand = (weekId: string) => {
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekId]: !prev[weekId],
    }));
  };

  const handleToggleTopic = async (weekId: string, topic: IRoadmapTopic) => {
    try {
      const updatedWeek = await api.updateTopic(weekId, topic._id, {
        done: !topic.done,
      });
      setWeeks((prev) => prev.map((w) => (w._id === weekId ? updatedWeek : w)));
    } catch (err) {
      console.error('Failed to toggle topic:', err);
    }
  };

  const handleStartEditTopic = (topic: IRoadmapTopic) => {
    setEditingTopicId(topic._id);
    setEditingTopicText(topic.text);
  };

  const handleSaveEditTopic = async (weekId: string, topicId: string) => {
    if (!editingTopicText.trim()) return;
    try {
      const updatedWeek = await api.updateTopic(weekId, topicId, {
        text: editingTopicText.trim(),
      });
      setWeeks((prev) => prev.map((w) => (w._id === weekId ? updatedWeek : w)));
      setEditingTopicId(null);
      setEditingTopicText('');
    } catch (err) {
      console.error('Failed to update topic:', err);
    }
  };

  const handleAddTopic = async (weekId: string) => {
    if (!newTopicText.trim()) return;
    try {
      const updatedWeek = await api.addTopic(weekId, newTopicText.trim());
      setWeeks((prev) => prev.map((w) => (w._id === weekId ? updatedWeek : w)));
      setNewTopicText('');
      setAddingWeekId(null);
    } catch (err) {
      console.error('Failed to add topic:', err);
    }
  };

  const confirmDeleteTopic = async () => {
    try {
      const updatedWeek = await api.deleteTopic(deleteModal.weekId, deleteModal.topicId);
      setWeeks((prev) => prev.map((w) => (w._id === deleteModal.weekId ? updatedWeek : w)));
    } catch (err) {
      console.error('Failed to delete topic:', err);
    } finally {
      setDeleteModal({ isOpen: false, weekId: '', topicId: '', topicText: '' });
    }
  };

  const handleApplyShift = async () => {
    if (shiftDays === 0) return;
    setShiftSubmitting(true);
    try {
      const updatedWeeks = await api.shiftRoadmap(shiftStartWeekNo, shiftDays);
      setWeeks(updatedWeeks);
      setShiftModalOpen(false);
      setShiftNotice(
        `Roadmap shifted from Week ${shiftStartWeekNo} by ${shiftDays > 0 ? '+' : ''}${shiftDays} days.`
      );
      setTimeout(() => setShiftNotice(''), 4000);
    } catch (err) {
      console.error('Failed to shift roadmap:', err);
    } finally {
      setShiftSubmitting(false);
    }
  };

  // Calculations for overall progress
  let totalTopics = 0;
  let doneTopics = 0;
  weeks.forEach((w) => {
    totalTopics += w.topics.length;
    doneTopics += w.topics.filter((t) => t.done).length;
  });
  const overallPercent = totalTopics > 0 ? Math.round((doneTopics / totalTopics) * 100) : 0;

  // Preview affected weeks for shift roadmap
  const startIndex = weeks.findIndex((w) => String(w.weekNo) === String(shiftStartWeekNo));
  const affectedWeeks = startIndex !== -1 ? weeks.slice(startIndex) : [];

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="h-4 w-full bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            PTE Study Roadmap
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            22-week timeline from Foundation to Exam. Today is {today}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const cur = weeks.find((w) => w.status === 'current');
            if (cur) setShiftStartWeekNo(String(cur.weekNo));
            setShiftModalOpen(true);
          }}
          className="px-3.5 py-2 text-xs sm:text-sm font-medium rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-xs"
        >
          <MoveRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>Shift Roadmap Dates</span>
        </button>
      </div>

      {shiftNotice && (
        <div className="p-3 rounded-md bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{shiftNotice}</span>
        </div>
      )}

      {/* Overall Roadmap Progress Bar */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-4 shadow-xs">
        <div className="flex justify-between items-center text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          <span>Overall Roadmap Completion</span>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">
            {doneTopics} / {totalTopics} topics ({overallPercent}%)
          </span>
        </div>
        <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-indigo-600 h-full transition-all duration-300"
            style={{ width: `${overallPercent}%` }}
          />
        </div>
      </div>

      {/* Timeline of 22 Weeks */}
      <div className="space-y-3">
        {weeks.map((week) => {
          const isExpanded = Boolean(expandedWeeks[week._id]);
          const weekDoneCount = week.topics.filter((t) => t.done).length;
          const weekTotalCount = week.topics.length;
          const weekPercent = weekTotalCount > 0 ? Math.round((weekDoneCount / weekTotalCount) * 100) : 0;

          // Status Badge styling
          let statusBadgeClass = 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400';
          let statusLabel = 'Upcoming';
          if (week.status === 'current') {
            statusBadgeClass = 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 font-semibold';
            statusLabel = 'Current';
          } else if (week.status === 'done') {
            statusBadgeClass = 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
            statusLabel = 'Done';
          } else if (week.status === 'missed') {
            statusBadgeClass = 'bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
            statusLabel = 'Missed';
          }

          return (
            <div
              key={week._id}
              className={`rounded-lg border transition-colors ${
                week.status === 'current'
                  ? 'border-indigo-300 dark:border-indigo-800 bg-white dark:bg-neutral-900 shadow-xs'
                  : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900'
              }`}
            >
              {/* Week Header Row */}
              <div
                onClick={() => toggleExpand(week._id)}
                className="p-4 flex items-center justify-between cursor-pointer select-none hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 rounded-lg"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="shrink-0 flex flex-col items-center justify-center w-12 text-center">
                    <span className="text-xs font-bold uppercase text-neutral-700 dark:text-neutral-300">
                      {typeof week.weekNo === 'number' ? `W${week.weekNo}` : week.weekNo}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      {weekPercent}%
                    </span>
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                        {week.phase}
                      </span>
                      <span className={`px-2 py-0.2 rounded text-[11px] ${statusBadgeClass}`}>
                        {statusLabel}
                      </span>
                      {week.shiftedByDays !== 0 && (
                        <span className="text-[10px] text-neutral-400">
                          ({week.shiftedByDays > 0 ? `+${week.shiftedByDays}` : week.shiftedByDays}d shift)
                        </span>
                      )}
                    </div>
                    <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate mt-0.5">
                      {week.title}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0 ml-2">
                  <div className="hidden sm:flex flex-col items-end text-xs text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}
                      </span>
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      {weekDoneCount}/{weekTotalCount} topics
                    </div>
                  </div>

                  <button
                    type="button"
                    className="p-1 rounded text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 focus:outline-hidden"
                    aria-label="Toggle details"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Collapsed/Expanded Topic Checklist */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
                  <div className="sm:hidden text-xs text-neutral-500 pb-2 flex justify-between">
                    <span>{formatShortDate(week.startDate)} – {formatShortDate(week.endDate)}</span>
                    <span>{weekDoneCount}/{weekTotalCount} topics done</span>
                  </div>

                  {week.topics.length === 0 ? (
                    <div className="text-xs text-neutral-400 py-2">No topics in this week.</div>
                  ) : (
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {week.topics.map((topic) => (
                        <div
                          key={topic._id}
                          className="py-2.5 flex items-start justify-between gap-3 group"
                        >
                          <div className="flex items-start gap-2.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => handleToggleTopic(week._id, topic)}
                              className="mt-0.5 focus:outline-hidden"
                              aria-label={topic.done ? 'Mark topic as undone' : 'Mark topic as done'}
                            >
                              {topic.done ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                              ) : (
                                <Circle className="w-4 h-4 text-neutral-400 hover:text-neutral-600" />
                              )}
                            </button>

                            {editingTopicId === topic._id ? (
                              <div className="flex-1 flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingTopicText}
                                  onChange={(e) => setEditingTopicText(e.target.value)}
                                  className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditTopic(week._id, topic._id)}
                                  className="p-1 rounded text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTopicId(null)}
                                  className="p-1 rounded text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex-1 min-w-0">
                                <span
                                  className={`text-xs sm:text-sm font-medium ${
                                    topic.done
                                      ? 'line-through text-neutral-400 dark:text-neutral-500'
                                      : 'text-neutral-800 dark:text-neutral-200'
                                  }`}
                                >
                                  {topic.text}
                                </span>
                                {topic.done && topic.doneAt && (
                                  <span className="ml-2 text-[11px] text-neutral-400 dark:text-neutral-500">
                                    (done {topic.doneAt})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {editingTopicId !== topic._id && (
                            <div className="flex items-center gap-1 opacity-80 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleStartEditTopic(topic)}
                                className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 rounded"
                                aria-label="Edit topic text"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setDeleteModal({
                                    isOpen: true,
                                    weekId: week._id,
                                    topicId: topic._id,
                                    topicText: topic.text,
                                  })
                                }
                                className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                                aria-label="Delete topic"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Topic In Week */}
                  {addingWeekId === week._id ? (
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="text"
                        value={newTopicText}
                        onChange={(e) => setNewTopicText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddTopic(week._id);
                          if (e.key === 'Escape') setAddingWeekId(null);
                        }}
                        placeholder="New topic title..."
                        className="flex-1 text-xs px-2.5 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddTopic(week._id)}
                        className="px-2.5 py-1.5 rounded bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingWeekId(null)}
                        className="p-1.5 rounded text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setAddingWeekId(week._id);
                        setNewTopicText('');
                      }}
                      className="mt-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add topic to Week {week.weekNo}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Delete Topic Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Topic"
        message={`Are you sure you want to delete "${deleteModal.topicText}"?`}
        confirmText="Delete"
        isDestructive={true}
        onConfirm={confirmDeleteTopic}
        onCancel={() => setDeleteModal({ isOpen: false, weekId: '', topicId: '', topicText: '' })}
      />

      {/* Shift Roadmap Modal */}
      {shiftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Shift Roadmap Dates
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Move start and end dates for a chosen week and all subsequent weeks by a set number of days.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Start From Week
                </label>
                <select
                  value={shiftStartWeekNo}
                  onChange={(e) => setShiftStartWeekNo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  {weeks.map((w) => (
                    <option key={w._id} value={String(w.weekNo)}>
                      Week {w.weekNo} ({w.startDate})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Shift by Days (+ or -)
                </label>
                <input
                  type="number"
                  value={shiftDays}
                  onChange={(e) => setShiftDays(parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Before / After Preview Table */}
            <div className="border border-neutral-200 dark:border-neutral-800 rounded-md p-3 bg-neutral-50 dark:bg-neutral-800/40 mb-4 text-xs">
              <div className="flex items-center gap-1.5 text-neutral-600 dark:text-neutral-300 font-semibold mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
                <span>Date Change Preview ({affectedWeeks.length} weeks affected)</span>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-neutral-200 dark:divide-neutral-700">
                {affectedWeeks.slice(0, 8).map((w) => (
                  <div key={w._id} className="py-1.5 flex items-center justify-between">
                    <span className="font-medium text-neutral-700 dark:text-neutral-300">
                      Week {w.weekNo}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-[11px]">
                      <span className="text-neutral-400">{w.startDate}</span>
                      <span className="text-neutral-400">→</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                        {addDays(w.startDate, shiftDays)}
                      </span>
                    </div>
                  </div>
                ))}
                {affectedWeeks.length > 8 && (
                  <div className="pt-1 text-[11px] text-neutral-400 italic">
                    + {affectedWeeks.length - 8} more weeks (including Exam and Buffer)
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShiftModalOpen(false)}
                className="px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={shiftSubmitting || shiftDays === 0}
                onClick={handleApplyShift}
                className="px-4 py-1.5 text-xs font-medium rounded bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50"
              >
                {shiftSubmitting ? 'Shifting...' : 'Confirm and Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
