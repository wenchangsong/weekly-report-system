import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as teamService from '../services/teamService';

const router = Router();
router.use(authenticate);

// ---- Static routes (must come before /:id) ----

// Admin: reset all data
router.post('/reset', requireRole('admin'), (_req: Request, res: Response, next: NextFunction) => {
  try {
    teamService.resetAllData();
    res.json({ success: true });
  } catch (err: any) {
    console.error('[reset]', err.message, err.stack);
    next(err);
  }
});

// Admin: list all teams with stats
router.get('/all', requireRole('admin'), (_req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = teamService.getAllTeamsWithStats();
    res.json(teams);
  } catch (err) { next(err); }
});

// All team owners
router.get('/owners', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const owners = teamService.getAllTeamOwners();
    res.json(owners);
  } catch (err) { next(err); }
});

// Available teams to join
router.get('/available', (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = teamService.getAvailableTeams(req.user!.userId);
    res.json(teams);
  } catch (err) { next(err); }
});

// Team creation requests (admin only)
router.get('/requests/pending', requireRole('admin'), (_req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = teamService.getPendingTeamRequests();
    res.json(requests);
  } catch (err) { next(err); }
});

router.post('/requests', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { team_name } = req.body;
    if (!team_name || !team_name.trim()) {
      res.status(400).json({ error: '团队名称为必填项' });
      return;
    }
    const request = teamService.createTeamRequest(req.user!.userId, team_name.trim());
    res.status(201).json(request);
  } catch (err) { next(err); }
});

router.post('/requests/:id/approve', requireRole('admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    teamService.approveTeamRequest(Number(req.params.id), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/requests/:id/reject', requireRole('admin'), (req: Request, res: Response, next: NextFunction) => {
  try {
    teamService.rejectTeamRequest(Number(req.params.id), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Join request approve/reject
router.post('/join-requests/:id/approve', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = teamService.approveJoinRequest(Number(req.params.id), req.user!.userId);
    console.log(`[JOIN APPROVE] request=${req.params.id} team=${result.team_id} user=${result.user_id} by=${req.user!.userId}`);
    res.json(result);
  } catch (err: any) {
    console.log(`[JOIN APPROVE FAIL] request=${req.params.id} error=${err.message}`);
    res.status(400).json({ error: err.message });
  }
});

router.post('/join-requests/:id/reject', (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = teamService.rejectJoinRequest(Number(req.params.id), req.user!.userId);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ---- My teams ----
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const teams = teamService.getMyTeams(req.user!.userId);
    res.json(teams);
  } catch (err) { next(err); }
});

// ---- /:id routes ----

// Team detail + members
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const teamId = Number(req.params.id);
    if (!teamService.isUserInTeam(req.user!.userId, teamId)) {
      res.status(403).json({ error: '你不是该团队成员' });
      return;
    }
    const team = teamService.getTeamById(teamId);
    const members = teamService.getTeamMembers(teamId);
    res.json({ team, members });
  } catch (err) { next(err); }
});

// Request to join a team
router.post('/:id/join', (req: Request, res: Response, next: NextFunction) => {
  try {
    const request = teamService.requestJoinTeam(Number(req.params.id), req.user!.userId);
    res.status(201).json(request);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Members without report this week
router.get('/:id/members-without-report', (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = teamService.getMembersWithoutReport(Number(req.params.id));
    res.json(members);
  } catch (err) { next(err); }
});

// Team owner: get join requests
router.get('/:id/join-requests', (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = teamService.getJoinRequests(Number(req.params.id));
    res.json(requests);
  } catch (err) { next(err); }
});

// Remove member
router.delete('/:id/members/:userId', (req: Request, res: Response, next: NextFunction) => {
  try {
    teamService.removeMember(Number(req.params.id), Number(req.params.userId), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Leave team
router.post('/:id/leave', (req: Request, res: Response, next: NextFunction) => {
  try {
    teamService.leaveTeam(Number(req.params.id), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete team
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = req.user!.role === 'admin';
    teamService.deleteTeam(Number(req.params.id), req.user!.userId, isAdmin);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
