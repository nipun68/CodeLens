import { test, expect } from '@playwright/test';

test.describe('Landing Visual Audit Screenshots & Responsive Validation', () => {
  test('Capture all sections of the landing page at 1440px desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    // 1. Top Hero Viewport
    await page.screenshot({ path: 'test-results/landing-hero-1440.png', fullPage: false });

    // Verify hero layout: heading and preview are visible and not overlapping
    const heading = page.locator('.landing-hero-heading');
    const preview = page.locator('.landing-preview');
    await expect(heading).toBeVisible();
    await expect(preview).toBeVisible();

    const headingBox = await heading.boundingBox();
    const previewBox = await preview.boundingBox();

    // Verify side-by-side on desktop (heading on left, preview on right)
    expect(headingBox.x).toBeLessThan(previewBox.x);

    // 2. How it works section
    const howItWorks = page.locator('#how-it-works');
    if (await howItWorks.isVisible()) {
      await howItWorks.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'test-results/landing-how-it-works-1440.png', fullPage: false });
    }

    // 3. Rhythm (Process) Section
    const rhythm = page.locator('#rhythm');
    if (await rhythm.isVisible()) {
      await rhythm.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'test-results/landing-rhythm-1440.png', fullPage: false });

      // Verify all 4 process cards exist
      for (let i = 0; i < 4; i++) {
        const card = page.locator(`#process-card-${i}`);
        await expect(card).toBeVisible();
      }
    }

    // 4. Loop Section (4-Phase Orbital Cards)
    const loop = page.locator('#loop');
    if (await loop.isVisible()) {
      await loop.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'test-results/landing-loop-1440.png', fullPage: false });
      
      const cards = page.locator('.four-phase-card-item');
      expect(await cards.count()).toBe(4);
    }

    // 5. Final CTA & Footer
    const footer = page.locator('footer');
    if (await footer.isVisible()) {
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(400);
      await page.screenshot({ path: 'test-results/landing-cta-footer-1440.png', fullPage: false });
    }

    // 6. Full Page
    await page.screenshot({ path: 'test-results/landing-fullpage-1440.png', fullPage: true });
  });

  test('Responsive verification: 1024px, 768px, 390px, 320px', async ({ page }) => {
    const viewports = [
      { name: 'laptop-1280', width: 1280, height: 800 },
      { name: 'tablet-landscape-1024', width: 1024, height: 768 },
      { name: 'tablet-768', width: 768, height: 1024 },
      { name: 'mobile-390', width: 390, height: 844 },
      { name: 'narrow-mobile-320', width: 320, height: 640 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto('/#landing');
      await page.waitForLoadState('networkidle');

      // Check no horizontal scrollbar overflow
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 2); // allowance of max 2px subpixel rounding

      // Capture hero and full page
      await page.screenshot({ path: `test-results/landing-hero-${vp.name}.png`, fullPage: false });
    }
  });

  test('Interactive controls verification', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/#landing');
    await page.waitForLoadState('networkidle');

    // 1. Audio toggle
    const sfxBtn = page.getByRole('button', { name: /toggle sound/i });
    if (await sfxBtn.isVisible()) {
      await sfxBtn.click();
      await expect(sfxBtn).toContainText(/sfx on/i);
    }

    // 2. Tab switching in hero workspace
    const algoTab = page.getByRole('tab', { name: /algorithm\.js/i });
    await algoTab.click();
    await expect(page.locator('.preview-editor')).toContainText('binarySearch');

    // 3. Process timeline step click
    const timelineNode = page.getByRole('tab', { name: /build a habit/i });
    if (await timelineNode.isVisible()) {
      await timelineNode.click();
      await expect(timelineNode).toHaveClass(/active-node/);
    }

    // 4. Mobile hamburger toggle
    await page.setViewportSize({ width: 390, height: 844 });
    const menuBtn = page.getByLabel('Toggle navigation menu');
    await expect(menuBtn).toBeVisible();
    await menuBtn.click();
    await expect(page.getByRole('navigation', { name: 'Mobile Navigation' })).toBeVisible();
  });
});
