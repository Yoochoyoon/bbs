const { getDb } = require('../../../lib/db');
const { toObjectId } = require('../../../lib/objectId');
const { verifyPassword } = require('../../../lib/password');

module.exports = async function handler(req, res) {
  const id = toObjectId(req.query.id);
  if (!id) {
    res.status(400).json({ error: '올바르지 않은 글 번호입니다' });
    return;
  }

  const db = await getDb();
  const posts = db.collection('posts');
  const comments = db.collection('comments');

  if (req.method === 'GET') {
    const post = await posts.findOne({ _id: id });
    if (!post) {
      res.status(404).json({ error: '글을 찾을 수 없습니다' });
      return;
    }

    await posts.updateOne({ _id: id }, { $inc: { viewCount: 1 } });
    const postComments = await comments
      .find({ postId: id })
      .sort({ createdAt: 1 })
      .toArray();

    const { passwordHash, ...safePost } = post;
    res.status(200).json({
      ...safePost,
      viewCount: post.viewCount + 1,
      comments: postComments,
    });
    return;
  }

  if (req.method === 'PUT') {
    const post = await posts.findOne({ _id: id });
    if (!post) {
      res.status(404).json({ error: '글을 찾을 수 없습니다' });
      return;
    }

    const passwordOk = await verifyPassword(req.body.password || '', post.passwordHash);
    if (!passwordOk) {
      res.status(403).json({ error: '비밀번호가 틀렸습니다' });
      return;
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!title || !content) {
      res.status(400).json({ error: '제목과 내용을 입력하세요' });
      return;
    }

    await posts.updateOne({ _id: id }, { $set: { title, content } });
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method === 'DELETE') {
    const post = await posts.findOne({ _id: id });
    if (!post) {
      res.status(404).json({ error: '글을 찾을 수 없습니다' });
      return;
    }

    const passwordOk = await verifyPassword(req.body.password || '', post.passwordHash);
    if (!passwordOk) {
      res.status(403).json({ error: '비밀번호가 틀렸습니다' });
      return;
    }

    await posts.deleteOne({ _id: id });
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: '지원하지 않는 메서드입니다' });
};
