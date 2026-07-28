const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, verifyPassword } = require('../lib/password');

test('hashPassword는 원본과 다른 문자열을 반환한다', async () => {
  const hash = await hashPassword('1234');
  assert.notStrictEqual(hash, '1234');
});

test('verifyPassword는 올바른 비밀번호에 true를 반환한다', async () => {
  const hash = await hashPassword('1234');
  const result = await verifyPassword('1234', hash);
  assert.strictEqual(result, true);
});

test('verifyPassword는 틀린 비밀번호에 false를 반환한다', async () => {
  const hash = await hashPassword('1234');
  const result = await verifyPassword('9999', hash);
  assert.strictEqual(result, false);
});
