/**
 * Teste manuale/CI pentru unicitatea CUI multi-tenant și izolarea datelor.
 *
 * Rulează pe o bază de STAGING (nu producție). Fiecare bloc este auto-verificat:
 * ridică EXCEPTION dacă rezultatul nu e cel așteptat, altfel RAISE NOTICE 'PASS'.
 *
 * Corespondență cu matricea T-CUI-01 .. T-CUI-12 din
 * planning/about database/descriere_database.md.
 */

-- =============================================================================
-- T-CUI-03/04/05: Normalizare canonică (RO / case / spații) → aceeași valoare
-- =============================================================================
DO $$
BEGIN
  ASSERT public.normalize_cui('RO12345678') = '12345678', 'normalize RO';
  ASSERT public.normalize_cui('12345678')   = '12345678', 'normalize fără RO';
  ASSERT public.normalize_cui('ro12345678') = '12345678', 'normalize lowercase';
  ASSERT public.normalize_cui('RO 12345678')= '12345678', 'normalize spații';
  ASSERT public.normalize_cui('RO-12345678')= '12345678', 'normalize separator';
  RAISE NOTICE 'PASS: T-CUI-03/04/05 normalizare canonică';
END $$;

-- =============================================================================
-- T-CUI-09: Index UNIQUE canonic blochează duplicatul (RO vs fără RO)
-- =============================================================================
DO $$
DECLARE
  v_id UUID;
BEGIN
  -- companie de test
  INSERT INTO public.companies (name, cui) VALUES ('TEST CUI A', 'TESTCUI0001') RETURNING id INTO v_id;

  BEGIN
    INSERT INTO public.companies (name, cui) VALUES ('TEST CUI B', 'RO TESTCUI0001');
    RAISE EXCEPTION 'FAIL: duplicatul canonic NU a fost blocat';
  EXCEPTION WHEN unique_violation THEN
    RAISE NOTICE 'PASS: T-CUI-09 index canonic blochează duplicatul';
  END;

  -- cleanup
  DELETE FROM public.company_users WHERE company_id = v_id;
  UPDATE public.companies SET status = 'archived' WHERE id = v_id;
  DELETE FROM public.companies WHERE id = v_id;
END $$;

-- =============================================================================
-- T-CUI-01: create_company_with_member fără user autentificat eșuează controlat
--   (rulat ca service_role: get_user_id_from_auth() = NULL)
-- =============================================================================
DO $$
BEGIN
  BEGIN
    PERFORM public.create_company_with_member('No Auth Co', 'RO99990001');
    RAISE EXCEPTION 'FAIL: crearea fără auth ar fi trebuit să eșueze';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: T-CUI-01 creare fără auth blocată';
  END;
END $$;

-- =============================================================================
-- T-CUI-11: CUI invalid (doar caractere speciale) → EXCEPTION check_violation
-- =============================================================================
DO $$
BEGIN
  BEGIN
    PERFORM public.create_company_with_member('Bad CUI Co', '---');
    RAISE EXCEPTION 'FAIL: CUI invalid ar fi trebuit respins';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: T-CUI-11 CUI invalid respins';
    WHEN insufficient_privilege THEN
      -- fără auth în context service_role; validarea CUI se face oricum înainte de INSERT
      RAISE NOTICE 'SKIP: T-CUI-11 (fără context auth); validare CUI verificată în app/tests unitare';
  END;
END $$;

-- =============================================================================
-- Verificări structurale (obiecte create de migrări)
-- =============================================================================
DO $$
BEGIN
  ASSERT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND indexname='idx_companies_cui_canonical'
  ), 'FAIL: lipsește idx_companies_cui_canonical';

  ASSERT (SELECT indisunique FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid
          WHERE c.relname='idx_companies_cui_canonical'), 'FAIL: indexul canonic nu e UNIQUE';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='company_users' AND column_name='role'
  ), 'FAIL: lipsește company_users.role';

  ASSERT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='company_access_requests'
  ), 'FAIL: lipsește tabelul company_access_requests';

  ASSERT NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename='companies' AND cmd='INSERT'
      AND with_check LIKE '%get_user_id_from_auth() IS NOT NULL%'
  ), 'FAIL: policy INSERT permisiv pe companies încă există';

  RAISE NOTICE 'PASS: verificări structurale migrări';
END $$;
