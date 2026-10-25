import { test, expect, type Page } from '@playwright/test';

async function login(page: Page, email: string) {
  await page.goto('/');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password', { exact: true }).fill('BrowserTestPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page.getByRole('heading', { name: 'Find your next great drive.' })).toBeVisible();
  await expect(page.locator('.vehicle-card').first()).toBeVisible();
}

test('customer can sign in, filter and purchase; sold-out stock stays disabled', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await login(page, 'customer@example.com');
  await expect(page.getByRole('button', { name: 'Add vehicle' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  await page.getByLabel('Make', { exact: true }).fill('Toyota');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Purchase', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Purchased one Toyota Camry. 5 remaining.');
  await expect(page.locator('.stock-tag')).toHaveText('5 in stock');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(6);
  await page.screenshot({ path: '../docs/customer-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('administrator can create, edit, restock and delete a vehicle', async ({ page }) => {
  await login(page, 'admin@example.com');
  await page.screenshot({ path: '../docs/admin-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Add vehicle' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Make', { exact: true }).fill('Honda');
  await dialog.getByLabel('Model', { exact: true }).fill('Civic Test');
  await dialog.getByLabel('Category', { exact: true }).fill('Sedan');
  await dialog.getByLabel('Price (USD)').fill('22000.25');
  await dialog.getByLabel('Initial stock').fill('0');
  await dialog.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(dialog).not.toBeVisible();
  const card = page.locator('.vehicle-card').filter({ has: page.getByRole('heading', { name: 'Civic Test', exact: true }) });
  await expect(card).toBeVisible();
  await expect(card.getByRole('button', { name: 'Out of stock' })).toBeDisabled();
  await card.getByRole('button', { name: 'Edit', exact: true }).click();
  await dialog.getByLabel('Price (USD)').fill('21000.50');
  await dialog.getByRole('button', { name: 'Save vehicle' }).click();
  await expect(card).toContainText('$21,000.50');
  await card.getByRole('button', { name: 'Restock', exact: true }).click();
  await dialog.getByLabel('Quantity to add').fill('4');
  await dialog.getByRole('button', { name: 'Add stock' }).click();
  await expect(card).toContainText('4 in stock');
  await card.getByRole('button', { name: 'Delete Honda Civic Test' }).click();
  await dialog.getByRole('button', { name: 'Delete vehicle' }).click();
  await expect(card).toHaveCount(0);
});

test('registration and empty search work at mobile width without horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.screenshot({ path: '../docs/login-mobile.png', fullPage: true });
  await page.getByRole('button', { name: 'Create account', exact: true }).first().click();
  await page.getByLabel('Email address').fill(`new-${Date.now()}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('BrowserTestPassword123!');
  await page.getByRole('button', { name: 'Create account', exact: true }).last().click();
  await expect(page.locator('.vehicle-card')).toHaveCount(6);
  await page.screenshot({ path: '../docs/customer-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByLabel('Make', { exact: true }).fill('Not a make');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'No vehicles match your search.' })).toBeVisible();
  await page.getByRole('button', { name: 'Reset search' }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(6);
});

test('wrong password shows a helpful error', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: '../docs/login-desktop.png', fullPage: true });
  await page.getByLabel('Email address').fill('customer@example.com');
  await page.getByLabel('Password', { exact: true }).fill('WrongPassword123!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).last().click();
  await expect(page.getByRole('alert')).toHaveText('Invalid email or password');
});
