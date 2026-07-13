/**
 * Validări pentru datele companiei (creare rapidă și profil complet).
 */

export interface CompanyFormValues {
  name: string;
  cui: string;
  tradeRegisterNumber: string;
  legalForm: string;
  address: string;
  city: string;
  county: string;
  country: string;
  postalCode: string;
  email: string;
  phone: string;
  website: string;
}

export type CompanyFormErrors = Partial<Record<keyof CompanyFormValues, string>>;

export const trimCompanyName = (value: string): string => value.trim();

export const trimCui = (value: string): string => value.trim().replace(/\s+/g, '');

/**
 * Formatează textul: prima literă mare, restul litere mici (locale ro-RO).
 * Ex: BUCUREȘTI → București, sector 1 → Sector 1
 */
export const formatCapitalizedLowercase = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed.charAt(0).toLocaleUpperCase('ro-RO') + trimmed.slice(1).toLocaleLowerCase('ro-RO');
};

export const validateCompanyName = (name: string): string | null => {
  if (!trimCompanyName(name)) {
    return 'Denumirea companiei este obligatorie.';
  }
  return null;
};

export const validateCui = (cui: string): string | null => {
  const trimmed = trimCui(cui);
  if (!trimmed) {
    return 'CUI-ul este obligatoriu.';
  }
  return null;
};

export const validateEmail = (email: string): string | null => {
  const trimmed = email.trim();
  if (!trimmed) return null;

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(trimmed)) {
    return 'Adresa de e-mail nu este validă.';
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  const trimmed = phone.trim();
  if (!trimmed) return null;

  const digitsOnly = trimmed.replace(/[\s\-().+]/g, '');
  if (!/^\+?\d{6,15}$/.test(digitsOnly)) {
    return 'Numărul de telefon nu este valid.';
  }
  return null;
};

const validateRequired = (value: string, message: string): string | null => {
  if (!value.trim()) return message;
  return null;
};

export interface ValidateCompanyProfileOptions {
  /** true pentru salvarea din Setări; false pentru crearea rapidă din modal */
  requireFullProfile?: boolean;
}

/**
 * Validează formularul companiei și returnează erorile per câmp.
 */
export const validateCompanyProfileForm = (
  values: CompanyFormValues,
  options: ValidateCompanyProfileOptions = {}
): CompanyFormErrors => {
  const { requireFullProfile = false } = options;
  const errors: CompanyFormErrors = {};

  const nameError = validateCompanyName(values.name);
  if (nameError) errors.name = nameError;

  const cuiError = validateCui(values.cui);
  if (cuiError) errors.cui = cuiError;

  const emailError = validateEmail(values.email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(values.phone);
  if (phoneError) errors.phone = phoneError;

  if (requireFullProfile) {
    const addressError = validateRequired(values.address, 'Adresa este obligatorie.');
    if (addressError) errors.address = addressError;

    const cityError = validateRequired(values.city, 'Localitatea este obligatorie.');
    if (cityError) errors.city = cityError;

    const countyError = validateRequired(values.county, 'Județul este obligatoriu.');
    if (countyError) errors.county = countyError;

    const countryError = validateRequired(values.country, 'Țara este obligatorie.');
    if (countryError) errors.country = countryError;
  }

  return errors;
};

export const hasFormErrors = (errors: CompanyFormErrors): boolean =>
  Object.keys(errors).length > 0;
