import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/db';

export const api = () => request(app);

export async function resetDb() {
  await prisma.user.deleteMany();
}

let counter = 0;

export async function registerUser() {
  counter += 1;
  const res = await api().post('/api/auth/register').send({
    name: `User ${counter}`,
    email: `user${counter}-${Date.now()}@example.com`,
    password: 'password123',
  });
  return { token: res.body.token as string, user: res.body.user };
}

export function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function createProject(token: string, name = 'Project') {
  const res = await api().post('/api/projects').set(auth(token)).send({ name });
  return res.body;
}
