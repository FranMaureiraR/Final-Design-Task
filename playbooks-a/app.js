// Playbooks · Rediseño A: Índice + panel
// 2 zonas: índice de playbooks (280px) y resumen del playbook. Cada regla se edita en un panel
// lateral que se puede expandir a todo el layout. Leer primero, editar después.
//
// Estados por URL (sirven para navegar y para las capturas):
//   #/                               índice sin selección
//   #/?empty=1                       sin playbooks
//   #/?new=1&start=contract          modal "New Playbook"
//   #/nda-proveedores                resumen
//   #/nda-proveedores?rule=r2        panel de regla
//   #/nda-proveedores?rule=r2&expand=1   panel expandido
//   #/nda-proveedores?dirty=1        cambios sin guardar
//   #/servicios-cloud?demo=loading&hold=1   extrayendo reglas de un contrato
//   #/servicios-cloud?demo=suggested       reglas sugeridas
//   ?split=50 / ?split=60 (antes del #) vista dividida con el chat a la izquierda
import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon } from '../shared/icons.js';
import { PageHeader } from '../shared/shell.js';
import { Dialog, Popover, Field, cx } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { PlaybookReview } from '../revision-nda/chat.js';
import {
  PLAYBOOKS, SUGGESTED_FROM_CONTRACT, ME, TODAY, POSITIONS, plural, relTime, relShort, fullDate,
  ruleToText, textToRule, blankRule, splitParam,
} from '../shared/playbooks-seed.js';
import {
  useHashState, SectionTabs, WorkDots, Tip, RuleIndicators, PosDot, Sep, Visibility, CountryTag,
  CountrySelect, VisibilitySelect, START_OPTIONS, GrowText,
} from '../shared/redesign-ui.js';

const todayIso = TODAY.toISOString().slice(0, 10);
const POS_HINT = {
  standard: 'What you ask for first.',
  fallback: 'What you can accept if the other side pushes back.',
  unacceptable: 'What Magnar flags as a red flag in the review.',
};
const POS_EMPTY = {
  standard: 'Write the position you ask for first',
  fallback: 'Not defined. Add one to give the reviewer room to negotiate',
  unacceptable: 'Not defined. Without it, Magnar cannot flag red flags for this clause',
};

// ------------------------------------------------------------ índice
function IndexRow({ pb, selected, dirty, onClick }) {
  return html`<a href=${'#/' + pb.id} onClick=${onClick} aria-current=${selected ? 'page' : undefined}
    class=${cx('pa-row', selected && 'pa-row-on')}>
    <span class="flex min-w-0 items-center gap-1.5">
      <span class="truncate text-sm font-medium leading-5">${pb.name || 'Untitled playbook'}</span>
      ${dirty && html`<span class="rd-dot" style="--dot: var(--muted-foreground)" title="Unsaved changes"></span>`}
    </span>
    <span class="truncate text-xs leading-4 text-muted-foreground">${pb.description || 'No description'}</span>
    <span class="pa-row-meta rd-num">
      <span>${plural(pb.rules.filter((r) => !r.suggested).length, 'rule', 'rules')}</span><${Sep} />
      <${CountryTag} code=${pb.country} /><${Sep} />
      <${Visibility} v=${pb.visibility} /><${Sep} />
      <span title=${'Edited ' + fullDate(pb.edited)}>${relShort(pb.edited)}</span>
    </span>
  </a>`;
}

function IndexFilters({ onlyMine, setOnlyMine }) {
  return html`<${Popover} align="end" class=${C.popoverBase + ' p-2.5 w-64 space-y-2'}
    trigger=${(p) => html`<button type="button" ...${p} aria-label="Filters" class=${C.btnOutlineIconRel}><${Icon} name="SlidersHorizontal" />
      ${onlyMine && html`<span class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary"></span>`}</button>`}>
    <h2 class="px-2 text-sm font-medium">Filters</h2>
    <button type="button" class=${C.filterOption} onClick=${() => setOnlyMine(!onlyMine)}>
      <span class="flex size-3.5 shrink-0 items-center justify-center">${onlyMine && html`<${Icon} name="Check" class="size-3.5" />`}</span>
      <span class="truncate">Only my playbooks</span>
    </button>
  <//>`;
}

function Index({ items, total, selectedId, isDirty, search, setSearch, onlyMine, setOnlyMine }) {
  return html`<aside class="pa-index" aria-label="Playbooks">
    <div class="flex shrink-0 items-center gap-1.5 p-2">
      <div class="relative min-w-0 flex-1">
        <${Icon} name="MagnifyingGlass" class=${C.searchIcon} />
        <input data-slot="input" placeholder="Search playbooks..." aria-label="Search playbooks" class=${C.searchInput} type="text" value=${search} onInput=${(e) => setSearch(e.target.value)} />
      </div>
      <${IndexFilters} onlyMine=${onlyMine} setOnlyMine=${setOnlyMine} />
    </div>
    <nav class="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-2">
      ${items.map((pb) => html`<${IndexRow} key=${pb.id} pb=${pb} selected=${pb.id === selectedId} dirty=${isDirty(pb.id)} />`)}
      ${items.length === 0 && html`<p class="px-2.5 py-2 text-sm text-muted-foreground">No playbooks match “${search}”.</p>`}
    </nav>
    <div class=${C.listFooter}><span class="rd-num">${items.length === total ? plural(total, 'playbook', 'playbooks') : `${items.length} of ${total} playbooks`}</span></div>
  </aside>`;
}

// Selector que reemplaza al índice cuando el contenedor es angosto (vista dividida)
function Picker({ items, current, isDirty, onNew }) {
  return html`<div class="pa-picker">
    <${Popover} class=${C.popoverBase + ' w-80 max-w-[calc(100vw-2rem)] p-1'}
      trigger=${(p) => html`<button type="button" ...${p} class="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium hover:bg-muted">
        <span class="truncate">${current ? current.name : 'Choose a playbook'}</span><${Icon} name="CaretDown" class="size-3.5 shrink-0 text-muted-foreground" /></button>`}>
      ${(close) => html`<div class="max-h-80 space-y-0.5 overflow-y-auto">
        ${items.map((pb) => html`<${IndexRow} pb=${pb} selected=${pb.id === current?.id} dirty=${isDirty(pb.id)} onClick=${close} />`)}
      </div>`}
    <//>
    <button type="button" class=${C.btnGhostIcon7} aria-label="New Playbook" onClick=${onNew}><${Icon} name="Plus" class="size-4" /></button>
  </div>`;
}

// ------------------------------------------------------------ resumen
function SaveState({ dirty, justSaved, onSave, onDiscard }) {
  if (dirty) return html`<div class="flex shrink-0 items-center gap-2 pt-1.5 text-xs text-muted-foreground">
    <span>Unsaved changes</span>
    <button type="button" class="px-1 hover:text-foreground" onClick=${onDiscard}>Discard</button>
    <button type="button" class=${C.btnPrimaryXs} onClick=${onSave}>Save</button>
  </div>`;
  if (justSaved) return html`<div class="flex shrink-0 items-center gap-1 pt-2 text-xs text-muted-foreground"><${Icon} name="Check" class="size-3.5" />Saved</div>`;
  return null;
}

function RuleRow({ rule, index, active, onOpen, onAccept, onDismiss }) {
  return html`<li class=${cx('pa-rule', active && 'pa-rule-on', rule.suggested && 'rd-suggested')}>
    <button type="button" class="pa-rule-btn" onClick=${onOpen} aria-label=${'Open rule ' + (index + 1)}>
      <span class="pa-rule-main">
        <span class="flex min-w-0 items-center gap-2">
          <span class="truncate text-sm font-medium leading-5">${rule.title || 'Untitled rule'}</span>
          ${rule.suggested && html`<span class="shrink-0 text-xs text-tint-ink">Suggested</span>`}
        </span>
        <span class="truncate text-[13px] leading-5 text-muted-foreground">${rule.standard || 'No standard position yet'}</span>
      </span>
      ${!rule.suggested && html`<span class="pa-rule-ind"><${RuleIndicators} rule=${rule} /></span>`}
    </button>
    ${rule.suggested && html`<span class="pa-rule-actions">
      <button type="button" class="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground" onClick=${onDismiss}>Dismiss</button>
      <button type="button" class=${C.btnOutlineXs} onClick=${onAccept}><${Icon} name="Check" class="size-3.5" />Accept</button>
    </span>`}
  </li>`;
}

function Extracting({ pb }) {
  const [step, setStep] = useState(0);
  useEffect(() => { const t = setTimeout(() => setStep(1), 1100); return () => clearTimeout(t); }, []);
  const label = pb.origin === 'describe' ? ['Reading your description…', 'Drafting rules…'] : [`Reading ${pb.file}…`, 'Finding clauses Magnar can review…'];
  return html`<div class="py-6" role="status">
    <div class="flex items-center gap-2 text-sm text-muted-foreground"><${WorkDots} />${label[step]}</div>
    <div class="rd-progress mt-3 max-w-64"><span></span></div>
  </div>`;
}

function Summary({ pb, saved, dirty, justSaved, activeRule, update, onSave, onDiscard, openRule, addRule }) {
  const accepted = pb.rules.filter((r) => !r.suggested);
  const suggested = pb.rules.filter((r) => r.suggested);
  const setRule = (id, patch) => update((d) => ({ ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const dropRule = (id) => update((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== id) }));
  return html`<div class="pa-summary">
    <header>
      <div class="flex items-start gap-4">
        <input class="rd-inline rd-title min-w-0 flex-1" aria-label="Playbook name" placeholder="Untitled playbook"
          value=${pb.name} onInput=${(e) => update((d) => ({ ...d, name: e.target.value }))} />
        <${SaveState} dirty=${dirty} justSaved=${justSaved} onSave=${onSave} onDiscard=${onDiscard} />
      </div>
      <${GrowText} class="rd-inline pa-desc mt-2 text-sm leading-6 text-muted-foreground" aria-label="Description" placeholder="Add a description: when should someone use this playbook?"
        value=${pb.description} onInput=${(v) => update((d) => ({ ...d, description: v }))} />
      <p class="pa-meta rd-num">
        <${CountryTag} code=${pb.country} /><${Sep} />
        <${Visibility} v=${pb.visibility} /><${Sep} />
        <span>${plural(accepted.length, 'rule', 'rules')}</span><${Sep} />
        <span title=${fullDate(saved.edited)}>Edited ${relTime(saved.edited)} by ${saved.owner === ME ? 'you' : saved.owner}</span>
      </p>
    </header>

    <section class="mt-8" aria-labelledby="rules-h">
      <div class="flex items-end justify-between gap-4 border-b pb-2">
        <div class="min-w-0">
          <h2 id="rules-h" class="text-sm font-medium">Rules</h2>
          <p class="text-xs leading-5 text-muted-foreground">Each rule is evaluated separately. One clause per rule gives clearer reviews.</p>
        </div>
        <button type="button" class=${C.btnOutlineXs} onClick=${addRule}><${Icon} name="Plus" class="size-3.5" />Rule</button>
      </div>

      ${pb.extracting && html`<${Extracting} pb=${pb} />`}

      ${suggested.length > 0 && html`<div class="flex flex-wrap items-center justify-between gap-2 pt-4 pb-2">
        <p class="text-[13px] leading-5 text-muted-foreground">${plural(suggested.length, 'rule', 'rules')} suggested from ${pb.origin === 'describe' ? 'your description' : pb.file}. Accept the ones that match your position.</p>
        <button type="button" class=${C.btnOutlineXs} onClick=${() => update((d) => ({ ...d, rules: d.rules.map((r) => ({ ...r, suggested: false })) }))}>Accept all</button>
      </div>`}

      ${!pb.extracting && pb.rules.length === 0 && html`<div class="flex flex-wrap items-center gap-3 py-6 text-sm text-muted-foreground">
        This playbook has no rules yet.
        <button type="button" class=${C.btnOutlineXs} onClick=${addRule}><${Icon} name="Plus" class="size-3.5" />Add the first rule</button>
      </div>`}

      <ol class="pa-rules">
        ${[...suggested, ...accepted].map((r) => html`<${RuleRow} key=${r.id} rule=${r} index=${pb.rules.indexOf(r)} active=${r.id === activeRule}
          onOpen=${() => openRule(r.id)} onAccept=${() => setRule(r.id, { suggested: false })} onDismiss=${() => dropRule(r.id)} />`)}
      </ol>
    </section>
  </div>`;
}

// ------------------------------------------------------------ panel de regla
function PositionField({ pos, value, onInput }) {
  return html`<div class="space-y-1.5">
    <div class="flex items-baseline justify-between gap-3">
      <label class="text-xs font-medium">${pos.long}</label>
      <span class="truncate text-xs text-muted-foreground">${POS_HINT[pos.key]}</span>
    </div>
    <div class="rd-pos" style=${`--dot: ${pos.color}`}>
      <textarea class="rd-pos-input" rows="1" aria-label=${pos.long} placeholder=${POS_EMPTY[pos.key]} value=${value} onInput=${(e) => onInput(e.target.value)}></textarea>
    </div>
  </div>`;
}

function reviewPreview(pb, rule) {
  const opts = [rule.standard, rule.fallback].filter((t) => t.trim()).map((t) => [['del', rule.unacceptable || 'Texto del contrato que incumple la regla.'], ['sp'], ['ins', t]]);
  return {
    playbook: pb.name || 'Untitled playbook',
    rules: [{
      verdict: rule.unacceptable.trim() ? 'Unacceptable' : 'Needs review',
      name: rule.title || 'Untitled rule',
      summary: rule.unacceptable.trim()
        ? `El contrato establece: “${rule.unacceptable}” Esto es inaceptable según la regla. La posición estándar es: ${rule.standard || '(sin definir)'}`
        : 'Sin posición inaceptable definida, Magnar solo puede sugerir la posición estándar.',
      options: opts.length ? opts : [[['txt', 'Sin opciones: define una posición estándar.']]],
    }],
  };
}

function RulePanel({ pb, rule, index, count, expanded, textMode, onChange, onNav, onClose, onExpand, onText, onDelete, onAccept }) {
  const ref = useRef();
  useEffect(() => { ref.current?.scrollTo(0, 0); }, [rule.id]);
  const fields = html`<div class="space-y-6">
    <div class="space-y-1.5">
      <label class="text-xs font-medium text-muted-foreground" for="rule-title">Clause</label>
      <input id="rule-title" class="rd-inline text-lg font-medium leading-7" placeholder="Name the clause, e.g. Ley aplicable y jurisdicción"
        value=${rule.title} onInput=${(e) => onChange({ title: e.target.value })} />
    </div>
    <div class="flex items-center justify-between gap-3 border-b pb-2">
      <span class="text-xs font-medium text-muted-foreground">Positions</span>
      <button type="button" class="inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${onText} aria-pressed=${textMode}>
        <${Icon} name=${textMode ? 'ListChecks' : 'TextAlignLeft'} class="size-3.5" />${textMode ? 'Edit as fields' : 'Edit as text'}
      </button>
    </div>
    ${textMode
      ? html`<div class="space-y-2">
          <textarea class=${C.textarea + ' leading-6'} rows="8" aria-label="Rule as text" value=${ruleToText(rule)} onInput=${(e) => onChange(textToRule(e.target.value, rule))}></textarea>
          <p class="text-xs text-muted-foreground">Same format Magnar uses today. Lines that start with “Posición Estándar”, “Alternativa Aceptable” or “Inaceptable” fill the fields.</p>
        </div>`
      : POSITIONS.map((p) => html`<${PositionField} pos=${p} value=${rule[p.key]} onInput=${(v) => onChange({ [p.key]: v })} />`)}
  </div>`;

  return html`<aside class="pa-panel" data-expanded=${expanded ? '' : undefined} aria-label="Rule">
    <header class="flex h-11 shrink-0 items-center gap-1 border-b px-2">
      <button type="button" class="pa-only-narrow inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${onClose}>
        <${Icon} name="ArrowLeft" class="size-4" />Back</button>
      <div class="flex min-w-0 flex-1 items-baseline gap-2 px-1.5">
        <span class="truncate text-sm font-medium">${rule.title || 'Untitled rule'}</span>
        <span class="shrink-0 text-xs text-muted-foreground rd-num">${index + 1} of ${count}</span>
      </div>
      <${Tip} label="Previous rule" kbd="⌘↑"><button type="button" class=${C.btnGhostIcon7} aria-label="Previous rule" disabled=${index === 0} onClick=${() => onNav(-1)}><${Icon} name="CaretUp" class="size-4" /></button><//>
      <${Tip} label="Next rule" kbd="⌘↓"><button type="button" class=${C.btnGhostIcon7} aria-label="Next rule" disabled=${index === count - 1} onClick=${() => onNav(1)}><${Icon} name="CaretDown" class="size-4" /></button><//>
      <span class="pa-hide-narrow mx-0.5 h-4 w-px bg-border"></span>
      <span class="pa-hide-narrow"><${Tip} label=${expanded ? 'Collapse' : 'Expand'} side="left"><button type="button" class=${C.btnGhostIcon7} aria-label=${expanded ? 'Collapse' : 'Expand'} onClick=${onExpand}><${Icon} name=${expanded ? 'ArrowsInSimple' : 'ArrowsOutSimple'} class="size-4" /></button><//></span>
      <span class="pa-hide-narrow"><${Tip} label="Close" kbd="Esc" side="left"><button type="button" class=${C.btnGhostIcon7} aria-label="Close" onClick=${onClose}><${Icon} name="X" class="size-4" /></button><//></span>
    </header>
    ${rule.suggested && html`<div class="rd-suggested flex flex-wrap items-center justify-between gap-2 border-b px-4 py-2 text-[13px] text-muted-foreground">
      Suggested by Magnar. Review it before accepting.
      <button type="button" class=${C.btnOutlineXs} onClick=${onAccept}><${Icon} name="Check" class="size-3.5" />Accept</button>
    </div>`}
    <div ref=${ref} class="pa-panel-body">
      <div class="pa-panel-fields">
        ${fields}
        <div class="mt-10 border-t pt-3"><button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick=${onDelete}>
          <${Icon} name="Trash" class="size-3.5" />Delete rule</button></div>
      </div>
      ${expanded && html`<div class="pa-panel-preview">
        <p class="text-xs font-medium text-muted-foreground">How it will look in the review</p>
        <p class="mt-1 text-xs leading-5 text-muted-foreground">Example of a contract that breaks this rule, as Magnar reports it in chat. Open the rule to see the suggested options.</p>
        <${PlaybookReview} review=${reviewPreview(pb, rule)} onOpenFile=${() => {}} onOption=${() => {}} />
      </div>`}
    </div>
  </aside>`;
}

// ------------------------------------------------------------ crear
function NewPlaybookDialog({ open, start: initialStart, preset = {}, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('CL');
  const [vis, setVis] = useState('private');
  const [start, setStart] = useState(initialStart || 'contract');
  const [file, setFile] = useState(null);
  const [brief, setBrief] = useState('');
  useEffect(() => { if (open) { setName(preset.name || ''); setCountry('CL'); setVis('private'); setStart(initialStart || 'contract'); setFile(preset.file ? SUGGESTED_FROM_CONTRACT.file : null); setBrief(preset.brief ? 'Contratos cloud con proveedores: SLA mínimo 99,5%, datos alojados en Chile y sin renovación automática por más de un año.' : ''); } }, [open]);
  const ready = name.trim() && (start !== 'contract' || file) && (start !== 'describe' || brief.trim());
  const cta = start === 'contract' ? 'Create and suggest rules' : start === 'describe' ? 'Create and draft rules' : 'Create';
  return html`<${Dialog} open=${open} onClose=${onClose}>
    <div data-slot="dialog-header" class="flex flex-col gap-2">
      <h2 data-slot="dialog-title" class="cn-font-heading text-base leading-none font-medium">New Playbook</h2>
      <p data-slot="dialog-description" class=${C.dialogDescription}>Set the basics, then choose how to start.</p>
    </div>
    <form class="space-y-5" onSubmit=${(e) => { e.preventDefault(); ready && onCreate({ name: name.trim(), country, visibility: vis, origin: start, brief }); }}>
      <${Field} label="Name"><input data-slot="input" autocomplete="off" placeholder="e.g. Servicios cloud" class=${C.input} type="text" value=${name} onInput=${(e) => setName(e.target.value)} /><//>
      <div class="grid grid-cols-2 gap-3">
        <${Field} label="Country"><${CountrySelect} value=${country} onChange=${setCountry} /><//>
        <${Field} label="Visibility"><${VisibilitySelect} value=${vis} onChange=${setVis} /><//>
      </div>
      <div class="grid gap-2">
        <span class=${C.label}>Start from</span>
        <div role="radiogroup" class="divide-y overflow-hidden rounded-lg border">
          ${START_OPTIONS.map((o) => html`<button type="button" role="radio" aria-checked=${start === o.key}
            class=${cx('flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors', start === o.key ? 'bg-tint-wash' : 'hover:bg-muted/60')} onClick=${() => setStart(o.key)}>
            <${Icon} name=${o.icon} class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <span class="min-w-0 flex-1"><span class="block text-sm font-medium leading-5">${o.title}</span><span class="block text-xs leading-4 text-muted-foreground">${o.hint}</span></span>
            <span class="mt-0.5 flex size-4 shrink-0 items-center justify-center">${start === o.key && html`<${Icon} name="Check" class="size-4" />`}</span>
          </button>`)}
        </div>
        ${start === 'contract' && (file
          ? html`<div class="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"><${Icon} name="FileText" class="size-4 text-muted-foreground" /><span class="min-w-0 flex-1 truncate">${file}</span>
              <span class="text-xs text-muted-foreground rd-num">1.2 MB</span><button type="button" class=${C.btnGhostIcon7} aria-label="Remove file" onClick=${() => setFile(null)}><${Icon} name="X" class="size-3.5" /></button></div>`
          : html`<div class="flex items-center gap-3"><button type="button" class=${C.btnOutlineSm} onClick=${() => setFile(SUGGESTED_FROM_CONTRACT.file)}><${Icon} name="UploadSimple" />Choose file</button>
              <span class="text-xs text-muted-foreground">PDF or DOCX, up to 20 MB</span></div>`)}
        ${start === 'describe' && html`<textarea data-slot="textarea" class=${C.textarea} rows="3" placeholder="e.g. Contratos cloud con proveedores: SLA mínimo 99,5%, datos alojados en Chile, sin renovación automática por más de un año."
          value=${brief} onInput=${(e) => setBrief(e.target.value)}></textarea>`}
      </div>
      <div data-slot="dialog-footer" class=${C.dialogFooter}>
        <button type="button" data-slot="button" class=${C.btnOutline} onClick=${onClose}>Cancel</button>
        <button type="submit" disabled=${!ready} data-slot="button" class=${C.btnPrimary}>${cta}</button>
      </div>
    </form>
  <//>`;
}

// ------------------------------------------------------------ app
function demoPlaybook(state) {
  return {
    id: 'servicios-cloud', name: 'Servicios cloud', type: 'Services', description: 'Contratos de software como servicio con proveedores cloud.',
    country: 'CL', visibility: 'private', owner: ME, edited: todayIso, origin: 'contract', file: SUGGESTED_FROM_CONTRACT.file,
    extracting: state === 'loading', rules: state === 'loading' ? [] : SUGGESTED_FROM_CONTRACT.rules.map((r) => ({ ...r, suggested: true })),
  };
}

function initialState(path, params) {
  if (params.empty) return [];
  const list = PLAYBOOKS.map((p) => ({ ...p, rules: p.rules.map((r) => ({ ...r })) }));
  if (params.demo) list.unshift(demoPlaybook(params.demo));
  return list;
}

function App() {
  const { path, params, nav } = useHashState();
  const [saved, setSaved] = useState(() => initialState(path, params));
  const [drafts, setDrafts] = useState(() => {
    if (!params.dirty) return {};
    const nda = PLAYBOOKS[0];
    return { [nda.id]: { ...nda, rules: nda.rules.map((r) => (r.id === 'r3' ? { ...r, fallback: 'Hasta 2 veces el monto contratado.' } : r)) } };
  });
  const [justSaved, setJustSaved] = useState(null);
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [textMode, setTextMode] = useState(false);
  const split = splitParam();

  const savedPb = saved.find((p) => p.id === path);
  const pb = savedPb && (drafts[path] || savedPb);
  const isDirty = (id) => !!drafts[id] && JSON.stringify(drafts[id]) !== JSON.stringify(saved.find((p) => p.id === id));
  const listed = saved.map((p) => drafts[p.id] || p);
  const filtered = listed.filter((p) => (!onlyMine || p.owner === ME) && (p.name + ' ' + p.description).toLowerCase().includes(search.toLowerCase()));

  const ruleId = params.rule;
  const ordered = pb ? [...pb.rules.filter((r) => r.suggested), ...pb.rules.filter((r) => !r.suggested)] : [];
  const ruleIdx = ordered.findIndex((r) => r.id === ruleId);
  const rule = ordered[ruleIdx];
  const expanded = !!params.expand && !!rule;

  useEffect(() => { document.title = (pb ? pb.name + ' · ' : '') + 'Playbooks - Magnar'; }, [pb?.name]);
  // Los estados de demostración también se pueden abrir navegando dentro de la página
  useEffect(() => { if (params.demo && !saved.some((p) => p.id === 'servicios-cloud')) setSaved((s) => [demoPlaybook(params.demo), ...s]); }, [params.demo]);

  // Extracción simulada: termina sola salvo que la URL pida mantener el estado (?hold=1)
  useEffect(() => {
    if (!pb?.extracting || params.hold) return;
    const t = setTimeout(() => setSaved((s) => s.map((p) => (p.id === pb.id ? { ...p, extracting: false, rules: SUGGESTED_FROM_CONTRACT.rules.map((r) => ({ ...r, id: r.id + p.id, suggested: true })) } : p))), 2600);
    return () => clearTimeout(t);
  }, [pb?.id, pb?.extracting]);

  const update = (fn) => setDrafts((d) => ({ ...d, [path]: fn(d[path] || savedPb) }));
  const save = () => {
    setSaved((s) => s.map((p) => (p.id === path ? { ...drafts[path], edited: todayIso } : p)));
    setDrafts((d) => { const n = { ...d }; delete n[path]; return n; });
    setJustSaved(path);
    setTimeout(() => setJustSaved((j) => (j === path ? null : j)), 4000);
  };
  const discard = () => setDrafts((d) => { const n = { ...d }; delete n[path]; return n; });
  const keep = (extra) => ({ ...(params.demo ? { demo: params.demo } : {}), ...extra });
  const openRule = (id, extra = {}) => nav(path, keep({ rule: id, expand: params.expand, ...extra }), { replace: !!ruleId });
  const closeRule = () => nav(path, keep({}), { replace: true });
  const navRule = (dir) => { const n = ordered[ruleIdx + dir]; if (n) openRule(n.id); };
  const addRule = () => { const r = blankRule(pb.rules.length); update((d) => ({ ...d, rules: [...d.rules, r] })); openRule(r.id); };
  const changeRule = (patch) => update((d) => ({ ...d, rules: d.rules.map((r) => (r.id === ruleId ? { ...r, ...patch } : r)) }));
  const deleteRule = () => { const next = ordered[ruleIdx + 1] || ordered[ruleIdx - 1]; update((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== ruleId) })); next ? openRule(next.id) : closeRule(); };

  // Teclado: Esc cierra, ⌘↑ / ⌘↓ cambia de regla
  const keyRef = useRef();
  keyRef.current = (e) => {
    if (!rule || document.querySelector('[data-slot=dialog-content],[data-slot=popover-content],[data-slot=select-content]')) return;
    if (e.key === 'Escape') { e.preventDefault(); closeRule(); }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); navRule(e.key === 'ArrowUp' ? -1 : 1); }
  };
  useEffect(() => { const f = (e) => keyRef.current(e); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);

  const create = ({ name, country, visibility, origin }) => {
    const id = 'pb-' + Date.now().toString(36);
    const p = { id, name, type: '', description: '', country, visibility, owner: ME, edited: todayIso, origin, file: SUGGESTED_FROM_CONTRACT.file, extracting: origin !== 'blank', rules: [] };
    setSaved((s) => [p, ...s]);
    nav(id, {});
  };
  const openNew = () => nav(path, { ...params, new: 1 });
  const closeNew = () => { const { new: _, start, ...rest } = params; nav(path, rest, { replace: true }); };

  const header = html`<${PageHeader} inlineTabs=${html`<${SectionTabs} />`}
    actions=${html`<button type="button" data-slot="button" class=${C.btnPrimary} onClick=${openNew}><${Icon} name="Plus" class="size-4" />New Playbook</button>`} />`;

  const body = saved.length === 0
    ? html`<div class="flex flex-wrap items-center gap-4 px-6 py-8">
        <p class="text-sm text-muted-foreground">No playbooks yet. A playbook tells Magnar what to accept and what to flag in a type of contract.</p>
        <button type="button" class=${C.btnPrimary} onClick=${openNew}><${Icon} name="Plus" class="size-4" />New Playbook</button>
      </div>`
    : html`<div class="pa-host"><div class="pa-root">
        <${Index} items=${filtered} total=${saved.length} selectedId=${path} isDirty=${isDirty} search=${search} setSearch=${setSearch} onlyMine=${onlyMine} setOnlyMine=${setOnlyMine} />
        <main class="pa-main">
          <${Picker} items=${listed} current=${pb} isDirty=${isDirty} onNew=${openNew} />
          <div class="pa-scroll">
            ${pb
              ? html`<${Summary} key=${pb.id} pb=${pb} saved=${savedPb} dirty=${isDirty(pb.id)} justSaved=${justSaved === pb.id} activeRule=${ruleId}
                  update=${update} onSave=${save} onDiscard=${discard} openRule=${openRule} addRule=${addRule} />`
              : html`<p class="px-10 py-10 text-sm text-muted-foreground">Select a playbook to read its rules.</p>`}
          </div>
        </main>
        ${rule && html`<${RulePanel} pb=${pb} rule=${rule} index=${ruleIdx} count=${ordered.length} expanded=${expanded} textMode=${textMode}
          onChange=${changeRule} onNav=${navRule} onClose=${closeRule} onText=${() => setTextMode(!textMode)}
          onExpand=${() => openRule(rule.id, { expand: expanded ? undefined : 1 })} onDelete=${deleteRule}
          onAccept=${() => changeRule({ suggested: false })} />`}
      </div></div>`;

  return html`<${Frame} split=${split} tab=${{ title: pb ? pb.name : 'My Playbooks', icon: 'Books' }}>
    ${header}
    <div class="flex min-h-0 flex-1 flex-col">${body}</div>
    <${NewPlaybookDialog} open=${!!params.new} start=${params.start} preset=${{ name: params.name, file: params.file, brief: params.brief }} onClose=${closeNew} onCreate=${create} />
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
