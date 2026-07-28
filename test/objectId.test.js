const test = require('node:test');
const assert = require('node:assert');
const { ObjectId } = require('mongodb');
const { toObjectId } = require('../lib/objectId');

test('toObjectId는 유효한 24자리 16진수 문자열을 ObjectId로 변환한다', () => {
  const valid = new ObjectId().toString();
  const result = toObjectId(valid);
  assert.ok(result instanceof ObjectId);
  assert.strictEqual(result.toString(), valid);
});

test('toObjectId는 형식이 잘못된 문자열에 null을 반환한다', () => {
  assert.strictEqual(toObjectId('not-an-id'), null);
});

test('toObjectId는 문자열이 아닌 값에 null을 반환한다', () => {
  assert.strictEqual(toObjectId(undefined), null);
  assert.strictEqual(toObjectId(123), null);
});
