/* ============================================================
   The Uplift — Reels-style news feed
   ============================================================ */

// ---- Helpers ----------------------------------------------------------------

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function $(id) { return document.getElementById(id); }

function showToast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/** Fisher-Yates shuffle — returns a new array */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Category data ----------------------------------------------------------

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

/**
 * Per-category CSS gradient used as the reel background when no image is set.
 * Colours are deep, moody, and cinematic — dark enough for white text.
 */
const CATEGORY_GRADIENTS = {
  Environment: 'linear-gradient(155deg, #071c0f 0%, #0f4025 45%, #1a6b3a 80%, #0a2818 100%)',
  Community:   'linear-gradient(155deg, #12062a 0%, #311470 45%, #5a269e 80%, #1a0836 100%)',
  Science:     'linear-gradient(155deg, #04101e 0%, #0a2f5e 45%, #1355a0 80%, #061828 100%)',
  Arts:        'linear-gradient(155deg, #1c0610 0%, #5a1030 45%, #9a2050 80%, #220814 100%)',
  Health:      'linear-gradient(155deg, #041618 0%, #0a4248 45%, #127a7a 80%, #062020 100%)',
  Animals:     'linear-gradient(155deg, #180c02 0%, #4a2408 45%, #7e4010 80%, #201004 100%)',
  Innovation:  'linear-gradient(155deg, #04040e 0%, #10106e 45%, #2020a8 80%, #080820 100%)',
  Education:   'linear-gradient(155deg, #160402 0%, #4e1008 45%, #801a10 80%, #1c0604 100%)',
  Sports:      'linear-gradient(155deg, #060e02 0%, #123408 45%, #226014 80%, #0a1604 100%)',
  Other:       'linear-gradient(155deg, #0e0e0e 0%, #282828 45%, #404040 80%, #161616 100%)',
};

// ---- Reel template ----------------------------------------------------------

function reelHTML(story) {
  const gradient  = CATEGORY_GRADIENTS[story.category] || CATEGORY_GRADIENTS['Other'];
  const icon      = CATEGORY_ICONS[story.category] || '✨';
  const flag      = escapeHtml(story.flag || '🌍');
  const location  = escapeHtml(story.location || story.country || 'Global');
  const category  = escapeHtml(story.category || 'Other');
  const title     = escapeHtml(story.title);
  const excerpt   = escapeHtml(story.excerpt);
  const storyId   = escapeHtml(story.id);

  // Background style: gradient always set; image layered on top via CSS if present
  const bgStyle = story.imageUrl
    ? `background: ${gradient}; background-image: url('${escapeHtml(story.imageUrl)}'); background-size: cover; background-position: center;`
    : `background: ${gradient};`;

  return `
<div class="reel" data-id="${storyId}" data-category="${category}">
  <div class="reel-bg" style="${bgStyle}"></div>
  <div class="reel-overlay"></div>
  <div class="reel-content">

    <!-- Top: location -->
    <div class="reel-location">
      <span class="reel-flag">${flag}</span>
      <span class="reel-country">${location}</span>
    </div>

    <div class="reel-spacer"></div>

    <!-- Bottom: category + headline + summary + CTA -->
    <div class="reel-bottom">
      <div class="reel-category" data-cat="${category}">${icon} ${category}</div>
      <h2 class="reel-headline">${title}</h2>
      <p class="reel-summary">${excerpt}</p>
      <div class="reel-cta">
        <a href="/story.html?id=${storyId}" class="reel-read-more">
          Read full story
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </a>
        <div class="reel-scroll-hint">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
    </div>

  </div>
</div>`;
}

// ---- State ------------------------------------------------------------------

let allStories     = [];   // original API results
let displayOrder   = [];   // shuffled/filtered set currently rendered
let currentIndex   = 0;    // which reel is in view
let observer       = null; // IntersectionObserver instance
let searchQuery    = '';

// ---- Render -----------------------------------------------------------------

function renderReels(stories) {
  const feed  = $('reelsFeed');
  const empty = $('reelsEmpty');
  const dots  = $('progressDots');

  displayOrder = stories;

  if (stories.length === 0) {
    feed.innerHTML = '';
    empty.classList.add('visible');
    dots.innerHTML = '';
    if (observer) { observer.disconnect(); observer = null; }
    return;
  }

  empty.classList.remove('visible');
  feed.innerHTML = stories.map(reelHTML).join('');

  // Scroll back to top of feed
  feed.scrollTo({ top: 0, behavior: 'instant' });
  currentIndex = 0;

  buildDots(stories.length);
  setupObserver();
}

// ---- Progress dots ----------------------------------------------------------

const MAX_DOTS = 12; // cap so they don't overflow on small screens

function buildDots(total) {
  const dots  = $('progressDots');
  const count = Math.min(total, MAX_DOTS);
  dots.innerHTML = Array.from({ length: count }, (_, i) =>
    `<div class="progress-dot${i === 0 ? ' active' : ''}" data-index="${i}" tabindex="0" role="button" aria-label="Go to story ${i + 1}"></div>`
  ).join('');

  dots.querySelectorAll('.progress-dot').forEach(dot => {
    dot.addEventListener('click', () => {
      const idx = parseInt(dot.dataset.index, 10);
      const reels = $('reelsFeed').querySelectorAll('.reel');
      reels[idx]?.scrollIntoView({ behavior: 'smooth' });
    });
    dot.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') dot.click();
    });
  });
}

function updateDots(idx) {
  const dotIdx = Math.min(idx, MAX_DOTS - 1);
  $('progressDots').querySelectorAll('.progress-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === dotIdx);
  });
}

// ---- Intersection Observer (animations + dot sync) --------------------------

function setupObserver() {
  if (observer) observer.disconnect();

  const reels = $('reelsFeed').querySelectorAll('.reel');

  observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        const idx = Array.from(reels).indexOf(entry.target);
        if (idx !== -1) {
          currentIndex = idx;
          updateDots(idx);
        }
      }
    });
  }, {
    root: $('reelsFeed'),
    threshold: 0.55,
  });

  reels.forEach(reel => observer.observe(reel));
}

// ---- Search -----------------------------------------------------------------

let searchTimeout = null;

function applySearch(query) {
  searchQuery = query.trim().toLowerCase();
  const clearBtn = $('searchClear');

  if (clearBtn) {
    clearBtn.classList.toggle('visible', searchQuery.length > 0);
  }

  if (searchQuery === '') {
    renderReels(shuffle(allStories));
    return;
  }

  const filtered = allStories.filter(s => {
    const haystack = [
      s.title,
      s.excerpt,
      s.category,
      s.country,
      s.location,
    ].join(' ').toLowerCase();
    return haystack.includes(searchQuery);
  });

  renderReels(filtered);
}

// ---- Load stories -----------------------------------------------------------

async function loadStories() {
  const loading = $('reelsLoading');

  try {
    const res = await fetch('/api/stories');
    if (!res.ok) throw new Error(`Server error ${res.status}`);
    allStories = await res.json();

    renderReels(shuffle(allStories));
  } catch (err) {
    showToast('Could not load stories — please refresh', true);
    console.error(err);
  } finally {
    loading.classList.add('hidden');
    // Remove loading element from DOM after fade
    setTimeout(() => { if (loading.parentNode) loading.remove(); }, 500);
  }
}

// ---- Wire up controls -------------------------------------------------------

// Search input (debounced)
const searchInput = $('searchInput');
if (searchInput) {
  searchInput.addEventListener('input', e => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => applySearch(e.target.value), 280);
  });

  // Submit = instant search
  const form = $('searchForm');
  if (form) {
    form.addEventListener('submit', e => {
      e.preventDefault();
      clearTimeout(searchTimeout);
      applySearch(searchInput.value);
      searchInput.blur(); // dismiss keyboard on mobile
    });
  }
}

// Clear button
const clearBtn = $('searchClear');
if (clearBtn) {
  clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
    searchInput.focus();
  });
}

// Empty state reset
const emptyReset = $('emptyReset');
if (emptyReset) {
  emptyReset.addEventListener('click', () => {
    searchInput.value = '';
    applySearch('');
  });
}

// Keyboard shortcut: "/" focuses search
document.addEventListener('keydown', e => {
  if (e.key === '/' && document.activeElement !== searchInput) {
    e.preventDefault();
    searchInput?.focus();
  }
  // Arrow keys scroll through reels
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    const reels = $('reelsFeed')?.querySelectorAll('.reel');
    if (!reels?.length) return;
    const next = e.key === 'ArrowDown'
      ? Math.min(currentIndex + 1, reels.length - 1)
      : Math.max(currentIndex - 1, 0);
    reels[next]?.scrollIntoView({ behavior: 'smooth' });
  }
});

// ---- Init -------------------------------------------------------------------

loadStories();
