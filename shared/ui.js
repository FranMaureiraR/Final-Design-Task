// Componentes base (equivalentes a shadcn/base-ui que usa Magnar), sin dependencias.
import { html, render, useState, useEffect, useLayoutEffect, useRef, useMemo } from '../vendor/preact-htm.js';
import { C } from './classes.js';
import { Icon } from './icons.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

// Renderiza hijos al final de <body> (los diálogos usan transform, así que los popovers deben salir de ahí).
export function Portal({ children }) {
  const el = useMemo(() => { const d = document.createElement('div'); document.body.appendChild(d); return d; }, []);
  useLayoutEffect(() => { render(children, el); });
  useEffect(() => () => { render(null, el); el.remove(); }, []);
  return null;
}

// Cierra al hacer click fuera o con Escape.
function useDismiss(open, onClose, refs) {
  useEffect(() => {
    if (!open) return;
    const down = (e) => { if (refs.every((r) => !r.current || !r.current.contains(e.target))) onClose(); };
    const key = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    const t = setTimeout(() => document.addEventListener('mousedown', down), 0);
    document.addEventListener('keydown', key, true);
    return () => { clearTimeout(t); document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key, true); };
  }, [open]);
}

// Posiciona un popup respecto de su trigger (abajo, o arriba si no cabe).
function useAnchor(open, triggerRef, popRef, { align = 'start', sideOffset = 4, matchWidth = false } = {}) {
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const place = () => {
      const t = triggerRef.current?.getBoundingClientRect();
      const p = popRef.current?.getBoundingClientRect();
      if (!t || !p) return;
      let side = 'bottom';
      let top = t.bottom + sideOffset;
      if (top + p.height > window.innerHeight - 8 && t.top - p.height - sideOffset > 8) { side = 'top'; top = t.top - p.height - sideOffset; }
      let left = align === 'end' ? t.right - p.width : align === 'center' ? t.left + t.width / 2 - p.width / 2 : t.left;
      left = Math.max(8, Math.min(left, window.innerWidth - p.width - 8));
      setPos({ top, left, side, width: t.width, avail: side === 'bottom' ? window.innerHeight - t.bottom - 16 : t.top - 16 });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open]);
  return pos;
}

// ---------------------------------------------------------------- Dialog
export function Dialog({ open, onClose, class: cls = C.dialog, children }) {
  const ref = useRef();
  useEffect(() => {
    if (!open) return;
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    setTimeout(() => ref.current?.querySelector('input,textarea')?.focus(), 30);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  if (!open) return null;
  return html`<${Portal}>
    <div data-slot="dialog-overlay" data-open="" class=${C.overlay} onMouseDown=${onClose}></div>
    <div ref=${ref} data-open="" role="dialog" tabindex="-1" data-slot="dialog-content" class=${cls} style="--nested-dialogs: 0;">
      ${children}
      <button type="button" data-slot="dialog-close" class=${C.dialogClose} onClick=${onClose}>
        <${Icon} name="X" /><span class="sr-only">Close</span>
      </button>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- Select (base-ui, popup alineado sobre el item elegido)
export function Select({ value, onChange, options, label, renderValue, triggerClass = C.selectTrigger, placeholder = '' }) {
  const [open, setOpen] = useState(false);
  const tRef = useRef(); const pRef = useRef();
  useDismiss(open, () => setOpen(false), [tRef, pRef]);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    if (!open) { setPos(null); return; }
    const t = tRef.current.getBoundingClientRect();
    const sel = pRef.current.querySelector('[data-selected]');
    const offset = sel ? sel.offsetTop : 0;
    let top = t.top - offset - 1;
    const h = pRef.current.offsetHeight;
    top = Math.max(8, Math.min(top, window.innerHeight - h - 8));
    setPos({ top, left: t.left - 1, width: t.width + 2 });
  }, [open]);
  const current = options.find((o) => o.value === value);
  return html`
    <button type="button" ref=${tRef} aria-expanded=${open ? 'true' : 'false'} data-slot="select-trigger" data-size="default" aria-label=${label}
      class=${triggerClass} data-popup-open=${open ? '' : undefined} onClick=${() => setOpen(!open)}>
      <span data-slot="select-value" class="flex flex-1 text-left">${current ? (renderValue ? renderValue(current) : current.label) : placeholder}</span>
      <${Icon} name="CaretDown" class="pointer-events-none size-4 text-muted-foreground" />
    </button>
    ${open && html`<${Portal}>
      <div class="fixed z-50" style=${pos ? `top:${pos.top}px;left:${pos.left}px;--anchor-width:${pos.width}px;--available-height:${window.innerHeight - 16}px` : 'visibility:hidden;top:0;left:0'}>
        <div ref=${pRef} role="listbox" data-slot="select-content" data-side="none" data-align-trigger="true" data-open="" class=${C.selectContent}>
          <div class="base-ui-disable-scrollbar p-1">
            ${options.map((o) => html`
              <div role="option" aria-selected=${o.value === value ? 'true' : 'false'} data-selected=${o.value === value ? '' : undefined} data-slot="select-item" tabindex="-1"
                class=${C.selectItem} onMouseEnter=${(e) => e.currentTarget.focus()} onClick=${() => { onChange(o.value); setOpen(false); }}>
                <div class="flex flex-1 shrink-0 gap-2 whitespace-nowrap">${o.render ? o.render() : o.label}</div>
                ${o.value === value && html`<span class=${C.selectItemCheck} data-selected=""><${Icon} name="Check" class="pointer-events-none" /></span>`}
              </div>`)}
          </div>
        </div>
      </div>
    <//>`}`;
}

// ---------------------------------------------------------------- Popover
// trigger: (props) => vnode. Las props incluyen ref, onClick y aria-expanded.
export function Popover({ trigger, children, class: cls, align = 'start', open: ctrlOpen, onOpenChange }) {
  const [inner, setInner] = useState(false);
  const open = ctrlOpen ?? inner;
  const setOpen = (v) => { onOpenChange ? onOpenChange(v) : setInner(v); };
  const tRef = useRef(); const pRef = useRef();
  useDismiss(open, () => setOpen(false), [tRef, pRef]);
  const pos = useAnchor(open, tRef, pRef, { align });
  return html`
    ${trigger({ ref: tRef, onClick: () => setOpen(!open), 'aria-expanded': open ? 'true' : 'false', 'data-slot': 'popover-trigger', 'data-popup-open': open ? '' : undefined })}
    ${open && html`<${Portal}>
      <div class="fixed z-50" style=${pos ? `top:${pos.top}px;left:${pos.left}px;--anchor-width:${pos.width}px;--available-height:${pos.avail}px` : 'visibility:hidden;top:0;left:0'}>
        <div ref=${pRef} role="dialog" data-slot="popover-content" data-open="" data-side=${pos?.side || 'bottom'} data-align=${align} class=${cls}>
          ${typeof children === 'function' ? children(() => setOpen(false)) : children}
        </div>
      </div>
    <//>`}`;
}

// ---------------------------------------------------------------- Command (cmdk) — lista con buscador
export function CommandList({ placeholder, items, value, onSelect, empty = 'No results', renderItem, filterText = (i) => i.label }) {
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef();
  const filtered = items.filter((i) => filterText(i).toLowerCase().includes(q.toLowerCase()));
  useLayoutEffect(() => {
    const idx = filtered.findIndex((i) => i.value === value);
    if (idx > 0 && listRef.current) { setActive(idx); const el = listRef.current.querySelectorAll('[data-slot=command-item]')[idx]; el && (listRef.current.scrollTop = el.offsetTop - 40); }
  }, []);
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, filtered.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && filtered[active]) { e.preventDefault(); onSelect(filtered[active].value); }
  };
  return html`
    <div data-slot="command" class=${C.command} cmdk-root="">
      <div data-slot="command-input-wrapper" class="p-1 pb-0">
        <div data-slot="input-group" class=${C.commandInputGroup}>
          <input data-slot="command-input" class=${C.commandInput} placeholder=${placeholder} autocomplete="off" spellcheck="false" type="text" value=${q}
            ref=${(el) => el && setTimeout(() => el.focus(), 0)} onInput=${(e) => { setQ(e.target.value); setActive(0); }} onKeyDown=${onKey} />
          <div data-slot="input-group-addon" class=${C.commandAddon}><${Icon} name="MagnifyingGlass" class="size-4 shrink-0 opacity-50" /></div>
        </div>
      </div>
      <div ref=${listRef} data-slot="command-list" class=${C.commandList} cmdk-list="">
        ${filtered.length === 0
          ? html`<div data-slot="command-empty" class="py-6 text-center text-sm">${empty}</div>`
          : html`<div data-slot="command-group" class=${C.commandGroup}>
              ${filtered.map((it, i) => html`
                <div data-slot="command-item" class=${C.commandItem} data-selected=${i === active ? 'true' : 'false'} aria-selected=${i === active ? 'true' : 'false'}
                  data-checked=${it.value === value ? 'true' : 'false'} onMouseMove=${() => setActive(i)} onClick=${() => onSelect(it.value)}>
                  ${renderItem ? renderItem(it) : html`<span>${it.label}</span>`}
                  <${Icon} name="Check" class=${C.commandCheck} />
                </div>`)}
            </div>`}
      </div>
    </div>`;
}

// ---------------------------------------------------------------- Checkbox
export function Checkbox({ checked, onChange, label, id }) {
  return html`
    <div class="flex items-start space-x-2">
      <span role="checkbox" tabindex="0" aria-checked=${checked ? 'true' : 'false'} data-slot="checkbox" class=${C.checkbox}
        data-checked=${checked ? '' : undefined} data-unchecked=${checked ? undefined : ''}
        onClick=${() => onChange(!checked)} onKeyDown=${(e) => e.key === ' ' && (e.preventDefault(), onChange(!checked))}>
        ${checked && html`<span data-slot="checkbox-indicator" class=${C.checkboxIndicator}><${Icon} name="Check" /></span>`}
      </span>
      <label data-slot="label" class=${C.checkLabel} for=${id} onClick=${() => onChange(!checked)}>${label}</label>
    </div>`;
}

// ---------------------------------------------------------------- Calendar (react-day-picker, single)
const WD = [['Su', 'Sunday'], ['Mo', 'Monday'], ['Tu', 'Tuesday'], ['We', 'Wednesday'], ['Th', 'Thursday'], ['Fr', 'Friday'], ['Sa', 'Saturday']];
const sameDay = (a, b) => a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export function Calendar({ selected, onSelect, isSelected = (d) => sameDay(d, selected) }) {
  const [month, setMonth] = useState(() => { const d = selected || new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const today = new Date();
  const start = new Date(month); start.setDate(1 - month.getDay());
  const weeks = [];
  const cur = new Date(start);
  do {
    const w = [];
    for (let i = 0; i < 7; i++) { w.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(w);
  } while (cur.getMonth() === month.getMonth());
  const caption = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  return html`
    <div data-slot="calendar" class=${C.calendar} lang="en-US">
      <div class="relative flex flex-col gap-4 md:flex-row rdp-months">
        <nav class=${C.calNav} aria-label="Navigation bar">
          <button type="button" class=${C.calNavBtn + ' rdp-button_previous'} aria-label="Go to the Previous Month" onClick=${() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}><${Icon} name="CaretLeft" class="cn-rtl-flip size-4 rdp-chevron" /></button>
          <button type="button" class=${C.calNavBtn + ' rdp-button_next'} aria-label="Go to the Next Month" onClick=${() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}><${Icon} name="CaretRight" class="cn-rtl-flip size-4 rdp-chevron" /></button>
        </nav>
        <div class="flex w-full flex-col gap-4 rdp-month">
          <div class=${C.calCaption}><span class="font-medium select-none cn-calendar-caption text-sm rdp-caption_label">${caption}</span></div>
          <table aria-label=${caption} class="w-full border-collapse rdp-month_grid">
            <thead><tr class="flex rdp-weekdays">${WD.map(([s, l]) => html`<th aria-label=${l} class=${C.calWeekday} scope="col">${s}</th>`)}</tr></thead>
            <tbody class="rdp-weeks">
              ${weeks.map((w) => html`<tr class="mt-2 flex w-full rdp-week">
                ${w.map((d) => {
                  const sel = isSelected(d); const isToday = sameDay(d, today); const outside = d.getMonth() !== month.getMonth();
                  return html`<td class=${cx(C.calDay, outside && C.calDayOutside, isToday && C.calDayToday, sel && 'rdp-selected')} data-selected=${sel ? 'true' : undefined} aria-selected=${sel ? 'true' : undefined}>
                    <button type="button" data-slot="button" class=${C.calDayBtn} data-selected-single=${sel ? 'true' : undefined} onClick=${() => onSelect(d)}>${d.getDate()}</button>
                  </td>`;
                })}
              </tr>`)}
            </tbody>
          </table>
        </div>
      </div>
    </div>`;
}

// ---------------------------------------------------------------- AlertDialog (confirmación)
export function AlertDialog({ open, onClose, title, description, actionLabel, onAction }) {
  useEffect(() => {
    if (!open) return;
    const key = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);
  if (!open) return null;
  return html`<${Portal}>
    <div data-slot="alert-dialog-overlay" data-open="" class=${C.overlay}></div>
    <div data-open="" role="alertdialog" tabindex="-1" data-slot="alert-dialog-content" data-size="default" class=${C.alertDialog}>
      <div data-slot="alert-dialog-header" class=${C.alertDialogHeader}>
        <h2 data-slot="alert-dialog-title" class=${C.alertDialogTitle}>${title}</h2>
        <div data-slot="alert-dialog-description" class=${C.alertDialogDescription}>${description}</div>
      </div>
      <div data-slot="alert-dialog-footer" class=${C.alertDialogFooter}>
        <button type="button" data-slot="alert-dialog-cancel" class=${C.btnOutline} onClick=${onClose}>Cancel</button>
        <button type="button" data-slot="alert-dialog-action" class=${C.btnDestructive} onClick=${onAction}>${actionLabel}</button>
      </div>
    </div>
  <//>`;
}

// ---------------------------------------------------------------- DropdownMenu
// items: [{label, icon, onSelect}] | 'separator'
export function DropdownMenu({ trigger, label, heading, items, align = 'end' }) {
  const [open, setOpen] = useState(false);
  const tRef = useRef(); const pRef = useRef();
  useDismiss(open, () => setOpen(false), [tRef, pRef]);
  const pos = useAnchor(open, tRef, pRef, { align });
  return html`
    ${trigger({ ref: tRef, onClick: () => setOpen(!open), 'aria-expanded': open ? 'true' : 'false', 'data-popup-open': open ? '' : undefined })}
    ${open && html`<${Portal}>
      <div class="fixed z-50" style=${pos ? `top:${pos.top}px;left:${pos.left}px;--available-height:${pos.avail}px` : 'visibility:hidden;top:0;left:0'}>
        <div ref=${pRef} role="menu" data-slot="dropdown-menu-content" data-open="" data-side=${pos?.side || 'bottom'} data-align=${align} aria-label=${label} class=${C.menu}>
          ${heading && html`<div class="px-2 py-1.5 text-xs font-medium text-muted-foreground break-words">${heading}</div>`}
          ${items.map((it) => it === 'separator'
            ? html`<div data-orientation="horizontal" data-slot="dropdown-menu-separator" class="-mx-1 my-1 h-px bg-border"></div>`
            : html`<div role="menuitem" tabindex="-1" data-slot="dropdown-menu-item" class=${C.menuItem} onMouseEnter=${(e) => e.currentTarget.focus()}
                onClick=${() => { setOpen(false); it.onSelect(); }}><${Icon} name=${it.icon} class="size-4" /><span class="min-w-0 break-words">${it.label}</span></div>`)}
        </div>
      </div>
    <//>`}`;
}

// ---------------------------------------------------------------- Field (label + control)
export function Field({ label, children }) {
  return html`<div><div class="grid min-w-0 gap-2">
    ${label && html`<div class="flex items-center gap-1.5"><label data-slot="form-label" class=${C.label}>${label}</label></div>`}
    ${children}
  </div></div>`;
}
