const { getDb } = require('../../../lib/db');
const { toObjectId } = require('../../../lib/objectId');
const { validateCommentInput } = require('../../../lib/validation');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '지원하지 않는 메서드입니다' });
    return;
  }

  const postId = toObjectId(req.query.id);
  if (!postId) {
    res.status(400).json({ error: '올바르지 않은 글 번호입니다' });
    return;
  }

  const db = await getDb();
  const posts = db.collection('posts');
  const comments = db.collection('comments');

  const post = await posts.findOne({ _id: postId });
  if (!post) {
    res.status(404).json({ error: '글을 찾을 수 없습니다' });
    return;
  }

  const errors = validateCommentInput(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const doc = {
    postId,
    nickname: req.body.nickname.trim(),
    content: req.body.content.trim(),
    createdAt: new Date(),
  };

  const result = await comments.insertOne(doc);
  res.status(201).json({ _id: result.insertedId });
};
