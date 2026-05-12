import { expect, type Locator, type Page } from "@playwright/test";

export type MerchantCredentials = {
  email: string;
  password: string;
};

export type ProductSeed = {
  name: string;
  price: string;
  stock: number;
  additionalCategoryNames?: string[];
};

export type CheckoutInput = {
  customerName: string;
  customerPhone: string;
  note?: string;
  expectedProductName?: string;
  expectSessionCreated?: boolean;
};

export type StoreOperationalMode = "offline" | "manual" | "schedule";

export type StoreOperationalModeOptions = {
  openingTime?: string;
  closingTime?: string;
};

const SETTINGS_SAVE_TIMEOUT_MS = 30_000;

type DashboardCreateResultOptions = {
  formTestId: string;
  submitButtonTestId: string;
  itemName: string;
  listingPath: string;
  timeoutMs: number;
  timeoutMessage: string;
  itemLocator?: (page: Page, itemName: string) => Locator;
};

type CheckoutCreationResult =
  | { type: "success" }
  | { type: "error"; message: string | null }
  | { type: "timeout" };

/**
 * Helpers compartilhados pelos smoke tests.
 * Eles encapsulam navegação e diagnósticos para reduzir duplicação sem esconder falhas reais do fluxo.
 */
async function collectVisibleTexts(page: Page, selector: string, limit = 8) {
  return await page
    .locator(selector)
    .evaluateAll(
      (elements, maxItems) =>
        elements
          .filter((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          })
          .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
          .filter(Boolean)
          .slice(0, maxItems),
      limit,
    )
    .catch(() => []);
}

async function collectVisibleLocatorTexts(locator: Locator, limit = 8) {
  return await locator
    .evaluateAll(
      (elements, maxItems) =>
        elements
          .filter((element) => {
            const style = window.getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          })
          .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
          .filter(Boolean)
          .slice(0, maxItems),
      limit,
    )
    .catch(() => []);
}

async function waitForDashboardCreateResult(page: Page, options: DashboardCreateResultOptions) {
  const form = page.getByTestId(options.formTestId);
  const submitButton = page.getByTestId(options.submitButtonTestId);
  const itemLocator = options.itemLocator ?? ((currentPage, itemName) => currentPage.getByText(itemName, { exact: true }));
  const visibleItem = () => itemLocator(page, options.itemName).first();
  let itemWasFound = false;
  let lastSubmitButtonText: string | null = null;
  let formErrorMessage: string | null = null;

  const isItemVisible = async () => {
    const visible = await visibleItem().isVisible().catch(() => false);
    itemWasFound ||= visible;
    return visible;
  };

  try {
    await expect
      .poll(
        async () => {
          const formAlertText = (await collectVisibleLocatorTexts(form.locator('[role="alert"]'), 4))[0];

          if (formAlertText) {
            formErrorMessage = formAlertText;
            throw new Error(formAlertText);
          }

          if (await isItemVisible()) {
            return true;
          }

          lastSubmitButtonText =
            (await submitButton.textContent({ timeout: 500 }).catch(() => null))?.replace(/\s+/g, " ").trim() ?? null;

          if (!lastSubmitButtonText || !/salvando/i.test(lastSubmitButtonText)) {
            await page.goto(options.listingPath, { waitUntil: "domcontentloaded", timeout: 10_000 }).catch(() => null);

            const reloadedFormAlertText = (await collectVisibleLocatorTexts(form.locator('[role="alert"]'), 4))[0];
            if (reloadedFormAlertText) {
              formErrorMessage = reloadedFormAlertText;
              throw new Error(reloadedFormAlertText);
            }

            if (await isItemVisible()) {
              return true;
            }
          }

          return false;
        },
        {
          timeout: options.timeoutMs,
          intervals: [500, 1000, 1500, 2500],
          message: options.timeoutMessage,
        },
      )
      .toBe(true);
  } catch (error) {
    const latestItemFound = itemWasFound || (await isItemVisible());

    if (latestItemFound) {
      return;
    }

    if (formErrorMessage) {
      throw new Error(formErrorMessage);
    }

    const feedbackTexts = await collectVisibleTexts(page, '[role="alert"], [role="status"]', 8);
    const currentSubmitButtonText =
      (await submitButton.textContent({ timeout: 500 }).catch(() => null))?.replace(/\s+/g, " ").trim() ??
      lastSubmitButtonText;
    const errorMessage = error instanceof Error ? error.message : String(error);

    throw new Error(
      [
        options.timeoutMessage,
        `URL atual: ${page.url()}`,
        `Feedback visivel: ${feedbackTexts.length > 0 ? JSON.stringify(feedbackTexts) : "nenhum"}`,
        `Texto do botao submit: ${currentSubmitButtonText ?? "nao encontrado"}`,
        `Item '${options.itemName}' encontrado: ${latestItemFound ? "sim" : "nao"}`,
        `Erro original: ${errorMessage}`,
      ].join("\n"),
    );
  }
}

async function collectCheckoutDiagnostics(page: Page) {
  const createSessionButton = page.getByTestId("checkout-create-session");
  const buttonText = await createSessionButton.textContent().catch(() => null);
  const buttonEnabled = await createSessionButton.isEnabled().catch(() => null);
  const headingTexts = await collectVisibleTexts(page, "h1, h2, h3", 8);
  const formFeedbackTexts = await collectVisibleTexts(page, 'form [role="alert"]', 4);
  const feedbackTexts = await collectVisibleTexts(page, '[role="alert"], [role="status"]', 8);
  const cartItemTexts = await collectVisibleTexts(page, '[data-testid^="checkout-cart-item-"]', 6);
  const customerName = await page.getByTestId("checkout-customer-name").inputValue().catch(() => null);
  const customerPhone = await page.getByTestId("checkout-customer-phone").inputValue().catch(() => null);

  return [
    `URL atual: ${page.url()}`,
    `Botao criar checkout: ${buttonText?.replace(/\s+/g, " ").trim() ?? "nao encontrado"}; habilitado=${String(
      buttonEnabled,
    )}`,
    `Nome preenchido: ${customerName ?? "nao encontrado"}`,
    `Telefone preenchido: ${customerPhone ?? "nao encontrado"}`,
    `Headings visiveis: ${headingTexts.length > 0 ? JSON.stringify(headingTexts) : "nenhum"}`,
    `Feedback do formulario: ${formFeedbackTexts.length > 0 ? JSON.stringify(formFeedbackTexts) : "nenhum"}`,
    `Feedback global visivel: ${feedbackTexts.length > 0 ? JSON.stringify(feedbackTexts) : "nenhum"}`,
    `Itens do checkout: ${cartItemTexts.length > 0 ? JSON.stringify(cartItemTexts) : "nenhum"}`,
  ].join("\n");
}

async function waitForCheckoutCreationResult(page: Page, timeoutMs: number): Promise<CheckoutCreationResult> {
  const successHeading = page.getByRole("heading", { name: /checkout criada/i });
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await successHeading.isVisible().catch(() => false)) {
      return { type: "success" };
    }

    const alertTexts = await collectVisibleTexts(page, 'form [role="alert"]', 4);
    const errorText = alertTexts.find(Boolean);
    if (errorText) {
      return { type: "error", message: errorText };
    }

    await page.waitForTimeout(250);
  }

  return { type: "timeout" };
}

async function collectSettingsSaveDiagnostics(page: Page) {
  const saveButton = page.getByTestId("settings-save-button");
  const buttonText = await saveButton.textContent().catch(() => null);
  const buttonEnabled = await saveButton.isEnabled().catch(() => null);
  const feedbackTexts = await page
    .locator('[role="alert"], [role="status"]')
    .evaluateAll((elements) =>
      elements
        .map((element) => element.textContent?.replace(/\s+/g, " ").trim() ?? "")
        .filter(Boolean)
        .slice(0, 5),
    )
    .catch(() => []);

  return {
    buttonText: buttonText?.replace(/\s+/g, " ").trim() ?? null,
    buttonEnabled,
    feedbackTexts,
    url: page.url(),
  };
}

async function expectStoreOperationalModeReflected(
  page: Page,
  mode: StoreOperationalMode,
  options: StoreOperationalModeOptions = {},
) {
  const modeRadio = page.getByTestId(`settings-operational-mode-${mode}`);
  const saveButton = page.getByTestId("settings-save-button");
  const openingTimeInput = page.getByTestId("settings-opening-time");
  const closingTimeInput = page.getByTestId("settings-closing-time");
  const requestedOpeningTime = options.openingTime?.trim();
  const requestedClosingTime = options.closingTime?.trim();

  await expect(modeRadio).toBeChecked({ timeout: SETTINGS_SAVE_TIMEOUT_MS });

  if (mode === "schedule") {
    if (requestedOpeningTime) {
      await expect(openingTimeInput).toHaveValue(requestedOpeningTime, { timeout: SETTINGS_SAVE_TIMEOUT_MS });
    }

    if (requestedClosingTime) {
      await expect(closingTimeInput).toHaveValue(requestedClosingTime, { timeout: SETTINGS_SAVE_TIMEOUT_MS });
    }
  }

  await expect(saveButton).not.toHaveText(/Salvando/i, { timeout: SETTINGS_SAVE_TIMEOUT_MS });
  await expect(saveButton).toHaveText(/Salvar configura/i, { timeout: SETTINGS_SAVE_TIMEOUT_MS });
  await expect(saveButton).toBeDisabled({ timeout: SETTINGS_SAVE_TIMEOUT_MS });
}

export async function loginAsMerchant(page: Page, credentials: MerchantCredentials) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
  await page.locator("#email").fill(credentials.email);
  await page.locator("#password").fill(credentials.password);

  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?.*)?$/, { timeout: 20_000 }),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);
}

export async function readStoreSlugFromSettings(page: Page) {
  await page.goto("/dashboard/configuracoes", { waitUntil: "domcontentloaded" });
  const slugInput = page.locator("#settings-store-slug");
  await expect(slugInput).toBeVisible();

  const slug = (await slugInput.inputValue()).trim();
  if (!slug) {
    throw new Error("Nao foi possivel ler o slug da loja em /dashboard/configuracoes.");
  }

  return slug;
}

/**
 * Ajusta modo operacional pela UI, simulando exatamente o caminho usado pelo comerciante.
 */
export async function setStoreOperationalMode(
  page: Page,
  mode: StoreOperationalMode,
  options: StoreOperationalModeOptions = {}
) {
  await page.goto("/dashboard/configuracoes", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/dashboard\/configuracoes(?:\?.*)?$/);

  const modeRadio = page.getByTestId(`settings-operational-mode-${mode}`);
  const saveButton = page.getByTestId("settings-save-button");
  const openingTimeInput = page.getByTestId("settings-opening-time");
  const closingTimeInput = page.getByTestId("settings-closing-time");

  await expect(modeRadio).toBeVisible();
  await expect(saveButton).toBeVisible();
  await expect(saveButton).not.toHaveText(/Salvando/i, { timeout: SETTINGS_SAVE_TIMEOUT_MS });
  await expect(saveButton).toHaveText(/Salvar configura/i, { timeout: SETTINGS_SAVE_TIMEOUT_MS });

  const wasChecked = await modeRadio.isChecked();
  const openingTimeBefore = await openingTimeInput.inputValue();
  const closingTimeBefore = await closingTimeInput.inputValue();
  const requestedOpeningTime = options.openingTime?.trim();
  const requestedClosingTime = options.closingTime?.trim();

  if (!wasChecked) {
    await expect(modeRadio).toBeEnabled();
    await modeRadio.check();
  }

  if (mode === "schedule") {
    await expect(openingTimeInput).toBeEnabled({ timeout: 8_000 });
    await expect(closingTimeInput).toBeEnabled({ timeout: 8_000 });

    if (requestedOpeningTime) {
      await openingTimeInput.fill(requestedOpeningTime);
    }

    if (requestedClosingTime) {
      await closingTimeInput.fill(requestedClosingTime);
    }
  }

  const scheduleTimesAlreadyMatch =
    mode !== "schedule" ||
    ((!requestedOpeningTime || openingTimeBefore === requestedOpeningTime) &&
      (!requestedClosingTime || closingTimeBefore === requestedClosingTime));

  if (wasChecked && scheduleTimesAlreadyMatch) {
    await expect(saveButton).toBeDisabled();
    await expect(modeRadio).toBeChecked();
    return;
  }

  await expect.poll(async () => await modeRadio.isChecked(), {
    timeout: 8_000,
    message: `O modo operacional '${mode}' nao ficou selecionado antes de salvar.`,
  }).toBe(true);

  const selectedOpeningTime = await openingTimeInput.inputValue();
  const selectedClosingTime = await closingTimeInput.inputValue();
  const requestedStateAlreadyReflected =
    mode === "schedule"
      ? (!requestedOpeningTime || selectedOpeningTime === requestedOpeningTime) &&
        (!requestedClosingTime || selectedClosingTime === requestedClosingTime)
      : true;

  if (requestedStateAlreadyReflected && !(await saveButton.isEnabled())) {
    await expect(modeRadio).toBeChecked();
    return;
  }

  await expect.poll(async () => await saveButton.isEnabled(), {
    timeout: 8_000,
    message: "O botao Salvar configuracoes nao habilitou apos mudar o modo operacional.",
  }).toBe(true);

  await saveButton.click();

  try {
    await expectStoreOperationalModeReflected(page, mode, options);
  } catch (firstError) {
    const diagnostics = await collectSettingsSaveDiagnostics(page);

    if (diagnostics.buttonText?.match(/Salvando/i)) {
      throw new Error(
        [
          `O modo operacional '${mode}' continuou salvando alem do tempo esperado.`,
          `Diagnostico: ${JSON.stringify(diagnostics)}`,
          `Erro original: ${firstError instanceof Error ? firstError.message : String(firstError)}`,
        ].join("\n"),
      );
    }

    await page.goto("/dashboard/configuracoes", { waitUntil: "domcontentloaded" });

    try {
      await expectStoreOperationalModeReflected(page, mode, options);
    } catch (reloadError) {
      throw new Error(
        [
          `O modo operacional '${mode}' nao estabilizou apos salvar.`,
          `Diagnostico antes do reload: ${JSON.stringify(diagnostics)}`,
          `Erro antes do reload: ${firstError instanceof Error ? firstError.message : String(firstError)}`,
          `Erro apos reload: ${reloadError instanceof Error ? reloadError.message : String(reloadError)}`,
        ].join("\n"),
      );
    }
  }
}

export async function setStoreAcceptsOrders(page: Page, acceptsOrders: boolean) {
  await setStoreOperationalMode(page, acceptsOrders ? "manual" : "offline");
}

export async function createCategoryIfMissing(page: Page, categoryName: string) {
  await page.goto("/dashboard/categorias", { waitUntil: "domcontentloaded" });

  if ((await page.getByText(categoryName, { exact: true }).count()) > 0) {
    return;
  }

  const createCategoryForm = page.getByTestId("create-category-form");
  const openCreateCategoryButton = page.getByTestId("open-create-category");
  await expect(openCreateCategoryButton).toBeVisible();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await createCategoryForm.isVisible()) {
      break;
    }

    await openCreateCategoryButton.click();

    try {
      await expect(createCategoryForm).toBeVisible({ timeout: 4_000 });
      break;
    } catch {
      // O dashboard pode refrescar em tempo real logo apos a navegacao. Tentamos abrir novamente.
    }

    await expect(page).toHaveURL(/\/dashboard\/categorias(?:\?.*)?$/);
  }

  await expect(createCategoryForm).toBeVisible();

  await page.locator("#new-category-name").fill(categoryName);
  await expect(page.locator("#new-category-name")).toHaveValue(categoryName);
  await page.getByTestId("submit-create-category").click();
  await waitForDashboardCreateResult(page, {
    formTestId: "create-category-form",
    submitButtonTestId: "submit-create-category",
    itemName: categoryName,
    listingPath: "/dashboard/categorias",
    timeoutMs: 30_000,
    timeoutMessage: `Categoria '${categoryName}' nao apareceu na listagem apos criacao.`,
    itemLocator: dashboardCategoryRowByName,
  });
}

export async function createProductIfMissing(page: Page, categoryName: string, product: ProductSeed) {
  await page.goto("/dashboard/produtos", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Produtos", exact: true })).toBeVisible();

  if ((await page.getByText(product.name, { exact: true }).count()) > 0) {
    return;
  }

  const createProductForm = page.getByTestId("create-product-form");
  const openCreateProductButton = page.getByTestId("open-create-product");
  await expect(openCreateProductButton).toBeVisible();

  for (let attempt = 0; attempt < 4; attempt += 1) {
    if (await createProductForm.isVisible()) {
      break;
    }

    await openCreateProductButton.click();

    try {
      await expect(createProductForm).toBeVisible({ timeout: 4_000 });
      break;
    } catch {
      // O dashboard pode refrescar em tempo real logo apos a navegacao. Tentamos abrir novamente.
    }

    await expect(page).toHaveURL(/\/dashboard\/produtos(?:\?.*)?$/);
  }

  await expect(createProductForm).toBeVisible();
  await expect(page.getByRole("heading", { name: "Novo produto", exact: true })).toBeVisible();

  await page.getByTestId("product-name-input").fill(product.name);
  await page.getByTestId("product-price-input").fill(product.price);

  const categorySelect = page.getByTestId("product-category-select");
  await expect(categorySelect).toBeVisible();
  await expect(categorySelect).toBeEnabled();

  const normalizedCategoryName = categoryName.trim().toLocaleLowerCase("pt-BR");

  await expect.poll(
    async () => {
      return await categorySelect.evaluate((select, expectedName) => {
        if (!(select instanceof HTMLSelectElement)) {
          return null;
        }

        const options = Array.from(select.options);
        const match = options.find((option) => option.textContent?.trim().toLocaleLowerCase("pt-BR") === expectedName);
        return match?.value ?? null;
      }, normalizedCategoryName);
    },
    {
      timeout: 12_000,
      message: `Opcao de categoria '${categoryName.trim()}' nao apareceu no select de produto.`,
    },
  ).not.toBeNull();

  const matchedCategoryOptionValue = await categorySelect.evaluate((select, expectedName) => {
    if (!(select instanceof HTMLSelectElement)) {
      return null;
    }

    const options = Array.from(select.options);
    const match = options.find((option) => option.textContent?.trim().toLocaleLowerCase("pt-BR") === expectedName);
    return match?.value ?? null;
  }, normalizedCategoryName);

  if (!matchedCategoryOptionValue) {
    throw new Error(`Nao foi possivel resolver o valor da categoria '${categoryName.trim()}' no select.`);
  }

  await categorySelect.selectOption(matchedCategoryOptionValue);
  await expect(categorySelect).toHaveValue(matchedCategoryOptionValue);

  for (const additionalCategoryName of product.additionalCategoryNames ?? []) {
    const normalizedAdditionalCategoryName = additionalCategoryName.trim().toLocaleLowerCase("pt-BR");
    const additionalCategoryOptionValue = await categorySelect.evaluate((select, expectedName) => {
      if (!(select instanceof HTMLSelectElement)) {
        return null;
      }

      const options = Array.from(select.options);
      const match = options.find((option) => option.textContent?.trim().toLocaleLowerCase("pt-BR") === expectedName);
      return match?.value ?? null;
    }, normalizedAdditionalCategoryName);

    if (!additionalCategoryOptionValue) {
      throw new Error(`Nao foi possivel resolver a categoria adicional '${additionalCategoryName.trim()}' no produto.`);
    }

    await page.getByTestId(`product-additional-category-${additionalCategoryOptionValue}`).check();
  }

  const trackStock = page.getByTestId("product-track-stock-toggle");
  if (!(await trackStock.isChecked())) {
    await trackStock.click();
  }

  await page.getByTestId("product-stock-input").fill(String(product.stock));
  await page.getByTestId("submit-create-product").click();
  await waitForDashboardCreateResult(page, {
    formTestId: "create-product-form",
    submitButtonTestId: "submit-create-product",
    itemName: product.name,
    listingPath: "/dashboard/produtos",
    timeoutMs: 60_000,
    timeoutMessage: `Produto '${product.name}' nao apareceu na listagem apos criacao.`,
    itemLocator: dashboardProductRowByName,
  });

  await expect(page.getByText(product.name, { exact: true })).toBeVisible({ timeout: 15_000 });
}

export async function addMenuProductQuantity(page: Page, productName: string, quantity: number) {
  if (quantity <= 0) {
    return;
  }

  const card = productCardByName(page, productName);
  await expect(card).toBeVisible({ timeout: 15_000 });

  const addButton = card.locator('[data-testid^="menu-add-"]');
  const increaseButton = card.locator('[data-testid^="menu-increase-"]');

  if (await addButton.isVisible()) {
    await expect(addButton).toBeEnabled({ timeout: 10_000 });
    await addButton.click();
  } else {
    await expect(increaseButton).toBeEnabled({ timeout: 10_000 });
    await increaseButton.click();
  }

  for (let index = 1; index < quantity; index += 1) {
    await expect(increaseButton).toBeEnabled({ timeout: 10_000 });
    await increaseButton.click();
  }
}

export async function goToPublicCheckout(page: Page, slug: string) {
  await page.getByTestId("menu-go-checkout").click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/checkout(?:\\?.*)?$`));
}

/**
 * Cria uma sessão de checkout pública e falha com diagnósticos visíveis quando o estado não estabiliza.
 */
export async function createCheckoutSession(page: Page, input: CheckoutInput) {
  await expect(page).toHaveURL(/\/checkout(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: /^checkout\b/i })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByRole("heading", { name: "Resumo do pedido" })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator('[data-testid^="checkout-cart-item-"]').first()).toBeVisible({ timeout: 10_000 });

  if (input.expectedProductName) {
    await expect(page.getByText(input.expectedProductName, { exact: true })).toBeVisible({ timeout: 10_000 });
  }

  const customerNameInput = page.getByTestId("checkout-customer-name");
  const customerPhoneInput = page.getByTestId("checkout-customer-phone");

  await customerNameInput.fill(input.customerName);
  await expect(customerNameInput).toHaveValue(input.customerName);
  await customerPhoneInput.fill(input.customerPhone);
  await expect(customerPhoneInput).toHaveValue(input.customerPhone);

  if (input.note) {
    const notesInput = page.getByTestId("checkout-notes");
    await notesInput.fill(input.note);
    await expect(notesInput).toHaveValue(input.note);
  }

  const createSessionButton = page.getByTestId("checkout-create-session");

  if (input.expectSessionCreated === false) {
    await expect(createSessionButton).toBeDisabled({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /checkout criada/i })).toHaveCount(0);
    return;
  }

  let statementTimeoutRetryUsed = false;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await expect(createSessionButton).toBeVisible({ timeout: 10_000 });
    await expect(createSessionButton).toBeEnabled({ timeout: 10_000 });
    await createSessionButton.click();

    const result = await waitForCheckoutCreationResult(page, 20_000);
    if (result.type === "success") {
      return;
    }

    const diagnostics = await collectCheckoutDiagnostics(page);
    const message = result.type === "error" ? result.message : null;
    const isStatementTimeout = /statement timeout/i.test(message ?? "");

    if (isStatementTimeout && !statementTimeoutRetryUsed) {
      statementTimeoutRetryUsed = true;
      await page.waitForTimeout(1_000);
      continue;
    }

    if (result.type === "error") {
      throw new Error(
        [
          `Falha ao criar checkout: ${message ?? "erro visivel sem texto"}`,
          `Tentativa: ${attempt}`,
          diagnostics,
        ].join("\n"),
      );
    }

    throw new Error(
      [
        "Checkout nao chegou ao estado 'Checkout criada' e nenhuma mensagem de erro apareceu.",
        `Tentativa: ${attempt}`,
        diagnostics,
      ].join("\n"),
    );
  }
}

/**
 * Cenário demo: simula pagamento aprovado e aguarda a conversão em pedido público.
 */
export async function simulatePaymentAndWaitForOrderPage(page: Page, slug: string) {
  await page.getByTestId("checkout-simulate-payment").click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/pedido/[^?]+\\?token=`), { timeout: 20_000 });
}

type WaitForOrderRowOptions = {
  orderId?: string;
  timeoutMs?: number;
  allowReload?: boolean;
  fallbackToAllScope?: boolean;
};

export function extractPublicOrderIdFromUrl(url: string) {
  const match = /\/pedido\/([^/?#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function waitForOrderRowByMarker(page: Page, marker: string, options?: WaitForOrderRowOptions) {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const allowReload = options?.allowReload ?? true;
  const fallbackToAllScope = options?.fallbackToAllScope ?? false;
  const orderId = options?.orderId?.trim() || null;

  let attempts = 0;

  await expect.poll(
    async () => {
      attempts += 1;

      const currentRow = orderId
        ? page.getByTestId(`order-row-${orderId}`)
        : page.locator('[data-testid^="order-row-"]').filter({ hasText: marker });

      const count = await currentRow.count();
      if (count > 0) {
        return count;
      }

      if (allowReload && attempts % 2 === 0) {
        await page.reload({ waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/dashboard\/pedidos(?:\?.*)?$/);
      }

      if (fallbackToAllScope && attempts % 3 === 0 && !page.url().includes("escopo=todos")) {
        await page.goto("/dashboard/pedidos?escopo=todos", { waitUntil: "domcontentloaded" });
        await expect(page).toHaveURL(/\/dashboard\/pedidos\?escopo=todos$/);
      }

      return 0;
    },
    {
      timeout: timeoutMs,
      intervals: [800, 1200, 1600, 2200],
      message: `Pedido com marcador '${marker}' nao apareceu no dashboard dentro do prazo.`,
    },
  ).toBeGreaterThan(0);

  const row = orderId
    ? page.getByTestId(`order-row-${orderId}`).first()
    : page.locator('[data-testid^="order-row-"]').filter({ hasText: marker }).first();

  await expect(row).toBeVisible();
  return row;
}

export async function waitForOrderRowStatus(
  page: Page,
  marker: string,
  statusText: string,
  options?: WaitForOrderRowOptions,
) {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const allowReload = options?.allowReload ?? true;
  const fallbackToAllScope = options?.fallbackToAllScope ?? false;
  const orderId = options?.orderId?.trim() || null;
  let attempts = 0;

  await expect.poll(
    async () => {
      attempts += 1;

      const row = orderId
        ? page.getByTestId(`order-row-${orderId}`).first()
        : page.locator('[data-testid^="order-row-"]').filter({ hasText: marker }).first();

      const rowCount = await row.count();
      const text = rowCount > 0 ? await row.innerText().catch(() => "") : "";

      if (text.includes(statusText)) {
        return text;
      }

      if (fallbackToAllScope && !page.url().includes("escopo=todos")) {
        await page.goto("/dashboard/pedidos?escopo=todos", { waitUntil: "domcontentloaded" });
      } else if (allowReload && attempts % 2 === 0) {
        await page.reload({ waitUntil: "domcontentloaded" });
      }

      return text;
    },
    {
      timeout: timeoutMs,
      intervals: [800, 1200, 1600, 2200],
      message: `Pedido com marcador '${marker}' nao chegou ao status '${statusText}' dentro do prazo.`,
    },
  ).toContain(statusText);

  return waitForOrderRowByMarker(page, marker, options);
}

type OrderActionKey = "accept" | "ready" | "finalize";

function parseOrderIdFromRowTestId(testId: string | null) {
  if (!testId) {
    return null;
  }

  const match = /^order-row-(.+)$/.exec(testId.trim());
  return match ? match[1] : null;
}

export async function clickOrderAction(row: Locator, actionKey: OrderActionKey) {
  const rowTestId = await row.getAttribute("data-testid");
  const orderId = parseOrderIdFromRowTestId(rowTestId);

  if (!orderId) {
    throw new Error("Nao foi possivel determinar o orderId da linha para executar acao.");
  }

  await row.getByTestId(`order-action-${actionKey}-${orderId}`).click();
}

export function productCardByName(page: Page, productName: string) {
  return page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name: productName, exact: true }) })
    .first();
}

export function dashboardCategoryRowByName(page: Page, categoryName: string) {
  return page
    .locator('[data-testid^="category-row-wrapper-"]')
    .filter({ hasText: categoryName })
    .first();
}

export function dashboardProductRowByName(page: Page, productName: string) {
  return page
    .locator('[data-testid^="product-row-wrapper-"]')
    .filter({ hasText: productName })
    .first();
}

export async function selectDashboardRowForBulkAction(
  page: Page,
  row: Locator,
  input: {
    checkboxSelector: string;
    toolbarTestId: string;
    expectedToolbarText: string | RegExp;
  },
) {
  const checkbox = row.locator(input.checkboxSelector);
  const toolbar = page.getByTestId(input.toolbarTestId);

  await expect(row).toBeVisible({ timeout: 15_000 });
  await checkbox.scrollIntoViewIfNeeded();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (!(await checkbox.isChecked())) {
      await checkbox.click();
    }

    try {
      await expect(toolbar).toContainText(input.expectedToolbarText, { timeout: 5_000 });
      return;
    } catch (error) {
      if (attempt === 2) {
        throw error;
      }

      await page.waitForTimeout(500);
    }
  }
}

export async function clickBulkAction(page: Page, input: { toolbarTestId: string; actionTestId: string }) {
  const action = page.getByTestId(input.actionTestId);

  if (!(await action.isVisible())) {
    const toolbar = page.getByTestId(input.toolbarTestId);
    const actionsToggle = toolbar.getByRole("button", { name: /^Ações$/i });

    if (await actionsToggle.isVisible()) {
      await actionsToggle.click();
    }
  }

  await action.click();
}
