import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE } from '../config.mjs';

// BlogTagListInfo.naver 는 logNo 를 여러 개 받아 한 번에 태그를 돌려준다.
// data/posts.json 의 tags 필드를 채운다.

const POSTS = path.join(process.cwd(), 'data', 'posts.json');
const BATCH = 30;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => {
  try {
    return decodeURIComponent(String(s ?? '').replace(/\+/g, ' '));
  } catch {
    return '';
  }
};

const posts = JSON.parse(await fs.readFile(POSTS, 'utf8'));
// LOGNOS 가 있으면 그 글만 본다. 매일 동기화할 때 태그 없는 예전 글을 다시 묻지 않기 위함이다.
const only = new Set(
  (process.env.LOGNOS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
);
const todo = posts.filter((p) => !p.tags?.length && (!only.size || only.has(String(p.logNo))));
console.log(`전체 ${posts.length}건 / 태그 조회 대상 ${todo.length}건`);

const byLog = new Map(posts.map((p) => [String(p.logNo), p]));
let filled = 0;

for (let i = 0; i < todo.length; i += BATCH) {
  const chunk = todo.slice(i, i + BATCH);
  const qs = chunk.map((p) => `logNo=${p.logNo}`).join('&');
  try {
    const res = await fetch(`https://blog.naver.com/BlogTagListInfo.naver?blogId=${SITE.blogId}&${qs}`, {
      headers: { 'User-Agent': UA, Referer: `https://blog.naver.com/${SITE.blogId}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    for (const m of (await res.text()).matchAll(/"logno"\s*:\s*"(\d+)"\s*,\s*"tagName"\s*:\s*"([^"]*)"/g)) {
      const post = byLog.get(m[1]);
      if (!post) continue;
      const tags = decode(m[2]).split(',').map((t) => t.trim()).filter(Boolean);
      if (tags.length) {
        post.tags = tags;
        filled++;
      }
    }
  } catch (e) {
    console.warn(`  ! ${i}~${i + chunk.length} 실패: ${e.message}`);
  }

  const done = Math.min(i + BATCH, todo.length);
  console.log(`  ${done}/${todo.length} — 채움 ${filled}건`);
  await sleep(800);
}

await fs.writeFile(POSTS, JSON.stringify(posts, null, 2), 'utf8');
console.log(`\n완료 — 태그 보유 ${posts.filter((p) => p.tags?.length).length}/${posts.length}건`);
