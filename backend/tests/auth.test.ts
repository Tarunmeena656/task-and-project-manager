import jwt from 'jsonwebtoken';
import { beforeEach, describe, expect, it } from 'vitest';
import { api, auth, registerUser, resetDb } from './helpers';

beforeEach(resetDb);

describe('auth', () => {
  it('registers a user and returns a token without the password hash', async () => {
    const res = await api().post('/api/auth/register').send({
      name: 'Alice',
      email: 'Alice@Example.com',
      password: 'password123',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user).toMatchObject({ name: 'Alice', email: 'alice@example.com' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects an invalid registration payload', async () => {
    const res = await api().post('/api/auth/register').send({ email: 'nope', password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.errors.map((e: { field: string }) => e.field)).toEqual(['name', 'email', 'password']);
  });

  it('rejects a duplicate email', async () => {
    const { user } = await registerUser();
    const res = await api().post('/api/auth/register').send({
      name: 'Dup',
      email: user.email,
      password: 'password123',
    });
    expect(res.status).toBe(409);
  });

  it('logs in with the right password and rejects the wrong one', async () => {
    const { user } = await registerUser();
    const bad = await api().post('/api/auth/login').send({ email: user.email, password: 'wrong-password' });
    expect(bad.status).toBe(401);

    const ok = await api().post('/api/auth/login').send({ email: user.email, password: 'password123' });
    expect(ok.status).toBe(200);
    expect(ok.body.token).toBeTruthy();

    const me = await api().get('/api/auth/me').set(auth(ok.body.token));
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(user.email);
  });

  it('blocks protected routes without a valid token', async () => {
    const missing = await api().get('/api/projects');
    expect(missing.status).toBe(401);

    const garbage = await api().get('/api/projects').set(auth('not-a-token'));
    expect(garbage.status).toBe(401);
    expect(garbage.body.message).toBe('Invalid or expired token');

    const { user } = await registerUser();
    const expired = jwt.sign({ sub: user.id }, process.env.JWT_SECRET!, { expiresIn: -10 });
    const res = await api().get('/api/projects').set(auth(expired));
    expect(res.status).toBe(401);
  });

  it('logs out', async () => {
    const { token } = await registerUser();
    const res = await api().post('/api/auth/logout').set(auth(token));
    expect(res.status).toBe(204);
  });
});
