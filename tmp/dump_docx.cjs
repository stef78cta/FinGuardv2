const fs = require('fs');
const xml = fs.readFileSync('tmp/docx_extract/word/document.xml', 'utf8');
// Split into paragraphs
const paras = xml.split(/<w:p[ >]/);
const out = [];
for (const p of paras) {
  const tRe = /<w:t[^>]*>([\s\S]*?)<\/w:t>/g;
  let m, s = '';
  while ((m = tRe.exec(p)) !== null) s += m[1];
  s = s.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
  // detect list/heading via style
  const isHeading = /w:val="Heading/i.test(p) || /outlineLvl/i.test(p);
  if (s.trim() !== '') out.push((isHeading ? '## ' : '') + s);
}
fs.writeFileSync('tmp/docx_text.txt', out.join('\n'), 'utf8');
console.log('Paragraphs:', out.length);
