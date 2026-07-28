# 게시판(BBS) 프로젝트 설계 문서

- 작성일: 2026-07-28 (수정)
- 목적: 학생 학습용 프로젝트. 게시판 개발을 통해 CRUD 흐름과 풀스택 개발에 필요한
  기술(프론트-서버-DB-배포)을 이해하는 것이 목표.
- 학습자 배경: HTML/CSS/JS 기초는 있음. React 등 프레임워크 및 DB/SQL 경험 없음.
  → 프레임워크 없이 순수 HTML/CSS/JS + SQL이 필요 없는 MongoDB로 진행.

## 요구사항 요약

- 로그인/회원가입 없음
- 글 작성 시 닉네임 + 비밀번호 입력, 글 수정/삭제는 비밀번호 검증 후 가능
- 이미지 첨부 가능한 글
- 글 목록 페이지네이션
- 글 제목 검색
- 조회수 표시
- 댓글 기능 (작성만 가능, 수정/삭제 불가)
- Vercel에 무료로 배포 가능해야 함 (비용 발생 서비스 사용 금지)

## 1. 아키텍처

```
브라우저(사용자)
   │
   ▼
정적 HTML/CSS/JS 페이지 (index.html, post.html, write.html, edit.html)
   │  fetch('/api/...')
   ▼
Vercel Serverless Functions (/api, 순수 Node.js, 프레임워크 없음)
   │
   ├─▶ MongoDB Atlas (posts, comments 컬렉션) — 무료 티어
   └─▶ Vercel Blob (이미지 파일) — 무료 티어
   │
   ▼
Vercel에 배포 (정적 페이지 + API 함께 호스팅, 전부 무료 티어)
```

**기술 스택**
- 프론트엔드: React/Next.js 등 프레임워크 없이 순수 HTML/CSS/JS. 화면별로
  파일을 나눔 (`index.html`, `post.html`, `write.html`, `edit.html`).
- 백엔드: Next.js 없이 Vercel Serverless Functions만 사용. `/api` 폴더 안의
  파일 하나하나가 API 엔드포인트가 됨 (Vercel은 프레임워크 없이도
  `api/posts/[id].js` 같은 동적 라우팅을 지원함).
- 데이터베이스: MongoDB Atlas 무료 티어. SQL 문법이 필요 없고, JS 객체와 비슷한
  "문서(document)" 형태로 데이터를 다룸 (`db.collection('posts').insertOne(...)`).
- 이미지 저장소: Vercel Blob 무료 티어. 브라우저에서 직접 업로드 후 받은 URL을
  글 데이터에 함께 저장.
- 배포: Vercel 무료 티어.

## 2. 데이터 모델 (MongoDB 컬렉션)

SQL의 "테이블"에 해당하는 것이 MongoDB에서는 "컬렉션"이고, "행"에 해당하는 것이
"문서(document)"입니다. 문서는 JSON과 거의 같은 모양입니다.

**posts 컬렉션**

```json
{
  "_id": "ObjectId(자동 생성되는 고유 식별자)",
  "nickname": "홍길동",
  "passwordHash": "$2b$10$Xy8f...",
  "title": "안녕하세요",
  "content": "첫 글입니다",
  "imageUrl": "https://.../사진1.png",
  "viewCount": 0,
  "createdAt": "2026-07-28T12:00:00Z"
}
```

**comments 컬렉션**

```json
{
  "_id": "ObjectId(자동 생성)",
  "postId": "댓글이 달린 글의 _id",
  "nickname": "이몽룡",
  "content": "잘 봤습니다",
  "createdAt": "2026-07-28T12:05:00Z"
}
```

댓글은 삭제 기능이 없으므로 passwordHash 필드가 없습니다. `imageUrl`은 선택
항목(이미지 없으면 필드 자체를 생략하거나 `null`).

## 3. API 설계

| 메서드 | 주소 | 역할 |
|--------|------|------|
| GET | `/api/posts?page=1&search=검색어` | 글 목록 조회 (페이지네이션 + 제목 검색) |
| GET | `/api/posts/[id]` | 글 상세 조회 (조회수 +1, 댓글 목록 포함) |
| POST | `/api/posts` | 글 등록 (닉네임, 비밀번호, 제목, 내용, 이미지주소) |
| PUT | `/api/posts/[id]` | 글 수정 (비밀번호 검증 필요) |
| DELETE | `/api/posts/[id]` | 글 삭제 (비밀번호 검증 필요) |
| POST | `/api/posts/[id]/comments` | 댓글 등록 |

`[id]`는 MongoDB의 `_id` 값(ObjectId 문자열)입니다. 형식이 올바르지 않은 id가
들어오면(예: 너무 짧은 문자열) 400 에러로 처리합니다.

이미지는 브라우저에서 Vercel Blob으로 직접 업로드 후, 반환받은 URL을
`POST /api/posts`의 `imageUrl` 값으로 함께 전송합니다.

비밀번호는 저장 시 해시(bcrypt)로 암호화하며, 수정/삭제 요청 시 입력값을
동일 방식으로 해시하여 저장된 값과 비교합니다.

## 4. 화면 구성

프레임워크가 없으므로 화면 하나당 HTML 파일 하나이고, 페이지 이동은
`<a href="post.html?id=...">` 같은 일반 링크와 `location.href` 이동으로 처리합니다.

```
public/index.html        → 글 목록 (페이지네이션 + 검색창)
public/post.html          → 글 상세 (?id=글번호 쿼리스트링으로 어떤 글인지 식별)
public/write.html         → 글쓰기
public/edit.html          → 글 수정 (?id=글번호, 비밀번호 확인 후 진입)
```

**주요 흐름**

```
[글 목록] --글쓰기 버튼--> write.html 이동
   닉네임/비밀번호/제목/내용/이미지 입력 → 이미지는 Vercel Blob으로 바로 업로드
   → 등록 버튼 → POST /api/posts → 성공 시 index.html로 이동

[글 목록] --글 클릭--> post.html?id=5 이동
   GET /api/posts/5 호출 (조회수 자동 +1)
   → 하단에 댓글 입력창, 댓글 목록 표시

[글 상세] --수정 버튼--> 비밀번호 입력 팝업
   → PUT /api/posts/5 로 비밀번호+수정내용 전송
   → 서버가 비밀번호 일치 확인 후 수정 반영, 틀리면 에러 메시지
```

## 5. 에러 처리

| 상황 | 처리 방식 |
|------|----------|
| 필수 입력값 누락 | 프론트에서 1차 검증 + API에서 400 에러로 재검증 |
| 수정/삭제 시 비밀번호 불일치 | API 403 반환 → "비밀번호가 틀렸습니다" 표시 |
| 존재하지 않거나 형식이 잘못된 글 id | API 404(없음)/400(형식오류) 반환 → "글을 찾을 수 없습니다" 화면 |
| 이미지 업로드 실패 | 실패 메시지 표시, 이미지 없이도 글 등록 가능 (선택 항목) |
| MongoDB 연결 실패 등 서버 오류 | API 500 반환 → 공통 에러 메시지 |
| 페이지네이션 범위 밖 페이지 요청 | 에러 아님, 빈 목록으로 "글이 없습니다" 표시 |

## 6. 테스트 방식

학습 목표가 CRUD 흐름 이해이므로 별도 테스트 프레임워크 대신 수동 테스트
체크리스트로 검증한다.

- [ ] 글쓰기: 이미지 포함/미포함 각각 정상 등록되는지
- [ ] 글 목록: 페이지네이션이 정확히 넘어가는지, 제목 검색이 잘 되는지
- [ ] 글 상세: 조회할 때마다 조회수가 1씩 오르는지
- [ ] 글 수정/삭제: 비밀번호 맞으면 성공, 틀리면 실패하는지
- [ ] 댓글: 등록이 잘 되고, 수정/삭제 버튼이 없는지
- [ ] 없는 글 id로 접근 시 404 화면이 뜨는지
- [ ] Vercel 배포 후 실제 배포 주소에서도 위 항목이 모두 동작하는지

## 범위 밖 (Out of Scope)

- 회원가입/로그인 시스템
- 댓글 수정/삭제
- 카테고리, 태그, 좋아요 등 부가 기능

## 변경 이력

- 2026-07-28 최초 작성: Next.js + Supabase 스택으로 설계
- 2026-07-28 수정: 학습자가 프레임워크/SQL 경험이 없음을 반영하여
  순수 HTML/CSS/JS + Vercel Serverless Functions + MongoDB Atlas + Vercel Blob
  스택으로 전면 변경
