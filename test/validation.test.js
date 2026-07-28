const test = require('node:test');
const assert = require('node:assert');
const { validatePostInput, validateCommentInput } = require('../lib/validation');

test('validatePostInput은 모든 값이 있으면 빈 배열을 반환한다', () => {
  const errors = validatePostInput({
    nickname: '홍길동',
    password: '1234',
    title: '제목',
    content: '내용',
  });
  assert.deepStrictEqual(errors, []);
});

test('validatePostInput은 닉네임이 없으면 에러를 포함한다', () => {
  const errors = validatePostInput({
    password: '1234',
    title: '제목',
    content: '내용',
  });
  assert.ok(errors.length > 0);
});

test('validatePostInput은 비밀번호가 4자 미만이면 에러를 포함한다', () => {
  const errors = validatePostInput({
    nickname: '홍길동',
    password: '12',
    title: '제목',
    content: '내용',
  });
  assert.ok(errors.length > 0);
});

test('validateCommentInput은 닉네임과 내용이 있으면 빈 배열을 반환한다', () => {
  const errors = validateCommentInput({ nickname: '이몽룡', content: '잘 봤습니다' });
  assert.deepStrictEqual(errors, []);
});

test('validateCommentInput은 내용이 없으면 에러를 포함한다', () => {
  const errors = validateCommentInput({ nickname: '이몽룡', content: '' });
  assert.ok(errors.length > 0);
});
