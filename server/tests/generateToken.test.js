process.env.JWT_SECRET = 'test-secret';
const jwt = require('jsonwebtoken');
const generateToken = require('../src/utils/generateToken');

test('token contains user id and role', () => {
  const token = generateToken({ _id: 'abc123', role: 'admin' });
  const payload = jwt.verify(token, 'test-secret');
  expect(payload.id).toBe('abc123');
  expect(payload.role).toBe('admin');
});
