import fs from "node:fs";
import path from "node:path";

import { test, expect, type Page } from "@playwright/test";

import {
  addMenuProductQuantity,
  clickBulkAction,
  clickOrderAction,
  createCategoryIfMissing,
  createCheckoutSession,
  createProductIfMissing,
  dashboardCategoryRowByName,
  dashboardProductRowByName,
  extractPublicOrderIdFromUrl,
  goToPublicCheckout,
  loginAsMerchant,
  productCardByName,
  readStoreSlugFromSettings,
  selectDashboardRowForBulkAction,
  setStoreOperationalMode,
  simulatePaymentAndWaitForOrderPage,
  waitForOrderRowByMarker,
  waitForOrderRowStatus,
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
  multiCategoryName: `E2E Categoria Extra ${runId}`,
  historicalCategoryName: `E2E Historico Categoria ${runId}`,
  bulkCategoryName: `E2E Bulk Categoria ${runId}`,
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
    multiCategory: {
      name: `E2E Multi Categoria ${runId}`,
      price: "11,00",
      stock: 5,
      additionalCategoryNames: [`E2E Categoria Extra ${runId}`],
    },
    historicalOnly: {
      name: `E2E Historico Produto ${runId}`,
      price: "12,00",
      stock: 3,
    },
    bulkPrimary: {
      name: `E2E Bulk Produto A ${runId}`,
      price: "5,00",
      stock: 8,
    },
    bulkSecondary: {
      name: `E2E Bulk Produto B ${runId}`,
      price: "6,00",
      stock: 8,
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
      await createCategoryIfMissing(page, seedData.multiCategoryName);
      await createCategoryIfMissing(page, seedData.historicalCategoryName);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.happyPrimary);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.happySecondary);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.edgeStockOne);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.edgeStockTwo);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.outOfStockVisible);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.soldToZero);
      await createProductIfMissing(page, seedData.categoryName, seedData.products.multiCategory);
      await createProductIfMissing(page, seedData.historicalCategoryName, seedData.products.historicalOnly);
      await createCategoryIfMissing(page, seedData.bulkCategoryName);
      await createProductIfMissing(page, seedData.bulkCategoryName, seedData.products.bulkPrimary);
      await createProductIfMissing(page, seedData.bulkCategoryName, seedData.products.bulkSecondary);
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

      await merchantPage.goto("/dashboard/pedidos?escopo=todos", { waitUntil: "domcontentloaded" });
      await expect(merchantPage).toHaveURL(/\/dashboard\/pedidos\?escopo=todos$/);

      let row = await waitForOrderRowByMarker(merchantPage, marker, {
        orderId: publicOrderId,
        timeoutMs: 35_000,
        fallbackToAllScope: true,
      });
      await expect(row.getByText("Aguardando aceite")).toBeVisible();

      await panelPage.goto(`/${storeSlug}/painel`, { waitUntil: "domcontentloaded" });
      await expect(panelPage.getByRole("heading", { name: /Painel de retirada/i })).toBeVisible();

      await Promise.all([
        merchantPage.waitForURL(/\/dashboard\/pedidos(?:\?.*)?$/, { timeout: 20_000 }),
        clickOrderAction(row, "accept"),
      ]);
      await merchantPage.goto("/dashboard/pedidos?escopo=todos", { waitUntil: "domcontentloaded" });

      row = await waitForOrderRowStatus(merchantPage, marker, "Em preparo", {
        orderId: publicOrderId,
        timeoutMs: 25_000,
        allowReload: true,
        fallbackToAllScope: true,
      });

      await Promise.all([
        merchantPage.waitForURL(/\/dashboard\/pedidos(?:\?.*)?$/, { timeout: 20_000 }),
        clickOrderAction(row, "ready"),
      ]);
      await merchantPage.goto("/dashboard/pedidos?escopo=todos", { waitUntil: "domcontentloaded" });

      row = await waitForOrderRowStatus(merchantPage, marker, "Pronto para retirada", {
        orderId: publicOrderId,
        timeoutMs: 25_000,
        allowReload: true,
        fallbackToAllScope: true,
      });
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
    test.setTimeout(90_000);

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
    test.setTimeout(90_000);

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

  test("Cenario 14 - produto em multiplas categorias e categoria historica removivel", async ({ browser }) => {
    test.setTimeout(180_000);

    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();
    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      await setStoreOperationalMode(merchantPage, "manual");

      await merchantPage.goto("/dashboard/produtos", { waitUntil: "domcontentloaded" });
      const multiRow = dashboardProductRowByName(merchantPage, seedData.products.multiCategory.name);
      await expect(multiRow).toBeVisible({ timeout: 15_000 });
      await expect(multiRow).toContainText(seedData.categoryName);
      await expect(multiRow).toContainText(seedData.multiCategoryName);
      const multiRowTestId = await multiRow.getAttribute("data-testid");
      expect(multiRowTestId).toBeTruthy();
      const stableMultiRow = merchantPage.getByTestId(multiRowTestId ?? "");

      await stableMultiRow.locator('[data-testid^="product-select-"]').check();
      await expect(merchantPage.getByTestId("product-bulk-edit")).toBeEnabled();
      await merchantPage.getByTestId("product-bulk-edit").click();
      const additionalCategoryId = await stableMultiRow.getByRole("combobox").evaluate((select, categoryName) => {
        const options = Array.from((select as HTMLSelectElement).options);
        return options.find((option) => option.textContent?.trim() === categoryName)?.value ?? "";
      }, seedData.multiCategoryName);
      expect(additionalCategoryId).not.toBe("");
      await expect(stableMultiRow.getByTestId(`product-additional-category-${additionalCategoryId}`)).toBeChecked({
        timeout: 15_000,
      });
      const saveProductButton = stableMultiRow.getByRole("button", { name: "Salvar" });
      await saveProductButton.evaluate((button) => button.scrollIntoView({ block: "center", inline: "nearest" }));
      await saveProductButton.click({ force: true, timeout: 15_000 });
      await expect(merchantPage.getByText("Produto atualizado com sucesso.")).toBeVisible({ timeout: 15_000 });

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      const allMultiCards = publicPage
        .locator("article")
        .filter({ has: publicPage.getByRole("heading", { name: seedData.products.multiCategory.name, exact: true }) });
      await expect(allMultiCards).toHaveCount(2, { timeout: 15_000 });
      const firstMultiAddButton = allMultiCards.first().getByRole("button", { name: "Adicionar" });
      await expect(firstMultiAddButton).toBeEnabled();
      await firstMultiAddButton.evaluate((button) => (button as HTMLButtonElement).click());
      await expect(publicPage.getByText(/^1 item$/)).toBeVisible({ timeout: 10_000 });

      await publicPage.getByRole("button", { name: seedData.categoryName }).click();
      await expect(productCardByName(publicPage, seedData.products.multiCategory.name)).toBeVisible({ timeout: 15_000 });

      await publicPage.getByRole("button", { name: seedData.multiCategoryName }).click();
      const filteredMultiCard = productCardByName(publicPage, seedData.products.multiCategory.name);
      await expect(filteredMultiCard).toBeVisible({ timeout: 15_000 });
      const filteredMultiIncreaseButton = filteredMultiCard.getByRole("button", { name: "+" });
      await expect(filteredMultiIncreaseButton).toBeEnabled();
      await filteredMultiIncreaseButton.evaluate((button) => (button as HTMLButtonElement).click());
      await expect(publicPage.getByText(/^2 itens$/)).toBeVisible({ timeout: 10_000 });
      await publicPage.getByRole("button", { name: "Limpar carrinho" }).click();
      await expect(publicPage.getByText(/^0 itens$/)).toBeVisible({ timeout: 10_000 });

      const marker = `SMOKE-S14-HISTORY-${Date.now()}`;
      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.historicalOnly.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S14`,
        customerPhone,
        note: marker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await merchantPage.goto("/dashboard/produtos", { waitUntil: "domcontentloaded" });
      const historicalProductRow = dashboardProductRowByName(merchantPage, seedData.products.historicalOnly.name);
      await expect(historicalProductRow).toBeVisible({ timeout: 15_000 });
      await historicalProductRow.locator('[data-testid^="product-select-"]').check();
      await merchantPage.getByTestId("product-bulk-delete").click();
      await merchantPage.getByTestId("product-bulk-delete-confirm").click();
      await expect(dashboardProductRowByName(merchantPage, seedData.products.historicalOnly.name)).toHaveCount(0, {
        timeout: 20_000,
      });

      await merchantPage.goto("/dashboard/categorias", { waitUntil: "domcontentloaded" });
      const historicalCategoryRow = dashboardCategoryRowByName(merchantPage, seedData.historicalCategoryName);
      await expect(historicalCategoryRow).toBeVisible({ timeout: 15_000 });
      await historicalCategoryRow.locator('[data-testid^="category-select-"]').check();
      await merchantPage.getByTestId("category-bulk-delete").click();
      await merchantPage.getByTestId("category-bulk-delete-confirm").click();
      await expect(dashboardCategoryRowByName(merchantPage, seedData.historicalCategoryName)).toHaveCount(0, {
        timeout: 20_000,
      });
    } finally {
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 15 - acoes em massa em categorias e produtos", async ({ browser }) => {
    test.setTimeout(240_000);

    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const merchantPage = await merchantContext.newPage();

    merchantPage.on("dialog", async (dialog) => {
      throw new Error(`Dialog nativo inesperado em acao em massa: ${dialog.type()} ${dialog.message()}`);
    });

    try {
      await merchantPage.goto("/dashboard/produtos", { waitUntil: "domcontentloaded" });
      await expect(merchantPage.getByRole("heading", { name: "Produtos", exact: true })).toBeVisible();

      const productRowA = dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name);
      const productRowB = dashboardProductRowByName(merchantPage, seedData.products.bulkSecondary.name);
      await expect(productRowA).toBeVisible({ timeout: 15_000 });
      await expect(productRowB).toBeVisible({ timeout: 15_000 });

      await productRowA.locator('[data-testid^="product-select-"]').check();
      await expect(merchantPage.getByTestId("product-bulk-toolbar")).toContainText("1 produto selecionado");
      await merchantPage.getByTestId("open-create-product").click();
      await expect(merchantPage.getByTestId("product-bulk-toolbar")).toHaveCount(0);
      await expect(merchantPage.getByTestId("product-select-all")).toBeDisabled();
      await merchantPage.getByTestId("open-create-product").click();
      await expect(merchantPage.getByTestId("product-select-all")).toBeEnabled();

      await productRowA.locator('[data-testid^="product-select-"]').check();
      await expect(merchantPage.getByTestId("product-bulk-toolbar")).toContainText("1 produto selecionado");
      await expect(merchantPage.getByTestId("product-bulk-edit")).toBeEnabled();
      await merchantPage.getByTestId("product-bulk-edit").click();
      await expect(merchantPage.getByTestId("product-bulk-toolbar")).toHaveCount(0);
      await expect(merchantPage.getByTestId("product-select-all")).toBeDisabled();
      await merchantPage.getByRole("button", { name: "Cancelar" }).last().click();
      await expect(merchantPage.getByTestId("product-select-all")).toBeEnabled();

      await productRowA.locator('[data-testid^="product-select-"]').check();
      await productRowB.locator('[data-testid^="product-select-"]').check();
      await expect(merchantPage.getByTestId("product-bulk-toolbar")).toContainText("2 produtos selecionados");
      await expect(merchantPage.getByTestId("product-bulk-edit")).toBeDisabled();

      await merchantPage.getByTestId("product-bulk-deactivate").click();
      await expect(merchantPage.getByText("2 produtos desativados.").first()).toBeVisible({ timeout: 15_000 });
      await expect(dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name)).toContainText("Inativo", {
        timeout: 15_000,
      });
      await expect(dashboardProductRowByName(merchantPage, seedData.products.bulkSecondary.name)).toContainText("Inativo", {
        timeout: 15_000,
      });

      await dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name)
        .locator('[data-testid^="product-select-"]')
        .check();
      await dashboardProductRowByName(merchantPage, seedData.products.bulkSecondary.name)
        .locator('[data-testid^="product-select-"]')
        .check();
      await merchantPage.getByTestId("product-bulk-activate").click();
      await expect(merchantPage.getByText("2 produtos ativados.").first()).toBeVisible({ timeout: 15_000 });
      await expect(dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name)).toContainText("Ativo", {
        timeout: 15_000,
      });
      await expect(dashboardProductRowByName(merchantPage, seedData.products.bulkSecondary.name)).toContainText("Ativo", {
        timeout: 15_000,
      });

      await dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name)
        .locator('[data-testid^="product-select-"]')
        .check();
      await merchantPage.getByTestId("product-bulk-delete").click();
      await expect(merchantPage.getByRole("dialog", { name: /Excluir produtos selecionados/i })).toBeVisible();
      await expect(merchantPage.getByTestId("product-bulk-delete-confirm")).toBeVisible();
      await merchantPage.getByRole("button", { name: "Cancelar" }).click();
      await expect(merchantPage.getByRole("dialog", { name: /Excluir produtos selecionados/i })).toHaveCount(0);

      await merchantPage.goto("/dashboard/categorias", { waitUntil: "domcontentloaded" });
      await expect(merchantPage.getByRole("heading", { name: "Categorias", exact: true })).toBeVisible();
      await expect(merchantPage.getByText(/Total solicitado/i)).toHaveCount(0);

      const categoryRow = dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName);
      await expect(categoryRow).toBeVisible({ timeout: 15_000 });
      await categoryRow.locator('[data-testid^="category-select-"]').check();
      await expect(merchantPage.getByTestId("category-bulk-toolbar")).toContainText("1 categoria selecionada");
      await expect(merchantPage.getByTestId("category-bulk-edit")).toBeEnabled();

      await merchantPage.getByTestId("category-bulk-delete").click();
      await expect(merchantPage.getByRole("dialog", { name: /Excluir categorias selecionadas/i })).toBeVisible();
      await expect(merchantPage.getByTestId("category-bulk-delete-confirm")).toBeVisible();
      await merchantPage.getByRole("button", { name: "Cancelar" }).click();
      await expect(merchantPage.getByRole("dialog", { name: /Excluir categorias selecionadas/i })).toHaveCount(0);

      await categoryRow.locator('[data-testid^="category-select-"]').check();
      await merchantPage.getByTestId("category-bulk-delete").click();
      await merchantPage.getByTestId("category-bulk-delete-confirm").click();
      await expect(merchantPage.getByText(/Nenhuma categoria foi alterada|mantida/i).first()).toBeVisible({ timeout: 15_000 });
      await expect(dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName)).toBeVisible({ timeout: 15_000 });

      await dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName)
        .locator('[data-testid^="category-select-"]')
        .check();
      await merchantPage.getByTestId("category-bulk-deactivate").click();
      await expect(merchantPage.getByText("1 categoria desativada.").first()).toBeVisible({ timeout: 15_000 });
      await expect(dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName)).toContainText("Inativa", {
        timeout: 15_000,
      });

      await dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName)
        .locator('[data-testid^="category-select-"]')
        .check();
      await merchantPage.getByTestId("category-bulk-activate").click();
      await expect(merchantPage.getByText("1 categoria ativada.").first()).toBeVisible({ timeout: 15_000 });
      await expect(dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName)).toContainText("Ativa", {
        timeout: 15_000,
      });

      await merchantPage.goto("/dashboard/produtos", { waitUntil: "domcontentloaded" });
      await dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name)
        .locator('[data-testid^="product-select-"]')
        .click();
      await dashboardProductRowByName(merchantPage, seedData.products.bulkSecondary.name)
        .locator('[data-testid^="product-select-"]')
        .click();
      await expect(merchantPage.getByTestId("product-bulk-toolbar")).toContainText("2 produtos selecionados", {
        timeout: 15_000,
      });
      await merchantPage.getByTestId("product-bulk-delete").click();
      await merchantPage.getByTestId("product-bulk-delete-confirm").click();
      await expect(dashboardProductRowByName(merchantPage, seedData.products.bulkPrimary.name)).toHaveCount(0, {
        timeout: 20_000,
      });
      await expect(dashboardProductRowByName(merchantPage, seedData.products.bulkSecondary.name)).toHaveCount(0, {
        timeout: 20_000,
      });

      await merchantPage.goto("/dashboard/categorias", { waitUntil: "domcontentloaded" });
      await selectDashboardRowForBulkAction(merchantPage, dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName), {
        checkboxSelector: '[data-testid^="category-select-"]',
        toolbarTestId: "category-bulk-toolbar",
        expectedToolbarText: "1 categoria selecionada",
      });
      await clickBulkAction(merchantPage, {
        toolbarTestId: "category-bulk-toolbar",
        actionTestId: "category-bulk-delete",
      });
      await merchantPage.getByTestId("category-bulk-delete-confirm").click();
      await expect(dashboardCategoryRowByName(merchantPage, seedData.bulkCategoryName)).toHaveCount(0, {
        timeout: 20_000,
      });
    } finally {
      void merchantContext.close().catch(() => undefined);
    }
  });
});
