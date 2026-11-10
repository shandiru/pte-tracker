export interface ISettings {
  _id?: string;
  examDate: string; // YYYY-MM-DD
  bufferEndDate: string; // YYYY-MM-DD
  minScore: number; // 58
  targetScore: number; // 70
  minSkillScore: number; // 50
  dailyGoalMinutes: number; // 105
}

export interface IRoadmapTopic {
  _id: string;
  text: string;
  done: boolean;
  doneAt: string | null; // YYYY-MM-DD or null
}

export interface IRoadmapWeek {
  _id: string;
  weekNo: number | string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  phase: 'Foundation' | 'Grammar Core' | 'PTE Skills' | 'Mock Phase' | 'Exam' | 'Buffer';
  title: string;
  topics: IRoadmapTopic[];
  status: 'upcoming' | 'current' | 'done' | 'missed';
  shiftedByDays: number;
}

export interface IDailyMinutes {
  grammar: number;
  speaking: number;
  listening: number;
  reading: number;
  writing: number;
  vocab: number;
}

export interface IDailyHabits {
  readAloud: boolean;
  shadowing: boolean;
  journal: boolean;
  vocab: boolean;
}

export interface IDailyLog {
  _id?: string;
  date: string; // YYYY-MM-DD
  minutes: IDailyMinutes;
  newWords: number;
  sentencesWritten: number;
  habits: IDailyHabits;
  weakPoints: string[];
  note: string;
  createdAt?: string;
  updatedAt?: string;
}

export type SkillCategory =
  | 'grammar'
  | 'speaking'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'vocab'
  | 'general';

export interface INote {
  _id: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string;
  skill: SkillCategory;
  tags: string[];
  pinned: boolean;
  createdAt: string;
}

export type MockType = 'diagnostic' | 'checkpoint' | 'mock' | 'exam';

export interface IMockScore {
  _id: string;
  date: string; // YYYY-MM-DD
  type: MockType;
  label: string;
  overall: number;
  speaking: number;
  writing: number;
  reading: number;
  listening: number;
  notes: string;
}

export type ActivityKind =
  | 'log_saved'
  | 'topic_done'
  | 'topic_undone'
  | 'note_added'
  | 'mock_added'
  | 'roadmap_shifted';

export interface IActivity {
  _id: string;
  date: string;
  timestamp: string;
  kind: ActivityKind;
  summary: string;
}

export interface IAnalyticsSummary {
  weeklyMinutes: { weekLabel: string; totalMinutes: number; startDate: string }[];
  weeklySkillMinutes: {
    weekLabel: string;
    grammar: number;
    speaking: number;
    listening: number;
    reading: number;
    writing: number;
    vocab: number;
  }[];
  cumulativeWords: { date: string; words: number; cumulative: number }[];
  cumulativeSentences: { date: string; sentences: number; cumulative: number }[];
  avgMinutesLast7Days: number;
  avgMinutesLast30Days: number;
  weakestSkill: { skill: string; score: number; label: string } | null;
  topWeakPoints: { tag: string; count: number }[];
  currentStreak: number;
  longestStreak: number;
}
