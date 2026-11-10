// Scheduled tasks · versión final.
// Home: arriba, al centro, el módulo de Magnar ("What task do you want to set up?") con ideas de tus tasks recientes.
// En el prototipo es solo visual: se puede hacer click, pero no crea nada. Las tasks se crean con "New task".
// Abajo, pestañas All / Active / Paused con el buscador y "New task", y la tabla de Playbooks B.
// Al abrir o crear una task, la tabla pasa a columna y la task se abre en un panel de media pantalla:
// título y descripción arriba, y un cuadro por tema (Schedule, Where it runs, Notifications, Run history).
// Solo usa los campos que Magnar ya tiene.
//
// Estados por URL:
//   #/                   home              ?empty=1 sin tasks · ?status=paused · ?q=…
//   #/<id>               task abierta      ?dirty=1 con 2 cambios sin guardar · ?running=1 · ?wide=1 sin la lista
//   #/new                crear             ?demo=1 con datos
//   ?split=50 (antes del #) vista dividida · ?v=b (antes del #) el menú lleva a Playbooks versión B
import { html, render, useState, useEffect, useLayoutEffect, useRef } from '../vendor/preact-htm.js';
import { Icon } from '../shared/icons.js';
import { AlertDialog } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { splitParam } from '../shared/playbooks-seed.js';
import { useHashState } from '../shared/redesign-ui.js';
import { cx, Tip, MenuButton, SearchBox, ghost, holdAnchor } from '../shared/pb-kit.js';
import { EmptyState, SaveBar, SIDEBAR_LINKS } from '../shared/pr-ui.js';
import { WEEKDAYS, defaultSchedule, fmtTime, summary, nextRuns, tzOffset } from '../tasks/schedule.js';

const VIEW_ONLY = true;

// ------------------------------------------------------------ datos de muestra (simples a propósito)
const sch = (p) => ({ ...defaultSchedule(), tz: 'America/Santiago', ...p });
const ago = (days, h = 9) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, 0, 0, 0); return d; };
const base = { conversation: 'new', conversationId: 'c1', project: '', tier: 'auto', push: true, email: false, unread: false };
const SEED = [
  { ...base, id: 'contratos-nuevos', name: 'Resumen de contratos nuevos', status: 'active', instructions: 'Revisa los contratos que se subieron esta semana y haz un resumen corto de cada uno.',
    schedule: sch({ repeat: 'weekly', days: [1], time: '09:00' }), project: 'Clientes', email: true, unread: true,
    runs: [{ at: ago(7), status: 'Completed' }, { at: ago(14), status: 'Completed' }, { at: ago(21), status: 'Failed' }, { at: ago(28), status: 'Completed' }] },
  { ...base, id: 'noticias', name: 'Noticias legales del día', status: 'active', instructions: 'Resume las noticias legales más importantes del día en cinco puntos.',
    schedule: sch({ repeat: 'daily', time: '08:00' }), conversation: 'existing', tier: 'mid',
    runs: [1, 2, 3, 4, 5, 6].map((d) => ({ at: ago(d, 8), status: d === 4 ? 'Failed' : 'Completed' })) },
  { ...base, id: 'firmas', name: 'Firmas pendientes', status: 'active', instructions: 'Dime qué documentos siguen esperando firma.',
    schedule: sch({ repeat: 'weekly', days: [1, 2, 3, 4, 5], time: '10:00' }), project: 'Clientes',
    runs: [1, 2, 3].map((d) => ({ at: ago(d, 10), status: 'Completed' })) },
  { ...base, id: 'nda-pendientes', name: 'NDA pendientes', status: 'active', instructions: 'Revisa los NDA que quedaron sin firmar y dime cuáles siguen pendientes.',
    schedule: sch({ repeat: 'weekly', days: [3], time: '11:30' }), project: 'Clientes', runs: [{ at: ago(5, 11), status: 'Completed' }] },
  { ...base, id: 'vencimientos', name: 'Contratos por vencer', status: 'active', instructions: 'Avísame qué contratos vencen en los próximos 30 días.',
    schedule: sch({ repeat: 'weekly', days: [5], time: '17:00' }), push: false, email: true,
    runs: [{ at: ago(3, 17), status: 'Completed' }, { at: ago(10, 17), status: 'Completed' }] },
  { ...base, id: 'ley-laboral', name: 'Cambios en la ley laboral', status: 'active', instructions: 'Busca cambios recientes en la ley laboral y explícalos en simple.',
    schedule: sch({ repeat: 'monthly', monthOn: 'day', monthDay: 1, time: '09:00' }), tier: 'high', runs: [{ at: ago(9), status: 'Completed' }] },
  { ...base, id: 'reporte-mensual', name: 'Reporte del mes', status: 'paused', instructions: 'Haz un resumen de los contratos que revisamos este mes.',
    schedule: sch({ repeat: 'monthly', monthOn: 'last day', time: '18:00' }), tier: 'high', push: false, email: true, runs: [{ at: ago(9, 18), status: 'Completed' }] },
  { ...base, id: 'semana', name: 'Resumen de la semana', status: 'paused', instructions: 'Resume lo que hicimos esta semana en tres puntos.',
    schedule: sch({ repeat: 'weekly', days: [5], time: '18:00' }), runs: [] },
];
const REPEAT = [['once', 'Once'], ['interval', 'At an interval'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['custom', 'Custom']].map(([key, label]) => ({ key, label }));
const TIMES = Array.from({ length: 48 }, (_, i) => { const v = String(Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00'); return { key: v, label: fmtTime(v) }; });
const ZONES = ['America/Santiago', 'America/Lima', 'America/Bogota', 'America/Mexico_City', 'America/Argentina/Buenos_Aires'].map((z) => ({ key: z, label: z, count: tzOffset(z) }));
const CONV = [{ key: 'new', label: 'New conversation each run' }, { key: 'existing', label: 'Existing conversation' }];
const CONVERSATIONS = [{ key: 'c1', label: 'Ley del trabajador' }, { key: 'c2', label: 'Revisión de NDA' }];
const PROJECTS = [{ key: '', label: 'No project' }, { key: 'Clientes', label: 'Clientes' }];
const TIERS = [['auto', 'Auto'], ['low', 'Low'], ['mid', 'Mid'], ['high', 'High']].map(([key, label]) => ({ key, label }));
const FIELDS = ['name', 'instructions', 'conversation', 'conversationId', 'project', 'tier', 'push', 'email', 'status'];
const blank = () => ({ name: '', instructions: '', conversation: 'new', conversationId: 'c1', project: '', tier: 'auto', schedule: sch({ repeat: 'weekly', days: [1] }), push: true, email: false });
const lbl = (opts, k) => opts.find((o) => o.key === (k ?? ''))?.label;
// Frecuencia legible: "Every Mon · 9:00 AM", "Weekdays · 10:00 AM", "Every day · 8:00 AM"
const t12s = (hhmm) => fmtTime(hhmm).replace(/^0/, '');
function freq(s) {
  if (s.repeat === 'weekly') {
    const d = [...s.days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
    const days = d.join() === '1,2,3,4,5' ? 'Weekdays' : 'Every ' + WEEKDAYS.filter((w) => d.includes(w.v)).map((w) => w.short).join(', ');
    return `${days} · ${t12s(s.time)}`;
  }
  if (s.repeat === 'daily') return `Every day · ${t12s(s.time)}`;
  if (s.repeat === 'monthly') return (s.monthOn === 'last day' ? 'End of month' : s.monthOn === 'day' ? `Monthly on day ${s.monthDay}` : summary(s).replace('Every month · ', 'Monthly · ').split(' · ').slice(0, 2).join(' · ')) + ` · ${t12s(s.time)}`;
  return summary(s);
}
const notifLabel = (t) => [t.push && 'Push', t.email && 'Email'].filter(Boolean).join(' and ') || 'Only in the conversation';
const changes = (a, b) => (!a || !b ? 0 : FIELDS.filter((k) => a[k] !== b[k]).length + (JSON.stringify(a.schedule) !== JSON.stringify(b.schedule) ? 1 : 0));

// fechas
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayDiff = (d) => Math.round((sod(d) - sod(new Date())) / 864e5);
const t12 = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const nextLabel = (d) => { const n = dayDiff(d); return (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) + ' · ' + t12(d); };
const fmtRunAt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + t12(d);
const nextOf = (t) => (t.status === 'paused' ? null : nextRuns(t.schedule, 1)[0] || null);

// ------------------------------------------------------------ home: el módulo de Magnar (solo visual en el prototipo)
// Se puede hacer click y aparece un texto de ejemplo; enviar no hace nada. Las tasks se crean con "New task".
const SAMPLE = 'Todos los lunes a las 9, resume los contratos que se subieron la semana pasada';
const IDEAS = [
  { title: 'NDA firmados', from: 'NDA pendientes', text: 'Todos los viernes a las 5, resume los NDA que se firmaron en la semana' },
  { title: 'Vencen este mes', from: 'Contratos por vencer', text: 'El primer día de cada mes, dime qué contratos vencen ese mes' },
  { title: 'Novedades laborales', from: 'Cambios en la ley laboral', text: 'Cada lunes a las 8, resume los cambios en la ley laboral' },
];
function Ask({ compact }) {
  const [text, setText] = useState('');
  return html`<section class=${cx('tf-ask', compact && 'is-hidden')} aria-label="Ask Magnar" inert=${compact}>
    <div class="tf-ask-in"><div class="tf-ask-pad">
      <h2 class="tf-hello">What task do you want to set up?</h2>
      <p class="tf-sub">Tell Magnar what to do and when.</p>
      <form class=${cx('tf-composer', text && 'is-filled')} onSubmit=${(e) => e.preventDefault()} onClick=${() => !text && setText(SAMPLE)}>
        <textarea rows="2" readonly aria-label="Describe a task" value=${text} placeholder="Describe a task and when it should run…"></textarea>
        <div class="tf-composer-bar"><span></span><button type="submit" class="tf-send" aria-label="Send" disabled=${!text}><${Icon} name="ArrowUp" /></button></div>
      </form>
      <div class="tf-ideas">
        <h3 class="pb-eyebrow">From your recent tasks</h3>
        <div class="tf-idea-row">${IDEAS.map((x, i) => html`<button type="button" class="tf-idea" style=${`animation-delay:${80 + i * 40}ms`} onClick=${() => setText(x.text)}>
          <span class="pb-vis is-shared"><${Icon} name="Clock" /></span>
          <span class="t">${x.title}</span><span class="d">Like ${x.from}</span></button>`)}</div>
      </div>
    </div></div>
  </section>`;
}

// ------------------------------------------------------------ lista (misma tabla que Playbooks B)
const Status = ({ t, running }) => html`<span class=${cx('tk-st', t.status === 'paused' && 'is-paused', running && 'is-run')}><i></i>${running ? 'Running' : t.status === 'paused' ? 'Paused' : 'Active'}</span>`;
const lead = (t) => html`<span class=${cx('pb-vis', t.status === 'paused' ? 'tf-paused' : 'is-shared')}><${Icon} name=${t.status === 'paused' ? 'Pause' : 'Clock'} /></span>`;
function TaskRow({ t, selected, running, fresh, dirty, go, menu }) {
  const n = nextOf(t);
  return html`<div data-tid=${t.id} class=${cx('pr-li tf-li', selected && 'is-on', t.status === 'paused' && 'is-paused', fresh && 'pb-flash')} role=${VIEW_ONLY ? undefined : 'link'} tabindex=${VIEW_ONLY ? undefined : '0'} aria-label=${t.name}
    aria-current=${selected ? 'page' : undefined} onClick=${() => go(t.id)} onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); go(t.id); } }}>
    ${lead(t)}
    <span class="main"><span class="name"><span>${t.name}</span>${dirty && html`<span class="pr-dot" title="Unsaved changes"></span>`}${t.unread && html`<span class="tk-unread" title="Unread result">Unread result</span>`}</span>
      <span class="d"><span class="full">${t.instructions}</span><span class="short num">${running ? 'Running now' : n ? nextLabel(n) : 'Paused · ' + freq(t.schedule)}</span></span></span>
    <span class="col num">${freq(t.schedule)}</span>
    <span class="col num">${running ? 'Now' : n ? nextLabel(n) : '—'}</span>
    <span class="col st"><${Status} t=${t} running=${running} /></span>
    <span class="pr-more" onClick=${(e) => e.stopPropagation()} onKeyDown=${(e) => e.stopPropagation()}>${!VIEW_ONLY && menu(t)}</span>
    <span class="chev"><${Icon} name="CaretRight" /></span>
  </div>`;
}
// Pestañas All / Active / Paused: las de Knowledge (subrayado que se desliza), con contador.
function StatusTabs({ value, onChange, counts, trailing }) {
  const ref = useRef(); const bar = useRef(); const first = useRef(true);
  useLayoutEffect(() => {
    const el = ref.current?.querySelector('.pr-tab.is-on'), b = bar.current; if (!el || !b) return;
    b.style.transition = first.current ? 'none' : ''; first.current = false;
    b.style.transform = `translateX(${el.offsetLeft}px)`; b.style.width = el.offsetWidth + 'px';
  });
  const tabs = [['all', 'All tasks'], ['active', 'Active'], ['paused', 'Paused']];
  return html`<div class="pr-tabs tf-tabs" role="tablist" ref=${ref}>
    ${tabs.map(([k, l]) => html`<button type="button" role="tab" aria-selected=${value === k} class=${cx('pr-tab', value === k && 'is-on')} onClick=${() => onChange(k)}>
      <span>${l}</span><span class="tf-count num">${counts[k]}</span></button>`)}
    ${trailing && html`<span class="grow"></span>${trailing}`}
    <span class="pr-tabs-bar" ref=${bar}></span>
  </div>`;
}

// ------------------------------------------------------------ panel: controles sobrios (texto con borde fino, sin rellenos)
function Pick({ value, options, onChange, icon, width = 220, label }) {
  const o = options.find((x) => x.key === value) || options[0];
  return html`<${MenuButton} items=${options} selected=${[value]} width=${width} onSelect=${onChange} cls=${options.length > 8 ? 'tr-scroll' : undefined}
    trigger=${(p) => html`<button type="button" ...${p} aria-label=${label} class="tf-sel">${icon && html`<${Icon} name=${icon} />`}<span>${o.label}</span>${o.count && html`<span class="off">${o.count}</span>`}<${Icon} name="CaretDown" class="chev" /></button>`} />`;
}
// Días como la fila de un calendario: letras en círculo, el elegido en negro
const DAY_LETTER = { 1: 'M', 2: 'T', 3: 'W', 4: 'T', 5: 'F', 6: 'S', 0: 'S' };
function Days({ days, onChange }) {
  return html`<div class="tf-week" role="group" aria-label="Days">${WEEKDAYS.map((w) => html`<button type="button" class="tf-day" aria-pressed=${days.includes(w.v)} title=${w.long}
    onClick=${() => onChange(days.includes(w.v) ? (days.length > 1 ? days.filter((x) => x !== w.v) : days) : [...days, w.v])}>${DAY_LETTER[w.v]}</button>`)}</div>`;
}
const Row = ({ k, children }) => html`<div class="tf-row"><span class="k">${k}</span><div class="v">${children}</div></div>`;
const Box = ({ n, title, children, extra }) => html`<section class="tf-box"><h3 class="tf-box-h">${n && html`<span class="n num">${n}</span>`}${title}${extra && html`<span class="grow"></span>${extra}`}</h3>${children}</section>`;

// ------------------------------------------------------------ panel: task abierta o nueva
// Jerarquía: título y descripción (las instrucciones) arriba, en su cuadro; después un cuadro por tema, solo con su titular.
function TaskPane({ t, isNew, draft, update, running, back, close, onRun, onPause, onDelete, onCreate }) {
  const d = draft;
  const set = (p) => update((x) => ({ ...x, ...p }));
  const setS = (p) => update((x) => ({ ...x, schedule: { ...x.schedule, ...p } }));
  const s = d.schedule;
  const n = !isNew && nextOf({ ...t, ...d });
  const ok = d.name.trim() && d.instructions.trim();
  return html`<div class="pr-scroll"><div class="tf-pane pr-enter" data-flip="page"><div>
    ${back}
    <section class="tf-box tf-head">
      <nav class="pr-crumb" aria-label="Breadcrumb"><a href="#/" onClick=${(e) => { e.preventDefault(); close(); }}>Scheduled tasks</a><span>/</span><span class="cur">${isNew ? 'New task' : d.name || 'Untitled task'}</span></nav>
      <div class="tf-title-row">
        <textarea class="pb-inline pr-title" rows="1" aria-label="Task name" placeholder="Untitled task" value=${d.name}
          onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()} onInput=${(e) => set({ name: e.target.value.replace(/\n/g, ' ') })}></textarea>
        ${!isNew && html`<${MenuButton} align="end" width=${190} items=${[
            { key: 'run', label: 'Run now', lead: html`<${Icon} name="Play" />` },
            { key: 'pause', label: d.status === 'paused' ? 'Resume' : 'Pause', lead: html`<${Icon} name=${d.status === 'paused' ? 'Play' : 'Pause'} />` }, 'sep',
            { key: 'delete', label: 'Delete task', danger: true, lead: html`<${Icon} name="Trash" />` }]}
          onSelect=${(k) => (k === 'run' ? onRun() : k === 'pause' ? onPause() : onDelete())}
          trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" aria-label="Task options"><${Icon} name="DotsThree" /></button>`} />`}
      </div>
      <textarea class="pb-inline pr-desc" rows="1" aria-label="Instructions" placeholder="What should Magnar do each time it runs?" value=${d.instructions}
        onInput=${(e) => set({ instructions: e.target.value })}></textarea>
      <div class="pr-props">
        ${!isNew && html`<${Status} t=${d} running=${running} /><span class="sep">·</span>`}
        <span>${freq(s)}</span>
        ${!isNew && html`<span class="sep">·</span><span class="num">${running ? 'Running now' : n ? 'Next ' + nextLabel(n) : 'No next run'}</span>`}
      </div>
    </section>
    <${Box} n="01" title="Schedule">
      <${Row} k="Repeat"><${Pick} label="Repeat" value=${s.repeat} options=${REPEAT} onChange=${(v) => setS({ repeat: v })} /><//>
      ${s.repeat === 'weekly' && html`<${Row} k="Days"><${Days} days=${s.days} onChange=${(v) => setS({ days: v })} /><//>`}
      ${s.repeat !== 'interval' && html`<${Row} k="Time"><${Pick} label="Time" value=${s.time} options=${TIMES} onChange=${(v) => setS({ time: v })} width=${140} /><//>
        <${Row} k="Time zone"><${Pick} label="Time zone" value=${s.tz} options=${ZONES} onChange=${(v) => setS({ tz: v })} width=${300} /><//>`}
    <//>
    <${Box} n="02" title="Where it runs">
      <${Row} k="Conversation"><${Pick} label="Conversation" value=${d.conversation} options=${CONV} onChange=${(v) => set({ conversation: v })} /><//>
      ${d.conversation === 'existing' && html`<${Row} k="Select"><${Pick} label="Select a conversation" value=${d.conversationId} options=${CONVERSATIONS} onChange=${(v) => set({ conversationId: v })} /><//>`}
      <${Row} k="Project"><${Pick} label="Project" value=${d.project} options=${PROJECTS} onChange=${(v) => set({ project: v })} /><//>
      <${Row} k="Agent tier"><${Pick} label="Agent tier" value=${d.tier} options=${TIERS} onChange=${(v) => set({ tier: v })} width=${160} /><//>
    <//>
    <${Box} n="03" title="Notifications">
      <div class="tr-checks tf-checks">
        <label class="tr-check"><input type="checkbox" checked=${d.push} onChange=${(e) => set({ push: e.target.checked })} />Push</label>
        <label class="tr-check"><input type="checkbox" checked=${d.email} onChange=${(e) => set({ email: e.target.checked })} />Email</label>
      </div>
    <//>
    ${!isNew && html`<${Box} title="Run history" extra=${t.unread && html`<span class="tk-unread">Unread result</span>`}>
      ${t.runs.length ? html`<ol class="tf-runs-list">${t.runs.slice(0, 4).map((r) => html`<li><span class="num">${fmtRunAt(r.at)}</span>
          <span class=${cx('tk-st', r.status === 'Failed' && 'is-fail', r.status === 'Running' && 'is-run')}><i></i>${r.status}</span></li>`)}</ol>`
        : html`<p class="tf-muted">No runs yet</p>`}
    <//>`}
  </div></div></div>
  ${isNew && html`<div class="pr-foot">
    <button type="button" class="pb-btn pb-btn-secondary" onClick=${close}>Cancel</button>
    ${ok ? html`<button type="button" class="pb-btn pb-btn-primary" onClick=${onCreate}>Create task</button>`
      : html`<${Tip} label="Add a name and instructions" side="top"><button type="button" class="pb-btn pb-btn-primary" disabled>Create task</button><//>`}
  </div>`}`;
}
// ------------------------------------------------------------ separador que se arrastra (igual que en Playbooks)
// El panel ocupa la mitad de la pantalla; la lista, la otra mitad. Arrastrar cambia la proporción.
const COL_MIN = 280;
const storedCol = () => { try { return Number(localStorage.getItem('tf-col-half')) || 0; } catch { return 0; } };
function Resizer({ hostRef, onHide, onCommit }) {
  const down = (e) => {
    if (e.button !== 0) return;
    const host = hostRef.current; const stage = host.querySelector('.pr-stage');
    const left = host.getBoundingClientRect().left; const max = host.clientWidth - 480;
    stage.classList.add('is-resizing'); document.body.style.cursor = 'col-resize';
    let w = null;
    const move = (ev) => { w = ev.clientX - left - 4; host.style.setProperty('--col', Math.max(COL_MIN, Math.min(max, w)) + 'px'); };
    const up = () => {
      removeEventListener('pointermove', move); removeEventListener('pointerup', up);
      stage.classList.remove('is-resizing'); document.body.style.cursor = '';
      if (w !== null && w < 200) { onCommit(0); onHide(); return; }
      if (w !== null) onCommit(Math.max(COL_MIN, Math.min(max, w)));
    };
    addEventListener('pointermove', move); addEventListener('pointerup', up); e.preventDefault();
  };
  return html`<span class="pr-resize" role="separator" aria-orientation="vertical" aria-label="Resize tasks" title="Drag to resize"
    onPointerDown=${down} onDblClick=${() => onCommit(0)}></span>`;
}

// ------------------------------------------------------------ app
let seq = 0;
function App() {
  const { path: rawPath, params, nav } = useHashState();
  // Solo vista: en esta entrega no se abre ni se crea una task (la lista, las pestañas y el buscador siguen funcionando).
  const path = VIEW_ONLY ? '' : rawPath;
  const [tasks, setTasks] = useState(() => (params.empty ? [] : SEED));
  const [drafts, setDrafts] = useState({});
  const [newDraft, setNewDraft] = useState(null);
  const [q, setQ] = useState(params.q || '');
  const [status, setStatus] = useState(params.status || 'all');
  const [running, setRunning] = useState(params.running ? path : null);
  const [fresh, setFresh] = useState(null);
  const [del, setDel] = useState(null);
  const [toast, setToast] = useState(null);
  const host = useRef();
  const split = splitParam();
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(null), 1700); return () => clearTimeout(x); }, [toast]);
  useEffect(() => { if (!fresh) return; const x = setTimeout(() => setFresh(null), 1600); return () => clearTimeout(x); }, [fresh]);
  // Ancho de la lista: la mitad (el panel toma la otra mitad), salvo que la persona lo haya arrastrado.
  const colRef = useRef(storedCol());
  useLayoutEffect(() => {
    const el = host.current; if (!el) return;
    const fit = () => el.style.setProperty('--col', (colRef.current ? Math.min(colRef.current, el.clientWidth - 480) : Math.round(el.clientWidth / 2 - 4)) + 'px');
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  const commitCol = (w) => { colRef.current = w; try { w ? localStorage.setItem('tf-col-half', w) : localStorage.removeItem('tf-col-half'); } catch {} host.current.style.setProperty('--col', (w || Math.round(host.current.clientWidth / 2 - 4)) + 'px'); };

  const isNew = path === 'new';
  const current = !isNew && path ? tasks.find((t) => t.id === path) : null;
  const mode = isNew || current ? (params.wide ? 'wide' : 'split') : 'full';
  const compact = mode !== 'full';
  const { wide, ...rest } = params;
  const pageKey = path + JSON.stringify(rest);
  const items = tasks.map((t) => drafts[t.id] || t);
  const isDirty = (id) => changes(drafts[id], tasks.find((t) => t.id === id)) > 0;

  // Orden: activas por próxima ejecución, pausadas al final.
  const sorted = [...items].sort((a, b) => { const x = nextOf(a), y = nextOf(b); return (x ? x.getTime() : 9e15) - (y ? y.getTime() : 9e15); });
  const counts = { all: items.length, active: items.filter((t) => t.status === 'active').length, paused: items.filter((t) => t.status === 'paused').length };
  const shown = sorted.filter((t) => (status === 'all' || t.status === status) && (!q.trim() || (t.name + ' ' + t.instructions).toLowerCase().includes(q.trim().toLowerCase())));

  const go = (p, qp = {}) => {
    if (VIEW_ONLY && p) return;
    if (compact && p && p !== path) ghost(document.querySelector('.pr-pane-inner > .pr-scroll'), 200);
    // Al abrir o cerrar, la fila elegida se queda donde estaba aunque el bloque de Magnar se pliegue
    if (!p !== !compact) { ghost(document.querySelector('.pr-lib .pr-scroll'), 200); const id = p && p !== 'new' ? p : path; if (id && id !== 'new') holdAnchor(`.tf-li[data-tid="${id}"]`); }
    nav(p, qp);
  };
  const upd = (id, fn) => setTasks((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  const runNow = (t) => {
    const at = new Date(); setRunning(t.id); upd(t.id, (x) => ({ ...x, runs: [{ at, status: 'Running' }, ...x.runs] }));
    setTimeout(() => { setRunning(null); upd(t.id, (x) => ({ ...x, runs: x.runs.map((r) => (r.at === at ? { ...r, status: 'Completed' } : r)), unread: true })); setToast('Run completed'); }, 2400);
  };
  const togglePause = (t) => {
    const next = t.status === 'paused' ? 'active' : 'paused';
    upd(t.id, (x) => ({ ...x, status: next })); setDrafts((d) => (d[t.id] ? { ...d, [t.id]: { ...d[t.id], status: next } } : d));
    setToast(next === 'active' ? 'Task resumed' : 'Task paused');
  };
  const save = (id) => { const d = drafts[id]; if (!d) return; upd(id, () => d); setDrafts(({ [id]: _, ...r }) => r); setToast('Changes saved'); };
  const discard = (id) => setDrafts(({ [id]: _, ...r }) => r);
  const update = (id) => (fn) => setDrafts((d) => ({ ...d, [id]: fn(d[id] || tasks.find((t) => t.id === id)) }));
  const addTask = (f) => { const id = 'task-' + (++seq); setTasks((ts) => [...ts, { ...base, ...f, id, status: 'active', unread: false, runs: [] }]); setFresh(id); setStatus('all'); return id; };
  const menu = (t) => html`<${MenuButton} align="end" width=${180} items=${[
      { key: 'open', label: 'Open', lead: html`<${Icon} name="ArrowRight" />` }, { key: 'run', label: 'Run now', lead: html`<${Icon} name="Play" />` },
      { key: 'pause', label: t.status === 'paused' ? 'Resume' : 'Pause', lead: html`<${Icon} name=${t.status === 'paused' ? 'Play' : 'Pause'} />` }, 'sep',
      { key: 'delete', label: 'Delete task', danger: true, lead: html`<${Icon} name="Trash" />` }]}
    onSelect=${(k) => (k === 'open' ? go(t.id) : k === 'run' ? runNow(t) : k === 'pause' ? togglePause(t) : setDel(t))}
    trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" aria-label=${'More actions for ' + t.name}><${Icon} name="DotsThree" /></button>`} />`;

  // Demo: 2 cambios sin guardar en la task abierta
  useEffect(() => { if (current && params.dirty) update(current.id)((d) => ({ ...d, instructions: d.instructions.replace(/\.$/, ' y marca los urgentes.'), schedule: { ...d.schedule, time: '08:30' } })); }, [pageKey]);
  useEffect(() => { if (isNew) setNewDraft(params.demo ? { ...blank(), name: 'Resumen semanal', instructions: 'Haz un resumen de los contratos que revisamos esta semana.', schedule: sch({ repeat: 'weekly', days: [5], time: '17:00' }) } : (newDraft || blank())); }, [isNew]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape' && compact && !document.querySelector('.pb-menu') && !e.target.closest?.('textarea, input')) go('');
      if ((e.metaKey || e.ctrlKey) && e.key === '\\' && compact) { e.preventDefault(); nav(path, { ...rest, wide: mode === 'wide' ? undefined : 1 }); }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && current) { e.preventDefault(); save(current.id); }
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [mode, path, drafts]);

  let pane = null;
  const back = html`<button type="button" class="pr-back" style="margin-bottom:16px" onClick=${() => go('')}><${Icon} name="ArrowLeft" />Scheduled tasks</button>`;
  if (isNew && newDraft) pane = html`<${TaskPane} key="new" isNew draft=${newDraft} update=${(fn) => setNewDraft((d) => fn(d))} back=${back} close=${() => { setNewDraft(null); go(''); }}
    onCreate=${() => { const id = addTask(newDraft); setNewDraft(null); setToast('Task created'); go(id); }} />`;
  else if (current) pane = html`<${TaskPane} key=${current.id} t=${current} draft=${drafts[current.id] || current} update=${update(current.id)} running=${running === current.id} back=${back}
    close=${() => go('')} onRun=${() => runNow(current)} onPause=${() => togglePause(drafts[current.id] || current)} onDelete=${() => setDel(current)} />`;
  const count = current ? changes(drafts[current.id], current) : 0;

  const newBtn = (sm) => html`<button type="button" class=${cx('pb-btn pb-btn-primary', sm && 'sm')} onClick=${() => { setNewDraft(null); go('new'); }}><${Icon} name="Plus" />New task</button>`;
  const body = tasks.length === 0
    ? html`<${EmptyState} kind="task" title="No scheduled tasks yet" text="Tasks run instructions on a schedule and report back in a conversation." action=${newBtn(false)} />`
    : html`
      <div class="tf-sticky"><${StatusTabs} value=${status} onChange=${setStatus} counts=${counts}
        trailing=${!compact && html`<div class="tf-tools"><${SearchBox} value=${q} onInput=${setQ} placeholder="Search tasks" width="240px" />${newBtn(false)}</div>`} /></div>
      <div class=${cx('tf-colsearch-wrap', compact && 'is-on')} inert=${!compact}><div><div class="tf-colsearch"><${SearchBox} value=${q} onInput=${setQ} placeholder="Search tasks" width="100%" /></div></div></div>
      ${shown.length ? html`<div class="tf-table">
          <div class="pr-thead" aria-hidden="true"><span class="nm">Name</span><span>Frequency</span><span>Next run</span><span class="st">Status</span><span></span><span></span></div>
          <div class="pr-list">${shown.map((t) => html`<${TaskRow} key=${t.id} t=${t} selected=${t.id === current?.id} running=${running === t.id} fresh=${fresh === t.id} dirty=${isDirty(t.id)} go=${go} menu=${menu} />`)}</div>
        </div>`
        : html`<p class="pr-noresults">${q.trim() ? html`No tasks match “${q.trim()}”` : status === 'paused' ? 'No paused tasks' : 'No active tasks'}<button type="button" class="pb-link" style="text-decoration:underline;text-underline-offset:3px" onClick=${() => { setQ(''); setStatus('all'); }}>Show all tasks</button></p>`}`;

  return html`<${Frame} split=${split} activeApp="tasks" links=${SIDEBAR_LINKS} tab=${{ title: 'Scheduled tasks', icon: 'Clock' }}
      tabs=${split ? undefined : [{ title: 'Ley del trabajador', icon: 'ChatCircle' }, { title: 'Scheduled tasks', icon: 'Clock', active: true }]}>
    <div class="pb pr-host is-list tf-host" ref=${host}><div class="pr-stage" data-mode=${mode}>
      <section class="pr-lib" aria-label="Scheduled tasks">
        <div class="pr-scroll"><div class="pr-lib-inner"><div class="pr-lib-pad">
          <div class="pr-khead"><h1 class="pb-section">Scheduled tasks</h1>
            ${!compact && html`<${Tip} label="Tasks run on their own and report back in a conversation"><button type="button" class="pb-icon-btn sm" aria-label="About scheduled tasks"><${Icon} name="Info" /></button><//>`}
            <span class="grow"></span>${compact && tasks.length > 0 && newBtn(true)}</div>
          <${Ask} compact=${compact} />
          ${body}
        </div></div></div>
      </section>
      ${pane && html`<main class="pr-pane">
        ${mode === 'split' && html`<${Resizer} hostRef=${host} onHide=${() => nav(path, { ...rest, wide: 1 })} onCommit=${commitCol} />`}
        <span class="pr-grip"><${Tip} side="right" label=${mode === 'wide' ? 'Show tasks' : 'Hide tasks'} kbd="⌘\\">
          <button type="button" aria-label=${mode === 'wide' ? 'Show tasks' : 'Hide tasks'} onClick=${() => nav(path, { ...rest, wide: mode === 'wide' ? undefined : 1 })}>
            <${Icon} name=${mode === 'wide' ? 'CaretRight' : 'CaretLeft'} /></button><//></span>
        <div class="pr-pane-clip"><div class="pr-pane-inner">
          <span class="pr-close"><${Tip} label="Close"><button type="button" class="pb-icon-btn sm" aria-label="Close" onClick=${() => go('')}><${Icon} name="X" /></button><//></span>
          ${pane}
          ${current && html`<${SaveBar} count=${count} saved=${!!toast && !count} message=${toast} onDiscard=${() => discard(current.id)} onSave=${() => save(current.id)} />`}
        </div></div>
      </main>`}
      ${!current && toast && html`<div class="pr-toast" role="status"><${Icon} name="CheckCircle" />${toast}</div>`}
    </div></div>
    <${AlertDialog} open=${!!del} onClose=${() => setDel(null)} title="Delete this task?"
      description=${del ? `“${del.name}” will stop running and its history will be deleted. This can’t be undone.` : ''}
      actionLabel="Delete" onAction=${() => { const id = del.id; setDel(null); setTasks((ts) => ts.filter((t) => t.id !== id)); discard(id); setToast('Task deleted'); if (path === id) go(''); }} />
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
