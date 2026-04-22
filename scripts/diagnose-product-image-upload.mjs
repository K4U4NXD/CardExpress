import path from "node:path";

import { chromium } from "playwright";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env.e2e"), override: false });

const email = String(process.env.CARDEXPRESS_E2E_EMAIL ?? "").trim();
const password = String(process.env.CARDEXPRESS_E2E_PASSWORD ?? "").trim();
const baseURL = String(process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000").trim();

if (!email || !password) {
  console.error("Missing CARDEXPRESS_E2E_EMAIL or CARDEXPRESS_E2E_PASSWORD in .env.e2e");
  process.exit(1);
}

const fileToUpload = path.resolve(process.cwd(), "public", "branding", "icone-cardexpress.png");

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ baseURL });
const page = await context.newPage();

const browserLogs = [];
const reactWarnings = [];
page.on("console", (msg) => {
  const text = msg.text();
  if (text.includes("A component is changing a controlled input to be uncontrolled")) {
    reactWarnings.push({
      type: msg.type(),
      text,
      location: msg.location(),
      argsCount: msg.args().length,
    });
  }
  if (text.includes("[products:image-upload]") || text.includes("[controlled-warning-candidate]")) {
    browserLogs.push(`[${msg.type()}] ${text}`);
  }
});

try {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await Promise.all([
    page.waitForURL(/\/dashboard(?:\?.*)?$/),
    page.getByRole("button", { name: "Entrar" }).click(),
  ]);

  await page.goto("/dashboard/produtos", { waitUntil: "domcontentloaded" });

  // Create flow probe
  await page.getByTestId("open-create-product").click();
  const createUploadModeButton = page.getByTestId("product-image-mode-upload");
  await createUploadModeButton.waitFor({ state: "visible", timeout: 10000 });
  await createUploadModeButton.click();
  const createFileInput = page.locator('#product-image-upload');
  await createFileInput.setInputFiles(fileToUpload);
  const createUploadButton = page.getByTestId("product-image-upload-submit");
  await createUploadButton.click();

  const createErrorFeedback = page.locator("text=Falha no upload.").first();
  const createSuccessFeedback = page.locator("text=Upload concluído. A imagem será salva ao adicionar o produto.").first();
  let createOutcome = "none";
  let createFeedback = "";
  try {
    await Promise.race([
      createErrorFeedback.waitFor({ state: "visible", timeout: 15000 }),
      createSuccessFeedback.waitFor({ state: "visible", timeout: 15000 }),
    ]);
  } catch {
    // no-op
  }
  if (await createErrorFeedback.isVisible().catch(() => false)) {
    createOutcome = "error";
    createFeedback = await createErrorFeedback.innerText();
  } else if (await createSuccessFeedback.isVisible().catch(() => false)) {
    createOutcome = "success";
    createFeedback = await createSuccessFeedback.innerText();
  }

  // Close create panel before edit probe
  await page.getByTestId("open-create-product").click();

  const firstEditButton = page.getByRole("button", { name: "Editar" }).first();
  await firstEditButton.waitFor({ state: "visible", timeout: 15000 });
  await firstEditButton.click();

  const stockToggle = page.locator('input[name="track_stock"]').first();
  await stockToggle.waitFor({ state: "visible", timeout: 10000 });
  await stockToggle.click();
  await stockToggle.click();

  const uploadModeButton = page.getByRole("button", { name: "Enviar arquivo" }).first();
  await uploadModeButton.waitFor({ state: "visible", timeout: 10000 });
  await uploadModeButton.click();

  const fileInput = page.locator('input[type="file"]').first();
  await fileInput.setInputFiles(fileToUpload);

  const uploadButton = page.getByRole("button", { name: "Enviar e usar" }).first();
  await uploadButton.click();

  const successFeedback = page.locator("text=Upload concluído. Salve o produto para persistir a nova imagem.").first();
  const errorFeedback = page.locator("text=Falha no upload.").first();

  let successVisible = false;
  let errorVisible = false;

  try {
    await Promise.race([
      successFeedback.waitFor({ state: "visible", timeout: 20000 }),
      errorFeedback.waitFor({ state: "visible", timeout: 20000 }),
    ]);
  } catch {
    // no-op: report as inconclusive below
  }

  successVisible = await successFeedback.isVisible().catch(() => false);
  errorVisible = await errorFeedback.isVisible().catch(() => false);

  let feedbackText = "";
  if (successVisible) {
    feedbackText = await successFeedback.innerText();
  } else if (errorVisible) {
    feedbackText = await errorFeedback.innerText();
  }

  console.log("=== Diagnose Product Image Upload ===");
  console.log(`baseURL=${baseURL}`);
  console.log(`fileToUpload=${fileToUpload}`);
  console.log(`createOutcome=${createOutcome}`);
  if (createFeedback) {
    console.log("--- CREATE FEEDBACK ---");
    console.log(createFeedback);
  }
  console.log(`successVisible=${successVisible}`);
  console.log(`errorVisible=${errorVisible}`);
  if (feedbackText) {
    console.log("--- FEEDBACK TEXT ---");
    console.log(feedbackText);
  }

  if (browserLogs.length > 0) {
    console.log("--- BROWSER LOGS ---");
    for (const line of browserLogs) {
      console.log(line);
    }
  }

  if (reactWarnings.length > 0) {
    console.log("--- REACT CONTROLLED WARNINGS ---");
    for (const warn of reactWarnings) {
      console.log(`[${warn.type}] ${warn.text}`);
      console.log(`location=${JSON.stringify(warn.location)} argsCount=${warn.argsCount}`);
    }
  }
} finally {
  await context.close();
  await browser.close();
}
