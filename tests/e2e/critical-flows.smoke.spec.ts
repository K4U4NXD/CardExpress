import fs from "node:fs";
import path from "node:path";

import { test, expect, type Page } from "@playwright/test";

import {
  addMenuProductQuantity,
  clickOrderAction,
  createCategoryIfMissing,
  createCheckoutSession,
  createProductIfMissing,
  extractPublicOrderIdFromUrl,
  goToPublicCheckout,
  loginAsMerchant,
  productCardByName,
  readStoreSlugFromSettings,
  setStoreOperationalMode,
  simulatePaymentAndWaitForOrderPage,
  waitForOrderRowByMarker,
} from "./support/workflows";

const REQUIRED_ENV = ["CARDEXPRESS_E2E_EMAIL", "CARDEXPRESS_E2E_PASSWORD"] as const;
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name] || !String(process.env[name]).trim());

const merchantCredentials = {
  email: String(process.env.CARDEXPRESS_E2E_EMAIL ?? "").trim(),
  password: String(process.env.CARDEXPRESS_E2E_PASSWORD ?? "").trim(),
};

const customerBaseName = String(process.env.CARDEXPRESS_E2E_CUSTOMER_NAME ?? "Cliente E2E").trim();
const customerPhone = String(process.env.CARDEXPRESS_E2E_CUSTOMER_PHONE ?? "11999999999").trim();

const runIdFromEnv = String(process.env.CARDEXPRESS_E2E_RUN_ID ?? "").trim();
const runId = runIdFromEnv || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const authStatePath = path.join(process.cwd(), "tests", "e2e", ".auth", "merchant.json");

const seedData = {
  categoryName: `E2E Categoria ${runId}`,
  products: {
    happyPrimary: {
      name: `E2E Lanche ${runId}`,
      price: "18,90",
      stock: 20,
    },
    happySecondary: {
      name: `E2E Suco ${runId}`,
      price: "8,50",
      stock: 20,
    },
    edgeStockOne: {
      name: `E2E Estoque A ${runId}`,
      price: "7,00",
      stock: 1,
    },
    edgeStockTwo: {
      name: `E2E Estoque B ${runId}`,
      price: "6,00",
      stock: 1,
    },
    outOfStockVisible: {
      name: `E2E Sem Estoque ${runId}`,
      price: "9,90",
      stock: 0,
    },
    soldToZero: {
      name: `E2E Zera Estoque ${runId}`,
      price: "10,00",
      stock: 1,
    },
  },
};

let storeSlug = "";

function getSaoPauloMinuteOfDay() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");

  return hour * 60 + minute;
}

function formatMinuteAsHHMM(totalMinutes: number) {
  const normalized = ((totalMinutes % 1440) + 1440) % 1440;
  const hour = Math.floor(normalized / 60);
  const minute = normalized % 60;

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function buildScheduleWindowContainingNow() {
  const now = getSaoPauloMinuteOfDay();

  return {
    openingTime: formatMinuteAsHHMM(now - 60),
    closingTime: formatMinuteAsHHMM(now + 60),
  };
}

function buildScheduleWindowOutsideNow() {
  const now = getSaoPauloMinuteOfDay();

  return {
    openingTime: formatMinuteAsHHMM(now + 60),
    closingTime: formatMinuteAsHHMM(now + 120),
  };
}

async function expectCheckoutCreationBlocked(page: Page, marker: string, messagePattern: RegExp) {
  await createCheckoutSession(page, {
    customerName: `${customerBaseName} ${marker}`,
    customerPhone,
    note: marker,
    expectSessionCreated: false,
  });
  await expect(page.getByText(messagePattern).first()).toBeVisible({ timeout: 10_000 });
}

test.describe.serial("CardExpress critical smoke", () => {
  test.skip(
    missingEnv.length > 0,
    `Defina estas variaveis para rodar E2E: ${missingEnv.join(", ")}. Exemplo: CARDEXPRESS_E2E_EMAIL e CARDEXPRESS_E2E_PASSWORD.`,
  );

  test.beforeAll(async ({ browser }) => {
    test.setTimeout(180_000);
    fs.mkdirSync(path.dirname(authStatePath), { recursive: true });

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginAsMerchant(page, merchantCredentials);

      storeSlug = await readStoreSlugFromSettings(page);

      await createCategoryIfMissing(page, seedData.categoryName);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.happyPrimary);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.happySecondary);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.edgeStockOne);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.edgeStockTwo);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.outOfStockVisible);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.soldToZero);
      await setStoreOperationalMode(page, "manual");

      await context.storageState({ path: authStatePath });
    } finally {
      await context.close();
    }
  });

  test("Cenario 1 - fluxo publico feliz", async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S1-${Date.now()}`;

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);
      await addMenuProductQuantity(publicPage, seedData.products.happySecondary.name, 1);

      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S1`,
        customerPhone,
        note: marker,
      });

      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await expect(publicPage.getByRole("heading", { name: /pedido/i })).toBeVisible();
      await expect(publicPage.getByText(/Aguardando aceite/i)).toBeVisible();
      await expect(publicPage).toHaveURL(/\?token=/);
    } finally {
      await publicContext.close();
    }
  });

  test("Cenario 2 - reflexo operacional no dashboard e painel publico", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();
    const panelContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();
    const panelPage = await panelContext.newPage();

    try {
      const marker = `SMOKE-S2-${Date.now()}`;

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S2`,
        customerPhone,
        note: marker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);
      const publicOrderHeading = (await publicPage.getByRole("heading", { name: /pedido/i }).first().innerText()).trim();
      const orderCodeFromPublicPage = publicOrderHeading.replace(/^pedido\s+/i, "").trim();
      const publicOrderId = extractPublicOrderIdFromUrl(publicPage.url());

      if (!publicOrderId) {
        throw new Error("Nao foi possivel extrair o orderId da URL publica no cenario 2.");
      }

      await merchantPage.goto("/dashboard/pedidos", { waitUntil: "domcontentloaded" });
      await expect(merchantPage).toHaveURL(/\/dashboard\/pedidos(?:\?.*)?$/);

      let row = await waitForOrderRowByMarker(merchantPage, marker, {
        orderId: publicOrderId,
        timeoutMs: 35_000,
      });
      await expect(row.getByText("Aguardando aceite")).toBeVisible();

      await panelPage.goto(`/${storeSlug}/painel`, { waitUntil: "domcontentloaded" });
      await expect(panelPage.getByRole("heading", { name: /Painel de retirada/i })).toBeVisible();

      await Promise.all([
        merchantPage.waitForURL(/\/dashboard\/pedidos(?:\?.*)?$/, { timeout: 20_000 }),
        clickOrderAction(row, "accept"),
      ]);

      row = await waitForOrderRowByMarker(merchantPage, marker, {
        orderId: publicOrderId,
        timeoutMs: 25_000,
        allowReload: false,
      });
      await expect(row.getByText("Em preparo")).toBeVisible();

      await Promise.all([
        merchantPage.waitForURL(/\/dashboard\/pedidos(?:\?.*)?$/, { timeout: 20_000 }),
        clickOrderAction(row, "ready"),
      ]);

      row = await waitForOrderRowByMarker(merchantPage, marker, {
        orderId: publicOrderId,
        timeoutMs: 25_000,
        allowReload: false,
      });
      await expect(row.getByText("Pronto para retirada")).toBeVisible();
      await expect(panelPage.getByTestId("panel-latest-display-code")).toHaveText(orderCodeFromPublicPage, {
        timeout: 20_000,
      });

      await Promise.all([
        merchantPage.waitForURL(/\/dashboard\/pedidos(?:\?.*)?$/, { timeout: 20_000 }),
        clickOrderAction(row, "finalize"),
      ]);

      await expect(merchantPage.getByTestId(`order-row-${publicOrderId}`)).toHaveCount(0, {
        timeout: 15_000,
      });

      await merchantPage.goto("/dashboard/pedidos?escopo=finalizados", { waitUntil: "domcontentloaded" });
      const finalizedRow = await waitForOrderRowByMarker(merchantPage, marker, {
        orderId: publicOrderId,
        timeoutMs: 25_000,
        allowReload: true,
      });
      await expect(finalizedRow.getByText(/^Finalizado$/)).toBeVisible();
    } finally {
      await Promise.all([merchantContext.close(), publicContext.close(), panelContext.close()]);
    }
  });

  test("Cenario 3 - loja offline bloqueia nova sessao, mas nao conversao de checkout ja criado", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();
    const blockedContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();
    const blockedPage = await blockedContext.newPage();

    try {
      const marker = `SMOKE-S3-${Date.now()}`;
      const blockedMarker = `SMOKE-S3-BLOCKED-${Date.now()}`;

      await setStoreOperationalMode(merchantPage, "manual");

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happySecondary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);

      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S3`,
        customerPhone,
        note: marker,
      });

      await blockedPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(blockedPage, seedData.products.happyPrimary.name, 1);
      await goToPublicCheckout(blockedPage, storeSlug);

      await setStoreOperationalMode(merchantPage, "offline");

      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);
      await expect(publicPage.getByRole("heading", { name: /pedido/i })).toBeVisible();

      await blockedPage.reload({ waitUntil: "domcontentloaded" });
      await expectCheckoutCreationBlocked(blockedPage, blockedMarker, /pausou|pedidos pausados|indispon/i);
    } finally {
      await setStoreOperationalMode(merchantPage, "manual");
      await Promise.all([merchantContext.close(), publicContext.close(), blockedContext.close()]);
    }
  });

  test("Cenario 4 - loja offline mantem cardapio visivel e bloqueia checkout", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S4-OFFLINE-${Date.now()}`;

      await setStoreOperationalMode(merchantPage, "manual");
      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);

      await setStoreOperationalMode(merchantPage, "offline");

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByText(/pedidos pausados|pausou temporariamente/i).first()).toBeVisible({
        timeout: 15_000,
      });

      const card = productCardByName(publicPage, seedData.products.happyPrimary.name);
      await expect(card).toBeVisible({ timeout: 15_000 });
      await expect(card.locator('[data-testid^="menu-increase-"], [data-testid^="menu-add-"]').first()).toBeDisabled();

      await publicPage.goto(`/${storeSlug}/checkout`, { waitUntil: "domcontentloaded" });
      await expectCheckoutCreationBlocked(publicPage, marker, /pausou|pedidos pausados|indispon/i);
    } finally {
      await setStoreOperationalMode(merchantPage, "manual");
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 5 - aberta manualmente permite checkout e pedido", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S5-MANUAL-${Date.now()}`;

      await setStoreOperationalMode(merchantPage, "manual");

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S5`,
        customerPhone,
        note: marker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await expect(publicPage.getByRole("heading", { name: /pedido/i })).toBeVisible();
      await expect(publicPage).toHaveURL(new RegExp(`/${storeSlug}/pedido/[^?]+\\?token=`));
    } finally {
      await setStoreOperationalMode(merchantPage, "manual");
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 6 - horario automatico dentro do horario permite checkout e pedido", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S6-SCHEDULE-IN-${Date.now()}`;
      const { openingTime, closingTime } = buildScheduleWindowContainingNow();

      await setStoreOperationalMode(merchantPage, "schedule", { openingTime, closingTime });

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happySecondary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S6`,
        customerPhone,
        note: marker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await expect(publicPage.getByRole("heading", { name: /pedido/i })).toBeVisible();
    } finally {
      await setStoreOperationalMode(merchantPage, "manual");
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 7 - horario automatico fora do horario bloqueia nova sessao", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S7-SCHEDULE-OUT-${Date.now()}`;
      const { openingTime, closingTime } = buildScheduleWindowOutsideNow();

      await setStoreOperationalMode(merchantPage, "manual");
      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);

      await setStoreOperationalMode(merchantPage, "schedule", { openingTime, closingTime });

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByText(/fora do hor[aá]rio de atendimento/i).first()).toBeVisible({
        timeout: 15_000,
      });

      await publicPage.goto(`/${storeSlug}/checkout`, { waitUntil: "domcontentloaded" });
      await expectCheckoutCreationBlocked(publicPage, marker, /fora do hor[aá]rio de atendimento/i);
    } finally {
      await setStoreOperationalMode(merchantPage, "manual");
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 8 - borda de estoque com multiplos itens problematicos", async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S8-${Date.now()}`;

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.edgeStockOne.name, 2);
      await addMenuProductQuantity(publicPage, seedData.products.edgeStockTwo.name, 2);

      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S8`,
        customerPhone,
        note: marker,
        expectSessionCreated: false,
      });

      const stockProblemMessages = publicPage.locator('[data-testid^="checkout-item-problem-"]');
      await expect(stockProblemMessages).toHaveCount(2);
      await expect(stockProblemMessages.first()).toContainText(/estoque|quantidade|indispon/i);

      const edgeRowOne = publicPage
        .locator('[data-testid^="checkout-cart-item-"]')
        .filter({ hasText: seedData.products.edgeStockOne.name })
        .first();
      const edgeRowTwo = publicPage
        .locator('[data-testid^="checkout-cart-item-"]')
        .filter({ hasText: seedData.products.edgeStockTwo.name })
        .first();

      await expect(edgeRowOne).toHaveAttribute("data-problematic", "true");
      await expect(edgeRowTwo).toHaveAttribute("data-problematic", "true");
      await expect(publicPage.locator('[data-testid^="checkout-cart-item-"][data-problematic="true"]')).toHaveCount(2);
      await expect(publicPage.getByRole("heading", { name: /checkout criada/i })).toHaveCount(0);
    } finally {
      await publicContext.close();
    }
  });

  test("Cenario 9 - cancelamento e recovery sem ressuscitar sessao invalida", async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      const orderMarker = `SMOKE-S9-ORDER-${Date.now()}`;
      const checkoutMarker = `SMOKE-S9-CHECKOUT-${Date.now()}`;

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S9A`,
        customerPhone,
        note: orderMarker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happySecondary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S9B`,
        customerPhone,
        note: checkoutMarker,
      });

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      const recoveryBanner = publicPage.getByTestId("public-flow-recovery-banner");
      const recoveryOrdersBlock = publicPage.getByTestId("recovery-orders-block");
      await expect(recoveryBanner).toBeVisible({ timeout: 20_000 });
      await expect(recoveryOrdersBlock).toBeVisible({ timeout: 20_000 });
      await expect(recoveryOrdersBlock.locator('li[data-testid^="recovery-order-"]')).toHaveCount(1, {
        timeout: 20_000,
      });
      await expect(publicPage.getByTestId("recovery-checkout-block")).toBeVisible({ timeout: 20_000 });
      await expect(publicPage.getByTestId("recovery-checkout-link")).toBeVisible({ timeout: 20_000 });

      await publicPage.goto(`/${storeSlug}/checkout`, { waitUntil: "domcontentloaded" });
      await publicPage.getByTestId("checkout-cancel-session").click();
      await expect(publicPage.getByText(/Checkout cancelado com sucesso/i)).toBeVisible({ timeout: 10_000 });

      await publicPage.reload({ waitUntil: "domcontentloaded" });
      await expect(publicPage.getByRole("heading", { name: /checkout criada/i })).toHaveCount(0);

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await expect(publicPage.getByTestId("recovery-checkout-link")).toHaveCount(0, { timeout: 15_000 });

      const hasCheckoutInRecovery = await publicPage.evaluate((slug) => {
        const raw = window.localStorage.getItem(`cardexpress:public-flow:recovery:${slug}`);
        if (!raw) {
          return false;
        }

        try {
          const parsed = JSON.parse(raw) as { checkout?: unknown } | null;
          return Boolean(parsed && typeof parsed === "object" && parsed.checkout);
        } catch {
          return false;
        }
      }, storeSlug);

      expect(hasCheckoutInRecovery).toBe(false);
    } finally {
      await publicContext.close();
    }
  });

  test("Cenario 10 - produto com estoque 0 visivel e bloqueado para compra", async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });

      const outOfStockCard = productCardByName(publicPage, seedData.products.outOfStockVisible.name);
      await expect(outOfStockCard).toBeVisible({ timeout: 15_000 });
      await expect(outOfStockCard.locator('[data-testid^="menu-stock-badge-"]')).toContainText(/Sem estoque/i);
      await expect(outOfStockCard.locator('[data-testid^="menu-out-of-stock-"]')).toContainText(/indispon[ií]vel/i);

      const addOutOfStockButton = outOfStockCard.locator('[data-testid^="menu-add-"]');
      await expect(addOutOfStockButton).toBeDisabled();

      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);
      await expect(publicPage.getByTestId("menu-go-checkout")).toBeVisible();

      await goToPublicCheckout(publicPage, storeSlug);
      await expect(publicPage.locator('[data-testid^="checkout-cart-item-"]').first()).toBeVisible({ timeout: 10_000 });
    } finally {
      await publicContext.close();
    }
  });

  test("Cenario 11 - produto vendido de estoque 1 para 0 continua visivel e indisponivel", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S11-STOCK-ZERO-${Date.now()}`;

      await setStoreOperationalMode(merchantPage, "manual");

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.soldToZero.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S11`,
        customerPhone,
        note: marker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });

      const soldToZeroCard = productCardByName(publicPage, seedData.products.soldToZero.name);
      await expect(soldToZeroCard).toBeVisible({ timeout: 15_000 });
      await expect(soldToZeroCard.locator('[data-testid^="menu-stock-badge-"]')).toContainText(/Sem estoque/i, {
        timeout: 15_000,
      });
      await expect(soldToZeroCard.locator('[data-testid^="menu-out-of-stock-"]')).toContainText(/indispon[ií]vel/i);
      await expect(soldToZeroCard.locator('[data-testid^="menu-add-"]')).toBeDisabled();
    } finally {
      await setStoreOperationalMode(merchantPage, "manual");
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 12 - filtros da dashboard nao navegam nem resetam scroll", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const merchantPage = await merchantContext.newPage();

    try {
      await merchantPage.goto("/dashboard", { waitUntil: "domcontentloaded" });
      await expect(merchantPage.getByRole("heading", { name: "Início" })).toBeVisible();

      const reloadToken = `reload-token-${Date.now()}`;
      await merchantPage.evaluate((token) => {
        (window as Window & { __cardexpressE2eReloadToken?: string }).__cardexpressE2eReloadToken = token;
        window.scrollTo(0, Math.max(320, document.body.scrollHeight / 2));
      }, reloadToken);

      await expect.poll(async () => await merchantPage.evaluate(() => window.scrollY)).toBeGreaterThan(0);

      for (const testId of ["dashboard-period-today", "dashboard-period-week", "dashboard-period-service"]) {
        await merchantPage.getByTestId(testId).click();
        await expect(merchantPage).toHaveURL(/\/dashboard(?:\?.*)?$/);

        await expect
          .poll(async () =>
            merchantPage.evaluate(
              () => (window as Window & { __cardexpressE2eReloadToken?: string }).__cardexpressE2eReloadToken ?? null,
            ),
          )
          .toBe(reloadToken);

        await expect.poll(async () => await merchantPage.evaluate(() => window.scrollY)).toBeGreaterThan(0);
      }
    } finally {
      await merchantContext.close();
    }
  });

  test("Cenario 13 - dashboard mobile abre menu e navega", async ({ browser }) => {
    const merchantContext = await browser.newContext({
      storageState: authStatePath,
      viewport: { width: 390, height: 844 },
    });
    const merchantPage = await merchantContext.newPage();

    try {
      await merchantPage.goto("/dashboard", { waitUntil: "domcontentloaded" });

      await expect(merchantPage.getByText("CARDEXPRESS", { exact: true })).toBeVisible();
      await merchantPage.getByRole("button", { name: "Menu" }).click();

      const mobileNav = merchantPage.getByRole("dialog", { name: "Menu do dashboard" });
      await expect(mobileNav).toBeVisible();
      await expect(mobileNav.getByRole("link", { name: "Pedidos" })).toBeVisible();

      await mobileNav.getByRole("link", { name: "Produtos" }).click();
      await expect(merchantPage).toHaveURL(/\/dashboard\/produtos(?:\?.*)?$/);
      await expect(merchantPage.getByRole("heading", { name: "Produtos", exact: true })).toBeVisible({
        timeout: 15_000,
      });
    } finally {
      await merchantContext.close();
    }
  });
});
