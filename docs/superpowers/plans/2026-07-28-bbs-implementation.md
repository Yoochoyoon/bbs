# 게시판(BBS) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인 없이 글별 비밀번호로 보호되는 CRUD 게시판(이미지 첨부, 페이지네이션, 제목검색, 조회수, 댓글)을 만들고 Vercel에 무료로 배포한다.

**Architecture:** 순수 HTML/CSS/JS 정적 페이지(`public/`) + Vercel Serverless Functions(`api/`, 프레임워크 없음) + MongoDB Atlas(무료 티어, posts/comments 컬렉션) + Vercel Blob(무료 티어, 이미지 저장). 프론트는 각 API를 `fetch()`로 호출한다.

**Tech Stack:** Node.js(Vercel Functions 런타임), `mongodb` 드라이버, `bcryptjs`, `@vercel/blob`, 순수 HTML/CSS/JS(빌드 도구 없음), Node 내장 `node:test` (라이브러리 함수 단위 검증용).

## Global Constraints

- 로그인/회원가입 기능을 추가하지 않는다 (스펙 범위 밖).
- 댓글은 작성만 가능하고 수정/삭제 기능을 만들지 않는다.
- React/Vue/Next.js 등 프레임워크를 사용하지 않는다.
- 유료 서비스를 사용하지 않는다 (MongoDB Atlas 무료 티어, Vercel 무료 티어, Vercel Blob 무료 티어만 사용).
- 비밀번호는 평문으로 저장하지 않고 반드시 해시(bcrypt)로 저장한다.
- 목록 조회 API는 `content`, `passwordHash` 필드를 응답에 포함하지 않는다.
- **API 엔드포인트(Task 5~11)와 프론트엔드 화면(Task 13~16)은 자동화 테스트 프레임워크를 도입하지 않고, 각 Task 안에 명시된 curl 명령/브라우저 수동 검증으로만 검증한다. 이는 스펙 문서("6. 테스트 방식")에서 의도적으로 결정된 범위이며, "자동화 테스트가 없다"는 이 두 영역에 한해 결함이 아니다.** (`lib/` 아래 순수 함수는 Task 2~4에서처럼 `node:test`로 자동화 테스트를 작성한다 — 이 규칙은 `lib/`에는 적용되지 않는다.)

## 구현 노트 (스펙과의 차이점 1건)

스펙 문서(`docs/superpowers/specs/2026-07-28-bbs-design.md`)는 "브라우저에서 Vercel Blob으로 직접 업로드"라고 되어 있으나, 이 계획에서는 **브라우저 → 우리 `/api/upload` → Vercel Blob** 순서로 서버를 한 번 거치도록 구현한다. 이유: 직접 업로드 방식은 `@vercel/blob/client` 라이브러리를 브라우저에서 import해야 하는데, 이는 번들러(esbuild/webpack) 없이는 CDN 임포트가 필요해 "프레임워크/빌드도구 없이 순수 JS"라는 학습 목표와 충돌한다. 서버를 한 번 거치는 방식은 우리 API가 이미 사용 중인 "JSON 요청 → JSON 응답" 패턴을 그대로 재사용할 수 있어 학습자에게 더 일관되고 단순하다. 결과물(이미지가 Vercel Blob에 저장되고 URL만 DB에 남는 것)은 스펙의 의도와 동일하다.

---

## Task 1: 프로젝트 스캐폴딩 + MongoDB 연결 헬퍼

**Files:**
- Create: `04_bbs/package.json`
- Create: `04_bbs/.env.example`
- Create: `04_bbs/.gitignore`
- Create: `04_bbs/vercel.json`
- Create: `04_bbs/lib/db.js`
- Create: `04_bbs/scripts/check-db.js`

**Interfaces:**
- Produces: `getDb(): Promise<Db>` from `lib/db.js` — 이후 모든 API 파일이 이 함수로 MongoDB에 접근한다. `Db` 객체는 `.collection('posts')`, `.collection('comments')`를 가진 MongoDB 드라이버의 표준 `Db` 인스턴스다.

- [ ] **Step 1: package.json 작성**

```json
{
  "name": "04-bbs",
  "version": "1.0.0",
  "private": true,
  "engines": { "node": ">=18" },
  "scripts": {
    "test": "node --test test/",
    "check-db": "node -r dotenv/config scripts/check-db.js dotenv_config_path=.env.local",
    "dev": "vercel dev"
  },
  "dependencies": {
    "mongodb": "^6.10.0",
    "bcryptjs": "^2.4.3",
    "@vercel/blob": "^0.27.0"
  },
  "devDependencies": {
    "dotenv": "^16.4.5",
    "vercel": "^37.0.0"
  }
}
```

- [ ] **Step 2: .env.example 작성**

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/?retryWrites=true&w=majority
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx
```

- [ ] **Step 3: .gitignore 작성**

```
node_modules/
.env.local
.vercel/
```

- [ ] **Step 4: vercel.json 작성**

```json
{
  "outputDirectory": "public"
}
```

- [ ] **Step 5: MongoDB Atlas 무료 클러스터 만들기 (브라우저 작업)**

1. https://www.mongodb.com/cloud/atlas/register 에서 무료 계정 생성
2. "Create a deployment" → **M0 (Free)** 티어 선택 → 리전은 아무 곳이나(가까운 곳 추천)
3. Database User 생성 (아이디/비밀번호 기억해두기)
4. Network Access에서 "Allow access from anywhere" (0.0.0.0/0) 추가 (Vercel은 고정 IP가 아니므로 필요)
5. "Connect" → "Drivers" → 연결 문자열(URI) 복사

- [ ] **Step 6: .env.local 생성 (커밋되지 않음)**

`04_bbs/.env.local` 파일을 만들고 Step 5에서 복사한 URI를 붙여넣는다:

```
MONGODB_URI=mongodb+srv://실제유저:실제비밀번호@실제클러스터주소/?retryWrites=true&w=majority
```

- [ ] **Step 7: lib/db.js 작성**

```js
const { MongoClient } = require('mongodb');

let cachedClient = global._mongoClient;

async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI 환경변수가 설정되지 않았습니다');
  }

  if (!cachedClient) {
    cachedClient = new MongoClient(uri);
    await cachedClient.connect();
    global._mongoClient = cachedClient;
  }

  return cachedClient.db('bbs');
}

module.exports = { getDb };
```

(서버리스 함수는 호출마다 새로 실행될 수 있어서, 연결을 전역 변수에 캐싱해 재사용합니다 — 매번 새로 접속하면 느리고 연결 한도를 초과할 수 있습니다.)

- [ ] **Step 8: scripts/check-db.js 작성 (연결 확인용 수동 스크립트)**

```js
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
```

- [ ] **Step 9: 의존성 설치 및 연결 확인**

Run: `npm install`
Run: `npm run check-db`
Expected: `MongoDB 연결 성공: { ok: 1 }` 출력. 실패하면 `.env.local`의 URI, Network Access 설정을 다시 확인한다.

- [ ] **Step 10: 커밋**

```bash
git add package.json .env.example .gitignore vercel.json lib/db.js scripts/check-db.js
git commit -m "chore: scaffold project and add MongoDB connection helper"
```

(`.env.local`은 `.gitignore`에 있으므로 커밋되지 않는다 — 커밋 전 `git status`로 확인)

---

## Task 2: 비밀번호 해싱 헬퍼

**Files:**
- Create: `04_bbs/lib/password.js`
- Test: `04_bbs/test/password.test.js`

**Interfaces:**
- Consumes: 없음 (독립 모듈)
- Produces: `hashPassword(plain: string): Promise<string>`, `verifyPassword(plain: string, hash: string): Promise<boolean>` — Task 5, 8, 9에서 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
const test = require('node:test');
const assert = require('node:assert');
const { hashPassword, verifyPassword } = require('../lib/password');

test('hashPassword는 원본과 다른 문자열을 반환한다', async () => {
  const hash = await hashPassword('1234');
  assert.notStrictEqual(hash, '1234');
});

test('verifyPassword는 올바른 비밀번호에 true를 반환한다', async () => {
  const hash = await hashPassword('1234');
  const result = await verifyPassword('1234', hash);
  assert.strictEqual(result, true);
});

test('verifyPassword는 틀린 비밀번호에 false를 반환한다', async () => {
  const hash = await hashPassword('1234');
  const result = await verifyPassword('9999', hash);
  assert.strictEqual(result, false);
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test test/password.test.js`
Expected: FAIL — `Cannot find module '../lib/password'`

- [ ] **Step 3: lib/password.js 구현**

```js
const bcrypt = require('bcryptjs');

async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

module.exports = { hashPassword, verifyPassword };
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test test/password.test.js`
Expected: PASS (테스트 3개 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/password.js test/password.test.js
git commit -m "feat: add password hashing helper"
```

---

## Task 3: 입력값 검증 헬퍼

**Files:**
- Create: `04_bbs/lib/validation.js`
- Test: `04_bbs/test/validation.test.js`

**Interfaces:**
- Consumes: 없음
- Produces: `validatePostInput(body): string[]`, `validateCommentInput(body): string[]` — 빈 배열이면 유효함. Task 5, 10에서 사용.

- [ ] **Step 1: 실패하는 테스트 작성**

```js
const test = require('node:test');
const assert = require('node:assert');
const { validatePostInput, validateCommentInput } = require('../lib/validation');

test('validatePostInput은 모든 값이 있으면 빈 배열을 반환한다', () => {
  const errors = validatePostInput({
    nickname: '홍길동',
    password: '1234',
    title: '제목',
    content: '내용',
  });
  assert.deepStrictEqual(errors, []);
});

test('validatePostInput은 닉네임이 없으면 에러를 포함한다', () => {
  const errors = validatePostInput({
    password: '1234',
    title: '제목',
    content: '내용',
  });
  assert.ok(errors.length > 0);
});

test('validatePostInput은 비밀번호가 4자 미만이면 에러를 포함한다', () => {
  const errors = validatePostInput({
    nickname: '홍길동',
    password: '12',
    title: '제목',
    content: '내용',
  });
  assert.ok(errors.length > 0);
});

test('validateCommentInput은 닉네임과 내용이 있으면 빈 배열을 반환한다', () => {
  const errors = validateCommentInput({ nickname: '이몽룡', content: '잘 봤습니다' });
  assert.deepStrictEqual(errors, []);
});

test('validateCommentInput은 내용이 없으면 에러를 포함한다', () => {
  const errors = validateCommentInput({ nickname: '이몽룡', content: '' });
  assert.ok(errors.length > 0);
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test test/validation.test.js`
Expected: FAIL — `Cannot find module '../lib/validation'`

- [ ] **Step 3: lib/validation.js 구현**

```js
function validatePostInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['요청 본문이 올바르지 않습니다'];
  }
  if (!body.nickname || typeof body.nickname !== 'string' || !body.nickname.trim()) {
    errors.push('닉네임을 입력하세요');
  }
  if (!body.password || typeof body.password !== 'string' || body.password.length < 4) {
    errors.push('비밀번호는 4자 이상이어야 합니다');
  }
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    errors.push('제목을 입력하세요');
  }
  if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
    errors.push('내용을 입력하세요');
  }
  return errors;
}

function validateCommentInput(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return ['요청 본문이 올바르지 않습니다'];
  }
  if (!body.nickname || typeof body.nickname !== 'string' || !body.nickname.trim()) {
    errors.push('닉네임을 입력하세요');
  }
  if (!body.content || typeof body.content !== 'string' || !body.content.trim()) {
    errors.push('댓글 내용을 입력하세요');
  }
  return errors;
}

module.exports = { validatePostInput, validateCommentInput };
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test test/validation.test.js`
Expected: PASS (테스트 5개 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/validation.js test/validation.test.js
git commit -m "feat: add input validation helpers"
```

---

## Task 4: ObjectId 검증 헬퍼

**Files:**
- Create: `04_bbs/lib/objectId.js`
- Test: `04_bbs/test/objectId.test.js`

**Interfaces:**
- Consumes: `mongodb` 패키지의 `ObjectId`
- Produces: `toObjectId(idString: string): ObjectId | null` — Task 7, 8, 9, 10에서 사용. 유효하지 않으면 `null`을 반환한다 (예외를 던지지 않음).

- [ ] **Step 1: 실패하는 테스트 작성**

```js
const test = require('node:test');
const assert = require('node:assert');
const { ObjectId } = require('mongodb');
const { toObjectId } = require('../lib/objectId');

test('toObjectId는 유효한 24자리 16진수 문자열을 ObjectId로 변환한다', () => {
  const valid = new ObjectId().toString();
  const result = toObjectId(valid);
  assert.ok(result instanceof ObjectId);
  assert.strictEqual(result.toString(), valid);
});

test('toObjectId는 형식이 잘못된 문자열에 null을 반환한다', () => {
  assert.strictEqual(toObjectId('not-an-id'), null);
});

test('toObjectId는 문자열이 아닌 값에 null을 반환한다', () => {
  assert.strictEqual(toObjectId(undefined), null);
  assert.strictEqual(toObjectId(123), null);
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

Run: `node --test test/objectId.test.js`
Expected: FAIL — `Cannot find module '../lib/objectId'`

- [ ] **Step 3: lib/objectId.js 구현**

```js
const { ObjectId } = require('mongodb');

function toObjectId(idString) {
  if (typeof idString !== 'string' || !ObjectId.isValid(idString)) {
    return null;
  }
  return new ObjectId(idString);
}

module.exports = { toObjectId };
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

Run: `node --test test/objectId.test.js`
Expected: PASS (테스트 3개 모두 통과)

- [ ] **Step 5: 커밋**

```bash
git add lib/objectId.js test/objectId.test.js
git commit -m "feat: add ObjectId validation helper"
```

---

## Task 5: Create — 글쓰기 API (POST /api/posts)

**Files:**
- Create: `04_bbs/api/posts/index.js`

**Interfaces:**
- Consumes: `getDb()` (Task 1), `hashPassword()` (Task 2), `validatePostInput()` (Task 3)
- Produces: `POST /api/posts` 엔드포인트. 성공 시 `201 { _id }`, 검증 실패 시 `400 { errors: string[] }`.

- [ ] **Step 1: api/posts/index.js에 POST 핸들러 작성**

```js
const { getDb } = require('../../lib/db');
const { validatePostInput } = require('../../lib/validation');
const { hashPassword } = require('../../lib/password');

module.exports = async function handler(req, res) {
  const db = await getDb();
  const posts = db.collection('posts');

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
      imageUrl: req.body.imageUrl || null,
      viewCount: 0,
      createdAt: new Date(),
    };

    const result = await posts.insertOne(doc);
    res.status(201).json({ _id: result.insertedId });
    return;
  }

  res.status(405).json({ error: '지원하지 않는 메서드입니다' });
};
```

- [ ] **Step 2: 로컬 서버 실행**

Run: `npm run dev` (Vercel CLI가 처음 실행되면 로그인/프로젝트 연결을 물어볼 수 있음 — 안내에 따라 진행)
Expected: `http://localhost:3000` 에서 서버가 뜬다는 로그 출력

- [ ] **Step 3: 수동 검증 — 정상 등록**

Run (다른 터미널에서):
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"nickname":"홍길동","password":"1234","title":"안녕하세요","content":"첫 글입니다"}'
```
Expected: `{"_id":"..."}` 형태의 JSON과 HTTP 201 응답

- [ ] **Step 4: 수동 검증 — 필수값 누락 시 에러**

Run:
```bash
curl -X POST http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -d '{"nickname":"홍길동"}'
```
Expected: `{"errors":["비밀번호는 4자 이상이어야 합니다","제목을 입력하세요","내용을 입력하세요"]}` 와 HTTP 400

- [ ] **Step 5: 커밋**

```bash
git add api/posts/index.js
git commit -m "feat: add POST /api/posts (create)"
```

---

## Task 6: Read (목록) — 페이지네이션 + 검색 API (GET /api/posts)

**Files:**
- Modify: `04_bbs/api/posts/index.js` (Task 5에서 만든 파일에 GET 분기 추가)

**Interfaces:**
- Consumes: Task 5와 동일한 `posts` 컬렉션
- Produces: `GET /api/posts?page=&search=` — 응답 `200 { items: Post[], page: number, totalPages: number }`. `items`의 각 원소는 `content`, `passwordHash`를 포함하지 않는다.

- [ ] **Step 1: GET 분기를 POST 분기보다 앞에 추가**

`api/posts/index.js`를 열어 `module.exports = async function handler(req, res) {` 바로 다음, `if (req.method === 'POST')` 앞에 아래 블록을 추가한다:

```js
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
```

- [ ] **Step 2: 수동 검증 — 목록 조회**

Run: `curl http://localhost:3000/api/posts`
Expected: `{"items":[...Task5에서 만든 글...],"page":1,"totalPages":1}`

- [ ] **Step 3: 수동 검증 — 제목 검색**

Run: `curl "http://localhost:3000/api/posts?search=안녕"`
Expected: 제목에 "안녕"이 포함된 글만 `items`에 나타남

- [ ] **Step 4: 수동 검증 — 응답에 content/passwordHash가 없는지 확인**

Run: `curl http://localhost:3000/api/posts`
Expected: 응답 JSON의 각 항목에 `content`, `passwordHash` 키가 없어야 함 (`nickname`, `title`, `viewCount`, `createdAt`, `_id`만 있어야 함)

- [ ] **Step 5: 커밋**

```bash
git add api/posts/index.js
git commit -m "feat: add GET /api/posts (list with pagination and search)"
```

---

## Task 7: Read (상세) — 조회수 증가 포함 API (GET /api/posts/[id])

**Files:**
- Create: `04_bbs/api/posts/[id].js`

**Interfaces:**
- Consumes: `getDb()` (Task 1), `toObjectId()` (Task 4)
- Produces: `GET /api/posts/:id` — `200 { ...post필드, comments: [] }` (comments는 Task 10 전까지 항상 빈 배열), `404`(없음), `400`(id 형식 오류).

- [ ] **Step 1: api/posts/[id].js 작성 (GET만 구현, 다른 메서드는 405)**

```js
const { getDb } = require('../../lib/db');
const { toObjectId } = require('../../lib/objectId');

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

  res.status(405).json({ error: '지원하지 않는 메서드입니다' });
};
```

- [ ] **Step 2: 수동 검증 — 상세 조회 및 조회수 증가**

Task 5에서 만든 글의 `_id`를 이용해:
```bash
curl http://localhost:3000/api/posts/<그_id>
```
Expected: `viewCount: 1`. 같은 명령을 다시 실행하면 `viewCount: 2`로 올라감.

- [ ] **Step 3: 수동 검증 — 없는 id**

Run: `curl http://localhost:3000/api/posts/000000000000000000000000`
Expected: `{"error":"글을 찾을 수 없습니다"}`, HTTP 404

- [ ] **Step 4: 수동 검증 — 형식이 잘못된 id**

Run: `curl http://localhost:3000/api/posts/abc`
Expected: `{"error":"올바르지 않은 글 번호입니다"}`, HTTP 400

- [ ] **Step 5: 커밋**

```bash
git add "api/posts/[id].js"
git commit -m "feat: add GET /api/posts/[id] (detail with view count)"
```

---

## Task 8: Update — 글 수정 API (PUT /api/posts/[id])

**Files:**
- Modify: `04_bbs/api/posts/[id].js`

**Interfaces:**
- Consumes: `verifyPassword()` (Task 2)
- Produces: `PUT /api/posts/:id` — 비밀번호 일치 시 `200 { ok: true }`, 불일치 시 `403`, 글 없음 `404`.

- [ ] **Step 1: PUT 분기 추가**

`api/posts/[id].js`의 `if (req.method === 'GET')` 블록 다음, `res.status(405)` 앞에 추가:

```js
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
```

파일 맨 위 `require` 목록에 `verifyPassword`를 추가한다:

```js
const { verifyPassword } = require('../../lib/password');
```

- [ ] **Step 2: 수동 검증 — 틀린 비밀번호**

```bash
curl -X PUT http://localhost:3000/api/posts/<그_id> \
  -H "Content-Type: application/json" \
  -d '{"password":"9999","title":"수정시도","content":"내용"}'
```
Expected: `{"error":"비밀번호가 틀렸습니다"}`, HTTP 403. `curl http://localhost:3000/api/posts/<그_id>`로 다시 조회해서 제목이 그대로인지 확인.

- [ ] **Step 3: 수동 검증 — 올바른 비밀번호로 수정**

```bash
curl -X PUT http://localhost:3000/api/posts/<그_id> \
  -H "Content-Type: application/json" \
  -d '{"password":"1234","title":"수정된 제목","content":"수정된 내용"}'
```
Expected: `{"ok":true}`, HTTP 200. 다시 조회하면 제목/내용이 바뀌어 있어야 함.

- [ ] **Step 4: 커밋**

```bash
git add "api/posts/[id].js"
git commit -m "feat: add PUT /api/posts/[id] (update with password check)"
```

---

## Task 9: Delete — 글 삭제 API (DELETE /api/posts/[id])

**Files:**
- Modify: `04_bbs/api/posts/[id].js`

**Interfaces:**
- Consumes: `verifyPassword()` (Task 2)
- Produces: `DELETE /api/posts/:id` — 비밀번호 일치 시 `200 { ok: true }`이고 문서가 삭제됨.

- [ ] **Step 1: DELETE 분기 추가**

`if (req.method === 'PUT')` 블록 다음, `res.status(405)` 앞에 추가:

```js
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
```

- [ ] **Step 2: 수동 검증 — 틀린 비밀번호로 삭제 시도**

```bash
curl -X DELETE http://localhost:3000/api/posts/<그_id> \
  -H "Content-Type: application/json" -d '{"password":"9999"}'
```
Expected: `{"error":"비밀번호가 틀렸습니다"}`, HTTP 403. 목록 조회 시 글이 여전히 존재해야 함.

- [ ] **Step 3: 수동 검증 — 올바른 비밀번호로 삭제**

```bash
curl -X DELETE http://localhost:3000/api/posts/<그_id> \
  -H "Content-Type: application/json" -d '{"password":"1234"}'
```
Expected: `{"ok":true}`. 이후 `curl http://localhost:3000/api/posts/<그_id>`는 404.

- [ ] **Step 4: 새 테스트용 글 하나 다시 등록**

Task 5의 Step 3 curl 명령을 다시 실행해서, 이후 Task에서 쓸 글을 하나 만들어 둔다 (`_id`를 메모해 둘 것).

- [ ] **Step 5: 커밋**

```bash
git add "api/posts/[id].js"
git commit -m "feat: add DELETE /api/posts/[id] (delete with password check)"
```

---

## Task 10: 댓글 작성 API (POST /api/posts/[id]/comments)

**Files:**
- Create: `04_bbs/api/posts/[id]/comments.js`

**Interfaces:**
- Consumes: `getDb()`, `toObjectId()`, `validateCommentInput()`
- Produces: `POST /api/posts/:id/comments` — `201 { _id }`, 글 없으면 `404`, 검증 실패 `400`.

- [ ] **Step 1: api/posts/[id]/comments.js 작성**

```js
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
```

- [ ] **Step 2: 수동 검증 — 댓글 등록**

Task 9 Step 4에서 만든 글의 `_id`로:
```bash
curl -X POST http://localhost:3000/api/posts/<그_id>/comments \
  -H "Content-Type: application/json" \
  -d '{"nickname":"이몽룡","content":"잘 봤습니다"}'
```
Expected: `{"_id":"..."}`, HTTP 201

- [ ] **Step 3: 수동 검증 — 상세 조회에 댓글이 포함되는지 확인**

Run: `curl http://localhost:3000/api/posts/<그_id>`
Expected: 응답의 `comments` 배열에 방금 등록한 댓글이 들어있어야 함

- [ ] **Step 4: 수동 검증 — 없는 글에 댓글 시도**

```bash
curl -X POST http://localhost:3000/api/posts/000000000000000000000000/comments \
  -H "Content-Type: application/json" -d '{"nickname":"a","content":"b"}'
```
Expected: `{"error":"글을 찾을 수 없습니다"}`, HTTP 404

- [ ] **Step 5: 커밋**

```bash
git add "api/posts/[id]/comments.js"
git commit -m "feat: add POST /api/posts/[id]/comments"
```

---

## Task 11: 이미지 업로드 API (POST /api/upload, Vercel Blob)

**Files:**
- Create: `04_bbs/api/upload.js`

**Interfaces:**
- Consumes: `@vercel/blob`의 `put()`
- Produces: `POST /api/upload` — 요청 `{ filename, dataBase64, contentType }` → 응답 `200 { url }`.

- [ ] **Step 1: Vercel Blob 스토어 만들기 (브라우저 작업)**

1. https://vercel.com 에 로그인 → 이 프로젝트를 Vercel에 연결 (아직 안 했다면 `npx vercel link`)
2. Vercel 대시보드 → 프로젝트 → Storage 탭 → "Create Database" → **Blob** 선택 → 무료 티어로 생성
3. 생성된 Blob 스토어를 프로젝트에 연결(Connect)하면 `BLOB_READ_WRITE_TOKEN` 환경변수가 자동으로 추가됨
4. 로컬 개발을 위해 `vercel env pull .env.local` 실행 (Vercel의 환경변수를 로컬 `.env.local`로 받아옴 — `MONGODB_URI`도 Vercel 환경변수로 등록해뒀다면 함께 받아짐)

- [ ] **Step 2: api/upload.js 작성**

```js
const { put } = require('@vercel/blob');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '지원하지 않는 메서드입니다' });
    return;
  }

  const { filename, dataBase64, contentType } = req.body || {};
  if (!filename || !dataBase64) {
    res.status(400).json({ error: '이미지 데이터가 없습니다' });
    return;
  }

  const buffer = Buffer.from(dataBase64, 'base64');
  const blob = await put(filename, buffer, {
    access: 'public',
    contentType,
    addRandomSuffix: true,
  });

  res.status(200).json({ url: blob.url });
};
```

- [ ] **Step 3: 수동 검증 — 작은 이미지로 업로드 테스트**

```bash
# 아무 작은 png 파일을 base64로 변환해서 테스트 (macOS/Linux: base64 -i, Windows PowerShell: [Convert]::ToBase64String)
node -e "console.log(require('fs').readFileSync('test.png').toString('base64'))" > /tmp/b64.txt
```

간단히 Node REPL로도 검증 가능:
```bash
node -e "
const fs = require('fs');
const data = fs.readFileSync('./test.png').toString('base64');
fetch('http://localhost:3000/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ filename: 'test.png', dataBase64: data, contentType: 'image/png' }),
}).then(r => r.json()).then(console.log);
"
```
Expected: `{ url: 'https://....public.blob.vercel-storage.com/test-....png' }` 형태의 응답. 그 URL을 브라우저로 열어서 이미지가 보이는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add api/upload.js
git commit -m "feat: add POST /api/upload (Vercel Blob image upload)"
```

---

## Task 12: 공통 스타일시트

**Files:**
- Create: `04_bbs/public/style.css`

**Interfaces:**
- Produces: 이후 모든 HTML 페이지에서 `<link rel="stylesheet" href="style.css">`로 사용.

- [ ] **Step 1: style.css 작성**

```css
body {
  font-family: system-ui, sans-serif;
  max-width: 700px;
  margin: 20px auto;
  padding: 0 16px;
}
table { width: 100%; border-collapse: collapse; }
th, td { border-bottom: 1px solid #ddd; padding: 8px; text-align: left; }
.toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
form label { display: block; margin-bottom: 10px; }
form input, form textarea { width: 100%; padding: 6px; box-sizing: border-box; }
textarea { min-height: 120px; }
.error { color: #DC2626; }
#pagination button { margin-right: 4px; }
```

- [ ] **Step 2: 커밋**

```bash
git add public/style.css
git commit -m "feat: add shared stylesheet"
```

---

## Task 13: 프론트엔드 — 글 목록 (index.html / index.js)

**Files:**
- Create: `04_bbs/public/index.html`
- Create: `04_bbs/public/index.js`

**Interfaces:**
- Consumes: `GET /api/posts?page=&search=` (Task 6)

- [ ] **Step 1: index.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>게시판</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<h1>게시판</h1>
<div class="toolbar">
  <input id="searchInput" type="text" placeholder="제목 검색">
  <button id="searchBtn">검색</button>
  <a href="write.html"><button type="button">글쓰기</button></a>
</div>
<table>
  <thead><tr><th>제목</th><th>작성자</th><th>조회수</th><th>작성일</th></tr></thead>
  <tbody id="postList"></tbody>
</table>
<div id="pagination"></div>
<script src="index.js"></script>
</body>
</html>
```

- [ ] **Step 2: index.js 작성**

```js
const postList = document.getElementById('postList');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function getParams() {
  const params = new URLSearchParams(location.search);
  return {
    page: parseInt(params.get('page'), 10) || 1,
    search: params.get('search') || '',
  };
}

async function loadPosts() {
  const { page, search } = getParams();
  searchInput.value = search;

  const url = new URL('/api/posts', location.origin);
  url.searchParams.set('page', page);
  if (search) url.searchParams.set('search', search);

  const res = await fetch(url);
  const data = await res.json();

  postList.innerHTML = '';
  if (data.items.length === 0) {
    postList.innerHTML = '<tr><td colspan="4">글이 없습니다</td></tr>';
  }
  for (const post of data.items) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><a href="post.html?id=${post._id}">${escapeHtml(post.title)}</a></td>
      <td>${escapeHtml(post.nickname)}</td>
      <td>${post.viewCount}</td>
      <td>${new Date(post.createdAt).toLocaleDateString()}</td>
    `;
    postList.appendChild(tr);
  }

  pagination.innerHTML = '';
  for (let p = 1; p <= data.totalPages; p++) {
    const btn = document.createElement('button');
    btn.textContent = p;
    if (p === data.page) btn.disabled = true;
    btn.addEventListener('click', () => {
      const nextUrl = new URL(location.href);
      nextUrl.searchParams.set('page', p);
      location.href = nextUrl.toString();
    });
    pagination.appendChild(btn);
  }
}

searchBtn.addEventListener('click', () => {
  const nextUrl = new URL(location.href);
  nextUrl.searchParams.set('search', searchInput.value.trim());
  nextUrl.searchParams.set('page', 1);
  location.href = nextUrl.toString();
});

loadPosts();
```

- [ ] **Step 3: 수동 검증**

Run: `npm run dev` 실행 중인 상태에서 브라우저로 `http://localhost:3000` 접속
Expected: Task 5~9에서 curl로 만든 글이 목록에 보임. 검색창에 제목 일부를 입력하고 [검색] 클릭 시 필터링됨. 글이 10개 넘으면 페이지 버튼이 여러 개 보임 (지금은 없어도 됨 — 이 부분은 최종 통합 테스트에서 다시 확인).

- [ ] **Step 4: 커밋**

```bash
git add public/index.html public/index.js
git commit -m "feat: add post list page with pagination and search"
```

---

## Task 14: 프론트엔드 — 글쓰기 (write.html / write.js, 이미지 업로드 포함)

**Files:**
- Create: `04_bbs/public/write.html`
- Create: `04_bbs/public/write.js`

**Interfaces:**
- Consumes: `POST /api/upload` (Task 11), `POST /api/posts` (Task 5)

- [ ] **Step 1: write.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>글쓰기</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<h1>글쓰기</h1>
<form id="writeForm">
  <label>닉네임 <input type="text" id="nickname" required></label>
  <label>비밀번호 <input type="password" id="password" required minlength="4"></label>
  <label>제목 <input type="text" id="title" required></label>
  <label>내용 <textarea id="content" required></textarea></label>
  <label>이미지 (선택) <input type="file" id="image" accept="image/*"></label>
  <button type="submit">등록</button>
</form>
<p id="errorMsg" class="error"></p>
<script src="write.js"></script>
</body>
</html>
```

- [ ] **Step 2: write.js 작성**

```js
const form = document.getElementById('writeForm');
const errorMsg = document.getElementById('errorMsg');

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadImageIfAny() {
  const fileInput = document.getElementById('image');
  const file = fileInput.files[0];
  if (!file) return null;

  const dataBase64 = await readFileAsBase64(file);
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename: file.name, dataBase64, contentType: file.type }),
  });
  if (!res.ok) throw new Error('이미지 업로드에 실패했습니다');
  const data = await res.json();
  return data.url;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMsg.textContent = '';

  try {
    const imageUrl = await uploadImageIfAny();

    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: document.getElementById('nickname').value,
        password: document.getElementById('password').value,
        title: document.getElementById('title').value,
        content: document.getElementById('content').value,
        imageUrl,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      errorMsg.textContent = (data.errors || [data.error]).join(', ');
      return;
    }

    location.href = 'index.html';
  } catch (err) {
    errorMsg.textContent = err.message;
  }
});
```

- [ ] **Step 3: 수동 검증 — 이미지 없이 등록**

브라우저에서 `http://localhost:3000/write.html` 접속 → 이미지 없이 나머지 항목만 채워서 등록 → `index.html`로 이동하고 목록에 새 글이 보이는지 확인.

- [ ] **Step 4: 수동 검증 — 이미지 포함 등록**

같은 폼에서 이미지 파일 선택 후 등록 → 성공적으로 목록으로 이동하는지 확인 (상세 화면 확인은 Task 15에서).

- [ ] **Step 5: 커밋**

```bash
git add public/write.html public/write.js
git commit -m "feat: add write page with image upload"
```

---

## Task 15: 프론트엔드 — 글 상세/댓글/수정·삭제 버튼 (post.html / post.js)

**Files:**
- Create: `04_bbs/public/post.html`
- Create: `04_bbs/public/post.js`

**Interfaces:**
- Consumes: `GET /api/posts/:id` (Task 7), `DELETE /api/posts/:id` (Task 9), `POST /api/posts/:id/comments` (Task 10)

- [ ] **Step 1: post.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>글 상세</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<div id="postDetail"></div>
<div>
  <button id="editBtn" type="button">수정</button>
  <button id="deleteBtn" type="button">삭제</button>
  <a href="index.html"><button type="button">목록</button></a>
</div>
<hr>
<h3>댓글</h3>
<ul id="commentList"></ul>
<form id="commentForm">
  <input type="text" id="commentNickname" placeholder="닉네임" required>
  <input type="text" id="commentContent" placeholder="댓글 내용" required>
  <button type="submit">댓글 등록</button>
</form>
<p id="errorMsg" class="error"></p>
<script src="post.js"></script>
</body>
</html>
```

- [ ] **Step 2: post.js 작성**

```js
const params = new URLSearchParams(location.search);
const postId = params.get('id');
const postDetail = document.getElementById('postDetail');
const commentList = document.getElementById('commentList');
const errorMsg = document.getElementById('errorMsg');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadPost() {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    postDetail.innerHTML = '<p>글을 찾을 수 없습니다</p>';
    return;
  }
  const post = await res.json();

  postDetail.innerHTML = `
    <h1>${escapeHtml(post.title)}</h1>
    <p>작성자: ${escapeHtml(post.nickname)} | 조회수: ${post.viewCount}</p>
    ${post.imageUrl ? `<img src="${post.imageUrl}" alt="첨부 이미지" style="max-width:400px">` : ''}
    <p>${escapeHtml(post.content)}</p>
  `;

  commentList.innerHTML = '';
  for (const c of post.comments) {
    const li = document.createElement('li');
    li.textContent = `${c.nickname}: ${c.content}`;
    commentList.appendChild(li);
  }
}

document.getElementById('editBtn').addEventListener('click', () => {
  location.href = `edit.html?id=${postId}`;
});

document.getElementById('deleteBtn').addEventListener('click', async () => {
  const password = prompt('비밀번호를 입력하세요');
  if (password === null) return;

  const res = await fetch(`/api/posts/${postId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });

  if (!res.ok) {
    const data = await res.json();
    errorMsg.textContent = data.error || '삭제에 실패했습니다';
    return;
  }

  location.href = 'index.html';
});

document.getElementById('commentForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nickname = document.getElementById('commentNickname').value;
  const content = document.getElementById('commentContent').value;

  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, content }),
  });

  if (!res.ok) {
    const data = await res.json();
    errorMsg.textContent = (data.errors || [data.error]).join(', ');
    return;
  }

  document.getElementById('commentForm').reset();
  loadPost();
});

loadPost();
```

- [ ] **Step 3: 수동 검증 — 상세 화면과 조회수**

`index.html`에서 글 제목 클릭 → 상세 화면 진입 → 이미지 첨부한 글이면 이미지가 보이는지 확인. 새로고침할 때마다 조회수가 오르는지 확인.

- [ ] **Step 4: 수동 검증 — 댓글**

댓글 폼에 입력 후 등록 → 댓글 목록에 바로 추가되는지 확인. 댓글에 수정/삭제 버튼이 없는지 확인 (의도된 동작).

- [ ] **Step 5: 수동 검증 — 삭제(잘못된 비밀번호)**

[삭제] 클릭 → 틀린 비밀번호 입력 → 에러 메시지가 보이고 페이지가 그대로인지 확인 (실제 삭제는 Task 16 통합 테스트에서).

- [ ] **Step 6: 커밋**

```bash
git add public/post.html public/post.js
git commit -m "feat: add post detail page with comments and delete"
```

---

## Task 16: 프론트엔드 — 글 수정 (edit.html / edit.js) + Vercel 배포 + 최종 QA

**Files:**
- Create: `04_bbs/public/edit.html`
- Create: `04_bbs/public/edit.js`

**Interfaces:**
- Consumes: `GET /api/posts/:id` (Task 7), `PUT /api/posts/:id` (Task 8)

- [ ] **Step 1: edit.html 작성**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<title>글 수정</title>
<link rel="stylesheet" href="style.css">
</head>
<body>
<h1>글 수정</h1>
<form id="editForm">
  <label>비밀번호 <input type="password" id="password" required></label>
  <label>제목 <input type="text" id="title" required></label>
  <label>내용 <textarea id="content" required></textarea></label>
  <button type="submit">수정 완료</button>
</form>
<p id="errorMsg" class="error"></p>
<script src="edit.js"></script>
</body>
</html>
```

- [ ] **Step 2: edit.js 작성**

```js
const params = new URLSearchParams(location.search);
const postId = params.get('id');
const errorMsg = document.getElementById('errorMsg');

async function loadPost() {
  const res = await fetch(`/api/posts/${postId}`);
  if (!res.ok) {
    errorMsg.textContent = '글을 찾을 수 없습니다';
    return;
  }
  const post = await res.json();
  document.getElementById('title').value = post.title;
  document.getElementById('content').value = post.content;
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const res = await fetch(`/api/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      password: document.getElementById('password').value,
      title: document.getElementById('title').value,
      content: document.getElementById('content').value,
    }),
  });

  if (!res.ok) {
    const data = await res.json();
    errorMsg.textContent = data.error || '수정에 실패했습니다';
    return;
  }

  location.href = `post.html?id=${postId}`;
});

loadPost();
```

- [ ] **Step 3: 수동 검증 — 로컬에서 수정 흐름 전체 확인**

`index.html` → 글 클릭 → [수정] → 틀린 비밀번호로 시도(에러 확인) → 올바른 비밀번호로 제목/내용 변경 → 상세 화면으로 돌아와서 반영됐는지 확인.

- [ ] **Step 4: 커밋**

```bash
git add public/edit.html public/edit.js
git commit -m "feat: add edit page"
```

- [ ] **Step 5: Vercel에 환경변수 등록 (브라우저 작업)**

Vercel 대시보드 → 프로젝트 → Settings → Environment Variables에서:
- `MONGODB_URI` = Task 1에서 만든 연결 문자열
- (`BLOB_READ_WRITE_TOKEN`은 Task 11에서 Blob 스토어를 연결하면 자동으로 추가되어 있어야 함 — 없으면 수동으로 추가)

- [ ] **Step 6: 배포**

Run: `npx vercel --prod`
Expected: 배포 완료 후 `https://프로젝트이름.vercel.app` 형태의 URL 출력

- [ ] **Step 7: 배포된 주소에서 스펙의 최종 체크리스트 실행**

`docs/superpowers/specs/2026-07-28-bbs-design.md`의 "6. 테스트 방식" 체크리스트를 배포된 URL에서 그대로 실행한다:

- [ ] 글쓰기: 이미지 포함/미포함 각각 정상 등록되는지
- [ ] 글 목록: 페이지네이션이 정확히 넘어가는지 (10개 넘게 글을 등록해서 확인), 제목 검색이 잘 되는지
- [ ] 글 상세: 조회할 때마다 조회수가 1씩 오르는지
- [ ] 글 수정/삭제: 비밀번호 맞으면 성공, 틀리면 실패하는지
- [ ] 댓글: 등록이 잘 되고, 수정/삭제 버튼이 없는지
- [ ] 없는 글 id로 접근 시 404 화면이 뜨는지
- [ ] 배포된 주소에서 위 항목이 모두 동작하는지

- [ ] **Step 8: 최종 커밋 (필요 시)**

체크리스트 진행 중 발견한 사소한 수정이 있다면 반영 후:
```bash
git add -A
git commit -m "fix: address issues found in final deployment QA"
```

---

## 완료 기준

Task 1~16이 모두 끝나면: 배포된 Vercel 주소에서 로그인 없이 글을 쓰고(이미지 포함), 목록에서 페이지 이동·검색을 하고, 상세에서 조회수가 오르고 댓글을 달고, 비밀번호로 수정·삭제까지 되는 게시판이 완성된다.
