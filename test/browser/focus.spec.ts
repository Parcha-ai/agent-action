import { expect, test, type Locator } from '@playwright/test';

async function expectUnifiedFocus(group: Locator) {
  await expect(group).toHaveCSS('outline-style', 'solid');
  await expect(group).toHaveCSS('outline-width', '2px');
  await expect(group).toHaveCSS('outline-offset', '3px');
  await expect(group.locator('.aa-action')).toHaveCSS('outline-style', 'none');
  await expect(group.locator('.aa-trigger')).toHaveCSS('outline-style', 'none');
}

test('keyboard focus outlines the entire split button and identifies the active half', async ({ page }) => {
  await page.goto('/');
  const group = page.locator('.composer .aa-root');
  const action = group.locator('.aa-action');
  const trigger = group.locator('.aa-trigger');
  await page.getByLabel('What do you want to build?').focus();
  await page.keyboard.press('Tab');
  await expect(action).toBeFocused();
  await expectUnifiedFocus(group);
  await expect(group).toHaveCSS('border-radius', '8px');
  await expect(action).toHaveCSS('background-color', 'rgb(48, 52, 60)');
  await expect(trigger).toHaveCSS('background-color', 'rgb(32, 34, 39)');

  await page.keyboard.press('Tab');
  await expect(trigger).toBeFocused();
  await expectUnifiedFocus(group);
  await expect(trigger).toHaveCSS('background-color', 'rgb(48, 52, 60)');
  await expect(action).toHaveCSS('background-color', 'rgb(32, 34, 39)');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('menu')).toBeVisible();
  await expect(group).toHaveCSS('outline-style', 'none');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expectUnifiedFocus(group);
  await page.keyboard.press('Shift+Tab');
  await expect(action).toBeFocused();
  await expectUnifiedFocus(group);
});

test('selecting an agent never leaves an arrow-only focus outline', async ({ page }) => {
  await page.goto('/showcase.html');
  const trigger = page.getByRole('button', { name: 'Choose coding agent for Run workflow', exact: true });
  const group = page.getByRole('region', { name: 'Run a workflow', exact: true }).locator('.aa-root');
  await trigger.click();
  await page.getByRole('menuitemradio', { name: 'Cursor', exact: true }).click();
  await expect(trigger).toBeFocused();
  await expectUnifiedFocus(group);
  await expect(group).toHaveCSS('border-radius', '10px');
  await page.screenshot({ path: '.evidence/agent-action-unified-focus.png', animations: 'disabled' });
});

for (const defaults of [false, true]) {
  test(`Tailwind keeps a single group focus outline ${defaults ? 'with' : 'without'} optional styles`, async ({ page }) => {
    await page.goto(`/tailwind.html${defaults ? '?defaults' : ''}`);
    if (defaults) await page.waitForFunction(() => [...document.querySelectorAll('style')].some(style => style.textContent?.includes('.aa-action')));
    const group = page.locator('.aa-root');
    const action = group.locator('.aa-action');
    const trigger = group.locator('.aa-trigger');
    await page.keyboard.press('Tab');
    await expect(action).toBeFocused();
    await expect(group).toHaveCSS('outline-style', 'solid');
    await expect(group).toHaveCSS('outline-width', '2px');
    await expect(group).toHaveCSS('outline-offset', '2px');
    await expect(group).toHaveCSS('border-radius', '12px');
    await expect(action).toHaveCSS('outline-style', 'none');
    await page.keyboard.press('Tab');
    await expect(trigger).toBeFocused();
    await expect(group).toHaveCSS('outline-style', 'solid');
    await expect(trigger).toHaveCSS('outline-style', 'none');
  });
}
