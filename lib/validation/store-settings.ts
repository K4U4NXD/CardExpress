export const STORE_NAME_MAX_LENGTH = 120;
export const STORE_PUBLIC_MESSAGE_MAX_LENGTH = 280;
export const STORE_LOGO_URL_MAX_LENGTH = 500;

export type StoreSettingsFieldErrors = Partial<
  Record<
    | "name"
    | "phone"
    | "logo_url"
    | "public_message"
    | "accepts_orders"
    | "auto_accept_orders_by_schedule"
    | "opening_time"
    | "closing_time",
    string
  >
>;

type StoreSettingsValidationInput = {
  name: string;
  phone: string;
  logoUrl: string;
  publicMessage: string;
  acceptsOrders: boolean;
  autoAcceptOrdersBySchedule: boolean;
  openingTime: string;
  closingTime: string;
};

export type StoreSettingsValidatedInput = {
  name: string;
  phone: string;
  phoneDigits: string;
  logoUrl: string | null;
  publicMessage: string | null;
  acceptsOrders: boolean;
  autoAcceptOrdersBySchedule: boolean;
  openingTime: string | null;
  closingTime: string | null;
};

function normalizeTimeInput(rawValue: string): string | null {
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return null;
  }

  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/);
  if (!match) {
    return null;
  }

  return `${match[1]}:${match[2]}`;
}

export function validateStoreSettingsInput(input: StoreSettingsValidationInput): {
  values: StoreSettingsValidatedInput;
  fieldErrors: StoreSettingsFieldErrors;
  hasErrors: boolean;
} {
  const name = input.name.trim();
  const phone = input.phone.trim();
  const phoneDigits = phone.replace(/\D/g, "");
  const logoUrlRaw = input.logoUrl.trim();
  const logoUrl = logoUrlRaw || null;
  const publicMessageRaw = input.publicMessage.trim();
  const publicMessage = publicMessageRaw || null;
  const autoAcceptOrdersBySchedule = input.autoAcceptOrdersBySchedule;
  const openingTimeRaw = input.openingTime.trim();
  const closingTimeRaw = input.closingTime.trim();
  const openingTime = normalizeTimeInput(openingTimeRaw);
  const closingTime = normalizeTimeInput(closingTimeRaw);

  const fieldErrors: StoreSettingsFieldErrors = {};

  if (!name) {
    fieldErrors.name = "Informe o nome da loja.";
  } else if (name.length > STORE_NAME_MAX_LENGTH) {
    fieldErrors.name = `O nome da loja deve ter no máximo ${STORE_NAME_MAX_LENGTH} caracteres.`;
  }

  if (!phone) {
    fieldErrors.phone = "Informe o telefone da loja.";
  } else if (!(phoneDigits.length === 10 || phoneDigits.length === 11)) {
    fieldErrors.phone = "Informe um telefone brasileiro com 10 ou 11 dígitos.";
  }

  if (publicMessageRaw.length > STORE_PUBLIC_MESSAGE_MAX_LENGTH) {
    fieldErrors.public_message = `A mensagem pública deve ter no máximo ${STORE_PUBLIC_MESSAGE_MAX_LENGTH} caracteres.`;
  }

  if (logoUrlRaw.length > STORE_LOGO_URL_MAX_LENGTH) {
    fieldErrors.logo_url = `A URL da logo deve ter no máximo ${STORE_LOGO_URL_MAX_LENGTH} caracteres.`;
  } else if (logoUrlRaw) {
    try {
      const parsed = new URL(logoUrlRaw);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        fieldErrors.logo_url = "Use uma URL de logo iniciando com http:// ou https://.";
      }
    } catch {
      fieldErrors.logo_url = "Informe uma URL válida para a logo.";
    }
  }

  if (openingTimeRaw && !openingTime) {
    fieldErrors.opening_time = "Informe um horário de abertura válido (HH:mm).";
  }

  if (closingTimeRaw && !closingTime) {
    fieldErrors.closing_time = "Informe um horário de fechamento válido (HH:mm).";
  }

  if (autoAcceptOrdersBySchedule) {
    if (!openingTime) {
      fieldErrors.opening_time = "Informe o horário de abertura para ativar o horário automático.";
    }

    if (!closingTime) {
      fieldErrors.closing_time = "Informe o horário de fechamento para ativar o horário automático.";
    }

    if (openingTime && closingTime && openingTime === closingTime) {
      fieldErrors.closing_time = "Abertura e fechamento não podem ser iguais.";
    }
  }

  return {
    values: {
      name,
      phone,
      phoneDigits,
      logoUrl,
      publicMessage,
      acceptsOrders: input.acceptsOrders,
      autoAcceptOrdersBySchedule,
      openingTime,
      closingTime,
    },
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0,
  };
}
