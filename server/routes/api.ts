import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
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

// Auth status
apiRouter.get('/auth/status', (_req: Request, res: Response) => {
  res.json({
    pinRequired: Boolean(process.env.APP_PIN?.trim()),
  });
});

// Verify PIN
apiRouter.post('/auth/verify', (req: Request, res: Response) => {
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

// Today metadata
apiRouter.get('/today', (_req: Request, res: Response) => {
  res.json({
    today: getTodayColombo(),
    timezone: 'Asia/Colombo',
    checkpoints: defaultCheckpointTargets,
  });
});

// Settings: GET/PUT /api/settings
apiRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

apiRouter.put('/settings', async (req: Request, res: Response) => {
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
    res.status(500).json({ error: (error as Error).message });
  }
});

// Roadmap: GET /api/roadmap
apiRouter.get('/roadmap', async (_req: Request, res: Response) => {
  try {
    const weeks = await getRoadmapWeeks();
    res.json(weeks);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Roadmap: PATCH /api/roadmap/:weekId/topics/:topicId
apiRouter.patch('/roadmap/:weekId/topics/:topicId', async (req: Request, res: Response) => {
  try {
    const { weekId, topicId } = req.params;
    const { done, text } = req.body;
    const week = await updateTopic(weekId, topicId, { done, text });
    res.json(week);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Roadmap: POST /api/roadmap/:weekId/topics
apiRouter.post('/roadmap/:weekId/topics', async (req: Request, res: Response) => {
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
    res.status(400).json({ error: (error as Error).message });
  }
});

// Roadmap: DELETE /api/roadmap/:weekId/topics/:topicId
apiRouter.delete('/roadmap/:weekId/topics/:topicId', async (req: Request, res: Response) => {
  try {
    const { weekId, topicId } = req.params;
    const week = await deleteTopic(weekId, topicId);
    res.json(week);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Roadmap: POST /api/roadmap/shift
apiRouter.post('/roadmap/shift', async (req: Request, res: Response) => {
  try {
    const { startWeekNo, days } = req.body;
    if (startWeekNo === undefined || days === undefined) {
      res.status(400).json({ error: 'startWeekNo and days are required' });
      return;
    }
    const numDays = parseInt(days, 10);
    if (isNaN(numDays) || numDays === 0) {
      res.status(400).json({ error: 'days must be a non-zero integer' });
      return;
    }
    const weeks = await shiftRoadmap(startWeekNo, numDays);
    res.json(weeks);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Daily Logs: GET /api/logs?from=&to=
apiRouter.get('/logs', async (req: Request, res: Response) => {
  try {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const logs = await getDailyLogs(from, to);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Daily Logs: GET /api/logs/:date
apiRouter.get('/logs/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
      return;
    }
    const log = await getDailyLogByDate(date);
    if (!log) {
      res.status(404).json({ error: 'Log not found for this date' });
      return;
    }
    res.json(log);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Daily Logs: PUT /api/logs/:date (upsert)
apiRouter.put('/logs/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    if (!isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
      return;
    }
    const log = await upsertDailyLog(date, req.body);
    res.json(log);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Daily Logs: DELETE /api/logs/:date
apiRouter.delete('/logs/:date', async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const deleted = await deleteDailyLog(date);
    res.json({ success: deleted });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Notes: GET /api/notes
apiRouter.get('/notes', async (req: Request, res: Response) => {
  try {
    const skill = req.query.skill as string | undefined;
    const tag = req.query.tag as string | undefined;
    const search = req.query.search as string | undefined;
    let pinned: boolean | undefined = undefined;
    if (req.query.pinned === 'true') pinned = true;
    if (req.query.pinned === 'false') pinned = false;

    const notes = await getNotes({ skill, tag, pinned, search });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Notes: POST /api/notes
apiRouter.post('/notes', async (req: Request, res: Response) => {
  try {
    const { date, title, body, skill, tags, pinned } = req.body;
    if (!body || !body.trim()) {
      res.status(400).json({ error: 'Note body is required' });
      return;
    }
    if (body.trim().length > 1000) {
      res.status(400).json({ error: 'Note body cannot exceed 1000 characters' });
      return;
    }
    if (date && !isValidDateFormat(date)) {
      res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD.' });
      return;
    }

    const note = await addNote({
      date,
      title,
      body,
      skill,
      tags,
      pinned,
    });
    res.status(201).json(note);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Notes: PATCH /api/notes/:id
apiRouter.patch('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const note = await updateNote(id, req.body);
    res.json(note);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Notes: DELETE /api/notes/:id
apiRouter.delete('/notes/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteNote(id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Mock Scores: GET /api/mocks
apiRouter.get('/mocks', async (_req: Request, res: Response) => {
  try {
    const mocks = await getMockScores();
    res.json(mocks);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Mock Scores: POST /api/mocks
apiRouter.post('/mocks', async (req: Request, res: Response) => {
  try {
    const { date, type, label, overall, speaking, writing, reading, listening, notes } = req.body;
    if (!date || !isValidDateFormat(date)) {
      res.status(400).json({ error: 'Valid date (YYYY-MM-DD) is required' });
      return;
    }
    if (!label || !label.trim()) {
      res.status(400).json({ error: 'Label is required (e.g. Mock 1)' });
      return;
    }
    if (!['diagnostic', 'checkpoint', 'mock', 'exam'].includes(type)) {
      res.status(400).json({ error: 'Invalid mock type' });
      return;
    }

    const score = await addMockScore({
      date,
      type,
      label,
      overall: Number(overall),
      speaking: Number(speaking),
      writing: Number(writing),
      reading: Number(reading),
      listening: Number(listening),
      notes: notes || '',
    });
    res.status(201).json(score);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Mock Scores: PATCH /api/mocks/:id
apiRouter.patch('/mocks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const score = await updateMockScore(id, req.body);
    res.json(score);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Mock Scores: DELETE /api/mocks/:id
apiRouter.delete('/mocks/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await deleteMockScore(id);
    res.json({ success: deleted });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Analytics: GET /api/analytics/summary
apiRouter.get('/analytics/summary', async (_req: Request, res: Response) => {
  try {
    const summary = await getAnalyticsSummary();
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// History: GET /api/activity?kind=&from=&to=
apiRouter.get('/activity', async (req: Request, res: Response) => {
  try {
    const kind = req.query.kind as string | undefined;
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const activities = await getActivity({ kind, from, to });
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export: GET /api/export
apiRouter.get('/export', async (_req: Request, res: Response) => {
  try {
    const data = await exportAllData();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="pte_tracker_backup.json"');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Export: GET /api/export/markdown
apiRouter.get('/export/markdown', async (_req: Request, res: Response) => {
  try {
    const data = await exportAllData();
    const today = getTodayColombo();

    let md = `# PTE Tracker Summary (Exported on ${today})\n\n`;
    md += `## Target Overview\n`;
    md += `- Exam Date: ${data.settings.examDate}\n`;
    md += `- Buffer End Date: ${data.settings.bufferEndDate}\n`;
    md += `- Minimum Score Target: ${data.settings.minScore}\n`;
    md += `- Stretch Score Target: ${data.settings.targetScore}\n`;
    md += `- Minimum Skill Score: ${data.settings.minSkillScore}\n`;
    md += `- Daily Goal: ${data.settings.dailyGoalMinutes} minutes\n\n`;

    md += `## Roadmap Progress\n`;
    for (const week of data.roadmapWeeks) {
      const doneCount = week.topics.filter((t) => t.done).length;
      md += `### Week ${week.weekNo} (${week.phase}): ${week.startDate} to ${week.endDate} [${doneCount}/${week.topics.length} done]\n`;
      for (const t of week.topics) {
        md += `- [${t.done ? 'x' : ' '}] ${t.text}${t.doneAt ? ` (Completed: ${t.doneAt})` : ''}\n`;
      }
      md += `\n`;
    }

    md += `## Mock Scores\n`;
    if (data.mockScores.length === 0) {
      md += `No mock tests recorded yet.\n\n`;
    } else {
      md += `| Date | Label | Type | Overall | Speaking | Writing | Reading | Listening | Notes |\n`;
      md += `|---|---|---|---|---|---|---|---|---|\n`;
      for (const m of data.mockScores) {
        md += `| ${m.date} | ${m.label} | ${m.type} | ${m.overall} | ${m.speaking} | ${m.writing} | ${m.reading} | ${m.listening} | ${m.notes.replace(/\n/g, ' ')} |\n`;
      }
      md += `\n`;
    }

    md += `## Study Notes\n`;
    if (data.notes.length === 0) {
      md += `No notes recorded yet.\n\n`;
    } else {
      for (const n of data.notes) {
        md += `### ${n.title ? n.title : 'Untitled Note'} (${n.date} - ${n.skill})\n`;
        if (n.tags && n.tags.length > 0) {
          md += `Tags: ${n.tags.join(', ')}\n\n`;
        }
        md += `${n.body}\n\n`;
      }
    }

    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader('Content-Disposition', 'attachment; filename="pte_tracker_summary.md"');
    res.send(md);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Download ZIP: GET /api/download-zip
apiRouter.get('/download-zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(process.cwd(), 'pte-tracker.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="pte-tracker.zip"');
    res.sendFile(zipPath);
  } else {
    res.status(404).json({ error: 'Zip file not found' });
  }
});

// Import: POST /api/import
apiRouter.post('/import', async (req: Request, res: Response) => {
  try {
    await importAllData(req.body);
    res.json({ success: true, message: 'Data imported successfully' });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// Reset: POST /api/reset
apiRouter.post('/reset', async (_req: Request, res: Response) => {
  try {
    await resetDatabase();
    res.json({ success: true, message: 'Database reset to initial roadmap and settings' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});
