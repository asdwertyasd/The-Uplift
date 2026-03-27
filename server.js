const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'stories.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readStories() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function writeStories(stories) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(stories, null, 2));
}

// GET all stories (newest first)
app.get('/api/stories', (req, res) => {
  const stories = readStories();
  const { category, search } = req.query;
  let filtered = stories;
  if (category) filtered = filtered.filter(s => s.category === category);
  if (search) {
    const q = search.toLowerCase();
    filtered = filtered.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.excerpt.toLowerCase().includes(q) ||
      s.content.toLowerCase().includes(q)
    );
  }
  res.json(filtered.reverse());
});

// GET single story
app.get('/api/stories/:id', (req, res) => {
  const stories = readStories();
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  res.json(story);
});

// POST new story
app.post('/api/stories', (req, res) => {
  const { title, excerpt, content, category, author, imageUrl } = req.body;
  if (!title || !excerpt || !content || !category) {
    return res.status(400).json({ error: 'title, excerpt, content, and category are required' });
  }
  const story = {
    id: uuidv4(),
    title,
    excerpt,
    content,
    category,
    author: author || 'The Uplift Team',
    imageUrl: imageUrl || '',
    date: new Date().toISOString(),
  };
  const stories = readStories();
  stories.push(story);
  writeStories(stories);
  res.status(201).json(story);
});

// DELETE story
app.delete('/api/stories/:id', (req, res) => {
  const stories = readStories();
  const idx = stories.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Story not found' });
  stories.splice(idx, 1);
  writeStories(stories);
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`The Uplift is running at http://localhost:${PORT}`);
});
