// Example API test (no database needed). Run: npm test
process.env.NODE_ENV = 'test';
const request = require('supertest');
const app = require('../src/app');

describe('API basics', () => {
  test('GET /api/health returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('unknown route returns 404', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
  });

  test('feature routes require login', async () => {
    const res = await request(app).get('/api/quizzes');
    expect(res.status).toBe(401);
  });
});
