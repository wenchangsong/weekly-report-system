import { Router } from 'express';
import authRouter from './auth';
import usersRouter from './users';
import reportsRouter from './reports';
import commentsRouter from './comments';
import remindersRouter from './reminders';
import teamsRouter from './teams';
import uploadRouter from './upload';

const router = Router();

router.use('/auth', authRouter);
router.use('/users', usersRouter);
router.use('/reports', reportsRouter);
router.use('/', commentsRouter);
router.use('/reminders', remindersRouter);
router.use('/teams', teamsRouter);
router.use('/upload', uploadRouter);

export default router;
