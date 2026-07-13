import type { Company } from '@/contexts/CompanyContext';
import type { CompanyFormValues } from '@/lib/companyValidation';
import { trimCompanyName, trimCui, formatCapitalizedLowercase } from '@/lib/companyValidation';

export const COMPANY_SELECT_FIELDS =
  'id, name, cui, currency, fiscal_year_start_month, address, city, county, country_code, postal_code, phone, email, website, trade_register_number, legal_form';

/**
 * Mapează înregistrarea din Supabase la valorile formularului din Setări.
 */
export const companyToFormValues = (company: Company): CompanyFormValues => ({
  name: company.name ?? '',
  cui: company.cui ?? '',
  tradeRegisterNumber: company.trade_register_number ?? '',
  legalForm: company.legal_form ?? '',
  address: company.address ?? '',
  city: company.city ? formatCapitalizedLowercase(company.city) : '',
  county: company.county ? formatCapitalizedLowercase(company.county) : '',
  country: company.country_code ?? '',
  postalCode: company.postal_code ?? '',
  email: company.email ?? '',
  phone: company.phone ?? '',
  website: company.website ?? '',
});

/**
 * Pregătește payload-ul pentru UPDATE pe tabela companies.
 */
export const formValuesToCompanyUpdate = (values: CompanyFormValues) => ({
  name: trimCompanyName(values.name),
  cui: trimCui(values.cui),
  trade_register_number: values.tradeRegisterNumber.trim() || null,
  legal_form: values.legalForm.trim() || null,
  address: values.address.trim() || null,
  city: values.city.trim() ? formatCapitalizedLowercase(values.city) : null,
  county: values.county.trim() ? formatCapitalizedLowercase(values.county) : null,
  country_code: values.country.trim() || null,
  postal_code: values.postalCode.trim() || null,
  email: values.email.trim() || null,
  phone: values.phone.trim() || null,
  website: values.website.trim() || null,
});

/**
 * Fuzionează datele actualizate în obiectul Company din context.
 */
export const mergeCompanyUpdate = (
  company: Company,
  values: CompanyFormValues
): Company => {
  const update = formValuesToCompanyUpdate(values);
  return {
    ...company,
    name: update.name,
    cui: update.cui,
    trade_register_number: update.trade_register_number,
    legal_form: update.legal_form,
    address: update.address,
    city: update.city,
    county: update.county,
    country_code: update.country_code,
    postal_code: update.postal_code,
    email: update.email,
    phone: update.phone,
    website: update.website,
  };
};
