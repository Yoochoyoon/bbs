const { MongoClient } = require('mongodb');

let clientPromise = global._mongoClientPromise;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다');
  }

  if (!clientPromise) {
    const client = new MongoClient(uri);
    clientPromise = client.connect();
    global._mongoClientPromise = clientPromise;
  }

  const client = await clientPromise;
  return client.db('bbs');
}

module.exports = { getDb };
