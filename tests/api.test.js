process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.DB_PATH = ':memory:';
process.env.SEED_ADMIN_USER = 'admin';
process.env.SEED_ADMIN_PASSWORD = 'TestPass123!';

const request = require('supertest');
const app = require('../server');

describe('Auth', () => {
  it('rejects bad credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('logs in with seeded admin credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'TestPass123!' });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});

describe('Tasks (dashboard, JWT-protected)', () => {
  let token;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'TestPass123!' });
    token = res.body.token;
  });

  it('rejects requests with no token', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  it('creates and fetches a task', async () => {
    const create = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Write README', priority: 'high' });
    expect(create.status).toBe(201);

    const list = await request(app)
      .get('/api/tasks')
      .set('Authorization', `Bearer ${token}`);
    expect(list.status).toBe(200);
    expect(list.body.length).toBe(1);
    expect(list.body[0].title).toBe('Write README');
  });
});

describe('Public API (API-key-protected, for outside consumers)', () => {
  let token;
  let readKey;
  let writeKey;

  beforeAll(async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'TestPass123!' });
    token = login.body.token;

    const readRes = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'ci-read', scope: 'read' });
    readKey = readRes.body.key;

    const writeRes = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${token}`)
      .send({ label: 'ci-write', scope: 'write' });
    writeKey = writeRes.body.key;
  });

  it('rejects requests with no API key', async () => {
    const res = await request(app).get('/api/v1/tasks');
    expect(res.status).toBe(401);
  });

  it('rejects an invalid API key', async () => {
    const res = await request(app).get('/api/v1/tasks').set('x-api-key', 'not-a-real-key');
    expect(res.status).toBe(401);
  });

  it('allows a read-scoped key to GET tasks', async () => {
    const res = await request(app).get('/api/v1/tasks').set('x-api-key', readKey);
    expect(res.status).toBe(200);
  });

  it('blocks a read-scoped key from POSTing', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('x-api-key', readKey)
      .send({ title: 'Should fail' });
    expect(res.status).toBe(403);
  });

  it('allows a write-scoped key to POST', async () => {
    const res = await request(app)
      .post('/api/v1/tasks')
      .set('x-api-key', writeKey)
      .send({ title: 'From external service' });
    expect(res.status).toBe(201);
  });
});
