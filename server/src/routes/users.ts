import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import db from '../db/connection';
import { authenticate, requireRole } from '../middleware/auth';
import * as userService from '../services/userService';
import * as srService from '../services/supervisorRequestService';
import { UserRow } from '../types';

const router = Router();

// Public route - for registration supervisor picker
router.get('/supervisors', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.getSupervisors();
    res.json(users);
  } catch (err) { next(err); }
});

// Protected routes
router.use(authenticate);

router.get('/', requireRole('admin', 'manager'), (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.listUsers();
    res.json(users);
  } catch (err) { next(err); }
});

router.get('/subordinates', requireRole('admin', 'manager'), (req: Request, res: Response, next: NextFunction) => {
  try {
    const users = userService.getSubordinates(req.user!.userId);
    res.json(users);
  } catch (err) { next(err); }
});

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (req.user!.userId !== id && req.user!.role !== 'admin') {
      res.status(403).json({ error: '只能修改自己的信息' });
      return;
    }

    // If changing password, verify old password
    if (req.body.password) {
      if (!req.body.old_password) {
        res.status(400).json({ error: '修改密码需要提供旧密码' });
        return;
      }
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow;
      if (!user || !bcrypt.compareSync(req.body.old_password, user.password_hash)) {
        res.status(400).json({ error: '旧密码不正确' });
        return;
      }
    }

    const user = userService.updateUser(id, req.body);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }
    res.json(user);
  } catch (err) { next(err); }
});

// Supervisor request routes
router.get('/supervisor-requests', (req: Request, res: Response, next: NextFunction) => {
  try {
    const requests = srService.getPendingRequests(req.user!.userId);
    res.json(requests);
  } catch (err) { next(err); }
});

router.get('/supervisor-requests/count', (req: Request, res: Response, next: NextFunction) => {
  try {
    const count = srService.getPendingRequestCount(req.user!.userId);
    res.json({ count });
  } catch (err) { next(err); }
});

router.post('/supervisor-requests/:id/approve', (req: Request, res: Response, next: NextFunction) => {
  try {
    srService.approveRequest(Number(req.params.id), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/supervisor-requests/:id/reject', (req: Request, res: Response, next: NextFunction) => {
  try {
    srService.rejectRequest(Number(req.params.id), req.user!.userId);
    res.json({ success: true });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
