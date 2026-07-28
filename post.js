const params = new URLSearchParams(location.search);
const postId = params.get('id');
const postDetail = document.getElementById('postDetail');
const commentList = document.getElementById('commentList');
const errorMsg = document.getElementById('errorMsg');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadPost() {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    postDetail.innerHTML = '<p>글을 찾을 수 없습니다</p>';
    return;
  }
  const post = await res.json();

  postDetail.innerHTML = `
    <h1>${escapeHtml(post.title)}</h1>
    <p>작성자: ${escapeHtml(post.nickname)} | 조회수: ${post.viewCount}</p>
    <p>${escapeHtml(post.content)}</p>
  `;

  commentList.innerHTML = '';
  for (const c of post.comments) {
    const li = document.createElement('li');
    li.textContent = `${c.nickname}: ${c.content}`;
    commentList.appendChild(li);
  }
}

document.getElementById('editBtn').addEventListener('click', () => {
  location.href = `edit.html?id=${postId}`;
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  const password = prompt('비밀번호를 입력하세요');
  if (password === null) return;

  const res = await fetch(`/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const data = await res.json();
    errorMsg.textContent = data.error || '삭제에 실패했습니다';
    return;
  }

  location.href = 'index.html';
});

document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('commentNickname').value;
  const content = document.getElementById('commentContent').value;

  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, content }),
  });

  if (!res.ok) {
    const data = await res.json();
    errorMsg.textContent = (data.errors || [data.error]).join(', ');
    return;
  }

  document.getElementById('commentForm').reset();
  loadPost();
});

loadPost();
