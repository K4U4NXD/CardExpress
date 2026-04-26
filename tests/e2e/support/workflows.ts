import { expect, type Locator, type Page } from "@playwright/test";

export type MerchantCredentials = {
  email: string;
  password: string;
};

export type ProductSeed = {
  name: string;
  price: string;
  stock: number;
};

export type CheckoutInput = {
  customerName: string;
  customerPhone: string;
  note?: string;
  expectSessionCreated?: boolean;
};

export type StoreOperationalMode = "offline" | "manual" | "schedule";

export type StoreOperationalModeOptions = {
  openingTime?: string;
  closingTime?: string;
};

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
  await expect(saveButton).toHaveText(/Salvar configura/i, { timeout: 12_000 });

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

  await expect.poll(async () => await saveButton.isEnabled(), {
    timeout: 8_000,
    message: "O botao Salvar configuracoes nao habilitou apos mudar o modo operacional.",
  }).toBe(true);

  await saveButton.click();

  await expect.poll(async () => await modeRadio.isChecked(), {
    timeout: 12_000,
    message: `O modo operacional salvo nao refletiu '${mode}'.`,
  }).toBe(true);

  if (mode === "schedule") {
    if (requestedOpeningTime) {
      await expect(openingTimeInput).toHaveValue(requestedOpeningTime, { timeout: 12_000 });
    }

    if (requestedClosingTime) {
      await expect(closingTimeInput).toHaveValue(requestedClosingTime, { timeout: 12_000 });
    }
  }

  await expect(saveButton).toHaveText(/Salvar configura/i, { timeout: 12_000 });
  await expect(saveButton).toBeDisabled({ timeout: 12_000 });
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
  if (!(await createCategoryForm.isVisible())) {
    await page.getByTestId("open-create-category").click();
  }
  await expect(createCategoryForm).toBeVisible();

  await page.locator("#new-category-name").fill(categoryName);
  await page.getByTestId("submit-create-category").click();

  await expect(page.getByText(categoryName, { exact: true })).toBeVisible({ timeout: 12_000 });
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

  const trackStock = page.getByTestId("product-track-stock-toggle");
  if (!(await trackStock.isChecked())) {
    await trackStock.click();
  }

  await page.getByTestId("product-stock-input").fill(String(product.stock));
  await page.getByTestId("submit-create-product").click();

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
    await addButton.click();
  } else {
    await increaseButton.click();
  }

  for (let index = 1; index < quantity; index += 1) {
    await increaseButton.click();
  }
}

export async function goToPublicCheckout(page: Page, slug: string) {
  await page.getByTestId("menu-go-checkout").click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/checkout(?:\\?.*)?$`));
}

export async function createCheckoutSession(page: Page, input: CheckoutInput) {
  await page.getByTestId("checkout-customer-name").fill(input.customerName);
  await page.getByTestId("checkout-customer-phone").fill(input.customerPhone);

  if (input.note) {
    await page.getByTestId("checkout-notes").fill(input.note);
  }

  const createSessionButton = page.getByTestId("checkout-create-session");

  if (input.expectSessionCreated === false) {
    await expect(createSessionButton).toBeDisabled({ timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /checkout criada/i })).toHaveCount(0);
    return;
  }

  await expect(createSessionButton).toBeEnabled({ timeout: 10_000 });
  await createSessionButton.click();

  await expect(page.getByRole("heading", { name: /checkout criada/i })).toBeVisible({ timeout: 15_000 });
}

export async function simulatePaymentAndWaitForOrderPage(page: Page, slug: string) {
  await page.getByTestId("checkout-simulate-payment").click();
  await expect(page).toHaveURL(new RegExp(`/${slug}/pedido/[^?]+\\?token=`), { timeout: 20_000 });
}

type WaitForOrderRowOptions = {
  orderId?: string;
  timeoutMs?: number;
  allowReload?: boolean;
};

export function extractPublicOrderIdFromUrl(url: string) {
  const match = /\/pedido\/([^/?#]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function waitForOrderRowByMarker(page: Page, marker: string, options?: WaitForOrderRowOptions) {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const allowReload = options?.allowReload ?? true;
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
