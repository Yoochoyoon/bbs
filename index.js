const postList = document.getElementById('postList');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getParams() {
  const params = new URLSearchParams(location.search);
  return {
    page: parseInt(params.get('page'), 10) || 1,
    search: params.get('search') || '',
  };
}

async function loadPosts() {
  const { page, search } = getParams();
  searchInput.value = search;

  const url = new URL('/api/posts', location.origin);
  url.searchParams.set('page', page);
  if (search) url.searchParams.set('search', search);

  const res = await fetch(url);
  const data = await res.json();

  postList.innerHTML = '';
  if (data.items.length === 0) {
    postList.innerHTML = '<tr><td colspan="4">글이 없습니다</td></tr>';
  }
  for (const post of data.items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a href="post.html?id=${post._id}">${escapeHtml(post.title)}</a></td>
      <td>${escapeHtml(post.nickname)}</td>
      <td>${post.viewCount}</td>
      <td>${new Date(post.createdAt).toLocaleDateString()}</td>
    `;
    postList.appendChild(tr);
  }

  pagination.innerHTML = '';
  for (let p = 1; p <= data.totalPages; p++) {
    const btn = document.createElement('button');
    btn.textContent = p;
    if (p === data.page) btn.disabled = true;
    btn.addEventListener('click', () => {
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set('page', p);
      location.href = nextUrl.toString();
    });
    pagination.appendChild(btn);
  }
}

searchBtn.addEventListener('click', () => {
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set('search', searchInput.value.trim());
  nextUrl.searchParams.set('page', 1);
  location.href = nextUrl.toString();
});

loadPosts();
