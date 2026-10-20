import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createProject, registerUser, resetDb } from './helpers';

beforeEach(resetDb);

async function seedTasks(token: string, projectId: string) {
  const tasks = [
    { title: 'Write docs', priority: 'LOW', status: 'TODO', dueDate: '2026-11-01' },
    { title: 'Fix login bug', priority: 'HIGH', status: 'IN_PROGRESS', dueDate: '2026-10-25' },
    { title: 'Design schema', priority: 'MEDIUM', status: 'DONE', dueDate: '2026-10-20' },
    { title: 'Write tests', priority: 'HIGH', status: 'TODO', dueDate: null },
  ];
  for (const task of tasks) {
    await api().post(`/api/projects/${projectId}/tasks`).set(auth(token)).send(task);
  }
}

describe('tasks', () => {
  it('creates a task with defaults and validates input', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);

    const created = await api().post(`/api/projects/${project.id}/tasks`).set(auth(token)).send({ title: 'First' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ title: 'First', status: 'TODO', priority: 'MEDIUM', dueDate: null });

    const invalid = await api()
      .post(`/api/projects/${project.id}/tasks`)
      .set(auth(token))
      .send({ title: '', priority: 'URGENT', dueDate: 'tomorrow' });
    expect(invalid.status).toBe(400);
    expect(invalid.body.errors.map((e: { field: string }) => e.field)).toEqual(['title', 'priority', 'dueDate']);
  });

  it('paginates, searches, filters and sorts on the server', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    await seedTasks(token, project.id);
    const list = (query: string) => api().get(`/api/projects/${project.id}/tasks?${query}`).set(auth(token));

    const page1 = await list('pageSize=3&sort=createdAt&order=asc');
    expect(page1.body).toMatchObject({ total: 4, page: 1, pageSize: 3 });
    expect(page1.body.items.map((t: { title: string }) => t.title)).toEqual(['Write docs', 'Fix login bug', 'Design schema']);
    const page2 = await list('pageSize=3&page=2&sort=createdAt&order=asc');
    expect(page2.body.items.map((t: { title: string }) => t.title)).toEqual(['Write tests']);

    const search = await list('search=WRITE');
    expect(search.body.total).toBe(2);

    const filtered = await list('status=TODO&priority=HIGH');
    expect(filtered.body.items.map((t: { title: string }) => t.title)).toEqual(['Write tests']);

    const due = await list('dueFrom=2026-10-21&dueTo=2026-10-31');
    expect(due.body.items.map((t: { title: string }) => t.title)).toEqual(['Fix login bug']);

    const byPriority = await list('sort=priority&order=asc');
    expect(byPriority.body.items.map((t: { priority: string }) => t.priority)).toEqual(['LOW', 'MEDIUM', 'HIGH', 'HIGH']);

    const byDue = await list('sort=dueDate&order=asc&pageSize=2');
    expect(byDue.body.items.map((t: { title: string }) => t.title)).toEqual(['Design schema', 'Fix login bug']);

    const badQuery = await list('page=0&sort=title');
    expect(badQuery.status).toBe(400);
  });

  it('updates and deletes a task, only for its owner', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const project = await createProject(owner.token);
    const created = await api().post(`/api/projects/${project.id}/tasks`).set(auth(owner.token)).send({ title: 'Task' });
    const id = created.body.id;

    const foreign = await api().put(`/api/tasks/${id}`).set(auth(other.token)).send({ title: 'Hacked' });
    expect(foreign.status).toBe(404);

    const updated = await api()
      .put(`/api/tasks/${id}`)
      .set(auth(owner.token))
      .send({ title: 'Task', status: 'DONE', priority: 'HIGH', dueDate: '2026-12-31' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ status: 'DONE', priority: 'HIGH' });
    expect(updated.body.dueDate).toContain('2026-12-31');

    expect((await api().delete(`/api/tasks/${id}`).set(auth(other.token))).status).toBe(404);
    expect((await api().delete(`/api/tasks/${id}`).set(auth(owner.token))).status).toBe(204);
    expect((await api().get(`/api/tasks/${id}`).set(auth(owner.token))).status).toBe(404);
  });
});
