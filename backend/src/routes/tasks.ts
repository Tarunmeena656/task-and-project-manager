import { Prisma } from '@prisma/client';
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { validate } from '../middleware/validate';

const dateOnly = z.iso.date().transform((value) => new Date(value));

export const createTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(''),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).default('TODO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: dateOnly.nullable().default(null),
});

export const taskQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueFrom: dateOnly.optional(),
  dueTo: dateOnly.optional(),
  sort: z.enum(['createdAt', 'dueDate', 'priority']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

type TaskQuery = z.infer<typeof taskQuerySchema>;

export async function listTasks(projectId: string, query: TaskQuery) {
  const where: Prisma.TaskWhereInput = { projectId };
  if (query.search) {
    where.title = { contains: query.search, mode: 'insensitive' };
  }
  if (query.status) {
    where.status = query.status;
  }
  if (query.priority) {
    where.priority = query.priority;
  }
  if (query.dueFrom || query.dueTo) {
    where.dueDate = { gte: query.dueFrom, lte: query.dueTo };
  }

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      orderBy: [{ [query.sort]: query.order }, { id: 'asc' }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
    prisma.task.count({ where }),
  ]);

  return { items, total, page: query.page, pageSize: query.pageSize };
}

async function findOwnTask(id: string, userId: string) {
  const task = await prisma.task.findFirst({ where: { id, project: { userId } } });
  if (!task) {
    throw new HttpError(404, 'Task not found');
  }
  return task;
}

export const tasksRouter = Router();
tasksRouter.use(requireAuth);

tasksRouter.get('/:id', async (req, res, next) => {
  try {
    res.json(await findOwnTask(req.params.id, req.userId));
  } catch (err) {
    next(err);
  }
});

tasksRouter.put('/:id', validate(createTaskSchema), async (req, res, next) => {
  try {
    await findOwnTask(req.params.id, req.userId);
    const task = await prisma.task.update({ where: { id: req.params.id }, data: req.body });
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete('/:id', async (req, res, next) => {
  try {
    await findOwnTask(req.params.id, req.userId);
    await prisma.task.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
