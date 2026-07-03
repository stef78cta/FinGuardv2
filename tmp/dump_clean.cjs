const fs = require('fs');
const path = require('path');
const base = path.join(__dirname, 'xlsx_extract');
const read = (p) => fs.readFileSync(path.join(base, p), 'utf8');

function parseShared() {
  const xml = read('xl/sharedStrings.xml');
  const out = [];
  const si = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = si.exec(xml)) !== null) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t, s = '';
    while ((t = tRe.exec(m[1])) !== null) s += t[1];
    s = s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
    out.push(s);
  }
  return out;
}
function colNum(c){let n=0;for(let i=0;i<c.length;i++)n=n*26+(c.charCodeAt(i)-64);return n;}

function parseSheet(file, shared) {
  const xml = read(file);
  const rows = [];
  const rowRe = /<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const cells = {};
    // match both self-closing and normal cells
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rm[2])) !== null) {
      const attrs = cm[1];
      const content = cm[2] || '';
      const rMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!rMatch) continue;
      const col = colNum(rMatch[1]);
      let val = '';
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
      if (/t="s"/.test(attrs) && vMatch) val = shared[parseInt(vMatch[1],10)] || '';
      else if (/t="(str|inlineStr)"/.test(attrs)) {
        const isM = /<t[^>]*>([\s\S]*?)<\/t>/.exec(content);
        val = isM ? isM[1] : (vMatch ? vMatch[1] : '');
      } else if (vMatch) val = vMatch[1];
      cells[col] = val;
    }
    rows.push({ r: parseInt(rm[1],10), cells });
  }
  return rows;
}

const shared = parseShared();
const rows = parseSheet('xl/worksheets/sheet1.xml', shared);
const NCOL = 17;
const lines = [];
for (const row of rows) {
  const arr = [];
  for (let c = 1; c <= NCOL; c++) arr.push((row.cells[c] !== undefined ? row.cells[c] : ''));
  lines.push(arr.join('\t'));
}
fs.writeFileSync(path.join(__dirname, 'mapping_clean.tsv'), lines.join('\n'), 'utf8');
console.log('Wrote', rows.length, 'rows');
