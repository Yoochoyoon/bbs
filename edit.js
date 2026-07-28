const params = new URLSearchParams(location.search);
const postId = params.get('id');
const form = document.getElementById('editForm');
const errorMsg = document.getElementById('errorMsg');

async function loadPost() {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    errorMsg.textContent = '글을 찾을 수 없습니다';
    return;
  }
  const post = await res.json();
  document.getElementById('title').value = post.title;
  document.getElementById('content').value = post.content;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const res = await fetch(`/api/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: document.getElementById('password').value,
      title: document.getElementById('title').value,
      content: document.getElementById('content').value,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    errorMsg.textContent = (data.errors || [data.error]).join(', ');
    return;
  }

  location.href = `post.html?id=${postId}`;
});

loadPost();
