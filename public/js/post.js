const $ = id => document.getElementById(id);

function showToast(msg, isError = false) {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

$('postForm').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = $('submitBtn');

  const body = {
    title:    $('title').value.trim(),
    excerpt:  $('excerpt').value.trim(),
    content:  $('content').value.trim(),
    category: $('category').value,
    author:   $('author').value.trim() || undefined,
    imageUrl: $('imageUrl').value.trim() || undefined,
  };

  if (!body.title || !body.excerpt || !body.content || !body.category) {
    showToast('Please fill in all required fields.', true);
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Publishing…';

  try {
    const res = await fetch('/api/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Could not publish story.');
    }
    const story = await res.json();
    showToast('Story published! Redirecting…');
    setTimeout(() => location.href = `/story.html?id=${story.id}`, 1400);
  } catch (err) {
    showToast(err.message, true);
    btn.disabled = false;
    btn.textContent = 'Publish Story';
  }
});
