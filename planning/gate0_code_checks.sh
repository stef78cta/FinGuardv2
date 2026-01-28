#!/bin/bash

###############################################################################
# Gate 0: Verificări Cod Sursă pentru FinGuard v2
#
# Acest script rulează toate verificările obligatorii pe cod sursă
# ÎNAINTE de aplicarea migrărilor de securitate.
#
# Versiune: 1.8
# Data: 28 Ianuarie 2026
#
# INSTRUCȚIUNI:
#   chmod +x planning/gate0_code_checks.sh
#   ./planning/gate0_code_checks.sh | tee planning/gate0_code_results.txt
###############################################################################

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================="
echo "Gate 0: Verificări Cod Sursă"
echo "========================================="
echo ""

ISSUES_FOUND=0

###############################################################################
# A) Căutare INSERT în public.companies
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}A) CĂUTARE INSERT ÎN COMPANIES${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Căutare INSERT în fișiere SQL..."
INSERT_SQL=$(grep -r "INSERT.*companies" --include="*.sql" . 2>/dev/null || true)

if [ -n "$INSERT_SQL" ]; then
  echo -e "${YELLOW}⚠️  Găsit INSERT în companies în fișiere SQL:${NC}"
  echo "$INSERT_SQL"
  echo ""
  echo "VERIFICARE OBLIGATORIE:"
  echo "  - create_company_with_member() RPC? → ✅ OK"
  echo "  - Seed cu membership simultan? → ✅ OK (verifică)"
  echo "  - Alt cod? → ❌ TREBUIE ELIMINAT SAU MODIFICAT"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ Nu s-au găsit INSERT-uri în companies în SQL${NC}"
fi

echo ""
echo "Căutare INSERT în fișiere TypeScript/JavaScript..."
INSERT_TS=$(grep -r "\.from.*['\"]companies['\"]" --include="*.ts" --include="*.tsx" --include="*.js" . 2>/dev/null | grep -i "insert" || true)

if [ -n "$INSERT_TS" ]; then
  echo -e "${YELLOW}⚠️  Găsit INSERT în companies în TypeScript:${NC}"
  echo "$INSERT_TS"
  echo ""
  echo "VERIFICARE OBLIGATORIE:"
  echo "  - Cod admin care inserează + membership? → ✅ OK (verifică atomicitate)"
  echo "  - Alt cod? → ❌ TREBUIE ÎNLOCUIT cu create_company_with_member()"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ Nu s-au găsit INSERT-uri directe în companies în TS${NC}"
fi

echo ""

###############################################################################
# B) Confirmare RLS pe companies (vizualizare doar)
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}B) CONFIRMARE RLS PE COMPANIES${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "ℹ️  Rulează Query D2 din gate0_verificari.sql pentru verificare completă"
echo ""

###############################################################################
# C) Verificare SERVICE_ROLE_KEY în Edge Function
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}C) VERIFICARE SERVICE_ROLE_KEY${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -f "supabase/functions/parse-balanta/index.ts" ]; then
  echo "Verificare în parse-balanta/index.ts..."
  
  SERVICE_ROLE=$(grep -n "SUPABASE_SERVICE_ROLE_KEY" supabase/functions/parse-balanta/index.ts || true)
  ANON_KEY=$(grep -n "SUPABASE_ANON_KEY" supabase/functions/parse-balanta/index.ts | grep -v "// NU FOLOSI" || true)
  
  if [ -n "$SERVICE_ROLE" ]; then
    echo -e "${GREEN}✅ SERVICE_ROLE_KEY găsit:${NC}"
    echo "$SERVICE_ROLE"
  else
    echo -e "${RED}❌ NU s-a găsit SERVICE_ROLE_KEY!${NC}"
    echo "RISC CRITIC: Edge function folosește posibil ANON_KEY"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
  
  if [ -n "$ANON_KEY" ]; then
    echo -e "${YELLOW}⚠️  ANON_KEY găsit (verifică că NU e folosit pentru writes):${NC}"
    echo "$ANON_KEY"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
  fi
else
  echo -e "${RED}❌ Nu s-a găsit supabase/functions/parse-balanta/index.ts${NC}"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

echo ""

###############################################################################
# D) Verificare constraints (vizualizare doar)
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}D) VERIFICARE CONSTRAINTS${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "ℹ️  Rulează Query D3-D4 din gate0_verificari.sql pentru verificare completă"
echo ""

###############################################################################
# E) VERIFICARE CRITICĂ: Expunere company_id necomitat
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}E) EXPUNERE COMPANY_ID NECOMITAT${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Căutare console.log/logger cu company_id..."
LOGS_COMPANY=$(grep -rn "console\.\(log\|error\|warn\).*company" --include="*.ts" --include="*.tsx" --include="*.js" supabase/ src/ 2>/dev/null || true)

if [ -n "$LOGS_COMPANY" ]; then
  echo -e "${YELLOW}⚠️  Găsite log-uri cu 'company':${NC}"
  echo "$LOGS_COMPANY"
  echo ""
  echo "VERIFICARE MANUALĂ OBLIGATORIE:"
  echo "  - Log DUPĂ commit tranzacție? → ✅ OK"
  echo "  - Log ÎNAINTE de commit în create_company_with_member? → ❌ BLOCAT DEPLOY"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ Nu s-au găsit log-uri cu 'company'${NC}"
fi

echo ""
echo "Căutare return cu company_id în Edge Functions..."
RETURN_COMPANY=$(grep -rn "return.*company_id" supabase/functions/ --include="*.ts" 2>/dev/null || true)

if [ -n "$RETURN_COMPANY" ]; then
  echo -e "${YELLOW}⚠️  Găsite return-uri cu company_id:${NC}"
  echo "$RETURN_COMPANY"
  echo ""
  echo "VERIFICARE MANUALĂ OBLIGATORIE:"
  echo "  - Return DUPĂ verificare membership? → ✅ OK"
  echo "  - Return în create_company_with_member DUPĂ commit? → ✅ OK"
  echo "  - Return ÎNAINTE de commit? → ❌ BLOCAT DEPLOY"
  echo ""
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ Nu s-au găsit return-uri cu company_id în Edge Functions${NC}"
fi

echo ""
echo "Căutare company_id în migrări (context log/return)..."
MIGRATION_COMPANY=$(grep -rn "company_id" supabase/migrations/ --include="*.sql" 2>/dev/null | grep -iE "return|log|raise notice" || true)

if [ -n "$MIGRATION_COMPANY" ]; then
  echo -e "${YELLOW}⚠️  Găsite referințe company_id în migrări cu context log/return:${NC}"
  echo "$MIGRATION_COMPANY"
  echo ""
  echo "VERIFICARE MANUALĂ OBLIGATORIE:"
  echo "  - Simpla utilizare SQL? → ✅ OK"
  echo "  - RAISE NOTICE cu company_id? → ⚠️ Verifică dacă e debugging temporar"
  echo ""
  # Nu incrementăm ISSUES_FOUND aici - e doar informativ
else
  echo -e "${GREEN}✅ Nu s-au găsit expuneri problematice în migrări${NC}"
fi

echo ""

###############################################################################
# F) Verificare config.toml - verify_jwt
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}F) VERIFICARE CONFIG.TOML${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -f "supabase/config.toml" ]; then
  echo "Verificare verify_jwt în config.toml..."
  VERIFY_JWT=$(grep -n "verify_jwt" supabase/config.toml || true)
  
  if [ -n "$VERIFY_JWT" ]; then
    echo "$VERIFY_JWT"
    if echo "$VERIFY_JWT" | grep -q "false"; then
      echo -e "${RED}❌ verify_jwt = false (RISC CRITIC DE SECURITATE!)${NC}"
      echo "TREBUIE schimbat la verify_jwt = true"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
      echo -e "${GREEN}✅ verify_jwt = true (corect)${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  verify_jwt nu este setat explicit${NC}"
    echo "Recomandare: Adaugă explicit verify_jwt = true"
  fi
else
  echo -e "${YELLOW}⚠️  Nu s-a găsit supabase/config.toml${NC}"
fi

echo ""

###############################################################################
# G) Verificare CORS origins în config.toml (v1.7)
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}G) VERIFICARE CORS ORIGINS (v1.7)${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

if [ -f "supabase/config.toml" ]; then
  echo "Verificare CORS allowed_origins..."
  CORS_ORIGINS=$(grep -A5 "\[functions\]" supabase/config.toml | grep "allowed_origins" || true)
  
  if [ -n "$CORS_ORIGINS" ]; then
    echo "$CORS_ORIGINS"
    if echo "$CORS_ORIGINS" | grep -q "\*"; then
      echo -e "${YELLOW}⚠️  CORS folosește wildcard '*' (prea permisiv)${NC}"
      echo "Recomandare v1.7: Limitează la origin-uri specifice aplicației"
      ISSUES_FOUND=$((ISSUES_FOUND + 1))
    else
      echo -e "${GREEN}✅ CORS folosește whitelist specific${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  CORS allowed_origins nu este configurat explicit${NC}"
  fi
else
  echo -e "${YELLOW}⚠️  Nu s-a găsit supabase/config.toml${NC}"
fi

echo ""

###############################################################################
# H) Verificare logging sensitive data (SERVICE_ROLE_KEY, tokens)
###############################################################################
echo -e "${BLUE}=========================================${NC}"
echo -e "${BLUE}H) VERIFICARE LOGGING DATE SENSIBILE${NC}"
echo -e "${BLUE}=========================================${NC}"
echo ""

echo "Căutare log-uri cu date sensibile..."
SENSITIVE_LOGS=$(grep -rn "console\.\(log\|error\).*\(SERVICE_ROLE\|authHeader\|token\|Authorization\)" --include="*.ts" --include="*.js" supabase/ src/ 2>/dev/null | grep -v "// " || true)

if [ -n "$SENSITIVE_LOGS" ]; then
  echo -e "${RED}❌ GĂSITE LOG-URI CU DATE SENSIBILE:${NC}"
  echo "$SENSITIVE_LOGS"
  echo ""
  echo "RISC SECURITATE: Token-uri/keys expuse în log-uri"
  echo "ACȚIUNE: Elimină IMEDIAT aceste log-uri"
  ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
  echo -e "${GREEN}✅ Nu s-au găsit log-uri cu date sensibile evidente${NC}"
fi

echo ""

###############################################################################
# SUMAR FINAL
###############################################################################
echo "========================================="
echo "SUMAR VERIFICĂRI GATE 0"
echo "========================================="
echo ""

if [ $ISSUES_FOUND -eq 0 ]; then
  echo -e "${GREEN}✅ TOATE VERIFICĂRILE AU TRECUT${NC}"
  echo ""
  echo "Poți proceda cu:"
  echo "  1. Salvează acest output în planning/gate0_code_results.txt"
  echo "  2. Rulează gate0_verificari.sql pe baza de date"
  echo "  3. După toate verificările OK, aplică migrările"
else
  echo -e "${RED}❌ GĂSITE $ISSUES_FOUND PROBLEME POTENȚIALE${NC}"
  echo ""
  echo "ACȚIUNI OBLIGATORII:"
  echo "  1. Remediază toate problemele marcate cu ❌"
  echo "  2. Verifică manual toate avertizările ⚠️"
  echo "  3. Rulează din nou acest script"
  echo "  4. DOAR după 0 probleme, aplică migrările"
  echo ""
  echo -e "${RED}⚠️ BLOCARE DEPLOY dacă expunere company_id necomitat!${NC}"
fi

echo ""
echo "Data verificare: $(date)"
echo "Hash commit curent: $(git rev-parse --short HEAD 2>/dev/null || echo 'N/A')"
echo ""

exit $ISSUES_FOUND
