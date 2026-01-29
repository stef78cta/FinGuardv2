

# Plan: Mărire Dialog "Conturi Balanță" + Rezolvare Erori Build

## Rezumat

Acest plan rezolvă 3 probleme:
1. Lățirea dialogului pentru vizualizarea completă a coloanelor balanței
2. Eroare TypeScript la `useCompany.tsx` (tip RPC incompatibil)
3. Eroare TypeScript la `useTrialBalances.tsx` (funcție RPC lipsă din tipuri)

---

## 1. Mărire Dialog "Conturi Balanță"

### Problemă Identificată
Dialogul actual are `max-w-[95vw] lg:max-w-6xl xl:max-w-7xl`, dar tabelul cu 8 coloane de date financiare nu se încadrează complet, iar coloana "SF Credit" este tăiată.

### Soluție

| Proprietate | Valoare Actuală | Valoare Nouă |
|-------------|----------------|--------------|
| `max-w` desktop | `xl:max-w-7xl` | `w-[95vw] max-w-[1400px]` |
| `min-w` tabel | `min-w-[900px]` | `min-w-[1200px]` |
| Scroll orizontal | implicit | scroll explicit vizibil |

### Modificări Fișier: `src/pages/IncarcareBalanta.tsx`

**Linia 869** - Mărire dialog:
```tsx
// DE LA:
<DialogContent className="max-w-[95vw] lg:max-w-6xl xl:max-w-7xl max-h-[85vh] overflow-hidden flex flex-col">

// LA:
<DialogContent className="w-[95vw] max-w-[1400px] max-h-[85vh] overflow-hidden flex flex-col">
```

**Linia 892** - Mărire tabel și scroll vizibil:
```tsx
// DE LA:
<Table className="min-w-[900px]">

// LA:
<Table className="min-w-[1200px]">
```

---

## 2. Eroare Build: `useCompany.tsx` - RPC Type Mismatch

### Problemă
Codul (v1.8) a eliminat `p_user_id` din apelul `create_company_with_member`, dar tipul generat din Supabase încă îl cere.

### Cauză
Tipurile TypeScript (`src/integrations/supabase/types.ts`) nu au fost regenerate după modificarea funcției PostgreSQL.

### Soluție
Actualizare manuală a tipurilor în `src/integrations/supabase/types.ts`:

**Linia 369-371** - Eliminare `p_user_id`:
```typescript
// DE LA:
create_company_with_member: {
  Args: { p_cui: string; p_name: string; p_user_id: string }
  Returns: string
}

// LA:
create_company_with_member: {
  Args: { p_cui: string; p_name: string }
  Returns: string
}
```

---

## 3. Eroare Build: `useTrialBalances.tsx` - RPC Lipsă

### Problemă
Funcția `cleanup_stale_imports` este apelată în cod dar nu există în definiția tipurilor.

### Soluție
Adăugare funcție în `src/integrations/supabase/types.ts`:

**După linia 434** - Adăugare funcție:
```typescript
soft_delete_import: { Args: { _import_id: string }; Returns: boolean }
cleanup_stale_imports: { Args: Record<PropertyKey, never>; Returns: { cleaned_count: number }[] }
```

---

## Ordine Implementare

1. **Actualizare tipuri Supabase** (`types.ts`)
   - Eliminare `p_user_id` din `create_company_with_member`
   - Adăugare `cleanup_stale_imports`

2. **Mărire dialog** (`IncarcareBalanta.tsx`)
   - Lățire DialogContent la `max-w-[1400px]`
   - Mărire tabel la `min-w-[1200px]`

---

## Rezultat Așteptat

- Dialogul va afișa toate cele 8 coloane fără trunchiere
- Scroll orizontal funcțional pentru ecrane mai mici
- Build-ul va compila fără erori TypeScript
- UX îmbunătățit pentru vizualizarea balanței de verificare

