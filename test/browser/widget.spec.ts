import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      writeText: async (text: string) => { (window as unknown as { copied: string }).copied = text; },
    } });
  });
  await page.goto('/');
});

test('choice synchronizes across actions and survives reload; copies exact task prompt', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose coding agent for Build an agent' }).click();
  await page.getByRole('menuitemradio', { name: 'Claude Code CLI' }).click();
  await expect(page.locator('[title="Copy prompt for Claude Code CLI"]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Build an agent', exact: true }).click();
  await expect(page.getByRole('status').first()).toHaveText('Prompt copied');
  expect(await page.evaluate(() => (window as unknown as { copied: string }).copied)).toBe(await page.getByLabel('What do you want to build?').inputValue());
  await page.reload();
  await expect(page.locator('[title="Copy prompt for Claude Code CLI"]')).toHaveCount(4);
  await page.getByRole('button', { name: 'Choose coding agent for Query data' }).click();
  await expect(page.getByRole('menuitemradio', { name: 'Claude Code CLI' })).toHaveAttribute('aria-checked', 'true');
  await page.getByRole('menuitemradio', { name: 'Codex app' }).click();
  await expect(page.getByRole('link', { name: 'Build an agent', exact: true })).toHaveAttribute('href', /^codex:\/\/new\?prompt=/);
});

test('extra product actions and keyboard navigation work', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Choose coding agent for Build an agent' });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('End');
  await expect(page.getByRole('menuitem', { name: 'Copy prompt' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status').first()).toHaveText('Prompt copied');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('menuitem', { name: 'API playground' }).click();
  await expect(page.getByRole('heading', { name: 'Your playground goes here' })).toBeVisible();
});

test('clipboard denied shows selectable prompt and restores focus', async ({ page }) => {
  await page.evaluate(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => Promise.reject(new Error('Denied')) } }); });
  await page.getByRole('button', { name: 'Choose coding agent for Build an agent' }).click();
  await page.getByRole('menuitem', { name: 'Copy prompt' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Prompt to copy' })).toBeFocused();
  await expect(page.getByRole('textbox', { name: 'Prompt to copy' })).toHaveValue(await page.getByLabel('What do you want to build?').inputValue());
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Choose coding agent for Build an agent' })).toBeFocused();
});

test('menu stays in the viewport on mobile and carries custom theme into its portal', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Choose coding agent for Use your agent' }).click();
  const menu = page.getByRole('menu');
  const bounds = await menu.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await expect(menu).toHaveCSS('background-color', 'rgb(194, 239, 203)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('desktop preview', async ({ page }) => {
  await page.getByRole('button', { name: 'Choose coding agent for Build an agent' }).click();
  await page.getByRole('menuitemradio', { name: 'Claude Code CLI' }).click();
  await page.getByRole('button', { name: 'Choose coding agent for Build an agent' }).click();
  await page.screenshot({ path: '.evidence/agent-action-desktop.png', fullPage: true, animations: 'disabled' });
});

test('works with compiled Tailwind utilities and no package stylesheet', async ({ page }) => {
  await page.goto('/tailwind.html');
  const action = page.getByRole('button', { name: 'Build with your agent', exact: true });
  await expect(action).toHaveCSS('padding-left', '20px');
  await expect(action).toHaveCSS('border-top-left-radius', '12px');
  await page.getByRole('button', { name: 'Choose coding agent for Build with your agent' }).click();
  await expect(page.getByRole('menu')).toHaveCSS('border-radius', '12px');
  await page.getByRole('menuitemradio', { name: 'Codex CLI' }).click();
  await action.click();
  await expect(page.getByRole('status')).toHaveText('Prompt copied');
  await page.screenshot({ path: '.evidence/agent-action-tailwind.png', animations: 'disabled' });
});

test('Tailwind utilities override optional defaults even when defaults load later', async ({ page }) => {
  await page.goto('/tailwind.html?defaults');
  await page.waitForFunction(() => [...document.querySelectorAll('style')].some(style => style.textContent?.includes('.aa-action')));
  const action = page.getByRole('button', { name: 'Build with your agent', exact: true });
  await expect(action).toHaveCSS('padding-left', '20px');
  await expect(action).toHaveCSS('border-top-left-radius', '12px');
  await page.getByRole('button', { name: 'Choose coding agent for Build with your agent' }).click();
  await expect(page.getByRole('menu')).toHaveCSS('border-radius', '12px');
});
