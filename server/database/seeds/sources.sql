-- Tier 1: Major Australian news sources (auto-approve)
INSERT INTO sources (domain, name, tier) VALUES
('abc.net.au', 'ABC News', 1),
('sbs.com.au', 'SBS News', 1),
('theguardian.com', 'The Guardian Australia', 1),
('smh.com.au', 'Sydney Morning Herald', 1),
('theage.com.au', 'The Age', 1),
('theaustralian.com.au', 'The Australian', 1),
('afr.com', 'Australian Financial Review', 1),
('9news.com.au', 'Nine News', 1),
('7news.com.au', 'Seven News', 1),
('news.com.au', 'news.com.au', 1),
('theconversation.com', 'The Conversation', 1),
('crikey.com.au', 'Crikey', 1),
('skynews.com.au', 'Sky News Australia', 1);

-- Tier 2: Regional/niche political media (auto-approve, lower ranking)
INSERT INTO sources (domain, name, tier) VALUES
('canberratimes.com.au', 'Canberra Times', 2),
('brisbanetimes.com.au', 'Brisbane Times', 2),
('watoday.com.au', 'WAtoday', 2),
('themandarin.com.au', 'The Mandarin', 2),
('michaelwest.com.au', 'Michael West Media', 2),
('thesaturdaypaper.com.au', 'The Saturday Paper', 2),
('thewesterngazette.com.au', 'The Western Gazette', 2);

-- RSS Feeds for Tier 1 sources
INSERT INTO rss_feeds (source_id, feed_url, category, poll_interval_mins, created_at) VALUES
((SELECT id FROM sources WHERE domain = 'abc.net.au'), 'https://www.abc.net.au/news/feed/51120/rss.xml', 'politics', 15, unixepoch()),
((SELECT id FROM sources WHERE domain = 'theguardian.com'), 'https://www.theguardian.com/australia-news/rss', 'australia-news', 15, unixepoch()),
((SELECT id FROM sources WHERE domain = 'smh.com.au'), 'https://www.smh.com.au/rss/politics/federal.xml', 'federal-politics', 15, unixepoch()),
((SELECT id FROM sources WHERE domain = 'sbs.com.au'), 'https://www.sbs.com.au/news/topic/australia/feed', 'australia', 30, unixepoch()),
((SELECT id FROM sources WHERE domain = 'theconversation.com'), 'https://theconversation.com/au/politics/articles.atom', 'politics', 30, unixepoch()),
((SELECT id FROM sources WHERE domain = 'crikey.com.au'), 'https://www.crikey.com.au/feed/', 'general', 30, unixepoch());
