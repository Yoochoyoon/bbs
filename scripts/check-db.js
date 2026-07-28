const { getDb } = require('../lib/db');

(async () => {
  const db = await getDb();
  const result = await db.command({ ping: 1 });
  console.log('MongoDB 연결 성공:', result);
  process.exit(0);
})().catch((err) => {
  console.error('MongoDB 연결 실패:', err.message);
  process.exit(1);
});
