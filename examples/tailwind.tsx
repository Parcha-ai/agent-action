import { createRoot } from 'react-dom/client';
import { AgentAction } from '../src/index';
// Intentionally no @parcha/agent-action/styles.css: Tailwind owns every slot.
import './tailwind.css';
if (new URLSearchParams(window.location.search).has('defaults')) {
  void import('../src/styles.css');
}
createRoot(document.getElementById('root')!).render(
  <main className="min-h-screen bg-slate-50 p-8 text-slate-900 sm:p-16">
    <h1 className="mb-3 text-3xl font-semibold tracking-tight">Bring your own styles.</h1>
    <p className="mb-8 max-w-xl text-slate-600">An unstyled Agent Action component, styled entirely with Tailwind CSS.</p>
    <AgentAction label="Build with your agent" prompt="Help me build a product using my existing tools." classNames={{
      root: 'inline-flex items-stretch text-sm',
      action: 'inline-flex items-center gap-2 rounded-l-xl border border-indigo-700 bg-indigo-600 px-5 py-3 font-semibold text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
      trigger: 'inline-flex items-center justify-center rounded-r-xl border border-l-0 border-indigo-700 bg-indigo-600 px-3 text-white hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
      menu: 'z-50 min-w-60 max-h-[var(--radix-dropdown-menu-content-available-height)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 text-sm text-slate-800 shadow-xl',
      item: 'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none data-highlighted:bg-indigo-50 data-disabled:opacity-40',
      icon: 'inline-flex h-5 w-5 shrink-0 items-center justify-center',
      check: 'ml-auto text-indigo-600',
      separator: 'my-1 h-px bg-slate-200',
      dialogOverlay: 'fixed inset-0 z-50 bg-black/30',
      dialog: 'fixed top-1/2 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl bg-white p-6 text-slate-900 shadow-xl',
      dialogTitle: 'mb-2 text-lg font-semibold',
      dialogDescription: 'mb-4 text-sm text-slate-600',
      textarea: 'w-full rounded-lg border border-slate-300 p-3 font-mono text-sm',
      close: 'mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2',
    }} />
  </main>
);
