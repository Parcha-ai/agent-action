import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createHandoff, defaultProviders, isSafeActionUrl, type AgentProvider, type Handoff } from './core';
import { useAgentPreference, type AgentPreferenceOptions } from './useAgentPreference';

export type AgentActionSlot = 'root' | 'action' | 'trigger' | 'menu' | 'item' | 'separator' | 'icon' | 'check' | 'status' | 'dialogOverlay' | 'dialog' | 'dialogTitle' | 'dialogDescription' | 'textarea' | 'close';
export interface AgentActionItem {
  id: string;
  label: ReactNode;
  href?: string;
  onSelect?: () => void;
  icon?: ReactNode;
  disabled?: boolean;
}
export interface AgentActionResult {
  status: 'copied' | 'launch-requested' | 'manual-copy' | 'error';
  providerId: string | null;
}
export interface AgentActionProps extends AgentPreferenceOptions {
  prompt: string;
  label?: string;
  className?: string;
  /** Applied to the root and portaled menu/dialog, including your CSS custom properties. */
  style?: CSSProperties;
  classNames?: Partial<Record<AgentActionSlot, string>>;
  renderIcon?: (provider: AgentProvider | null) => ReactNode;
  actions?: readonly AgentActionItem[];
  disabled?: boolean;
  compact?: boolean;
  maxUrlLength?: number;
  onResult?: (result: AgentActionResult) => void;
  /** Overrides launch/copy completely. The caller owns success feedback; rejection reports error. */
  onHandoff?: (handoff: Handoff) => void | Promise<void>;
}

function Glyph({ kind }: { kind: 'app' | 'cli' | 'clipboard' | 'chevron' | 'check' | 'close' }) {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
    {kind === 'chevron' ? <path d="m6 9 6 6 6-6" /> : kind === 'check' ? <path d="m5 12 4 4L19 6" /> : kind === 'close' ? <path d="m6 6 12 12M6 18 18 6" /> : kind === 'cli' ? <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3m6 0h4" /></> : kind === 'app' ? <><rect x="3" y="3" width="18" height="18" rx="4" /><path d="m9 8-4 4 4 4m6-8 4 4-4 4" /></> : <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>}
  </svg>;
}

function ProviderGlyph({ provider }: { provider: AgentProvider | null }) {
  const monogram = provider?.id === 'codex' || provider?.id === 'codex-cli' ? 'Cx'
    : provider?.id === 'claude' || provider?.id === 'claude-cli' ? 'Cl'
      : provider?.id === 'cursor' ? 'Cu' : null;
  if (!monogram) return <Glyph kind={provider?.kind ?? 'clipboard'} />;
  const cli = provider?.kind === 'cli';
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <rect x="2" y="2" width="20" height="20" rx={cli ? 3 : 6} stroke="currentColor" strokeWidth="1.4" />
    <text x="12" y={cli ? 11 : 15} fill="currentColor" textAnchor="middle" fontFamily="ui-sans-serif, system-ui, sans-serif" fontWeight="600" fontSize={cli ? 8 : 10}>{monogram}</text>
    {cli && <path d="m7 14 3 2-3 2m6 0h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />}
  </svg>;
}

const visuallyHidden = { position: 'absolute', width: 1, height: 1, padding: 0, margin: -1, overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', whiteSpace: 'nowrap', border: 0 } as const;

/** An unstyled split button. Import the optional stylesheet, or supply your own slot classes. */
export function AgentAction({ prompt, label = 'Use your agent', providers = defaultProviders, value, defaultValue, onValueChange, storageKey, className, style, classNames, renderIcon, actions = [], disabled = false, compact = false, maxUrlLength, onResult, onHandoff }: AgentActionProps) {
  const { provider, setValue } = useAgentPreference({ providers, value, defaultValue, onValueChange, storageKey });
  const [open, setOpen] = useState(false);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  const trigger = useRef<HTMLButtonElement>(null);
  const manualReturnFocus = useRef<HTMLElement | null>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const mounted = useRef(true);
  const attempt = useRef(0);
  const cx = (slot: AgentActionSlot) => ['aa-' + slot, classNames?.[slot], slot === 'root' ? className : undefined].filter(Boolean).join(' ');
  const icon = (item: AgentProvider | null) => <span className={cx('icon')} data-provider={item?.id} aria-hidden="true">{renderIcon ? renderIcon(item) : <ProviderGlyph provider={item} />}</span>;
  const handoff = provider ? createHandoff(provider, prompt, maxUrlLength) : null;
  const title = provider ? handoff?.kind === 'link' ? `Open in ${provider.label}` : `Copy prompt for ${provider.label}` : 'Choose your coding agent';

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; attempt.current++; }; }, []);
  useEffect(() => { attempt.current++; setStatus(''); setManualPrompt(null); }, [prompt, provider?.id]);
  useEffect(() => { if (disabled) { attempt.current++; setOpen(false); setManualPrompt(null); } }, [disabled]);
  useEffect(() => {
    if (!status) return;
    const timeout = setTimeout(() => setStatus(''), 2500);
    return () => clearTimeout(timeout);
  }, [status]);

  const copy = async (returnFocus: HTMLElement | null = trigger.current) => {
    const current = ++attempt.current;
    const providerId = provider?.id ?? null;
    setOpen(false);
    try {
      await navigator.clipboard.writeText(prompt);
      if (!mounted.current || current !== attempt.current) return;
    } catch {
      if (!mounted.current || current !== attempt.current) return;
      manualReturnFocus.current = returnFocus;
      setManualPrompt(prompt);
      onResult?.({ status: 'manual-copy', providerId });
      return;
    }
    setStatus('Prompt copied');
    onResult?.({ status: 'copied', providerId });
  };
  const customHandoff = async (plan: Handoff) => {
    const current = ++attempt.current;
    try { await onHandoff?.(plan); }
    catch {
      if (!mounted.current || current !== attempt.current) return;
      setStatus('Could not hand off the prompt. Try Copy prompt.');
      onResult?.({ status: 'error', providerId: plan.providerId });
    }
  };
  const actionContent = <>{icon(provider)}<span style={compact ? visuallyHidden : undefined}>{status === 'Prompt copied' ? 'Copied' : label}</span></>;

  return <div className={cx('root')} style={style} data-provider={provider?.id} data-compact={compact || undefined} data-disabled={disabled || undefined}>
    {handoff?.kind === 'link' && !disabled && !onHandoff
      ? <a className={cx('action')} href={handoff.url} title={title} aria-label={compact ? label : undefined} onClick={() => onResult?.({ status: 'launch-requested', providerId: handoff.providerId })}>{actionContent}</a>
      : <button type="button" className={cx('action')} disabled={disabled} title={title} aria-label={compact ? label : undefined} onClick={(event) => {
        if (!handoff) setOpen(true);
        else if (onHandoff) void customHandoff(handoff);
        else void copy(event.currentTarget);
      }}>{actionContent}</button>}
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild><button ref={trigger} type="button" className={cx('trigger')} disabled={disabled} aria-label={`Choose coding agent for ${label}`}><Glyph kind="chevron" /></button></DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content className={cx('menu')} style={style} align="end" sideOffset={5} collisionPadding={8} aria-label="Coding agent">
          <DropdownMenu.RadioGroup value={provider?.id ?? ''} onValueChange={setValue}>
            {providers.map((item) => <DropdownMenu.RadioItem key={item.id} value={item.id} className={cx('item')}>
              {icon(item)}<span>{item.label}</span><DropdownMenu.ItemIndicator className={cx('check')}><Glyph kind="check" /></DropdownMenu.ItemIndicator>
            </DropdownMenu.RadioItem>)}
          </DropdownMenu.RadioGroup>
          {providers.length > 0 && <DropdownMenu.Separator className={cx('separator')} />}
          {actions.map((action) => {
            const valid = action.href === undefined || isSafeActionUrl(action.href);
            const unavailable = action.disabled || !valid;
            const content = <>{action.icon && <span className={cx('icon')} aria-hidden="true">{action.icon}</span>}<span>{action.label}</span></>;
            return action.href && !unavailable
              ? <DropdownMenu.Item key={action.id} asChild className={cx('item')} onSelect={() => action.onSelect?.()}><a href={action.href}>{content}</a></DropdownMenu.Item>
              : <DropdownMenu.Item key={action.id} className={cx('item')} disabled={unavailable} onSelect={() => action.onSelect?.()}>{content}</DropdownMenu.Item>;
          })}
          <DropdownMenu.Item className={cx('item')} onSelect={() => { void copy(); }}><span className={cx('icon')}><Glyph kind="clipboard" /></span><span>Copy prompt</span></DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
    <span role="status" className={cx('status')} style={visuallyHidden}>{status}</span>
    <Dialog.Root open={manualPrompt !== null} onOpenChange={(next) => { if (!next) setManualPrompt(null); }}>
      <Dialog.Portal><Dialog.Overlay className={cx('dialogOverlay')} />
        <Dialog.Content className={cx('dialog')} style={style} onOpenAutoFocus={(event) => { event.preventDefault(); field.current?.focus(); field.current?.select(); }} onCloseAutoFocus={(event) => {
          event.preventDefault();
          const target = manualReturnFocus.current;
          if (target?.isConnected && !target.matches(':disabled')) target.focus();
          else trigger.current?.focus();
        }}>
          <Dialog.Title className={cx('dialogTitle')}>Copy prompt</Dialog.Title>
          <Dialog.Description className={cx('dialogDescription')}>Clipboard access is unavailable. Copy this prompt into your coding agent.</Dialog.Description>
          <textarea ref={field} readOnly className={cx('textarea')} rows={8} aria-label="Prompt to copy" value={manualPrompt ?? ''} onFocus={(event) => event.currentTarget.select()} />
          <Dialog.Close className={cx('close')} aria-label="Close prompt"><Glyph kind="close" /><span>Close</span></Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}
