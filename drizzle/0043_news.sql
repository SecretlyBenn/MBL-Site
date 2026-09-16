-- The news page: articles the league writes, with pictures, comments and likes.

CREATE TABLE IF NOT EXISTS news_articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  cover_image_id INTEGER,
  author_user_id INTEGER REFERENCES users(id),
  author_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- The news page lists published articles newest first; nothing else is read
-- often enough to index.
CREATE INDEX IF NOT EXISTS news_articles_published
  ON news_articles (status, published_at DESC);

CREATE TABLE IF NOT EXISTS news_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER REFERENCES news_articles(id),
  content_type TEXT NOT NULL,
  data TEXT NOT NULL,
  uploaded_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id INTEGER NOT NULL REFERENCES news_articles(id),
  discord_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  hidden_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS news_comments_article ON news_comments (article_id, created_at);

CREATE TABLE IF NOT EXISTS news_likes (
  article_id INTEGER NOT NULL REFERENCES news_articles(id),
  discord_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (article_id, discord_id)
);
