import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Plus,
  X,
  Clock,
  Flame,
  Award,
  Calendar,
  Save,
  Check,
} from 'lucide-react';
import { api } from '../lib/api.js';
import {
  getTodayColombo,
  formatReadableDate,
  formatShortDate,
  daysBetween,
} from '../lib/dateUtils.js';
import {
  ISettings,
  IRoadmapWeek,
  IDailyLog,
  SkillCategory,
  IAnalyticsSummary,
} from '../types/index.js';

export function TodayPage() {
  const today = getTodayColombo();

  // State
  const [settings, setSettings] = useState<ISettings | null>(null);
  const [currentWeek, setCurrentWeek] = useState<IRoadmapWeek | null>(null);
  const [analytics, setAnalytics] = useState<IAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Daily Log Form State
  const [minutes, setMinutes] = useState({
    grammar: 0,
    speaking: 0,
    listening: 0,
    reading: 0,
    writing: 0,
    vocab: 0,
  });
  const [newWords, setNewWords] = useState(0);
  const [sentencesWritten, setSentencesWritten] = useState(0);
  const [habits, setHabits] = useState({
    readAloud: false,
    shadowing: false,
    journal: false,
    vocab: false,
  });
  const [weakPoints, setWeakPoints] = useState<string[]>([]);
  const [weakPointInput, setWeakPointInput] = useState('');
  const [logNote, setLogNote] = useState('');
  const [logSaving, setLogSaving] = useState(false);
  const [logSavedNotice, setLogSavedNotice] = useState(false);

  // Quick Note Form State
  const [quickNoteTitle, setQuickNoteTitle] = useState('');
  const [quickNoteBody, setQuickNoteBody] = useState('');
  const [quickNoteSkill, setQuickNoteSkill] = useState<SkillCategory>('general');
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSavedNotice, setNoteSavedNotice] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [sett, weeks, logRes, ana] = await Promise.all([
        api.getSettings(),
        api.getRoadmap(),
        api.getLogByDate(today).catch(() => null),
        api.getAnalyticsSummary(),
      ]);

      setSettings(sett);
      setAnalytics(ana);

      // Find current week based on date
      const curr = weeks.find((w) => w.status === 'current') || weeks[0];
      setCurrentWeek(curr);

      // Prefill log if today exists
      if (logRes) {
        setMinutes({
          grammar: logRes.minutes?.grammar || 0,
          speaking: logRes.minutes?.speaking || 0,
          listening: logRes.minutes?.listening || 0,
          reading: logRes.minutes?.reading || 0,
          writing: logRes.minutes?.writing || 0,
          vocab: logRes.minutes?.vocab || 0,
        });
        setNewWords(logRes.newWords || 0);
        setSentencesWritten(logRes.sentencesWritten || 0);
        setHabits({
          readAloud: Boolean(logRes.habits?.readAloud),
          shadowing: Boolean(logRes.habits?.shadowing),
          journal: Boolean(logRes.habits?.journal),
          vocab: Boolean(logRes.habits?.vocab),
        });
        setWeakPoints(logRes.weakPoints || []);
        setLogNote(logRes.note || '');
      }
    } catch (err) {
      console.error('Failed to load today page data:', err);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Topic Checkbox Toggle
  const handleToggleTopic = async (topicId: string, currentDone: boolean) => {
    if (!currentWeek) return;
    try {
      const updatedWeek = await api.updateTopic(currentWeek._id, topicId, {
        done: !currentDone,
      });
      setCurrentWeek(updatedWeek);
    } catch (err) {
      console.error('Failed to toggle topic:', err);
    }
  };

  // Add Weak Point Tag
  const handleAddWeakPoint = (e: React.KeyboardEvent | React.MouseEvent) => {
    if ('key' in e && e.key !== 'Enter' && e.key !== ',') return;
    e.preventDefault();
    const tag = weakPointInput.trim().replace(/^,|,$/g, '');
    if (tag && !weakPoints.includes(tag)) {
      setWeakPoints([...weakPoints, tag]);
      setWeakPointInput('');
    }
  };

  const handleRemoveWeakPoint = (tag: string) => {
    setWeakPoints(weakPoints.filter((t) => t !== tag));
  };

  // Save Today's Log (Upsert)
  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogSaving(true);
    try {
      const logData: Partial<IDailyLog> = {
        date: today,
        minutes,
        newWords: Number(newWords) || 0,
        sentencesWritten: Number(sentencesWritten) || 0,
        habits,
        weakPoints,
        note: logNote.slice(0, 300),
      };
      await api.upsertLog(today, logData);
      setLogSavedNotice(true);
      setTimeout(() => setLogSavedNotice(false), 3000);
      const ana = await api.getAnalyticsSummary();
      setAnalytics(ana);
    } catch (err) {
      console.error('Failed to save log:', err);
    } finally {
      setLogSaving(false);
    }
  };

  // Save Quick Note
  const handleSaveQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNoteBody.trim()) return;
    setNoteSaving(true);
    try {
      await api.addNote({
        date: today,
        title: quickNoteTitle.trim(),
        body: quickNoteBody.trim().slice(0, 1000),
        skill: quickNoteSkill,
      });
      setQuickNoteTitle('');
      setQuickNoteBody('');
      setQuickNoteSkill('general');
      setNoteSavedNotice(true);
      setTimeout(() => setNoteSavedNotice(false), 3000);
    } catch (err) {
      console.error('Failed to save note:', err);
    } finally {
      setNoteSaving(false);
    }
  };

  const totalMinutesToday = Object.values(minutes).reduce((a, b) => a + Number(b || 0), 0);
  const goalMinutes = settings?.dailyGoalMinutes || 105;
  const progressPercent = Math.min(100, Math.round((totalMinutesToday / goalMinutes) * 100));
  const daysToExam = settings ? daysBetween(today, settings.examDate) : null;

  const quickAdd = (skill: keyof typeof minutes, amt: number) => {
    setMinutes((prev) => ({
      ...prev,
      [skill]: Math.max(0, (prev[skill] || 0) + amt),
    }));
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Top Banner / Stats Header */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-neutral-500 dark:text-neutral-400">
              Today in Asia/Colombo
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {formatReadableDate(today)}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {daysToExam !== null && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm font-semibold">
                <Calendar className="w-4 h-4" />
                <span>{daysToExam > 0 ? `${daysToExam} days until Exam (${settings?.examDate})` : 'Exam Date'}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-sm font-medium">
              <Award className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>Target: {settings?.minScore} min / {settings?.targetScore} stretch</span>
            </div>
          </div>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          {/* Daily Goal Progress */}
          <div className="rounded-md border border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-4">
            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              <span>Daily Study Goal</span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100">
                {totalMinutesToday} / {goalMinutes} min ({progressPercent}%)
              </span>
            </div>
            <div className="w-full bg-neutral-200 dark:bg-neutral-700 h-2.5 rounded-full overflow-hidden mb-2">
              <div
                className={`h-full transition-all duration-300 ${
                  progressPercent >= 100 ? 'bg-emerald-600' : 'bg-indigo-600'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {progressPercent >= 100
                  ? 'Goal completed for today'
                  : `${goalMinutes - totalMinutesToday} minutes remaining today`}
              </span>
            </div>
          </div>

          {/* Current & Longest Streak */}
          <div className="rounded-md border border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-4">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Study Streak
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {analytics?.currentStreak || 0}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                consecutive days
              </span>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 mt-2">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Longest streak: {analytics?.longestStreak || 0} days</span>
            </div>
          </div>

          {/* Weekly Averages */}
          <div className="rounded-md border border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 p-4">
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
              Recent Averages
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {analytics?.avgMinutesLast7Days || 0}
              </span>
              <span className="text-xs text-neutral-500 dark:text-neutral-400">
                min/day (last 7 days)
              </span>
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              30-day average: {analytics?.avgMinutesLast30Days || 0} min/day
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Roadmap & Quick Note */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Roadmap Week (2 Columns) */}
        <div className="lg:col-span-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  {currentWeek ? `Week ${currentWeek.weekNo}` : 'Current Week'}
                </span>
                <span className="text-xs text-neutral-500 dark:text-neutral-400">
                  {currentWeek?.phase}
                </span>
              </div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                {currentWeek?.title}
              </h2>
            </div>
            <div className="text-right text-xs text-neutral-500 dark:text-neutral-400">
              {currentWeek && (
                <>
                  <div>{formatShortDate(currentWeek.startDate)} – {formatShortDate(currentWeek.endDate)}</div>
                  <div className="mt-0.5 font-medium text-neutral-700 dark:text-neutral-300">
                    {currentWeek.topics.filter((t) => t.done).length} / {currentWeek.topics.length} topics done
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Topic Checklist */}
          <div className="mt-4 divide-y divide-neutral-100 dark:divide-neutral-800">
            {currentWeek?.topics.map((topic) => (
              <div
                key={topic._id}
                onClick={() => handleToggleTopic(topic._id, topic.done)}
                className="py-3 px-2 flex items-start gap-3 rounded-md hover:bg-neutral-50 dark:hover:bg-neutral-800/50 cursor-pointer transition-colors"
              >
                <button
                  type="button"
                  className="mt-0.5 focus:outline-hidden"
                  aria-label={topic.done ? 'Mark topic as undone' : 'Mark topic as done'}
                >
                  {topic.done ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 fill-emerald-100 dark:fill-emerald-950" />
                  ) : (
                    <Circle className="w-5 h-5 text-neutral-400 hover:text-neutral-600 dark:text-neutral-600 dark:hover:text-neutral-400" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium ${
                      topic.done
                        ? 'line-through text-neutral-400 dark:text-neutral-500'
                        : 'text-neutral-900 dark:text-neutral-100'
                    }`}
                  >
                    {topic.text}
                  </div>
                  {topic.done && topic.doneAt && (
                    <div className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">
                      Completed: {topic.doneAt}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Note Box (1 Column) */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100 mb-1">
              Quick Note
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              Add a brief study note dated today.
            </p>

            <form onSubmit={handleSaveQuickNote} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Title (optional)
                </label>
                <input
                  type="text"
                  value={quickNoteTitle}
                  onChange={(e) => setQuickNoteTitle(e.target.value)}
                  placeholder="e.g. SVO inverted forms"
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                  Skill
                </label>
                <select
                  value={quickNoteSkill}
                  onChange={(e) => setQuickNoteSkill(e.target.value as SkillCategory)}
                  className="w-full px-3 py-1.5 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="general">General</option>
                  <option value="grammar">Grammar</option>
                  <option value="speaking">Speaking</option>
                  <option value="listening">Listening</option>
                  <option value="reading">Reading</option>
                  <option value="writing">Writing</option>
                  <option value="vocab">Vocab</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    Body
                  </label>
                  <span className="text-[10px] text-neutral-400">
                    {quickNoteBody.length}/1000
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={quickNoteBody}
                  onChange={(e) => setQuickNoteBody(e.target.value.slice(0, 1000))}
                  placeholder="Write note here..."
                  required
                  className="w-full px-3 py-2 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={noteSaving || !quickNoteBody.trim()}
                className="w-full py-2 px-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {noteSaving ? (
                  'Saving...'
                ) : noteSavedNotice ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved to Notes</span>
                  </>
                ) : (
                  'Save Note'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Today's Daily Log Form */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800 gap-2">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              Daily Log for {today}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Record your practice minutes, habits, words, and weak areas. Saving updates today&apos;s log.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {logSavedNotice && (
              <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                <Check className="w-3.5 h-3.5" /> Log updated
              </span>
            )}
            <button
              onClick={handleSaveLog}
              disabled={logSaving}
              className="py-2 px-4 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{logSaving ? 'Saving...' : 'Save Log'}</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSaveLog} className="mt-6 space-y-6">
          {/* Minutes Per Skill */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
              Practice Minutes per Skill
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(
                [
                  { key: 'grammar', label: 'Grammar' },
                  { key: 'speaking', label: 'Speaking' },
                  { key: 'listening', label: 'Listening' },
                  { key: 'reading', label: 'Reading' },
                  { key: 'writing', label: 'Writing' },
                  { key: 'vocab', label: 'Vocab' },
                ] as const
              ).map(({ key, label }) => (
                <div
                  key={key}
                  className="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30"
                >
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    {label}
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="1440"
                      value={minutes[key] || 0}
                      onChange={(e) =>
                        setMinutes({
                          ...minutes,
                          [key]: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      className="w-full px-2 py-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-neutral-500">m</span>
                  </div>
                  <div className="flex gap-1 mt-2">
                    <button
                      type="button"
                      onClick={() => quickAdd(key, 15)}
                      className="flex-1 py-1 text-[10px] font-medium rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      +15
                    </button>
                    <button
                      type="button"
                      onClick={() => quickAdd(key, 30)}
                      className="flex-1 py-1 text-[10px] font-medium rounded bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 transition-colors"
                    >
                      +30
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Counts & Habits Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            {/* Word / Sentence Counts */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Volume Metrics
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    New Words Learned
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newWords}
                    onChange={(e) => setNewWords(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    className="w-full px-3 py-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div className="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Sentences Written
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={sentencesWritten}
                    onChange={(e) =>
                      setSentencesWritten(Math.max(0, parseInt(e.target.value, 10) || 0))
                    }
                    className="w-full px-3 py-1.5 text-sm font-semibold text-neutral-900 dark:text-neutral-100 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* 4 Habit Checkboxes */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Daily Habits
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'readAloud', label: 'Read Aloud' },
                  { key: 'shadowing', label: 'Shadowing' },
                  { key: 'journal', label: 'Journal' },
                  { key: 'vocab', label: 'Vocab Review' },
                ].map(({ key, label }) => {
                  const isChecked = habits[key as keyof typeof habits];
                  return (
                    <label
                      key={key}
                      className={`flex items-center gap-2.5 p-2.5 rounded-md border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-300 dark:border-indigo-800 bg-indigo-50/60 dark:bg-indigo-950/40'
                          : 'border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) =>
                          setHabits({
                            ...habits,
                            [key]: e.target.checked,
                          })
                        }
                        className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                      <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200">
                        {label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Weak Points Tag Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
              Weak Points Encountered
            </label>
            <div className="flex flex-wrap items-center gap-2 p-2 rounded-md border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
              {weakPoints.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-medium"
                >
                  <span>{tag}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveWeakPoint(tag)}
                    className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 focus:outline-hidden"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <div className="flex-1 min-w-[140px] flex items-center gap-1">
                <input
                  type="text"
                  value={weakPointInput}
                  onChange={(e) => setWeakPointInput(e.target.value)}
                  onKeyDown={handleAddWeakPoint}
                  placeholder="Type weak point and press Enter..."
                  className="w-full text-xs bg-transparent text-neutral-900 dark:text-neutral-100 focus:outline-hidden px-1 py-0.5"
                />
                {weakPointInput.trim() && (
                  <button
                    type="button"
                    onClick={handleAddWeakPoint}
                    className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Short Note (max 300 chars) */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                Daily Reflection Note (max 300 chars)
              </label>
              <span className="text-xs text-neutral-400">
                {logNote.length}/300
              </span>
            </div>
            <textarea
              rows={2}
              value={logNote}
              onChange={(e) => setLogNote(e.target.value.slice(0, 300))}
              placeholder="What went well or what needs focus tomorrow..."
              className="w-full px-3 py-2 text-xs sm:text-sm rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Submit Row */}
          <div className="flex items-center justify-end gap-3 pt-2">
            {logSavedNotice && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                Log saved successfully
              </span>
            )}
            <button
              type="submit"
              disabled={logSaving}
              className="py-2.5 px-6 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>{logSaving ? 'Saving...' : 'Save Today\'s Log'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
