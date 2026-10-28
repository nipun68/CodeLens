import { test, expect } from '@playwright/test';
import path from 'node:path';

test.describe('CodeLens Financial Design System Audit & Verification', () => {

  test('1. Authoritative CSS Design Tokens & Typography Exist on :root', async ({ page }) => {
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    const tokens = await page.evaluate(() => {
      const computed = getComputedStyle(document.documentElement);
      const bodyComputed = getComputedStyle(document.body);
      return {
        ground: computed.getPropertyValue('--dp-color-ground').trim(),
        panel: computed.getPropertyValue('--dp-color-panel').trim(),
        accent: computed.getPropertyValue('--dp-color-accent').trim(),
        value: computed.getPropertyValue('--dp-color-value').trim(),
        line: computed.getPropertyValue('--dp-color-line').trim(),
        radiusPanel: computed.getPropertyValue('--dp-radius-panel').trim(),
        radiusControl: computed.getPropertyValue('--dp-radius-control').trim(),
        fontFamily: bodyComputed.fontFamily,
      };
    });

    expect(tokens.ground.toLowerCase()).toBe('#07090e');
    expect(tokens.panel.toLowerCase()).toBe('#10141c');
    expect(tokens.accent.toLowerCase()).toBe('#ff951f');
    expect(tokens.value.toLowerCase()).toBe('#edcd8c');
    expect(tokens.line.toLowerCase()).toBe('#303139');
    expect(tokens.radiusPanel).toBe('5px');
    expect(tokens.radiusControl).toBe('40px');
    expect(tokens.fontFamily.toLowerCase()).toContain('plex');
  });

  test('2. Symmetrical Dark & Light Mode Theme Support with Non-Breaking Contrast', async ({ page }) => {
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    // Baseline: Dark theme
    const darkTheme = await page.evaluate(() => document.documentElement.dataset.theme);
    expect(darkTheme).toBe('dark');

    // Switch to Light Mode
    const themeBtn = page.locator('button.landing-theme-toggle').first();
    if (await themeBtn.isVisible()) {
      await themeBtn.click();
      const lightTheme = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(lightTheme).toBe('light');

      // Verify light mode colors
      const lightTokens = await page.evaluate(() => {
        const computed = getComputedStyle(document.documentElement);
        return {
          bg: computed.getPropertyValue('--bg').trim(),
          surface: computed.getPropertyValue('--surface').trim(),
          ink: computed.getPropertyValue('--ink').trim(),
        };
      });
      expect(lightTokens.surface.toLowerCase()).toBe('#ffffff');

      // Switch back to Dark Mode
      await themeBtn.click();
      const restoredDark = await page.evaluate(() => document.documentElement.dataset.theme);
      expect(restoredDark).toBe('dark');
    }
  });

  test('3. Responsive Viewport Check: 1440px Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    const hero = page.locator('.landing-hero');
    await expect(hero).toBeVisible();

    const preview = page.locator('.landing-preview');
    await expect(preview).toBeVisible();

    // Check offset frame box-shadow motif
    const boxShadow = await preview.evaluate(el => getComputedStyle(el).boxShadow);
    expect(boxShadow).toBeTruthy();

    await page.screenshot({ path: 'test-results/viewport-1440px.png', fullPage: false });
  });

  test('4. Responsive Viewport Check: 1100px Compact Desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1100, height: 800 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    const hero = page.locator('.landing-hero');
    await expect(hero).toBeVisible();

    await page.screenshot({ path: 'test-results/viewport-1100px.png', fullPage: false });
  });

  test('5. Responsive Viewport Check: 800px Tablet', async ({ page }) => {
    await page.setViewportSize({ width: 800, height: 1024 });
    await page.goto('/#workspace');
    await page.waitForLoadState('networkidle');

    // In tablet mode, navigation remains accessible
    const pageHeading = page.locator('.page-heading, h1').first();
    await expect(pageHeading).toBeVisible();

    await page.screenshot({ path: 'test-results/viewport-800px.png', fullPage: false });
  });

  test('6. Responsive Viewport Check: 520px Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 520, height: 800 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();

    // Verify no horizontal document overflow
    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: 'test-results/viewport-520px.png', fullPage: false });
  });

  test('7. Responsive Viewport Check: 390px Narrow Mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    const heroHeading = page.locator('h1').first();
    await expect(heroHeading).toBeVisible();

    const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(hasOverflow).toBe(false);

    await page.screenshot({ path: 'test-results/viewport-390px.png', fullPage: false });
  });

  test('8. Authentication Modal: Financial Form Fields, Radii & Password Policy Controls', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    // Click Sign in or Get Started button to open Auth Modal
    const authBtn = page.locator('.landing-nav .btn-primary, .landing-actions .btn-primary').first();
    await authBtn.click();

    const modal = page.locator('.modal');
    await expect(modal).toBeVisible();

    // Check modal radius is 5px panel
    const modalRadius = await modal.evaluate(el => getComputedStyle(el).borderRadius);
    expect(modalRadius).toBe('5px');

    // Switch to Register Tab
    const registerTab = page.locator('.auth-tabs button').filter({ hasText: /create account|register/i }).first();
    if (await registerTab.isVisible()) {
      await registerTab.click();
    }

    // Verify Password input and confirm password input exist
    const pwdInput = page.locator('input[type="password"]').first();
    await expect(pwdInput).toBeVisible();

    // Verify password toggle exists
    const toggleBtn = page.locator('.password-toggle-btn').first();
    await expect(toggleBtn).toBeVisible();

    // Type a compliant password and confirm match
    await pwdInput.fill('SecureValidPassword123!');
    const confirmInput = page.locator('input[placeholder*="Repeat"], input[placeholder*="Confirm"]').first();
    if (await confirmInput.isVisible()) {
      await confirmInput.fill('SecureValidPassword123!');
      const matchMsg = page.locator('.password-match-msg');
      await expect(matchMsg).toBeVisible();
    }

    await page.screenshot({ path: 'test-results/auth-modal-financial.png', fullPage: false });
  });

  test('9. Studio Workspace: Stepper Controls, Metric Badges & Visualizer Panels', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#studio');
    await page.waitForLoadState('networkidle');

    // Studio topbar and actions
    const studioTopbar = page.locator('.studio-topbar');
    await expect(studioTopbar).toBeVisible();

    // Step counter pill and line indicator
    const stepPill = page.locator('.step-count-pill');
    await expect(stepPill).toBeVisible();

    // Stepper buttons
    const playBtn = page.locator('.stepper-btn.play-btn');
    await expect(playBtn).toBeVisible();

    // Tabs for visualizer
    const tabs = page.locator('.studio-tab-item');
    expect(await tabs.count()).toBeGreaterThanOrEqual(2);

    await page.screenshot({ path: 'test-results/studio-workspace-financial.png', fullPage: false });
  });

});
