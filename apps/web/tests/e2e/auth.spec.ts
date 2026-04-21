import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/auth/login');
  });

  test('should show login form', async ({ page }) => {
    await page.goto('/auth/login');
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible();
    await expect(page.getByPlaceholder('alice@example.com')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder('alice@example.com').fill('notanemail');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Please enter a valid email')).toBeVisible();
  });

  test('should successfully login and redirect to dashboard', async ({ page }) => {
    await page.goto('/auth/login');
    await page.getByPlaceholder('alice@example.com').fill('alice@example.com');
    await page.getByPlaceholder('••••••••').fill('Alice@123456');
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Good morning')).toBeVisible({ timeout: 10_000 });
  });

  test('should show register form', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.getByRole('heading', { name: 'Create Account' })).toBeVisible();
  });
});
