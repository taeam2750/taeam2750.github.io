import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SITE } from '../config.mjs';

// 네이버 블로그에서 아직 없는 글만 받아 사이트를 다시 만든다.
// 목록은 최신 페이지부터 보다가, 이미 알고 있는 글만 있는 페이지에서 멈춘다.

const DIR = path.join(process.cwd(), 'data');
const INDEX = path.join(DIR, 'index.json');
const PER = 30;
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => {
  try {
    return decodeURIComponent(String(s ?? '').replace(/\+/g, ' '));
  } catch {
    return String(s ?? '');
  }
};

async function listPage(n) {
  const url =
    `https://blog.naver.com/PostTitleListAsync.naver?blogId=${SITE.blogId}` +
    `&viewdate=&currentPage=${n}&categoryNo=&parentCategoryNo=&countPerPage=${PER}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Referer: `https://blog.naver.com/${SITE.blogId}` },
  });
  if (!res.ok) throw new Error(`목록 ${n}페이지 HTTP ${res.status}`);
  const text = (await res.text()).replace(/\\'/g, "'");
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/"postList"\s*:\s*(\[[\s\S]*?\])\s*,\s*"countPerPage"/);
    const total = text.match(/"totalCount"\s*:\s*"(\d+)"/)?.[1] ?? '0';
    if (!m) throw new Error(`목록 ${n}페이지 파싱 실패`);
    return { postList: JSON.parse(m[1]), totalCount: total };
  }
}

function toMeta(p) {
  return {
    logNo: String(p.logNo),
    title: decode(p.title),
    categoryNo: String(p.categoryNo ?? ''),
    addDate: p.addDate,
    sourceUrl: `${SITE.org.blog}/${p.logNo}`,
  };
}

function run(script, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {
      stdio: 'inherit',
      env: { ...process.env, ...env },
    });
    child.on('error', reject);
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${script} 종료 코드 ${code}`))));
  });
}

const index = JSON.parse(await fs.readFile(INDEX, 'utf8'));
const known = new Set(index.map((m) => String(m.logNo)));
const fresh = [];

const first = await listPage(1);
const total = Number(first.totalCount);
const pages = Math.ceil(total / PER);
console.log(`네이버 전체 ${total}건 / 로컬 ${known.size}건`);

let pageNo = 1;
let batch = first.postList ?? [];
while (batch.length) {
  const metas = batch.filter((p) => p.logNo).map(toMeta);
  const novel = metas.filter((m) => !known.has(m.logNo) && !fresh.some((f) => f.logNo === m.logNo));
  fresh.push(...novel);
  // 이 페이지가 전부 기존 글이면 더 오래된 페이지에는 새 글이 없다.
  if (novel.length === 0) break;
  if (pageNo >= pages) break;
  pageNo += 1;
  await sleep(700);
  const next = await listPage(pageNo);
  batch = next.postList ?? [];
  console.log(`  목록 ${pageNo}/${pages}페이지`);
}

if (!fresh.length) {
  console.log('새 글이 없습니다.');
  process.exit(0);
}

console.log(`새 글 ${fresh.length}편`);
for (const m of fresh) console.log(`  - ${m.addDate} ${m.title}`);

await fs.writeFile(INDEX, JSON.stringify([...fresh, ...index], null, 2), 'utf8');

await run('scripts/categories.mjs');
await run('scripts/fetch.mjs');
await run('scripts/tags.mjs', { LOGNOS: fresh.map((m) => m.logNo).join(',') });
await run('scripts/build.mjs');
console.log('동기화 완료');
