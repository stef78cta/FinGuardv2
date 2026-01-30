
# Plan: Crearea Paginilor Publice pentru FinGuard

## Rezumat

Implementarea a 5 pagini publice noi (Despre noi, Cariere, Termeni, Confidențialitate, Blog) cu conținut în română pentru domeniul financiar-contabil, reutilizând design system-ul NEWA existent și layout-ul de landing page.

---

## Analiză Codebase

### Router Existent
- **React Router v6** în `src/App.tsx`
- Rute publice: `/`, `/login`, `/signup`, `/forgot-password`, `/style-guide`
- Paginile noi vor fi adăugate înainte de ruta catch-all `*`

### Design System NEWA
- Container: `container-custom` (max-width 1280px) și `container-narrow` (max-width 960px)
- Secțiuni: `section-padding`, `section-padding-reduced`
- Tipografie: `headline`, `subheadline`, `section-title`, `body-large`, `body`, `text-small`
- Butoane: `btn-primary`, `btn-ghost`, `btn-hero`
- Carduri: `card-feature`, `card-feature-highlight`
- Componente: `Navigation`, `Footer`, `CookieConsent`

### Pattern Pagină Landing
```tsx
<div className="min-h-screen bg-[var(--newa-surface-canvas)]">
  <Navigation />
  <main>
    {/* Hero + Secțiuni */}
  </main>
  <Footer />
</div>
```

---

## Fișiere de Creat

| Nr | Fișier | Scop |
|----|--------|------|
| 1 | `src/components/marketing/PageShell.tsx` | Wrapper comun pentru paginile publice |
| 2 | `src/pages/About.tsx` | Despre noi |
| 3 | `src/pages/Careers.tsx` | Cariere |
| 4 | `src/pages/Terms.tsx` | Termeni și Condiții |
| 5 | `src/pages/Privacy.tsx` | Politica de Confidențialitate |
| 6 | `src/pages/Blog.tsx` | Lista articole blog |
| 7 | `src/pages/BlogPost.tsx` | Pagina articol individual |
| 8 | `src/content/blogPosts.ts` | Date articole blog |

---

## Fișiere de Modificat

| Fișier | Modificare |
|--------|------------|
| `src/App.tsx` | Adăugare rute noi |
| `src/components/Footer.tsx` | Update link-uri reale |

---

## Componente Detaliate

### 1. PageShell.tsx - Wrapper Comun

```tsx
interface PageShellProps {
  title: string;           // Titlu pagină (pentru document.title)
  heroTitle: string;       // Titlu hero
  heroSubtitle?: string;   // Subtitlu hero
  children: ReactNode;
  narrow?: boolean;        // true = container-narrow
}
```

**Structură:**
- Navigation (import existent)
- Hero simplu cu titlu/subtitlu centrat
- Container pentru conținut (customizabil lățime)
- Footer (import existent)
- useEffect pentru document.title

---

### 2. About.tsx - Despre Noi

**Secțiuni:**

| Secțiune | Conținut |
|----------|----------|
| Hero | "Claritate financiară pentru decizii mai bune" |
| Misiune | 2-3 paragrafe despre reducerea timpului de închidere |
| Ce facem | Grid 4-6 puncte (import balanță, mapări, rapoarte) |
| Pentru cine | CFO, controller, contabilitate, antreprenori |
| Principii | 4 carduri: acuratețe, trasabilitate, securitate, simplitate |
| Securitate | Paragraf scurt despre acces pe roluri |
| Contact | Email placeholder |

---

### 3. Careers.tsx - Cariere

**Secțiuni:**

| Secțiune | Conținut |
|----------|----------|
| Hero | "Construim produse pentru finanțe" |
| De ce la noi | 4-5 paragrafe despre produs și cultură |
| Beneficii | Grid 4 carduri (flexibilitate, buget, echipă, impact) |
| Roluri | 3 carduri expandabile (Full-Stack, Data Engineer, Designer) |
| Proces | 3 pași vizuali (discuție, probă, ofertă) |
| CTA | "Trimite CV" cu mailto |

---

### 4. Terms.tsx - Termeni și Condiții

**Structură documentație legală:**

```text
1. Definiții
2. Descrierea serviciului
3. Conturi și acces
4. Abonamente și plăți
5. Utilizare acceptabilă
6. Proprietate intelectuală
7. Confidențialitate (link către Privacy)
8. Limitarea răspunderii
9. Suspendare/încetare
10. Modificări ale termenilor
11. Legea aplicabilă (România)
12. Contact
```

**Disclaimer clar**: nu oferă consultanță financiară/juridică

---

### 5. Privacy.tsx - Politică de Confidențialitate

**Structură GDPR:**

```text
1. Cine suntem (operator + DPO placeholder)
2. Date colectate
3. Scopuri și temeiuri
4. Stocare și perioade
5. Împuterniciți/furnizori
6. Transferuri SEE
7. Securitate
8. Drepturile persoanei vizate
9. Cookies
10. Actualizări și contact
```

---

### 6. Blog.tsx - Lista Articole

**Funcționalități:**

| Element | Implementare |
|---------|--------------|
| Căutare | Input controlat, filtrare client-side pe titlu |
| Filtrare categorie | Select dropdown |
| Grid articole | Carduri responsive 1/2/3 coloane |
| Articol card | Titlu, excerpt, data, reading time, category badge |
| Link | Navigate to `/blog/:slug` |

---

### 7. BlogPost.tsx - Articol Individual

**Structură:**

| Element | Implementare |
|---------|--------------|
| Breadcrumb | Blog > Titlu articol |
| Metadata | Data, reading time, category, tags |
| Content | Render secțiuni din array |
| Disclaimer | "Informații generale, nu consultanță" |
| CTA | Buton "Înapoi la Blog" |
| 404 | Mesaj când slug-ul nu există |

---

### 8. blogPosts.ts - Date Articole

**Structură articol:**

```tsx
interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  date: string; // ISO
  readingTime: string;
  category: string;
  tags: string[];
  content: {
    type: 'paragraph' | 'heading' | 'list' | 'example';
    text?: string;
    items?: string[];
  }[];
}
```

**6 Articole Propuse:**

1. "Cum citești rapid o balanță de verificare: 7 controale care prind erori"
2. "P&L vs Cash Flow: de ce profitul nu înseamnă bani în bancă"
3. "Maparea planului de conturi la rapoarte de management"
4. "Închiderea lunii: checklist scurt pentru control financiar"
5. "Buget vs realizat: cum explici deviațiile fără să te pierzi în detalii"
6. "Indicatori de lichiditate și îndatorare: interpretare pentru decizii"

---

## Modificări Rute - App.tsx

```tsx
// Import noi
import About from "./pages/About";
import Careers from "./pages/Careers";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";

// Rute noi (după /style-guide-v2, înainte de /app)
<Route path="/despre" element={<About />} />
<Route path="/cariere" element={<Careers />} />
<Route path="/termeni" element={<Terms />} />
<Route path="/confidentialitate" element={<Privacy />} />
<Route path="/blog" element={<Blog />} />
<Route path="/blog/:slug" element={<BlogPost />} />
```

---

## Modificări Footer.tsx

**Linkuri actuale** (placeholder `#`):

```tsx
const footerLinks = {
  produs: ['Caracteristici', 'Prețuri', 'Demo interactiv'],
  resurse: ['Blog financiar', 'Cazuri de studiu', 'Ghid KPI-uri'],
  companie: ['Despre noi', 'Cariere', 'Termeni & Condiții', 'Politică confidențialitate']
};
```

**Transformare în Link-uri reale:**

| Text | Rută |
|------|------|
| Blog financiar | `/blog` |
| Despre noi | `/despre` |
| Cariere | `/cariere` |
| Termeni & Condiții | `/termeni` |
| Politică confidențialitate | `/confidentialitate` |

---

## Stiluri CSS

Nu sunt necesare clase noi. Se folosesc clasele existente NEWA:
- `container-custom`, `container-narrow`
- `section-padding`, `section-padding-reduced`
- `section-title`, `subheadline`, `body-large`, `body`
- `card-feature`, `newa-card`
- `btn-primary`, `btn-ghost`
- `newa-focus-ring`

---

## Considerații Tehnice

| Aspect | Implementare |
|--------|--------------|
| SEO title | `useEffect(() => { document.title = "..." }, [])` |
| Scroll to top | `useEffect(() => { window.scrollTo(0, 0) }, [])` |
| Responsive | Grid-uri cu `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| Accessibility | `newa-focus-ring` pe toate elementele interactive |
| Mobile nav | Navigation componentă existentă (deja responsive) |

---

## Ordine Implementare

1. **PageShell.tsx** - Wrapper comun
2. **blogPosts.ts** - Date pentru blog
3. **About.tsx** - Pagină simplă pentru testare pattern
4. **Careers.tsx** - Include carduri și CTA
5. **Terms.tsx** - Conținut legal structurat
6. **Privacy.tsx** - Conținut GDPR
7. **Blog.tsx** - Listă cu căutare/filtrare
8. **BlogPost.tsx** - Articol cu routing dinamic
9. **App.tsx** - Adăugare rute
10. **Footer.tsx** - Update linkuri

---

## Criterii de Acceptare

- Build fără erori TypeScript
- Rutele funcționează și sunt navigabile din footer
- Paginile arată consistent cu landing-ul (spacing, font, culori)
- Blog: căutare și filtrare funcționale
- Blog: pagina articol afișează conținut corect după slug
- Blog: mesaj când slug-ul nu există
- Toate paginile au document.title setat
- Scroll to top la navigare

---

## Estimare

| Component | Linii cod (aprox) |
|-----------|-------------------|
| PageShell.tsx | 60 |
| blogPosts.ts | 400 |
| About.tsx | 200 |
| Careers.tsx | 250 |
| Terms.tsx | 300 |
| Privacy.tsx | 280 |
| Blog.tsx | 180 |
| BlogPost.tsx | 150 |
| App.tsx delta | 20 |
| Footer.tsx delta | 40 |
| **Total** | ~1880 linii |

