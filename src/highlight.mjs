/* Tô màu cú pháp lúc build — không phụ thuộc npm, chạy cả khi tắt JavaScript.
   highlight(code, lang) -> HTML đã escape, token bọc trong <span class="hl-*">.

   Lớp token:  c=comment  s=string  k=keyword  n=number  b=type/class
               t=annotation/attribute  y=key (yaml/json/properties)  v=variable  f=hàm

   Quy tắc viết rule: CHỈ dùng nhóm không bắt `(?:...)` bên trong mỗi rule —
   scan() dò nhóm nào khớp theo chỉ số, nhóm bắt lồng nhau sẽ làm lệch chỉ số. */
import { esc } from './format.mjs';

const kw = (words) => '\\b(?:' + words.trim().split(/\s+/).join('|') + ')\\b';

/* Chuỗi có escape: "..." và '...' (không vắt qua dòng) */
const DQ = '"(?:\\\\.|[^"\\\\\\n])*"';
const SQ = "'(?:\\\\.|[^'\\\\\\n])*'";

const LINE_C = (start) => start + '[^\\n]*';
const BLOCK_C = '/\\*[\\s\\S]*?\\*/';

const DEFS = {
  java: {
    flags: 'gm',
    rules: [
      ['c', LINE_C('//')],
      ['c', BLOCK_C],
      ['s', '"""[\\s\\S]*?"""'],
      ['s', DQ],
      ['s', SQ],
      ['t', '@[A-Za-z_]\\w*'],
      ['k', kw(`abstract assert boolean break byte case catch char class const continue default do
        double else enum extends final finally float for goto if implements import instanceof int
        interface long native new package private protected public return short static strictfp
        super switch synchronized this throw throws transient try void volatile while var record
        sealed permits yield true false null`)],
      ['n', '\\b(?:0[xXbB][0-9a-fA-F_]+|\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?\\d+)?[LlFfDd]?)\\b'],
      ['b', '\\b[A-Z][A-Za-z0-9_]*\\b'],
      ['f', '\\b[a-z_]\\w*(?=\\s*\\()'],
    ],
  },

  sql: {
    flags: 'gim',
    rules: [
      ['c', LINE_C('--')],
      ['c', BLOCK_C],
      ['s', "'(?:''|[^'\\n])*'"],
      ['k', kw(`select from where group by order having limit offset insert into values update set
        delete create alter drop table index view materialized sequence trigger function procedure
        primary foreign key references unique check constraint not null default cascade
        inner left right full outer cross join on using union all intersect except
        case when then else end and or in exists between like ilike is distinct as asc desc
        with recursive over partition rows range preceding following unbounded current row
        begin commit rollback savepoint transaction isolation level read committed repeatable
        serializable uncommitted lock share mode nowait skip locked for
        explain analyze vacuum returning conflict do nothing add column type if
        int integer bigint smallint serial bigserial numeric decimal real double precision
        varchar char text boolean date timestamp timestamptz interval json jsonb uuid array`)],
      ['n', '\\b\\d+(?:\\.\\d+)?\\b'],
      ['f', '\\b[a-z_]\\w*(?=\\s*\\()'],
    ],
  },

  yaml: {
    flags: 'gm',
    rules: [
      ['c', LINE_C('#')],
      ['y', '(?<=^[ \\t]*(?:-[ \\t]*)?)[\\w.$/\\[\\]-]+(?=\\s*:(?:\\s|$))'],
      ['s', DQ],
      ['s', SQ],
      ['k', '\\b(?:true|false|null|yes|no|on|off)\\b'],
      ['v', '\\$\\{[^}]*\\}'],
      ['n', '\\b\\d+(?:\\.\\d+)?\\b'],
    ],
  },

  properties: {
    flags: 'gm',
    rules: [
      ['c', '(?<=^)[ \\t]*[#!][^\\n]*'],
      ['y', '(?<=^)[ \\t]*[\\w.$*\\[\\]-]+(?=[ \\t]*[=:])'],
      ['v', '\\$\\{[^}]*\\}'],
      ['k', '\\b(?:true|false)\\b'],
      ['n', '\\b\\d+(?:\\.\\d+)?[a-z]{0,2}\\b'],
    ],
  },

  json: {
    flags: 'gm',
    rules: [
      ['c', LINE_C('//')],
      ['y', '"(?:\\\\.|[^"\\\\])*"(?=\\s*:)'],
      ['s', '"(?:\\\\.|[^"\\\\])*"'],
      ['k', '\\b(?:true|false|null)\\b'],
      ['n', '-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b'],
    ],
  },

  xml: {
    flags: 'gm',
    rules: [
      ['c', '<!--[\\s\\S]*?-->'],
      ['s', DQ],
      ['s', SQ],
      ['k', '</?[\\w:.-]+|/?>'],
      ['t', '\\b[\\w:.-]+(?=\\s*=)'],
      ['n', '\\b\\d+(?:\\.\\d+)?\\b'],
    ],
  },

  bash: {
    flags: 'gm',
    rules: [
      ['c', LINE_C('#')],
      ['s', DQ],
      ['s', "'[^'\\n]*'"],
      ['v', '\\$(?:\\{[^}]*\\}|[\\w@*?#!-]+)'],
      ['k', kw(`if then else elif fi for while until do done case esac function return export
        local readonly source exit break continue in select time`)],
      ['t', '(?<=[\\s=])--?[A-Za-z][\\w-]*'],
      ['n', '\\b\\d+\\b'],
    ],
  },

  dockerfile: {
    flags: 'gm',
    rules: [
      ['c', LINE_C('#')],
      ['k', '(?<=^)[ \\t]*(?:FROM|RUN|CMD|LABEL|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL)\\b'],
      ['s', DQ],
      ['s', SQ],
      ['t', '(?<=[\\s=])--?[A-Za-z][\\w-]*'],
      ['v', '\\$(?:\\{[^}]*\\}|\\w+)'],
      ['k', '\\bAS\\b'],
      ['n', '\\b\\d+(?:\\.\\d+)*\\b'],
    ],
  },

  js: {
    flags: 'gm',
    rules: [
      ['c', LINE_C('//')],
      ['c', BLOCK_C],
      ['s', '`(?:\\\\.|[^`\\\\])*`'],
      ['s', DQ],
      ['s', SQ],
      ['k', kw(`async await break case catch class const continue debugger default delete do else
        export extends finally for from function get if import in instanceof let new of return set
        static super switch this throw try typeof var void while with yield true false null
        undefined`)],
      ['n', '\\b(?:0[xX][0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b'],
      ['b', '\\b[A-Z][A-Za-z0-9_]*\\b'],
      ['f', '\\b[a-z_$]\\w*(?=\\s*\\()'],
    ],
  },

  lua: {
    flags: 'gm',
    rules: [
      ['c', '--\\[\\[[\\s\\S]*?\\]\\]'],
      ['c', LINE_C('--')],
      ['s', DQ],
      ['s', SQ],
      ['s', '\\[\\[[\\s\\S]*?\\]\\]'],
      ['k', kw(`and break do else elseif end false for function if in local nil not or repeat
        return then true until while`)],
      ['n', '\\b\\d+(?:\\.\\d+)?\\b'],
      ['f', '\\b[a-z_]\\w*(?=\\s*\\()'],
    ],
  },
};

const ALIAS = {
  yml: 'yaml',
  javascript: 'js',
  node: 'js',
  ts: 'js',
  typescript: 'js',
  sh: 'bash',
  shell: 'bash',
  console: 'bash',
  cli: 'bash',
  redis: 'bash',
  awscli: 'bash',
  conf: 'properties',
  ini: 'properties',
  env: 'properties',
  html: 'xml',
  pom: 'xml',
  psql: 'sql',
  mysql: 'sql',
  jsonc: 'json',
};

/* Nhãn hiển thị trên đầu khối code */
const LABEL = {
  java: 'Java', sql: 'SQL', yaml: 'YAML', properties: 'Properties', json: 'JSON',
  xml: 'XML', bash: 'Shell', js: 'JavaScript', lua: 'Lua', text: 'Text',
  dockerfile: 'Dockerfile',
};

export function normalizeLang(lang) {
  const l = String(lang || '').trim().toLowerCase();
  return ALIAS[l] || l;
}

export const isSupportedLang = (lang) => !!DEFS[normalizeLang(lang)];

export function langLabel(lang) {
  const l = normalizeLang(lang);
  return LABEL[l] || (l ? l : 'Text');
}

/* Biên dịch lười: gộp mọi rule thành một regex, nhớ lớp theo chỉ số nhóm */
const compiled = new Map();
function compile(lang) {
  if (compiled.has(lang)) return compiled.get(lang);
  const def = DEFS[lang];
  let c = null;
  if (def) {
    c = {
      re: new RegExp(def.rules.map((r) => '(' + r[1] + ')').join('|'), def.flags),
      cls: def.rules.map((r) => r[0]),
    };
  }
  compiled.set(lang, c);
  return c;
}

export function highlight(code, lang) {
  const src = String(code == null ? '' : code);
  const c = compile(normalizeLang(lang));
  if (!c) return esc(src);

  c.re.lastIndex = 0;
  let out = '';
  let last = 0;
  let m;
  while ((m = c.re.exec(src))) {
    if (!m[0]) {
      c.re.lastIndex++; // rule khớp rỗng — tránh vòng lặp vô hạn
      continue;
    }
    if (m.index > last) out += esc(src.slice(last, m.index));
    let g = 1;
    while (g < m.length && m[g] === undefined) g++;
    out += `<span class="hl-${c.cls[g - 1]}">${esc(m[0])}</span>`;
    last = m.index + m[0].length;
  }
  return out + esc(src.slice(last));
}
