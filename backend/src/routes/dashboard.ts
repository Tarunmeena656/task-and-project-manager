import { Router } from 'express';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth);

dashboardRouter.get('/', async (req, res, next) => {
  try {
    const ownTasks = { project: { userId: req.userId } };
    const [projects, totalTasks, completedTasks] = await Promise.all([
      prisma.project.findMany({
        where: { userId: req.userId },
        include: { _count: { select: { tasks: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.task.count({ where: ownTasks }),
      prisma.task.count({ where: { ...ownTasks, status: 'DONE' } }),
    ]);
    res.json({
      projects,
      totalProjects: projects.length,
      totalTasks,
      pendingTasks: totalTasks - completedTasks,
      completedTasks,
    });
  } catch (err) {
    next(err);
  }
});
