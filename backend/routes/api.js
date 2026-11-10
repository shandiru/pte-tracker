import { Router } from 'express';
import {
  getSettings,
  updateSettings,
  getRoadmapWeeks,
  updateTopic,
  addTopic,
  deleteTopic,
  shiftRoadmap,
  getDailyLogs,
  getDailyLogByDate,
  upsertDailyLog,
  deleteDailyLog,
  getNotes,
  addNote,
  updateNote,
  deleteNote,
  getMockScores,
  addMockScore,
  updateMockScore,
  deleteMockScore,
  getActivity,
  getAnalyticsSummary,
  exportAllData,
  importAllData,
  resetDatabase,
} from '../storage.js';
import { getTodayColombo, isValidDateFormat } from '../dateUtils.js';
import { defaultCheckpointTargets } from '../seedData.js';

export const apiRouter = Router();

apiRouter.get('/auth/status', (_req, res) => {
  res.json({
    pinRequired: Boolean(process.env.APP_PIN?.trim()),
  });
});

apiRouter.post('/auth/verify', (req, res) => {
  const configuredPin = process.env.APP_PIN?.trim();
  if (!configuredPin) {
    res.json({ success: true, message: 'No PIN configured' });
    return;
  }
  const { pin } = req.body;
  if (pin && String(pin).trim() === configuredPin) {
    res.json({ success: true });
    return;
  }
  res.status(401).json({ error: 'Incorrect PIN' });
});

apiRouter.get('/today', (_req, res) => {
  res.json({
    today: getTodayColombo(),
    timezone: 'Asia/Colombo',
    checkpoints: defaultCheckpointTargets,
  });
});

apiRouter.get('/settings', async (_req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/settings', async (req, res) => {
  try {
    const { examDate, bufferEndDate, minScore, targetScore, minSkillScore, dailyGoalMinutes } = req.body;
    if (examDate && !isValidDateFormat(examDate)) {
      res.status(400).json({ error: 'Invalid examDate format. Expected YYYY-MM-DD.' });
      return;
    }
    if (bufferEndDate && !isValidDateFormat(bufferEndDate)) {
      res.status(400).json({ error: 'Invalid bufferEndDate format. Expected YYYY-MM-DD.' });
      return;
    }

    const updated = await updateSettings({
      ...(examDate ? { examDate } : {}),
      ...(bufferEndDate ? { bufferEndDate } : {}),
      ...(minScore !== undefined ? { minScore: Number(minScore) } : {}),
      ...(targetScore !== undefined ? { targetScore: Number(targetScore) } : {}),
      ...(minSkillScore !== undefined ? { minSkillScore: Number(minSkillScore) } : {}),
      ...(dailyGoalMinutes !== undefined ? { dailyGoalMinutes: Number(dailyGoalMinutes) } : {}),
    });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/roadmap', async (_req, res) => {
  try {
    const weeks = await getRoadmapWeeks();
    res.json(weeks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.patch('/roadmap/:weekId/topics/:topicId', async (req, res) => {
  try {
    const { weekId, topicId } = req.params;
    const { done, text } = req.body;
    const week = await updateTopic(weekId, topicId, { done, text });
    res.json(week);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.post('/roadmap/:weekId/topics', async (req, res) => {
  try {
    const { weekId } = req.params;
    const { text } = req.body;
    if (!text || !text.trim()) {
      res.status(400).json({ error: 'Topic text is required' });
      return;
    }
    const week = await addTopic(weekId, text);
    res.status(201).json(week);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/roadmap/:weekId/topics/:topicId', async (req, res) => {
  try {
    const { weekId, topicId } = req.params;
    const week = await deleteTopic(weekId, topicId);
    res.json(week);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.post('/roadmap/shift', async (req, res) => {
  try {
    const { startWeekNo, days } = req.body;
    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays === 0) {
      res.status(400).json({ error: 'days must be a non-zero integer' });
      return;
    }
    const weeks = await shiftRoadmap(startWeekNo, numDays);
    res.json(weeks);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.get('/logs', async (req, res) => {
  try {
    const { from, to } = req.query;
    const logs = await getDailyLogs(from, to);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const log = await getDailyLogByDate(date);
    if (!log) {
      res.status(404).json({ error: 'Log not found' });
      return;
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.put('/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const log = await upsertDailyLog(date, req.body);
    res.json(log);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/logs/:date', async (req, res) => {
  try {
    const { date } = req.params;
    const deleted = await deleteDailyLog(date);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/notes', async (req, res) => {
  try {
    const { skill, tag, search, pinned } = req.query;
    let isPinned;
    if (pinned === 'true') isPinned = true;
    if (pinned === 'false') isPinned = false;
    const notes = await getNotes({ skill, tag, search, pinned: isPinned });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/notes', async (req, res) => {
  try {
    const { date, title, body, skill, tags, pinned } = req.body;
    if (!body || !body.trim()) {
      res.status(400).json({ error: 'Note body is required' });
      return;
    }
    const note = await addNote({ date, title, body, skill, tags, pinned });
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.patch('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const note = await updateNote(id, req.body);
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/notes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteNote(id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.get('/mocks', async (_req, res) => {
  try {
    const mocks = await getMockScores();
    res.json(mocks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/mocks', async (req, res) => {
  try {
    const { date, type, label, overall, speaking, writing, reading, listening, notes } = req.body;
    if (!date || !label) {
      res.status(400).json({ error: 'Date and label are required' });
      return;
    }
    const score = await addMockScore({ date, type, label, overall, speaking, writing, reading, listening, notes });
    res.status(201).json(score);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.patch('/mocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const score = await updateMockScore(id, req.body);
    res.json(score);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.delete('/mocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMockScore(id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.get('/analytics/summary', async (_req, res) => {
  try {
    const summary = await getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/activity', async (req, res) => {
  try {
    const { kind, from, to } = req.query;
    const activities = await getActivity({ kind, from, to });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/export', async (_req, res) => {
  try {
    const data = await exportAllData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="pte_tracker_backup.json"');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.get('/export/markdown', async (_req, res) => {
  try {
    const data = await exportAllData();
    const today = getTodayColombo();
    let md = `# PTE Tracker Summary (Exported on ${today})\n\n`;
    md += `## Target Overview\n- Exam Date: ${data.settings.examDate}\n- Buffer End: ${data.settings.bufferEndDate}\n- Min Target: ${data.settings.minScore}\n- Stretch: ${data.settings.targetScore}\n\n`;
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="pte_tracker_summary.md"');
    res.send(md);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/import', async (req, res) => {
  try {
    await importAllData(req.body);
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

apiRouter.post('/reset', async (_req, res) => {
  try {
    await resetDatabase();
    res.json({ success: true, message: 'Database reset to initial roadmap and settings' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
