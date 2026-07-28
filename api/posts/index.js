const { getDb } = require('../../lib/db');
const { validatePostInput } = require('../../lib/validation');
const { hashPassword } = require('../../lib/password');

module.exports = async function handler(req, res) {
  const db = await getDb();
  const posts = db.collection('posts');

  const PAGE_SIZE = 10;

  if (req.method === 'GET') {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    const filter = search ? { title: { $regex: search, $options: 'i' } } : {};
    const skip = (page - 1) * PAGE_SIZE;

    const [items, total] = await Promise.all([
      posts
        .find(filter, { projection: { content: 0, passwordHash: 0 } })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .toArray(),
      posts.countDocuments(filter),
    ]);

    res.status(200).json({
      items,
      page,
      totalPages: Math.max(Math.ceil(total / PAGE_SIZE), 1),
    });
    return;
  }

  if (req.method === 'POST') {
    const errors = validatePostInput(req.body);
    if (errors.length > 0) {
      res.status(400).json({ errors });
      return;
    }

    const passwordHash = await hashPassword(req.body.password);
    const doc = {
      nickname: req.body.nickname.trim(),
      passwordHash,
      title: req.body.title.trim(),
      content: req.body.content.trim(),
      viewCount: 0,
      createdAt: new Date(),
    };

    const result = await posts.insertOne(doc);
    res.status(201).json({ _id: result.insertedId });
    return;
  }

  res.status(405).json({ error: '지원하지 않는 메서드입니다' });
};
