/**
 * Normalizare canonică CUI — oglindă a funcției SQL `public.normalize_cui`.
 *
 * Reguli (aceeași companie pentru toate variantele):
 *   1. elimină toate caracterele non-alfanumerice (spații, liniuțe, puncte);
 *   2. UPPER;
 *   3. elimină prefixul fiscal `RO`.
 *
 * Unicitatea reală este garantată în baza de date (index UNIQUE pe expresia canonică).
 * Această funcție e folosită doar pentru feedback rapid în UI și în teste.
 */
export const normalizeCui = (cui: string): string =>
  (cui ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .replace(/^RO/, '');

/**
 * Două CUI-uri reprezintă aceeași companie dacă valorile canonice coincid.
 */
export const isSameCui = (a: string, b: string): boolean =>
  normalizeCui(a) !== '' && normalizeCui(a) === normalizeCui(b);
