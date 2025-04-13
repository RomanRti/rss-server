const express = require('express');
const parser = require('rss-parser');
const webPush = require('web-push');
const vapid = require('./vapid-config');
const path = require('path');
const config = require('./config');

const app = express();
const rss = new parser();

const PORT = process.env.PORT || 3000;
const subscriptions = [];

webPush.setVapidDetails(
  config.vapidKeys.publicKey,
  config.vapidKeys.privateKey
);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/news/:category', async (req, res) => {
  const category = req.params.category || 'default';
  const feeds = config.feeds[category];
  if (!feeds) return res.status(400).send('Category not found');
  try {
    const allNews = [];
    for (const feed of feeds) {
      const data = await rss.parseURL(feed.url);
      data.items.forEach(item => {
        allNews.push({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet,
          source: feed.source
        });
      });
    }
    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json(allNews);
  } catch (e) {
    res.status(500).send('RSS fetch error');
  }
});
app.post('/api/feed-title', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const feed = await rss.parseURL(url);
    res.json({ title: feed.title || 'Без названия' });
  } catch (e) {
    console.error('Ошибка загрузки RSS:', e.message);
    res.status(500).json({ error: 'Не удалось загрузить RSS' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
app.post('/api/feed-title', async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  try {
    const feed = await rss.parseURL(url);
    res.json({ title: feed.title || 'Без названия' });
  } catch (e) {
    console.error('Ошибка загрузки RSS:', e.message);
    res.status(500).json({ error: 'Не удалось загрузить RSS' });
  }
});
app.post('/api/news/custom', async (req, res) => {
  try {
    const feeds = req.body.feeds;
    if (!Array.isArray(feeds) || feeds.length === 0) {
      return res.status(400).json({ error: 'No feeds provided' });
    }

    const allNews = [];

    for (const feed of feeds) {
      try {
        const rssFeed = await rss.parseURL(feed.url);
        const items = rssFeed.items.map(item => ({
          title: item.title,
          link: item.link,
          pubDate: item.pubDate,
          content: item.contentSnippet || item.content || '',
          source: feed.source
        }));
        allNews.push(...items);
      } catch (err) {
        console.error(`Ошибка в фиде ${feed.url}:`, err.message);
      }
    }

    allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    res.json(allNews);
  } catch (err) {
    console.error('Ошибка в custom feed:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});
