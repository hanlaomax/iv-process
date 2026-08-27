/* Suy ra quan hệ giữa các câu hỏi trong cùng một chủ đề:
   - chip "khái niệm" cho mỗi câu (thuật ngữ **in đậm**)
   - danh sách "câu liên quan" (tự động + ghi đè thủ công qua q.related)
   - dữ liệu bản đồ khái niệm (nodes/edges) cho graph view
   Dùng chung bởi build.mjs + render.mjs. Không phụ thuộc npm. */
import { boldTerms } from './format.mjs';

/* Stopword: tiếng Việt hay gặp + thuật ngữ quá chung, không phân biệt được câu */
const STOP = new Set([
  'và', 'là', 'của', 'các', 'một', 'những', 'khi', 'nếu', 'thì', 'để', 'cho', 'với', 'trong',
  'ngoài', 'hoặc', 'nhưng', 'này', 'kia', 'đó', 'được', 'bị', 'có', 'không', 'phải', 'nên',
  'theo', 'từ', 'ra', 'vào', 'lên', 'xuống', 'rất', 'hơn', 'nhất', 'cùng', 'mỗi', 'nhiều',
  'system', 'service', 'server', 'client', 'data', 'value', 'object', 'method', 'class',
  'application', 'app', 'code', 'default', 'true', 'false', 'null',
]);

const norm = (t) =>
  String(t)
    .toLowerCase()
    .replace(/[`*_]/g, '')
    .replace(/[.,;:()"'?!/\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const usable = (n) => n.length >= 3 && n.length <= 40 && !STOP.has(n) && !/^\d+$/.test(n);

/* term gốc (giữ hoa/thường) + dạng chuẩn hoá, unique theo dạng chuẩn hoá */
function rawTerms(q) {
  const seen = new Map();
  for (const t of [...boldTerms(q.answer), ...boldTerms(q.essence)]) {
    const n = norm(t);
    if (!usable(n) || seen.has(n)) continue;
    seen.set(n, t.trim());
  }
  return seen; // Map<normalized, display>
}

/* Phân tích cả chủ đề một lần: tần suất tài liệu (df), tập từ quá phổ biến */
function analyze(list) {
  const perQ = list.map(rawTerms);
  const df = new Map();
  for (const m of perQ) for (const n of m.keys()) df.set(n, (df.get(n) || 0) + 1);
  const N = Math.max(1, list.length);
  const tooCommon = new Set([...df].filter(([, c]) => c > N * 0.25).map(([n]) => n));
  return { perQ, df, tooCommon };
}

const rarity = (df, n) => Math.max(1, 4 - Math.log2(df.get(n) || 1)); // từ hiếm -> điểm cao

function pairScore(aSet, bSet, df, sameCat) {
  let s = 0;
  for (const n of aSet) if (bSet.has(n)) s += rarity(df, n);
  if (sameCat) s += 0.6;
  return s;
}

function computeRelated(list, A) {
  // tập từ dùng để chấm điểm: bỏ từ quá phổ biến
  const eff = A.perQ.map((m) => new Set([...m.keys()].filter((n) => !A.tooCommon.has(n))));
  const ids = new Set(list.map((q) => q.id));
  const map = new Map();
  for (let i = 0; i < list.length; i++) {
    const scored = [];
    for (let j = 0; j < list.length; j++) {
      if (i === j) continue;
      const sc = pairScore(eff[i], eff[j], A.df, list[i].cat === list[j].cat);
      if (sc >= 2) scored.push([list[j].id, sc]);
    }
    scored.sort((a, b) => b[1] - a[1]);
    const auto = scored.slice(0, 5).map((x) => x[0]);
    const manual = (Array.isArray(list[i].related) ? list[i].related : []).filter((r) => ids.has(r));
    map.set(list[i].id, [...new Set([...manual, ...auto])].slice(0, 6));
  }
  return map;
}

function computeChips(list, A) {
  const map = new Map();
  list.forEach((q, i) => {
    const picked = [];
    for (const [n, disp] of A.perQ[i]) {
      if (A.tooCommon.has(n)) continue;
      picked.push(disp);
      if (picked.length >= 6) break;
    }
    map.set(q.id, picked);
  });
  return map;
}

function computeGraph(list, related) {
  const idx = new Map(list.map((q, i) => [q.id, i]));
  const seen = new Set();
  const edges = [];
  list.forEach((q, i) => {
    for (const rid of related.get(q.id) || []) {
      const j = idx.get(rid);
      if (j == null) continue;
      const [a, b] = i < j ? [i, j] : [j, i];
      const key = a + '-' + b;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b, 1]);
    }
  });
  return { nodes: list.map((q) => [q.id, q.cat]), edges };
}

/* connect(list) -> { related: Map<id,[id]>, chips: Map<id,[term]>, graph: {nodes,edges} } */
export function connect(list) {
  const A = analyze(list);
  const related = computeRelated(list, A);
  return { related, chips: computeChips(list, A), graph: computeGraph(list, related) };
}
