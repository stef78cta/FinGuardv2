/**
 * File Helpers - Utility functions pentru operații pe fișiere
 * 
 * v1.7: Normalizare filename pentru storage policy
 * 
 * Storage policy necesită:
 * - Doar caractere ASCII (fără diacritice)
 * - Doar caractere safe: a-zA-Z0-9._\- (spații)
 * - Regex: ^[a-zA-Z0-9._\- ]+$
 */

/**
 * Normalizează un filename pentru storage policy.
 * 
 * Transformări:
 * 1. Decompoziție Unicode (NFD) - separă diacritice de litere
 * 2. Elimină diacritice (range \u0300-\u036f)
 * 3. Replace caractere invalide cu underscore
 * 4. Trim spații leading/trailing
 * 
 * @param filename - Filename original (poate conține diacritice)
 * @returns Filename normalizat (doar ASCII safe)
 * 
 * @example
 * normalizeFilename("balanță contabilă.xlsx")
 * // Returns: "balanta contabila.xlsx"
 * 
 * @example
 * normalizeFilename("situație financiară 2023.xls")
 * // Returns: "situatie financiara 2023.xls"
 * 
 * @example
 * normalizeFilename("file@#$%^&*.xlsx")
 * // Returns: "file_______.xlsx"
 */
export function normalizeFilename(filename: string): string {
  return filename
    .normalize('NFD')  // Decompoziție: ă → a + ̆
    .replace(/[\u0300-\u036f]/g, '')  // Elimină diacritice
    .replace(/[^a-zA-Z0-9._\- ]/g, '_')  // Replace caractere invalide
    .trim();  // Trim spații
}

/**
 * Validează că un filename este safe pentru storage policy.
 * 
 * @param filename - Filename de validat
 * @returns true dacă filename e safe
 * 
 * @example
 * isValidFilename("balanta.xlsx")  // true
 * isValidFilename("balanță.xlsx")  // false (diacritice)
 * isValidFilename("file@#$.xlsx")  // false (caractere speciale)
 */
export function isValidFilename(filename: string): boolean {
  // Pattern identic cu storage policy
  return /^[a-zA-Z0-9._\- ]+$/.test(filename);
}

/**
 * Validează extensia fișierului pentru balanțe.
 * 
 * @param filename - Filename de validat
 * @returns true dacă extensie e .xlsx sau .xls (case-insensitive)
 * 
 * @example
 * hasValidExtension("balanta.xlsx")  // true
 * hasValidExtension("balanta.XLSX")  // true
 * hasValidExtension("balanta.xls")   // true
 * hasValidExtension("balanta.pdf")   // false
 */
export function hasValidExtension(filename: string): boolean {
  return /\.(xlsx|xls)$/i.test(filename);
}

/**
 * Pregătește un filename pentru upload în storage.
 * 
 * Combină normalizare + validare + extindere cu timestamp (opțional).
 * 
 * @param originalFilename - Filename original
 * @param addTimestamp - Dacă true, adaugă timestamp pentru unicitate
 * @returns Filename normalizat și safe
 * 
 * @example
 * prepareFilenameForUpload("balanță.xlsx")
 * // Returns: "balanta.xlsx"
 * 
 * @example
 * prepareFilenameForUpload("balanță.xlsx", true)
 * // Returns: "balanta_1706456789123.xlsx"
 */
export function prepareFilenameForUpload(
  originalFilename: string,
  addTimestamp = false
): string {
  // Normalizează
  let filename = normalizeFilename(originalFilename);
  
  // Validează extensie
  if (!hasValidExtension(filename)) {
    throw new Error('Extensie fișier invalidă. Doar .xlsx sau .xls sunt permise.');
  }
  
  // Adaugă timestamp dacă cerut
  if (addTimestamp) {
    const extension = filename.match(/\.(xlsx|xls)$/i)?.[0] || '.xlsx';
    const nameWithoutExt = filename.replace(/\.(xlsx|xls)$/i, '');
    filename = `${nameWithoutExt}_${Date.now()}${extension}`;
  }
  
  return filename;
}

/**
 * Construiește path-ul complet pentru storage.
 * 
 * Format: <user_id>/<filename>
 * 
 * @param userId - UUID user (din auth.uid())
 * @param filename - Filename normalizat
 * @returns Path complet pentru storage
 * 
 * @example
 * buildStoragePath("550e8400-e29b-41d4-a716-446655440000", "balanta.xlsx")
 * // Returns: "550e8400-e29b-41d4-a716-446655440000/balanta.xlsx"
 */
export function buildStoragePath(userId: string, filename: string): string {
  // Validare UUID (basic)
  if (!/^[a-f0-9-]{36}$/i.test(userId)) {
    throw new Error('Invalid user ID format');
  }
  
  // Validare filename
  if (!isValidFilename(filename)) {
    throw new Error('Invalid filename format. Use normalizeFilename() first.');
  }
  
  return `${userId}/${filename}`;
}
