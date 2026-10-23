import { expect, test, type Page } from "@playwright/test";

async function login(page: Page, username = "admin") {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", "demo1234");
  await page.click("button[type=submit]");
  await page.waitForURL("/");
}

test("kiosco: configuración visible en ajustes", async ({ page }) => {
  await login(page);
  await page.goto("/configuracion");
  await page.getByRole("tab", { name: "Reloj" }).click();
  await expect(page.getByText("Reloj público", { exact: true })).toBeVisible();
  await expect(page.getByLabel("IP o rango permitido")).toBeVisible();
  await expect(page.getByRole("button", { name: "Usar mi IP actual" })).toBeVisible();
  await expect(page.getByLabel("URL pública")).toBeVisible();
});

test("kiosco: página pública responde con estado controlado", async ({ page }) => {
  await page.goto("/kiosco");
  const text = await page.locator("main").innerText();
  expect(
    text.includes("Reloj desactivado") ||
      text.includes("Red no autorizada") ||
      text.includes("Reloj de asistencia")
  ).toBe(true);
});
