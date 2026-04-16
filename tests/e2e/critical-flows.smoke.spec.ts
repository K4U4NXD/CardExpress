import fs from "node:fs";
import path from "node:path";

import { test, expect, type Browser } from "@playwright/test";

import {
  addMenuProductQuantity,
  clickOrderAction,
  createCategoryIfMissing,
  createCheckoutSession,
  createProductIfMissing,
  extractPublicOrderIdFromUrl,
  goToPublicCheckout,
  loginAsMerchant,
  readStoreSlugFromSettings,
  setStoreAcceptsOrders,
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
  },
};

let storeSlug = "";

test.describe.serial("CardExpress critical smoke", () => {
  test.skip(
    missingEnv.length > 0,
    `Defina estas variaveis para rodar E2E: ${missingEnv.join(", ")}. Exemplo: CARDEXPRESS_E2E_EMAIL e CARDEXPRESS_E2E_PASSWORD.`,
  );

  test.beforeAll(async ({ browser }) => {
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
      await setStoreAcceptsOrders(page, true);

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

  test("Cenario 3 - bloqueio operacional de checkout/conversao", async ({ browser }) => {
    const merchantContext = await browser.newContext({ storageState: authStatePath });
    const publicContext = await browser.newContext();

    const merchantPage = await merchantContext.newPage();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S3-${Date.now()}`;

      await setStoreAcceptsOrders(merchantPage, true);

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happySecondary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);

      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S3`,
        customerPhone,
        note: marker,
      });

      await setStoreAcceptsOrders(merchantPage, false);

      await publicPage.reload({ waitUntil: "domcontentloaded" });
      await expect(publicPage.getByRole("heading", { name: /checkout criada/i })).toBeVisible();

      await publicPage.getByTestId("checkout-simulate-payment").click();
      await expect(publicPage).toHaveURL(new RegExp(`/${storeSlug}/checkout(?:\\?.*)?$`));
      await expect(publicPage.getByText(/bloquead|indisponivel|aceitando pedidos|temporariamente/i)).toBeVisible({
        timeout: 15_000,
      });

      await setStoreAcceptsOrders(merchantPage, true);

      await publicPage.reload({ waitUntil: "domcontentloaded" });
      await expect(publicPage.getByRole("heading", { name: /checkout criada/i })).toBeVisible();
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);
    } finally {
      await setStoreAcceptsOrders(merchantPage, true);
      await Promise.all([merchantContext.close(), publicContext.close()]);
    }
  });

  test("Cenario 4 - borda de estoque com multiplos itens problemáticos", async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      const marker = `SMOKE-S4-${Date.now()}`;

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.edgeStockOne.name, 2);
      await addMenuProductQuantity(publicPage, seedData.products.edgeStockTwo.name, 2);

      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S4`,
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

  test("Cenario 5 - cancelamento e recovery sem ressuscitar sessao invalida", async ({ browser }) => {
    const publicContext = await browser.newContext();
    const publicPage = await publicContext.newPage();

    try {
      const orderMarker = `SMOKE-S5-ORDER-${Date.now()}`;
      const checkoutMarker = `SMOKE-S5-CHECKOUT-${Date.now()}`;

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happyPrimary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S5A`,
        customerPhone,
        note: orderMarker,
      });
      await simulatePaymentAndWaitForOrderPage(publicPage, storeSlug);

      await publicPage.goto(`/${storeSlug}`, { waitUntil: "domcontentloaded" });
      await addMenuProductQuantity(publicPage, seedData.products.happySecondary.name, 1);
      await goToPublicCheckout(publicPage, storeSlug);
      await createCheckoutSession(publicPage, {
        customerName: `${customerBaseName} S5B`,
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
});
