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

export type PasswordRecoveryValidationResult = {
  values: {
    email: string;
  };
  fieldErrors: {
    email?: string;
  };
  hasErrors: boolean;
};

export type ResetPasswordValidationResult = {
  fieldErrors: {
    password?: string;
    password_confirmation?: string;
  };
  hasErrors: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

function hasMinimumPhoneDigits(phone: string): boolean {
  const digitsOnly = phone.replace(/\D/g, "");
  return digitsOnly.length >= 8;
}

/**
 * Centraliza os critérios de senha usados no cadastro e na redefinição.
 * Mantém UI e Server Actions alinhadas na mesma regra de negócio.
 */
export function evaluatePasswordCriteria(password: string): PasswordCriteriaStatus {
  return {
    hasMinLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  };
}

/**
 * Normaliza e valida os dados mínimos para abrir uma conta de comerciante.
 * Retorna valores já prontos para persistência segura no fluxo de signup.
 */
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
 * Valida apenas formato de e-mail; a action de recovery responde de forma neutra
 * para não permitir enumeração de contas existentes.
 */
export function validatePasswordRecoveryInput(email: string): PasswordRecoveryValidationResult {
  const values = {
    email: normalizeEmail(email),
  };
  const fieldErrors: PasswordRecoveryValidationResult["fieldErrors"] = {};

  if (!values.email) {
    fieldErrors.email = "Informe seu e-mail.";
  } else if (!EMAIL_REGEX.test(values.email)) {
    fieldErrors.email = "Digite um e-mail válido.";
  }

  return {
    values,
    fieldErrors,
    hasErrors: Object.keys(fieldErrors).length > 0,
  };
}

/**
 * Aplica a mesma política de senha forte na redefinição e confirma a repetição.
 */
export function validateResetPasswordInput(
  password: string,
  passwordConfirmation: string
): ResetPasswordValidationResult {
  const fieldErrors: ResetPasswordValidationResult["fieldErrors"] = {};
  const passwordCriteria = evaluatePasswordCriteria(password);

  if (!password) {
    fieldErrors.password = "Informe uma nova senha.";
  } else if (!passwordCriteria.hasMinLength) {
    fieldErrors.password = "A senha deve ter no mínimo 8 caracteres.";
  } else if (!passwordCriteria.hasUppercase) {
    fieldErrors.password = "A senha deve incluir pelo menos 1 letra maiúscula.";
  } else if (!passwordCriteria.hasNumber) {
    fieldErrors.password = "A senha deve incluir pelo menos 1 número.";
  } else if (!passwordCriteria.hasSpecial) {
    fieldErrors.password = "A senha deve incluir pelo menos 1 caractere especial.";
  }

  if (!passwordConfirmation) {
    fieldErrors.password_confirmation = "Confirme sua nova senha.";
  } else if (passwordConfirmation !== password) {
    fieldErrors.password_confirmation = "A confirmação de senha não confere.";
  }

  return {
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
