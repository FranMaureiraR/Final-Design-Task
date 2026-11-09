// Playbooks · propuesta "Documento": crear = escribir.
// La biblioteca es una tabla; el playbook es un documento que se edita en el lugar. Crear y editar usan la misma pantalla.
//
// Estados por URL:
//   #/                     biblioteca        ?empty=1 vacía · ?vis=private filtro activo · ?hover=<id> fila en hover · ?preview=<id>
//   #/new                  documento nuevo, con el cursor en el título
//   #/<id>                 documento en lectura
//   #/<id>?edit=r2         regla en edición (las demás se atenúan)
//   #/<id>?menu=country    popover de Country abierto
//   #/<id>?dirty=1         cambios sin guardar        ?saved=1 recién guardado
//   ?split=50 / 60 (antes del #) vista dividida con el chat a la izquierda
import { html, render, useState, useEffect, useRef } from '../vendor/preact-htm.js';
import { Icon, Flag } from '../shared/icons.js';
import { AlertDialog } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { splitParam, COUNTRY_NAMES } from '../shared/playbooks-seed.js';
import { useHashState } from '../shared/redesign-ui.js';
import {
  cx, SEED, edited, visLabel, visIcon, plural, countryName, newRule, same, todayIso, RuleText, Tip,
  MenuButton, SearchBox, FilterPills, EMPTY_FILTERS, activeCount, applyFilters, usePreview, Preview, scrollToIn,
} from '../shared/pb-kit.js';
import { relTime } from '../shared/playbooks-seed.js';

const COUNTRY_OPTS = ['CL', 'PE', 'CO', 'MX', 'AR'].map((c) => ({ key: c, label: COUNTRY_NAMES[c], lead: html`<${Flag} code=${c} class="pb-flag" />` }));
const VIS_OPTS = [{ key: 'private', label: 'Private', lead: html`<${Icon} name="Lock" />` }, { key: 'shared', label: 'Shared', lead: html`<${Icon} name="Users" />` }];

// ------------------------------------------------------------ biblioteca en tabla
function Row({ pb, dirty, hover, peek, open, bind }) {
  return html`<a href=${'#/' + pb.id} data-pid=${pb.id} class=${cx('pd-tr pd-row pb-fade-in', hover && 'is-hover', peek && 'is-peek')} ...${bind}
    onClick=${(e) => { e.preventDefault(); open(pb.id); }}>
    <span class="name" data-anchor><b>${pb.name}${dirty && html`<span class="pd-dot" title="Unsaved changes"></span>`}</b><span>${pb.description || 'No description'}</span></span>
    <span class="pd-td num r">${pb.rules.length}</span>
    <span class="pd-td pd-col-country"><span class="ic"><${Flag} code=${pb.country} class="pb-flag sm" />${countryName(pb.country)}</span></span>
    <span class="pd-td pd-col-access"><span class="ic"><${Icon} name=${visIcon(pb.visibility)} />${visLabel(pb.visibility)}</span></span>
    <span class="pd-td muted">${pb.edited ? relTime(pb.edited) : '—'}</span>
    <span class="go" aria-hidden="true"><${Icon} name="ArrowRight" /></span>
  </a>`;
}
function Library({ all, state, setState, isDirty, open, prev, hover }) {
  const { q, filters, empty } = state;
  const list = applyFilters(all, q, filters);
  const filtered = q.trim() || activeCount(filters);
  const group = (label, total, ps) => ps.length > 0 && html`
    <div class="pd-group pb-eyebrow">${label}<span class="c">${filtered ? `${ps.length} of ${total}` : ps.length}</span></div>
    ${ps.map((p) => html`<${Row} key=${p.id} pb=${p} dirty=${isDirty(p.id)} hover=${hover === p.id} peek=${prev.st?.id === p.id} open=${open} bind=${prev.bind(p.id)} />`)}`;
  const newBtn = html`<button type="button" class="pb-btn pb-btn-primary" onClick=${() => open('new')}><${Icon} name="Plus" />New playbook</button>`;
  return html`<div class="pd-scroll"><div class="pd-lib">
    <p class="pd-crumb">Knowledge</p>
    <div class="pd-lib-head"><h1 class="pb-page-title">Playbooks</h1>${newBtn}</div>
    ${empty
      ? html`<div class="pd-empty"><h2>No playbooks yet</h2><p>Playbooks hold the rules Magnar checks when it reviews a contract.</p></div>`
      : html`<div class="pd-bar"><${SearchBox} value=${q} onInput=${(v) => setState({ ...state, q: v })} />
          <${FilterPills} all=${all} filters=${filters} setFilters=${(f) => setState({ ...state, filters: f })} /></div>
        ${list.length
          ? html`<div class="pd-table" role="table" aria-label="Playbooks">
              <div class="pd-tr pd-th" role="row"><span>Name</span><span class="r">Rules</span><span class="pd-col-country">Country</span><span class="pd-col-access">Access</span><span>Edited</span><span></span></div>
              ${group('My playbooks', all.filter((p) => p.mine).length, list.filter((p) => p.mine))}
              ${group('Shared with me', all.filter((p) => !p.mine).length, list.filter((p) => !p.mine))}
            </div>`
          : html`<p style="margin-top:32px;font-size:14px;color:var(--ink-2)">${q.trim() ? html`No playbooks match “${q.trim()}”` : 'No playbooks match these filters'}
              <button type="button" class="pb-link" style="margin-left:12px;text-decoration:underline;text-underline-offset:3px" onClick=${() => setState({ ...state, q: '', filters: EMPTY_FILTERS })}>Clear filters</button></p>`}`}
  </div></div>`;
}

// ------------------------------------------------------------ regla como sección del documento
function RuleSection({ rule, n, editing, confirming, on }) {
  const textRef = useRef();
  useEffect(() => { if (editing) setTimeout(() => textRef.current?.focus({ preventScroll: true }), 30); }, [editing]);
  return html`<section id=${'rule-' + rule.id} data-rule=${rule.id} class=${cx('pd-rule', editing && 'is-editing')}>
    <div class="pd-rule-h">
      <span class="pd-handle"><${MenuButton} width=${180} items=${[{ key: 'edit', label: 'Edit', lead: html`<${Icon} name="PencilSimple" />` }, { key: 'del', label: 'Delete rule', danger: true, lead: html`<${Icon} name="Trash" />` }]}
        onSelect=${(k) => (k === 'edit' ? on.edit() : on.askDelete())}
        trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" aria-label=${'Actions for rule ' + n}><${Icon} name="DotsThree" /></button>`} /></span>
      <span class="n">${n}</span>
      <textarea class="pb-inline title" rows="1" aria-label="Rule title" placeholder="Untitled rule" value=${rule.title}
        onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); on.edit(); } }} onInput=${(e) => on.change({ title: e.target.value.replace(/\n/g, ' ') })}></textarea>
    </div>
    <div class="pd-rule-b">
      ${editing
        ? html`<textarea ref=${textRef} class="pb-write" rows="4" aria-label="Rule text" value=${rule.body} onInput=${(e) => on.change({ body: e.target.value })}
            onKeyDown=${(e) => e.key === 'Escape' && on.stop()} placeholder="Write the position Magnar should check…"></textarea>`
        : html`<div class="pb-rule-read" role="button" tabindex="0" title="Click to edit" onClick=${on.edit} onKeyDown=${(e) => e.key === 'Enter' && on.edit()}>
            <${RuleText} body=${rule.body} dots placeholder="Write the position Magnar should check…" /></div>`}
    </div>
    ${confirming && html`<div class="pd-confirm"><span class="q">Delete this rule?</span>
      <button type="button" class="pb-btn pb-btn-ghost sm" onClick=${on.cancelDelete}>Cancel</button>
      <button type="button" class="pb-btn sm" style="background:var(--destructive);color:var(--surface)" onClick=${on.remove}>Delete</button></div>`}
  </section>`;
}

// ------------------------------------------------------------ documento (crear y editar)
function Doc({ pb, isNew, dirty, params, update, save, create, remove, back, justSaved }) {
  const scroller = useRef(); const rulesRef = useRef();
  const titleRef = useRef();
  const [editing, setEditing] = useState(params.edit || null);
  const [confirm, setConfirm] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState(pb.rules[0]?.id);
  const [state, setState] = useState(justSaved ? 'saved-just' : 'idle');
  const [askDel, setAskDel] = useState(false);
  useEffect(() => { if (isNew) setTimeout(() => titleRef.current?.focus(), 80); }, []);
  useEffect(() => { if (state !== 'saved-just') return; const t = setTimeout(() => setState('idle'), 2000); return () => clearTimeout(t); }, [state]);
  // salir de edición con click fuera
  useEffect(() => {
    if (!editing) return;
    const down = (e) => { if (!e.target.closest('.pd-rule.is-editing, .pb-menu')) setEditing(null); };
    document.addEventListener('mousedown', down); return () => document.removeEventListener('mousedown', down);
  }, [editing]);
  // scroll: borde de la barra + regla activa en el índice
  useEffect(() => {
    const box = scroller.current; if (!box) return;
    const f = () => {
      setScrolled(box.scrollTop > 2);
      const top = box.getBoundingClientRect().top + 120; let cur = pb.rules[0]?.id;
      box.querySelectorAll('[data-rule]').forEach((el) => { if (el.getBoundingClientRect().top <= top) cur = el.dataset.rule; });
      setActive(cur);
    };
    box.addEventListener('scroll', f, { passive: true }); return () => box.removeEventListener('scroll', f);
  }, [pb.rules.length]);
  const doSave = () => { setState('saving'); setTimeout(() => { isNew ? create() : save(); setState('saved-just'); }, 450); };
  useEffect(() => {
    const key = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (dirty || isNew) doSave(); } };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [dirty, isNew]);

  const setRules = (fn) => update((d) => ({ ...d, rules: fn(d.rules) }));
  const add = () => { const r = newRule(); setRules((rs) => [...rs, r]); setEditing(r.id); setTimeout(() => scrollToIn(scroller.current, document.getElementById('rule-' + r.id), 80), 60); };
  const jump = (id) => scrollToIn(scroller.current, document.getElementById('rule-' + id));
  const on = (r) => ({
    edit: () => { setConfirm(null); setEditing(r.id); },
    stop: () => setEditing(null),
    change: (patch) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, ...patch } : x))),
    askDelete: () => { setEditing(null); setConfirm(r.id); },
    cancelDelete: () => setConfirm(null),
    remove: () => { setRules((rs) => rs.filter((x) => x.id !== r.id)); setConfirm(null); },
  });

  const status = state === 'saving' ? html`<span class="pd-state" key="s">Saving…</span>`
    : isNew ? html`<span class="pd-state" key="n">Not created yet</span>`
    : dirty ? html`<span class="pd-state" key="u"><span class="pd-dot"></span><span style="color:var(--ink-2)">Unsaved changes</span></span>`
    : html`<span class="pd-state" key="v" style=${state === 'saved-just' ? 'color:var(--ink)' : ''}><${Icon} name="Check" />Saved</span>`;

  return html`<div class="pd-doc">
    <header class=${cx('pd-top', scrolled && 'is-scrolled')}>
      <nav class="crumb" aria-label="Breadcrumb"><a href="#/" onClick=${(e) => { e.preventDefault(); back(); }}>Playbooks</a><span>/</span><span class="cur">${pb.name || 'Untitled playbook'}</span></nav>
      <div class="right">
        <span class="pd-rules-select"><${MenuButton} align="end" width=${260} items=${[{ head: 'Rules' }, ...pb.rules.map((r, i) => ({ key: r.id, label: `${i + 1}  ${r.title || 'Untitled rule'}` }))]} onSelect=${jump}
          trigger=${(p) => html`<button type="button" ...${p} class="pb-btn pb-btn-ghost sm">Rules<${Icon} name="CaretDown" /></button>`} /></span>
        ${status}
        ${(isNew || dirty) && state !== 'saving' && html`<${Tip} label=${isNew ? 'Create' : 'Save'} kbd="⌘S"><button type="button" class="pb-btn pb-btn-primary sm" onClick=${doSave}>${isNew ? 'Create' : 'Save'}</button><//>`}
        ${!isNew && html`<${MenuButton} align="end" width=${200} items=${[{ key: 'delete', label: 'Delete playbook', danger: true, lead: html`<${Icon} name="Trash" />` }]} onSelect=${() => setAskDel(true)}
          trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" aria-label="Playbook options"><${Icon} name="DotsThree" /></button>`} />`}
      </div>
    </header>
    <div class="pd-body">
      <nav class="pd-index" aria-label="Rules">
        <a href="#/" class="back" onClick=${(e) => { e.preventDefault(); back(); }}><${Icon} name="ArrowLeft" />Playbooks</a>
        <h3 class="pb-eyebrow" style="color:var(--ink-3)">Rules</h3>
        <ol>${pb.rules.map((r, i) => html`<li><a href=${'#rule-' + r.id} class=${cx('it', r.id === active && 'is-on')} onClick=${(e) => { e.preventDefault(); jump(r.id); }}>
          <span class="n">${i + 1}</span><span class="t">${r.title || 'Untitled rule'}</span></a></li>`)}</ol>
        <button type="button" class="add" onClick=${add}><${Icon} name="Plus" />Add rule</button>
      </nav>
      <div class="pd-scroll" ref=${scroller}><article class="pd-paper">
        <textarea ref=${titleRef} class="pb-inline pd-title" rows="1" aria-label="Playbook name" placeholder="Untitled playbook" value=${pb.name}
          onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()} onInput=${(e) => update((d) => ({ ...d, name: e.target.value.replace(/\n/g, ' ') }))}></textarea>
        <div class="pd-props">
          <${MenuButton} items=${COUNTRY_OPTS} selected=${[pb.country]} width=${200} defaultOpen=${params.menu === 'country'} onSelect=${(c) => update((d) => ({ ...d, country: c }))}
            trigger=${(p) => html`<button type="button" ...${p} class="pd-chip" aria-label="Country"><${Flag} code=${pb.country} class="pb-flag sm" />${countryName(pb.country)}<${Icon} name="CaretDown" class="chev" /></button>`} />
          <${MenuButton} items=${VIS_OPTS} selected=${[pb.visibility]} width=${180} onSelect=${(v) => update((d) => ({ ...d, visibility: v }))}
            trigger=${(p) => html`<button type="button" ...${p} class="pd-chip" aria-label="Visibility"><${Icon} name=${visIcon(pb.visibility)} />${visLabel(pb.visibility)}<${Icon} name="CaretDown" class="chev" /></button>`} />
          <span class="muted">${plural(pb.rules.length, 'rule', 'rules')}</span>
          <span class="muted">${isNew ? 'Not created yet' : edited(pb)}</span>
        </div>
        <textarea class="pb-inline pd-desc" rows="1" aria-label="Description" placeholder="Describe when this playbook should be used…" value=${pb.description}
          onInput=${(e) => update((d) => ({ ...d, description: e.target.value }))}></textarea>
        <hr class="pd-hr" />
        <div ref=${rulesRef} class=${cx('pd-rules', editing && 'is-focusing')}>
          ${pb.rules.map((r, i) => html`<${RuleSection} key=${r.id} rule=${r} n=${i + 1} editing=${editing === r.id} confirming=${confirm === r.id} on=${on(r)} />`)}
        </div>
        <button type="button" class="pd-add" onClick=${add}><${Icon} name="Plus" />Add rule</button>
        <p class="pd-note">Magnar checks each rule on its own.</p>
      </article></div>
    </div>
    <${AlertDialog} open=${askDel} onClose=${() => setAskDel(false)} title="Delete this playbook?"
      description=${`“${pb.name || 'Untitled playbook'}” and its ${plural(pb.rules.length, 'rule', 'rules')} will be deleted. This can’t be undone.`}
      actionLabel="Delete" onAction=${() => { setAskDel(false); remove(); }} />
  </div>`;
}

// ------------------------------------------------------------ app
function App() {
  const { path, params, nav } = useHashState();
  const [saved, setSaved] = useState(SEED);
  const [drafts, setDrafts] = useState({});
  const [lib, setLib] = useState(() => ({ q: params.q || '', filters: { ...EMPTY_FILTERS, visibility: params.vis ? [params.vis] : [] }, empty: !!params.empty }));
  const justSaved = useRef(null);
  const split = splitParam();
  const prev = usePreview(params.preview);

  const items = saved.map((p) => drafts[p.id] || p);
  const isDirty = (id) => !!drafts[id] && !same(drafts[id], saved.find((p) => p.id === id));
  const current = path && path !== 'new' ? saved.find((p) => p.id === path) : null;
  const pageKey = location.hash;
  const go = (p, q = {}) => { prev.close(); nav(p, q); };

  // documento nuevo: un borrador con una regla de ejemplo vacía
  const [draftNew, setDraftNew] = useState(null);
  useEffect(() => { if (path === 'new') setDraftNew({ id: 'new', name: '', description: '', country: 'CL', visibility: 'private', mine: true, rules: [newRule()] }); }, [pageKey]);
  useEffect(() => {
    if (!current || !params.dirty) return;
    setDrafts((d) => ({ ...d, [current.id]: { ...current, rules: current.rules.map((r, i) => (i === 0 ? { ...r, body: r.body.replace('Jornada parcial pactada por escrito', 'Jornada parcial o por turnos, pactada por escrito') } : r)) } }));
  }, [pageKey]);

  const update = (id) => (fn) => setDrafts((d) => ({ ...d, [id]: fn(d[id] || saved.find((p) => p.id === id)) }));
  const save = (id) => () => setDrafts((d) => { const x = d[id]; if (x) setSaved((s) => s.map((p) => (p.id === id ? { ...x, edited: todayIso() } : p))); const { [id]: _, ...r } = d; return r; });
  const remove = (id) => () => { setSaved((s) => s.filter((p) => p.id !== id)); go(''); };
  const createNew = () => { const id = 'pb-' + Date.now().toString(36); justSaved.current = id; setSaved((s) => [{ ...draftNew, id, edited: todayIso() }, ...s]); go(id); };

  let body;
  if (path === 'new' && draftNew) {
    body = html`<${Doc} key=${pageKey} pb=${draftNew} isNew params=${params} update=${(fn) => setDraftNew((d) => fn(d))} create=${createNew} back=${() => go('')} />`;
  } else if (current) {
    body = html`<${Doc} key=${pageKey} pb=${drafts[current.id] || current} dirty=${isDirty(current.id)} params=${params} justSaved=${!!params.saved || justSaved.current === current.id}
      update=${update(current.id)} save=${save(current.id)} remove=${remove(current.id)} back=${() => go('')} />`;
  } else {
    body = html`<${Library} all=${params.empty ? [] : items} state=${{ ...lib, empty: !!params.empty }} setState=${setLib} isDirty=${isDirty} open=${(id) => go(id)} prev=${prev} hover=${params.hover} />
      <${Preview} prev=${prev} items=${items} />`;
  }
  return html`<${Frame} split=${split} activeApp="knowledge" tab=${{ title: current ? current.name : 'My Playbooks', icon: 'BookOpenText' }}>
    <div class="pb pd-host">${body}</div>
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
