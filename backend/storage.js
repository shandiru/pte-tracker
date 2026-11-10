import fs from 'fs';
import path from 'path';
import { defaultSettings, buildInitialRoadmapWeeks } from './seedData.js';
import { getTodayColombo, addDays } from './dateUtils.js';
import { isMongoActive } from './db.js';
import {
  SettingsModel,
  RoadmapWeekModel,
  DailyLogModel,
  NoteModel,
  MockScoreModel,
  ActivityModel,
} from './models/index.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    const initialState = {
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
    const data = JSON.parse(raw);
    if (!data.roadmapWeeks || data.roadmapWeeks.length === 0) {
      data.roadmapWeeks = buildInitialRoadmapWeeks();
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }
    return data;
  } catch {
    const fallback = {
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

function readJSON() {
  return ensureDataFile();
}

function writeJSON(state) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

export function computeWeekStatus(week, today) {
  const allDone = week.topics.length > 0 && week.topics.every((t) => t.done);
  if (allDone) return 'done';
  if (today >= week.startDate && today <= week.endDate) return 'current';
  if (today > week.endDate && !allDone) return 'missed';
  return 'upcoming';
}

function normalizeWeekWithStatus(week, today) {
  return {
    ...week,
    status: computeWeekStatus(week, today),
  };
}

export async function logActivity(kind, summary) {
  const today = getTodayColombo();
  const activity = {
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

export async function getSettings() {
  if (isMongoActive()) {
    try {
      const doc = await SettingsModel.findOne().lean();
      if (doc) return doc;
    } catch (e) {
      console.warn('Mongo getSettings fallback:', e);
    }
  }
  const state = readJSON();
  return state.settings;
}

export async function updateSettings(data) {
  const state = readJSON();
  const updated = { ...state.settings, ...data };

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

export async function getRoadmapWeeks() {
  const today = getTodayColombo();
  let rawWeeks = [];

  if (isMongoActive()) {
    try {
      const docs = await RoadmapWeekModel.find().lean();
      if (docs && docs.length > 0) {
        rawWeeks = docs;
      }
    } catch (e) {
      console.warn('Mongo getRoadmapWeeks fallback:', e);
    }
  }

  if (rawWeeks.length === 0) {
    const state = readJSON();
    rawWeeks = state.roadmapWeeks;
  }

  return rawWeeks.map((w) => normalizeWeekWithStatus(w, today));
}

export async function updateTopic(weekId, topicId, updates) {
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
  let activityKind = 'topic_done';

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

export async function addTopic(weekId, text) {
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

export async function deleteTopic(weekId, topicId) {
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

export async function shiftRoadmap(startWeekNo, days) {
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

  const examWeek = state.roadmapWeeks.find((w) => String(w.weekNo) === 'Exam');
  const bufferWeek = state.roadmapWeeks.find((w) => String(w.weekNo) === 'Buffer');
  if (examWeek) state.settings.examDate = examWeek.startDate;
  if (bufferWeek) state.settings.bufferEndDate = bufferWeek.endDate;

  writeJSON(state);

  const sign = days >= 0 ? '+' : '';
  await logActivity(
    'roadmap_shifted',
    `Shifted roadmap from Week ${startWeekNo} by ${sign}${days} days`
  );

  return state.roadmapWeeks.map((w) => normalizeWeekWithStatus(w, today));
}

export async function getDailyLogs(from, to) {
  let logs = [];
  if (isMongoActive()) {
    try {
      const query = {};
      if (from || to) {
        query.date = {};
        if (from) query.date.$gte = from;
        if (to) query.date.$lte = to;
      }
      docs = await DailyLogModel.find(query).sort({ date: -1 }).lean();
      logs = docs;
    } catch (e) {
      console.warn('Mongo getDailyLogs fallback:', e);
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

export async function getDailyLogByDate(date) {
  if (isMongoActive()) {
    try {
      const doc = await DailyLogModel.findOne({ date }).lean();
      if (doc) return doc;
    } catch (e) {
      console.warn('Mongo getDailyLogByDate fallback:', e);
    }
  }

  const state = readJSON();
  return state.logs.find((l) => l.date === date) || null;
}

export async function upsertDailyLog(date, logData) {
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

  const logRecord = {
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

export async function deleteDailyLog(date) {
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

export async function getNotes(filters) {
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

  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });

  return notes;
}

export async function addNote(noteData) {
  const today = getTodayColombo();
  const state = readJSON();
  const note = {
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

export async function updateNote(id, updates) {
  const state = readJSON();
  const index = state.notes.findIndex((n) => n._id === id);
  if (index === -1) throw new Error(`Note ${id} not found`);

  const existing = state.notes[index];
  const updated = {
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

export async function deleteNote(id) {
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

export async function getMockScores() {
  const state = readJSON();
  const scores = [...state.mockScores];
  scores.sort((a, b) => a.date.localeCompare(b.date));
  return scores;
}

export async function addMockScore(data) {
  const state = readJSON();
  const score = {
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

  await logActivity('mock_added', `Added mock score: ${score.label} (Overall: ${score.overall})`);
  return score;
}

export async function updateMockScore(id, updates) {
  const state = readJSON();
  const index = state.mockScores.findIndex((m) => m._id === id);
  if (index === -1) throw new Error(`Mock score ${id} not found`);

  const existing = state.mockScores[index];
  const updated = {
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

export async function deleteMockScore(id) {
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

export async function getActivity(filters) {
  const state = readJSON();
  let acts = [...state.activities];

  if (filters?.kind && filters.kind !== 'all') {
    acts = acts.filter((a) => a.kind === filters.kind);
  }
  if (filters?.from) acts = acts.filter((a) => a.date >= filters.from);
  if (filters?.to) acts = acts.filter((a) => a.date <= filters.to);

  acts.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return acts;
}

export async function getAnalyticsSummary() {
  const today = getTodayColombo();
  const state = readJSON();
  const weeks = await getRoadmapWeeks();
  const logs = [...state.logs].sort((a, b) => a.date.localeCompare(b.date));

  const weeklyMinutes = [];
  const weeklySkillMinutes = [];

  for (const week of weeks) {
    const weekLogs = logs.filter((l) => l.date >= week.startDate && l.date <= week.endDate);
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
    weeklyMinutes.push({ weekLabel: label, totalMinutes: total, startDate: week.startDate });
    weeklySkillMinutes.push({ weekLabel: label, grammar: g, speaking: sp, listening: lis, reading: r, writing: w, vocab: v });
  }

  let wordsSum = 0;
  let sentencesSum = 0;
  const cumulativeWords = [];
  const cumulativeSentences = [];

  for (const log of logs) {
    wordsSum += log.newWords || 0;
    sentencesSum += log.sentencesWritten || 0;
    cumulativeWords.push({ date: log.date, words: log.newWords || 0, cumulative: wordsSum });
    cumulativeSentences.push({ date: log.date, sentences: log.sentencesWritten || 0, cumulative: sentencesSum });
  }

  const date7DaysAgo = addDays(today, -6);
  const date30DaysAgo = addDays(today, -29);
  let minutesLast7 = 0;
  let minutesLast30 = 0;

  for (const log of logs) {
    const mins = Object.values(log.minutes).reduce((acc, m) => acc + m, 0);
    if (log.date >= date7DaysAgo && log.date <= today) minutesLast7 += mins;
    if (log.date >= date30DaysAgo && log.date <= today) minutesLast30 += mins;
  }

  const avgMinutesLast7Days = Math.round((minutesLast7 / 7) * 10) / 10;
  const avgMinutesLast30Days = Math.round((minutesLast30 / 30) * 10) / 10;

  const mockScores = [...state.mockScores].sort((a, b) => a.date.localeCompare(b.date));
  let weakestSkill = null;
  if (mockScores.length > 0) {
    const latest = mockScores[mockScores.length - 1];
    const skills = [
      { skill: 'Speaking', score: latest.speaking },
      { skill: 'Writing', score: latest.writing },
      { skill: 'Reading', score: latest.reading },
      { skill: 'Listening', score: latest.listening },
    ];
    skills.sort((a, b) => a.score - b.score);
    weakestSkill = { skill: skills[0].skill, score: skills[0].score, label: latest.label };
  }

  const tagCounts = {};
  for (const log of logs) {
    for (const tag of log.weakPoints || []) {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed) tagCounts[trimmed] = (tagCounts[trimmed] || 0) + 1;
    }
  }

  const topWeakPoints = Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const loggedDates = new Set(logs.map((l) => l.date));
  let currentStreak = 0;
  let checkDate = today;

  if (!loggedDates.has(checkDate)) {
    const yesterday = addDays(today, -1);
    if (loggedDates.has(yesterday)) checkDate = yesterday;
  }

  while (loggedDates.has(checkDate)) {
    currentStreak++;
    checkDate = addDays(checkDate, -1);
  }

  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate = null;

  for (const log of logs) {
    if (!prevDate) {
      tempStreak = 1;
    } else {
      const expected = addDays(prevDate, 1);
      if (log.date === expected) {
        tempStreak++;
      } else if (log.date !== prevDate) {
        tempStreak = 1;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
    prevDate = log.date;
  }

  if (currentStreak > longestStreak) longestStreak = currentStreak;

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

export async function seedDatabase() {
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

  if (hasModified) writeJSON(state);

  if (isMongoActive()) {
    try {
      const countSettings = await SettingsModel.countDocuments();
      if (countSettings === 0) await SettingsModel.create(defaultSettings);
      const countWeeks = await RoadmapWeekModel.countDocuments();
      if (countWeeks === 0) await RoadmapWeekModel.insertMany(buildInitialRoadmapWeeks());
    } catch (e) {
      console.error('Mongo seedDatabase error:', e);
    }
  }
}

export async function resetDatabase() {
  const freshWeeks = buildInitialRoadmapWeeks();
  const freshSettings = { ...defaultSettings };
  const today = getTodayColombo();

  const resetState = {
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

export async function exportAllData() {
  return readJSON();
}

export async function importAllData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid import data format');
  }

  const newState = {
    settings: data.settings || { ...defaultSettings },
    roadmapWeeks: Array.isArray(data.roadmapWeeks) ? data.roadmapWeeks : buildInitialRoadmapWeeks(),
    logs: Array.isArray(data.logs) ? data.logs : [],
    notes: Array.isArray(data.notes) ? data.notes : [],
    mockScores: Array.isArray(data.mockScores) ? data.mockScores : [],
    activities: Array.isArray(data.activities) ? data.activities : [],
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
      await SettingsModel.create(newState.settings);
      if (newState.roadmapWeeks.length > 0) await RoadmapWeekModel.insertMany(newState.roadmapWeeks);
      if (newState.logs.length > 0) await DailyLogModel.insertMany(newState.logs);
      if (newState.notes.length > 0) await NoteModel.insertMany(newState.notes);
      if (newState.mockScores.length > 0) await MockScoreModel.insertMany(newState.mockScores);
      if (newState.activities.length > 0) await ActivityModel.insertMany(newState.activities);
    } catch (e) {
      console.error('Mongo import error:', e);
    }
  }

  await logActivity('log_saved', 'Imported data backup.');
}
