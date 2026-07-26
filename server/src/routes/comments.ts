import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as commentService from '../services/commentService';

const router = Router();
router.use(authenticate);

router.get('/reports/:reportId/comments', (req: Request, res: Response, next: NextFunction) => {
  try {
    const comments = commentService.getComments(Number(req.params.reportId));
    res.json(comments);
  } catch (err) { next(err); }
});

router.post('/reports/:reportId/comments', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: '评论内容不能为空' });
      return;
    }
    const comment = commentService.createComment(Number(req.params.reportId), req.user!.userId, content.trim());
    res.status(201).json(comment);
  } catch (err) { next(err); }
});

router.delete('/comments/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    commentService.deleteComment(Number(req.params.id), req.user!.userId);
    res.status(204).send();
  } catch (err: any) {
    if (err.message === '评论不存在' || err.message === '只能删除自己的评论') {
      res.status(400).json({ error: err.message });
    } else {
      next(err);
    }
  }
});

export default router;
