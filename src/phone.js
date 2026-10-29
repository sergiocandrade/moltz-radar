import { parsePhoneNumberFromString } from 'libphonenumber-js/max';

export const brazilianPhoneMaskOptions = {
  mask: [{ mask: '(00) 0000-0000' }, { mask: '(00) 00000-0000' }],
};

export function isValidBrazilianPhone(value) {
  const phone = parsePhoneNumberFromString(value, 'BR');
  return phone?.country === 'BR' && phone.isValid();
}