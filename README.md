# @parcha/agent-action

A split button that remembers a user's coding agent and hands it the right
prompt. Built from the AgentRun console's **Use your agent** interaction, with
product-specific prompts and styling left to you.

- Open Codex, Claude Code, or Cursor with a prefilled prompt.
- Keep CLI destinations distinct and copy prompts into existing sessions.
- Remember the choice across buttons and visits, or control it yourself.
- Use an optional theme, your own Tailwind classes, or the framework-independent core.
- Add product actions such as **API playground** without changing the component.

**Release status:** this is a release candidate; it has not been published to
npm. The package is Apache-2.0 licensed. React integrations support React 18.3
and 19. Tailwind is not a dependency.

## Install

To try the local release candidate, run `npm pack` in this repository, then
install the generated archive in your application:

```sh
npm install /path/to/parcha-agent-action-0.1.0.tgz
```

After publication, the registry install will be:

```sh
npm install @parcha/agent-action
```

Your React application must also have `react` and `react-dom` installed.

## Quick start

```tsx
import { AgentAction } from '@parcha/agent-action';
import '@parcha/agent-action/styles.css';

export function BuildAction({ description }: { description: string }) {
  return (
    <AgentAction
      label="Build an agent"
      prompt={`Help me build an agent for this task:\n${description}`}
      actions={[
        { id: 'playground', label: 'API playground', href: '/playground' },
      ]}
    />
  );
}
```

On first use, the main button opens the chooser. Selecting an agent saves the
choice; it does **not** send or launch the prompt. The main button then opens
the chosen desktop app or copies the prompt for a CLI. **Copy prompt** is
always available in the menu.

Desktop links prefill the agent's composer. The user still reviews and sends
the prompt in that app. Browser navigation cannot confirm that a native app
opened; see [provider support](docs/PROVIDER_SUPPORT.md) for limits and sources.

## Style with Tailwind

Skip the `styles.css` import and pass classes for each slot. These classes live
in your application source, so your existing Tailwind build discovers them;
you do not need to scan this package or install a Tailwind plugin.

```tsx
import { AgentAction } from '@parcha/agent-action';

const button =
  'inline-flex h-9 items-center gap-2 border border-zinc-300 bg-white ' +
  'text-sm text-zinc-950 hover:bg-zinc-100 focus-visible:outline ' +
  'focus-visible:outline-2 disabled:opacity-50 ' +
  'dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100';

export function StyledAction({ prompt }: { prompt: string }) {
  return (
    <AgentAction
      prompt={prompt}
      classNames={{
        root: 'inline-flex',
        action: `${button} rounded-l-lg px-3`,
        trigger: `${button} rounded-r-lg border-l-0 px-2`,
        menu: 'z-50 min-w-56 rounded-xl border border-zinc-200 bg-white p-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900',
        item: 'flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-950 outline-none data-[highlighted]:bg-zinc-100 data-[disabled]:opacity-50 dark:text-zinc-100 dark:data-[highlighted]:bg-zinc-800',
        icon: 'size-4 shrink-0',
        check: 'ml-auto size-4',
        separator: 'my-1 h-px bg-zinc-200 dark:bg-zinc-700',
        dialogOverlay: 'fixed inset-0 z-50 bg-black/40',
        dialog: 'fixed left-1/2 top-1/2 z-50 w-[min(90vw,36rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 text-zinc-950 shadow-xl dark:bg-zinc-900 dark:text-zinc-100',
        dialogTitle: 'text-lg font-semibold',
        dialogDescription: 'my-3 text-sm',
        textarea: 'min-h-48 w-full rounded-lg border bg-transparent p-3 font-mono text-sm',
        close: `${button} mt-3 rounded-lg px-3`,
      }}
    />
  );
}
```

The menu and clipboard fallback dialog use Radix primitives for keyboard
navigation, focus management, and positioning. They render in portals, so
classes on the outer wrapper alone will not style them. Set the relevant
`classNames` slots. For dark mode, put the theme class on `html` or `body` so
portal content inherits it.

Available slots:

| Area | Slots |
| --- | --- |
| Button | `root`, `action`, `trigger`, `icon`, `status` |
| Menu | `menu`, `item`, `separator`, `check` |
| Manual copy dialog | `dialogOverlay`, `dialog`, `dialogTitle`, `dialogDescription`, `textarea`, `close` |

The component does not import a stylesheet. The optional default theme is
scoped to the component and does not add a global CSS reset. You can also
style its `data-*` states using ordinary CSS. Default styles live in the
`components` CSS layer, so Tailwind utilities and unlayered custom CSS can
override them even when the optional stylesheet loads later.

To adjust the default theme, load your overrides after `styles.css` and target
the button and its portal surfaces together:

```css
.aa-root, .aa-menu, .aa-dialog {
  --aa-radius: 0.75rem;
  --aa-background: #18181b;
  --aa-foreground: #fafafa;
  --aa-muted: #a1a1aa;
  --aa-border: #3f3f46;
  --aa-hover: #27272a;
}
```

## Providers and icons

The default provider IDs are `codex`, `codex-cli`, `claude`, `claude-cli`,
`cursor`, and `other`. Labels distinguish desktop applications from CLIs.
Pass `providers` to reorder, filter, rename, or add destinations:

```tsx
import { AgentAction } from '@parcha/agent-action';
import { defaultProviders, type AgentProvider } from '@parcha/agent-action/core';

const providers: readonly AgentProvider[] = [
  ...defaultProviders.filter((provider) => provider.id !== 'other'),
  {
    id: 'internal-assistant',
    label: 'Our assistant',
    kind: 'app',
    getUrl: (prompt) =>
      `https://assistant.example.com/new?prompt=${encodeURIComponent(prompt)}`,
  },
];

export function ProductAction({ prompt }: { prompt: string }) {
  return (
    <AgentAction
      prompt={prompt}
      providers={providers}
      renderIcon={(provider) => (
        <span aria-hidden="true">{provider?.kind === 'cli' ? '>_' : '↗'}</span>
      )}
    />
  );
}
```

Provider IDs must be stable and unique. Omitting `getUrl`, or returning `null`,
uses the clipboard. URL values are checked before navigation; unsupported
schemes fall back to copy. Supply your own icon components or assets with
`renderIcon`. No provider brand assets are bundled.

## Remember or control the choice

By default, all instances on the same origin use the storage key
`parcha.agent-action.preference.v1`. Changes synchronize between mounted
buttons and browser tabs. If storage is unavailable, the choice still works
in memory for the current page. Only the provider ID is stored.

Use `storageKey="my-product.preferred-agent.v1"` to isolate preferences,
`storageKey={null}` for per-instance memory, or `defaultValue="claude-cli"`
for an initial choice when no stored choice exists. If the remembered provider
is no longer offered, the chooser opens again.

For an account-level preference, control the value yourself:

```tsx
import { useState } from 'react';
import { AgentAction } from '@parcha/agent-action';

function ControlledAction({ prompt }: { prompt: string }) {
  const [agent, setAgent] = useState<string | null>(null);
  return <AgentAction prompt={prompt} value={agent} onValueChange={setAgent} />;
}
```

Controlled mode does not write to local storage. Your application owns
persistence. The exported `useAgentPreference` hook exposes the same selection
behavior as `{ value, provider, setValue }` for custom controls.

## Events and custom launchers

`onResult` receives `{ status, providerId }`. Status is `copied`,
`launch-requested`, `manual-copy`, or `error`. It does not contain the prompt
or URL. `launch-requested` means browser navigation was requested, not that
the app opened or a run started.

For an application-owned launcher, supply `onHandoff`. It receives the
`Handoff` object, including the prompt, and **replaces** the built-in copy or
navigation action. It can return a promise. Your launcher owns success
feedback; a rejected callback reports `error`.

```tsx
<AgentAction
  prompt={prompt}
  onHandoff={(handoff) => myLauncher.open(handoff)}
/>
```

This callback is an integration point, not a bundled terminal launcher. Do
not log its prompt or pass it to telemetry by default.

## Framework-independent core

Import the `/core` entry point to build your own Vue, Svelte, vanilla JS, or
server integration. It does not import React or access browser globals at
module load time.

```ts
import { createHandoff, defaultProviders } from '@parcha/agent-action/core';

const provider = defaultProviders.find((item) => item.id === 'cursor')!;
const handoff = createHandoff(provider, 'Explain the failing test.');

if (handoff.kind === 'link') {
  // Render an explicit user-activated link with href={handoff.url}.
} else {
  // Offer clipboard copy of handoff.prompt, with manual copy on failure.
}
```

`createHandoff` only returns a plan. It never performs navigation, writes to
the clipboard, installs anything, or sends an API request. The core also
exports `createPreferenceStore` and `getPreferenceStore` for custom controls.

## Supply your product's instructions

Keep onboarding, skills, MCP, API details, and authentication in your product's
prompt. For example:

```ts
const prompt = `
Help me create a workflow in Example Product.
Read https://example.com/docs/agent-skill.md for the current instructions.
First check whether I have connected its MCP server or configured local API authentication.
If setup is missing, walk me through it using those instructions.
Keep credentials in the local credential store, never in this prompt.
Then ask me for any missing workflow requirements before proposing the configuration.
`;
```

Replace the example URL with your public skill documentation. The widget
does not download skills or verify authentication. The user's coding agent
handles the setup when they send the prompt. Avoid including tokens, keys,
or private credentials in a deep link or prompt.

## SSR and component options

Server rendering does not read local storage. A remembered choice is applied
after hydration. In a React Server Components application, use `AgentAction`
inside a client boundary; generate plain prompt data on the server if needed.

Besides the options shown above, `disabled` disables the action and chooser,
`compact` renders the main action without a visible label, and `maxUrlLength`
sets the encoded URL limit (default `8000`). `className` styles the outer
wrapper. Give every instance a useful `label`, especially in compact mode.

Additional menu actions accept `{ id, label, icon?, href?, onSelect?, disabled? }`.
Use `href` for navigation or `onSelect` for a product-owned interaction.
Choosing these actions does not change the remembered agent.

## Develop and verify

Use Node 24 (pinned in `.nvmrc`).

```sh
npm ci
npm run check
npm run test:package
npm run test:browser
npm run dev
```

`check` runs TypeScript checks, tests, and the distribution build.
`test:package` installs the tarball into clean React 18 and 19 consumers and
checks ESM, CommonJS, types, SSR, and the dependency-free core import.
`test:browser` uses an installed Chrome to check interactions, mobile layout,
and compiled Tailwind styling. `dev` starts the example application's server;
visit `/tailwind.html` for a version with only Tailwind classes.
`npm pack` builds an installable archive without publishing it. Native app
launch behavior needs a separate manual check on each supported desktop platform.

## License

[Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution. Provider
names belong to their respective owners; this package is not affiliated with
or endorsed by those providers.
