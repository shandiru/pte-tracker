import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  CheckCircle2,
  Circle,
  FileText,
  Award,
  MoveRight,
  BookOpen
} from "lucide-react";
import { api } from "../lib/api.js";
export function HistoryPage() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedKind, setSelectedKind] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const loadActivities = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getActivity({
        kind: selectedKind !== "all" ? selectedKind : void 0,
        from: fromDate || void 0,
        to: toDate || void 0
      });
      setActivities(data);
    } catch (err) {
      console.error("Failed to load activity feed:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedKind, fromDate, toDate]);
  useEffect(() => {
    loadActivities();
  }, [loadActivities]);
  const getActivityIcon = (kind) => {
    switch (kind) {
      case "log_saved":
        return <BookOpen className="w-4 h-4 text-indigo-500" />;
      case "topic_done":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "topic_undone":
        return <Circle className="w-4 h-4 text-amber-500" />;
      case "note_added":
        return <FileText className="w-4 h-4 text-blue-500" />;
      case "mock_added":
        return <Award className="w-4 h-4 text-purple-500" />;
      case "roadmap_shifted":
        return <MoveRight className="w-4 h-4 text-orange-500" />;
      default:
        return <Clock className="w-4 h-4 text-neutral-400" />;
    }
  };
  const getActivityKindLabel = (kind) => {
    switch (kind) {
      case "log_saved":
        return "Daily Log";
      case "topic_done":
        return "Topic Done";
      case "topic_undone":
        return "Topic Undone";
      case "note_added":
        return "Note Added";
      case "mock_added":
        return "Mock Score";
      case "roadmap_shifted":
        return "Roadmap Shift";
      default:
        return kind;
    }
  };
  const formatTimestamp = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return "";
    }
  };
  return <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {
    /* Header */
  }
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Activity History
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Server-generated audit log of study sessions, roadmap progress, mock tests, and notes.
        </p>
      </div>

      {
    /* Filter Bar */
  }
      <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
    { id: "all", label: "All Activities" },
    { id: "log_saved", label: "Daily Logs" },
    { id: "topic_done", label: "Completed Topics" },
    { id: "note_added", label: "Notes" },
    { id: "mock_added", label: "Mock Scores" },
    { id: "roadmap_shifted", label: "Roadmap Shifts" }
  ].map(({ id, label }) => <button
    key={id}
    type="button"
    onClick={() => setSelectedKind(id)}
    className={`px-2.5 py-1 rounded transition-colors ${selectedKind === id ? "bg-indigo-600 text-white font-medium" : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200"}`}
  >
              {label}
            </button>)}
        </div>

        <div className="flex items-center gap-2">
          <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-[11px]"
  />
          <span className="text-neutral-400">to</span>
          <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    className="px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-[11px]"
  />
          {(fromDate || toDate) && <button
    type="button"
    onClick={() => {
      setFromDate("");
      setToDate("");
    }}
    className="text-xs text-indigo-600 hover:underline"
  >
              Clear
            </button>}
        </div>
      </div>

      {
    /* Feed List */
  }
      {loading ? <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />)}
        </div> : activities.length === 0 ? <div className="text-center py-12 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg text-neutral-500 text-sm">
          No activity records found.
        </div> : <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg divide-y divide-neutral-100 dark:divide-neutral-800 shadow-xs">
          {activities.map((act) => <div key={act._id} className="p-4 flex items-start gap-3.5 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
              <div className="mt-0.5 p-1.5 rounded-full bg-neutral-100 dark:bg-neutral-800 shrink-0">
                {getActivityIcon(act.kind)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                    {getActivityKindLabel(act.kind)}
                  </span>
                  <span className="text-xs font-mono text-neutral-400">
                    {act.date} {formatTimestamp(act.timestamp)}
                  </span>
                </div>
                <p className="text-sm text-neutral-900 dark:text-neutral-100 font-medium">
                  {act.summary}
                </p>
              </div>
            </div>)}
        </div>}
    </div>;
}
