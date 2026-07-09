// Emits the standard report seed as small SQL chunks (for MCP apply_migration),
// each well under size limits. Reads the normalized JSON template.
// Output: tmp/seed-parts/*.sql (transient; not committed as migrations).

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const t = JSON.parse(readFileSync(join(__dirname, 'standard-coa-template.json'), 'utf8'));

const outDir = join(repoRoot, 'tmp', 'seed-parts');
mkdirSync(outDir, { recursive: true });

// ASCII-safe literal: escapes non-ASCII to \uXXXX inside a Postgres E'' string.
const esc = (s) =>
  String(s)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/[\u0080-\uFFFF]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const q = (v) => (v === null || v === undefined || v === '' ? 'NULL' : `E'${esc(v)}'`);
const qb = (v) => (v ? 'TRUE' : 'FALSE');
const qn = (v) => (v === null || v === undefined || v === '' ? 'NULL' : String(v));
const qarr = (arr) =>
  arr === null || arr === undefined ? 'NULL' : `ARRAY[${arr.map((x) => `E'${esc(x)}'`).join(',')}]::TEXT[]`;

const chunk = (arr, n) => {
  const out = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

const files = [];
const emit = (name, sql) => {
  const p = join(outDir, name);
  writeFileSync(p, sql, 'utf8');
  files.push({ name, bytes: Buffer.byteLength(sql, 'utf8') });
};

// 00 - delete globals
emit(
  '00_delete.sql',
  `DELETE FROM public.statement_line_definitions WHERE company_id IS NULL;\n` +
    `DELETE FROM public.cash_flow_mapping_rules WHERE company_id IS NULL;\n` +
    `DELETE FROM public.chart_of_accounts_template;\n` +
    `DELETE FROM public.kpi_definitions WHERE company_id IS NULL AND code IN (${t.kpi_definitions.map((k) => q(k.code)).join(', ')});\n`
);

// 01 - chart_of_accounts_template
{
  const vals = t.chart_of_accounts
    .map((a) => `(${q(a.account_code)}, ${q(a.account_name)}, ${q(a.account_type)}, ${q(a.functional_type)}, ${q(a.parent_code)}, ${qb(a.is_postable)}, ${qn(a.sort_order)})`)
    .join(',\n');
  emit(
    '01_coa_template.sql',
    `ALTER TABLE public.chart_of_accounts_template ADD COLUMN IF NOT EXISTS functional_type TEXT CHECK (functional_type IN ('activ','pasiv','bifunctional'));\n` +
      `INSERT INTO public.chart_of_accounts_template (account_code, account_name, account_type, functional_type, parent_code, is_postable, sort_order) VALUES\n${vals};\n`
  );
}

// 02 - statement_line_definitions (batched)
chunk(t.statement_line_definitions, 120).forEach((batch, i) => {
  const vals = batch
    .map(
      (s) =>
        `(NULL, ${q(s.statement_type)}, ${q(s.line_key)}, ${qn(s.sort_order)}, ${qn(s.display_order)}, ${q(s.display_name)}, ${q(s.report_area)}, ` +
        `${q(s.section_l1)}, ${q(s.section_l2)}, ${q(s.section_l3)}, ${q(s.section_l4)}, ${q(s.account_code)}, ${q(s.row_type)}, ${q(s.line_type)}, ` +
        `${q(s.normal_balance)}, ${q(s.report_sign)}, ${qb(s.is_leaf_for_calculation)}, ${q(s.formula_or_rule)}, ${q(s.notes)})`
    )
    .join(',\n');
  emit(
    `02_sld_${String(i + 1).padStart(2, '0')}.sql`,
    `INSERT INTO public.statement_line_definitions\n (company_id, statement_type, line_key, sort_order, display_order, display_name, report_area,\n  section_l1, section_l2, section_l3, section_l4, account_code, row_type, line_type,\n  normal_balance, report_sign, is_leaf_for_calculation, formula_or_rule, notes) VALUES\n${vals};\n`
  );
});

// 03 - cash_flow_mapping_rules
{
  const vals = t.cash_flow_mapping_rules
    .map(
      (r) =>
        `(NULL, ${q(r.line_key)}, ${q(r.description)}, ${q(r.cash_flow_direction)}, ${q(r.section)}, ` +
        `${qarr(r.counterparty_account_prefixes)}, ${q(r.report_sign)}, ${qn(r.display_order)}, ${q(r.formula_or_rule)})`
    )
    .join(',\n');
  emit(
    '03_cfmr.sql',
    `INSERT INTO public.cash_flow_mapping_rules\n (company_id, line_key, description, cash_flow_direction, section,\n  counterparty_account_prefixes, report_sign, display_order, formula_or_rule) VALUES\n${vals};\n`
  );
}

// 04 - kpi_definitions
{
  const vals = t.kpi_definitions
    .map(
      (k) =>
        `(NULL, ${q(k.code)}, ${q(k.name)}, ${q(k.category)}, ${q(JSON.stringify(k.formula))}::jsonb, ${q(k.unit)}, ${q(k.description)}, ${qn(k.display_order)})`
    )
    .join(',\n');
  emit(
    '04_kpi.sql',
    `INSERT INTO public.kpi_definitions (company_id, code, name, category, formula, unit, description, display_order) VALUES\n${vals};\n`
  );
}

console.log(files.map((f) => `${f.name}: ${(f.bytes / 1024).toFixed(1)} KB`).join('\n'));
