// Playbooks · Rediseño C: Matriz de posiciones
// Filas = cláusulas, columnas = Standard | Fallback | Unacceptable. Se compara en horizontal
// y las celdas vacías se ven de inmediato. En contenedores angostos la matriz pasa a lista.
//
// Estados por URL:
//   #/                                   lista (tabla)
//   #/?empty=1                           sin playbooks
//   #/?new=1                             modal "New Playbook"
//   #/servicios-cloud?demo=start         playbook nuevo: 3 formas de empezar
//   #/servicios-cloud?demo=suggested     filas sugeridas al extraer de un contrato
//   #/servicios-ti                       matriz
//   #/servicios-ti?cell=r4.fallback      celda en edición
//   #/servicios-ti?rule=r3(&expand=1)    panel lateral de la regla (normal / expandido)
//   #/servicios-ti?dirty=1               cambios sin guardar
//   ?split=50 / ?split=60 (antes del #)  vista dividida con el chat a la izquierda
import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon } from '../shared/icons.js';
import { PageHeader, Breadcrumb } from '../shared/shell.js';
import { Dialog, Popover, Field, cx } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import {
  PLAYBOOKS, SUGGESTED_FROM_CONTRACT, ME, TODAY, POSITIONS, plural, relTime, fullDate, countryName,
  blankRule, splitParam,
} from '../shared/playbooks-seed.js';
import {
  useHashState, SectionTabs, WorkDots, Tip, PosDot, Sep, Visibility, CountryTag, CountrySelect, VisibilitySelect,
} from '../shared/redesign-ui.js';

const todayIso = TODAY.toISOString().slice(0, 10);
const TEMPLATES = [['NDA', 'nda-proveedores'], ['Lease', 'arrendamiento-comercial'], ['Services', 'servicios-ti']];

// Resumen de cobertura: dato derivado de las celdas vacías, en frase.
function coverage(rules) {
  const live = rules.filter((r) => !r.suggested);
  const noFb = live.filter((r) => !r.fallback.trim()).length;
  const noUn = live.filter((r) => !r.unacceptable.trim()).length;
  const parts = [plural(live.length, 'rule', 'rules')];
  if (noFb) parts.push(`${noFb} without fallback`);
  if (noUn) parts.push(`${noUn} without unacceptable position`);
  if (live.length && !noFb && !noUn) parts.push('every position defined');
  return parts;
}

// ------------------------------------------------------------ lista
function FilterPill({ label, value, options, onChange }) {
  const current = options.find((o) => o.value === value);
  return html`<${Popover} class=${C.popoverBase + ' w-56 p-1'}
    trigger=${(p) => html`<button type="button" ...${p} class=${cx('pc-pill', value && 'pc-pill-on')}>
      ${value ? html`<span class="text-muted-foreground">${label}</span>${current.label}` : label}<${Icon} name="CaretDown" class="size-3 text-muted-foreground" /></button>`}>
    ${(close) => html`<div role="listbox">${[{ value: '', label: 'Any' }, ...options].map((o) => html`<button type="button" class=${C.filterOption} onClick=${() => { onChange(o.value); close(); }}>
      <span class="flex size-3.5 shrink-0 items-center justify-center">${o.value === value && html`<${Icon} name="Check" class="size-3.5" />`}</span>${o.label}</button>`)}</div>`}
  <//>`;
}

function ListPage({ playbooks, onNew }) {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [vis, setVis] = useState('');
  const [desc, setDesc] = useState(true);
  if (playbooks.length === 0) return html`<div class="pc-page flex flex-wrap items-center gap-4">
    <p class="text-sm text-muted-foreground">No playbooks yet. A playbook tells Magnar what to accept and what to flag in a type of contract.</p>
    <button type="button" class=${C.btnPrimary} onClick=${onNew}><${Icon} name="Plus" class="size-4" />New Playbook</button>
  </div>`;
  const rows = playbooks
    .filter((p) => (!country || p.country === country) && (!vis || p.visibility === vis) && (p.name + ' ' + p.description).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (desc ? b.edited.localeCompare(a.edited) : a.edited.localeCompare(b.edited)));
  return html`<div class="pc-page">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative w-64 max-w-full">
        <${Icon} name="MagnifyingGlass" class=${C.searchIcon} />
        <input data-slot="input" placeholder="Search playbooks..." aria-label="Search playbooks" class=${C.searchInput} type="text" value=${q} onInput=${(e) => setQ(e.target.value)} />
      </div>
      <${FilterPill} label="Country" value=${country} onChange=${setCountry} options=${['CL', 'PE', 'CO', 'MX'].map((c) => ({ value: c, label: countryName(c) }))} />
      <${FilterPill} label="Visibility" value=${vis} onChange=${setVis} options=${[{ value: 'private', label: 'Private' }, { value: 'shared', label: 'Shared' }]} />
      <span class="ml-auto rd-num text-xs text-muted-foreground">${plural(rows.length, 'playbook', 'playbooks')}</span>
    </div>
    <table class="pc-table">
      <thead><tr>
        <th>Name</th><th class="pc-num">Rules</th><th class="pc-c-country">Country</th><th class="pc-c-vis">Visibility</th>
        <th><button type="button" class="inline-flex items-center gap-1 hover:text-foreground" onClick=${() => setDesc(!desc)} aria-label="Sort by edited date">
          Edited<${Icon} name=${desc ? 'ArrowDown' : 'CaretUp'} class="size-3" /></button></th>
        <th class="pc-c-author">Author</th>
      </tr></thead>
      <tbody>${rows.map((p) => html`<tr key=${p.id} onClick=${() => { location.hash = '#/' + p.id; }}>
        <td><a href=${'#/' + p.id} class="block min-w-0" onClick=${(e) => e.stopPropagation()}>
          <span class="block truncate text-sm font-medium text-foreground">${p.name}</span>
          <span class="block truncate text-[13px] text-muted-foreground">${p.description}</span></a></td>
        <td class="pc-num">${p.rules.length}</td>
        <td class="pc-c-country"><${CountryTag} code=${p.country} /></td>
        <td class="pc-c-vis"><${Visibility} v=${p.visibility} /></td>
        <td class="rd-num" title=${fullDate(p.edited)}>${relTime(p.edited)}</td>
        <td class="pc-c-author truncate">${p.owner === ME ? 'You' : p.owner}</td>
      </tr>`)}</tbody>
    </table>
  </div>`;
}

// ------------------------------------------------------------ matriz
function Cell({ rule, pos, editing, changed, onEdit, onStop, onChange }) {
  const value = rule[pos.key];
  const [more, setMore] = useState(false);
  const ref = useRef();
  useEffect(() => { if (editing) { const t = ref.current; t?.focus(); t?.setSelectionRange(t.value.length, t.value.length); } }, [editing]);
  const label = html`<span class="pc-cell-label"><${PosDot} pos=${pos} />${pos.label}</span>`;
  if (editing) return html`<div class="pc-cell pc-cell-editing">${label}
    <textarea ref=${ref} class="pc-cell-input" aria-label=${rule.title + ': ' + pos.long} placeholder=${'Write the ' + pos.label.toLowerCase() + ' position'}
      value=${value} onInput=${(e) => onChange(e.target.value)} onBlur=${onStop}
      onKeyDown=${(e) => { if (e.key === 'Escape' || (e.key === 'Enter' && (e.metaKey || e.ctrlKey))) { e.preventDefault(); e.stopPropagation(); onStop(); } }}></textarea>
  </div>`;
  if (!value.trim()) return html`<div class="pc-cell">${label}<button type="button" class="pc-empty" onClick=${onEdit}>Not defined</button></div>`;
  const long = value.length > 120;
  return html`<div class=${cx('pc-cell', changed && 'pc-changed')}>${label}
    <button type="button" class=${cx('pc-cell-text', long && !more && 'pc-clamp')} onClick=${onEdit} title="Click to edit">${value}</button>
    ${long && html`<button type="button" class="mt-1 text-xs text-muted-foreground hover:text-foreground" onClick=${() => setMore(!more)}>${more ? 'Show less' : 'Show more'}</button>`}
  </div>`;
}

function StartOptions({ onExtract, onTemplate }) {
  return html`<div class="pc-start">
    <button type="button" class="pc-start-opt" onClick=${onExtract}>
      <${Icon} name="FileArrowUp" class="size-4 text-muted-foreground" />
      <span class="block text-sm font-medium">Extract from a model contract</span>
      <span class="block text-[13px] leading-5 text-muted-foreground">Magnar reads the contract and fills the matrix. You accept or discard each row.</span>
    </button>
    <div class="pc-start-opt">
      <${Icon} name="Copy" class="size-4 text-muted-foreground" />
      <span class="block text-sm font-medium">Start from a template</span>
      <span class="mt-1 flex flex-wrap gap-1.5">${TEMPLATES.map(([label, id]) => html`<button type="button" class="pc-pill" onClick=${() => onTemplate(id)}>${label}</button>`)}</span>
    </div>
    <div class="pc-start-opt">
      <${Icon} name="File" class="size-4 text-muted-foreground" />
      <span class="block text-sm font-medium">Start blank</span>
      <span class="block text-[13px] leading-5 text-muted-foreground">Add clauses one by one with “Add clause” below.</span>
    </div>
  </div>`;
}

function Matrix({ pb, saved, cell, activeRule, setCell, openRule, update }) {
  const savedRule = (id) => saved.rules.find((r) => r.id === id);
  const setRule = (id, patch) => update((d) => ({ ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const drop = (id) => update((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== id) }));
  const add = () => { const r = blankRule(pb.rules.length); update((d) => ({ ...d, rules: [...d.rules, r] })); openRule(r.id); };
  return html`<div class="pc-matrix" role="table" aria-label="Positions matrix">
    <div class="pc-row pc-head" role="row">
      <div class="pc-clause" role="columnheader">Clause</div>
      ${POSITIONS.map((p) => html`<div role="columnheader" class="flex items-center gap-2"><${PosDot} pos=${p} />${p.label}</div>`)}
    </div>
    ${pb.rules.map((r, i) => {
      const old = savedRule(r.id);
      return html`<div key=${r.id} role="row" class=${cx('pc-row', !old && !r.suggested && 'pc-added', r.suggested && 'rd-suggested', activeRule === r.id && 'pc-row-on')}>
        <div class="pc-clause" role="rowheader">
          <button type="button" class="pc-clause-btn" onClick=${() => openRule(r.id)}>
            <span class="pc-idx rd-num">${i + 1}</span>
            <span class="min-w-0 flex-1 text-left">${r.title || 'Untitled clause'}</span>
          </button>
          ${r.suggested && html`<div class="mt-2 flex flex-wrap items-center gap-1 pl-6">
            <span class="mr-1 text-xs text-tint-ink">Suggested</span>
            <button type="button" class=${C.btnOutlineXs} onClick=${() => setRule(r.id, { suggested: false })}><${Icon} name="Check" class="size-3.5" />Accept</button>
            <button type="button" class="h-6 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${() => drop(r.id)}>Discard</button>
          </div>`}
        </div>
        ${POSITIONS.map((p) => html`<${Cell} rule=${r} pos=${p} editing=${cell === r.id + '.' + p.key} changed=${old && old[p.key] !== r[p.key]}
          onEdit=${() => setCell(r.id + '.' + p.key)} onStop=${() => setCell(null)} onChange=${(v) => setRule(r.id, { [p.key]: v })} />`)}
      </div>`;
    })}
    <div class="pc-row pc-addrow"><button type="button" class="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground" onClick=${add}>
      <${Icon} name="Plus" class="size-4" />Add clause</button></div>
  </div>`;
}

// ------------------------------------------------------------ panel lateral
function RulePanel({ rule, index, count, expanded, onChange, onNav, onClose, onExpand, onDelete }) {
  return html`<aside class="pc-panel" data-expanded=${expanded ? '' : undefined} aria-label="Rule">
    <header class="flex h-11 shrink-0 items-center gap-1 border-b px-2">
      <button type="button" class="pc-only-narrow inline-flex h-7 items-center gap-1 rounded-md px-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${onClose}><${Icon} name="ArrowLeft" class="size-4" />Back</button>
      <div class="flex min-w-0 flex-1 items-baseline gap-2 px-1.5">
        <span class="truncate text-sm font-medium">${rule.title || 'Untitled clause'}</span>
        <span class="shrink-0 rd-num text-xs text-muted-foreground">${index + 1} of ${count}</span>
      </div>
      <${Tip} label="Previous clause" kbd="⌘↑"><button type="button" class=${C.btnGhostIcon7} aria-label="Previous clause" disabled=${index === 0} onClick=${() => onNav(-1)}><${Icon} name="CaretUp" class="size-4" /></button><//>
      <${Tip} label="Next clause" kbd="⌘↓"><button type="button" class=${C.btnGhostIcon7} aria-label="Next clause" disabled=${index === count - 1} onClick=${() => onNav(1)}><${Icon} name="CaretDown" class="size-4" /></button><//>
      <span class="pc-hide-narrow mx-0.5 h-4 w-px bg-border"></span>
      <span class="pc-hide-narrow"><${Tip} label=${expanded ? 'Collapse' : 'Expand'} side="left"><button type="button" class=${C.btnGhostIcon7} aria-label=${expanded ? 'Collapse' : 'Expand'} onClick=${onExpand}><${Icon} name=${expanded ? 'ArrowsInSimple' : 'ArrowsOutSimple'} class="size-4" /></button><//></span>
      <span class="pc-hide-narrow"><${Tip} label="Close" kbd="Esc" side="left"><button type="button" class=${C.btnGhostIcon7} aria-label="Close" onClick=${onClose}><${Icon} name="X" class="size-4" /></button><//></span>
    </header>
    <div class="pc-panel-body">
      <div class="space-y-1.5">
        <label class="text-xs font-medium text-muted-foreground" for="clause-title">Clause</label>
        <input id="clause-title" class="rd-inline text-lg font-medium leading-7" placeholder="Name the clause, e.g. Ley aplicable y jurisdicción" value=${rule.title} onInput=${(e) => onChange({ title: e.target.value })} />
      </div>
      <div class="pc-panel-positions">
        ${POSITIONS.map((p) => html`<div class="space-y-1.5">
          <label class="text-xs font-medium">${p.long}</label>
          <div class="rd-pos" style=${`--dot: ${p.color}`}>
            <textarea class="rd-pos-input" rows="2" aria-label=${p.long} placeholder="Not defined" value=${rule[p.key]} onInput=${(e) => onChange({ [p.key]: e.target.value })}></textarea>
          </div>
        </div>`)}
      </div>
      <div class="space-y-1.5">
        <label class="text-xs font-medium" for="clause-note">Internal note</label>
        <textarea id="clause-note" data-slot="textarea" class=${C.textarea} rows="3" placeholder="Context for your team. Magnar does not use it in the review."
          value=${rule.note || ''} onInput=${(e) => onChange({ note: e.target.value })}></textarea>
      </div>
      <div class="border-t pt-3"><button type="button" class="inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive" onClick=${onDelete}>
        <${Icon} name="Trash" class="size-3.5" />Delete clause</button></div>
    </div>
  </aside>`;
}

// ------------------------------------------------------------ crear
function NewDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('CL');
  const [vis, setVis] = useState('private');
  useEffect(() => { if (open) { setName(''); setCountry('CL'); setVis('private'); } }, [open]);
  return html`<${Dialog} open=${open} onClose=${onClose}>
    <div data-slot="dialog-header" class="flex flex-col gap-2">
      <h2 data-slot="dialog-title" class="cn-font-heading text-base leading-none font-medium">New Playbook</h2>
      <p data-slot="dialog-description" class=${C.dialogDescription}>Next, you choose how to fill the positions matrix.</p>
    </div>
    <form class="space-y-5" onSubmit=${(e) => { e.preventDefault(); name.trim() && onCreate({ name: name.trim(), country, visibility: vis }); }}>
      <${Field} label="Name"><input data-slot="input" autocomplete="off" placeholder="e.g. Servicios cloud" class=${C.input} type="text" value=${name} onInput=${(e) => setName(e.target.value)} /><//>
      <div class="grid grid-cols-2 gap-3">
        <${Field} label="Country"><${CountrySelect} value=${country} onChange=${setCountry} /><//>
        <${Field} label="Visibility"><${VisibilitySelect} value=${vis} onChange=${setVis} /><//>
      </div>
      <div data-slot="dialog-footer" class=${C.dialogFooter}>
        <button type="button" data-slot="button" class=${C.btnOutline} onClick=${onClose}>Cancel</button>
        <button type="submit" disabled=${!name.trim()} data-slot="button" class=${C.btnPrimary}>Create</button>
      </div>
    </form>
  <//>`;
}

// ------------------------------------------------------------ app
function demoPlaybook(state) {
  return {
    id: 'servicios-cloud', name: 'Servicios cloud', type: 'Services', description: 'Contratos de software como servicio con proveedores cloud.',
    country: 'CL', visibility: 'private', owner: ME, edited: todayIso, file: SUGGESTED_FROM_CONTRACT.file, extracting: state === 'loading',
    rules: state === 'suggested' ? SUGGESTED_FROM_CONTRACT.rules.map((r) => ({ ...r, suggested: true })) : [],
  };
}

function PlaybookCrumb({ pb, playbooks }) {
  return html`<${Breadcrumb} items=${[
    { label: 'Knowledge', href: '#/' },
    { label: 'Playbooks', href: '#/' },
    { node: html`<${Popover} class=${C.popoverBase + ' w-72 p-1'}
      trigger=${(p) => html`<button type="button" ...${p} class="flex min-w-0 items-center gap-1 rounded-md px-1 py-0.5 font-semibold text-foreground hover:bg-muted"><h1 class="truncate">${pb.name || 'Untitled playbook'}</h1><${Icon} name="CaretDown" class="size-3 shrink-0 text-muted-foreground" /></button>`}>
      ${(close) => html`<div class="max-h-80 overflow-y-auto">${playbooks.map((p) => html`<a href=${'#/' + p.id} onClick=${close} class=${cx(C.filterOption, 'justify-between')}>
        <span class="truncate">${p.name}</span>${p.id === pb.id && html`<${Icon} name="Check" class="size-3.5 shrink-0" />`}</a>`)}</div>`}
    <//>` },
  ]} />`;
}

function changeCount(draft, saved) {
  if (!draft) return 0;
  let n = (draft.name !== saved.name) + (draft.description !== saved.description);
  draft.rules.forEach((r) => { const o = saved.rules.find((x) => x.id === r.id); if (!o) n++; else POSITIONS.forEach((p) => { if (o[p.key] !== r[p.key]) n++; }); if (o && (o.title !== r.title || (o.note || '') !== (r.note || '') || o.suggested !== r.suggested)) n++; });
  n += saved.rules.filter((o) => !draft.rules.some((r) => r.id === o.id)).length;
  return n;
}

function App() {
  const { path, params, nav } = useHashState();
  const [saved, setSaved] = useState(() => {
    if (params.empty) return [];
    const list = PLAYBOOKS.map((p) => ({ ...p, rules: p.rules.map((r) => ({ ...r })) }));
    if (params.demo) list.unshift(demoPlaybook(params.demo));
    return list;
  });
  const [drafts, setDrafts] = useState(() => {
    if (!params.dirty) return {};
    const ti = PLAYBOOKS.find((p) => p.id === 'servicios-ti');
    return { [ti.id]: { ...ti, rules: ti.rules.map((r) => (r.id === 'r3' ? { ...r, fallback: 'Uso de datos anonimizados para mejorar el servicio, informado al cliente.' } : r.id === 'r6' ? { ...r, fallback: 'Aviso de 45 días.' } : r)) } };
  });
  const split = splitParam();
  useEffect(() => { if (params.demo && !saved.some((p) => p.id === 'servicios-cloud')) setSaved((s) => [demoPlaybook(params.demo), ...s]); }, [params.demo]);

  const savedPb = saved.find((p) => p.id === path);
  const pb = savedPb && (drafts[path] || savedPb);
  const ruleIdx = pb ? pb.rules.findIndex((r) => r.id === params.rule) : -1;
  const rule = pb?.rules[ruleIdx];
  const expanded = !!params.expand && !!rule;
  useEffect(() => { document.title = (pb ? pb.name + ' · ' : '') + 'Playbooks - Magnar'; }, [pb?.name]);
  useEffect(() => {
    if (!pb?.extracting || params.hold) return;
    const t = setTimeout(() => setSaved((s) => s.map((p) => (p.id === pb.id ? { ...p, extracting: false, rules: SUGGESTED_FROM_CONTRACT.rules.map((r) => ({ ...r, id: r.id + p.id, suggested: true })) } : p))), 2600);
    return () => clearTimeout(t);
  }, [pb?.id, pb?.extracting]);

  const keep = (extra) => ({ ...(params.demo ? { demo: params.demo } : {}), ...extra });
  const go = (extra) => nav(path, keep(extra), { replace: true });
  const update = (fn) => setDrafts((d) => ({ ...d, [path]: fn(d[path] || savedPb) }));
  const save = () => { setSaved((s) => s.map((p) => (p.id === path ? { ...drafts[path], edited: todayIso } : p))); setDrafts((d) => { const n = { ...d }; delete n[path]; return n; }); };
  const discard = () => setDrafts((d) => { const n = { ...d }; delete n[path]; return n; });
  const openRule = (id, extra = {}) => go({ rule: id, expand: params.expand, ...extra });
  const navRule = (dir) => { const n = pb.rules[ruleIdx + dir]; if (n) openRule(n.id); };

  const keyRef = useRef();
  keyRef.current = (e) => {
    if (!rule || document.querySelector('[data-slot=dialog-content],[data-slot=popover-content],[data-slot=select-content]')) return;
    if (e.key === 'Escape') { e.preventDefault(); go({}); }
    if ((e.metaKey || e.ctrlKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); navRule(e.key === 'ArrowUp' ? -1 : 1); }
  };
  useEffect(() => { const f = (e) => keyRef.current(e); addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, []);

  const create = ({ name, country, visibility }) => {
    const id = 'pb-' + Date.now().toString(36);
    setSaved((s) => [{ id, name, type: '', description: '', country, visibility, owner: ME, edited: todayIso, file: SUGGESTED_FROM_CONTRACT.file, rules: [] }, ...s]);
    nav(id, {});
  };
  const extract = () => setSaved((s) => s.map((p) => (p.id === path ? { ...p, extracting: true } : p)));
  const fromTemplate = (id) => { const t = PLAYBOOKS.find((p) => p.id === id); update((d) => ({ ...d, rules: t.rules.map((r) => ({ ...r, id: r.id + '-' + id })) })); };
  const listed = saved.map((p) => drafts[p.id] || p);
  const count = pb ? changeCount(drafts[path], savedPb) : 0;

  let header; let body;
  if (pb) {
    header = html`<${PageHeader} title=${html`<${PlaybookCrumb} pb=${pb} playbooks=${listed} />`} />`;
    const live = pb.rules.length;
    body = html`<div class="pc-host">
      <div class="pc-scroll">
        <header class="pc-head-block">
          <input class="rd-inline rd-title pc-title" aria-label="Playbook name" placeholder="Untitled playbook" value=${pb.name} onInput=${(e) => update((d) => ({ ...d, name: e.target.value }))} />
          <input class="rd-inline mt-1 text-sm text-muted-foreground" aria-label="Description" placeholder="Add a description" value=${pb.description} onInput=${(e) => update((d) => ({ ...d, description: e.target.value }))} />
          <p class="pc-meta rd-num">
            <${CountryTag} code=${pb.country} /><${Sep} /><${Visibility} v=${pb.visibility} /><${Sep} />
            <span title=${fullDate(savedPb.edited)}>Edited ${relTime(savedPb.edited)} by ${savedPb.owner === ME ? 'you' : savedPb.owner}</span>
          </p>
          ${live > 0 && html`<p class="pc-coverage rd-num">${coverage(pb.rules).map((t, i) => html`${i > 0 && html`<${Sep} />`}<span class=${i > 0 && !t.startsWith('every') ? 'text-foreground' : ''}>${t}</span>`)}</p>`}
        </header>
        ${live === 0 && !pb.extracting && html`<${StartOptions} onExtract=${extract} onTemplate=${fromTemplate} />`}
        ${pb.extracting && html`<div class="pc-extracting" role="status"><${WorkDots} />Reading ${pb.file} and filling the matrix…</div>`}
        ${pb.rules.some((r) => r.suggested) && html`<div class="pc-suggest-note">
          <span>${plural(pb.rules.filter((r) => r.suggested).length, 'row', 'rows')} suggested from ${pb.file}. Accept or discard each one.</span>
          <button type="button" class=${C.btnOutlineXs} onClick=${() => update((d) => ({ ...d, rules: d.rules.map((r) => ({ ...r, suggested: false })) }))}>Accept all</button>
        </div>`}
        <${Matrix} pb=${pb} saved=${savedPb} cell=${params.cell} activeRule=${params.rule} update=${update}
          setCell=${(c) => go(c ? { cell: c } : {})} openRule=${(id) => openRule(id)} />
      </div>
      ${count > 0 && html`<div class="pc-savebar" role="status">
        <span class="rd-num">${plural(count, 'unsaved change', 'unsaved changes')}</span>
        <span class="ml-auto"></span>
        <button type="button" class="h-7 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${discard}>Discard</button>
        <button type="button" class=${C.btnPrimaryXs} onClick=${save}>Save</button>
      </div>`}
      ${rule && html`<${RulePanel} rule=${rule} index=${ruleIdx} count=${pb.rules.length} expanded=${expanded}
        onChange=${(patch) => update((d) => ({ ...d, rules: d.rules.map((r) => (r.id === rule.id ? { ...r, ...patch } : r)) }))}
        onNav=${navRule} onClose=${() => go({})} onExpand=${() => openRule(rule.id, { expand: expanded ? undefined : 1 })}
        onDelete=${() => { update((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== rule.id) })); go({}); }} />`}
    </div>`;
  } else {
    header = html`<${PageHeader} inlineTabs=${html`<${SectionTabs} />`}
      actions=${html`<button type="button" data-slot="button" class=${C.btnPrimary} onClick=${() => nav(path, { new: 1 })}><${Icon} name="Plus" class="size-4" />New Playbook</button>`} />`;
    body = html`<div class="pc-host"><div class="pc-scroll"><${ListPage} playbooks=${listed} onNew=${() => nav(path, { new: 1 })} /></div></div>`;
  }

  return html`<${Frame} split=${split} tab=${{ title: pb ? pb.name : 'My Playbooks', icon: 'Books' }}>
    ${header}
    <div class="flex min-h-0 flex-1 flex-col">${body}</div>
    <${NewDialog} open=${!!params.new} onClose=${() => nav(path, {}, { replace: true })} onCreate=${create} />
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
