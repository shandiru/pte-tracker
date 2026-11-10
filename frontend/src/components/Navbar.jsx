import { useState, useEffect } from "react";
import { NavLink } from "react-router-dom";
import {
  CalendarDays,
  Map,
  BookOpen,
  FileText,
  Award,
  BarChart2,
  Clock,
  Settings,
  Menu,
  X,
  Flame
} from "lucide-react";
import { api } from "../lib/api.js";
import { getTodayColombo, formatReadableDate, daysBetween } from "../lib/dateUtils.js";
export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState(null);
  const [streak, setStreak] = useState(0);
  const today = getTodayColombo();
  useEffect(() => {
    let isMounted = true;
    async function loadMeta() {
      try {
        const [sett, ana] = await Promise.all([
          api.getSettings(),
          api.getAnalyticsSummary()
        ]);
        if (isMounted) {
          setSettings(sett);
          setStreak(ana.currentStreak);
        }
      } catch {
      }
    }
    loadMeta();
    const refreshInterval = setInterval(loadMeta, 3e4);
    return () => {
      isMounted = false;
      clearInterval(refreshInterval);
    };
  }, []);
  const daysToExam = settings ? daysBetween(today, settings.examDate) : null;
  const navLinks = [
    { to: "/", label: "Today", icon: CalendarDays },
    { to: "/roadmap", label: "Roadmap", icon: Map },
    { to: "/logs", label: "Daily Logs", icon: BookOpen },
    { to: "/notes", label: "Notes", icon: FileText },
    { to: "/mocks", label: "Mock Scores", icon: Award },
    { to: "/analytics", label: "Analytics", icon: BarChart2 },
    { to: "/history", label: "History", icon: Clock },
    { to: "/settings", label: "Settings", icon: Settings }
  ];
  return <header className="sticky top-0 z-40 border-b border-neutral-200 dark:border-neutral-800 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {
    /* Brand & Left Badges */
  }
          <div className="flex items-center gap-4">
            <NavLink to="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-md bg-indigo-600 text-white font-bold flex items-center justify-center text-sm tracking-wide shadow-xs">
                PTE
              </span>
              <span className="font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight text-base sm:text-lg">
                Tracker
              </span>
            </NavLink>

            <div className="hidden lg:flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                {formatReadableDate(today)}
              </span>
              {daysToExam !== null && <span className="px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                  {daysToExam > 0 ? `${daysToExam} days left` : daysToExam === 0 ? "Exam Today" : "Exam Completed"}
                </span>}
              {streak > 0 && <span className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800/60">
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                  <span>{streak}d streak</span>
                </span>}
            </div>
          </div>

          {
    /* Desktop Nav */
  }
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5">
            {navLinks.map(({ to, label, icon: Icon }) => <NavLink
    key={to}
    to={to}
    end={to === "/"}
    className={({ isActive }) => `flex items-center gap-1.5 px-3 py-1.5 text-xs lg:text-sm font-medium rounded-md transition-colors ${isActive ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
  >
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </NavLink>)}
          </nav>

          {
    /* Mobile Right Badges & Hamburger */
  }
          <div className="flex items-center gap-2 md:hidden">
            {daysToExam !== null && <span className="px-2 py-0.5 text-xs rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold border border-indigo-200 dark:border-indigo-800/60">
                {daysToExam}d left
              </span>}
            <button
    type="button"
    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
    className="p-2 rounded-md text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-hidden"
    aria-label="Toggle menu"
  >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {
    /* Mobile Drawer Menu */
  }
      {mobileMenuOpen && <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 pt-2 pb-4 space-y-1">
          <div className="flex items-center justify-between py-2 px-3 mb-2 rounded-md bg-neutral-50 dark:bg-neutral-800/60 text-xs text-neutral-600 dark:text-neutral-400">
            <span>{formatReadableDate(today)} (Asia/Colombo)</span>
            {streak > 0 && <span className="font-semibold text-amber-600 dark:text-amber-400">
                {streak} day streak
              </span>}
          </div>
          {navLinks.map(({ to, label, icon: Icon }) => <NavLink
    key={to}
    to={to}
    end={to === "/"}
    onClick={() => setMobileMenuOpen(false)}
    className={({ isActive }) => `flex items-center gap-2.5 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isActive ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-semibold" : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"}`}
  >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>)}
        </div>}
    </header>;
}
