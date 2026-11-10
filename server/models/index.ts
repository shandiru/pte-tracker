import mongoose, { Schema } from 'mongoose';
import {
  ISettings,
  IRoadmapWeek,
  IDailyLog,
  INote,
  IMockScore,
  IActivity,
} from '../types.js';

const SettingsSchema = new Schema<ISettings>({
  examDate: { type: String, required: true, default: '2027-03-30' },
  bufferEndDate: { type: String, required: true, default: '2027-04-12' },
  minScore: { type: Number, required: true, default: 58 },
  targetScore: { type: Number, required: true, default: 70 },
  minSkillScore: { type: Number, required: true, default: 50 },
  dailyGoalMinutes: { type: Number, required: true, default: 105 },
}, { timestamps: true });

const RoadmapTopicSchema = new Schema({
  _id: { type: String, required: true },
  text: { type: String, required: true },
  done: { type: Boolean, default: false },
  doneAt: { type: String, default: null },
});

const RoadmapWeekSchema = new Schema<IRoadmapWeek>({
  _id: { type: String, required: true },
  weekNo: { type: Schema.Types.Mixed, required: true },
  startDate: { type: String, required: true },
  endDate: { type: String, required: true },
  phase: {
    type: String,
    enum: ['Foundation', 'Grammar Core', 'PTE Skills', 'Mock Phase', 'Exam', 'Buffer'],
    required: true,
  },
  title: { type: String, required: true },
  topics: [RoadmapTopicSchema],
  status: {
    type: String,
    enum: ['upcoming', 'current', 'done', 'missed'],
    default: 'upcoming',
  },
  shiftedByDays: { type: Number, default: 0 },
}, { timestamps: true });

const DailyLogSchema = new Schema<IDailyLog>({
  date: { type: String, required: true, unique: true },
  minutes: {
    grammar: { type: Number, default: 0 },
    speaking: { type: Number, default: 0 },
    listening: { type: Number, default: 0 },
    reading: { type: Number, default: 0 },
    writing: { type: Number, default: 0 },
    vocab: { type: Number, default: 0 },
  },
  newWords: { type: Number, default: 0 },
  sentencesWritten: { type: Number, default: 0 },
  habits: {
    readAloud: { type: Boolean, default: false },
    shadowing: { type: Boolean, default: false },
    journal: { type: Boolean, default: false },
    vocab: { type: Boolean, default: false },
  },
  weakPoints: { type: [String], default: [] },
  note: { type: String, maxlength: 300, default: '' },
}, { timestamps: true });

const NoteSchema = new Schema<INote>({
  _id: { type: String, required: true },
  date: { type: String, required: true },
  title: { type: String, default: '' },
  body: { type: String, required: true, maxlength: 1000 },
  skill: {
    type: String,
    enum: ['grammar', 'speaking', 'listening', 'reading', 'writing', 'vocab', 'general'],
    default: 'general',
  },
  tags: { type: [String], default: [] },
  pinned: { type: Boolean, default: false },
  createdAt: { type: String, required: true },
}, { timestamps: true });

const MockScoreSchema = new Schema<IMockScore>({
  _id: { type: String, required: true },
  date: { type: String, required: true },
  type: {
    type: String,
    enum: ['diagnostic', 'checkpoint', 'mock', 'exam'],
    required: true,
  },
  label: { type: String, required: true },
  overall: { type: Number, required: true, min: 10, max: 90 },
  speaking: { type: Number, required: true, min: 10, max: 90 },
  writing: { type: Number, required: true, min: 10, max: 90 },
  reading: { type: Number, required: true, min: 10, max: 90 },
  listening: { type: Number, required: true, min: 10, max: 90 },
  notes: { type: String, default: '' },
}, { timestamps: true });

const ActivitySchema = new Schema<IActivity>({
  _id: { type: String, required: true },
  date: { type: String, required: true },
  timestamp: { type: String, required: true },
  kind: {
    type: String,
    enum: ['log_saved', 'topic_done', 'topic_undone', 'note_added', 'mock_added', 'roadmap_shifted'],
    required: true,
  },
  summary: { type: String, required: true },
});

export const SettingsModel = mongoose.models.Settings || mongoose.model<ISettings>('Settings', SettingsSchema);
export const RoadmapWeekModel = mongoose.models.RoadmapWeek || mongoose.model<IRoadmapWeek>('RoadmapWeek', RoadmapWeekSchema);
export const DailyLogModel = mongoose.models.DailyLog || mongoose.model<IDailyLog>('DailyLog', DailyLogSchema);
export const NoteModel = mongoose.models.Note || mongoose.model<INote>('Note', NoteSchema);
export const MockScoreModel = mongoose.models.MockScore || mongoose.model<IMockScore>('MockScore', MockScoreSchema);
export const ActivityModel = mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);
