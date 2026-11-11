# Provider support

Verified against the official documentation on November 11, 2026. These links
prefill a composer; they do not submit a prompt or start a run.

| Provider ID | Default behavior | Official documentation |
| --- | --- | --- |
| `codex` | Opens `codex://new?prompt=<encoded prompt>`. | [Codex desktop commands](https://learn.chatgpt.com/docs/reference/commands) |
| `codex-cli` | Copies the complete prompt for an existing CLI session. | [Codex CLI commands](https://learn.chatgpt.com/docs/developer-commands?surface=cli) |
| `claude` | Opens `claude://code/new?q=<encoded prompt>`. | [Open Claude Desktop with a link](https://support.claude.com/en/articles/14729294-open-claude-desktop-with-a-link) |
| `claude-cli` | Copies the complete prompt for an existing CLI session. | [Claude Code CLI reference](https://code.claude.com/docs/en/cli-reference) |
| `cursor` | Opens `cursor://anysphere.cursor-deeplink/prompt?text=<encoded prompt>`. | [Cursor deeplinks](https://cursor.com/docs/reference/deeplinks) |
| `other` | Copies the complete prompt. | No external integration required. |

## URL lengths

The package defaults to an **8,000-character maximum for the complete encoded
URL**. This is a conservative package policy, not a shared provider limit.
Longer URLs fall back to copying the complete prompt; the package never
shortens the prompt to fit.

Cursor documents a 10,000-character URL limit. Claude documents truncation of
`q` at roughly 14,000 characters. The reviewed Codex documentation does not
state a maximum. Raising `maxUrlLength` is a consumer choice and may encounter
browser, operating-system, or provider limits. See the linked provider
references above.

## Native applications and CLI sessions

A desktop link needs a compatible installed application and its registered URL
handler. Browser or operating-system confirmation may appear. The package can
request navigation, but cannot confirm that the app opened or received the
prompt. Its success notification for this path means **handoff requested**.

The default CLI entries copy text. They do not invoke a shell, install a CLI, or
attach to a terminal. Applications that provide their own launcher can supply
an explicit handoff callback. Keep that integration separate from the built-in
desktop links; no browser-to-CLI URL protocol was documented in the provider
references reviewed here.

Native desktop launch behavior has **not** been exercised in this package's
headless test environment. Before releasing an integration, test its intended
browser, operating system, and agent version, including the case where the app
is missing.

## Clipboard fallback

Copying uses the browser Clipboard API. It needs a secure context and may be
refused by browser permissions. When automatic copying fails, the React
component presents selectable text for manual copying. A requested app launch
does not detect a missing app automatically; the menu's **Copy prompt** action
remains available. [Clipboard API reference](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)

## Optional provider customization

The default links only carry prompt text. Codex also documents `path` for a
local directory and `originUrl` for matching an existing workspace. Claude
supports `folder` and asks the user to confirm it. Cursor documents an HTTPS
alternative, `https://cursor.com/link/prompt?text=...`. Supply a custom
provider's `getUrl` when your application needs these options.

Only build links from application-controlled provider definitions. Prompt
contents are encoded as a value, never treated as a URL or executable command.
The built-in URL check accepts relative application routes, HTTP(S), and the
supported app protocols; use a callback for another launcher rather than
loosening that check.

## Skills, MCP, and authentication

Agent Action hands off text. Your application supplies the instructions to
read public skill documentation, check onboarding, connect an MCP server, or
use an API. The component does not install skills, auto-update files, manage
credentials, or verify authentication. A coding agent performs any requested
setup under its own permissions after the user sends the prompt.

Do not include API keys, tokens, or other credentials in prompt URLs. Provider
names identify destinations; this package includes no provider logo assets and
does not imply endorsement by those providers.
