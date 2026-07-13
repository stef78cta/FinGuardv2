import { describe, expect, it } from 'vitest';
import { normalizeCui, isSameCui } from './cuiNormalization';

describe('normalizeCui', () => {
  it('elimină prefixul RO (case-insensitive)', () => {
    expect(normalizeCui('RO12345678')).toBe('12345678');
    expect(normalizeCui('ro12345678')).toBe('12345678');
    expect(normalizeCui('12345678')).toBe('12345678');
  });

  it('elimină spațiile și separatorii', () => {
    expect(normalizeCui('RO 12345678')).toBe('12345678');
    expect(normalizeCui('123 456 78')).toBe('12345678');
    expect(normalizeCui('RO-12345678')).toBe('12345678');
    expect(normalizeCui('  RO12 345 678  ')).toBe('12345678');
  });

  it('întoarce string gol pentru valori fără caractere alfanumerice utile', () => {
    expect(normalizeCui('')).toBe('');
    expect(normalizeCui('   ')).toBe('');
    expect(normalizeCui('---')).toBe('');
    expect(normalizeCui('RO')).toBe('');
  });
});

describe('isSameCui — matricea de echivalență (Teste T-CUI 3, 4, 5)', () => {
  it('Test 3: RO12345678 == 12345678', () => {
    expect(isSameCui('RO12345678', '12345678')).toBe(true);
  });

  it('Test 4: litere mari == litere mici', () => {
    expect(isSameCui('RO12345678', 'ro12345678')).toBe(true);
  });

  it('Test 5: fără spații == cu spații', () => {
    expect(isSameCui('RO12345678', 'RO 123 456 78')).toBe(true);
  });

  it('CUI-uri diferite nu se confundă', () => {
    expect(isSameCui('RO12345678', 'RO87654321')).toBe(false);
    expect(isSameCui('12345678', '123456789')).toBe(false);
  });

  it('valorile goale nu se consideră egale', () => {
    expect(isSameCui('', '')).toBe(false);
    expect(isSameCui('RO', '')).toBe(false);
  });
});
