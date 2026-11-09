// Playbooks · Rediseño B: Documento
// Un playbook se lee como un documento legal (una columna, de arriba a abajo) y se edita donde se lee.
// La biblioteca es su propia página; dentro del playbook se cambia de playbook desde el breadcrumb.
//
// Estados por URL:
//   #/                              biblioteca
//   #/?empty=1                      biblioteca vacía
//   #/new  (?start=contract&file=1) crear playbook
//   #/servicios-ti                  documento en lectura
//   #/servicios-ti?edit=r2          regla en edición   (&text=1: editar como texto)
//   #/servicios-ti?dirty=1          cambios sin guardar
//   #/servicios-cloud?demo=loading&hold=1 · ?demo=suggested   crear desde contrato
//   ?split=50 / ?split=60 (antes del #) vista dividida con el chat a la izquierda
import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon } from '../shared/icons.js';
import { PageHeader, Breadcrumb } from '../shared/shell.js';
import { Popover, cx } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import {
  PLAYBOOKS, SUGGESTED_FROM_CONTRACT, ME, TODAY, POSITIONS, CONTRACT_TYPES, plural, relTime, fullDate, countryName,
  ruleToText, textToRule, blankRule, splitParam,
} from '../shared/playbooks-seed.js';
import {
  useHashState, SectionTabs, Sep, Visibility, CountryTag, CountrySelect, VisibilitySelect, START_OPTIONS, GrowText,
} from '../shared/redesign-ui.js';

const todayIso = TODAY.toISOString().slice(0, 10);
const LADDER = { standard: 'Ideal', fallback: 'Acceptable', unacceptable: 'Unacceptable' };

// ------------------------------------------------------------ biblioteca
function FilterPill({ label, value, options, onChange }) {
  const current = options.find((o) => o.value === value);
  return html`<${Popover} class=${C.popoverBase + ' w-56 p-1'}
    trigger=${(p) => html`<button type="button" ...${p} class=${cx('pb-pill', value && 'pb-pill-on')}>
      ${value ? html`<span class="text-muted-foreground">${label}</span>${current.label}` : label}<${Icon} name="CaretDown" class="size-3 text-muted-foreground" /></button>`}>
    ${(close) => html`<div role="listbox">
      ${[{ value: '', label: 'Any' }, ...options].map((o) => html`<button type="button" class=${C.filterOption} onClick=${() => { onChange(o.value); close(); }}>
        <span class="flex size-3.5 shrink-0 items-center justify-center">${o.value === value && html`<${Icon} name="Check" class="size-3.5" />`}</span>${o.label}</button>`)}
    </div>`}
  <//>`;
}

function LibraryRow({ pb }) {
  const n = pb.rules.filter((r) => !r.suggested).length;
  return html`<li><a href=${'#/' + pb.id} class="pb-lrow">
    <span class="pb-lname min-w-0">
      <span class="block truncate text-sm font-medium leading-5">${pb.name}</span>
      <span class="block truncate text-[13px] leading-5 text-muted-foreground">${pb.description}</span>
      <span class="pb-lmeta-inline rd-num">${plural(n, 'rule', 'rules')}<${Sep} /><${CountryTag} code=${pb.country} /><${Sep} /><${Visibility} v=${pb.visibility} /><${Sep} />${relTime(pb.edited)}</span>
    </span>
    <span class="pb-lcol rd-num">${plural(n, 'rule', 'rules')}</span>
    <span class="pb-lcol"><${CountryTag} code=${pb.country} /></span>
    <span class="pb-lcol"><${Visibility} v=${pb.visibility} /></span>
    <span class="pb-lcol rd-num" title=${fullDate(pb.edited)}>${relTime(pb.edited)}</span>
    <span class="pb-lcol truncate">${pb.owner === ME ? 'You' : pb.owner}</span>
  </a></li>`;
}

function Library({ playbooks, onNew }) {
  const [q, setQ] = useState('');
  const [country, setCountry] = useState('');
  const [vis, setVis] = useState('');
  const [type, setType] = useState('');
  if (playbooks.length === 0) return html`<div class="pb-page"><div class="flex flex-wrap items-center gap-4 py-2">
    <p class="text-sm text-muted-foreground">No playbooks yet. A playbook tells Magnar what to accept and what to flag in a type of contract.</p>
    <button type="button" class=${C.btnPrimary} onClick=${onNew}><${Icon} name="Plus" class="size-4" />New Playbook</button>
  </div></div>`;
  const match = (p) => (!country || p.country === country) && (!vis || p.visibility === vis) && (!type || p.type === type)
    && (p.name + ' ' + p.description).toLowerCase().includes(q.toLowerCase());
  const groups = [['My playbooks', playbooks.filter((p) => p.owner === ME && match(p))], ['Shared with me', playbooks.filter((p) => p.owner !== ME && match(p))]];
  return html`<div class="pb-page">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative w-64 max-w-full">
        <${Icon} name="MagnifyingGlass" class=${C.searchIcon} />
        <input data-slot="input" placeholder="Search playbooks..." aria-label="Search playbooks" class=${C.searchInput} type="text" value=${q} onInput=${(e) => setQ(e.target.value)} />
      </div>
      <${FilterPill} label="Country" value=${country} onChange=${setCountry} options=${['CL', 'PE', 'CO', 'MX'].map((c) => ({ value: c, label: countryName(c) }))} />
      <${FilterPill} label="Visibility" value=${vis} onChange=${setVis} options=${[{ value: 'private', label: 'Private' }, { value: 'shared', label: 'Shared' }]} />
      <${FilterPill} label="Contract type" value=${type} onChange=${setType} options=${CONTRACT_TYPES.map((t) => ({ value: t, label: t }))} />
    </div>
    <div class="pb-lhead" aria-hidden="true"><span>Name</span><span>Rules</span><span>Country</span><span>Visibility</span><span>Edited</span><span>Author</span></div>
    ${groups.map(([title, items]) => html`<section class="mt-6">
      <h2 class="rd-eyebrow pb-2">${title} <span class="rd-num">· ${items.length}</span></h2>
      ${items.length ? html`<ul class="pb-list">${items.map((p) => html`<${LibraryRow} key=${p.id} pb=${p} />`)}</ul>`
        : html`<p class="border-t py-3 text-[13px] text-muted-foreground">No playbooks match these filters.</p>`}
    </section>`)}
  </div>`;
}

// ------------------------------------------------------------ documento
function Ladder({ rule, editing, onChange }) {
  return html`<div class="pb-ladder">
    ${POSITIONS.map((p) => html`<div class="pb-step">
      <div class="pb-step-label"><span class="rd-dot" style=${`--dot: ${p.color}`}></span><span class="rd-eyebrow">${LADDER[p.key]}</span></div>
      ${editing
        ? html`<${GrowText} class="rd-inline pb-step-text" aria-label=${p.long} placeholder=${'Not defined. Write the ' + LADDER[p.key].toLowerCase() + ' position'} value=${rule[p.key]} onInput=${(v) => onChange({ [p.key]: v })} />`
        : html`<p class=${cx('pb-step-text', !rule[p.key].trim() && 'text-muted-foreground')}>${rule[p.key].trim() || 'Not defined'}</p>`}
    </div>`)}
  </div>`;
}

function RuleSection({ rule, editing, dimmed, textMode, onEdit, onDone, onText, onChange, onDelete, onAccept, onDiscard }) {
  const ref = useRef();
  useEffect(() => { if (editing) setTimeout(() => ref.current?.querySelector('input,textarea')?.focus(), 0); }, [editing]);
  return html`<section ref=${ref} id=${'rule-' + rule.id} data-rule=${rule.id} class=${cx('pb-rule', editing && 'pb-rule-editing', dimmed && 'pb-dim', rule.suggested && 'pb-proposed')}>
    <header class="flex items-start gap-3">
      ${editing
        ? html`<input class="rd-inline pb-rule-title min-w-0 flex-1" aria-label="Clause name" placeholder="Name the clause, e.g. Ley aplicable y jurisdicción" value=${rule.title} onInput=${(e) => onChange({ title: e.target.value })} />`
        : html`<h2 class="pb-rule-title min-w-0 flex-1">${rule.title || 'Untitled rule'}</h2>`}
      ${rule.suggested && !editing && html`<div class="flex shrink-0 items-center gap-1 text-xs">
        <span class="mr-2 text-tint-ink">Proposed</span>
        <button type="button" class=${C.btnOutlineXs} onClick=${onAccept}><${Icon} name="Check" class="size-3.5" />Accept</button>
        <button type="button" class="h-6 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${onEdit}>Edit</button>
        <button type="button" class="h-6 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${onDiscard}>Discard</button>
      </div>`}
      ${!rule.suggested && !editing && html`<button type="button" class="pb-edit-btn" onClick=${onEdit}><${Icon} name="PencilSimple" class="size-3.5" />Edit</button>`}
      ${editing && html`<div class="flex shrink-0 items-center gap-1">
        <button type="button" class="inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground" aria-pressed=${textMode} onClick=${onText}>
          <${Icon} name=${textMode ? 'ListChecks' : 'TextAlignLeft'} class="size-3.5" />${textMode ? 'Edit as fields' : 'Edit as text'}</button>
        <button type="button" class=${C.btnOutlineXs} onClick=${onDone}>Done</button>
      </div>`}
    </header>
    ${editing && textMode
      ? html`<div class="mt-4 space-y-2">
          <textarea class=${C.textarea + ' leading-6'} rows="6" aria-label="Rule as text" value=${ruleToText(rule)} onInput=${(e) => onChange(textToRule(e.target.value, rule))}></textarea>
          <p class="text-xs text-muted-foreground">Same free-text format Magnar uses today. Lines that start with “Posición Estándar”, “Alternativa Aceptable” or “Inaceptable” fill the positions.</p>
        </div>`
      : html`<${Ladder} rule=${rule} editing=${editing} onChange=${onChange} />`}
    <footer class="mt-4 flex items-center gap-3 text-xs text-muted-foreground">
      <span>Evaluated separately</span>
      ${editing && html`<button type="button" class="ml-auto inline-flex h-6 items-center gap-1.5 rounded-md px-1.5 hover:bg-destructive/10 hover:text-destructive" onClick=${onDelete}><${Icon} name="Trash" class="size-3.5" />Delete rule</button>`}
    </footer>
  </section>`;
}

function Insert({ onAdd }) {
  return html`<div class="pb-insert"><button type="button" onClick=${onAdd}><${Icon} name="Plus" class="size-3.5" />Add rule</button></div>`;
}

function Outline({ rules, active, onJump }) {
  return html`<nav class="pb-outline" aria-label="Rules in this playbook">
    <p class="rd-eyebrow mb-2">Rules</p>
    <ol>${rules.map((r) => html`<li><a href=${'#rule-' + r.id} class=${cx('pb-outline-link', r.id === active && 'pb-outline-on')}
      onClick=${(e) => { e.preventDefault(); onJump(r.id); }}>${r.title || 'Untitled rule'}</a></li>`)}</ol>
  </nav>`;
}

function Processing({ pb }) {
  const [step, setStep] = useState(0);
  useEffect(() => { const t = setTimeout(() => setStep(1), 1100); return () => clearTimeout(t); }, []);
  return html`<div class="pb-rule" role="status">
    <p class="text-sm text-muted-foreground">${step === 0 ? `Reading ${pb.file}…` : 'Finding the clauses Magnar can turn into rules…'}</p>
    <div class="rd-progress mt-3 max-w-80"><span></span></div>
  </div>`;
}

function changeCount(draft, saved) {
  if (!draft) return 0;
  let n = (draft.name !== saved.name) + (draft.description !== saved.description);
  const ids = new Set([...draft.rules.map((r) => r.id), ...saved.rules.map((r) => r.id)]);
  ids.forEach((id) => { const a = draft.rules.find((r) => r.id === id); const b = saved.rules.find((r) => r.id === id); if (JSON.stringify(a) !== JSON.stringify(b)) n++; });
  return n;
}

function Document({ pb, saved, editId, textMode, nav, update, onSave, onDiscard }) {
  const scrollRef = useRef();
  const [active, setActive] = useState(pb.rules[0]?.id);
  const count = changeCount(pb, saved);
  const setRule = (id, patch) => update((d) => ({ ...d, rules: d.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const addAt = (i) => { const r = blankRule(i); update((d) => { const rules = [...d.rules]; rules.splice(i, 0, r); return { ...d, rules }; }); nav({ edit: r.id }); };
  const drop = (id) => { update((d) => ({ ...d, rules: d.rules.filter((r) => r.id !== id) })); nav({}); };

  // Índice: la regla activa es la última cuya parte superior ya pasó el borde de lectura
  useEffect(() => {
    const el = scrollRef.current; if (!el) return;
    const f = () => {
      const top = el.getBoundingClientRect().top + 96;
      let cur = pb.rules[0]?.id;
      el.querySelectorAll('[data-rule]').forEach((s) => { if (s.getBoundingClientRect().top <= top) cur = s.dataset.rule; });
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 4) cur = pb.rules[pb.rules.length - 1]?.id;
      setActive(cur);
    };
    f(); el.addEventListener('scroll', f, { passive: true });
    return () => el.removeEventListener('scroll', f);
  }, [pb.id, pb.rules.length]);
  useEffect(() => { if (editId) scrollRef.current?.querySelector(`[data-rule="${editId}"]`)?.scrollIntoView({ block: 'nearest' }); }, [editId]);
  const jump = (id) => { const s = scrollRef.current.querySelector(`[data-rule="${id}"]`); scrollRef.current.scrollTo({ top: s.offsetTop - 24, behavior: 'smooth' }); };

  const proposed = pb.rules.filter((r) => r.suggested).length;
  return html`<div class="pb-host">
    <div ref=${scrollRef} class="pb-scroll">
      <div class="pb-doc-grid">
        <article class="pb-doc">
          <header>
            <input class="rd-inline rd-title pb-doc-title" aria-label="Playbook name" placeholder="Untitled playbook" value=${pb.name} onInput=${(e) => update((d) => ({ ...d, name: e.target.value }))} />
            <${GrowText} class="rd-inline mt-3 text-[15px] leading-7 text-muted-foreground" aria-label="Description" placeholder="Add a description: when should someone use this playbook?"
              value=${pb.description} onInput=${(v) => update((d) => ({ ...d, description: v }))} />
            <p class="pb-meta rd-num">
              <${CountryTag} code=${pb.country} /><${Sep} /><${Visibility} v=${pb.visibility} /><${Sep} />
              <span>${plural(pb.rules.filter((r) => !r.suggested).length, 'rule', 'rules')}</span><${Sep} />
              <span title=${fullDate(saved.edited)}>Edited ${relTime(saved.edited)} by ${saved.owner === ME ? 'you' : saved.owner}</span>
            </p>
          </header>
          ${proposed > 0 && html`<div class="mt-8 flex flex-wrap items-center justify-between gap-2 border-t pt-4 text-[13px] text-muted-foreground">
            <span>Magnar proposed ${plural(proposed, 'rule', 'rules')} from ${pb.file}. Accept, edit or discard each one.</span>
            <button type="button" class=${C.btnOutlineXs} onClick=${() => update((d) => ({ ...d, rules: d.rules.map((r) => ({ ...r, suggested: false })) }))}>Accept all</button>
          </div>`}
          <div class="pb-rules">
            ${pb.extracting && html`<${Processing} pb=${pb} />`}
            ${pb.rules.map((r, i) => html`
              ${i > 0 && !editId && html`<${Insert} onAdd=${() => addAt(i)} />`}
              <${RuleSection} key=${r.id} rule=${r} editing=${editId === r.id} dimmed=${!!editId && editId !== r.id} textMode=${textMode}
                onEdit=${() => nav({ edit: r.id })} onDone=${() => nav({})} onText=${() => nav({ edit: r.id, text: textMode ? undefined : 1 })}
                onChange=${(patch) => setRule(r.id, patch)} onDelete=${() => drop(r.id)}
                onAccept=${() => setRule(r.id, { suggested: false })} onDiscard=${() => drop(r.id)} />`)}
            ${!pb.extracting && html`<div class="pb-end">
              ${pb.rules.length === 0 && html`<p class="mb-3 text-sm text-muted-foreground">This playbook has no rules yet. Each rule covers one clause and its three positions.</p>`}
              <button type="button" class=${C.btnOutlineSm} onClick=${() => addAt(pb.rules.length)}><${Icon} name="Plus" />Add rule</button>
            </div>`}
          </div>
        </article>
        ${pb.rules.length > 1 && html`<aside class="pb-outline-col"><${Outline} rules=${pb.rules} active=${editId || active} onJump=${jump} /></aside>`}
      </div>
    </div>
    ${count > 0 && html`<div class="pb-savebar" role="status">
      <span class="rd-num">${plural(count, 'unsaved change', 'unsaved changes')}</span>
      <span class="h-4 w-px bg-border"></span>
      <button type="button" class="h-7 rounded-md px-2 text-muted-foreground hover:bg-muted hover:text-foreground" onClick=${onDiscard}>Discard</button>
      <button type="button" class=${C.btnPrimaryXs} onClick=${onSave}>Save</button>
    </div>`}
  </div>`;
}

// ------------------------------------------------------------ crear (página)
function CreatePage({ params, onCreate, onCancel }) {
  const [name, setName] = useState(params.file ? 'Servicios cloud' : '');
  const [country, setCountry] = useState('CL');
  const [vis, setVis] = useState('private');
  const [start, setStart] = useState(params.start || '');
  const [file, setFile] = useState(params.file ? SUGGESTED_FROM_CONTRACT.file : null);
  const [brief, setBrief] = useState('');
  const ready = name.trim() && start && (start !== 'contract' || file) && (start !== 'describe' || brief.trim());
  return html`<div class="pb-scroll"><div class="pb-create">
    <h1 class="rd-title pb-create-q">What type of contract will you review?</h1>
    <p class="mt-2 text-[15px] leading-7 text-muted-foreground">A playbook holds your position for one type of contract. Magnar applies it when someone asks for a review.</p>
    <div class="pb-create-fields">
      <input data-slot="input" autocomplete="off" aria-label="Name" placeholder="Name, e.g. Servicios cloud" class=${C.input + ' min-w-0 flex-1'} value=${name} onInput=${(e) => setName(e.target.value)} />
      <${CountrySelect} value=${country} onChange=${setCountry} />
      <${VisibilitySelect} value=${vis} onChange=${setVis} />
    </div>
    <p class=${C.label + ' mt-8 mb-2 block'}>How do you want to start?</p>
    <div role="radiogroup" class="divide-y overflow-hidden rounded-lg border">
      ${START_OPTIONS.map((o) => html`<div>
        <button type="button" role="radio" aria-checked=${start === o.key} class=${cx('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', start === o.key ? 'bg-tint-wash' : 'hover:bg-muted/60')} onClick=${() => setStart(o.key)}>
          <${Icon} name=${o.icon} class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <span class="min-w-0 flex-1"><span class="block text-sm font-medium leading-5">${o.title}</span><span class="block text-[13px] leading-5 text-muted-foreground">${o.hint}</span></span>
          <span class="mt-0.5 flex size-4 shrink-0 items-center justify-center">${start === o.key && html`<${Icon} name="Check" class="size-4" />`}</span>
        </button>
        ${start === o.key && o.key === 'contract' && html`<div class="bg-tint-wash px-4 pb-3 pl-11">${file
          ? html`<div class="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"><${Icon} name="FileText" class="size-4 text-muted-foreground" /><span class="min-w-0 flex-1 truncate">${file}</span><span class="rd-num text-xs text-muted-foreground">1.2 MB</span>
              <button type="button" class=${C.btnGhostIcon7} aria-label="Remove file" onClick=${() => setFile(null)}><${Icon} name="X" class="size-3.5" /></button></div>`
          : html`<div class="flex items-center gap-3"><button type="button" class=${C.btnOutlineSm} onClick=${() => setFile(SUGGESTED_FROM_CONTRACT.file)}><${Icon} name="UploadSimple" />Choose file</button><span class="text-xs text-muted-foreground">PDF or DOCX, up to 20 MB</span></div>`}</div>`}
        ${start === o.key && o.key === 'describe' && html`<div class="bg-tint-wash px-4 pb-3 pl-11"><textarea data-slot="textarea" class=${C.textarea + ' bg-background'} rows="3"
          placeholder="e.g. Contratos cloud con proveedores: SLA mínimo 99,5%, datos alojados en Chile, sin renovación automática por más de un año." value=${brief} onInput=${(e) => setBrief(e.target.value)}></textarea></div>`}
      </div>`)}
    </div>
    <div class="mt-6 flex items-center justify-end gap-2">
      <button type="button" class=${C.btnOutline} onClick=${onCancel}>Cancel</button>
      <button type="button" class=${C.btnPrimary} disabled=${!ready} onClick=${() => onCreate({ name: name.trim(), country, visibility: vis, origin: start })}>Continue</button>
    </div>
  </div></div>`;
}

// ------------------------------------------------------------ app
function demoPlaybook(state) {
  return {
    id: 'servicios-cloud', name: 'Servicios cloud', type: 'Services', description: 'Contratos de software como servicio con proveedores cloud.',
    country: 'CL', visibility: 'private', owner: ME, edited: todayIso, origin: 'contract', file: SUGGESTED_FROM_CONTRACT.file,
    extracting: state === 'loading', rules: state === 'loading' ? [] : SUGGESTED_FROM_CONTRACT.rules.map((r) => ({ ...r, suggested: true })),
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
    return { [ti.id]: { ...ti, rules: ti.rules.map((r) => (r.id === 'r3' ? { ...r, fallback: 'Uso de datos anonimizados para mejorar el servicio, informado al cliente.' } : r.id === 'r7' ? { ...r, unacceptable: 'Subcontratación de servicios críticos sin aviso al cliente.' } : r)) } };
  });
  const split = splitParam();
  useEffect(() => { if (params.demo && !saved.some((p) => p.id === 'servicios-cloud')) setSaved((s) => [demoPlaybook(params.demo), ...s]); }, [params.demo]);

  const savedPb = saved.find((p) => p.id === path);
  const pb = savedPb && (drafts[path] || savedPb);
  useEffect(() => { document.title = (pb ? pb.name + ' · ' : '') + 'Playbooks - Magnar'; }, [pb?.name]);
  useEffect(() => {
    if (!pb?.extracting || params.hold) return;
    const t = setTimeout(() => setSaved((s) => s.map((p) => (p.id === pb.id ? { ...p, extracting: false, rules: SUGGESTED_FROM_CONTRACT.rules.map((r) => ({ ...r, id: r.id + p.id, suggested: true })) } : p))), 2600);
    return () => clearTimeout(t);
  }, [pb?.id, pb?.extracting]);
  // Esc termina la edición de una regla
  useEffect(() => { const f = (e) => { if (e.key === 'Escape' && params.edit && !document.querySelector('[data-slot=popover-content],[data-slot=select-content]')) nav(path, {}, { replace: true }); }; addEventListener('keydown', f); return () => removeEventListener('keydown', f); }, [params.edit, path]);

  const update = (fn) => setDrafts((d) => ({ ...d, [path]: fn(d[path] || savedPb) }));
  const save = () => { setSaved((s) => s.map((p) => (p.id === path ? { ...drafts[path], edited: todayIso } : p))); setDrafts((d) => { const n = { ...d }; delete n[path]; return n; }); nav(path, {}, { replace: true }); };
  const discard = () => { setDrafts((d) => { const n = { ...d }; delete n[path]; return n; }); nav(path, {}, { replace: true }); };
  const create = ({ name, country, visibility, origin }) => {
    const id = 'pb-' + Date.now().toString(36);
    setSaved((s) => [{ id, name, type: '', description: '', country, visibility, owner: ME, edited: todayIso, origin, file: origin === 'describe' ? 'your description' : SUGGESTED_FROM_CONTRACT.file, extracting: origin !== 'blank', rules: [] }, ...s]);
    nav(id, {});
  };
  const listed = saved.map((p) => drafts[p.id] || p);

  let header; let body; let tab;
  if (path === 'new') {
    tab = 'New playbook';
    header = html`<${PageHeader} title=${html`<${Breadcrumb} items=${[{ label: 'Knowledge', href: '#/' }, { label: 'Playbooks', href: '#/' }, { label: 'New playbook' }]} />`} />`;
    body = html`<div class="pb-host"><${CreatePage} params=${params} onCreate=${create} onCancel=${() => nav('', {})} /></div>`;
  } else if (pb) {
    tab = pb.name;
    header = html`<${PageHeader} title=${html`<${PlaybookCrumb} pb=${pb} playbooks=${listed} />`} />`;
    body = html`<${Document} key=${pb.id} pb=${pb} saved=${savedPb} editId=${params.edit} textMode=${!!params.text}
      nav=${(p) => nav(path, p, { replace: true })} update=${update} onSave=${save} onDiscard=${discard} />`;
  } else {
    tab = 'My Playbooks';
    header = html`<${PageHeader} inlineTabs=${html`<${SectionTabs} />`}
      actions=${html`<button type="button" data-slot="button" class=${C.btnPrimary} onClick=${() => nav('new', {})}><${Icon} name="Plus" class="size-4" />New Playbook</button>`} />`;
    body = html`<div class="pb-host"><div class="pb-scroll"><${Library} playbooks=${listed} onNew=${() => nav('new', {})} /></div></div>`;
  }

  return html`<${Frame} split=${split} tab=${{ title: tab, icon: 'Books' }}>
    ${header}
    <div class="flex min-h-0 flex-1 flex-col">${body}</div>
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
