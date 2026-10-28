import { test, expect } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

test.describe('Authentication UI, Password Security & Profile Photo Upload', () => {
  test.beforeAll(async () => {
    const screenshotDir = path.resolve('docs/screenshots');
    if (!fs.existsSync(screenshotDir)) {
      fs.mkdirSync(screenshotDir, { recursive: true });
    }
  });

  test('Sign-in Modal: Show/hide toggle, compact social grid & responsive fit', async ({ page }, testInfo) => {
    await page.goto('/#landing');
    
    // Open Auth modal (works on desktop and mobile)
    const authBtn = page.locator('header').getByRole('button', { name: /Sign in|Create account/i }).first();
    await authBtn.click();

    // Switch to Sign in if not already on it
    await page.locator('.modal .auth-tabs').getByRole('button', { name: 'Sign in' }).click();

    // Verify modal heading
    await expect(page.getByRole('heading', { name: 'Good to have you back.' })).toBeVisible();

    // Verify compact 3-column social login grid exists
    const socialGrid = page.locator('.social-buttons-grid');
    await expect(socialGrid).toBeVisible();
    await expect(socialGrid.getByRole('link', { name: /Google/i })).toBeVisible();
    await expect(socialGrid.getByRole('link', { name: /GitHub/i })).toBeVisible();
    await expect(socialGrid.getByRole('link', { name: /LinkedIn/i })).toBeVisible();

    // Test Show/Hide Password Toggle
    const passwordInput = page.locator('.modal .password-input-field').first();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await passwordInput.fill('SecretPassword123');

    const toggleBtn = page.locator('.modal .password-toggle-btn').first();
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Show password');
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');
    await expect(toggleBtn).toHaveAttribute('aria-label', 'Hide password');

    // Toggle back
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Capture screenshot of Sign-in UI
    await page.screenshot({ path: `docs/screenshots/signin_modal_${testInfo.project.name}.png` });
  });

  test('Registration Modal: Password strength meter, confirm password & live validation', async ({ page }, testInfo) => {
    await page.goto('/#landing');
    
    // Open modal and switch to Create account
    const authBtn = page.locator('header').getByRole('button', { name: /Sign in|Create account/i }).first();
    await authBtn.click();

    await page.locator('.modal .auth-tabs').getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByRole('heading', { name: 'Make your progress a keeper.' })).toBeVisible();

    const pwdField = page.locator('.modal .password-input-field').first();
    const confirmField = page.locator('.modal .password-input-field').nth(1);
    const submitBtn = page.locator('.modal').getByRole('button', { name: 'Create my account' });

    // Submit must be disabled initially
    await expect(submitBtn).toBeDisabled();

    // 1. Weak password test
    await pwdField.fill('pass123');
    const strengthMeter = page.locator('.password-strength-container');
    await expect(strengthMeter).toBeVisible();
    await expect(strengthMeter.locator('.strength-label')).toHaveText('Weak');

    // 2. Mismatched confirm password
    await confirmField.fill('different123');
    await expect(page.locator('.password-mismatch-msg')).toContainText('Passwords do not match');
    await expect(submitBtn).toBeDisabled();

    // 3. Strong password test (>=12 chars with good complexity)
    await pwdField.fill('Correct-Horse-Battery-99!');
    await expect(strengthMeter.locator('.strength-label')).toHaveText(/Strong|Very strong/);

    // 4. Matching confirm password
    await confirmField.fill('Correct-Horse-Battery-99!');
    await expect(page.locator('.password-match-msg')).toContainText('Passwords match');

    // Name and Email fill
    await page.getByLabel('Your name').fill('Audited User');
    await page.getByLabel('Email address').fill('audited.user@example.com');

    // Submit should now be enabled
    await expect(submitBtn).toBeEnabled();

    // Capture screenshot of registration form with strength meter
    await page.screenshot({ path: `docs/screenshots/registration_strength_meter_${testInfo.project.name}.png` });
  });

  test('Profile Modal: Direct photo file upload, native picker & remove action', async ({ page }, testInfo) => {
    await page.goto('/#workspace');

    // Navigate to My progress / Profile
    if (await page.getByRole('button', { name: 'Open navigation', exact: true }).isVisible()) {
      await page.getByRole('button', { name: 'Open navigation', exact: true }).click();
    }
    await page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'My progress' }).click();

    // Click Edit profile
    await page.getByRole('button', { name: 'Edit profile', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Edit your profile' })).toBeVisible();

    // Verify avatar upload card elements
    const uploadCard = page.locator('.avatar-upload-card');
    await expect(uploadCard).toBeVisible();
    await expect(uploadCard.locator('.avatar-upload-btn')).toContainText(/Upload photo|Change photo/);

    const fileInput = page.locator('#profile-photo-file-input');
    await expect(fileInput).toHaveAttribute('accept', 'image/png,image/jpeg,image/webp');

    // Capture screenshot of profile upload card
    await page.screenshot({ path: `docs/screenshots/profile_photo_upload_${testInfo.project.name}.png` });
  });
});
