import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { validate } from '../middleware/validate';
import { createTaskSchema, listTasks, taskQuerySchema } from './tasks';

const projectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).default(''),
  status: z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']).default('ACTIVE'),
});

const withTaskCount = { _count: { select: { tasks: true } } };

export async function findOwnProject(id: string, userId: string) {
  const project = await prisma.project.findFirst({ where: { id, userId }, include: withTaskCount });
  if (!project) {
    throw new HttpError(404, 'Project not found');
  }
  return project;
}

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

projectsRouter.get('/', async (req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      where: { userId: req.userId },
      include: withTaskCount,
      orderBy: { createdAt: 'desc' },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/', validate(projectSchema), async (req, res, next) => {
  try {
    const project = await prisma.project.create({
      data: { ...req.body, userId: req.userId },
      include: withTaskCount,
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await findOwnProject(req.params.id, req.userId));
  } catch (err) {
    next(err);
  }
});

projectsRouter.put('/:id', validate(projectSchema), async (req, res, next) => {
  try {
    await findOwnProject(req.params.id, req.userId);
    const project = await prisma.project.update({
      where: { id: req.params.id },
      data: req.body,
      include: withTaskCount,
    });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

projectsRouter.delete('/:id', async (req, res, next) => {
  try {
    await findOwnProject(req.params.id, req.userId);
    await prisma.project.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

projectsRouter.get('/:id/tasks', validate(taskQuerySchema, 'query'), async (req, res, next) => {
  try {
    await findOwnProject(req.params.id, req.userId);
    res.json(await listTasks(req.params.id, res.locals.query));
  } catch (err) {
    next(err);
  }
});

projectsRouter.post('/:id/tasks', validate(createTaskSchema), async (req, res, next) => {
  try {
    await findOwnProject(req.params.id, req.userId);
    const task = await prisma.task.create({ data: { ...req.body, projectId: req.params.id } });
    res.status(201).json(task);
  } catch (err) {
    next(err);
  }
});
