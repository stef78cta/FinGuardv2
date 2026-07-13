import { describe, expect, it } from 'vitest';
import {
  validateCompanyName,
  validateCui,
  validateEmail,
  validatePhone,
  validateCompanyProfileForm,
  trimCui,
  formatCapitalizedLowercase,
} from './companyValidation';

describe('companyValidation', () => {
  it('respinge denumire goală', () => {
    expect(validateCompanyName('   ')).toBeTruthy();
    expect(validateCompanyName('SC Test SRL')).toBeNull();
  });

  it('acceptă CUI cu sau fără prefix RO', () => {
    expect(validateCui('')).toBeTruthy();
    expect(validateCui('RO12345678')).toBeNull();
    expect(validateCui('12345678')).toBeNull();
    expect(trimCui('RO 12345678')).toBe('RO12345678');
  });

  it('validează e-mail doar când este completat', () => {
    expect(validateEmail('')).toBeNull();
    expect(validateEmail('invalid')).toBeTruthy();
    expect(validateEmail('test@firma.ro')).toBeNull();
  });

  it('acceptă formate uzuale de telefon', () => {
    expect(validatePhone('')).toBeNull();
    expect(validatePhone('+40 721 123 456')).toBeNull();
    expect(validatePhone('abc')).toBeTruthy();
  });

  it('formatează localitatea și județul cu prima literă mare', () => {
    expect(formatCapitalizedLowercase('BUCUREȘTI')).toBe('București');
    expect(formatCapitalizedLowercase('bucuresti')).toBe('Bucuresti');
    expect(formatCapitalizedLowercase('SECTOR 1')).toBe('Sector 1');
    expect(formatCapitalizedLowercase('cluj-napoca')).toBe('Cluj-napoca');
  });

  it('cere câmpurile complete la salvarea profilului', () => {
    const errors = validateCompanyProfileForm(
      {
        name: 'SC Test SRL',
        cui: 'RO123',
        tradeRegisterNumber: '',
        legalForm: '',
        address: '',
        city: '',
        county: '',
        country: '',
        postalCode: '',
        email: '',
        phone: '',
        website: '',
      },
      { requireFullProfile: true }
    );

    expect(errors.address).toBeTruthy();
    expect(errors.city).toBeTruthy();
    expect(errors.county).toBeTruthy();
    expect(errors.country).toBeTruthy();
    expect(errors.email).toBeUndefined();
    expect(errors.phone).toBeUndefined();
  });

  it('validează formatul e-mailului și telefonului doar când sunt completate', () => {
    const errors = validateCompanyProfileForm(
      {
        name: 'SC Test SRL',
        cui: 'RO123',
        tradeRegisterNumber: '',
        legalForm: '',
        address: 'Str. Test 1',
        city: 'București',
        county: 'Sector 1',
        country: 'România',
        postalCode: '',
        email: 'invalid',
        phone: 'abc',
        website: '',
      },
      { requireFullProfile: true }
    );

    expect(errors.email).toBeTruthy();
    expect(errors.phone).toBeTruthy();
  });
});
