// ---- helpers ----
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

const CATEGORY_ICONS = {
  Environment: '🌿',
  Community:   '🤝',
  Science:     '🔬',
  Arts:        '🎨',
  Health:      '💚',
  Animals:     '🐾',
  Innovation:  '💡',
  Education:   '📚',
  Sports:      '🏅',
  Other:       '✨',
};

function categoryIcon(cat) {
  return CATEGORY_ICONS[cat] || '✨';
}

function cardHTML(story) {
  const img = story.imageUrl
    ? `<img class="card-image" src="${escapeHtml(story.imageUrl)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholder = `<div class="card-image-placeholder" style="${story.imageUrl ? 'display:none' : ''}">${categoryIcon(story.category)}</div>`;

  return `
    <article class="card">
      ${img}${placeholder}
      <div class="card-body">
        <span class="card-category">${escapeHtml(story.category)}</span>
        <h3><a href="/story.html?id=${story.id}">${escapeHtml(story.title)}</a></h3>
        <p>${escapeHtml(story.excerpt)}</p>
        <div class="card-meta">
          <span class="author">${escapeHtml(story.author)}</span>
          <time>${formatDate(story.date)}</time>
        </div>
      </div>
    </article>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- state ----
let activeCategory = '';
let searchQuery = '';

function getParamsFromURL() {
  const p = new URLSearchParams(location.search);
  activeCategory = p.get('category') || '';
  searchQuery = p.get('search') || '';
}

async function loadStories() {
  const grid = $('storiesGrid');
  grid.innerHTML = '<div class="spinner"><div class="spinner-ring"></div></div>';

  const params = new URLSearchParams();
  if (activeCategory) params.set('category', activeCategory);
  if (searchQuery) params.set('search', searchQuery);

  try {
    const res = await fetch('/api/stories?' + params.toString());
    if (!res.ok) throw new Error('Failed to load stories');
    const stories = await res.json();

    const countEl = $('storyCount');
    countEl.textContent = stories.length === 1 ? '1 story' : `${stories.length} stories`;

    const titleEl = $('sectionTitle');
    if (searchQuery) titleEl.textContent = `Results for "${searchQuery}"`;
    else if (activeCategory) titleEl.textContent = activeCategory;
    else titleEl.textContent = 'Latest Stories';

    if (stories.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="icon">🌱</div>
          <h3>No stories yet in this category</h3>
          <p>Be the first to <a href="/post.html">share a feel-good story</a>.</p>
        </div>`;
      return;
    }

    grid.innerHTML = stories.map(cardHTML).join('');
  } catch (err) {
    grid.innerHTML = `<div class="empty-state"><div class="icon">🌧️</div><h3>Couldn't load stories</h3><p>${err.message}</p></div>`;
  }
}

function syncPills() {
  document.querySelectorAll('.pill').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.category === activeCategory);
  });
}

function syncNavLinks() {
  document.querySelectorAll('.nav-links a').forEach(a => {
    const url = new URL(a.href);
    const cat = url.searchParams.get('category') || '';
    a.classList.toggle('active', cat === activeCategory && !searchQuery);
  });
}

// ---- init ----
getParamsFromURL();
if (searchQuery) $('searchInput').value = searchQuery;
syncPills();
syncNavLinks();
loadStories();

// category pills
$('categoryPills').addEventListener('click', e => {
  const pill = e.target.closest('.pill');
  if (!pill) return;
  activeCategory = pill.dataset.category;
  searchQuery = '';
  $('searchInput').value = '';
  const params = activeCategory ? `?category=${encodeURIComponent(activeCategory)}` : '/';
  history.pushState({}, '', params);
  syncPills();
  syncNavLinks();
  loadStories();
});

// search
$('searchForm').addEventListener('submit', e => {
  e.preventDefault();
  searchQuery = $('searchInput').value.trim();
  activeCategory = '';
  const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '/';
  history.pushState({}, '', params);
  syncPills();
  syncNavLinks();
  loadStories();
});

window.addEventListener('popstate', () => {
  getParamsFromURL();
  $('searchInput').value = searchQuery;
  syncPills();
  syncNavLinks();
  loadStories();
});
