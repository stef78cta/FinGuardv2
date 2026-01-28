# Regenerare TypeScript Types - Post-Deployment

> **OBLIGATORIU**: După aplicarea tuturor migrărilor SQL, trebuie regenerate tipurile TypeScript.

---

## 📋 Când Să Regenerezi

Regenerează tipurile după:
- ✅ Toate migrările SQL aplicate (100000-100006)
- ✅ CREATE UNIQUE INDEX pe CUI completat (producție)
- ✅ Verificare că toate funcțiile există în DB

---

## 🚀 Comandă Regenerare

```bash
cd c:\_Software\SAAS\finguardv2

# Verifică connection la Supabase
npx supabase status

# Regenerare types
npx supabase gen types typescript \
  --project-id gqxopxbzslwrjgukqbha \
  > src/integrations/supabase/types.ts

# Verifică că fișierul a fost generat
ls -lh src/integrations/supabase/types.ts
```

---

## ✅ Verificări Post-Regenerare

### 1. Verifică Funcții RPC

```typescript
// src/integrations/supabase/types.ts

// Trebuie să existe:
export interface Database {
  public: {
    Functions: {
      // v1.8: Signature nouă (fără p_user_id)
      create_company_with_member: {
        Args: {
          p_name: string
          p_cui: string
          // NU mai are p_user_id
        }
        Returns: string // UUID
      }
      
      // v1.5: Rate limiting DB
      check_rate_limit: {
        Args: {
          p_user_id: string
          p_resource_type: string
          p_max_requests?: number
          p_window_seconds?: number
        }
        Returns: boolean
      }
      
      // v1.5: Process import idempotent
      process_import_accounts: {
        Args: {
          p_import_id: string
          p_accounts: Json
          p_requester_user_id: string
        }
        Returns: boolean
      }
      
      // v1.8: Safe UUID cast
      try_uuid: {
        Args: {
          input_text: string
        }
        Returns: string | null // UUID or NULL
      }
      
      // v1.7: Archive company
      archive_company: {
        Args: {
          p_company_id: string
        }
        Returns: boolean
      }
      
      // v1.7: Cleanup rate limits
      cleanup_rate_limits: {
        Args: {
          p_retention_hours?: number
        }
        Returns: number
      }
      
      // v1.3: Detect stale imports
      detect_stale_imports: {
        Args: {}
        Returns: Array<{
          import_id: string
          file_name: string
          started_at: string
          minutes_elapsed: number
        }>
      }
    }
  }
}
```

### 2. Verifică Views

```typescript
// Trebuie să existe VIEW trial_balance_imports_public
export interface Database {
  public: {
    Views: {
      trial_balance_imports_public: {
        Row: {
          id: string
          company_id: string
          file_name: string
          file_size_bytes: number
          status: string
          error_message: string | null
          accounts_count: number | null
          processing_started_at: string | null
          created_at: string
          updated_at: string
          // NU include internal_error_detail
          // NU include internal_error_code
        }
      }
      
      // View pentru debugging (service_role only)
      trial_balance_imports_internal: {
        Row: {
          id: string
          company_id: string
          file_name: string
          status: string
          error_message: string | null
          internal_error_detail: string | null // Protected
          internal_error_code: string | null   // Protected
          processing_started_at: string | null
          created_at: string
        }
      }
    }
  }
}
```

### 3. Verifică Tabele Noi

```typescript
// Tabel rate_limits (v1.5)
export interface Database {
  public: {
    Tables: {
      rate_limits: {
        Row: {
          id: string
          user_id: string
          resource_type: string
          request_count: number
          window_start: string
          reset_in_seconds: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          resource_type: string
          request_count?: number
          window_start?: string
          reset_in_seconds: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          resource_type?: string
          request_count?: number
          window_start?: string
          reset_in_seconds?: number
          created_at?: string
          updated_at?: string
        }
      }
      
      rate_limits_meta: {
        Row: {
          id: string
          last_cleanup_at: string
          cleanup_count: number
          created_at: string
        }
        // ... Insert/Update
      }
    }
  }
}
```

### 4. Verifică Coloane Noi

```typescript
// Companies cu status (v1.7)
companies: {
  Row: {
    id: string
    name: string
    cui: string
    status: string  // v1.7: 'active' | 'archived' | 'deleting'
    created_at: string
    updated_at: string
  }
}

// trial_balance_imports cu processing_started_at (v1.4)
trial_balance_imports: {
  Row: {
    id: string
    company_id: string
    file_name: string
    file_size_bytes: number
    status: string
    error_message: string | null
    internal_error_detail: string | null
    internal_error_code: string | null
    accounts_count: number | null
    processing_started_at: string | null  // v1.4: NOU
    created_at: string
    updated_at: string
  }
}
```

---

## 🧪 Testing Post-Regenerare

### Test 1: Type Checking

```bash
# Verifică că nu există erori TypeScript
npm run type-check

# SAU
npx tsc --noEmit
```

### Test 2: RPC Call Type-Safe

```typescript
// src/test/types.test.ts (create manual pentru verificare)

import { supabase } from '@/integrations/supabase/client';

async function testTypes() {
  // ✅ CORECT - fără p_user_id
  const { data } = await supabase.rpc('create_company_with_member', {
    p_name: 'Test Company',
    p_cui: 'RO12345678'
  });
  
  // ❌ GREȘIT - TypeScript va arunca eroare
  // @ts-expect-error - p_user_id nu mai există
  const { data: wrong } = await supabase.rpc('create_company_with_member', {
    p_name: 'Test',
    p_cui: 'RO123',
    p_user_id: 'uuid'  // Eroare TypeScript!
  });
  
  // ✅ CORECT - folosește VIEW
  const { data: imports } = await supabase
    .from('trial_balance_imports_public')
    .select('*');
  
  // ✅ CORECT - rate limiting
  const { data: allowed } = await supabase.rpc('check_rate_limit', {
    p_user_id: 'uuid',
    p_resource_type: 'import'
  });
}
```

### Test 3: Compile Frontend

```bash
# Build frontend pentru a verifica erori
npm run build

# Sau doar type-check
npm run type-check
```

---

## 🐛 Troubleshooting

### Problemă: Funcții lipsă din types

**Cauză**: Migrările nu au fost aplicate complet

**Soluție**:
```bash
# Verifică migrări
npx supabase migration list

# Aplică migrări lipsă
npx supabase db push
```

### Problemă: VIEW nu apare în types

**Cauză**: View-ul nu e recunoscut de Supabase CLI

**Soluție**:
```sql
-- Verifică că view-ul există
SELECT * FROM pg_views WHERE viewname = 'trial_balance_imports_public';

-- Regenerare force
npx supabase gen types typescript --project-id gqxopxbzslwrjgukqbha > src/integrations/supabase/types.ts
```

### Problemă: create_company_with_member încă are p_user_id

**Cauză**: Funcția veche nu a fost replaced

**Soluție**:
```sql
-- Verifică signature funcție
SELECT 
  proname, 
  pg_get_function_arguments(oid) AS args
FROM pg_proc 
WHERE proname = 'create_company_with_member';

-- Dacă încă are 3 args (name, cui, user_id):
-- Aplică din nou migrarea 100001
```

---

## 📝 Checklist Final

După regenerare types:

- [ ] Fișier `src/integrations/supabase/types.ts` generat
- [ ] `create_company_with_member` are 2 args (nu 3)
- [ ] `check_rate_limit` există
- [ ] `process_import_accounts` există
- [ ] `try_uuid` există
- [ ] VIEW `trial_balance_imports_public` există
- [ ] Tabel `rate_limits` există
- [ ] Coloană `companies.status` există
- [ ] Coloană `trial_balance_imports.processing_started_at` există
- [ ] `npm run type-check` trece fără erori
- [ ] `npm run build` compilează cu succes

---

**Data**: 28 Ianuarie 2026  
**Versiune**: 1.0
