const form = document.getElementById('writeForm');
const errorMsg = document.getElementById('errorMsg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname: document.getElementById('nickname').value,
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

  location.href = 'index.html';
});
