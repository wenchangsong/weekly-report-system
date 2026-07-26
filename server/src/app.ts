import express from 'express';
import cors from 'cors';
import path from 'path';
import { runMigrations } from './db/migrate';
import routes from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startReminderJobs } from './jobs/reminderCron';

export function createApp() {
  runMigrations();
  startReminderJobs();

  const app = express();

  app.use(cors());
  app.use(express.json());

  // Serve uploaded files (from UPLOAD_DIR env or local data dir)
  const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'data', 'uploads');
  app.use('/uploads', express.static(uploadDir));

  app.use('/api', routes);

  // Serve built frontend in production
  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
