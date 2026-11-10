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
  weekNo: number | string; // 1..20 or "Exam", "Buffer"
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
  date: string; // YYYY-MM-DD unique
  minutes: IDailyMinutes;
  newWords: number;
  sentencesWritten: number;
  habits: IDailyHabits;
  weakPoints: string[];
  note: string; // max 300 chars
  createdAt?: string;
  updatedAt?: string;
}

export interface INote {
  _id: string;
  date: string; // YYYY-MM-DD
  title: string;
  body: string; // max 1000 chars
  skill: 'grammar' | 'speaking' | 'listening' | 'reading' | 'writing' | 'vocab' | 'general';
  tags: string[];
  pinned: boolean;
  createdAt: string;
}

export interface IMockScore {
  _id: string;
  date: string; // YYYY-MM-DD
  type: 'diagnostic' | 'checkpoint' | 'mock' | 'exam';
  label: string; // e.g. "Mock 1"
  overall: number; // 10-90
  speaking: number; // 10-90
  writing: number; // 10-90
  reading: number; // 10-90
  listening: number; // 10-90
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
  date: string; // YYYY-MM-DD
  timestamp: string; // ISO string
  kind: ActivityKind;
  summary: string;
}
