import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import * as reminderService from '../services/reminderService';

const router = Router();
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/', (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reminders = reminderService.listReminders();
    res.json(reminders);
  } catch (err) { next(err); }
});

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { cron_expression, enabled, title, message_template } = req.body;
    if (!cron_expression || !title || !message_template) {
      res.status(400).json({ error: 'cron_expression、title 和 message_template 为必填项' });
      return;
    }
    const reminder = reminderService.createReminder({
      cronExpression: cron_expression,
      enabled: enabled !== false,
      title,
      messageTemplate: message_template,
    });
    res.status(201).json(reminder);
  } catch (err) { next(err); }
});

router.put('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const reminder = reminderService.updateReminder(Number(req.params.id), req.body);
    if (!reminder) {
      res.status(404).json({ error: '提醒不存在' });
      return;
    }
    res.json(reminder);
  } catch (err) { next(err); }
});

router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    reminderService.deleteReminder(Number(req.params.id));
    res.status(204).send();
  } catch (err) { next(err); }
});

export default router;
