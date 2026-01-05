/**
 * @fileoverview Example E2E Test
 * @description Demonstrates E2E testing setup with Playwright
 *
 * NOTE: E2E tests require the dev server to be running.
 * Run: npm run dev (in one terminal) and npm run test:e2e (in another)
 *
 * For CI/CD, the playwright.config.ts is configured to auto-start the dev server.
 */

import { test, expect } from '@playwright/test';

test.describe('Application Smoke Tests', () => {
  test('should load the application', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Should redirect to /contacts or /auth depending on auth state
    await page.waitForURL(/\/(contacts|auth)/);

    // Verify page loaded
    expect(page.url()).toMatch(/\/(contacts|auth)/);
  });

  test('should show auth page for non-authenticated users', async ({ page, context }) => {
    // Clear storage to ensure no auth
    await context.clearCookies();
    await page.goto('/contacts');

    // Should redirect to auth
    await page.waitForURL('/auth');

    // Verify auth form is visible
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });
});

test.describe('Multi-tenant Security (E2E)', () => {
  // NOTE: These tests would need real test users in different tenants
  // For now, this is a template showing the test structure

  test.skip('should only show contacts for current tenant', async ({ page }) => {
    // TODO: Login as tenant A user
    // await login(page, 'tenant-a@example.com', 'password');

    // Navigate to contacts
    await page.goto('/contacts');
    await page.waitForLoadState('networkidle');

    // Get all contact items
    const contacts = await page.locator('[data-testid="contact-item"]').all();

    // Verify all contacts have correct tenant_id
    for (const contact of contacts) {
      const tenantId = await contact.getAttribute('data-tenant-id');
      expect(tenantId).toBe('tenant-a-id');
    }
  });

  test.skip('should not access conversations from another tenant', async ({ page, request }) => {
    // TODO: Login as tenant A user
    // TODO: Try to access tenant B conversation

    const response = await request.get('/api/conversations/other-tenant-conversation-id');

    // Should be forbidden
    expect(response.status()).toBe(403);
  });
});

// Helper functions (to be implemented)
async function login(page: any, email: string, password: string) {
  await page.goto('/auth');
  await page.fill('input[name="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('/contacts');
}
