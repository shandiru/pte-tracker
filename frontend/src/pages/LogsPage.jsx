import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Calendar as CalendarIcon,
  List,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Edit3,
  X,
  AlertTriangle,
  Plus
} from "lucide-react";
import { api } from "../lib/api.js";
import {
  getTodayColombo,
  formatReadableDate,
  addDays
} from "../lib/dateUtils.js";
import { ConfirmModal } from '../components/ConfirmModal.jsx';
export function LogsPage() {
  const today = getTodayColombo();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("calendar");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentYearMonth, setCurrentYearMonth] = useState(() => today.slice(0, 7));
  const [activeLogDate, setActiveLogDate] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalLog, setModalLog] = useState({
    minutes: { grammar: 0, speaking: 0, listening: 0, reading: 0, writing: 0, vocab: 0 },
    newWords: 0,
    sentencesWritten: 0,
    habits: { readAloud: false, shadowing: false, journal: false, vocab: false },
    weakPoints: [],
    note: ""
  });
  const [weakPointInput, setWeakPointInput] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    date: ""
  });
  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getLogs(fromDate || void 0, toDate || void 0);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);
  useEffect(() => {
    loadLogs();
  }, [loadLogs]);
  const logsByDate = useMemo(() => {
    const map = /* @__PURE__ */ new Map();
    logs.forEach((l) => map.set(l.date, l));
    return map;
  }, [logs]);
  const missedDays = useMemo(() => {
    if (logs.length === 0) return [];
    const sorted = [...logs].sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = sorted[0].date;
    if (firstDate >= today) return [];
    const missed = [];
    let curr = firstDate;
    while (curr <= today) {
      if (!logsByDate.has(curr)) {
        missed.push(curr);
      }
      curr = addDays(curr, 1);
    }
    return missed.reverse();
  }, [logs, logsByDate, today]);
  const openDateModal = async (date) => {
    setActiveLogDate(date);
    const existing = logsByDate.get(date);
    if (existing) {
      setModalLog({
        minutes: { ...existing.minutes },
        newWords: existing.newWords,
        sentencesWritten: existing.sentencesWritten,
        habits: { ...existing.habits },
        weakPoints: [...existing.weakPoints],
        note: existing.note
      });
    } else {
      setModalLog({
        date,
        minutes: { grammar: 0, speaking: 0, listening: 0, reading: 0, writing: 0, vocab: 0 },
        newWords: 0,
        sentencesWritten: 0,
        habits: { readAloud: false, shadowing: false, journal: false, vocab: false },
        weakPoints: [],
        note: ""
      });
    }
    setModalOpen(true);
  };
  const handleSaveModalLog = async (e) => {
    e.preventDefault();
    if (!activeLogDate) return;
    setSavingLog(true);
    try {
      await api.upsertLog(activeLogDate, {
        date: activeLogDate,
        minutes: modalLog.minutes,
        newWords: Number(modalLog.newWords) || 0,
        sentencesWritten: Number(modalLog.sentencesWritten) || 0,
        habits: modalLog.habits,
        weakPoints: modalLog.weakPoints || [],
        note: modalLog.note || ""
      });
      await loadLogs();
      setModalOpen(false);
    } catch (err) {
      console.error("Failed to save log modal:", err);
    } finally {
      setSavingLog(false);
    }
  };
  const confirmDeleteLog = async () => {
    try {
      await api.deleteLog(deleteModal.date);
      await loadLogs();
    } catch (err) {
      console.error("Failed to delete log:", err);
    } finally {
      setDeleteModal({ isOpen: false, date: "" });
    }
  };
  const [currentYear, currentMonth] = currentYearMonth.split("-").map(Number);
  const firstDayOfMonth = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
  const startingDayOfWeek = firstDayOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(currentYear, currentMonth, 0)).getUTCDate();
  const prevMonth = () => {
    const d = new Date(Date.UTC(currentYear, currentMonth - 2, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    setCurrentYearMonth(ym);
  };
  const nextMonth = () => {
    const d = new Date(Date.UTC(currentYear, currentMonth, 1));
    const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
    setCurrentYearMonth(ym);
  };
  const monthName = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(firstDayOfMonth);
  const getDayIntensityClass = (mins) => {
    if (mins === 0) return "bg-neutral-50 dark:bg-neutral-800/50 hover:bg-neutral-100";
    if (mins < 45) return "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800";
    if (mins < 90) return "bg-emerald-200 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-100 border-emerald-400 dark:border-emerald-700";
    if (mins < 120) return "bg-emerald-300 dark:bg-emerald-800/70 text-emerald-950 dark:text-emerald-50 border-emerald-500 dark:border-emerald-600 font-semibold";
    return "bg-emerald-500 dark:bg-emerald-700 text-white border-emerald-600 dark:border-emerald-500 font-bold";
  };
  return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {
    /* Top Header */
  }
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Daily Study Logs
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            Track daily practice minutes, habit consistency, and missed preparation days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-neutral-300 dark:border-neutral-700 p-0.5 bg-neutral-100 dark:bg-neutral-800 text-xs font-medium">
            <button
    type="button"
    onClick={() => setViewMode("calendar")}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${viewMode === "calendar" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold" : "text-neutral-600 dark:text-neutral-400"}`}
  >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendar</span>
            </button>
            <button
    type="button"
    onClick={() => setViewMode("list")}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition-colors ${viewMode === "list" ? "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 shadow-xs font-semibold" : "text-neutral-600 dark:text-neutral-400"}`}
  >
              <List className="w-3.5 h-3.5" />
              <span>List ({logs.length})</span>
            </button>
          </div>

          <button
    type="button"
    onClick={() => openDateModal(today)}
    className="px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors flex items-center gap-1"
  >
            <Plus className="w-3.5 h-3.5" />
            <span>Add / Edit Log</span>
          </button>
        </div>
      </div>

      {
    /* Missed Days Banner (if any exist) */
  }
      {missedDays.length > 0 && <div className="p-3.5 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs sm:text-sm">
          <div className="flex items-center gap-2 font-semibold mb-1">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>{missedDays.length} Missed Study Days Recorded</span>
          </div>
          <div className="text-xs text-amber-800 dark:text-amber-300">
            No study log was submitted on:{" "}
            <span className="font-mono">{missedDays.slice(0, 7).join(", ")}</span>
            {missedDays.length > 7 && <span> and {missedDays.length - 7} more days</span>}. Click any day to log retrospective minutes.
          </div>
        </div>}

      {
    /* Calendar View */
  }
      {viewMode === "calendar" ? <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
          {
    /* Calendar Month Header */
  }
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100">
              {monthName}
            </h2>
            <div className="flex items-center gap-1">
              <button
    type="button"
    onClick={prevMonth}
    className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
    aria-label="Previous Month"
  >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
    type="button"
    onClick={() => setCurrentYearMonth(today.slice(0, 7))}
    className="px-2.5 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
  >
                Today
              </button>
              <button
    type="button"
    onClick={nextMonth}
    className="p-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
    aria-label="Next Month"
  >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {
    /* Weekday Labels */
  }
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 text-center text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <span>Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
          </div>

          {
    /* Day Grid */
  }
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {
    /* Empty offset days */
  }
            {Array.from({ length: startingDayOfWeek }).map((_, i) => <div
    key={`empty-${i}`}
    className="min-h-[72px] sm:min-h-[90px] rounded-md bg-neutral-50/30 dark:bg-neutral-800/20 border border-transparent"
  />)}

            {
    /* Month days */
  }
            {Array.from({ length: daysInMonth }).map((_, i) => {
    const dayNum = i + 1;
    const dateStr = `${currentYearMonth}-${String(dayNum).padStart(2, "0")}`;
    const log = logsByDate.get(dateStr);
    const isToday = dateStr === today;
    const isMissed = missedDays.includes(dateStr);
    const totalMins = log ? Object.values(log.minutes).reduce((a, b) => a + Number(b || 0), 0) : 0;
    return <div
      key={dateStr}
      onClick={() => openDateModal(dateStr)}
      className={`min-h-[72px] sm:min-h-[90px] p-2 rounded-md border cursor-pointer transition-all flex flex-col justify-between ${isToday ? "ring-2 ring-indigo-500" : ""} ${log ? getDayIntensityClass(totalMins) : isMissed ? "bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50 hover:border-amber-300" : "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"}`}
    >
                  <div className="flex items-center justify-between">
                    <span
      className={`text-xs font-semibold ${isToday ? "px-1.5 py-0.2 rounded bg-indigo-600 text-white" : "text-neutral-700 dark:text-neutral-300"}`}
    >
                      {dayNum}
                    </span>
                    {log && <span className="text-[10px] font-mono font-medium">
                        {totalMins}m
                      </span>}
                  </div>

                  <div className="text-[10px] mt-1 space-y-0.5">
                    {log ? <>
                        {log.newWords > 0 && <div>{log.newWords} words</div>}
                        {log.sentencesWritten > 0 && <div>{log.sentencesWritten} sent</div>}
                      </> : isMissed ? <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Missed
                      </span> : null}
                  </div>
                </div>;
  })}
          </div>

          {
    /* Intensity Legend */
  }
          <div className="flex flex-wrap items-center gap-3 pt-4 mt-4 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 dark:text-neutral-400">
            <span>Color intensity:</span>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700" />
              <span>0m</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300" />
              <span>&lt;45m</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-200 dark:bg-emerald-900/60 border border-emerald-400" />
              <span>45–90m</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-300 dark:bg-emerald-800/70 border border-emerald-500" />
              <span>90–120m</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600" />
              <span>120m+</span>
            </div>
          </div>
        </div> : (
    /* List View */
    <div className="space-y-4">
          {
      /* Filters Bar */
    }
          <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <label className="text-neutral-500 font-medium">From:</label>
              <input
      type="date"
      value={fromDate}
      onChange={(e) => setFromDate(e.target.value)}
      className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
    />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <label className="text-neutral-500 font-medium">To:</label>
              <input
      type="date"
      value={toDate}
      onChange={(e) => setToDate(e.target.value)}
      className="px-2 py-1 text-xs rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
    />
            </div>
            {(fromDate || toDate) && <button
      type="button"
      onClick={() => {
        setFromDate("");
        setToDate("");
      }}
      className="text-xs text-indigo-600 hover:underline"
    >
                Clear filters
              </button>}
          </div>

          {logs.length === 0 ? <div className="text-center py-12 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg text-neutral-500 text-sm">
              No logs yet. Add today&apos;s log.
            </div> : <div className="space-y-3">
              {logs.map((log) => {
      const totalMins = Object.values(log.minutes).reduce(
        (a, b) => a + Number(b || 0),
        0
      );
      return <div
        key={log.date}
        className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                          {formatReadableDate(log.date)}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          {totalMins} minutes
                        </span>
                      </div>

                      {
        /* Minutes Breakdown */
      }
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-neutral-500 mt-2">
                        <span>Grammar: {log.minutes.grammar}m</span>
                        <span>Speaking: {log.minutes.speaking}m</span>
                        <span>Listening: {log.minutes.listening}m</span>
                        <span>Reading: {log.minutes.reading}m</span>
                        <span>Writing: {log.minutes.writing}m</span>
                        <span>Vocab: {log.minutes.vocab}m</span>
                      </div>

                      {
        /* Habits & Metrics */
      }
                      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 dark:text-neutral-400 mt-2">
                        {log.newWords > 0 && <span>{log.newWords} new words</span>}
                        {log.sentencesWritten > 0 && <span>{log.sentencesWritten} sentences</span>}
                        <div className="flex items-center gap-1.5">
                          {log.habits.readAloud && <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px]">
                              Read Aloud
                            </span>}
                          {log.habits.shadowing && <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px]">
                              Shadowing
                            </span>}
                          {log.habits.journal && <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px]">
                              Journal
                            </span>}
                          {log.habits.vocab && <span className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px]">
                              Vocab
                            </span>}
                        </div>
                      </div>

                      {
        /* Weak points */
      }
                      {log.weakPoints && log.weakPoints.length > 0 && <div className="flex flex-wrap gap-1 mt-2">
                          {log.weakPoints.map((wp) => <span
        key={wp}
        className="px-2 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[10px] text-neutral-600 dark:text-neutral-300"
      >
                              {wp}
                            </span>)}
                        </div>}

                      {
        /* Note */
      }
                      {log.note && <div className="text-xs text-neutral-600 dark:text-neutral-400 italic mt-2">
                          &ldquo;{log.note}&rdquo;
                        </div>}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <button
        type="button"
        onClick={() => openDateModal(log.date)}
        className="p-1.5 rounded text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Edit log"
      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
        type="button"
        onClick={() => setDeleteModal({ isOpen: true, date: log.date })}
        className="p-1.5 rounded text-neutral-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        aria-label="Delete log"
      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>;
    })}
            </div>}
        </div>
  )}

      {
    /* Edit / View Modal */
  }
      {modalOpen && activeLogDate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
              <div>
                <h3 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">
                  Study Log: {formatReadableDate(activeLogDate)}
                </h3>
                <span className="text-xs text-neutral-500">{activeLogDate}</span>
              </div>
              <button
    type="button"
    onClick={() => setModalOpen(false)}
    className="p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
  >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModalLog} className="space-y-4 text-xs">
              {
    /* Minutes Inputs */
  }
              <div>
                <label className="block font-semibold uppercase text-neutral-500 mb-2">
                  Minutes by Skill
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["grammar", "speaking", "listening", "reading", "writing", "vocab"].map((k) => <div key={k} className="p-2 rounded border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
                      <span className="block capitalize text-[11px] text-neutral-600 dark:text-neutral-400 mb-1">
                        {k}
                      </span>
                      <input
    type="number"
    min="0"
    value={modalLog.minutes?.[k] || 0}
    onChange={(e) => setModalLog({
      ...modalLog,
      minutes: {
        ...modalLog.minutes,
        [k]: Math.max(0, parseInt(e.target.value, 10) || 0)
      }
    })}
    className="w-full text-xs px-2 py-1 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 font-semibold"
  />
                    </div>)}
                </div>
              </div>

              {
    /* Volume metrics */
  }
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase text-neutral-500 mb-1">
                    New Words Learned
                  </label>
                  <input
    type="number"
    min="0"
    value={modalLog.newWords || 0}
    onChange={(e) => setModalLog({
      ...modalLog,
      newWords: Math.max(0, parseInt(e.target.value, 10) || 0)
    })}
    className="w-full text-xs px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
  />
                </div>
                <div>
                  <label className="block font-semibold uppercase text-neutral-500 mb-1">
                    Sentences Written
                  </label>
                  <input
    type="number"
    min="0"
    value={modalLog.sentencesWritten || 0}
    onChange={(e) => setModalLog({
      ...modalLog,
      sentencesWritten: Math.max(0, parseInt(e.target.value, 10) || 0)
    })}
    className="w-full text-xs px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
  />
                </div>
              </div>

              {
    /* Habits */
  }
              <div>
                <label className="block font-semibold uppercase text-neutral-500 mb-1.5">
                  Habits
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
    { key: "readAloud", label: "Read Aloud" },
    { key: "shadowing", label: "Shadowing" },
    { key: "journal", label: "Journal" },
    { key: "vocab", label: "Vocab" }
  ].map(({ key, label }) => {
    const chk = modalLog.habits?.[key];
    return <label
      key={key}
      className="flex items-center gap-2 p-2 rounded border border-neutral-200 dark:border-neutral-700 cursor-pointer"
    >
                        <input
      type="checkbox"
      checked={Boolean(chk)}
      onChange={(e) => setModalLog({
        ...modalLog,
        habits: {
          ...modalLog.habits,
          [key]: e.target.checked
        }
      })}
      className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
    />
                        <span>{label}</span>
                      </label>;
  })}
                </div>
              </div>

              {
    /* Note */
  }
              <div>
                <label className="block font-semibold uppercase text-neutral-500 mb-1">
                  Note (max 300 chars)
                </label>
                <textarea
    rows={2}
    value={modalLog.note || ""}
    onChange={(e) => setModalLog({
      ...modalLog,
      note: e.target.value.slice(0, 300)
    })}
    className="w-full text-xs px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800"
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
    disabled={savingLog}
    className="px-4 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-medium disabled:opacity-50"
  >
                  {savingLog ? "Saving..." : "Save Log"}
                </button>
              </div>
            </form>
          </div>
        </div>}

      {
    /* Delete Log Confirmation Modal */
  }
      <ConfirmModal
    isOpen={deleteModal.isOpen}
    title="Delete Log"
    message={`Delete the log entry for ${deleteModal.date}?`}
    confirmText="Delete"
    isDestructive={true}
    onConfirm={confirmDeleteLog}
    onCancel={() => setDeleteModal({ isOpen: false, date: "" })}
  />
    </div>;
}
