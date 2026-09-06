const { test, before, after, describe } = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../src/models/user.model');
const authService = require('../src/services/auth.service');
const { verifyToken } = require('../src/config/jwt');

describe('Auth Service Tests', () => {
  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }
  });

  after(async () => {
    // Clean up test user
    await User.deleteMany({ username: { $regex: '^test_user_' } });
    await mongoose.connection.close();
  });

  test('should register a new user with hashed password and return valid JWT', async () => {
    const uniqueUsername = `test_user_${Date.now()}`;
    const result = await authService.register({
      username: uniqueUsername,
      password: 'password123',
      displayName: 'Test User',
    });

    assert.ok(result.token, 'Token must be present');
    assert.strictEqual(result.user.username, uniqueUsername.toLowerCase());
    assert.strictEqual(result.user.displayName, 'Test User');

    // Verify JWT payload
    const decoded = verifyToken(result.token);
    assert.ok(decoded);
    assert.strictEqual(decoded.userId.toString(), result.user._id.toString());
  });

  test('should fail when registering duplicate username', async () => {
    const uniqueUsername = `test_user_dup_${Date.now()}`;
    await authService.register({
      username: uniqueUsername,
      password: 'password123',
    });

    await assert.rejects(
      async () => {
        await authService.register({
          username: uniqueUsername,
          password: 'anotherpassword',
        });
      },
      (err) => {
        return err.code === 'USERNAME_TAKEN';
      }
    );
  });

  test('should login successfully with valid credentials', async () => {
    const uniqueUsername = `test_user_login_${Date.now()}`;
    await authService.register({
      username: uniqueUsername,
      password: 'mypassword',
    });

    const loginResult = await authService.login({
      username: uniqueUsername,
      password: 'mypassword',
    });

    assert.ok(loginResult.token);
    assert.strictEqual(loginResult.user.username, uniqueUsername);
    assert.strictEqual(loginResult.user.status, 'ONLINE');
  });

  test('should reject login with wrong password', async () => {
    const uniqueUsername = `test_user_wrong_${Date.now()}`;
    await authService.register({
      username: uniqueUsername,
      password: 'correctpassword',
    });

    await assert.rejects(
      async () => {
        await authService.login({
          username: uniqueUsername,
          password: 'wrongpassword',
        });
      },
      (err) => {
        return err.code === 'INVALID_CREDENTIALS';
      }
    );
  });
});
