// Playbooks · versión final (desde Figma 39:8958 / 39:9010 / 39:9204).
// Solo lo que Magnar ya tiene: lista con buscador, crear (nombre, país, descripción),
// reglas = título + texto libre (agregar, eliminar, guardar) y menú del playbook.
//
// Una sola escena con 3 modos:
//   full   biblioteca a todo el ancho
//   split  biblioteca colapsada a la izquierda + ventana (crear o detalle) a la derecha
//   wide   la ventana a todo el ancho (chevron del borde)
// Al pasar de un modo a otro las cards se reubican con FLIP y los anchos se animan.
//
// Estados por URL (para navegar y para las capturas):
//   #/                         biblioteca            #/?empty=1   biblioteca vacía
//   #/new                      crear, sin reglas     #/new?wide=1 crear a todo el ancho
//   #/new?demo=1               crear, escribiendo la primera regla
//   #/new?demo=3               crear, con 3 reglas cerradas
//   #/servicios-ti             detalle, reglas cerradas
//   #/servicios-ti?rule=r2     una regla abierta (lectura)
//   #/servicios-ti?edit=r4     una regla en edición
//   #/servicios-ti?dirty=1     cambios sin guardar
//   #/servicios-ti?added=1     regla recién agregada (&hold=1 deja fijo el tint para la captura)
//   ?split=50 / ?split=60 (antes del #) vista dividida con el chat a la izquierda
import { html, render, useState, useEffect, useLayoutEffect, useRef } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon, Flag } from '../shared/icons.js';
import { AlertDialog, DropdownMenu, cx } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { PLAYBOOKS, ME, plural, countryName, splitParam } from '../shared/playbooks-seed.js';
import { useHashState, CountrySelect } from '../shared/redesign-ui.js';

// ------------------------------------------------------------ datos
// En Magnar una regla es un título + un texto libre. Se escribe como lo haría un abogado:
// la posición estándar primero y luego lo aceptable y lo inaceptable.
const toBody = (r) => [r.standard, r.fallback && `Alternativa aceptable: ${r.fallback}`, r.unacceptable && `Inaceptable: ${r.unacceptable}`]
  .filter(Boolean).join('\n');
const SEED = PLAYBOOKS.map((p) => ({
  id: p.id, name: p.name, description: p.description, country: p.country, visibility: p.visibility, mine: p.owner === ME,
  rules: p.rules.map((r) => ({ id: r.id, title: r.title, body: toBody(r) })),
}));
let seq = 0;
const newRule = (title = '', body = '') => ({ id: 'n' + (++seq), title, body });
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const DEMO_RULES = () => [
  newRule('Niveles de servicio (SLA)', 'Disponibilidad mensual de 99,9%, medida por un tercero independiente.\nAlternativa aceptable: 99,5% con créditos de servicio por cada hora de caída.\nInaceptable: sin compromiso de disponibilidad o medida solo por el proveedor.'),
  newRule('Ubicación de los datos', 'Datos alojados en Chile o en países con nivel adecuado de protección.\nInaceptable: ubicación no informada o modificable sin aviso.'),
  newRule('Renovación automática', 'Renovación anual con aviso de no renovación de 30 días.\nInaceptable: renovación por períodos mayores a un año sin aviso.'),
];

// ------------------------------------------------------------ FLIP: las cards se reubican de forma continua
const FLIP = { rects: null };
const snapshot = () => {
  FLIP.rects = new Map();
  document.querySelectorAll('[data-flip]').forEach((el) => FLIP.rects.set(el.dataset.flip, el.getBoundingClientRect()));
};
function playFlip() {
  const first = FLIP.rects; FLIP.rects = null;
  if (!first || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0;
  document.querySelectorAll('[data-flip]').forEach((el) => {
    const b = el.getBoundingClientRect(); if (!b.width) return;
    const a = first.get(el.dataset.flip);
    if (!a || !a.width) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, delay: 180, easing: 'ease-out', fill: 'backwards' }); return; }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
      { duration: 440, delay: Math.min(i++, 8) * 14, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  });
}

// ------------------------------------------------------------ piezas
const Sep = () => html`<span class="pf-sep" aria-hidden="true">·</span>`;
const visLabel = (v) => (v === 'shared' ? 'Shared' : 'Private');
const VisIcon = ({ v }) => html`<span class="pf-vis" title=${visLabel(v)}><${Icon} name=${v === 'shared' ? 'Users' : 'Lock'} class="size-3" /></span>`;

const SECTIONS = [['Templates', 'FileText'], ['Skills', 'SlidersHorizontal'], ['Playbooks', 'BookOpenText'], ['Libraries', 'Archive']];
// Pestañas de Knowledge. Con la biblioteca colapsada son íconos; al hacer click se abre el texto.
function KTabs({ compact, onNew }) {
  const [openTab, setOpenTab] = useState('Playbooks');
  useEffect(() => { if (!compact) setOpenTab('Playbooks'); }, [compact]);
  return html`<div class="pf-tabs">
    ${SECTIONS.map(([l, i]) => html`<button type="button" aria-label=${l} title=${l} onClick=${() => setOpenTab(l)}
      class=${cx('pf-tab', l === 'Playbooks' && 'is-on', compact && openTab !== l && 'is-shut')}>
      <${Icon} name=${i} class="size-4 shrink-0" /><span class="pf-tab-label">${l}</span></button>`)}
    <span class="flex-1"></span>
    <button type="button" class="pf-iconbtn pf-only-full" aria-label="View information"><${Icon} name="Info" class="size-4" /></button>
    <button type="button" class="pf-iconbtn pf-only-split" aria-label="New playbook" title="New playbook" onClick=${onNew}><${Icon} name="Plus" class="size-4" /></button>
  </div>`;
}

function Search({ value, onInput }) {
  return html`<label class="pf-search"><${Icon} name="MagnifyingGlass" class="size-4" />
    <input type="text" placeholder="Search playbooks..." aria-label="Search playbooks" value=${value} onInput=${(e) => onInput(e.target.value)} /></label>`;
}

function PlaybookCard({ pb, selected, dirty, go }) {
  return html`<a href=${'#/' + pb.id} data-flip=${pb.id} class=${cx('pf-card', selected && 'is-on')} aria-current=${selected ? 'page' : undefined}
    onClick=${(e) => { e.preventDefault(); go(pb.id); }}>
    <span class="pf-card-top">
      <span class="pf-card-name">
        <${VisIcon} v=${pb.visibility} />
        <span class="min-w-0 flex-1 truncate text-sm font-medium leading-5">${pb.name || 'Untitled playbook'}</span>
        ${dirty && html`<span class="pf-dot" title="Unsaved changes"></span>`}
      </span>
      <span class="pf-card-desc">${pb.description || 'No description'}</span>
    </span>
    <span class="pf-meta pf-num" style="padding-top: 4px;">
      <span>${plural(pb.rules.length, 'rule', 'rules')}</span><${Sep} /><span>${countryName(pb.country)}</span>
    </span>
  </a>`;
}

const CreateCard = ({ go }) => html`<a href="#/new" data-flip="create" class="pf-card pf-create" onClick=${(e) => { e.preventDefault(); go('new'); }}>
  <span class="pf-card-top">
    <span class="pf-card-name"><span class="pf-vis"><${Icon} name="Plus" class="size-3" /></span><span class="truncate text-sm font-medium leading-5">Create new playbook</span></span>
    <span class="pf-card-desc">Reusable rules for reviewing contracts</span>
  </span>
</a>`;

// ------------------------------------------------------------ biblioteca (la misma en full y colapsada)
function Library({ items, empty, search, setSearch, selectedId, isDirty, go, compact }) {
  const list = items.filter((p) => (p.name + ' ' + p.description).toLowerCase().includes(search.toLowerCase()));
  const group = (key, label, ps) => ps.length > 0 && html`<section class="flex flex-col gap-3">
    <h2 class="pf-eyebrow pb-2" data-flip=${'h-' + key}>${label} · ${ps.length}</h2>
    <div class="pf-cards">${ps.map((p) => html`<${PlaybookCard} key=${p.id} pb=${p} selected=${p.id === selectedId} dirty=${isDirty(p.id)} go=${go} />`)}</div>
  </section>`;
  return html`<section class="pf-lib" aria-label="Playbooks">
    <div class="pf-scroll"><div class="pf-lib-inner"><div class="pf-lib-pad">
      <div class="pf-khead"><h1 class="pf-h" data-flip="k-title">Knowledge</h1>
        <button type="button" class="pf-iconbtn pf-only-split" aria-label="View information"><${Icon} name="Info" class="size-4" /></button></div>
      <${KTabs} compact=${compact} onNew=${() => go('new')} />
      <div class="mt-8 flex flex-col gap-6 px-4">
        ${empty
          ? html`<div class="flex flex-col gap-6">
              <div class="max-w-md space-y-1">
                <p class="text-sm font-medium">No playbooks yet</p>
                <p class="text-sm leading-6 text-muted-foreground">A playbook holds your position for one type of contract. Magnar checks each rule when it reviews a document.</p>
              </div>
              <${CreateCard} go=${go} />
            </div>`
          : html`<div data-flip="search"><${Search} value=${search} onInput=${setSearch} /></div>
            <div class="pf-only-full"><${CreateCard} go=${go} /></div>
            ${list.length
              ? html`${group('mine', 'My playbooks', list.filter((p) => p.mine))}${group('shared', 'Shared with me', list.filter((p) => !p.mine))}`
              : html`<p class="text-sm text-muted-foreground">No playbooks match “${search}”.</p>`}`}
      </div>
    </div></div></div>
  </section>`;
}

// ------------------------------------------------------------ card de regla
// Tres estados que se distinguen a simple vista: cerrada · leyendo · editando (o nueva).
function RuleCard({ rule, n, open, editing, isNew, fresh, hold, onToggle, onEdit, onDone, onCancel, onChange, onDelete }) {
  const titleRef = useRef();
  useEffect(() => { if (editing && fresh) setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 60); }, [editing, fresh]);
  const lines = rule.body.split('\n').filter((l) => l.trim());
  const label = rule.title.trim() || 'Untitled rule';
  return html`<li id=${'rule-' + rule.id} class=${cx('pf-rule', open && 'is-open', editing && 'is-edit', fresh && (hold ? 'is-fresh-hold' : 'is-fresh'))}>
    ${!editing && html`<button type="button" class="pf-rule-hit" aria-expanded=${open ? 'true' : 'false'} aria-label=${label} onClick=${onToggle}></button>`}
    <div class="pf-rule-head">
      <span class="pf-rule-n">${String(n).padStart(2, '0')}</span>
      <div class="pf-rule-text">
        ${editing
          ? html`<input ref=${titleRef} class="pf-rule-titlein" aria-label="Rule title" placeholder="Rule title, e.g. Ley aplicable y jurisdicción"
              value=${rule.title} onInput=${(e) => onChange({ title: e.target.value })} />`
          : html`<span class=${cx('pf-rule-title', !rule.title.trim() && 'is-empty')}>${label}</span>
              <span class="pf-rule-preview">${lines[0] || 'No text yet'}</span>`}
      </div>
      <div class="pf-rule-tools">
        ${editing
          ? html`<span class=${cx('pf-chip', isNew && 'is-new')}>${isNew ? 'New rule' : 'Editing'}</span>`
          : html`${open && html`<button type="button" class="pf-edit-btn" onClick=${onEdit}><${Icon} name="PencilSimple" class="size-3.5" />Edit</button>`}
              <button type="button" class="pf-iconbtn pf-hover" aria-label=${'Delete ' + label} title="Delete rule" onClick=${onDelete}><${Icon} name="Trash" class="size-4" /></button>
              <span class="pf-caret"><${Icon} name="CaretDown" class="size-4" /></span>`}
      </div>
    </div>
    <div class="pf-rule-body" inert=${!open}><div class="pf-rule-inner"><div class="pf-rule-pad">
      ${editing
        ? html`<textarea class="pf-write" rows="4" aria-label="Rule text" value=${rule.body} onInput=${(e) => onChange({ body: e.target.value })}
              placeholder="Describe what Magnar should check. E.g. La confidencialidad dura 3 años desde la firma; más de 5 años es inaceptable."></textarea>
            <p class="pf-hint">One clause per rule. Write it as you would explain it to a colleague.</p>
            <div class="pf-rule-foot">
              <button type="button" class="pf-del" onClick=${onDelete}><${Icon} name="Trash" class="size-3.5" />Delete rule</button>
              <div class="flex items-center gap-2">
                <button type="button" class=${C.btnOutlineXs} onClick=${onCancel}>Cancel</button>
                <button type="button" class=${C.btnPrimaryXs} onClick=${onDone}>Done</button>
              </div>
            </div>`
        : html`<div class="pf-rule-doc">${lines.length ? lines.map((l) => html`<p>${l}</p>`) : html`<p class="is-empty">No text yet.</p>`}</div>`}
    </div></div></div>
  </li>`;
}

// Lista de reglas + "Add rule". Una card abierta a la vez; "Done" la cierra.
function RulesEditor({ rules, setRules, init = {}, hold, emptyText }) {
  const [open, setOpen] = useState(init.open || init.editing || null);
  const [editing, setEditing] = useState(init.editing || null);
  const [fresh, setFresh] = useState(init.fresh || null);
  const isNew = useRef(new Set(init.isNew || []));
  const before = useRef(null);
  const rulesRef = useRef(rules); rulesRef.current = rules;

  const add = () => {
    const r = newRule();
    isNew.current.add(r.id);
    setRules([...rulesRef.current, r]); setOpen(r.id); setEditing(r.id); setFresh(r.id);
    setTimeout(() => document.getElementById('rule-' + r.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
  };
  useEffect(() => { if (init.autoAdd) add(); }, []);
  const change = (id, patch) => setRules(rules.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const del = (id) => { setRules(rules.filter((r) => r.id !== id)); if (open === id) setOpen(null); if (editing === id) setEditing(null); };
  const toggle = (id) => { setFresh(null); setEditing(null); setOpen(open === id ? null : id); };
  const edit = (id) => { before.current = rules.find((r) => r.id === id); setEditing(id); setOpen(id); };
  const done = () => { isNew.current.delete(editing); setEditing(null); setOpen(null); setFresh(null); };
  const cancel = () => {
    const id = editing;
    if (isNew.current.has(id)) { isNew.current.delete(id); del(id); return; }
    if (before.current) setRules(rules.map((r) => (r.id === id ? before.current : r)));
    setEditing(null);
  };

  return html`<section aria-labelledby="rules-h">
    <div class="pf-rules-head">
      <h2 id="rules-h" class="pf-label pf-num">Rules · ${rules.length}</h2>
      <p class="pf-note">Each rule is evaluated separately</p>
    </div>
    ${rules.length === 0
      ? html`<div class="pf-empty"><span>${emptyText}</span>
          <button type="button" class=${C.btnOutlineXs} onClick=${add}><${Icon} name="Plus" class="size-3.5" />Add rule</button></div>`
      : html`<ol class="pf-rules">${rules.map((r, i) => html`<${RuleCard} key=${r.id} rule=${r} n=${i + 1}
            open=${open === r.id} editing=${editing === r.id} isNew=${isNew.current.has(r.id)} fresh=${fresh === r.id} hold=${hold}
            onToggle=${() => toggle(r.id)} onEdit=${() => edit(r.id)} onDone=${done} onCancel=${cancel}
            onChange=${(p) => change(r.id, p)} onDelete=${() => del(r.id)} />`)}</ol>
          <button type="button" class="pf-add" onClick=${add}><${Icon} name="Plus" class="size-4" />Add rule</button>`}
  </section>`;
}

// ------------------------------------------------------------ crear (Figma 39:9010 derecha / 39:9204)
function CreatePage({ params, onCancel, onCreate }) {
  const demo = Number(params.demo || 0);
  const [name, setName] = useState(demo ? 'Servicios cloud' : '');
  const [country, setCountry] = useState('CL');
  const [description, setDescription] = useState(demo ? 'Para contratos de servicios cloud con proveedores tecnológicos, desde la posición del cliente.' : '');
  const [rules, setRules] = useState(() => (demo ? DEMO_RULES().slice(0, demo) : []));
  const first = demo === 1 ? rules[0]?.id : null;
  return html`<div class="pf-scroll"><div class="pf-center"><div class="pf-page" data-flip="page">
    <a href="#/" class="pf-back mb-6 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><${Icon} name="CaretLeft" class="size-3.5" />Playbooks</a>
    <h1 class="pf-title">New Playbook</h1>
    <p class="pf-lead mt-2">Set the basics and add the rules Magnar will check</p>

    <div class="pf-fields mt-8 flex items-start gap-2">
      <label class="pf-name flex min-w-0 flex-1 flex-col gap-2"><span class="pf-label">Name</span>
        <input class=${C.input} placeholder="e.g. Servicios cloud" value=${name} onInput=${(e) => setName(e.target.value)} /></label>
      <div class="flex flex-col gap-2"><span class="pf-label">Country</span><${CountrySelect} value=${country} onChange=${setCountry} /></div>
      <div class="flex flex-col gap-2"><span class="pf-label">Visibility</span>
        <span class="pf-fixed h-control" title="New playbooks are private"><${Icon} name="Lock" class="size-3.5" />Private</span></div>
    </div>
    <label class="mt-8 flex flex-col gap-2"><span class="pf-label">Description</span>
      <textarea class=${C.textarea + ' min-h-24 leading-6'} placeholder="Para contratos de servicios cloud con proveedores…" value=${description} onInput=${(e) => setDescription(e.target.value)}></textarea></label>

    <hr class="pf-hr" />
    <div class="mt-8">
      <${RulesEditor} rules=${rules} setRules=${setRules} init=${{ editing: first, isNew: first ? [first] : [] }}
        emptyText="No rules yet. Each rule is one thing Magnar checks in the contract." />
    </div>

    <div class="mt-8 flex justify-end gap-2">
      <button type="button" class=${C.btnOutline} onClick=${onCancel}>Cancel</button>
      <button type="button" class=${C.btnPrimary} disabled=${!name.trim()} onClick=${() => onCreate({ name: name.trim(), country, description, rules })}>Create</button>
    </div>
  </div></div></div>`;
}

// ------------------------------------------------------------ detalle / edición
function DetailPage({ pb, dirty, params, update, save, remove }) {
  const [just, setJust] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (!just) return; const t = setTimeout(() => setJust(false), 2400); return () => clearTimeout(t); }, [just]);
  const init = params.edit ? { editing: params.edit } : params.added ? { autoAdd: true } : { open: params.rule };

  return html`<div class="pf-scroll"><div class="pf-page" data-flip="page">
    <a href="#/" class="pf-back mb-6 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><${Icon} name="CaretLeft" class="size-3.5" />Playbooks</a>
    <header>
      <div class="pf-detail-head">
        <textarea class="rd-inline rd-grow pf-title min-w-0 flex-1" rows="1" aria-label="Playbook name" placeholder="Untitled playbook" value=${pb.name}
          onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()}
          onInput=${(e) => update((d) => ({ ...d, name: e.target.value.replace(/\n/g, ' ') }))}></textarea>
        <div class="pf-save" role="status">
          ${dirty
            ? html`<span>Unsaved changes</span><span class="pf-sep">·</span>
                <button type="button" class=${C.btnPrimaryXs} disabled=${!pb.name.trim()} onClick=${() => { save(); setJust(true); }}>Save</button>`
            : html`<span class=${cx('inline-flex items-center gap-1.5', just && 'text-foreground')}><${Icon} name="Check" class="size-3.5" />Saved</span>`}
          <${DropdownMenu} label="Playbook options" items=${[{ label: 'Delete playbook', icon: 'Trash', onSelect: () => setConfirm(true) }]}
            trigger=${(p) => html`<button type="button" ...${p} class="pf-iconbtn" aria-label="Playbook options"><${Icon} name="DotsThree" class="size-4" /></button>`} />
        </div>
      </div>
      <textarea class="rd-inline rd-grow mt-2 text-[15px] leading-6 text-muted-foreground" rows="1" aria-label="Description" placeholder="Add a description"
        value=${pb.description} onInput=${(e) => update((d) => ({ ...d, description: e.target.value }))}></textarea>
      <p class="pf-meta pf-num mt-3" style="font-size: 13px; line-height: 20px;">
        <span class="inline-flex items-center gap-1.5">${pb.country && html`<${Flag} code=${pb.country} class="h-2.5 w-3.5 rounded-[2px] object-cover" />`}${countryName(pb.country)}</span><${Sep} />
        <span class="inline-flex items-center gap-1"><${Icon} name=${pb.visibility === 'shared' ? 'Users' : 'Lock'} class="size-3.5" />${visLabel(pb.visibility)}</span><${Sep} />
        <span>${plural(pb.rules.length, 'rule', 'rules')}</span>
      </p>
    </header>
    <div class="mt-10">
      <${RulesEditor} rules=${pb.rules} setRules=${(rules) => update((d) => ({ ...d, rules }))} init=${init} hold=${!!params.hold}
        emptyText="This playbook has no rules yet." />
    </div>
    <${AlertDialog} open=${confirm} onClose=${() => setConfirm(false)} title="Delete this playbook?"
      description=${`“${pb.name || 'Untitled playbook'}” and its ${plural(pb.rules.length, 'rule', 'rules')} will be deleted. This can't be undone.`}
      actionLabel="Delete" onAction=${() => { setConfirm(false); remove(); }} />
  </div></div>`;
}

// ------------------------------------------------------------ app
function App() {
  const { path, params, nav } = useHashState();
  const [saved, setSaved] = useState(SEED);
  const [drafts, setDrafts] = useState({});
  const [search, setSearch] = useState('');
  const [openTab, setOpenTab] = useState('pb');
  const split = splitParam();

  const items = saved.map((p) => drafts[p.id] || p);
  const isDirty = (id) => !!drafts[id] && !same(drafts[id], saved.find((p) => p.id === id));
  const current = path && path !== 'new' ? saved.find((p) => p.id === path) : null;
  const mode = path === 'new' || current ? (params.wide ? 'wide' : 'split') : 'full';
  const { wide, ...rest } = params;
  const pageKey = path + JSON.stringify(rest);

  const go = (p, q = {}) => { snapshot(); nav(p, q); };
  useLayoutEffect(playFlip, [mode, path]);
  useEffect(() => { if (mode === 'full') setOpenTab('pb'); }, [mode]);

  // Estado de demostración: cambios sin guardar en "Límite de responsabilidad"
  useEffect(() => {
    if (!current || !params.dirty) return;
    const edit = (p) => ({ ...p, rules: p.rules.map((r) => (r.id === 'r4' ? { ...r, body: r.body.replace('12 meses', '18 meses') } : r)) });
    setDrafts((d) => ({ ...d, [current.id]: edit(current) }));
  }, [pageKey]);

  const update = (id) => (fn) => setDrafts((d) => ({ ...d, [id]: fn(d[id] || saved.find((p) => p.id === id)) }));
  const save = (id) => () => { const d = drafts[id]; if (!d) return; setSaved((s) => s.map((p) => (p.id === id ? d : p))); setDrafts(({ [id]: _, ...r }) => r); };
  const remove = (id) => () => { setSaved((s) => s.filter((p) => p.id !== id)); setDrafts(({ [id]: _, ...r }) => r); go(''); };
  const create = (data) => { const id = 'pb-' + Date.now().toString(36); setSaved((s) => [{ id, visibility: 'private', mine: true, ...data }, ...s]); go(id); };

  const compact = mode !== 'full';
  const tabs = [
    { title: 'Ley del trabajador', icon: 'ChatCircle', collapsed: compact && openTab !== 'chat', onClick: () => setOpenTab('chat') },
    { title: 'My Playbooks', icon: 'BookOpenText', active: true, collapsed: compact && openTab !== 'pb', onClick: () => setOpenTab('pb') },
  ];

  let pane = null;
  if (mode !== 'full') {
    pane = path === 'new'
      ? html`<${CreatePage} key=${pageKey} params=${params} onCancel=${() => go('')} onCreate=${create} />`
      : html`<${DetailPage} key=${pageKey} pb=${drafts[current.id] || current} dirty=${isDirty(current.id)} params=${params}
          update=${update(current.id)} save=${save(current.id)} remove=${remove(current.id)} />`;
  }

  return html`<${Frame} split=${split} activeApp="knowledge" tab=${{ title: 'My Playbooks', icon: 'BookOpenText' }} tabs=${split ? undefined : tabs}>
    <div class="pf-host"><div class="pf-stage" data-mode=${mode}>
      <${Library} items=${params.empty ? [] : items} empty=${!!params.empty} search=${search} setSearch=${setSearch}
        selectedId=${current?.id} isDirty=${isDirty} go=${go} compact=${compact} />
      ${pane && html`<main class="pf-pane">
        <button type="button" class="pf-grip" aria-label=${mode === 'wide' ? 'Show library' : 'Expand'} title=${mode === 'wide' ? 'Show library' : 'Expand'}
          onClick=${() => go(path, { ...rest, wide: mode === 'wide' ? undefined : 1 })}><${Icon} name=${mode === 'wide' ? 'CaretRight' : 'CaretLeft'} class="size-3" /></button>
        <div class="pf-pane-clip"><div class="pf-pane-inner" style="position: relative;">
          <button type="button" class="pf-iconbtn pf-close" aria-label="Close" title="Close" onClick=${() => go('')}><${Icon} name="X" class="size-4" /></button>
          ${pane}
        </div></div>
      </main>`}
    </div></div>
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
