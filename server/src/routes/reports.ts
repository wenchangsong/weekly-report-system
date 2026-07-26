import { Router, Request, Response, NextFunction } from 'express';
import db from '../db/connection';
import { authenticate } from '../middleware/auth';
import * as reportService from '../services/reportService';
import { buildExportWorkbook } from '../services/exportService';

const router = Router();

function isReviewerTeamOwner(reviewerId: number, reportId: number): boolean {
  const row = db.prepare(`
    SELECT 1 FROM reports r
    JOIN team_members tm ON r.team_id = tm.team_id
      AND tm.user_id = ? AND tm.role = 'owner'
    WHERE r.id = ?
  `).get(reviewerId, reportId);
  return !!row;
}
router.use(authenticate);

router.get('/export', (req: Request, res: Response, next: NextFunction) => {
  try {
    const workbook = buildExportWorkbook({
      weekStart: req.query.week_start as string,
      weekEnd: req.query.week_end as string,
      userId: req.query.user_id ? Number(req.query.user_id) : undefined,
      teamId: req.query.team_id ? Number(req.query.team_id) : undefined,
      status: req.query.status as string,
      viewerId: req.user!.userId,
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="weekly-reports-${Date.now()}.xlsx"`);
    workbook.xlsx.write(res).then(() => res.end());
  } catch (err) { next(err); }
});

router.get('/stats', (req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = reportService.getReportStats(req.user!.userId);
    res.json(stats);
  } catch (err) { next(err); }
});

router.get('/week-range', (req: Request, res: Response) => {
  const range = reportService.getWeekRange(req.query.date as string);
  res.json(range);
});

router.post('/:id/reject', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role === 'member') {
      res.status(403).json({ error: '仅管理员和团队负责人可以审核' });
      return;
    }
    if (req.user!.role !== 'admin' && !isReviewerTeamOwner(req.user!.userId, Number(req.params.id))) {
      res.status(403).json({ error: '只能审核自己团队成员的周报' });
      return;
    }
    const report = reportService.rejectReport(Number(req.params.id), req.user!.userId);
    res.json(report);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:id/review', (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.user!.role === 'member') {
      res.status(403).json({ error: '仅管理员和团队负责人可以审核' });
      return;
    }
    if (req.user!.role !== 'admin' && !isReviewerTeamOwner(req.user!.userId, Number(req.params.id))) {
      res.status(403).json({ error: '只能审核自己团队成员的周报' });
      return;
    }
    const report = reportService.reviewReport(Number(req.params.id), req.user!.userId);
    res.json(report);
  } catch (err: any) {
    if (err.message === '周报不存在' || err.message === '只能审核已提交的周报') {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

router.post('/:id/retract', (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = reportService.retractReport(Number(req.params.id), req.user!.userId);
    res.json(report);
  } catch (err: any) {
    if (err.message === '周报不存在' || err.message === '只能撤回已提交的周报' || err.message === '已审核的周报不可撤回') {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters: any = {
      weekStart: req.query.week_start as string,
      weekEnd: req.query.week_end as string,
      status: req.query.status as string,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      offset: req.query.offset ? Number(req.query.offset) : undefined,
      teamId: req.query.team_id ? Number(req.query.team_id) : undefined,
      viewerId: req.user!.userId,
    };

    if (req.query.user_id) {
      filters.userId = Number(req.query.user_id);
    } else if (req.user!.role === 'member' && !filters.teamId) {
      filters.userId = req.user!.userId;
    }

    if (filters.teamId && !db.prepare(
      'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(filters.teamId, req.user!.userId)) {
      res.status(403).json({ error: '你不是该团队成员' });
      return;
    }

    if (req.query.my_subordinates === 'true' && req.user!.role !== 'member') {
      filters.supervisorId = req.user!.userId;
    }

    const result = reportService.listReports(filters);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = reportService.getReportById(Number(req.params.id), req.user!.userId);
    if (!report) {
      res.status(404).json({ error: '周报不存在' });
      return;
    }
    res.json(report);
  } catch (err) { next(err); }
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { week_start, week_end, work_done, plan_next, issues, status, team_id } = req.body;
    if (!week_start || !week_end) {
      res.status(400).json({ error: '周报起止日期为必填项' });
      return;
    }
    if (team_id && !db.prepare(
      'SELECT 1 FROM team_members WHERE team_id = ? AND user_id = ?'
    ).get(team_id, req.user!.userId)) {
      res.status(403).json({ error: '你不是该团队成员' });
      return;
    }
    const id = reportService.createReport({
      userId: req.user!.userId,
      weekStart: week_start,
      weekEnd: week_end,
      workDone: work_done || '',
      planNext: plan_next || '',
      issues: issues || '',
      status,
      teamId: team_id || null,
    });
    res.status(201).json({ id });
  } catch (err) { next(err); }
});

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const report = reportService.updateReport(Number(req.params.id), req.user!.userId, req.body);
    if (!report) {
      res.status(404).json({ error: '周报不存在' });
      return;
    }
    res.json(report);
  } catch (err: any) {
    if (err.message === '已提交的周报不可编辑') {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    reportService.deleteReport(Number(req.params.id), req.user!.userId);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === '周报不存在' || err.message === '无权删除该周报') {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

export default router;
