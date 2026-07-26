import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as authService from '../services/authService';

const router = Router();

router.post('/register', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, email, password, supervisor_id } = req.body;
    if (!username || !email || !password) {
      res.status(400).json({ error: '用户名、邮箱和密码为必填项' });
      return;
    }
    const result = authService.registerUser({ username, email, password, supervisorId: supervisor_id });
    res.status(201).json(result);
  } catch (err: any) {
    if (err.message === '用户名或邮箱已存在') {
      res.status(409).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

router.post('/login', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: '邮箱和密码为必填项' });
      return;
    }
    const result = authService.loginUser(email, password);
    res.json(result);
  } catch (err: any) {
    if (err.message === '邮箱或密码错误') {
      res.status(401).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

router.get('/me', authenticate, (req: Request, res: Response) => {
  const user = authService.getUserById(req.user!.userId);
  if (!user) {
    res.status(404).json({ error: '用户不存在' });
    return;
  }
  res.json(user);
});

export default router;
