// Playbooks · propuesta "Refinada" (Figma página "Final" + ajustes de la usuaria).
// La versión B (/playbooks-lista/) usa este mismo archivo con window.PR_VARIANT = 'list':
// la biblioteca es una lista con columnas y chevron a la derecha; al abrir un playbook la lista
// se achica a columna y se abre la ventana de crear / editar.
//
// Estados por URL:
//   #/                       biblioteca          ?empty=1 vacía · ?loading=1 cargando · ?q=arriendo sin resultados
//   #/?vis=private           filtro activo        ?preview=<id> vista previa · ?s=templates otra sección · ?page=2 segunda página
//   #/new                    crear vacío          ?demo=1 con 1 regla nueva · ?demo=3 con 3 reglas
//   #/<id>                   detalle              ?rule=r2 regla abierta · ?del=r3 confirmar borrado
//   #/<id>?dirty=1           2 cambios sin guardar (barra flotante) · ?wide=1 biblioteca oculta · ?col=480 columna más ancha
//   ?split=50 / 60 / 40 (antes del #) vista dividida con el chat a la izquierda
import { html, render, useState, useEffect, useLayoutEffect, useRef } from '../vendor/preact-htm.js';
import { Icon, Flag } from '../shared/icons.js';
import { AlertDialog } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { splitParam, COUNTRY_NAMES, relTime } from '../shared/playbooks-seed.js';
import { useHashState } from '../shared/redesign-ui.js';
import {
  cx, SEED, visLabel, visIcon, plural, countryName, newRule, same, todayIso, firstLine, Tip,
  MenuButton, SearchBox, FilterPills, EMPTY_FILTERS, activeCount, applyFilters, usePreview, Preview, snapshot, playFlip, scrollToIn, ghost, holdAnchor,
} from '../shared/pb-kit.js';
import { Tabs, EmptyState, SECTION_EMPTY, SaveBar, SIDEBAR_LINKS } from '../shared/pr-ui.js';

const LIST = window.PR_VARIANT === 'list';
const DEMO_RULES = () => [
  newRule('Disponibilidad', 'El servicio debe estar disponible el 99% del mes.'),
  newRule('Ubicación de los datos', 'Los datos se guardan en Chile o en un país con protección similar.'),
  newRule('Renovación', 'Se avisa 30 días antes de renovar.'),
];
const COUNTRY_OPTS = ['CL', 'PE', 'CO', 'MX', 'AR'].map((c) => ({ key: c, label: COUNTRY_NAMES[c], lead: LIST ? undefined : html`<${Flag} code=${c} class="pb-flag" />` }));
const VIS_OPTS = [{ key: 'private', label: 'Private', lead: html`<${Icon} name="Lock" />` }, { key: 'shared', label: 'Shared', lead: html`<${Icon} name="Users" />` }];
const SECTIONS = [{ key: 'templates', label: 'Templates', icon: 'FileText' }, { key: 'skills', label: 'Skills', icon: 'SlidersHorizontal' }, { key: 'playbooks', label: 'Playbooks', icon: 'BookOpenText' }, { key: 'libraries', label: 'Libraries', icon: 'Archive' }];
const ago = (pb) => (pb.edited ? relTime(pb.edited) : 'not saved');
const COL_MIN = 280, COL_DEFAULT = 340;
const storedCol = () => { try { return Number(localStorage.getItem('pr-col')) || 0; } catch { return 0; } };

// Cuántas cosas cambiaron respecto de lo guardado (para "2 unsaved changes")
function changes(a, b) {
  if (!a || !b) return 0;
  let n = ['name', 'description', 'country', 'visibility'].filter((k) => a[k] !== b[k]).length;
  for (const id of new Set([...a.rules.map((r) => r.id), ...b.rules.map((r) => r.id)])) {
    const x = a.rules.find((r) => r.id === id), y = b.rules.find((r) => r.id === id);
    if (!x || !y || x.title !== y.title || x.body !== y.body) n++;
  }
  return n;
}

// ------------------------------------------------------------ biblioteca
const cardMenu = (pb, go, askDelete) => html`<span class="pr-more" onClick=${(e) => e.stopPropagation()} onKeyDown=${(e) => e.stopPropagation()}>
  <${MenuButton} align="end" width=${180} items=${[{ key: 'open', label: 'Open', lead: html`<${Icon} name="ArrowRight" />` }, 'sep', { key: 'delete', label: 'Delete playbook', danger: true, lead: html`<${Icon} name="Trash" />` }]}
    onSelect=${(k) => (k === 'open' ? go(pb.id) : askDelete(pb))}
    trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" aria-label=${'More actions for ' + pb.name}><${Icon} name="DotsThree" /></button>`} /></span>`;
const open = (go, id) => ({
  role: 'link', tabindex: 0,
  onClick: () => go(id),
  onKeyDown: (e) => { if (e.key === 'Enter') { e.preventDefault(); go(id); } },
});

// "2 days ago" → "2d ago" (la card tiene poco ancho y la fecha es secundaria)
const shortAgo = (pb) => ago(pb).replace('yesterday', '1d ago').replace(/ days? ago/, 'd ago').replace(/ weeks? ago/, 'w ago').replace(/ months? ago/, 'mo ago').replace(/ years? ago/, 'y ago');

// Card (versión A, captura de la usuaria): ícono en cuadro con tinte, nombre, una línea de descripción y la meta abajo.
function Card({ pb, dirty, peek, flip, go, bind, askDelete }) {
  return html`<article data-pid=${pb.id} data-flip=${flip ? pb.id : 'c-' + pb.id} class=${cx('pr-card', peek && 'is-peek')} ...${bind} ...${open(go, pb.id)} aria-label=${pb.name}>
    <span class="r1"><span class=${'pb-vis is-' + pb.visibility} title=${visLabel(pb.visibility)}><${Icon} name=${visIcon(pb.visibility)} /></span>
      <span class="name">${pb.name}</span>${dirty && html`<span class="pr-dot" title="Unsaved changes"></span>`}${cardMenu(pb, go, askDelete)}</span>
    <span class="desc">${pb.description || 'No description'}</span>
    <span class="r3"><span>${plural(pb.rules.length, 'rule', 'rules')}<span class="sep">·</span>${countryName(pb.country)}</span><span class="ago">${shortAgo(pb)}</span></span>
  </article>`;
}
// Fila de la columna (Figma 07)
function Row({ pb, selected, dirty, peek, flip, go, bind }) {
  return html`<a href=${'#/' + pb.id} data-pid=${pb.id} data-flip=${flip ? pb.id : 'r-' + pb.id} class=${cx('pr-row', selected && 'is-on', peek && 'is-peek')} ...${bind}
    aria-current=${selected ? 'page' : undefined} onClick=${(e) => { e.preventDefault(); go(pb.id); }}>
    <span class="t"><span class="name">${pb.name}</span>${dirty && html`<span class="pr-dot" title="Unsaved changes"></span>`}<${Icon} name=${visIcon(pb.visibility)} /></span>
    <span class="d">${pb.description || 'No description'}</span>
    <span class="pb-meta">${plural(pb.rules.length, 'rule', 'rules')}<span class="sep">·</span>${countryName(pb.country)}</span>
  </a>`;
}
// Fila de lista (versión B): columnas alineadas y chevron a la derecha que abre el playbook al lado.
function ListRow({ pb, i = 0, selected, dirty, peek, go, bind, askDelete }) {
  return html`<div data-pid=${pb.id} style=${'--i:' + i} class=${cx('pr-li', selected && 'is-on', peek && 'is-peek')} ...${bind} ...${open(go, pb.id)} aria-label=${pb.name} aria-current=${selected ? 'page' : undefined}>
    <span class=${'pb-vis is-' + pb.visibility} title=${visLabel(pb.visibility)}><${Icon} name=${visIcon(pb.visibility)} /></span>
    <span class="main"><span class="name"><span data-anchor>${pb.name}</span>${dirty && html`<span class="pr-dot" title="Unsaved changes"></span>`}</span><span class="d">${pb.description || 'No description'}</span></span>
    <span class="col num">${plural(pb.rules.length, 'rule', 'rules')}</span>
    <span class="col">${countryName(pb.country)}</span>
    <span class="col ed num">${ago(pb)}</span>
    ${cardMenu(pb, go, askDelete)}
    <span class="chev"><${Icon} name="CaretRight" /></span>
  </div>`;
}

// Páginas horizontales con flechas y puntos. rows filas × cols columnas por página.
function usePages(count, per, initial = 0) {
  const track = useRef(); const [page, setPage] = useState(initial);
  const pages = Math.max(1, Math.ceil(count / per));
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [pages]);
  useLayoutEffect(() => { const t = track.current; if (t) t.scrollLeft = page * (t.clientWidth + 16); }, [per]);
  useEffect(() => { if (initial && track.current) track.current.scrollLeft = initial * (track.current.clientWidth + 16); }, []);
  const to = (i) => { const t = track.current; if (!t) return; const n = Math.max(0, Math.min(pages - 1, i)); t.scrollTo({ left: n * (t.clientWidth + 16), behavior: 'smooth' }); setPage(n); };
  const onScroll = (e) => { const t = e.currentTarget; const n = Math.round(t.scrollLeft / (t.clientWidth + 16)); if (n !== page) setPage(n); };
  const controls = pages > 1 && html`<span class="pr-pager">
    <span class="dots">${Array.from({ length: pages }, (_, i) => html`<button type="button" aria-label=${'Page ' + (i + 1)} aria-current=${i === page ? 'true' : undefined} onClick=${() => to(i)}></button>`)}</span>
    <button type="button" class="arw" aria-label="Previous page" disabled=${page === 0} onClick=${() => to(page - 1)}><${Icon} name="CaretLeft" /></button>
    <button type="button" class="arw" aria-label="Next page" disabled=${page === pages - 1} onClick=${() => to(page + 1)}><${Icon} name="CaretRight" /></button>
  </span>`;
  return { track, onScroll, controls, pages };
}
// Grupo paginado: las páginas se deslizan con scroll-snap. "head" va entre el título y las páginas (encabezado de tabla).
// Tabla (B): las páginas no se deslizan; las filas cambian en el mismo lugar con una transición corta.
// La caja guarda el alto de una página llena, así lo que está abajo no se mueve.
function SwapGroup({ label, count, ps, per, initialPage, renderRows, head }) {
  const pages = Math.max(1, Math.ceil(ps.length / per));
  const [page, setPage] = useState(Math.min(initialPage || 0, pages - 1));
  const [dir, setDir] = useState(0);
  useEffect(() => { if (page > pages - 1) setPage(pages - 1); }, [pages]);
  // El alto de la caja se anima entre una página y otra: si la nueva tiene menos filas, lo de abajo sube suave (y baja al volver).
  const box = useRef(); const h0 = useRef(null);
  const to = (i) => { const n = Math.max(0, Math.min(pages - 1, i)); if (n === page) return; h0.current = box.current?.offsetHeight ?? null; setDir(n > page ? 1 : -1); setPage(n); };
  useLayoutEffect(() => {
    const el = box.current, from = h0.current; h0.current = null; if (!el || from == null) return;
    const to = el.offsetHeight; if (Math.abs(to - from) < 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    el.animate([{ height: from + 'px', overflow: 'hidden' }, { height: to + 'px', overflow: 'hidden' }], { duration: 320, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }, [page]);
  const rows = ps.slice(page * per, page * per + per);
  return html`<section class="pr-group">
    <div class="pr-group-h"><h2 class="pb-eyebrow" data-flip=${'h-' + label}>${label}<span class="c">· ${count}</span></h2>
      ${pages > 1 && html`<span class="pr-pager">
        <span class="dots">${Array.from({ length: pages }, (_, i) => html`<button type="button" aria-label=${'Page ' + (i + 1)} aria-current=${i === page ? 'true' : undefined} onClick=${() => to(i)}></button>`)}</span>
        <button type="button" class="arw" aria-label="Previous page" disabled=${page === 0} onClick=${() => to(page - 1)}><${Icon} name="CaretLeft" /></button>
        <button type="button" class="arw" aria-label="Next page" disabled=${page === pages - 1} onClick=${() => to(page + 1)}><${Icon} name="CaretRight" /></button>
      </span>`}</div>
    ${head}
    <div class="pr-swap" ref=${box}>
      <div class="pr-list" data-swap=${dir ? (dir > 0 ? 'next' : 'prev') : undefined} key=${'p' + page}>${renderRows(rows)}</div>
    </div>
  </section>`;
}
function PagedGroup({ label, count, ps, per, initialPage, renderPage, head }) {
  const pg = usePages(ps.length, per, initialPage);
  const pages = []; for (let i = 0; i < ps.length; i += per) pages.push(ps.slice(i, i + per));
  return html`<section class="pr-group">
    <div class="pr-group-h"><h2 class="pb-eyebrow" data-flip=${'h-' + label}>${label}<span class="c">· ${count}</span></h2>${pg.controls}</div>
    ${head}
    <div class="pr-track" ref=${pg.track} onScroll=${pg.onScroll}>${pages.map(renderPage)}</div>
  </section>`;
}

function Library({ all, state, setState, mode, section, setSection, selectedId, flipId, isDirty, go, prev, removePb, initialPage }) {
  const { q, filters, empty, loading } = state;
  const compact = mode !== 'full';
  const list = applyFilters(all, q, filters);
  const filtered = q.trim() || activeCount(filters);
  const [del, setDel] = useState(null);
  const ref = useRef(); const [cols, setCols] = useState(3);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => { const w = el.closest('.pr-host')?.clientWidth || el.clientWidth; setCols(w >= 1100 ? 3 : w >= 720 ? 2 : 1); });
    ro.observe(el.closest('.pr-host') || el); return () => ro.disconnect();
  }, []);
  const newBtn = (sm) => html`<button type="button" class=${cx('pb-btn pb-btn-primary', sm && 'sm')} onClick=${() => go('new')}><${Icon} name="Plus" />New playbook</button>`;
  const cnt = (total, ps) => (filtered ? `${ps.length} of ${total}` : ps.length);
  const card = (p) => html`<${Card} key=${p.id} pb=${p} dirty=${isDirty(p.id)} peek=${prev.st?.id === p.id} flip=${p.id === flipId} go=${go} bind=${prev.bind(p.id)} askDelete=${setDel} />`;
  const group = (key, label, total, ps, rows) => {
    if (!ps.length) return null;
    // Versión B: la misma tabla a pantalla completa y en la columna (5 filas por página); al achicarse
    // se esconden Rules / Country / Edited y quedan nombre, descripción con "…" y chevron.
    if (LIST) return html`<${SwapGroup} key=${key} label=${label} count=${cnt(total, ps)} ps=${ps} per=${5} initialPage=${key === 'mine' ? initialPage : 0}
      head=${html`<div class="pr-thead" aria-hidden="true"><span class="nm">Name</span><span>Rules</span><span>Country</span><span>Edited</span><span></span><span></span></div>`}
      renderRows=${(p) => p.map((x, i) => html`<${ListRow} key=${x.id} i=${i} pb=${x} selected=${x.id === selectedId} dirty=${isDirty(x.id)} peek=${prev.st?.id === x.id} go=${go} bind=${prev.bind(x.id)} askDelete=${setDel} />`)} />`;
    if (compact) return html`<section class="pr-group">
      <h2 class="pb-eyebrow pr-group-h" data-flip=${'h-' + label}>${label}<span class="c">· ${cnt(total, ps)}</span></h2>
      <div class="pr-rows">${ps.map((p) => html`<${Row} key=${p.id} pb=${p} selected=${p.id === selectedId} dirty=${isDirty(p.id)} peek=${prev.st?.id === p.id} flip=${p.id === flipId} go=${go} bind=${prev.bind(p.id)} />`)}</div>
    </section>`;
    return html`<${PagedGroup} key=${key + cols} label=${label} count=${cnt(total, ps)} ps=${ps} per=${cols * rows} initialPage=${key === 'mine' ? initialPage : 0}
      renderPage=${(p) => html`<div class="pr-page" style=${`--cols:${cols}`}>${p.map(card)}</div>`} />`;
  };
  // Columna (versión A): el resaltado de la fila elegida se desliza de una fila a otra en vez de saltar.
  // El ancho no se mide: va de borde a borde de la columna (left/right), así sigue al arrastrar el separador.
  const selRef = useRef(); const placed = useRef(false);
  const placeSel = (animate) => {
    const sel = selRef.current; if (!sel) return;
    const row = !LIST && compact ? ref.current?.querySelector('.pr-row.is-on') : null;
    if (!row) { sel.style.opacity = '0'; placed.current = false; return; }
    sel.style.transition = placed.current && animate ? '' : 'none';
    sel.style.left = row.offsetLeft + 'px'; sel.style.right = row.offsetLeft + 'px';
    sel.style.transform = `translateY(${row.offsetTop}px)`; sel.style.height = row.offsetHeight + 'px'; sel.style.opacity = '1';
    placed.current = true;
  };
  useLayoutEffect(() => placeSel(true));
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(() => placeSel(false)); ro.observe(el); return () => ro.disconnect();
  }, []);

  let body;
  if (section !== 'playbooks') {
    const [t, d] = SECTION_EMPTY[section];
    body = html`<${EmptyState} title=${t} text=${d} />`;
  } else if (loading) {
    body = html`<div class="pr-group"><div class="pr-page" style="--cols:3">${[0, 1, 2, 3, 4, 5].map(() => html`<div class="pr-skel"><i style="width:55%"></i><i style="width:90%;margin-top:14px"></i><i style="width:40%;margin-top:22px"></i></div>`)}</div></div>`;
  } else if (empty) {
    body = html`<${EmptyState} kind="playbook" title="No playbooks yet" text="Playbooks hold the rules Magnar checks when it reviews a contract. Start with the one you use most." action=${newBtn(false)} />`;
  } else {
    const search = html`<${SearchBox} value=${q} onInput=${(v) => setState({ ...state, q: v })} />`;
    const pills = html`<${FilterPills} all=${all} filters=${filters} setFilters=${(f) => setState({ ...state, filters: f })} />`;
    body = html`
      <div class="pr-tools" key=${compact ? 'c' : 'f'}>${compact ? html`<div class="pr-coltools">${search}<div class="pr-pillrow">${pills}</div></div>` : html`<div class="pr-toolbar">${search}${pills}<span class="grow"></span>${newBtn(false)}</div>`}</div>
      ${list.length
        ? html`${group('mine', 'My playbooks', all.filter((p) => p.mine).length, list.filter((p) => p.mine), 2)}${group('shared', 'Shared with me', all.filter((p) => !p.mine).length, list.filter((p) => !p.mine), 1)}`
        : html`<p class="pr-noresults">${q.trim() ? html`No playbooks match “${q.trim()}”` : 'No playbooks match these filters'}<button type="button" class="pb-link" style="text-decoration:underline;text-underline-offset:3px" onClick=${() => setState({ ...state, q: '', filters: EMPTY_FILTERS })}>Clear filters</button></p>`}`;
  }
  return html`<section class="pr-lib" aria-label="Playbooks" ref=${ref} data-preview-edge=${compact ? '' : undefined}>
    <div class="pr-scroll"><div class="pr-lib-inner"><div class="pr-lib-pad">
      <div class="pr-khead"><h1 class="pb-section" data-flip="k-title">Knowledge</h1>${compact && section === 'playbooks' && newBtn(true)}</div>
      <${Tabs} sections=${SECTIONS} active=${section} onSelect=${setSection} compact=${compact}
        trailing=${!compact && html`<button type="button" class="pb-icon-btn sm info" aria-label="About Knowledge"><${Icon} name="Info" /></button>`} />
      <span class="pr-sel" ref=${selRef} aria-hidden="true"></span>
      <div class="pr-fade" key=${LIST || mode === 'full' ? 'full' : 'col'}>${body}</div>
    </div></div></div>
    <${AlertDialog} open=${!!del} onClose=${() => setDel(null)} title="Delete this playbook?"
      description=${del ? `“${del.name}” and its ${plural(del.rules.length, 'rule', 'rules')} will be deleted. This can’t be undone.` : ''}
      actionLabel="Delete" onAction=${() => { removePb(del.id); setDel(null); }} />
  </section>`;
}

// ------------------------------------------------------------ card de regla (Figma 07)
// Cerrada: número, título y una línea de vista previa. Abierta: Name y Description en campos rellenos.
// Cada tecla cambia el playbook (la barra flotante cuenta el cambio al tiro); "Save" guarda esa regla.
function RuleCard({ rule, n, open, confirming, fresh, hold, on }) {
  const nameRef = useRef();
  useEffect(() => { if (open && fresh) setTimeout(() => nameRef.current?.focus({ preventScroll: true }), 80); }, [open, fresh]);
  const label = rule.title.trim() || 'Untitled rule';
  const preview = firstLine(rule.body);
  const headKey = (e) => {
    if (e.target !== e.currentTarget) return;
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); on.toggle(); }
    else if (e.key === 'Escape') on.collapse();
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); const heads = [...document.querySelectorAll('.pr-rule-head')]; heads[heads.indexOf(e.currentTarget) + (e.key === 'ArrowDown' ? 1 : -1)]?.focus();
    }
  };
  return html`<li id=${'rule-' + rule.id} data-rule=${rule.id} class=${cx('pr-rule', open && 'is-open', fresh && (hold ? 'pb-flash-hold' : 'pb-flash'))}
    onKeyDown=${(e) => { if (!open) return; if (e.key === 'Escape') { e.stopPropagation(); on.collapse(); } if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); on.save(); } }}>
    <div class="pr-rule-head" role="button" tabindex="0" aria-expanded=${open ? 'true' : 'false'} onClick=${(e) => e.target.closest('button') || on.toggle()} onKeyDown=${headKey}>
      <span class="pr-num">${String(n).padStart(2, '0')}</span>
      <span class="txt"><span class=${cx('title', !rule.title.trim() && 'is-empty')}>${label}</span>${preview && html`<span class="prev">${preview}</span>`}</span>
      ${!open && html`<${MenuButton} align="end" width=${180} items=${[{ key: 'edit', label: 'Edit', lead: html`<${Icon} name="PencilSimple" />` }, { key: 'del', label: 'Delete rule', danger: true, lead: html`<${Icon} name="Trash" />` }]}
        onSelect=${(k) => (k === 'edit' ? on.toggle() : on.askDelete())}
        trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm more" aria-label=${'More actions for ' + label}><${Icon} name="DotsThree" /></button>`} />`}
      <button type="button" class="pr-chev" aria-label=${open ? 'Collapse rule' : 'Expand rule'} onClick=${on.toggle}><${Icon} name="CaretDown" /></button>
    </div>
    <div class="pr-rule-body" inert=${!open}><div><div class="pr-rule-pad">
      <label class="pr-flabel" for=${'n-' + rule.id}>Name</label>
      <input ref=${nameRef} id=${'n-' + rule.id} class="pr-filled" placeholder="e.g. Ley aplicable y jurisdicción" value=${rule.title}
        onInput=${(e) => on.edit({ title: e.target.value })} onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); document.getElementById('b-' + rule.id)?.focus(); } }} />
      <label class="pr-flabel" for=${'b-' + rule.id}>Description</label>
      <textarea id=${'b-' + rule.id} class="pr-filled" rows="4" placeholder="Write the position Magnar should check. E.g. Posición Estándar (Ideal): La confidencialidad dura 3 años desde la firma."
        value=${rule.body} onInput=${(e) => on.edit({ body: e.target.value })}></textarea>
      <div class="pr-rule-foot">
        ${confirming
          ? html`<span class="q">Delete this rule?</span><span class="flex items-center gap-2">
              <button type="button" class="pb-btn pb-btn-ghost sm" onClick=${on.cancelDelete}>Cancel</button>
              <button type="button" class="pb-btn sm" style="background:var(--destructive);color:var(--surface)" onClick=${on.remove}>Delete</button></span>`
          : html`<${Tip} label="Delete rule"><button type="button" class="pr-square" aria-label="Delete rule" onClick=${on.askDelete}><${Icon} name="Trash" /></button><//>
            <${Tip} label="Save rule" kbd="⌘↵" side="top"><button type="button" class="pb-btn pb-btn-primary sm" onClick=${on.save}>Save</button><//>`}
      </div>
    </div></div></div>
  </li>`;
}

// open / setOpen pueden venir de afuera (el índice "On this page" abre reglas).
function Rules({ rules, setRules, saveRule, init = {}, hold, open: openProp, setOpen: setOpenProp }) {
  const [openLocal, setOpenLocal] = useState(init.open || null);
  const open = setOpenProp ? openProp : openLocal, setOpen = setOpenProp || setOpenLocal;
  const [confirm, setConfirm] = useState(init.confirm || null);
  const [fresh, setFresh] = useState(null);
  const ref = useRef(rules); ref.current = rules;
  const add = () => {
    const r = newRule();
    setRules([...ref.current, r]); setOpen(r.id); setConfirm(null); setFresh(r.id);
    setTimeout(() => document.getElementById('rule-' + r.id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
  };
  useEffect(() => { if (init.add) add(); }, []);
  const on = (r) => ({
    toggle: () => { setFresh(null); setConfirm(null); setOpen(open === r.id ? null : r.id); },
    collapse: () => { setFresh(null); setConfirm(null); setOpen(null); },
    edit: (patch) => setRules(ref.current.map((x) => (x.id === r.id ? { ...x, ...patch } : x))),
    save: () => { saveRule?.(r.id); setOpen(null); setFresh(null); },
    askDelete: () => { setOpen(r.id); setConfirm(r.id); },
    cancelDelete: () => setConfirm(null),
    remove: () => { setRules(ref.current.filter((x) => x.id !== r.id)); setOpen(null); setConfirm(null); },
  });
  return html`<section aria-labelledby="rules-h">
    <div class="pr-rules-h"><h2 id="rules-h">Rules</h2><span class="c">${rules.length}</span>
      ${rules.length > 0 && html`<span class="grow"></span><button type="button" class="pb-btn pb-btn-secondary sm" onClick=${add}><${Icon} name="Plus" />Add rule</button>`}</div>
    <p class="pr-note">Each rule is checked on its own. One clause per rule keeps reviews clear.</p>
    ${rules.length === 0
      ? html`<div class="pr-rules-empty"><span>No rules yet</span><button type="button" class="pb-btn pb-btn-secondary sm" onClick=${add}><${Icon} name="Plus" />Add rule</button></div>`
      : html`<ol class="pr-rules">${rules.map((r, i) => html`<${RuleCard} key=${r.id} rule=${r} n=${i + 1} open=${open === r.id}
            confirming=${confirm === r.id} fresh=${fresh === r.id || (hold && init.fresh === r.id)} hold=${hold} on=${on(r)} />`)}</ol>`}
  </section>`;
}

// ------------------------------------------------------------ campo select (Country / Visibility)
function SelectField({ id, label, value, options, onChange }) {
  const o = options.find((x) => x.key === value);
  return html`<div><label class="pb-label" for=${id}>${label}</label>
    <${MenuButton} items=${options} selected=${[value]} width=${200} onSelect=${onChange}
      trigger=${(p) => html`<button id=${id} type="button" ...${p} class="pb-field">${o.lead}<span>${o.label}</span><${Icon} name="CaretDown" class="chev" /></button>`} /></div>`;
}

// ------------------------------------------------------------ crear
function Create({ params, onCancel, onCreate, back }) {
  const demo = Number(params.demo || 0);
  const [name, setName] = useState(demo ? 'Servicios cloud' : '');
  const [country, setCountry] = useState('CL');
  const [vis, setVis] = useState('private');
  const [description, setDescription] = useState(demo ? 'Para contratos de servicios cloud con proveedores extranjeros, desde la posición del cliente.' : '');
  const [rules, setRules] = useState(() => (demo ? DEMO_RULES().slice(0, demo) : []));
  const init = demo === 1 ? { open: rules[0].id } : {};
  return html`<div class="pr-scroll"><div class="pr-create" data-flip="page">
    ${back}
    <h1 class="pb-page-title">New playbook</h1>
    <p class="pb-lead" style="margin-top:8px">Set the basics and add the rules Magnar will check.</p>
    <div class="pr-fields">
      <div><label class="pb-label" for="f-name">Name</label><input id="f-name" class="pb-field" placeholder="e.g. Servicios cloud" value=${name} onInput=${(e) => setName(e.target.value)} /></div>
      <${SelectField} id="f-country" label="Country" value=${country} options=${COUNTRY_OPTS} onChange=${setCountry} />
      <${SelectField} id="f-vis" label="Visibility" value=${vis} options=${VIS_OPTS} onChange=${setVis} />
    </div>
    <div style="margin-top:24px"><label class="pb-label" for="f-desc">Description</label>
      <textarea id="f-desc" class="pb-field" rows="3" placeholder="Para contratos de servicios cloud con proveedores extranjeros…" value=${description} onInput=${(e) => setDescription(e.target.value)}></textarea></div>
    <hr class="pr-hr" />
    <${Rules} rules=${rules} setRules=${setRules} init=${init} />
  </div>
  <div class="pr-foot">
    <button type="button" class="pb-btn pb-btn-secondary" onClick=${onCancel}>Cancel</button>
    ${name.trim()
      ? html`<button type="button" class="pb-btn pb-btn-primary" onClick=${() => onCreate({ name: name.trim(), country, visibility: vis, description, rules })}>Create</button>`
      : html`<${Tip} label="Add a name to create" side="top"><button type="button" class="pb-btn pb-btn-primary" disabled>Create</button><//>`}
  </div></div>`;
}

// ------------------------------------------------------------ detalle
function Detail({ pb, params, update, saveRule, remove, close, back }) {
  const scroller = useRef();
  const [confirm, setConfirm] = useState(false);
  const init = params.del ? { open: params.del, confirm: params.del } : params.added ? { add: true } : { open: params.rule || params.edit };
  const [openRule, setOpenRuleRaw] = useState(init.open || null);
  const [active, setActive] = useState(init.open || pb.rules[0]?.id);
  const hold = useRef(0);   // mientras dura el scroll pedido por un click, el "scroll spy" no mueve el indicador
  // Abrir una regla (desde su card o desde el índice) mueve también el indicador del índice.
  const setOpenRule = (id) => { setOpenRuleRaw(id); if (id) { setActive(id); hold.current = Date.now() + 700; } };
  useEffect(() => {
    const box = scroller.current; if (!box) return;
    const spy = () => {
      if (Date.now() < hold.current) return;
      const top = box.getBoundingClientRect().top + 120; let cur = pb.rules[0]?.id;
      box.querySelectorAll('[data-rule]').forEach((el) => { if (el.getBoundingClientRect().top <= top) cur = el.dataset.rule; });
      if (box.scrollTop + box.clientHeight >= box.scrollHeight - 4) cur = pb.rules[pb.rules.length - 1]?.id;   // al final, la última
      setActive(cur);
    };
    box.addEventListener('scroll', spy, { passive: true }); return () => box.removeEventListener('scroll', spy);
  }, [pb.rules.length]);
  // Índice "On this page": aparece desde 3 reglas; un click abre la regla y la trae a la vista.
  const goRule = (id) => {
    setOpenRule(id);
    setTimeout(() => scrollToIn(scroller.current, document.getElementById('rule-' + id)), 30);
  };
  const hasIndex = pb.rules.length > 2;
  // Indicador del índice: una sola barra que se desliza a la regla activa
  const idxRef = useRef(); const barRef = useRef(); const barPlaced = useRef(false);
  useLayoutEffect(() => {
    const a = idxRef.current?.querySelector('a.is-on'), bar = barRef.current; if (!bar) return;
    if (!a) { bar.style.opacity = '0'; return; }
    bar.style.transition = barPlaced.current ? '' : 'none';
    bar.style.transform = `translateY(${a.offsetTop + 4}px)`; bar.style.height = (a.offsetHeight - 8) + 'px'; bar.style.opacity = '1';
    barPlaced.current = true;
  });
  return html`<div class="pr-scroll" ref=${scroller}><div class=${cx('pr-detail pr-enter', hasIndex && 'has-index')} data-flip="page">
    <div>
      ${back}
      <nav class="pr-crumb" aria-label="Breadcrumb"><a href="#/" onClick=${(e) => { e.preventDefault(); close(); }}>Playbooks</a><span>/</span><span class="cur">${pb.name || 'Untitled playbook'}</span></nav>
      <div class="pr-head">
        <textarea class="pb-inline pr-title" rows="1" aria-label="Playbook name" placeholder="Untitled playbook" value=${pb.name}
          onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()} onInput=${(e) => update((d) => ({ ...d, name: e.target.value.replace(/\n/g, ' ') }))}></textarea>
        <div class="pr-edited">Edited ${ago(pb)}
          <${MenuButton} align="end" width=${200} items=${[{ key: 'delete', label: 'Delete playbook', danger: true, lead: html`<${Icon} name="Trash" />` }]} onSelect=${() => setConfirm(true)}
            trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" style="margin-left:4px" aria-label="Playbook options"><${Icon} name="DotsThree" /></button>`} />
        </div>
      </div>
      <textarea class="pb-inline pr-desc" rows="1" aria-label="Description" placeholder="Add a description" value=${pb.description}
        onInput=${(e) => update((d) => ({ ...d, description: e.target.value }))}></textarea>
      <div class="pr-props">
        <${MenuButton} items=${VIS_OPTS} selected=${[pb.visibility]} width=${180} onSelect=${(v) => update((d) => ({ ...d, visibility: v }))}
          trigger=${(p) => html`<button type="button" ...${p} class="pr-prop" aria-label="Visibility"><${Icon} name=${visIcon(pb.visibility)} />${visLabel(pb.visibility)}</button>`} />
        <span class="sep">·</span><span class="pr-prop is-static">${plural(pb.rules.length, 'rule', 'rules')}</span><span class="sep">·</span>
        <${MenuButton} items=${COUNTRY_OPTS} selected=${[pb.country]} width=${200} onSelect=${(c) => update((d) => ({ ...d, country: c }))}
          trigger=${(p) => html`<button type="button" ...${p} class="pr-prop" aria-label="Country">${countryName(pb.country)}</button>`} />
      </div>
      <div style="margin-top:40px">
        <${Rules} rules=${pb.rules} setRules=${(rules) => update((d) => ({ ...d, rules }))} saveRule=${saveRule} init=${init} hold=${!!params.hold} open=${openRule} setOpen=${setOpenRule} />
      </div>
    </div>
    ${hasIndex && html`<aside class="pr-index" aria-label="Rules in this playbook">
      <h3 class="pb-eyebrow">On this page</h3>
      <ol ref=${idxRef}><span class="pr-index-bar" ref=${barRef}></span>${pb.rules.map((r) => html`<li><a href=${'#rule-' + r.id} class=${cx(r.id === active && 'is-on', r.id === openRule && 'is-open')}
        onClick=${(e) => { e.preventDefault(); goRule(r.id); }}>${r.title || 'Untitled rule'}</a></li>`)}</ol>
    </aside>`}
    <${AlertDialog} open=${confirm} onClose=${() => setConfirm(false)} title="Delete this playbook?"
      description=${`“${pb.name || 'Untitled playbook'}” and its ${plural(pb.rules.length, 'rule', 'rules')} will be deleted. This can’t be undone.`}
      actionLabel="Delete" onAction=${() => { setConfirm(false); remove(); }} />
  </div></div>`;
}

// ------------------------------------------------------------ separador que se arrastra (como el split de Magnar)
// Arrastrar cambia el ancho de la biblioteca; soltar bajo 200px la oculta; doble click vuelve a 340px.
function Resizer({ hostRef, onHide, onCommit }) {
  const down = (e) => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const host = hostRef.current; const stage = host.querySelector('.pr-stage');
    const left = host.getBoundingClientRect().left; const max = Math.min(640, host.clientWidth - 480);
    stage.classList.add('is-resizing'); document.body.style.cursor = 'col-resize';
    let w = null;
    const move = (ev) => { w = ev.clientX - left - 4; host.style.setProperty('--col', Math.max(COL_MIN, Math.min(max, w)) + 'px'); };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      stage.classList.remove('is-resizing'); document.body.style.cursor = '';
      if (w !== null && w < 200) { host.style.setProperty('--col', COL_DEFAULT + 'px'); onHide(); return; }
      if (w !== null) onCommit(Math.max(COL_MIN, Math.min(max, w)));
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); e.preventDefault();
  };
  return html`<span class="pr-resize" role="separator" aria-orientation="vertical" aria-label="Resize playbooks" title="Drag to resize"
    onPointerDown=${down} onDblClick=${() => { hostRef.current.style.setProperty('--col', COL_DEFAULT + 'px'); onCommit(COL_DEFAULT); }}></span>`;
}

// ------------------------------------------------------------ app
function App() {
  const { path, params, nav } = useHashState();
  const [saved, setSaved] = useState(SEED);
  const [drafts, setDrafts] = useState({});
  const [lib, setLib] = useState(() => ({ q: params.q || '', filters: { ...EMPTY_FILTERS, visibility: params.vis ? [params.vis] : [] }, empty: !!params.empty, loading: !!params.loading }));
  const [section, setSection] = useState(params.s || 'playbooks');
  const [openTab, setOpenTab] = useState('pb');
  const [toast, setToast] = useState(null);
  const [flipId, setFlipId] = useState(null);
  const host = useRef();
  const split = splitParam();

  const items = saved.map((p) => drafts[p.id] || p);
  const isDirty = (id) => !!drafts[id] && !same(drafts[id], saved.find((p) => p.id === id));
  const current = path && path !== 'new' ? saved.find((p) => p.id === path) : null;
  const mode = path === 'new' || current ? (params.wide ? 'wide' : 'split') : 'full';
  const { wide, preview, ...rest } = params;
  const pageKey = path + JSON.stringify(rest);
  const prev = usePreview(preview);

  // Cards ↔ columna (A): el playbook elegido viaja de su card a su fila, lo anterior se desvanece encima y lo nuevo entra escalonado.
  // B: la tabla no se desmonta, solo se angosta (CSS). Entre playbooks: fundido cruzado del panel.
  const go = (p, q = {}) => {
    prev.close();
    const changesMode = !p !== (mode === 'full');
    if (changesMode && !LIST) { setFlipId(p && p !== 'new' ? p : path); ghost(document.querySelector('.pr-lib .pr-scroll'), 200); snapshot(); }
    else if (!changesMode && p !== path) ghost(document.querySelector('.pr-pane-inner > .pr-scroll'), 200);
    // B: la fila que se abre (o la que estaba abierta, al cerrar) no se mueve de su lugar en la pantalla
    if (changesMode && LIST) { const id = p && p !== 'new' ? p : path; if (id && id !== 'new') holdAnchor(`.pr-li[data-pid="${id}"]`); }
    nav(p, q);
  };
  useLayoutEffect(playFlip, [mode, path]);
  useEffect(() => { if (mode === 'full') setOpenTab('pb'); }, [mode]);
  useLayoutEffect(() => { const c = Number(params.col) || storedCol(); if (c && host.current) host.current.style.setProperty('--col', Math.max(COL_MIN, c) + 'px'); }, []);
  useEffect(() => {
    if (!current || !params.dirty) return;
    const edit = { 1: (b) => b.replace('ley chilena', 'ley chilena o peruana'), 2: (b) => b.replace('monto del contrato', 'doble del monto del contrato') };
    setDrafts((d) => ({ ...d, [current.id]: { ...current, rules: current.rules.map((r, i) => (edit[i] ? { ...r, body: edit[i](r.body) } : r)) } }));
  }, [pageKey]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 1600); return () => clearTimeout(t); }, [toast]);

  const update = (id) => (fn) => setDrafts((d) => ({ ...d, [id]: fn(d[id] || saved.find((p) => p.id === id)) }));
  const save = (id) => { const d = drafts[id]; if (!d) return; setSaved((s) => s.map((p) => (p.id === id ? { ...d, edited: todayIso() } : p))); setDrafts(({ [id]: _, ...r }) => r); setToast('Changes saved'); };
  // Guardar una sola regla: pasa esa regla a lo guardado; el resto sigue pendiente en la barra.
  const saveRule = (id) => (rid) => {
    const d = drafts[id]; const s = saved.find((p) => p.id === id); if (!d || !s) return;
    const dr = d.rules.find((r) => r.id === rid); if (!dr) return;
    const rules = s.rules.some((r) => r.id === rid) ? s.rules.map((r) => (r.id === rid ? dr : r)) : [...s.rules, dr];
    const next = { ...s, rules, edited: todayIso() };
    setSaved((all) => all.map((p) => (p.id === id ? next : p)));
    setDrafts((all) => { const { [id]: cur, ...r } = all; if (!cur) return all; const merged = { ...cur, edited: next.edited }; return same(merged, next) ? r : { ...r, [id]: merged }; });
    setToast('Rule saved');
  };
  const discard = (id) => setDrafts(({ [id]: _, ...r }) => r);
  const removePb = (id) => { setSaved((s) => s.filter((p) => p.id !== id)); discard(id); setToast('Playbook deleted'); };
  const remove = (id) => () => { removePb(id); go(''); };
  const create = (data) => { const id = 'pb-' + Date.now().toString(36); setSaved((s) => [{ id, mine: true, edited: todayIso(), ...data }, ...s]); setToast('Playbook created'); go(id); };
  const toggleWide = () => go(path, { ...rest, wide: mode === 'wide' ? undefined : 1 });
  useEffect(() => {
    const key = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '\\' && mode !== 'full') { e.preventDefault(); toggleWide(); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && current) { e.preventDefault(); save(current.id); }
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [mode, path, pageKey, drafts]);

  const compact = mode !== 'full';
  const tabs = [
    { title: 'Ley del trabajador', icon: 'ChatCircle', collapsed: compact && openTab !== 'chat', onClick: () => setOpenTab('chat') },
    { title: 'My Playbooks', icon: 'BookOpenText', active: true, collapsed: compact && openTab !== 'pb', onClick: () => setOpenTab('pb') },
  ];
  const back = html`<button type="button" class="pr-back" style="margin-bottom:16px" onClick=${() => go('')}><${Icon} name="ArrowLeft" />Playbooks</button>`;
  const count = current ? changes(drafts[current.id], current) : 0;

  let pane = null;
  if (mode !== 'full') {
    pane = path === 'new'
      ? html`<${Create} key=${pageKey} params=${params} onCancel=${() => go('')} onCreate=${create} back=${back} />`
      : html`<${Detail} key=${pageKey} pb=${drafts[current.id] || current} params=${params} back=${back}
          update=${update(current.id)} saveRule=${saveRule(current.id)} remove=${remove(current.id)} close=${() => go('')} />`;
  }

  return html`<${Frame} split=${split} activeApp="knowledge" links=${SIDEBAR_LINKS} tab=${{ title: 'My Playbooks', icon: 'BookOpenText' }} tabs=${split ? undefined : tabs}>
    <div class=${cx('pb pr-host', LIST && 'is-list')} ref=${host}><div class="pr-stage" data-mode=${mode}>
      <${Library} all=${items} state=${lib} setState=${setLib} mode=${mode} section=${section} setSection=${setSection} selectedId=${current?.id} flipId=${flipId}
        isDirty=${isDirty} go=${go} prev=${prev} removePb=${removePb} initialPage=${Number(params.page || 1) - 1} />
      ${pane && html`<main class="pr-pane">
        ${mode === 'split' && html`<${Resizer} hostRef=${host} onHide=${toggleWide} onCommit=${(w) => { try { localStorage.setItem('pr-col', w); } catch {} }} />`}
        <span class="pr-grip"><${Tip} side="right" label=${mode === 'wide' ? 'Show playbooks' : 'Hide playbooks'} kbd="⌘\\">
          <button type="button" aria-label=${mode === 'wide' ? 'Show playbooks' : 'Hide playbooks'} onClick=${toggleWide}>
            <${Icon} name=${mode === 'wide' ? 'CaretRight' : 'CaretLeft'} /></button><//></span>
        <div class="pr-pane-clip"><div class="pr-pane-inner">
          <span class="pr-close"><${Tip} label="Close"><button type="button" class="pb-icon-btn sm" aria-label="Close" onClick=${() => go('')}><${Icon} name="X" /></button><//></span>
          ${pane}
          ${current && html`<${SaveBar} count=${count} saved=${!!toast && !count} message=${toast} onDiscard=${() => discard(current.id)} onSave=${() => save(current.id)} />`}
        </div></div>
      </main>`}
      ${!pane && toast && html`<div class="pr-toast" role="status"><${Icon} name="CheckCircle" />${toast}</div>`}
      <${Preview} prev=${prev} items=${items} />
    </div></div>
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
