// Minimal, dependency-free .xlsx reader.
// Reads a ZIP container (stored/deflate) and extracts the worksheet cells,
// resolving shared strings. Sufficient for parsing the Chart of Accounts
// mapping template; NOT a general-purpose xlsx library.

import { inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

/**
 * Reads all entries of a ZIP buffer into a Map<name, Buffer>.
 * Supports compression method 0 (stored) and 8 (deflate).
 *
 * @param {Buffer} buf - Raw ZIP file contents.
 * @returns {Map<string, Buffer>}
 */
function readZipEntries(buf) {
  const entries = new Map();
  // Locate End Of Central Directory (EOCD) record: signature 0x06054b50.
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Invalid xlsx: EOCD not found');

  const total = buf.readUInt16LE(eocd + 10);
  let ptr = buf.readUInt32LE(eocd + 16);

  for (let n = 0; n < total; n++) {
    if (buf.readUInt32LE(ptr) !== 0x02014b50) break;
    const method = buf.readUInt16LE(ptr + 10);
    const compSize = buf.readUInt32LE(ptr + 20);
    const nameLen = buf.readUInt16LE(ptr + 28);
    const extraLen = buf.readUInt16LE(ptr + 30);
    const commentLen = buf.readUInt16LE(ptr + 32);
    const localOff = buf.readUInt32LE(ptr + 42);
    const name = buf.toString('utf8', ptr + 46, ptr + 46 + nameLen);

    // Read local header to find the data start.
    const lNameLen = buf.readUInt16LE(localOff + 26);
    const lExtraLen = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lNameLen + lExtraLen;
    const raw = buf.subarray(dataStart, dataStart + compSize);
    const content = method === 0 ? Buffer.from(raw) : inflateRawSync(raw);
    entries.set(name, content);

    ptr += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function parseSharedStrings(xml) {
  const out = [];
  const si = /<si>([\s\S]*?)<\/si>/g;
  let m;
  while ((m = si.exec(xml)) !== null) {
    const tRe = /<t[^>]*>([\s\S]*?)<\/t>/g;
    let t;
    let s = '';
    while ((t = tRe.exec(m[1])) !== null) s += t[1];
    out.push(decodeEntities(s));
  }
  return out;
}

function colToNum(col) {
  let n = 0;
  for (let i = 0; i < col.length; i++) n = n * 26 + (col.charCodeAt(i) - 64);
  return n;
}

function parseSheet(xml, shared) {
  const rows = [];
  const rowRe = /<row[^>]*\br="(\d+)"[^>]*>([\s\S]*?)<\/row>/g;
  let rm;
  while ((rm = rowRe.exec(xml)) !== null) {
    const cells = {};
    const cellRe = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cm;
    while ((cm = cellRe.exec(rm[2])) !== null) {
      const attrs = cm[1];
      const content = cm[2] || '';
      const rMatch = /\br="([A-Z]+)\d+"/.exec(attrs);
      if (!rMatch) continue;
      const col = colToNum(rMatch[1]);
      let val = '';
      const vMatch = /<v>([\s\S]*?)<\/v>/.exec(content);
      if (/t="s"/.test(attrs) && vMatch) {
        val = shared[parseInt(vMatch[1], 10)] || '';
      } else if (/t="(str|inlineStr)"/.test(attrs)) {
        const isM = /<t[^>]*>([\s\S]*?)<\/t>/.exec(content);
        val = isM ? decodeEntities(isM[1]) : vMatch ? vMatch[1] : '';
      } else if (vMatch) {
        val = vMatch[1];
      }
      cells[col] = val;
    }
    rows.push({ r: parseInt(rm[1], 10), cells });
  }
  return rows;
}

/**
 * Loads an xlsx file and returns rows for the first worksheet (sheet1) as
 * arrays of objects keyed by the header row.
 *
 * @param {string} filePath - Path to the .xlsx file.
 * @param {string} [sheetPath='xl/worksheets/sheet1.xml'] - Worksheet part.
 * @returns {{ headers: string[], rows: Record<string,string>[] }}
 */
export function readXlsxSheet(filePath, sheetPath = 'xl/worksheets/sheet1.xml') {
  const buf = readFileSync(filePath);
  const entries = readZipEntries(buf);
  const sharedXml = entries.has('xl/sharedStrings.xml')
    ? entries.get('xl/sharedStrings.xml').toString('utf8')
    : '';
  const shared = sharedXml ? parseSharedStrings(sharedXml) : [];
  const sheetXml = entries.get(sheetPath).toString('utf8');
  const raw = parseSheet(sheetXml, shared);
  if (raw.length === 0) return { headers: [], rows: [] };

  const headerCells = raw[0].cells;
  const maxCol = Math.max(...raw.flatMap((r) => Object.keys(r.cells).map(Number)));
  const headers = [];
  for (let c = 1; c <= maxCol; c++) headers.push(headerCells[c] || `col${c}`);

  const rows = [];
  for (let i = 1; i < raw.length; i++) {
    const cells = raw[i].cells;
    const obj = {};
    for (let c = 1; c <= maxCol; c++) obj[headers[c - 1]] = cells[c] !== undefined ? cells[c] : '';
    rows.push(obj);
  }
  return { headers, rows };
}
