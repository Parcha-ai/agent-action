# @parcha/agent-action 0.1.0

Source repository: [Parcha-ai/agent-action](https://github.com/Parcha-ai/agent-action).
The package is Apache-2.0 licensed and maintained by
[AJ Asver](https://github.com/ajasver) at Parcha.

## Verified

The checks below were run locally. The repository includes an optional workflow
recipe in `docs/github-actions-check.yml`; GitHub Actions is not enabled.

- TypeScript, distribution build, 39 core tests and 14 React tests pass.
- Eleven real Chrome checks pass: preference sharing/reload, task-specific
  clipboard content, keyboard navigation, extra actions, manual-copy focus,
  mobile menu placement, themes, unified split-button focus, and compiled
  Tailwind with/without defaults.
- The actual tarball installs in clean React 18.3.1 and 19.2.0 projects.
  ESM, CommonJS, TypeScript, SSR and CSS exports pass. The core imports with
  no dependencies or browser globals. The React entry retains `use client`.
- Dependency audit reports zero vulnerabilities at preparation time.
- Official provider links and limitations are in `docs/PROVIDER_SUPPORT.md`.
  Desktop application launch has not been exercised on a native desktop.

## Try it

Install the release in a React project:

```sh
npm install @parcha/agent-action
```

For a local build, run `npm ci && npm pack` and install the generated archive.
See `README.md` for the API. Run `npm run dev` for the example; the Tailwind-only
example is `/tailwind.html` and the media showcase is `/showcase.html`.
The README includes a screenshot and two recordings of the actual component.
These media files stay out of the npm archive.

The source uses Node 24, pinned in `.nvmrc`. Reproduce with:

```sh
npm ci --ignore-scripts
npm run check
npm run test:package
npm run test:browser
```

## Publishing a release

Publishing requires npm authentication with access to the `@parcha` scope.
Never put a token in the repository or prompt. GitHub source publication does
not publish the npm package. Verify the registry version and a clean consumer
installation after publishing.

Before publication, run the checks above, then `npm pack` and inspect the archive. Publish the reviewed
archive with `npm publish ./parcha-agent-action-0.1.0.tgz --access public`.
After publication, verify a clean install of the registry version.

Product adoption can retain existing remembered choices by passing
`storageKey="agentrun.coding-agent.v1"`. Keep prompt construction and routing
in the product; replace its UI wrapper with `AgentAction`, pass its own icons
through `renderIcon`, and map Playground into `actions`.
