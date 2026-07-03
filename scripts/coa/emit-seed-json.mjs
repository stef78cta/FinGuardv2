// Emits the remaining seed as jsonb_to_recordset INSERTs (robust: no positional
// NULL counting, no backslashes to escape). Raw UTF-8 JSON, dollar-quoted.
// Output: tmp/seed-parts/j_*.sql

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const t = JSON.parse(readFileSync(join(__dirname, 'standard-coa-template.json'), 'utf8'));
const outDir = join(repoRoot, 'tmp', 'seed-parts');
mkdirSync(outDir, { recursive: true });

const files = [];
const emit = (name, sql) => {
  writeFileSync(join(outDir, name), sql, 'utf8');
  files.push(`${name}: ${(Buffer.byteLength(sql, 'utf8') / 1024).toFixed(1)} KB`);
};

// statement_line_definitions: rows already inserted = bs_10..pl_2360 (first 240).
// Emit only remaining rows via offset, batched.
const SLD_ALREADY = 240;
const sldRemaining = t.statement_line_definitions.slice(SLD_ALREADY);
const sldCols =
  'statement_type text, line_key text, sort_order int, display_order int, display_name text, report_area text, ' +
  'section_l1 text, section_l2 text, section_l3 text, section_l4 text, account_code text, row_type text, line_type text, ' +
  'normal_balance text, report_sign text, is_leaf_for_calculation boolean, formula_or_rule text, notes text';
const sldInsertCols =
  'company_id, statement_type, line_key, sort_order, display_order, display_name, report_area, ' +
  'section_l1, section_l2, section_l3, section_l4, account_code, row_type, line_type, ' +
  'normal_balance, report_sign, is_leaf_for_calculation, formula_or_rule, notes';

const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };

chunk(sldRemaining, 70).forEach((batch, i) => {
  const json = JSON.stringify(
    batch.map((s) => ({
      statement_type: s.statement_type,
      line_key: s.line_key,
      sort_order: s.sort_order,
      display_order: s.display_order,
      display_name: s.display_name,
      report_area: s.report_area,
      section_l1: s.section_l1,
      section_l2: s.section_l2,
      section_l3: s.section_l3,
      section_l4: s.section_l4,
      account_code: s.account_code,
      row_type: s.row_type,
      line_type: s.line_type,
      normal_balance: s.normal_balance,
      report_sign: s.report_sign,
      is_leaf_for_calculation: s.is_leaf_for_calculation,
      formula_or_rule: s.formula_or_rule,
      notes: s.notes,
    }))
  );
  const sql = `INSERT INTO public.statement_line_definitions (${sldInsertCols})\nSELECT NULL, j.* FROM jsonb_to_recordset($j$${json}$j$::jsonb)\nAS j(${sldCols});\n`;
  emit(`j_sld_${String(i + 1).padStart(2, '0')}.sql`, sql);
});

// cash_flow_mapping_rules (all)
{
  const json = JSON.stringify(
    t.cash_flow_mapping_rules.map((r) => ({
      line_key: r.line_key,
      description: r.description,
      cash_flow_direction: r.cash_flow_direction,
      section: r.section,
      counterparty_account_prefixes: r.counterparty_account_prefixes,
      report_sign: r.report_sign,
      display_order: r.display_order,
      formula_or_rule: r.formula_or_rule,
    }))
  );
  const cols =
    'line_key text, description text, cash_flow_direction text, section text, counterparty_account_prefixes text[], report_sign text, display_order int, formula_or_rule text';
  const insertCols =
    'company_id, line_key, description, cash_flow_direction, section, counterparty_account_prefixes, report_sign, display_order, formula_or_rule';
  const sql = `INSERT INTO public.cash_flow_mapping_rules (${insertCols})\nSELECT NULL, j.* FROM jsonb_to_recordset($j$${json}$j$::jsonb)\nAS j(${cols});\n`;
  emit('j_cfmr.sql', sql);
}

// kpi_definitions (all)
{
  const json = JSON.stringify(
    t.kpi_definitions.map((k) => ({
      code: k.code,
      name: k.name,
      category: k.category,
      formula: k.formula,
      unit: k.unit,
      description: k.description,
      display_order: k.display_order,
    }))
  );
  const cols = 'code text, name text, category text, formula jsonb, unit text, description text, display_order int';
  const insertCols = 'company_id, code, name, category, formula, unit, description, display_order';
  const sql = `INSERT INTO public.kpi_definitions (${insertCols})\nSELECT NULL, j.* FROM jsonb_to_recordset($j$${json}$j$::jsonb)\nAS j(${cols});\n`;
  emit('j_kpi.sql', sql);
}

console.log(files.join('\n'));
console.log('sld remaining rows:', sldRemaining.length);
