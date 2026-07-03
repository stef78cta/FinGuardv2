-- ============================================================================
-- MIGRARE: extindere chart_of_accounts_template — conturi operaționale lipsă
-- Data: 2026-07-03
-- ============================================================================
-- Conturi identificate ca nemapabile după auto_map_import_from_chart pe
-- balanțe reale (ex. Midia International SA). Nu existau în template-ul Excel
-- v3.4, dar apar frecvent în planurile de conturi analitice românești.
-- ============================================================================

INSERT INTO public.chart_of_accounts_template
    (account_code, account_name, account_type, parent_code, is_postable, sort_order)
SELECT j.*
FROM jsonb_to_recordset($j$
[
  {"account_code":"205","account_name":"Concesiuni, brevete, licențe, mărci comerciale","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":35},
  {"account_code":"2071","account_name":"Fond comercial pozitiv","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":45},
  {"account_code":"261","account_name":"Acțiuni deținute la entități afiliate","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":95},
  {"account_code":"2805","account_name":"Amortizarea concesiunilor, brevetelor, licențelor, mărcilor comerciale","account_type":"asset","parent_code":"280","is_postable":true,"sort_order":65},
  {"account_code":"2807","account_name":"Amortizarea fondului comercial","account_type":"asset","parent_code":"280","is_postable":true,"sort_order":75},
  {"account_code":"357","account_name":"Mărfuri aflate la terți","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":475},
  {"account_code":"378","account_name":"Diferențe de preț la mărfuri","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":485},
  {"account_code":"381","account_name":"Ambalaje","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":490},
  {"account_code":"4093","account_name":"Avansuri acordate pentru imobilizări corporale","account_type":"asset","parent_code":"409","is_postable":true,"sort_order":540},
  {"account_code":"4452","account_name":"Împrumuturi nerambursabile cu caracter de subvenții","account_type":"liability","parent_code":null,"is_postable":true,"sort_order":560},
  {"account_code":"4511","account_name":"Decontări între entități afiliate","account_type":"liability","parent_code":null,"is_postable":true,"sort_order":570},
  {"account_code":"4551","account_name":"Acționari/Asociați - conturi curente","account_type":"liability","parent_code":null,"is_postable":true,"sort_order":580},
  {"account_code":"4752","account_name":"Împrumuturi nerambursabile cu caracter de subvenții pentru investiții","account_type":"liability","parent_code":"475","is_postable":true,"sort_order":1440},
  {"account_code":"5125","account_name":"Sume în curs de decontare","account_type":"asset","parent_code":"512","is_postable":true,"sort_order":705},
  {"account_code":"581","account_name":"Viramente interne","account_type":"asset","parent_code":null,"is_postable":true,"sort_order":710},
  {"account_code":"722","account_name":"Venituri din producția de imobilizări corporale","account_type":"revenue","parent_code":null,"is_postable":true,"sort_order":2550}
]
$j$::jsonb) AS j(
    account_code text,
    account_name text,
    account_type text,
    parent_code text,
    is_postable boolean,
    sort_order int
)
ON CONFLICT (account_code) DO UPDATE SET
    account_name  = EXCLUDED.account_name,
    account_type  = EXCLUDED.account_type,
    parent_code   = EXCLUDED.parent_code,
    is_postable   = EXCLUDED.is_postable,
    sort_order    = EXCLUDED.sort_order;

-- ============================================================================
-- FIN
-- ============================================================================
