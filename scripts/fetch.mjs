import fs from 'node:fs/promises';
import path from 'node:path';
import * as cheerio from 'cheerio';
import { SITE } from '../config.mjs';

// data/index.json(전체 목록)을 기준으로 본문을 받아 data/posts.json에 누적한다.
// 이미 받은 글은 건너뛰므로 중단 후 다시 실행해도 이어서 진행된다.
//   LIMIT  이번 실행에서 새로 받을 최대 건수 (기본 전체)
//   DELAY  요청 간 대기 ms (기본 1500)

const LIMIT = Number(process.env.LIMIT ?? Infinity);
const DELAY = Number(process.env.DELAY ?? 1500);
const DIR = path.join(process.cwd(), 'data');
const POSTS = path.join(DIR, 'posts.json');
const INDEX = path.join(DIR, 'index.json');
const FAILED = path.join(DIR, 'failed.json');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f, d) => {
  try {
    return JSON.parse(await fs.readFile(f, 'utf8'));
  } catch {
    return d;
  }
};

// 네이버 스마트에디터3(se-main-container) 본문을 블록 배열로 변환
function extractSE3($) {
  const root = $('.se-main-container').first();
  if (!root.length) return [];
  const blocks = [];

  root.find('.se-component').each((_, el) => {
    const $c = $(el);
    const cls = $c.attr('class') ?? '';

    if (cls.includes('se-image')) {
      const $img = $c.find('img').first();
      const src = $img.attr('data-lazy-src') || $img.attr('src');
      if (src) {
        blocks.push({
          type: 'image',
          src: src.replace(/\?type=\w+$/, '?type=w966'),
          alt: $c.find('.se-caption').text().trim() || '',
        });
      }
      return;
    }
    if (cls.includes('se-quotation')) {
      const t = $c.text().trim().replace(/\s+/g, ' ');
      if (t) blocks.push({ type: 'quote', text: t });
      return;
    }
    if (cls.includes('se-horizontalLine')) {
      blocks.push({ type: 'hr' });
      return;
    }
    if (cls.includes('se-text')) {
      $c.find('.se-text-paragraph').each((__, p) => {
        const t = $(p).text().replace(/\u200b/g, '').trim();
        if (t) blocks.push({ type: 'p', text: t });
      });
    }
  });
  return blocks;
}

// 구 에디터(smartOutput / postViewArea)용 대체 추출
function extractLegacy($) {
  const root = $('#postViewArea, .post-view, .se_component_wrap').first();
  if (!root.length) return [];
  const blocks = [];
  root.find('p, div.se_textarea, img').each((_, el) => {
    const $e = $(el);
    if (el.tagName === 'img') {
      const src = $e.attr('data-lazy-src') || $e.attr('src');
      if (src && !src.includes('blank.gif') && !src.includes('ssl.pstatic'))
        blocks.push({ type: 'image', src, alt: '' });
      return;
    }
    const t = $e.clone().children('img').remove().end().text().replace(/\u200b/g, '').trim();
    if (t && t.length > 1) blocks.push({ type: 'p', text: t });
  });
  return blocks;
}

// 네이버 URL 인코딩은 공백을 +로 보낸다.
const decode = (s) => {
  try {
    return decodeURIComponent(String(s ?? '').replace(/\+/g, ' '));
  } catch {
    return String(s ?? '');
  }
};

// "2026. 11. 14. 10:06" → ISO
function parseDate(s, fallback) {
  const m = String(s ?? '').match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s*(?:(\d{1,2}):(\d{2}))?/);
  if (!m) return fallback;
  const [, y, mo, d, h = '9', mi = '0'] = m;
  return new Date(Date.UTC(+y, +mo - 1, +d, +h - 9, +mi)).toISOString();
}

async function fetchPost(meta) {
  const url =
    `https://blog.naver.com/PostView.naver?blogId=${SITE.blogId}&logNo=${meta.logNo}` +
    `&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  let body = extractSE3($);
  let editor = 'se3';
  if (!body.length) {
    body = extractLegacy($);
    editor = 'legacy';
  }
  if (!body.length) throw new Error('본문 비어 있음');

  const category =
    decode(html.match(/var\s+categoryName\s*=\s*"([^"]*)"/)?.[1] ?? '') ||
    $('#categoryTitle strong').text().trim() ||
    '미분류';

  // 최근 글은 화면에 "13시간 전"처럼만 보인다. 절대 시각은 하단 스크립트 인자에 있다.
  const stamp = html.match(/postViewBottomTitleListController\.start\([\s\S]{0,500}?'(\d{13})'/)?.[1];
  const published = $('.se_publishDate, .blog2_series .date, .date').first().text().trim();
  const plain = body.filter((b) => b.type === 'p').map((b) => b.text).join(' ');
  const pubDate =
    stamp && Number.isFinite(Number(stamp))
      ? new Date(Number(stamp)).toISOString()
      : parseDate(published || meta.addDate, new Date().toISOString());

  return {
    logNo: meta.logNo,
    title: meta.title,
    category,
    pubDate,
    tags: [], // scripts/tags.mjs 가 배치 API로 채운다
    sourceUrl: meta.sourceUrl,
    body,
    summary: plain.slice(0, 180).trim() + (plain.length > 180 ? '…' : ''),
    charCount: plain.length,
    editor,
    fetchedAt: new Date().toISOString(),
  };
}

// ── 실행 ──
const index = await readJson(INDEX, []);
if (!index.length) {
  console.error('data/index.json 이 없습니다. 먼저 `node scripts/list.mjs` 를 실행하세요.');
  process.exit(1);
}

const posts = await readJson(POSTS, []);
const have = new Set(posts.map((p) => p.logNo));
const failed = await readJson(FAILED, []);
const todo = index.filter((m) => !have.has(m.logNo)).slice(0, LIMIT);

console.log(`전체 ${index.length}건 / 보유 ${have.size}건 / 이번 수집 대상 ${todo.length}건`);
console.log(`요청 간격 ${DELAY}ms — 예상 ${Math.ceil((todo.length * DELAY) / 60000)}분\n`);

let ok = 0;
let ng = 0;
const save = async () => {
  posts.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  await fs.writeFile(POSTS, JSON.stringify(posts, null, 2), 'utf8');
  await fs.writeFile(FAILED, JSON.stringify(failed, null, 2), 'utf8');
};

for (const [i, meta] of todo.entries()) {
  try {
    const post = await fetchPost(meta);
    posts.push(post);
    have.add(post.logNo);
    ok++;
  } catch (e) {
    ng++;
    failed.push({ logNo: meta.logNo, title: meta.title, error: e.message });
    console.warn(`  ! 실패 ${meta.logNo} — ${e.message}`);
  }

  const n = i + 1;
  if (n % 25 === 0 || n === todo.length) {
    await save();
    const pct = ((n / todo.length) * 100).toFixed(1);
    console.log(`  ${n}/${todo.length} (${pct}%) — 성공 ${ok} 실패 ${ng} — 저장됨`);
  }
  if (n < todo.length) await sleep(DELAY);
}

await save();
console.log(`\n완료 — 총 보유 ${posts.length}건 (이번 성공 ${ok} / 실패 ${ng})`);
