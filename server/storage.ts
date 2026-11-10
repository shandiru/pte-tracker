import fs from 'fs';
import path from 'path';
import {
  ISettings,
  IRoadmapWeek,
  IDailyLog,
  INote,
  IMockScore,
  IActivity,
  ActivityKind,
} from './types.js';
import {
  defaultSettings,
  buildInitialRoadmapWeeks,
} from './seedData.js';
import {
  getTodayColombo,
  addDays,
} from './dateUtils.js';
import { isMongoActive } from './db.js';
import {
  SettingsModel,
  RoadmapWeekModel,
  DailyLogModel,
  NoteModel,
  MockScoreModel,
  ActivityModel,
} from './models/index.js';

interface DBState {
  settings: ISettings;
  roadmapWeeks: IRoadmapWeek[];
  logs: IDailyLog[];
  notes: INote[];
  mockScores: IMockScore[];
  activities: IActivity[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataFile(): DBState {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialState: DBState = {
      settings: { ...defaultSettings },
      roadmapWeeks: buildInitialRoadmapWeeks(),
      logs: [],
      notes: [],
      mockScores: [],
      activities: [
        {
          _id: `act_${Date.now()}`,
          date: getTodayColombo(),
          timestamp: new Date().toISOString(),
          kind: 'log_saved',
          summary: 'Initialized PTE Tracker database and roadmap.',
        },
      ],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialState, null, 2), 'utf-8');
    return initialState;
  }

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw) as DBState;
    if (!data.roadmapWeeks || data.roadmapWeeks.length === 0) {
      data.roadmapWeeks = buildInitialRoadmapWeeks();
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    return data;
  } catch {
    const fallback: DBState = {
      settings: { ...defaultSettings },
      roadmapWeeks: buildInitialRoadmapWeeks(),
      logs: [],
      notes: [],
      mockScores: [],
      activities: [],
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

function readJSON(): DBState {
  return ensureDataFile();
}

function writeJSON(state: DBState): void {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function computeWeekStatus(
  week: IRoadmapWeek,
  today: string
): 'upcoming' | 'current' | 'done' | 'missed' {
  const allDone = week.topics.length > 0 && week.topics.every((t) => t.done);
  if (allDone) return 'done';
  if (today >= week.startDate && today <= week.endDate) return 'current';
  if (today > week.endDate && !allDone) return 'missed';
  return 'upcoming';
}

function normalizeWeekWithStatus(week: IRoadmapWeek, today: string): IRoadmapWeek {
  return {
    ...week,
    status: computeWeekStatus(week, today),
  };
}

// ==========================================
// Storage Operations
// ==========================================

export async function logActivity(kind: ActivityKind, summary: string): Promise<IActivity> {
  const today = getTodayColombo();
  const activity: IActivity = {
    _id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: today,
    timestamp: new Date().toISOString(),
    kind,
    summary,
  };

  if (isMongoActive()) {
    try {
      await ActivityModel.create(activity);
    } catch (e) {
      console.error('Mongo activity log error:', e);
    }
  }

  const state = readJSON();
  state.activities.unshift(activity);
  writeJSON(state);

  return activity;
}

// Settings
export async function getSettings(): Promise<ISettings> {
  if (isMongoActive()) {
    try {
      const doc = await SettingsModel.findOne().lean();
      if (doc) return doc as unknown as ISettings;
    } catch (e) {
      console.warn('Mongo getSettings error, fallback to json:', e);
    }
  }
  const state = readJSON();
  return state.settings;
}

export async function updateSettings(data: Partial<ISettings>): Promise<ISettings> {
  const state = readJSON();
  const updated: ISettings = {
    ...state.settings,
    ...data,
  };

  if (isMongoActive()) {
    try {
      await SettingsModel.findOneAndUpdate({}, updated, { upsert: true, new: true });
    } catch (e) {
      console.error('Mongo updateSettings error:', e);
    }
  }

  state.settings = updated;
  writeJSON(state);
  return updated;
}

// Roadmap
export async function getRoadmapWeeks(): Promise<IRoadmapWeek[]> {
  const today = getTodayColombo();
  let rawWeeks: IRoadmapWeek[] = [];

  if (isMongoActive()) {
    try {
      const docs = await RoadmapWeekModel.find().lean();
      if (docs && docs.length > 0) {
        rawWeeks = docs as unknown as IRoadmapWeek[];
      }
    } catch (e) {
      console.warn('Mongo getRoadmapWeeks error, fallback to json:', e);
    }
  }

  if (rawWeeks.length === 0) {
    const state = readJSON();
    rawWeeks = state.roadmapWeeks;
  }

  return rawWeeks.map((w) => normalizeWeekWithStatus(w, today));
}

export async function updateTopic(
  weekId: string,
  topicId: string,
  updates: { done?: boolean; text?: string }
): Promise<IRoadmapWeek> {
  const today = getTodayColombo();
  const state = readJSON();
  const weekIndex = state.roadmapWeeks.findIndex((w) => w._id === weekId);
  if (weekIndex === -1) {
    throw new Error(`Week with ID ${weekId} not found`);
  }

  const week = state.roadmapWeeks[weekIndex];
  const topic = week.topics.find((t) => t._id === topicId);
  if (!topic) {
    throw new Error(`Topic with ID ${topicId} not found`);
  }

  let activityMessage = '';
  let activityKind: ActivityKind = 'topic_done';

  if (typeof updates.done === 'boolean' && updates.done !== topic.done) {
    topic.done = updates.done;
    topic.doneAt = updates.done ? today : null;
    activityKind = updates.done ? 'topic_done' : 'topic_undone';
    activityMessage = updates.done
      ? `Marked done: ${topic.text} (Week ${week.weekNo})`
      : `Marked undone: ${topic.text} (Week ${week.weekNo})`;
  }

  if (typeof updates.text === 'string' && updates.text.trim()) {
    topic.text = updates.text.trim();
  }

  state.roadmapWeeks[weekIndex] = week;
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await RoadmapWeekModel.findByIdAndUpdate(weekId, week);
    } catch (e) {
      console.error('Mongo updateTopic error:', e);
    }
  }

  if (activityMessage) {
    await logActivity(activityKind, activityMessage);
  }

  return normalizeWeekWithStatus(week, today);
}

export async function addTopic(weekId: string, text: string): Promise<IRoadmapWeek> {
  const today = getTodayColombo();
  const state = readJSON();
  const weekIndex = state.roadmapWeeks.findIndex((w) => w._id === weekId);
  if (weekIndex === -1) {
    throw new Error(`Week with ID ${weekId} not found`);
  }

  const week = state.roadmapWeeks[weekIndex];
  const newTopic = {
    _id: `topic_${week.weekNo}_${Date.now()}`,
    text: text.trim(),
    done: false,
    doneAt: null,
  };

  week.topics.push(newTopic);
  state.roadmapWeeks[weekIndex] = week;
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await RoadmapWeekModel.findByIdAndUpdate(weekId, week);
    } catch (e) {
      console.error('Mongo addTopic error:', e);
    }
  }

  return normalizeWeekWithStatus(week, today);
}

export async function deleteTopic(weekId: string, topicId: string): Promise<IRoadmapWeek> {
  const today = getTodayColombo();
  const state = readJSON();
  const weekIndex = state.roadmapWeeks.findIndex((w) => w._id === weekId);
  if (weekIndex === -1) {
    throw new Error(`Week with ID ${weekId} not found`);
  }

  const week = state.roadmapWeeks[weekIndex];
  week.topics = week.topics.filter((t) => t._id !== topicId);
  state.roadmapWeeks[weekIndex] = week;
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await RoadmapWeekModel.findByIdAndUpdate(weekId, week);
    } catch (e) {
      console.error('Mongo deleteTopic error:', e);
    }
  }

  return normalizeWeekWithStatus(week, today);
}

export async function shiftRoadmap(
  startWeekNo: number | string,
  days: number
): Promise<IRoadmapWeek[]> {
  const today = getTodayColombo();
  const state = readJSON();
  const startIndex = state.roadmapWeeks.findIndex(
    (w) => String(w.weekNo) === String(startWeekNo)
  );

  if (startIndex === -1) {
    throw new Error(`Start week ${startWeekNo} not found`);
  }

  for (let i = startIndex; i < state.roadmapWeeks.length; i++) {
    const week = state.roadmapWeeks[i];
    week.startDate = addDays(week.startDate, days);
    week.endDate = addDays(week.endDate, days);
    week.shiftedByDays = (week.shiftedByDays || 0) + days;
    state.roadmapWeeks[i] = week;

    if (isMongoActive()) {
      try {
        await RoadmapWeekModel.findByIdAndUpdate(week._id, week);
      } catch (e) {
        console.error('Mongo shift week error:', e);
      }
    }
  }

  // Also update Settings examDate and bufferEndDate if shifted from or before Exam week
  const examWeek = state.roadmapWeeks.find((w) => String(w.weekNo) === 'Exam');
  const bufferWeek = state.roadmapWeeks.find((w) => String(w.weekNo) === 'Buffer');
  if (examWeek) {
    state.settings.examDate = examWeek.startDate;
  }
  if (bufferWeek) {
    state.settings.bufferEndDate = bufferWeek.endDate;
  }

  writeJSON(state);

  const sign = days >= 0 ? '+' : '';
  await logActivity(
    'roadmap_shifted',
    `Shifted roadmap from Week ${startWeekNo} by ${sign}${days} days`
  );

  return state.roadmapWeeks.map((w) => normalizeWeekWithStatus(w, today));
}

// Daily Logs
export async function getDailyLogs(from?: string, to?: string): Promise<IDailyLog[]> {
  let logs: IDailyLog[] = [];
  if (isMongoActive()) {
    try {
      const query: Record<string, unknown> = {};
      if (from || to) {
        query.date = {};
        if (from) (query.date as Record<string, unknown>).$gte = from;
        if (to) (query.date as Record<string, unknown>).$lte = to;
      }
      const docs = await DailyLogModel.find(query).sort({ date: -1 }).lean();
      logs = docs as unknown as IDailyLog[];
    } catch (e) {
      console.warn('Mongo getDailyLogs error:', e);
    }
  }

  if (logs.length === 0) {
    const state = readJSON();
    logs = state.logs;
    if (from) logs = logs.filter((l) => l.date >= from);
    if (to) logs = logs.filter((l) => l.date <= to);
    logs.sort((a, b) => b.date.localeCompare(a.date));
  }

  return logs;
}

export async function getDailyLogByDate(date: string): Promise<IDailyLog | null> {
  if (isMongoActive()) {
    try {
      const doc = await DailyLogModel.findOne({ date }).lean();
      if (doc) return doc as unknown as IDailyLog;
    } catch (e) {
      console.warn('Mongo getDailyLogByDate error:', e);
    }
  }

  const state = readJSON();
  const log = state.logs.find((l) => l.date === date);
  return log || null;
}

export async function upsertDailyLog(date: string, logData: Partial<IDailyLog>): Promise<IDailyLog> {
  const now = new Date().toISOString();
  const state = readJSON();
  const existingIndex = state.logs.findIndex((l) => l.date === date);

  const fullMinutes = {
    grammar: Number(logData.minutes?.grammar || 0),
    speaking: Number(logData.minutes?.speaking || 0),
    listening: Number(logData.minutes?.listening || 0),
    reading: Number(logData.minutes?.reading || 0),
    writing: Number(logData.minutes?.writing || 0),
    vocab: Number(logData.minutes?.vocab || 0),
  };

  const totalMinutes = Object.values(fullMinutes).reduce((acc, m) => acc + m, 0);

  const cleanWeakPoints = Array.isArray(logData.weakPoints)
    ? logData.weakPoints.map((s) => String(s).trim()).filter(Boolean)
    : [];

  const logRecord: IDailyLog = {
    date,
    minutes: fullMinutes,
    newWords: Math.max(0, Number(logData.newWords || 0)),
    sentencesWritten: Math.max(0, Number(logData.sentencesWritten || 0)),
    habits: {
      readAloud: Boolean(logData.habits?.readAloud),
      shadowing: Boolean(logData.habits?.shadowing),
      journal: Boolean(logData.habits?.journal),
      vocab: Boolean(logData.habits?.vocab),
    },
    weakPoints: cleanWeakPoints,
    note: (logData.note || '').slice(0, 300),
    updatedAt: now,
    createdAt: existingIndex !== -1 ? state.logs[existingIndex].createdAt : now,
  };

  if (existingIndex !== -1) {
    state.logs[existingIndex] = logRecord;
  } else {
    state.logs.push(logRecord);
  }

  writeJSON(state);

  if (isMongoActive()) {
    try {
      await DailyLogModel.findOneAndUpdate({ date }, logRecord, { upsert: true, new: true });
    } catch (e) {
      console.error('Mongo upsertDailyLog error:', e);
    }
  }

  await logActivity('log_saved', `Saved daily log for ${date} (${totalMinutes} mins)`);

  return logRecord;
}

export async function deleteDailyLog(date: string): Promise<boolean> {
  const state = readJSON();
  const initLen = state.logs.length;
  state.logs = state.logs.filter((l) => l.date !== date);
  const deleted = state.logs.length < initLen;
  if (deleted) {
    writeJSON(state);
    if (isMongoActive()) {
      try {
        await DailyLogModel.deleteOne({ date });
      } catch (e) {
        console.error('Mongo deleteDailyLog error:', e);
      }
    }
  }
  return deleted;
}

// Notes
export async function getNotes(filters?: {
  skill?: string;
  tag?: string;
  pinned?: boolean;
  search?: string;
}): Promise<INote[]> {
  const state = readJSON();
  let notes = [...state.notes];

  if (filters?.skill && filters.skill !== 'all') {
    notes = notes.filter((n) => n.skill === filters.skill);
  }
  if (filters?.tag) {
    const t = filters.tag.toLowerCase();
    notes = notes.filter((n) => n.tags.some((tag) => tag.toLowerCase() === t));
  }
  if (typeof filters?.pinned === 'boolean') {
    notes = notes.filter((n) => n.pinned === filters.pinned);
  }
  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    notes = notes.filter(
      (n) => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)
    );
  }

  // Sorted newest first by date then createdAt
  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return notes;
}

export async function addNote(noteData: {
  date?: string;
  title?: string;
  body: string;
  skill?: INote['skill'];
  tags?: string[];
  pinned?: boolean;
}): Promise<INote> {
  const today = getTodayColombo();
  const state = readJSON();
  const note: INote = {
    _id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: noteData.date || today,
    title: (noteData.title || '').trim(),
    body: (noteData.body || '').trim().slice(0, 1000),
    skill: noteData.skill || 'general',
    tags: Array.isArray(noteData.tags)
      ? noteData.tags.map((t) => t.trim()).filter(Boolean)
      : [],
    pinned: Boolean(noteData.pinned),
    createdAt: new Date().toISOString(),
  };

  state.notes.unshift(note);
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await NoteModel.create(note);
    } catch (e) {
      console.error('Mongo addNote error:', e);
    }
  }

  const preview = note.title || note.body.slice(0, 30);
  await logActivity('note_added', `Added note: ${preview} (${note.skill})`);

  return note;
}

export async function updateNote(
  id: string,
  updates: Partial<INote>
): Promise<INote> {
  const state = readJSON();
  const index = state.notes.findIndex((n) => n._id === id);
  if (index === -1) {
    throw new Error(`Note ${id} not found`);
  }

  const existing = state.notes[index];
  const updated: INote = {
    ...existing,
    ...updates,
    title: updates.title !== undefined ? updates.title.trim() : existing.title,
    body: updates.body !== undefined ? updates.body.trim().slice(0, 1000) : existing.body,
    tags: Array.isArray(updates.tags)
      ? updates.tags.map((t) => t.trim()).filter(Boolean)
      : existing.tags,
  };

  state.notes[index] = updated;
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await NoteModel.findByIdAndUpdate(id, updated);
    } catch (e) {
      console.error('Mongo updateNote error:', e);
    }
  }

  return updated;
}

export async function deleteNote(id: string): Promise<boolean> {
  const state = readJSON();
  const initLen = state.notes.length;
  state.notes = state.notes.filter((n) => n._id !== id);
  const deleted = state.notes.length < initLen;
  if (deleted) {
    writeJSON(state);
    if (isMongoActive()) {
      try {
        await NoteModel.findByIdAndDelete(id);
      } catch (e) {
        console.error('Mongo deleteNote error:', e);
      }
    }
  }
  return deleted;
}

// Mock Scores
export async function getMockScores(): Promise<IMockScore[]> {
  const state = readJSON();
  const scores = [...state.mockScores];
  scores.sort((a, b) => a.date.localeCompare(b.date));
  return scores;
}

export async function addMockScore(data: Omit<IMockScore, '_id'>): Promise<IMockScore> {
  const state = readJSON();
  const score: IMockScore = {
    _id: `mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    date: data.date,
    type: data.type,
    label: (data.label || 'Mock Test').trim(),
    overall: Math.min(90, Math.max(10, Number(data.overall))),
    speaking: Math.min(90, Math.max(10, Number(data.speaking))),
    writing: Math.min(90, Math.max(10, Number(data.writing))),
    reading: Math.min(90, Math.max(10, Number(data.reading))),
    listening: Math.min(90, Math.max(10, Number(data.listening))),
    notes: (data.notes || '').trim(),
  };

  state.mockScores.push(score);
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await MockScoreModel.create(score);
    } catch (e) {
      console.error('Mongo addMockScore error:', e);
    }
  }

  await logActivity(
    'mock_added',
    `Added mock score: ${score.label} (Overall: ${score.overall})`
  );

  return score;
}

export async function updateMockScore(
  id: string,
  updates: Partial<IMockScore>
): Promise<IMockScore> {
  const state = readJSON();
  const index = state.mockScores.findIndex((m) => m._id === id);
  if (index === -1) {
    throw new Error(`Mock score ${id} not found`);
  }

  const existing = state.mockScores[index];
  const updated: IMockScore = {
    ...existing,
    ...updates,
    overall: updates.overall !== undefined ? Math.min(90, Math.max(10, Number(updates.overall))) : existing.overall,
    speaking: updates.speaking !== undefined ? Math.min(90, Math.max(10, Number(updates.speaking))) : existing.speaking,
    writing: updates.writing !== undefined ? Math.min(90, Math.max(10, Number(updates.writing))) : existing.writing,
    reading: updates.reading !== undefined ? Math.min(90, Math.max(10, Number(updates.reading))) : existing.reading,
    listening: updates.listening !== undefined ? Math.min(90, Math.max(10, Number(updates.listening))) : existing.listening,
  };

  state.mockScores[index] = updated;
  writeJSON(state);

  if (isMongoActive()) {
    try {
      await MockScoreModel.findByIdAndUpdate(id, updated);
    } catch (e) {
      console.error('Mongo updateMockScore error:', e);
    }
  }

  return updated;
}

export async function deleteMockScore(id: string): Promise<boolean> {
  const state = readJSON();
  const initLen = state.mockScores.length;
  state.mockScores = state.mockScores.filter((m) => m._id !== id);
  const deleted = state.mockScores.length < initLen;
  if (deleted) {
    writeJSON(state);
    if (isMongoActive()) {
      try {
        await MockScoreModel.findByIdAndDelete(id);
      } catch (e) {
        console.error('Mongo deleteMockScore error:', e);
      }
    }
  }
  return deleted;
}

// Activity Feed
export async function getActivity(filters?: {
  kind?: string;
  from?: string;
  to?: string;
}): Promise<IActivity[]> {
  const state = readJSON();
  let acts = [...state.activities];

  if (filters?.kind && filters.kind !== 'all') {
    acts = acts.filter((a) => a.kind === filters.kind);
  }
  if (filters?.from) {
    acts = acts.filter((a) => a.date >= filters.from!);
  }
  if (filters?.to) {
    acts = acts.filter((a) => a.date <= filters.to!);
  }

  acts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return acts;
}

// Analytics Summary
export async function getAnalyticsSummary(): Promise<{
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
}> {
  const today = getTodayColombo();
  const state = readJSON();
  const weeks = await getRoadmapWeeks();
  const logs = [...state.logs].sort((a, b) => a.date.localeCompare(b.date));

  // Weekly minutes & weekly skill minutes mapped across roadmap weeks
  const weeklyMinutes: { weekLabel: string; totalMinutes: number; startDate: string }[] = [];
  const weeklySkillMinutes: {
    weekLabel: string;
    grammar: number;
    speaking: number;
    listening: number;
    reading: number;
    writing: number;
    vocab: number;
  }[] = [];

  for (const week of weeks) {
    const weekLogs = logs.filter(
      (l) => l.date >= week.startDate && l.date <= week.endDate
    );

    let g = 0, sp = 0, lis = 0, r = 0, w = 0, v = 0;
    for (const log of weekLogs) {
      g += log.minutes.grammar || 0;
      sp += log.minutes.speaking || 0;
      lis += log.minutes.listening || 0;
      r += log.minutes.reading || 0;
      w += log.minutes.writing || 0;
      v += log.minutes.vocab || 0;
    }

    const total = g + sp + lis + r + w + v;
    const label = `W${week.weekNo}`;
    weeklyMinutes.push({
      weekLabel: label,
      totalMinutes: total,
      startDate: week.startDate,
    });

    weeklySkillMinutes.push({
      weekLabel: label,
      grammar: g,
      speaking: sp,
      listening: lis,
      reading: r,
      writing: w,
      vocab: v,
    });
  }

  // Cumulative words & sentences
  let wordsSum = 0;
  let sentencesSum = 0;
  const cumulativeWords: { date: string; words: number; cumulative: number }[] = [];
  const cumulativeSentences: { date: string; sentences: number; cumulative: number }[] = [];

  for (const log of logs) {
    wordsSum += log.newWords || 0;
    sentencesSum += log.sentencesWritten || 0;
    cumulativeWords.push({
      date: log.date,
      words: log.newWords || 0,
      cumulative: wordsSum,
    });
    cumulativeSentences.push({
      date: log.date,
      sentences: log.sentencesWritten || 0,
      cumulative: sentencesSum,
    });
  }

  // Average daily minutes over last 7 and 30 calendar days
  const date7DaysAgo = addDays(today, -6);
  const date30DaysAgo = addDays(today, -29);

  let minutesLast7 = 0;
  let minutesLast30 = 0;

  for (const log of logs) {
    const mins = Object.values(log.minutes).reduce((acc, m) => acc + m, 0);
    if (log.date >= date7DaysAgo && log.date <= today) {
      minutesLast7 += mins;
    }
    if (log.date >= date30DaysAgo && log.date <= today) {
      minutesLast30 += mins;
    }
  }

  const avgMinutesLast7Days = Math.round((minutesLast7 / 7) * 10) / 10;
  const avgMinutesLast30Days = Math.round((minutesLast30 / 30) * 10) / 10;

  // Weakest skill from latest mock score
  const mockScores = [...state.mockScores].sort((a, b) => a.date.localeCompare(b.date));
  let weakestSkill: { skill: string; score: number; label: string } | null = null;
  if (mockScores.length > 0) {
    const latest = mockScores[mockScores.length - 1];
    const skills = [
      { skill: 'Speaking', score: latest.speaking },
      { skill: 'Writing', score: latest.writing },
      { skill: 'Reading', score: latest.reading },
      { skill: 'Listening', score: latest.listening },
    ];
    skills.sort((a, b) => a.score - b.score);
    weakestSkill = {
      skill: skills[0].skill,
      score: skills[0].score,
      label: latest.label,
    };
  }

  // Top 10 weak point tags
  const tagCounts: Record<string, number> = {};
  for (const log of logs) {
    for (const tag of log.weakPoints || []) {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed) {
        tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
      }
    }
  }

  const topWeakPoints = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Streaks calculation
  const loggedDates = new Set(logs.map((l) => l.date));
  let currentStreak = 0;
  let checkDate = today;

  // If today is not logged yet, check if yesterday was logged to continue streak
  if (!loggedDates.has(checkDate)) {
    const yesterday = addDays(today, -1);
    if (loggedDates.has(yesterday)) {
      checkDate = yesterday;
    }
  }

  while (loggedDates.has(checkDate)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  // Longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: string | null = null;

  for (const log of logs) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const expected = addDays(prevDate, 1);
      if (log.date === expected) {
        tempStreak++;
      } else if (log.date === prevDate) {
        // same date, ignore
      } else {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = log.date;
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return {
    weeklyMinutes,
    weeklySkillMinutes,
    cumulativeWords,
    cumulativeSentences,
    avgMinutesLast7Days,
    avgMinutesLast30Days,
    weakestSkill,
    topWeakPoints,
    currentStreak,
    longestStreak,
  };
}

// Reset & Seed
export async function seedDatabase(): Promise<void> {
  const state = readJSON();
  let hasModified = false;

  if (!state.settings) {
    state.settings = { ...defaultSettings };
    hasModified = true;
  }

  if (!state.roadmapWeeks || state.roadmapWeeks.length === 0) {
    state.roadmapWeeks = buildInitialRoadmapWeeks();
    hasModified = true;
  }

  if (hasModified) {
    writeJSON(state);
  }

  if (isMongoActive()) {
    try {
      const countSettings = await SettingsModel.countDocuments();
      if (countSettings === 0) {
        await SettingsModel.create(defaultSettings);
      }
      const countWeeks = await RoadmapWeekModel.countDocuments();
      if (countWeeks === 0) {
        await RoadmapWeekModel.insertMany(buildInitialRoadmapWeeks());
      }
    } catch (e) {
      console.error('Mongo seedDatabase error:', e);
    }
  }
}

export async function resetDatabase(): Promise<void> {
  const freshWeeks = buildInitialRoadmapWeeks();
  const freshSettings = { ...defaultSettings };
  const today = getTodayColombo();

  const resetState: DBState = {
    settings: freshSettings,
    roadmapWeeks: freshWeeks,
    logs: [],
    notes: [],
    mockScores: [],
    activities: [
      {
        _id: `act_${Date.now()}`,
        date: today,
        timestamp: new Date().toISOString(),
        kind: 'log_saved',
        summary: 'Reset database to initial seed roadmap and default settings.',
      },
    ],
  };

  writeJSON(resetState);

  if (isMongoActive()) {
    try {
      await Promise.all([
        SettingsModel.deleteMany({}),
        RoadmapWeekModel.deleteMany({}),
        DailyLogModel.deleteMany({}),
        NoteModel.deleteMany({}),
        MockScoreModel.deleteMany({}),
        ActivityModel.deleteMany({}),
      ]);
      await SettingsModel.create(freshSettings);
      await RoadmapWeekModel.insertMany(freshWeeks);
    } catch (e) {
      console.error('Mongo resetDatabase error:', e);
    }
  }
}

// Export / Import
export async function exportAllData(): Promise<DBState> {
  return readJSON();
}

export async function importAllData(data: Partial<DBState>): Promise<void> {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import data format');
  }

  const validSettings = data.settings || { ...defaultSettings };
  const validWeeks = Array.isArray(data.roadmapWeeks) ? data.roadmapWeeks : buildInitialRoadmapWeeks();
  const validLogs = Array.isArray(data.logs) ? data.logs : [];
  const validNotes = Array.isArray(data.notes) ? data.notes : [];
  const validMocks = Array.isArray(data.mockScores) ? data.mockScores : [];
  const validActivities = Array.isArray(data.activities) ? data.activities : [];

  const newState: DBState = {
    settings: validSettings,
    roadmapWeeks: validWeeks,
    logs: validLogs,
    notes: validNotes,
    mockScores: validMocks,
    activities: validActivities,
  };

  writeJSON(newState);

  if (isMongoActive()) {
    try {
      await Promise.all([
        SettingsModel.deleteMany({}),
        RoadmapWeekModel.deleteMany({}),
        DailyLogModel.deleteMany({}),
        NoteModel.deleteMany({}),
        MockScoreModel.deleteMany({}),
        ActivityModel.deleteMany({}),
      ]);
      await SettingsModel.create(validSettings);
      if (validWeeks.length > 0) await RoadmapWeekModel.insertMany(validWeeks);
      if (validLogs.length > 0) await DailyLogModel.insertMany(validLogs);
      if (validNotes.length > 0) await NoteModel.insertMany(validNotes);
      if (validMocks.length > 0) await MockScoreModel.insertMany(validMocks);
      if (validActivities.length > 0) await ActivityModel.insertMany(validActivities);
    } catch (e) {
      console.error('Mongo import error:', e);
    }
  }

  await logActivity('log_saved', 'Imported data backup.');
}
