// Piezas comunes a los rediseños de Playbooks. Todo usa clases y tokens que ya existen en Magnar;
// lo que el CSS compilado de Magnar no trae está en styles/redesign.css.
import { html, useState, useEffect } from '../vendor/preact-htm.js';
import { C } from './classes.js';
import { Icon, Flag } from './icons.js';
import { Select, cx } from './ui.js';
import { parseHash, hashFor, POSITIONS, countryName } from './playbooks-seed.js';

// ------------------------------------------------------------ estado en la URL
export function useHashState() {
  const [s, setS] = useState(parseHash());
  useEffect(() => { const f = () => setS(parseHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  const nav = (path, params = {}, { replace = false } = {}) => {
    const h = hashFor(path ?? s.path, params);
    if (replace) { history.replaceState(null, '', location.pathname + location.search + h); setS(parseHash()); }
    else location.hash = h;
  };
  return { ...s, nav };
}

// ------------------------------------------------------------ pestañas de sección (idénticas al original)
export function SectionTabs() {
  const tabs = [['Templates', 'FileText'], ['Skills', 'SlidersHorizontal'], ['Playbooks', 'BookOpenText'], ['Libraries', 'Archive']];
  return html`<div class="@container/section-tabs min-w-0 w-full">
    <div data-orientation="horizontal" data-slot="tabs" class="group/tabs flex gap-2 data-horizontal:flex-col" data-horizontal="">
      <div data-orientation="horizontal" data-slot="tabs-list" data-variant="line" aria-label="Knowledge" class=${C.sectionTabsList}>
        ${tabs.map(([l, i]) => html`<button type="button" data-orientation="horizontal" data-active=${l === 'Playbooks' ? '' : undefined} aria-selected=${l === 'Playbooks'} data-slot="tabs-trigger" aria-label=${l} class=${C.sectionTab}>
          <${Icon} name=${i} class="size-4" /><span class="hidden @min-[28rem]/section-tabs:inline">${l}</span></button>`)}
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------ indicador de trabajo (la animación de puntos de Magnar)
export function WorkDots() {
  const dots = [];
  for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) {
    const d = Math.hypot(x - 2, y - 2);
    dots.push(html`<span class="thread-work-dot" style=${`animation-name: thread-work-rings; animation-delay: ${(d * 0.12).toFixed(2)}s`}></span>`);
  }
  return html`<span class="thread-work-loading" aria-hidden="true"><span class="thread-work-matrix">${dots}</span></span>`;
}

// ------------------------------------------------------------ tooltip (mismo aspecto que el tooltip de shadcn)
export function Tip({ label, kbd, side = 'bottom', children }) {
  return html`<span class="rd-tip" data-side=${side}>${children}<span role="tooltip" class="rd-tip-body">${label}${kbd && html`<kbd>${kbd}</kbd>`}</span></span>`;
}

// ------------------------------------------------------------ marcadores de posición (punto + etiqueta)
export function PosDot({ pos, filled = true, class: cls = '' }) {
  return html`<span class=${cx('rd-dot', !filled && 'rd-dot-empty', cls)} style=${`--dot: ${pos.color}`}></span>`;
}
export function PosLabel({ pos, defined = true }) {
  return html`<span class=${cx('inline-flex items-center gap-1.5 text-xs', defined ? 'text-muted-foreground' : 'text-muted-foreground/70')} title=${defined ? pos.long : pos.long + ': not defined'}>
    <${PosDot} pos=${pos} filled=${defined} />${pos.label}</span>`;
}
export const RuleIndicators = ({ rule }) => html`<span class="flex flex-wrap items-center gap-x-3 gap-y-1">
  ${POSITIONS.map((p) => html`<${PosLabel} pos=${p} defined=${!!rule[p.key].trim()} />`)}</span>`;

// ------------------------------------------------------------ meta
export const Sep = () => html`<span aria-hidden="true" class="text-muted-foreground/50">·</span>`;
export function Visibility({ v, class: cls = 'size-3' }) {
  return html`<span class="inline-flex items-center gap-1"><${Icon} name=${v === 'shared' ? 'Users' : 'Lock'} class=${cls} />${v === 'shared' ? 'Shared' : 'Private'}</span>`;
}
export function CountryTag({ code }) {
  return html`<span class="inline-flex items-center gap-1.5"><${Flag} code=${code} class="h-2.5 w-3.5 rounded-[2px] object-cover" />${countryName(code)}</span>`;
}

// ------------------------------------------------------------ selects del formulario "New Playbook"
const COUNTRY_OPTS = [{ value: '', label: 'No country' }, ...['CL', 'PE', 'CO', 'MX', 'AR'].map((c) => ({ value: c, label: countryName(c) }))]
  .map((o) => ({ ...o, render: () => html`<div class="flex items-center gap-2"><${Flag} code=${o.value} />${o.label}</div>` }));
export const CountrySelect = ({ value, onChange }) => html`<${Select} label="Country" value=${value} onChange=${onChange} options=${COUNTRY_OPTS} renderValue=${(o) => o.render()} />`;

const VIS_OPTS = [
  { value: 'private', label: 'Private', hint: 'Only you', icon: 'Lock' },
  { value: 'shared', label: 'Shared', hint: 'Everyone in your workspace', icon: 'Users' },
].map((o) => ({ ...o, render: () => html`<div class="flex items-center gap-2"><${Icon} name=${o.icon} class="size-3.5 text-muted-foreground" />${o.label}<span class="text-muted-foreground">${o.hint}</span></div>` }));
export const VisibilitySelect = ({ value, onChange }) => html`<${Select} label="Visibility" value=${value} onChange=${onChange} options=${VIS_OPTS}
  renderValue=${(o) => html`<div class="flex items-center gap-2"><${Icon} name=${o.icon} class="size-3.5 text-muted-foreground" />${o.label}</div>`} />`;

// Los 3 caminos para crear un playbook.
export const START_OPTIONS = [
  { key: 'contract', icon: 'FileArrowUp', title: 'From a model contract', hint: 'Upload a contract you trust. Magnar suggests one rule per relevant clause.' },
  { key: 'describe', icon: 'ChatText', title: 'Describe what I need', hint: 'Write what you look for in this type of contract. Magnar drafts the rules.' },
  { key: 'blank', icon: 'File', title: 'Blank', hint: 'Start with no rules and write them yourself.' },
];

// Textarea que crece con el contenido (field-sizing ya está en el CSS de Magnar).
export function GrowText({ value, onInput, placeholder, class: cls, rows = 1, ...rest }) {
  return html`<textarea rows=${rows} class=${cx('rd-grow', cls)} placeholder=${placeholder} value=${value} onInput=${(e) => onInput(e.target.value)} ...${rest}></textarea>`;
}
