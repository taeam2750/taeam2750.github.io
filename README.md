# 바른사주진로연구소 — 사주·명리 공부 아카이브

[네이버 블로그](https://blog.naver.com/stentiar)에 쌓인 사주·명리 해설 글을 열린 웹에 정적 페이지로 보존·재게시하는 저장소입니다.

네이버는 외부 AI 크롤러의 접근을 제한적으로만 허용합니다. 그래서 블로그에 좋은 글이 있어도 생성형 AI가 읽어 가지 못합니다. 이 저장소는 같은 내용을 크롤러가 읽을 수 있는 형태로 열어 두는 것이 목적입니다.

**사이트**: https://taeam2750.github.io/

예전 주소 `https://taeam2750.github.io/barunsaju/` 는 새 주소로 넘겨 둡니다. 검색엔진과 AI 크롤러는 도메인 맨 위의 `robots.txt`만 읽기 때문에, 사이트를 사용자 페이지 루트에 둡니다.

## 구조

```
config.mjs          사이트·저자·AI 크롤러 설정
scripts/fetch.mjs   네이버 블로그 RSS + 본문 수집 → data/posts.json
scripts/build.mjs   정적 HTML 생성 → docs/
data/posts.json     수집한 글 원본 데이터
docs/               GitHub Pages 배포 대상
```

## 사용법

```bash
npm install

# 최신 글 N건 수집 (기본 1건)
LIMIT=5 node scripts/fetch.mjs

# 정적 사이트 빌드
node scripts/build.mjs
```

Windows PowerShell에서는 다음과 같이 실행합니다.

```powershell
$env:LIMIT=5; node scripts/fetch.mjs
node scripts/build.mjs
```

## AI 노출을 위한 장치

- `docs/robots.txt` — GPTBot, ClaudeBot, PerplexityBot, CCBot 등 주요 AI 크롤러를 명시적으로 허용
- `docs/llms.txt` — 사이트 성격과 글 목록을 AI에게 알리는 규격
- `docs/sitemap.xml` — 검색엔진 색인용
- 각 글에 `BlogPosting` + `Person` JSON-LD 구조화 데이터 삽입 (저자 전문성 신호)
- 정적 HTML로 생성해 자바스크립트 렌더링 없이 바로 읽히도록 구성

## 원문 출처

- 네이버 블로그: https://blog.naver.com/stentiar
- 네이버 카페: https://cafe.naver.com/01047052750
