/* Định dạng markdown-lite + tiện ích dùng chung cho build (Node) */

export const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Băm chuỗi ổn định — trùng thuật toán với client để id không đổi */
export const hash = (s) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

/* Slug tiếng Việt -> ascii-kebab cho URL */
const DIAC = { a: 'áàảãạăắằẳẵặâấầẩẫậ', e: 'éèẻẽẹêếềểễệ', i: 'íìỉĩị', o: 'óòỏõọôốồổỗộơớờởỡợ', u: 'úùủũụưứừửữự', y: 'ýỳỷỹỵ', d: 'đ' };
export const slugify = (s) => {
  let out = String(s).toLowerCase();
  for (const [base, chars] of Object.entries(DIAC)) out = out.replace(new RegExp('[' + chars + ']', 'g'), base);
  return out.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70);
};

/* Markdown-lite -> HTML: ```code```, **đậm**, `code`, bảng, bullet, số, đoạn */
export function fmt(text) {
  const inline = (s) =>
    esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  return String(text)
    .split(/```/)
    .map((chunk, i) => {
      if (i % 2 === 1) return '<pre><code>' + esc(chunk.replace(/^\n|\n$/g, '')) + '</code></pre>';
      return chunk
        .split(/\n{2,}/)
        .filter((b) => b.trim() !== '')
        .map((block) => {
          const lines = block.split(/\n/);
          if (lines.length >= 2 && lines.every((l) => /^\s*\|.*\|\s*$/.test(l))) {
            const rows = lines
              .map((l) => l.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim()))
              .filter((cells) => !cells.every((c) => /^:?-+:?$/.test(c) || c === ''));
            const head = rows.shift();
            return (
              '<div class="table-wrap"><table><thead><tr>' +
              head.map((c) => '<th>' + inline(c) + '</th>').join('') +
              '</tr></thead><tbody>' +
              rows.map((r) => '<tr>' + r.map((c) => '<td>' + inline(c) + '</td>').join('') + '</tr>').join('') +
              '</tbody></table></div>'
            );
          }
          if (lines.every((l) => /^\s*[-*]\s+/.test(l)))
            return '<ul>' + lines.map((l) => '<li>' + inline(l.replace(/^\s*[-*]\s+/, '')) + '</li>').join('') + '</ul>';
          if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l)))
            return '<ol>' + lines.map((l) => '<li>' + inline(l.replace(/^\s*\d+[.)]\s+/, '')) + '</li>').join('') + '</ol>';
          return '<p>' + lines.map(inline).join('<br>') + '</p>';
        })
        .join('');
    })
    .join('');
}

/* Bỏ markup -> text thuần cho meta description & JSON-LD */
export function plain(text) {
  return String(text)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*|]/g, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export const truncate = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…');
