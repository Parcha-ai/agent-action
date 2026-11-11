# Release candidate: @parcha/agent-action 0.1.0

The package is prepared locally on `feat/extract-agent-action`. It has not been
published to npm or pushed to a remote repository.

## Verified

- TypeScript, distribution build, 39 core tests and 14 React tests pass.
- Seven real Chrome checks pass: preference sharing/reload, task-specific
  clipboard content, keyboard navigation, extra actions, manual-copy focus,
  mobile menu placement, themes, and compiled Tailwind with/without defaults.
- The actual tarball installs in clean React 18.3.1 and 19.2.0 projects.
  ESM, CommonJS, TypeScript, SSR and CSS exports pass. The core imports with
  no dependencies or browser globals. The React entry retains `use client`.
- Dependency audit reports zero vulnerabilities at preparation time.
- Official provider links and limitations are in `docs/PROVIDER_SUPPORT.md`.
  Desktop application launch has not been exercised on a native desktop.

## Try it

Install `parcha-agent-action-0.1.0.tgz` from this directory in a React project.
See `README.md` for the API. Run `npm run dev` for the example; the Tailwind-only
example is `/tailwind.html`.

The source uses Node 24, pinned in `.nvmrc`. Reproduce with:

```sh
npm ci --ignore-scripts
npm run check
npm run test:package
npm run test:browser
```

## Publish

`npm whoami` currently returns HTTP 401 on this machine. Restore npm
authentication with publish access to the `@parcha` scope; never put a token
in the repository or prompt. No publish was attempted.

Before publication, update the README's release-status/install wording, run
the checks above, then `npm pack` and inspect the archive. Publish the reviewed
archive with `npm publish ./parcha-agent-action-0.1.0.tgz --access public`.
After publication, verify a clean install of the registry version.

Product adoption can retain existing remembered choices by passing
`storageKey="agentrun.coding-agent.v1"`. Keep prompt construction and routing
in the product; replace its UI wrapper with `AgentAction`, pass its own icons
through `renderIcon`, and map Playground into `actions`.
