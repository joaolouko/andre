export function digitsOnly(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function formatCpf(digits: string): string {
  const value = digits.slice(0, 11);
  let result = value.slice(0, 3);
  if (value.length > 3) result += `.${value.slice(3, 6)}`;
  if (value.length > 6) result += `.${value.slice(6, 9)}`;
  if (value.length > 9) result += `-${value.slice(9, 11)}`;
  return result;
}

export function formatCnpj(value: string | null | undefined): string {
  const digits = digitsOnly(value).slice(0, 14);
  let result = digits.slice(0, 2);
  if (digits.length > 2) result += `.${digits.slice(2, 5)}`;
  if (digits.length > 5) result += `.${digits.slice(5, 8)}`;
  if (digits.length > 8) result += `/${digits.slice(8, 12)}`;
  if (digits.length > 12) result += `-${digits.slice(12, 14)}`;
  return result;
}

export function formatCpfCnpj(value: string | null | undefined): string {
  const digits = digitsOnly(value).slice(0, 14);
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

export function formatPhone(value: string | null | undefined): string {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length === 1) return `(${digits}`;
  if (digits.length === 2) return `(${digits})`;

  const areaCode = digits.slice(0, 2);
  const subscriber = digits.slice(2);
  if (digits.length <= 6) return `(${areaCode}) ${subscriber}`;

  const subscriberPrefixLength = digits.length > 10 ? 5 : 4;
  const prefix = subscriber.slice(0, subscriberPrefixLength);
  const suffix = subscriber.slice(subscriberPrefixLength);
  return `(${areaCode}) ${prefix}${suffix ? `-${suffix}` : ""}`;
}
