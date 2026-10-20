import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, createProject, registerUser, resetDb } from './helpers';

beforeEach(resetDb);

describe('projects', () => {
  it('creates a project with defaults and lists it', async () => {
    const { token } = await registerUser();
    const created = await api().post('/api/projects').set(auth(token)).send({ name: 'Website' });
    expect(created.status).toBe(201);
    expect(created.body).toMatchObject({ name: 'Website', description: '', status: 'ACTIVE' });
    expect(created.body.createdAt).toBeTruthy();

    const list = await api().get('/api/projects').set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0]._count.tasks).toBe(0);
  });

  it('validates project input', async () => {
    const { token } = await registerUser();
    const res = await api().post('/api/projects').set(auth(token)).send({ name: '', status: 'DONE' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['name', 'status']);
  });

  it('updates and deletes own project, and deleting removes its tasks', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    await api().post(`/api/projects/${project.id}/tasks`).set(auth(token)).send({ title: 'Task' });

    const updated = await api()
      .put(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ name: 'Renamed', description: 'desc', status: 'COMPLETED' });
    expect(updated.status).toBe(200);
    expect(updated.body).toMatchObject({ name: 'Renamed', status: 'COMPLETED' });
    expect(updated.body._count.tasks).toBe(1);

    const deleted = await api().delete(`/api/projects/${project.id}`).set(auth(token));
    expect(deleted.status).toBe(204);

    const gone = await api().get(`/api/projects/${project.id}`).set(auth(token));
    expect(gone.status).toBe(404);
    const dashboard = await api().get('/api/dashboard').set(auth(token));
    expect(dashboard.body.totalTasks).toBe(0);
  });

  it('does not expose other users projects', async () => {
    const owner = await registerUser();
    const other = await registerUser();
    const project = await createProject(owner.token, 'Private');

    expect((await api().get('/api/projects').set(auth(other.token))).body).toHaveLength(0);
    expect((await api().get(`/api/projects/${project.id}`).set(auth(other.token))).status).toBe(404);
    expect(
      (await api().put(`/api/projects/${project.id}`).set(auth(other.token)).send({ name: 'Hacked' })).status,
    ).toBe(404);
    expect((await api().delete(`/api/projects/${project.id}`).set(auth(other.token))).status).toBe(404);
    expect((await api().get(`/api/projects/${project.id}/tasks`).set(auth(other.token))).status).toBe(404);

    const stillThere = await api().get(`/api/projects/${project.id}`).set(auth(owner.token));
    expect(stillThere.body.name).toBe('Private');
  });

  it('returns dashboard counts', async () => {
    const { token } = await registerUser();
    const project = await createProject(token);
    for (const status of ['TODO', 'IN_PROGRESS', 'DONE', 'DONE']) {
      await api().post(`/api/projects/${project.id}/tasks`).set(auth(token)).send({ title: status, status });
    }
    const res = await api().get('/api/dashboard').set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ totalProjects: 1, totalTasks: 4, pendingTasks: 2, completedTasks: 2 });
    expect(res.body.projects[0]._count.tasks).toBe(4);
  });
});
