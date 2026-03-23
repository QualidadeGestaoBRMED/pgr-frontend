const onlyDigits = (value: string) => String(value || "").replace(/\D/g, "");

export const normalizeEmail = (value: string) => String(value || "").trim().toLowerCase();

export const maskCnpj = (value: string) => {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
};

export const maskCpf = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
};

export const maskCpfOrCnpj = (value: string) => {
  const digits = onlyDigits(value);
  return digits.length <= 11 ? maskCpf(digits) : maskCnpj(digits);
};

export const maskCep = (value: string) => {
  const digits = onlyDigits(value).slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

export const maskPhoneBr = (value: string) => {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const normalizeRiskGrade = (value: string) => {
  const digits = onlyDigits(value);
  if (!digits) return "";
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed)) return "";
  if (parsed < 1) return "1";
  if (parsed > 4) return "4";
  return String(parsed);
};

export const isValidEmail = (value: string) => {
  const normalized = normalizeEmail(value);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(normalized);
};

const allDigitsEqual = (digits: string) => /^(\d)\1+$/.test(digits);

export const isValidCpf = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 11 || allDigitsEqual(digits)) return false;

  const calcDigit = (base: string, factor: number) => {
    let total = 0;
    for (const digit of base) {
      total += Number.parseInt(digit, 10) * factor--;
    }
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calcDigit(digits.slice(0, 9), 10);
  const d2 = calcDigit(digits.slice(0, 10), 11);
  return digits.endsWith(`${d1}${d2}`);
};

export const isValidCnpj = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 14 || allDigitsEqual(digits)) return false;

  const calcDigit = (base: string, weights: number[]) => {
    const total = base
      .split("")
      .reduce((sum, digit, index) => sum + Number.parseInt(digit, 10) * weights[index], 0);
    const remainder = total % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calcDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calcDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digits.endsWith(`${d1}${d2}`);
};

export const isValidCpfOrCnpj = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length <= 11) return isValidCpf(digits);
  return isValidCnpj(digits);
};

export const isValidPhoneBr = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length === 10) {
    return /^[1-9]{2}[2-5]\d{7}$/.test(digits);
  }
  if (digits.length === 11) {
    return /^[1-9]{2}9\d{8}$/.test(digits);
  }
  return false;
};

export const isValidRiskGrade = (value: string) => {
  const digits = onlyDigits(value);
  if (!digits) return false;
  const parsed = Number.parseInt(digits, 10);
  return Number.isFinite(parsed) && parsed >= 1 && parsed <= 4;
};

export const toDigits = onlyDigits;
