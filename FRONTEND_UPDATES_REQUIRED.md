# Frontend Updates Required - Security Patches v1.8

> **IMPORTANT**: Acest document descrie modificările OBLIGATORII în frontend după aplicarea migrărilor SQL.

---

## 📋 Sumar Modificări

| Fișier | Modificare | Severitate |
|--------|-----------|------------|
| `src/hooks/useCompany.tsx` | Elimină p_user_id din RPC | CRITICĂ |
| `src/contexts/CompanyContext.tsx` | Similar | CRITICĂ |
| `src/hooks/useTrialBalances.tsx` | Folosește view + normalizare | ÎNALTĂ |
| `src/utils/fileHelpers.ts` | **CREAT** - Helper normalizare | ÎNALTĂ |
| Toate upload components | Folosește fileHelpers | ÎNALTĂ |

---

## 1. RPC create_company_with_member (CRITICĂ)

### Problema

Funcția `create_company_with_member` NU mai acceptă parametrul `p_user_id` (v1.8).  
Funcția folosește `get_user_id_from_auth()` intern pentru securitate.

### Locație Fișiere

Caută în tot codebase-ul:
```bash
grep -r "create_company_with_member" src/
```

Probabil în:
- `src/hooks/useCompany.tsx`
- `src/contexts/CompanyContext.tsx`
- `src/pages/companies/create.tsx` (sau similar)

### Modificare

**ÎNAINTE**:
```typescript
const { data, error } = await supabase.rpc('create_company_with_member', {
  p_name: name,
  p_cui: cui,
  p_user_id: userData.id  // ❌ ELIMINĂ
});
```

**DUPĂ**:
```typescript
const { data, error } = await supabase.rpc('create_company_with_member', {
  p_name: name,
  p_cui: cui
  // p_user_id eliminat (folosește get_user_id_from_auth() intern)
});

// Handle error 23505 (duplicate CUI)
if (error?.code === '23505') {
  toast.error('O companie cu acest CUI există deja. Solicită invitație de la owner.');
  return;
}

if (error) {
  toast.error(error.message || 'Eroare la crearea companiei');
  return;
}

// Success
toast.success('Companie creată cu succes!');
navigate(`/companies/${data}`);
```

---

## 2. trial_balance_imports VIEW (ÎNALTĂ)

### Problema

Tabelul `trial_balance_imports` NU mai e accesibil direct pentru `authenticated` (v1.7).  
Acces doar prin VIEW `trial_balance_imports_public` care NU expune `internal_error_detail`.

### Locație Fișiere

Caută în tot codebase-ul:
```bash
grep -r "trial_balance_imports" src/ | grep "from("
```

Probabil în:
- `src/hooks/useTrialBalances.tsx`
- `src/hooks/useImports.tsx`
- `src/components/imports/ImportsList.tsx`
- `src/pages/imports/index.tsx`

### Modificare

**ÎNAINTE**:
```typescript
const { data: imports } = await supabase
  .from('trial_balance_imports')  // ❌ TABEL direct
  .select('*')
  .eq('company_id', companyId);
```

**DUPĂ**:
```typescript
const { data: imports } = await supabase
  .from('trial_balance_imports_public')  // ✅ VIEW (fără internal_error_detail)
  .select('*')
  .eq('company_id', companyId);
```

**NOTĂ**: View-ul expune:
- ✅ id, company_id, file_name, file_size_bytes, status
- ✅ error_message (safe, user-friendly)
- ✅ accounts_count, processing_started_at
- ✅ created_at, updated_at
- ❌ internal_error_detail (protected)
- ❌ internal_error_code (protected)

---

## 3. Filename Normalizare (ÎNALTĂ)

### Problema

Storage policy necesită filename ASCII fără diacritice (v1.7).  
Upload cu "balanță.xlsx" va fi REJECT de policy.

### Locație Fișiere

Caută în tot codebase-ul:
```bash
grep -r "storage.*upload" src/
grep -r ".upload(" src/
```

Probabil în:
- `src/hooks/useFileUpload.tsx`
- `src/components/upload/FileDropzone.tsx`
- `src/components/imports/UploadForm.tsx`

### Implementare

#### Pas 1: Folosește helper (DEJA CREAT)

```typescript
import { 
  normalizeFilename, 
  prepareFilenameForUpload,
  buildStoragePath 
} from '@/utils/fileHelpers';
```

#### Pas 2: Normalizează înainte de upload

**ÎNAINTE**:
```typescript
const handleUpload = async (file: File) => {
  const userId = user.id;
  const filePath = `${userId}/${file.name}`;  // ❌ file.name poate avea diacritice
  
  const { error } = await supabase.storage
    .from('trial-balances')
    .upload(filePath, file);
  
  // ...
};
```

**DUPĂ**:
```typescript
const handleUpload = async (file: File) => {
  const userId = user.id;
  
  // Normalizează filename (elimină diacritice)
  const safeFilename = prepareFilenameForUpload(file.name);
  const filePath = buildStoragePath(userId, safeFilename);
  
  // filePath = "550e8400-e29b-41d4-a716-446655440000/balanta.xlsx"
  
  const { error } = await supabase.storage
    .from('trial-balances')
    .upload(filePath, file);
  
  if (error) {
    toast.error('Eroare la upload: ' + error.message);
    return;
  }
  
  // Salvează în DB cu filename normalizat
  const { error: dbError } = await supabase
    .from('trial_balance_imports_public')
    .insert({
      company_id: companyId,
      file_name: filePath,  // Include userId în path
      file_size_bytes: file.size,
      status: 'pending'
    });
  
  // ...
};
```

#### Pas 3: UI Warning pentru utilizator

```typescript
const handleFileSelect = (file: File) => {
  const originalName = file.name;
  const normalizedName = normalizeFilename(originalName);
  
  // Dacă filename s-a schimbat, avertizează user
  if (originalName !== normalizedName) {
    toast.info(
      `Filename schimbat: "${originalName}" → "${normalizedName}"`,
      { duration: 5000 }
    );
  }
  
  // Continuă cu upload...
};
```

---

## 4. Error Handling Îmbunătățit

### Duplicate CUI (error.code === '23505')

```typescript
try {
  const { data, error } = await supabase.rpc('create_company_with_member', {
    p_name: name,
    p_cui: cui
  });
  
  if (error) {
    // Handle specific errors
    switch (error.code) {
      case '23505':  // unique_violation
        toast.error(
          'O companie cu acest CUI există deja în sistem. ' +
          'Dacă doriți acces, solicitați o invitație de la owner.'
        );
        break;
      
      case 'PGRST116':  // function not found
        toast.error('Funcție RPC nu există. Verificați migrările.');
        break;
      
      default:
        toast.error(error.message || 'Eroare la crearea companiei');
    }
    return;
  }
  
  // Success
  toast.success('Companie creată cu succes!');
  navigate(`/companies/${data}`);
  
} catch (err) {
  console.error('Unexpected error:', err);
  toast.error('Eroare neașteptată. Contactați suportul.');
}
```

### Rate Limiting (429 Too Many Requests)

```typescript
const handleImport = async () => {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/parse-balanta`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ import_id: importId })
    });
    
    if (response.status === 429) {
      const data = await response.json();
      const retryAfter = data.retryAfter || 3600;  // seconds
      
      toast.error(
        `Prea multe cereri. Încercați din nou în ${Math.ceil(retryAfter / 60)} minute.`,
        { duration: 10000 }
      );
      return;
    }
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const result = await response.json();
    toast.success(`Import realizat: ${result.accountsCount} conturi`);
    
  } catch (err) {
    console.error('Import error:', err);
    toast.error('Eroare la import. Verificați fișierul.');
  }
};
```

---

## 5. Checklist Implementare

### Pas 1: Search & Replace

```bash
# 1. Găsește toate apelurile RPC
grep -rn "create_company_with_member" src/

# 2. Găsește toate referințele la trial_balance_imports
grep -rn "from.*trial_balance_imports" src/

# 3. Găsește toate upload-urile în storage
grep -rn "storage.*upload" src/
```

### Pas 2: Modificări

- [ ] Elimină p_user_id din toate apelurile create_company_with_member
- [ ] Add error handling pentru error.code === '23505'
- [ ] Replace .from('trial_balance_imports') cu .from('trial_balance_imports_public')
- [ ] Importă fileHelpers în componente upload
- [ ] Folosește normalizeFilename() înainte de upload
- [ ] Add UI warning pentru filename schimbat
- [ ] Add error handling pentru 429 (rate limiting)

### Pas 3: Testing

- [ ] Test create company cu CUI valid → success
- [ ] Test create company cu CUI duplicate → error 23505 cu mesaj friendly
- [ ] Test view imports → NU arată internal_error_detail
- [ ] Test upload "balanță.xlsx" → normalizat la "balanta.xlsx"
- [ ] Test upload 11 imports rapid → ultimul primeşte 429
- [ ] Test upload fișier > 10MB → reject ÎNAINTE de download

---

## 6. TypeScript Types Update

După aplicarea migrărilor, regenerează tipurile:

```bash
cd c:\_Software\SAAS\finguardv2
npx supabase gen types typescript --project-id gqxopxbzslwrjgukqbha > src/integrations/supabase/types.ts
```

Verifică că:
- [x] `create_company_with_member` are signature: `(p_name: string, p_cui: string) => UUID`
- [x] `check_rate_limit` există
- [x] `process_import_accounts` există
- [x] `try_uuid` există
- [x] VIEW `trial_balance_imports_public` există în types

---

## 7. Exemple Complete

### Exemplu: useCompany.tsx (UPDATE)

```typescript
// src/hooks/useCompany.tsx
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from '@/hooks/use-toast';

export const useCompany = () => {
  const supabase = useSupabaseClient();
  const user = useUser();

  const createCompany = async (name: string, cui: string) => {
    if (!user) {
      toast.error('Nu sunteți autentificat');
      return null;
    }

    try {
      // v1.8: Elimină p_user_id (folosește get_user_id_from_auth() intern)
      const { data: companyId, error } = await supabase.rpc('create_company_with_member', {
        p_name: name,
        p_cui: cui
        // NU mai trimite p_user_id
      });

      if (error) {
        // Handle specific errors
        if (error.code === '23505') {
          toast.error(
            'O companie cu acest CUI există deja. Solicitați invitație de la owner.',
            { duration: 7000 }
          );
        } else {
          toast.error(error.message || 'Eroare la crearea companiei');
        }
        return null;
      }

      toast.success('Companie creată cu succes!');
      return companyId;
    } catch (err) {
      console.error('Unexpected error creating company:', err);
      toast.error('Eroare neașteptată. Contactați suportul.');
      return null;
    }
  };

  return { createCompany };
};
```

### Exemplu: useImports.tsx (NEW)

```typescript
// src/hooks/useImports.tsx
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { useQuery } from '@tanstack/react-query';

export const useImports = (companyId: string) => {
  const supabase = useSupabaseClient();

  return useQuery({
    queryKey: ['imports', companyId],
    queryFn: async () => {
      // v1.7: Folosește VIEW (nu tabel direct)
      const { data, error } = await supabase
        .from('trial_balance_imports_public')  // VIEW fără internal_error_detail
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!companyId
  });
};
```

### Exemplu: FileUpload Component (UPDATE)

```typescript
// src/components/upload/FileUpload.tsx
import { useState } from 'react';
import { useSupabaseClient, useUser } from '@supabase/auth-helpers-react';
import { toast } from '@/hooks/use-toast';
import { 
  normalizeFilename, 
  prepareFilenameForUpload,
  buildStoragePath 
} from '@/utils/fileHelpers';

export const FileUpload = ({ companyId }: { companyId: string }) => {
  const supabase = useSupabaseClient();
  const user = useUser();
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (file: File) => {
    if (!user) return;

    try {
      setUploading(true);

      // v1.7: Normalizează filename (elimină diacritice)
      const originalName = file.name;
      const safeFilename = prepareFilenameForUpload(originalName);

      // Avertizează user dacă filename s-a schimbat
      if (originalName !== safeFilename) {
        toast.info(
          `Filename schimbat: "${originalName}" → "${safeFilename}"`,
          { duration: 5000 }
        );
      }

      // Construiește path cu userId
      const filePath = buildStoragePath(user.id, safeFilename);

      // Upload în storage
      const { error: uploadError } = await supabase.storage
        .from('trial-balances')
        .upload(filePath, file);

      if (uploadError) {
        toast.error('Eroare la upload: ' + uploadError.message);
        return;
      }

      // Salvează în DB cu filename normalizat
      const { error: dbError } = await supabase
        .from('trial_balance_imports_public')
        .insert({
          company_id: companyId,
          file_name: filePath,
          file_size_bytes: file.size,
          status: 'pending'
        });

      if (dbError) {
        // Cleanup storage dacă DB insert eșuează
        await supabase.storage
          .from('trial-balances')
          .remove([filePath]);

        toast.error('Eroare la salvare: ' + dbError.message);
        return;
      }

      toast.success('Fișier încărcat cu succes!');

    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Eroare neașteptată la upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
        }}
        disabled={uploading}
      />
      {uploading && <p>Se încarcă...</p>}
    </div>
  );
};
```

---

## 📞 Suport

Pentru probleme sau întrebări:
- Review `planning/DEPLOYMENT_GUIDE.md` (secțiunea Frontend Updates)
- Check `src/utils/fileHelpers.ts` pentru helper functions
- Test pe staging ÎNAINTE de producție

---

**Versiune Document**: 1.0  
**Data**: 28 Ianuarie 2026  
**Status**: ⚠️ ACȚIUNE NECESARĂ
