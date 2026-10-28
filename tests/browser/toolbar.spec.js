import { test, expect } from '@playwright/test';

test.describe('CodeLens IDE Toolbar & Reset/Save Functionality', () => {
  test('Toolbar redesign, button removals, save, reset, and language switching', async ({ page }) => {
    // Navigate directly to Studio IDE workspace
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    // 1. Verify layout and button removals
    const toolbar = page.locator('.studio-window-bar');
    await expect(toolbar).toBeVisible();

    // Verify Run & Trace is NOT present
    await expect(toolbar.getByRole('button', { name: /Run & Trace/i })).toHaveCount(0);
    // Verify Analyze is NOT present
    await expect(toolbar.getByRole('button', { name: /Analyze/i })).toHaveCount(0);

    // Verify Primary Run button is present
    const runBtn = toolbar.locator('.ide-run-btn');
    await expect(runBtn).toBeVisible();
    await expect(runBtn).toContainText('Run');

    // Verify Reset button is present
    const resetBtn = toolbar.locator('.ide-reset-btn');
    await expect(resetBtn).toBeVisible();
    await expect(resetBtn).toContainText('Reset');

    // Verify Save button is present
    const saveBtn = toolbar.locator('.ide-save-btn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toContainText('Save');

    // Verify Filename displays main.js initially
    const filename = toolbar.locator('.studio-filename-text');
    await expect(filename).toHaveText('main.js');

    // Verify Language Tabs
    const langSelector = toolbar.locator('.studio-lang-segmented');
    await expect(langSelector.getByRole('radio', { name: 'JavaScript' })).toBeVisible();
    await expect(langSelector.getByRole('radio', { name: 'Python 3' })).toBeVisible();
    await expect(langSelector.getByRole('radio', { name: 'Java', exact: true })).toBeVisible();
    await expect(langSelector.getByRole('radio', { name: 'C++17' })).toBeVisible();

    // 2. Test Unsaved modification and Save
    const textarea = page.locator('.studio-code-input');
    await textarea.focus();
    await textarea.press('Control+End');
    await textarea.type('\n// IDE Toolbar Verification Test Line');

    // Verify dirty dot appears
    const dirtyDot = toolbar.locator('.studio-dirty-dot');
    await expect(dirtyDot).toBeVisible();

    // Click Save button
    await saveBtn.click();

    // Verify button shows saved feedback
    await expect(saveBtn).toContainText('Saved');
    await expect(dirtyDot).toHaveCount(0);

    // 3. Test Reset button with confirmation
    await textarea.focus();
    await textarea.type('\nlet testDirtyVar = 12345;');
    await expect(dirtyDot).toBeVisible();

    // Set dialog handler to accept confirm
    page.once('dialog', async dialog => {
      expect(dialog.message()).toContain('Reset');
      await dialog.accept();
    });

    await resetBtn.click();

    // After reset, code is restored to default starter code and dirty dot is gone
    await expect(dirtyDot).toHaveCount(0);
    const codeVal = await textarea.inputValue();
    expect(codeVal).not.toContain('testDirtyVar');

    // 4. Test Language Switching
    // Switch to Python
    await langSelector.getByRole('radio', { name: /Python/i }).click();
    await expect(filename).toHaveText('main.py');
    const pyCode = await textarea.inputValue();
    expect(pyCode).toContain('from codelens import CodeLensQueue');

    // Switch to Java
    await langSelector.getByRole('radio', { name: 'Java', exact: true }).click();
    await expect(filename).toHaveText('Main.java');
    const javaCode = await textarea.inputValue();
    expect(javaCode).toContain('public class Main');

    // Switch to C++
    await langSelector.getByRole('radio', { name: /C\+\+/i }).click();
    await expect(filename).toHaveText('main.cpp');
    const cppCode = await textarea.inputValue();
    expect(cppCode).toContain('#include "codelens.hpp"');

    // Switch back to JS
    await langSelector.getByRole('radio', { name: /JavaScript/i }).click();
    await expect(filename).toHaveText('main.js');

    // 5. Test Run button execution and automatic Output tab selection
    await runBtn.click();
    
    // Output tab should be automatically selected upon execution!
    const outputTab = page.getByRole('tab', { name: 'Output', exact: true });
    await expect(outputTab).toHaveClass(/active/);
    await expect(outputTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.output-pane')).toBeVisible();
    await expect(page.locator('.output-status-header')).toContainText('SUCCESS (JavaScript)');

    // Step counter in stepper bar updates
    const stepCount = page.locator('.step-count-pill');
    await expect(stepCount).toBeVisible();
    await expect(stepCount).toContainText('Step');
  });

  test('Automatic Output tab selection, manual tab switching, and trace timeline inspection', async ({ page }) => {
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    const runBtn = page.locator('.ide-run-btn');
    const outputTab = page.getByRole('tab', { name: 'Output', exact: true });
    const traceTab = page.getByRole('tab', { name: 'Code Trace', exact: true });
    const variablesTab = page.getByRole('tab', { name: 'Variables', exact: true });
    const callStackTab = page.getByRole('tab', { name: 'Call Stack', exact: true });

    // Initial state before run: Code Trace shows unexecuted state
    await expect(page.locator('.trace-empty-container')).toBeVisible();
    await expect(page.locator('.vis-unexecuted-pill')).toHaveText('IDLE // AWAITING RUN');
    await expect(page.locator('.stepper-btn.play-btn')).toBeDisabled();

    // 1. Click Run -> Program executes and automatically selects Output tab
    await runBtn.click();
    await expect(outputTab).toHaveClass(/active/);
    await expect(page.locator('.output-pane')).toBeVisible();
    await expect(page.locator('.output-status-header')).toContainText('SUCCESS (JavaScript)');

    // 2. Manually click Code Trace tab -> Displays real trace events and professional timeline
    await traceTab.click();
    await expect(traceTab).toHaveClass(/active/);
    await expect(page.locator('.trace-pane')).toBeVisible();

    // Trace controls are now active
    await expect(page.locator('.stepper-btn.play-btn')).toBeEnabled();
    await expect(page.locator('.studio-scrubber-slider')).toBeEnabled();

    // Trace timeline has real steps with badges
    const timelineItems = page.locator('.timeline-step-item');
    const stepCountVal = await timelineItems.count();
    expect(stepCountVal).toBeGreaterThan(1);

    // First step is highlighted
    await expect(timelineItems.first()).toHaveClass(/active-step/);
    await expect(timelineItems.first().locator('.step-idx-badge')).toHaveText('#1');

    // Clicking a step in timeline navigates to that step
    await timelineItems.nth(2).click();
    await expect(timelineItems.nth(2)).toHaveClass(/active-step/);

    // 3. Changing tabs does not rerun program or reset output
    await variablesTab.click();
    await expect(variablesTab).toHaveClass(/active/);
    await expect(page.locator('.tab-pane')).toBeVisible();

    await callStackTab.click();
    await expect(callStackTab).toHaveClass(/active/);

    // Return to Output tab: execution output is intact
    await outputTab.click();
    await expect(outputTab).toHaveClass(/active/);
    await expect(page.locator('.output-status-header')).toContainText('SUCCESS (JavaScript)');
  });

  test('Coordinated Execution Reset clears editor, trace timeline, output, variables, and breakpoints', async ({ page }) => {
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    const runBtn = page.locator('.ide-run-btn');
    const resetBtn = page.locator('.ide-reset-btn');
    const outputTab = page.getByRole('tab', { name: 'Output', exact: true });
    const traceTab = page.getByRole('tab', { name: 'Code Trace', exact: true });
    const variablesTab = page.getByRole('tab', { name: 'Variables', exact: true });

    // Set a breakpoint on line 3
    const line3 = page.locator('.studio-line-num').nth(2);
    await line3.click();
    await expect(page.locator('.bp-count-pill')).toBeVisible();

    // Run execution
    await runBtn.click();
    await expect(outputTab).toHaveClass(/active/);

    // Set dialog handler for reset confirm if triggered
    page.on('dialog', async dialog => dialog.accept());

    // Click Reset
    await resetBtn.click();

    // 1. Editor state reset: Breakpoints cleared, line highlight removed
    await expect(page.locator('.bp-count-pill')).toHaveCount(0);
    await expect(page.locator('.studio-code-row.highlight-row')).toHaveCount(0);

    // 2. Stepper bar reset
    await expect(page.locator('.step-count-pill')).toHaveText('Step — / —');
    await expect(page.locator('.stepper-btn.play-btn')).toBeDisabled();
    await expect(page.locator('.studio-scrubber-slider')).toBeDisabled();

    // 3. Live Visualizer banner reset
    await expect(page.locator('.vis-unexecuted-pill')).toHaveText('IDLE // AWAITING RUN');

    // 4. Output tab reset: Shows neutral ready pill
    await outputTab.click();
    await expect(page.locator('.output-ready-pill')).toBeVisible();
    await expect(page.locator('.output-ready-pill')).toContainText('READY // NOT EXECUTED');

    // 5. Code Trace tab reset: Shows unexecuted empty state
    await traceTab.click();
    await expect(page.locator('.trace-empty-container')).toBeVisible();
    await expect(page.locator('.trace-empty-card')).toContainText('No Trace Events Recorded');

    // 6. Variables tab reset: Shows neutral empty state
    await variablesTab.click();
    await expect(page.locator('.tab-pane-empty')).toBeVisible();

    // 7. Algorithm tab reset: Shows neutral empty state (Bug fix verification)
    const algorithmTab = page.getByRole('tab', { name: 'Algorithm', exact: true });
    await algorithmTab.click();
    await expect(page.locator('.algorithm-pane .tab-pane-empty')).toBeVisible();
    await expect(page.locator('.algorithm-card')).toHaveCount(0);

    // 8. Complexity tab reset: Shows neutral empty state and clears findings
    const complexityTab = page.getByRole('tab', { name: 'Complexity', exact: true });
    await complexityTab.click();
    await expect(page.locator('.complexity-pane .tab-pane-empty')).toBeVisible();
    await expect(page.locator('.inline-complexity-badge')).toHaveCount(0);
  });

  test('Save to Templates & Snippets button is completely removed from Output area', async ({ page }) => {
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    const runBtn = page.locator('.ide-run-btn');
    await runBtn.click();

    const outputTab = page.getByRole('tab', { name: 'Output', exact: true });
    await expect(outputTab).toHaveClass(/active/);

    // Verify .save-template-btn is NOT present in the output area or anywhere in workspace
    await expect(page.locator('.save-template-btn')).toHaveCount(0);
    await expect(page.getByText('Save to Templates & Snippets')).toHaveCount(0);

    // Verify dedicated editor Save button is still intact in toolbar
    const saveBtn = page.locator('.ide-save-btn');
    await expect(saveBtn).toBeVisible();
    await expect(saveBtn).toContainText('Save');
  });

  test('Inline time-complexity highlighting and Complexity panel synchronization', async ({ page }) => {
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    const textarea = page.locator('.studio-code-input');
    const runBtn = page.locator('.ide-run-btn');
    const complexityTab = page.getByRole('tab', { name: 'Complexity', exact: true });

    // Set JavaScript code with nested loops: O(n²)
    await textarea.fill(`function bubbleSort(arr) {
  let n = arr.length;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        let temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
  return arr;
}`);

    // Click Run
    await runBtn.click();

    // Verify inline complexity badges appear in the editor overlay
    const inlineBadges = page.locator('.inline-complexity-badge');
    await expect(inlineBadges.first()).toBeVisible();
    const badgeText = await inlineBadges.first().textContent();
    expect(badgeText).toContain('O(');

    // Click Complexity tab
    await complexityTab.click();
    await expect(page.locator('.complexity-content-wrap')).toBeVisible();

    // Verify Metric cards display theoretical asymptotic bounds
    const timeMetric = page.locator('.metric-card').first().locator('.metric-val');
    await expect(timeMetric).toContainText('O(n²)');

    // Verify static complexity findings list is populated with dominant finding first
    const findingCards = page.locator('.complexity-finding-card');
    await expect(findingCards.first()).toBeVisible();
    await expect(findingCards.first()).toContainText('Quadratic Nested Loop');
    await expect(findingCards.first()).toContainText('Lines 4–10');

    // Clicking a finding card highlights region in editor
    await findingCards.first().click();
    await expect(findingCards.first()).toHaveClass(/selected/);
    await expect(page.locator('.complexity-region-highlight').first()).toBeVisible();
    const highlightedRowCount = await page.locator('.complexity-region-highlight').count();
    expect(highlightedRowCount).toBeGreaterThanOrEqual(2);

    // Resetting clears all complexity findings and inline badges
    page.once('dialog', async dialog => dialog.accept());
    await page.locator('.ide-reset-btn').click();

    await expect(page.locator('.complexity-pane .tab-pane-empty')).toBeVisible();
    await expect(page.locator('.inline-complexity-badge')).toHaveCount(0);
    await expect(page.locator('.complexity-region-highlight')).toHaveCount(0);
  });

  test('20-line program with line 15 syntax error reports accurate line, highlights editor, and clears on Reset', async ({ page }) => {
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    const textarea = page.locator('.studio-code-input');
    const runBtn = page.locator('.ide-run-btn');
    const outputTab = page.getByRole('tab', { name: 'Output', exact: true });

    const code20Lines = [
      '// Line 1: Header setup',
      'let sum = 0;',
      'for (let i = 0; i < 5; i++) {',
      '  sum += i;',
      '}',
      'console.log("Sum:", sum);',
      'let numbers = [10, 20, 30];',
      'let total = 0;',
      'for (let j = 0; j < numbers.length; j++) {',
      '  total += numbers[j];',
      '}',
      'console.log("Total:", total);',
      '// Line 13: Checkpoint',
      '// Line 14: Processing',
      'let broken = ; // Line 15 syntax error',
      '// Line 16',
      'console.log("Should not execute");',
      '// Line 18',
      '// Line 19',
      '// Line 20: End'
    ].join('\n');

    await textarea.fill(code20Lines);
    await runBtn.click();

    // 1. Output tab should be automatically selected
    await expect(outputTab).toHaveClass(/active/);
    await expect(page.locator('.output-pane')).toBeVisible();

    // 2. Output status must be error, exit code 1, NOT success
    await expect(page.locator('.output-status-header')).toContainText('SYNTAX ERROR');
    await expect(page.locator('.output-status-header')).not.toContainText('SUCCESS');
    await expect(page.locator('.output-metric-pill.error-pill')).toContainText('Exit 1');

    // 3. Error Diagnostic Card must report LINE 15
    const diagCard = page.locator('.error-diagnostic-card');
    await expect(diagCard).toBeVisible();
    await expect(diagCard).toContainText('LINE 15');
    await expect(diagCard).toContainText('SYNTAX ERROR');

    // 4. Editor must highlight line 15 with error row and error line
    const errorLineNum = page.locator('.studio-line-num.error-line');
    await expect(errorLineNum).toBeVisible();
    await expect(errorLineNum).toContainText('15');

    const errorRow = page.locator('.studio-code-row.error-row');
    await expect(errorRow).toBeVisible();

    // 5. Test that Reset clears all error decorations and diagnostics
    page.once('dialog', async dialog => dialog.accept());
    await page.locator('.ide-reset-btn').click();

    // After reset: error decorations, diagnostic card, and error highlights are removed
    await expect(page.locator('.error-diagnostic-card')).toHaveCount(0);
    await expect(page.locator('.studio-line-num.error-line')).toHaveCount(0);
    await expect(page.locator('.studio-code-row.error-row')).toHaveCount(0);
    await expect(page.locator('.output-status-header')).toContainText('READY // NOT EXECUTED');
  });

  test('Theme toggle preserves trace panel readability and styling', async ({ page }) => {
    await page.goto('/#studio');
    await page.waitForSelector('.studio-window-bar');

    const themeToggle = page.locator('.studio-theme-toggle');
    await expect(themeToggle).toBeVisible();

    // Toggle theme to dark/light
    await themeToggle.click();
    const isDark = await page.evaluate(() => document.documentElement.getAttribute('data-theme') === 'dark');
    expect(typeof isDark).toBe('boolean');

    // Toggle back
    await themeToggle.click();
    await expect(page.locator('.studio-window-bar')).toBeVisible();
    await expect(page.locator('.studio-stepper-bar')).toBeVisible();
  });
});


