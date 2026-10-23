import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, username = "admin") {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", "demo1234");
  await page.click("button[type=submit]");
  await page.waitForURL("/");
}

test("login y dashboard con KPIs", async ({ page }) => {
  await login(page);
  await expect(page.getByRole("heading", { name: /Hola, / })).toBeVisible();
  await expect(page.getByText("Ventas del mes")).toBeVisible();
  await expect(page.getByText("Por cobrar")).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text).not.toContain("...");
});

test("productos muestran código en columna propia", async ({ page }) => {
  await login(page);
  await page.goto("/productos");
  await expect(page.locator("thead th").filter({ hasText: "Código" })).toBeVisible();
  await expect(page.locator("thead th").filter({ hasText: "Producto" })).toBeVisible();
  await expect(page.locator("tbody").getByText(/FAB-\d{3}/).first()).toBeVisible();
});

test("alta de cliente abre en modal", async ({ page }) => {
  await login(page);
  await page.goto("/clientes");
  await page.getByRole("button", { name: "Nuevo cliente" }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Nuevo cliente" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("selector de fechas usa el calendario del sistema", async ({ page }) => {
  await login(page);
  await page.goto("/reportes/caja");
  await page.getByRole("button", { name: "Seleccionar fecha" }).first().click();
  await expect(page.getByRole("button", { name: "Hoy" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Limpiar" })).toBeVisible();
});

test("visor PDF.js renderiza KuDE", async ({ page }) => {
  await login(page);
  await page.goto("/ver/kude/inv_1?formato=a4");
  await expect(page.getByText("PDF.js · Mozilla")).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toBeVisible();
  const width = await canvas.evaluate((element) => (element as HTMLCanvasElement).width);
  expect(width).toBeGreaterThan(0);
});

test("permisos de PDF: depósito no puede ver KuDE", async ({ page }) => {
  await login(page, "deposito");
  const baseUrl = process.env.E2E_BASE_URL ?? "https://esmarlab.duckdns.org";
  const response = await page.context().request.get(`${baseUrl}/api/pdf/kude/inv_1?formato=a4`);
  expect(response.status()).toBe(403);
});
