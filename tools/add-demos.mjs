/* Chèn field `demo` vào src/data/<file>.js từ một file patch dễ viết.
   Dùng: node add-demos.mjs <patch.txt> <duong/dan/data-file.js>

   Định dạng patch:
     @@ <chuỗi con duy nhất của câu hỏi>
     --- <lang> | <title>
     <code...>
     --- <lang> | <title>
     <code...>
     @@ <câu tiếp theo>
*/
import { readFileSync, writeFileSync } from 'node:fs';

const [patchPath, dataPath] = process.argv.slice(2);
if (!patchPath || !dataPath) {
  console.error('Dùng: node add-demos.mjs <patch.txt> <data-file.js>');
  process.exit(1);
}

/* ---------- parse patch ---------- */
const entries = [];
let cur = null;
let blk = null;
for (const raw of readFileSync(patchPath, 'utf8').split(/\r?\n/)) {
  if (raw.startsWith('@@ ')) {
    if (blk) cur.blocks.push(blk), (blk = null);
    cur = { match: raw.slice(3).trim(), blocks: [] };
    entries.push(cur);
  } else if (raw.startsWith('--- ')) {
    if (blk) cur.blocks.push(blk);
    const [lang, ...rest] = raw.slice(4).split('|');
    blk = { lang: lang.trim(), title: rest.join('|').trim(), lines: [] };
  } else if (blk) {
    blk.lines.push(raw);
  }
}
if (blk) cur.blocks.push(blk);

/* ---------- sinh source JS ---------- */
const q = (s) => JSON.stringify(s).replace(/'/g, "\\u0027"); // dùng JSON string, an toàn mọi ký tự

function codeSource(lines) {
  while (lines.length && lines[lines.length - 1].trim() === '') lines.pop();
  if (!lines.length) return "''";
  if (lines.length === 1) return q(lines[0]);
  return lines
    .map((l, i) => q(l + (i === lines.length - 1 ? '' : '\n')))
    .join(' +\n      ');
}

function demoSource(blocks) {
  const items = blocks.map(
    (b) => `    {
      lang: ${q(b.lang)},${b.title ? `\n      title: ${q(b.title)},` : ''}
      code:
        ${codeSource(b.lines).split('\n').join('\n  ')},
    },`
  );
  return `  demo: [\n${items.join('\n')}\n  ],\n`;
}

/* ---------- tách file dữ liệu thành các object câu hỏi ---------- */
const lines = readFileSync(dataPath, 'utf8').split('\n');
const blocksIdx = [];
let start = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i] === '{') start = i;
  else if (lines[i] === '},' && start >= 0) {
    blocksIdx.push([start, i]);
    start = -1;
  }
}

const inserts = []; // [lineIndexCuaDongDong, source]
let used = 0;
for (const e of entries) {
  const hits = blocksIdx.filter(([s, t]) =>
    lines.slice(s, t).some((l) => /^\s*q:/.test(l) && l.includes(e.match))
  );
  if (hits.length !== 1) {
    console.error(`✗ "${e.match}" khớp ${hits.length} câu (cần đúng 1)`);
    process.exit(1);
  }
  const [s, t] = hits[0];
  if (lines.slice(s, t).some((l) => /^\s*demo:/.test(l))) {
    console.error(`✗ "${e.match}" đã có demo`);
    process.exit(1);
  }
  inserts.push([t, demoSource(e.blocks)]);
  used++;
}

inserts.sort((a, b) => b[0] - a[0]); // chèn từ dưới lên để không lệch chỉ số
for (const [at, src] of inserts) lines.splice(at, 0, src.replace(/\n$/, ''));

writeFileSync(dataPath, lines.join('\n'));
console.log(`✓ Chèn ${used} demo vào ${dataPath}`);
