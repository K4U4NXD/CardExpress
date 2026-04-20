export const STORE_NAME_MAX_LENGTH = 120;
export const STORE_PUBLIC_MESSAGE_MAX_LENGTH = 280;
export const STORE_LOGO_URL_MAX_LENGTH = 500;

export type StoreSettingsFieldErrors = Partial<
  Record<"name" | "phone" | "logo_url" | "public_message" | "accepts_orders", string>
>;

type StoreSettingsValidationInput = {
  name: string;
  phone: string;
  logoUrl: string;
  publicMessage: string;
  acceptsOrders: boolean;
};

export type StoreSettingsValidatedInput = {
  name: string;
  phone: string;
  phoneDigits: string;
  logoUrl: string | null;
  publicMessage: string | null;
  acceptsOrders: boolean;
};

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

  return {
    values: {
      name,
      phone,
      phoneDigits,
      logoUrl,
      publicMessage,
      acceptsOrders: input.acceptsOrders,
    },
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0,
  };
}