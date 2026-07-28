function validatePostInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['요청 본문이 올바르지 않습니다'];
  }
  if (!body.nickname || typeof body.nickname !== 'string' || !body.nickname.trim()) {
    errors.push('닉네임을 입력하세요');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 4) {
    errors.push('비밀번호는 4자 이상이어야 합니다');
  }
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('제목을 입력하세요');
  }
  if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
    errors.push('내용을 입력하세요');
  }
  return errors;
}

function validateCommentInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['요청 본문이 올바르지 않습니다'];
  }
  if (!body.nickname || typeof body.nickname !== 'string' || !body.nickname.trim()) {
    errors.push('닉네임을 입력하세요');
  }
  if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
    errors.push('댓글 내용을 입력하세요');
  }
  return errors;
}

module.exports = { validatePostInput, validateCommentInput };
