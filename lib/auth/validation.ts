/** Normaliza o slug para comparação e persistência (minúsculas, sem bordas). */
export function normalizeStoreSlug(input: string): string {
  return input.trim().toLowerCase();
}

export type SignupValidationInput = {
  full_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  store_name: string;
  store_slug: string;
  phone: string;
};

export type SignupValidationValues = {
  full_name: string;
  email: string;
  store_name: string;
  store_slug: string;
  phone: string;
};

export type SignupValidationFieldErrors = {
  full_name?: string;
  email?: string;
  password?: string;
  password_confirmation?: string;
  store_name?: string;
  store_slug?: string;
  phone?: string;
};

export type SignupValidationResult = {
  values: SignupValidationValues;
  fieldErrors: SignupValidationFieldErrors;
  hasErrors: boolean;
};

export type PasswordCriteriaStatus = {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function hasMinimumPhoneDigits(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 8;
}

export function evaluatePasswordCriteria(password: string): PasswordCriteriaStatus {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

export function validateSignupInput(input: SignupValidationInput): SignupValidationResult {
  const values: SignupValidationValues = {
    full_name: input.full_name.trim(),
    email: normalizeEmail(input.email),
    store_name: input.store_name.trim(),
    store_slug: normalizeStoreSlug(input.store_slug),
    phone: input.phone.trim(),
  };

  const fieldErrors: SignupValidationFieldErrors = {};

  if (!values.full_name) {
    fieldErrors.full_name = "Informe seu nome completo.";
  } else if (values.full_name.length < 3) {
    fieldErrors.full_name = "Informe seu nome completo com pelo menos 3 caracteres.";
  }

  if (!values.email) {
    fieldErrors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(values.email)) {
    fieldErrors.email = "Digite um e-mail válido.";
  }

  const passwordCriteria = evaluatePasswordCriteria(input.password);

  if (!input.password) {
    fieldErrors.password = "Informe uma senha.";
  } else if (!passwordCriteria.hasMinLength) {
    fieldErrors.password = "A senha deve ter no mínimo 8 caracteres.";
  } else if (!passwordCriteria.hasUppercase) {
    fieldErrors.password = "A senha deve incluir pelo menos 1 letra maiúscula.";
  } else if (!passwordCriteria.hasNumber) {
    fieldErrors.password = "A senha deve incluir pelo menos 1 número.";
  } else if (!passwordCriteria.hasSpecial) {
    fieldErrors.password = "A senha deve incluir pelo menos 1 caractere especial.";
  }

  if (!input.password_confirmation) {
    fieldErrors.password_confirmation = "Confirme sua senha.";
  } else if (input.password_confirmation !== input.password) {
    fieldErrors.password_confirmation = "A confirmação de senha não confere.";
  }

  if (!values.store_name) {
    fieldErrors.store_name = "Informe o nome da loja.";
  }

  if (!values.store_slug) {
    fieldErrors.store_slug = "Informe o slug da loja.";
  } else {
    const slugError = validateStoreSlug(values.store_slug);
    if (slugError) {
      fieldErrors.store_slug = slugError;
    }
  }

  if (!values.phone) {
    fieldErrors.phone = "Informe um telefone da loja.";
  } else if (!hasMinimumPhoneDigits(values.phone)) {
    fieldErrors.phone = "Informe um telefone da loja válido.";
  }

  return {
    values,
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0,
  };
}

/**
 * Slug público da loja: minúsculas, sem espaços, segmentos separados por hífen.
 * Ex.: minha-loja, cafe-123
 */
export function validateStoreSlug(slug: string): string | null {
  if (!slug) return "O slug da loja é obrigatório.";
  if (slug.length < 2) return "O slug deve ter pelo menos 2 caracteres.";
  if (slug.length > 64) return "O slug deve ter no máximo 64 caracteres.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return "Use apenas letras minúsculas, números e hífens, sem espaços.";
  }
  return null;
}
