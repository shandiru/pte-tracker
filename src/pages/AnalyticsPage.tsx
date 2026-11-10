import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import {
  Clock,
  AlertCircle,
  Tag,
  BookOpen,
  Edit3,
} from 'lucide-react';
import { api } from '../lib/api.js';
import { IAnalyticsSummary } from '../types/index.js';
import { formatShortDate } from '../lib/dateUtils.js';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<IAnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getAnalyticsSummary();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 bg-neutral-200 dark:bg-neutral-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
          <div className="h-28 bg-neutral-100 dark:bg-neutral-800 rounded-lg animate-pulse" />
        </div>
      </div>
    );
  }

  const weeklyMinutes = analytics?.weeklyMinutes || [];
  const weeklySkillMinutes = analytics?.weeklySkillMinutes || [];
  const cumulativeWords = (analytics?.cumulativeWords || []).map((w) => ({
    ...w,
    shortDate: formatShortDate(w.date),
  }));
  const cumulativeSentences = (analytics?.cumulativeSentences || []).map((s) => ({
    ...s,
    shortDate: formatShortDate(s.date),
  }));

  const hasAnyStudyTime = weeklyMinutes.some((w) => w.totalMinutes > 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
      {/* Header */}
      <div className="border-b border-neutral-200 dark:border-neutral-800 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
          Preparation Analytics
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
          Weekly volume distribution, skill allocation, and mistake pattern trends.
        </p>
      </div>

      {/* Top 3 Fact Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 7-day & 30-day Daily Average */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-500" />
            <span>Average Daily Minutes</span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-bold text-neutral-900 dark:text-neutral-100">
              {analytics?.avgMinutesLast7Days || 0}
            </span>
            <span className="text-xs text-neutral-500">min/day (last 7 days)</span>
          </div>
          <div className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            Last 30 days average: <span className="font-semibold text-neutral-700 dark:text-neutral-300">{analytics?.avgMinutesLast30Days || 0} min/day</span>
          </div>
        </div>

        {/* Weakest Skill (Plain Fact) */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>Weakest Skill</span>
          </div>
          {analytics?.weakestSkill ? (
            <div className="mt-2">
              <div className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                {analytics.weakestSkill.skill} ({analytics.weakestSkill.score}/90)
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                Lowest scoring section in latest test: {analytics.weakestSkill.label}
              </div>
            </div>
          ) : (
            <div className="mt-2 text-xs text-neutral-500">
              No mock test data yet. Add a mock score to compute weakest skill.
            </div>
          )}
        </div>

        {/* Total Words & Sentences */}
        <div className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
          <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-1 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cumulative Output</span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-2">
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {cumulativeWords.length > 0 ? cumulativeWords[cumulativeWords.length - 1].cumulative : 0}
              </div>
              <div className="text-xs text-neutral-500">Words learned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {cumulativeSentences.length > 0 ? cumulativeSentences[cumulativeSentences.length - 1].cumulative : 0}
              </div>
              <div className="text-xs text-neutral-500">Sentences written</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid: Weekly Total & Stacked Skills */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Total Minutes */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Weekly Total Study Minutes
          </h2>
          {!hasAnyStudyTime ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
              No study logs recorded across roadmap weeks yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyMinutes} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val ?? 0} mins`, 'Study Time']} />
                  <Bar dataKey="totalMinutes" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Stacked Minutes by Skill */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4">
            Minutes by Skill (Stacked by Week)
          </h2>
          {!hasAnyStudyTime ? (
            <div className="h-64 flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
              No skill breakdown recorded yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklySkillMinutes} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="weekLabel" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="grammar" stackId="a" fill="#6366f1" name="Grammar" />
                  <Bar dataKey="speaking" stackId="a" fill="#3b82f6" name="Speaking" />
                  <Bar dataKey="listening" stackId="a" fill="#a855f7" name="Listening" />
                  <Bar dataKey="reading" stackId="a" fill="#f59e0b" name="Reading" />
                  <Bar dataKey="writing" stackId="a" fill="#10b981" name="Writing" />
                  <Bar dataKey="vocab" stackId="a" fill="#ec4899" name="Vocab" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Output Over Time Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative Words */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-indigo-500" />
            <span>Words Learned Over Time (Cumulative)</span>
          </h2>
          {cumulativeWords.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
              No words data logged yet.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeWords} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val ?? 0} words`, 'Total Words']} />
                  <Line type="monotone" dataKey="cumulative" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Cumulative Sentences */}
        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 mb-4 flex items-center gap-1.5">
            <Edit3 className="w-4 h-4 text-emerald-500" />
            <span>Sentences Written Over Time (Cumulative)</span>
          </h2>
          {cumulativeSentences.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded">
              No sentences data logged yet.
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={cumulativeSentences} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="shortDate" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: any) => [`${val ?? 0} sentences`, 'Total Sentences']} />
                  <Line type="monotone" dataKey="cumulative" stroke="#059669" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Top 10 Weak Points */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 rounded-lg p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            Most Frequent Weak Points (Top 10)
          </h2>
        </div>

        {(!analytics?.topWeakPoints || analytics.topWeakPoints.length === 0) ? (
          <div className="text-xs text-neutral-400 py-4">
            No weak point tags recorded in daily logs yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
            {analytics.topWeakPoints.map((item, idx) => (
              <div
                key={item.tag}
                className="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-800/40 flex items-center justify-between"
              >
                <div className="min-w-0 pr-2">
                  <div className="text-[10px] text-neutral-400 font-mono">#{idx + 1}</div>
                  <div className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate capitalize">
                    {item.tag}
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-bold bg-neutral-200 dark:bg-neutral-700 text-neutral-800 dark:text-neutral-200">
                  {item.count}×
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
