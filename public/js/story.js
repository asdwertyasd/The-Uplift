const $ = id => document.getElementById(id);

function showToast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function contentToHTML(text) {
  return text.split(/\n\n+/).map(p => `<p>${escapeHtml(p.trim())}</p>`).join('');
}

const CATEGORY_ICONS = {
  Environment: '🌿', Community: '🤝', Science: '🔬',
  Arts: '🎨', Health: '💚', Animals: '🐾',
  Innovation: '💡', Education: '📚', Sports: '🏅', Other: '✨',
};

async function loadStory() {
  const page = $('storyPage');
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if (!id) {
    page.innerHTML = '<div class="empty-state"><div class="icon">🤔</div><h3>No story ID provided</h3><p><a href="/">Go back home</a></p></div>';
    return;
  }

  try {
    const res = await fetch(`/api/stories/${id}`);
    if (res.status === 404) throw new Error('Story not found.');
    if (!res.ok) throw new Error('Something went wrong.');
    const story = await res.json();

    document.title = `${story.title} — The Uplift`;

    const icon = CATEGORY_ICONS[story.category] || '✨';
    const imgBlock = story.imageUrl
      ? `<img class="story-image" src="${escapeHtml(story.imageUrl)}" alt="" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const placeholder = `<div class="story-image-placeholder" style="${story.imageUrl ? 'display:none' : ''}">${icon}</div>`;

    page.innerHTML = `
      <a href="/" class="story-back">&#8592; All stories</a>

      <div class="story-header">
        <span class="card-category">${escapeHtml(story.category)}</span>
        <h1>${escapeHtml(story.title)}</h1>
        <div class="story-byline">
          <span>By <strong>${escapeHtml(story.author)}</strong></span>
          <time>${formatDate(story.date)}</time>
        </div>
      </div>

      ${imgBlock}${placeholder}

      <div class="story-body">
        ${contentToHTML(story.content)}
      </div>

      <div class="story-footer">
        <a href="/" class="story-back" style="margin:0">&#8592; Back to stories</a>
        <button class="btn-delete" id="deleteBtn">Delete this story</button>
      </div>`;

    $('deleteBtn').addEventListener('click', async () => {
      if (!confirm('Delete this story permanently?')) return;
      const r = await fetch(`/api/stories/${id}`, { method: 'DELETE' });
      if (r.ok) {
        showToast('Story deleted.');
        setTimeout(() => location.href = '/', 1200);
      } else {
        showToast('Could not delete story.', true);
      }
    });

  } catch (err) {
    page.innerHTML = `<div class="empty-state"><div class="icon">🌧️</div><h3>${escapeHtml(err.message)}</h3><p><a href="/">Go back home</a></p></div>`;
  }
}

loadStory();
