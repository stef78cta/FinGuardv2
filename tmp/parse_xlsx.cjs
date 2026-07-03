const fs = require('fs');
const path = require('path');

const base = path.join(__dirname, 'xlsx_extract');

function readFile(p) {
  return fs.readFileSync(path.join(base, p), 'utf8');
}

// Parse sharedStrings
function parseSharedStrings() {
  const xml = readFile('xl/sharedStrings.xml');
  const strings = [];
  // each <si>...</si>
  const siRegex = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = siRegex.exec(xml)) !== null) {
    const inner = m[1];
    // collect all <t ...>text</t>
    const tRegex = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    let s = '';
    while ((t = tRegex.exec(inner)) !== null) {
      s += t[1];
    }
    // decode xml entities
    s = s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
    strings.push(s);
  }
  return strings;
}

function colToNum(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) {
    n = n * 26 + (col.charCodeAt(i) - 64);
  }
  return n;
}

function parseSheet(file, shared) {
  const xml = readFile(file);
  const rows = {};
  const rowRegex = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRegex.exec(xml)) !== null) {
    const rowNum = parseInt(rm[1], 10);
    const rowContent = rm[2];
    const cells = {};
    const cellRegex = /<c[^>]*r="([A-Z]+)\d+"([^>]*)>([\s\S]*?)<\/c>/g;
    let cm;
    while ((cm = cellRegex.exec(rowContent)) !== null) {
      const col = cm[1];
      const attrs = cm[2];
      const content = cm[3];
      let val = '';
      const isShared = /t="s"/.test(attrs);
      const isInlineStr = /t="str"/.test(attrs) || /t="inlineStr"/.test(attrs);
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
      const isMatch = /<is>[\s\S]*?<t[^>]*>([\s\S]*?)<\/t>[\s\S]*?<\/is>/.exec(content);
      if (isShared && vMatch) {
        val = shared[parseInt(vMatch[1], 10)] || '';
      } else if (isMatch) {
        val = isMatch[1];
      } else if (vMatch) {
        val = vMatch[1];
      }
      cells[colToNum(col)] = val;
    }
    rows[rowNum] = cells;
  }
  return rows;
}

const shared = parseSharedStrings();
const sheets = {
  Mapping: 'xl/worksheets/sheet1.xml',
  Summary: 'xl/worksheets/sheet2.xml',
  README: 'xl/worksheets/sheet3.xml',
  CashFlow: 'xl/worksheets/sheet4.xml',
};

const target = process.argv[2] || 'all';
const maxRows = parseInt(process.argv[3] || '9999', 10);

function dumpSheet(name, file) {
  const rows = parseSheet(file, shared);
  const rowNums = Object.keys(rows).map(Number).sort((a, b) => a - b);
  console.log('\n========== SHEET: ' + name + ' (rows: ' + rowNums.length + ') ==========');
  let count = 0;
  for (const rn of rowNums) {
    if (count >= maxRows) { console.log('... (truncated)'); break; }
    const cells = rows[rn];
    const maxCol = Math.max(0, ...Object.keys(cells).map(Number));
    const arr = [];
    for (let c = 1; c <= maxCol; c++) {
      arr.push(cells[c] !== undefined ? cells[c] : '');
    }
    console.log(rn + ' | ' + arr.join(' || '));
    count++;
  }
}

if (target === 'all') {
  for (const [name, file] of Object.entries(sheets)) dumpSheet(name, file);
} else {
  dumpSheet(target, sheets[target]);
}
