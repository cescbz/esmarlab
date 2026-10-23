import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, username = "admin") {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", "demo1234");
  await page.click("button[type=submit]");
  await page.waitForURL("/");
}

test("RRHH: panel y empleados con legajo", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh");
  await expect(page.getByRole("heading", { name: "Recursos Humanos" })).toBeVisible();
  await expect(page.getByText("Empleados activos")).toBeVisible();
  await page.goto("/rrhh/empleados");
  await expect(page.locator("thead th").filter({ hasText: "Legajo" })).toBeVisible();
  await expect(page.locator("tbody").getByText(/EMP-0001/).first()).toBeVisible();
});

test("RRHH: alta de empleado abre en modal", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh/empleados");
  await page.getByRole("button", { name: "Nuevo empleado" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuevo empleado" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("RRHH: reloj con CI y PIN", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh/reloj");
  await expect(page.getByLabel("CI con DV")).toBeVisible();
  await expect(page.getByLabel("PIN")).toBeVisible();
  await expect(page.getByRole("button", { name: /Marcar entrada/ })).toBeVisible();
  await expect(page.getByText("PIN 1234")).toBeVisible();
});

test("RRHH: recibo de sueldo en visor PDF.js", async ({ page }) => {
  await login(page);
  await page.goto("/rrhh/liquidaciones");
  await page.getByRole("link", { name: /LIQ-2026-10/ }).first().click();
  const receipt = page.locator('a[href^="/ver/recibo-sueldo/"]').first();
  await expect(receipt).toBeVisible();
  await receipt.click();
  await expect(page.getByText("PDF.js · Mozilla")).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const width = await canvas.evaluate((element) => (element as HTMLCanvasElement).width);
  expect(width).toBeGreaterThan(0);
});

test("RRHH: depósito no puede descargar recibo de sueldo", async ({ page, browser }) => {
  await login(page);
  await page.goto("/rrhh/liquidaciones");
  await page.getByRole("link", { name: /LIQ-2026-10/ }).first().click();
  const href = await page
    .locator('a[href^="/ver/recibo-sueldo/"]')
    .first()
    .getAttribute("href");
  expect(href).toBeTruthy();
  const itemId = href!.split("/").pop();
  const baseURL = process.env.E2E_BASE_URL ?? "https://esmarlab.duckdns.org";
  const context = await browser.newContext({ baseURL });
  const deposito = await context.newPage();
  await login(deposito, "deposito");
  const response = await deposito
    .context()
    .request.get(`${baseURL}/api/pdf/recibo-sueldo/${itemId}`);
  expect(response.status()).toBe(403);
  await context.close();
});
