import cors from 'cors';
import express from 'express';
import { config } from './config';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './routes/auth';
import { dashboardRouter } from './routes/dashboard';
import { projectsRouter } from './routes/projects';
import { tasksRouter } from './routes/tasks';

export const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/tasks', tasksRouter);

app.use(notFound);
app.use(errorHandler);
