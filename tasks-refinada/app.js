// Scheduled tasks · rediseño (agenda + panel), con los mismos estilos que Playbooks.
// Solo lo que Magnar ya tiene: nombre, instrucciones, conversación, proyecto, agent tier, agenda (con "AI"),
// próximas ejecuciones, canales de notificación, Run now / Pause / Delete, historial y "Unread result".
//
// Estados por URL:
//   #/                 agenda + primera tarea      ?empty=1 vacía · ?status=paused · ?q=…
//   #/<id>             agenda + esa tarea          ?running=1 ejecutándose
//   #/new              crear en el panel           ?demo=1 con datos · ?ai=1 con el cuadro "AI" abierto
//   #/<id>?edit=1      editar en el panel
//   ?split=50 (antes del #) vista dividida · ?v=b (antes del #) enlaza a Playbooks versión B
import { html, render, useState, useEffect } from '../vendor/preact-htm.js';
import { Icon } from '../shared/icons.js';
import { AlertDialog } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { splitParam } from '../shared/playbooks-seed.js';
import { useHashState } from '../shared/redesign-ui.js';
import { cx, Tip, MenuButton, SearchBox, ghost } from '../shared/pb-kit.js';
import { EmptyState, SIDEBAR_LINKS } from '../shared/pr-ui.js';
import { WEEKDAYS, defaultSchedule, fmtTime, summary, nextRuns, tzOffset, parseNatural } from '../tasks/schedule.js';

// ------------------------------------------------------------ datos de muestra (simples a propósito)
const sch = (p) => ({ ...defaultSchedule(), tz: 'America/Santiago', ...p });
const ago = (days, h = 9) => { const d = new Date(); d.setDate(d.getDate() - days); d.setHours(h, 0, 0, 0); return d; };
const SEED = [
  { id: 'contratos-nuevos', name: 'Resumen de contratos nuevos', status: 'active', instructions: 'Revisa los contratos que se subieron esta semana y haz un resumen corto de cada uno.',
    schedule: sch({ repeat: 'weekly', days: [1], time: '09:00' }), conversation: 'new', project: 'Clientes', tier: 'auto', push: true, email: true, unread: true,
    runs: [{ at: ago(7), status: 'Completed' }, { at: ago(14), status: 'Completed' }, { at: ago(21), status: 'Failed' }, { at: ago(28), status: 'Completed' }] },
  { id: 'noticias', name: 'Noticias legales del día', status: 'active', instructions: 'Resume las noticias legales más importantes del día en cinco puntos.',
    schedule: sch({ repeat: 'daily', time: '08:00' }), conversation: 'existing', conversationId: 'c1', project: '', tier: 'mid', push: true, email: false,
    runs: [1, 2, 3, 4, 5, 6].map((d) => ({ at: ago(d, 8), status: d === 4 ? 'Failed' : 'Completed' })) },
  { id: 'vencimientos', name: 'Contratos por vencer', status: 'active', instructions: 'Avísame qué contratos vencen en los próximos 30 días.',
    schedule: sch({ repeat: 'weekly', days: [5], time: '17:00' }), conversation: 'new', project: '', tier: 'auto', push: false, email: true,
    runs: [{ at: ago(3, 17), status: 'Completed' }, { at: ago(10, 17), status: 'Completed' }] },
  { id: 'nda-pendientes', name: 'NDA pendientes', status: 'active', instructions: 'Revisa los NDA que quedaron sin firmar y dime cuáles siguen pendientes.',
    schedule: sch({ repeat: 'weekly', days: [3], time: '11:30' }), conversation: 'new', project: 'Clientes', tier: 'auto', push: true, email: false,
    runs: [{ at: ago(5, 11), status: 'Completed' }] },
  { id: 'reporte-mensual', name: 'Reporte del mes', status: 'paused', instructions: 'Haz un resumen de los contratos que revisamos este mes.',
    schedule: sch({ repeat: 'monthly', monthOn: 'last day', time: '18:00' }), conversation: 'new', project: '', tier: 'high', push: false, email: true,
    runs: [{ at: ago(9, 18), status: 'Completed' }] },
];
const REPEAT = [['once', 'Once'], ['interval', 'At an interval'], ['daily', 'Every day'], ['weekly', 'Every week'], ['monthly', 'Every month'], ['custom', 'Custom']].map(([key, label]) => ({ key, label }));
const TIMES = Array.from({ length: 48 }, (_, i) => { const v = String(Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00'); return { key: v, label: fmtTime(v) }; });
const ZONES = ['America/Santiago', 'America/Lima', 'America/Bogota', 'America/Mexico_City', 'America/Argentina/Buenos_Aires'].map((z) => ({ key: z, label: z, count: tzOffset(z) }));
const CONV = [{ key: 'new', label: 'New conversation each run' }, { key: 'existing', label: 'Existing conversation' }];
const CONVERSATIONS = [{ key: 'c1', label: 'Ley del trabajador' }, { key: 'c2', label: 'Revisión de NDA' }];
const PROJECTS = [{ key: '', label: 'No project' }, { key: 'Clientes', label: 'Clientes' }];
const TIERS = [['auto', 'Auto'], ['low', 'Low'], ['mid', 'Mid'], ['high', 'High']].map(([key, label]) => ({ key, label }));
const lbl = (opts, k) => opts.find((o) => o.key === (k ?? ''))?.label;
const city = (tz) => tz.split('/').pop().replace(/_/g, ' ');
const schedLine = (s) => summary(s).replace(/^Every week · /, 'Every ');
const blank = () => ({ name: '', instructions: '', conversation: 'new', conversationId: 'c1', project: '', tier: 'auto', schedule: sch({}), push: true, email: true });

// fechas
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayDiff = (d) => Math.round((sod(d) - sod(new Date())) / 864e5);
const dayLabel = (d) => {
  const n = dayDiff(d), base = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  return n === 0 ? ['Today', base] : n === 1 ? ['Tomorrow', base] : [base, ''];
};
const t12 = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const rel = (d) => { const h = (d - new Date()) / 36e5; if (h < 1) return `in ${Math.max(1, Math.round(h * 60))} min`; if (h < 24) return `in ${Math.round(h)} h`; const n = dayDiff(d); return n === 1 ? 'tomorrow' : `in ${n} days`; };
const countdown = (d) => { const ms = d - new Date(), h = Math.floor(ms / 36e5), m = Math.round((ms % 36e5) / 6e4); return h >= 48 ? [[Math.round(h / 24), 'days']] : [[h, 'h'], [m, 'min']]; };
const fmtRunAt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + t12(d);

// ------------------------------------------------------------ agenda
function Run({ t, at, selected, go, paused }) {
  return html`<div class=${cx('tk-run', selected && 'is-on', paused && 'is-paused')} role="link" tabindex="0" aria-current=${selected ? 'true' : undefined}
    onClick=${() => go(t.id)} onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); go(t.id); } }}>
    <span class="tm num">${at ? t12(at) : '—'}</span>
    <span class="main"><span class="nm"><span>${t.name}</span>${t.unread && html`<span class="tk-unread">Unread result</span>`}</span>
      <span class="sub num">${schedLine(t.schedule)}${t.project && html`<span class="sep">·</span>${t.project}`}</span></span>
    <span class="rt num">${paused ? 'Paused' : rel(at)}</span>
  </div>`;
}
function Agenda({ tasks, selectedId, go }) {
  const runs = tasks.filter((t) => t.status === 'active')
    .flatMap((t) => nextRuns(t.schedule, 10).filter((d) => dayDiff(d) <= 7).map((at) => ({ t, at })))
    .sort((a, b) => a.at - b.at);
  const days = []; for (const r of runs) { const k = sod(r.at).getTime(); const g = days.find((x) => x.k === k); g ? g.runs.push(r) : days.push({ k, at: r.at, runs: [r] }); }
  const paused = tasks.filter((t) => t.status === 'paused');
  // Al elegir una tarea se resalta su próxima ejecución, no todas sus repeticiones.
  const firstOf = new Map(); runs.forEach((r) => { if (!firstOf.has(r.t.id)) firstOf.set(r.t.id, r.at); });
  return html`<div class="tk-agenda">
    ${days.map((g) => { const [a, b] = dayLabel(g.at); return html`<section class="tk-day" key=${g.k}>
      <h3 class="tk-day-h"><b>${a}</b>${b && html`<span>${b}</span>`}<span class="c num">${g.runs.length}</span></h3>
      ${g.runs.map((r) => html`<${Run} key=${r.t.id + r.at} t=${r.t} at=${r.at} go=${go} selected=${r.t.id === selectedId && firstOf.get(r.t.id) === r.at} />`)}
    </section>`; })}
    ${!days.length && html`<p class="tk-none">No runs in the next 8 days.</p>`}
    ${paused.length > 0 && html`<section class="tk-day is-paused">
      <h3 class="tk-day-h"><b>Paused</b><span class="c num">${paused.length}</span></h3>
      ${paused.map((t) => html`<${Run} key=${t.id} t=${t} paused go=${go} selected=${t.id === selectedId} />`)}
    </section>`}
  </div>`;
}

// ------------------------------------------------------------ panel: tarea elegida
function History({ runs }) {
  const last = runs.slice(0, 12).reverse();
  return html`<div class="tk-hist">
    <div class="bars">${last.map((r) => html`<i class=${r.status === 'Failed' ? 'is-fail' : r.status === 'Running' ? 'is-run' : ''} title=${fmtRunAt(r.at) + ' · ' + r.status}></i>`)}</div>
    <ol>${runs.slice(0, 3).map((r) => html`<li><span class="num">${fmtRunAt(r.at)}</span>
      <span class=${cx('tk-st', r.status === 'Failed' && 'is-fail', r.status === 'Running' && 'is-run')}><i></i>${r.status}</span></li>`)}</ol>
  </div>`;
}
function TaskPanel({ t, running, onRun, onPause, onEdit, onDelete, onClose }) {
  const n = t.status === 'paused' ? null : nextRuns(t.schedule, 1)[0];
  return html`<div class="tk-panel-in pr-enter" key=${t.id}>
    <div>
      <div class="tk-p-top">
        <span class=${cx('tk-st', t.status === 'paused' && 'is-paused', running && 'is-run')}><i></i>${running ? 'Running' : t.status === 'paused' ? 'Paused' : 'Active'}</span>
        <span class="grow"></span>
        <${MenuButton} align="end" width=${180} items=${[{ key: 'edit', label: 'Edit', lead: html`<${Icon} name="PencilSimple" />` }, 'sep', { key: 'delete', label: 'Delete task', danger: true, lead: html`<${Icon} name="Trash" />` }]}
          onSelect=${(k) => (k === 'edit' ? onEdit() : onDelete())}
          trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" aria-label="Task options"><${Icon} name="DotsThree" /></button>`} />
        <button type="button" class="pb-icon-btn sm tk-close" aria-label="Close" onClick=${onClose}><${Icon} name="X" /></button>
      </div>
      <h2 class="tk-title">${t.name}</h2>
      <div class="pr-props"><span class="pr-prop is-static"><${Icon} name="Clock" />${schedLine(t.schedule)}</span><span class="sep">·</span><span class="pr-prop is-static">${city(t.schedule.tz)}</span></div>
      <div class="tk-actions">
        <button type="button" class="pb-btn pb-btn-secondary sm" disabled=${running} onClick=${onRun}><${Icon} name="Play" />Run now</button>
        <button type="button" class="pb-btn pb-btn-secondary sm" onClick=${onPause}><${Icon} name=${t.status === 'paused' ? 'Play' : 'Pause'} />${t.status === 'paused' ? 'Resume' : 'Pause'}</button>
        <span class="grow"></span>
        <button type="button" class="pb-btn pb-btn-ghost sm" onClick=${onEdit}><${Icon} name="PencilSimple" />Edit</button>
      </div>
    </div>
    <section class="tk-next">
      <h4 class="pb-eyebrow">Next run</h4>
      ${n ? html`<p class="big num">${countdown(n).map(([v, u]) => html`${v}<small>${u}</small> `)}</p><p class="when num">${n.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} · ${t12(n)}</p>`
        : html`<p class="big is-muted">Paused</p><p class="when">Resume it to schedule the next run.</p>`}
    </section>
    <section><h4 class="pb-eyebrow">Instructions</h4><p class="tk-instr">${t.instructions}</p></section>
    <section><dl class="tk-dl">
      <dt>Conversation</dt><dd>${t.conversation === 'new' ? 'New each run' : lbl(CONVERSATIONS, t.conversationId)}</dd>
      <dt>Project</dt><dd>${t.project || 'No project'}</dd>
      <dt>Agent tier</dt><dd>${lbl(TIERS, t.tier)}</dd>
      <dt>Notifications</dt><dd>${[t.push && 'Push', t.email && 'Email'].filter(Boolean).join(', ') || 'None'}</dd>
    </dl></section>
    <section><h4 class="pb-eyebrow">Run history${t.unread && html` <span class="tk-unread">Unread result</span>`}</h4>
      ${t.runs.length ? html`<${History} runs=${t.runs} />` : html`<p class="tk-none">No runs yet</p>`}</section>
  </div>`;
}

// ------------------------------------------------------------ panel: crear / editar (mismos campos que Magnar)
const Field = ({ label, id, children }) => html`<div class="tk-field"><label class="pr-flabel" for=${id}>${label}</label>${children}</div>`;
function Pick({ id, value, options, onChange, icon, width = 220, wide }) {
  const o = options.find((x) => x.key === value) || options[0];
  return html`<${MenuButton} items=${options} selected=${[value]} width=${width} onSelect=${onChange} cls=${options.length > 8 ? 'tr-scroll' : undefined}
    trigger=${(p) => html`<button id=${id} type="button" ...${p} class=${cx('tk-select', wide && 'is-wide')}>${icon && html`<${Icon} name=${icon} />`}<span>${o.label}</span>${o.count && html`<span class="off">${o.count}</span>`}<${Icon} name="CaretDown" class="chev" /></button>`} />`;
}
function TaskForm({ initial, isNew, onCancel, onSave, aiOpen }) {
  const [f, setF] = useState(initial);
  const [ai, setAi] = useState(!!aiOpen);
  const [aiText, setAiText] = useState(aiOpen ? 'Todos los viernes a las 9' : '');
  const set = (p) => setF({ ...f, ...p });
  const s = f.schedule; const setS = (p) => set({ schedule: { ...s, ...p } });
  const runs = nextRuns(s, 5);
  const ok = f.name.trim() && f.instructions.trim();
  const generate = () => { const r = parseNatural(aiText, s); if (r) setS(r); setAi(false); };
  return html`<div class="tk-form pr-enter">
    <div class="tk-form-scroll">
      <div class="tk-p-top"><h2 class="tk-form-h">${isNew ? 'New task' : 'Edit task'}</h2><span class="grow"></span>
        <button type="button" class="pb-icon-btn sm" aria-label="Close" onClick=${onCancel}><${Icon} name="X" /></button></div>
      <${Field} label="Name" id="t-name"><input id="t-name" class="pr-filled" placeholder="e.g. Resumen semanal" value=${f.name} onInput=${(e) => set({ name: e.target.value })} /><//>
      <${Field} label="Instructions" id="t-ins"><textarea id="t-ins" class="pr-filled" rows="3" placeholder="What should Magnar do each time it runs?" value=${f.instructions} onInput=${(e) => set({ instructions: e.target.value })}></textarea><//>
      <div class="tk-grid2">
        <${Field} label="Conversation" id="t-conv"><${Pick} id="t-conv" value=${f.conversation} options=${CONV} onChange=${(v) => set({ conversation: v })} wide /><//>
        ${f.conversation === 'existing' && html`<${Field} label="Select a conversation" id="t-cid"><${Pick} id="t-cid" value=${f.conversationId} options=${CONVERSATIONS} onChange=${(v) => set({ conversationId: v })} wide /><//>`}
        <${Field} label="Project" id="t-proj"><${Pick} id="t-proj" value=${f.project} options=${PROJECTS} onChange=${(v) => set({ project: v })} icon="Briefcase" wide /><//>
        <${Field} label="Agent tier" id="t-tier"><${Pick} id="t-tier" value=${f.tier} options=${TIERS} onChange=${(v) => set({ tier: v })} width=${160} /><//>
      </div>
      <h3 class="tk-sec-h">Schedule</h3>
      <div class="tk-sched">
        <span class="k">Repeat</span><div class="v"><${Pick} value=${s.repeat} options=${REPEAT} onChange=${(v) => setS({ repeat: v })} />
          <span class="tk-ai-wrap"><button type="button" class=${cx('tk-select', ai && 'is-on')} aria-expanded=${ai} onClick=${() => setAi(!ai)}><${Icon} name="ChatCircleDots" /><span>AI</span></button>
          ${ai && html`<div class="pb-menu tk-ai" role="dialog" aria-label="Describe when it should run">
            <label class="pr-flabel" for="t-ai">Describe when it should run</label>
            <input id="t-ai" class="pr-filled" placeholder="E.g. the last Friday of every month at 6 pm" value=${aiText} onInput=${(e) => setAiText(e.target.value)} onKeyDown=${(e) => e.key === 'Enter' && generate()} />
            <div class="tk-ai-foot"><button type="button" class="pb-btn pb-btn-primary sm" disabled=${!aiText.trim()} onClick=${generate}>Generate</button></div>
          </div>`}</span></div>
        ${s.repeat === 'weekly' && html`<span class="k">Days</span><div class="v tk-days">${WEEKDAYS.map((w) => html`<button type="button" class="tk-day-btn" aria-pressed=${s.days.includes(w.v)}
          onClick=${() => setS({ days: s.days.includes(w.v) ? (s.days.length > 1 ? s.days.filter((x) => x !== w.v) : s.days) : [...s.days, w.v] })}>${w.short}</button>`)}</div>`}
        ${s.repeat !== 'interval' && html`<span class="k">Time</span><div class="v"><${Pick} value=${s.time} options=${TIMES} onChange=${(v) => setS({ time: v })} icon="Clock" width=${140} />
          <${Pick} value=${s.tz} options=${ZONES} onChange=${(v) => setS({ tz: v })} icon="Globe" width=${300} /></div>`}
      </div>
      <div class="tk-runs"><p class="s num">${summary(s)}</p>${runs.length > 0 && html`<p class="h">Next runs</p><ul class="num">${runs.map((d) => html`<li>${fmtRunAt(d)}</li>`)}</ul>`}</div>
      <h3 class="tk-sec-h">Notification channels</h3>
      <div class="tr-checks">
        <label class="tr-check"><input type="checkbox" checked=${f.push} onChange=${(e) => set({ push: e.target.checked })} />Push</label>
        <label class="tr-check"><input type="checkbox" checked=${f.email} onChange=${(e) => set({ email: e.target.checked })} />Email</label>
      </div>
      <p class="tk-hint">These channels are used only when the agent requests an update, following your instructions.</p>
    </div>
    <div class="pr-foot">
      <button type="button" class="pb-btn pb-btn-secondary" onClick=${onCancel}>Cancel</button>
      ${ok ? html`<button type="button" class="pb-btn pb-btn-primary" onClick=${() => onSave(f)}>${isNew ? 'Create' : 'Save'}</button>`
        : html`<${Tip} label="Add a name and instructions" side="top"><button type="button" class="pb-btn pb-btn-primary" disabled>${isNew ? 'Create' : 'Save'}</button><//>`}
    </div>
  </div>`;
}

// ------------------------------------------------------------ app
let seq = 0;
function App() {
  const { path, params, nav } = useHashState();
  const [tasks, setTasks] = useState(() => (params.empty ? [] : SEED));
  const [q, setQ] = useState(params.q || '');
  const [status, setStatus] = useState(params.status || 'all');
  const [running, setRunning] = useState(params.running ? path : null);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState(null);
  const split = splitParam();
  useEffect(() => { if (!toast) return; const x = setTimeout(() => setToast(null), 1700); return () => clearTimeout(x); }, [toast]);

  const shown = tasks.filter((t) => (status === 'all' || t.status === status) && (!q.trim() || (t.name + ' ' + t.instructions).toLowerCase().includes(q.trim().toLowerCase())));
  const isNew = path === 'new';
  const firstUpcoming = () => shown.filter((t) => t.status === 'active').map((t) => ({ t, at: nextRuns(t.schedule, 1)[0] })).filter((x) => x.at).sort((a, b) => a.at - b.at)[0]?.t || shown[0];
  const sel = isNew ? null : tasks.find((t) => t.id === path) || (path ? null : firstUpcoming());
  const editing = !!(sel && params.edit);
  const mode = isNew || editing ? 'form' : sel ? 'task' : 'none';
  // Cambiar de tarea o pasar a editar: lo anterior se desvanece encima mientras lo nuevo entra.
  const go = (id, p = {}) => { if (id !== (sel?.id || path) || !!p.edit !== !!params.edit) ghost(document.querySelector('.tk-panel > *'), 160); nav(id, p); };

  const upd = (id, fn) => setTasks((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));
  const runNow = (t) => {
    const at = new Date(); setRunning(t.id); upd(t.id, (x) => ({ ...x, runs: [{ at, status: 'Running' }, ...x.runs] }));
    setTimeout(() => { setRunning(null); upd(t.id, (x) => ({ ...x, runs: x.runs.map((r) => (r.at === at ? { ...r, status: 'Completed' } : r)), unread: true })); setToast('Run completed'); }, 2400);
  };
  const save = (f) => {
    if (isNew) { const id = 'task-' + (++seq); setTasks((ts) => [...ts, { ...f, id, status: 'active', runs: [] }]); setToast('Task created'); nav(id); }
    else { upd(sel.id, (t) => ({ ...t, ...f })); setToast('Changes saved'); nav(sel.id); }
  };
  useEffect(() => {
    const key = (e) => { if (e.key === 'Escape' && mode === 'form' && !document.querySelector('.pb-menu')) nav(sel ? sel.id : ''); };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, [mode, path]);

  const seg = html`<div class="tk-seg" role="group" aria-label="Status">${[['all', 'All'], ['active', 'Active'], ['paused', 'Paused']].map(([k, l]) => html`<button type="button" aria-pressed=${status === k} onClick=${() => setStatus(k)}>${l}</button>`)}</div>`;
  const newBtn = html`<button type="button" class="pb-btn pb-btn-primary" onClick=${() => go('new')}><${Icon} name="Plus" />New task</button>`;
  let panel = null;
  if (mode === 'form') panel = html`<${TaskForm} key=${isNew ? 'new' : sel.id + '-edit'} isNew=${isNew} aiOpen=${!!params.ai}
    initial=${isNew ? (params.demo ? { ...blank(), name: 'Resumen semanal', instructions: 'Haz un resumen de los contratos que revisamos esta semana.', schedule: sch({ repeat: 'weekly', days: [5], time: '09:00' }) } : blank())
      : { name: sel.name, instructions: sel.instructions, conversation: sel.conversation, conversationId: sel.conversationId || 'c1', project: sel.project, tier: sel.tier, schedule: sel.schedule, push: sel.push, email: sel.email }}
    onCancel=${() => go(sel ? sel.id : '')} onSave=${save} />`;
  else if (mode === 'task') panel = html`<${TaskPanel} t=${sel} running=${running === sel.id} onRun=${() => runNow(sel)}
    onPause=${() => { upd(sel.id, (t) => ({ ...t, status: t.status === 'paused' ? 'active' : 'paused' })); setToast(sel.status === 'paused' ? 'Task resumed' : 'Task paused'); }}
    onEdit=${() => go(sel.id, { edit: 1 })} onDelete=${() => setConfirm(true)} onClose=${() => go('')} />`;

  return html`<${Frame} split=${split} activeApp="tasks" links=${SIDEBAR_LINKS} tab=${{ title: 'Scheduled tasks', icon: 'Clock' }}
      tabs=${split ? undefined : [{ title: 'Ley del trabajador', icon: 'ChatCircle' }, { title: 'Scheduled tasks', icon: 'Clock', active: true }]}>
    <div class="pb pr-host tk-host"><div class="tk-sheet" data-mode=${mode} data-explicit=${path ? 'true' : 'false'}>
      <div class="tk-main pr-scroll"><div class="tk-main-in">
        <header class="tk-head">
          <h1 class="pb-section">Scheduled tasks</h1>
          <${Tip} label="Tasks run on their own and report back in a conversation"><button type="button" class="pb-icon-btn sm" aria-label="About scheduled tasks"><${Icon} name="Info" /></button><//>
          <span class="grow"></span>
          <a class="tk-hint-pill" href="#/" onClick=${(e) => e.preventDefault()}><${Icon} name="ChatCircle" />Prefer to describe it? Ask Magnar in a new conversation<${Icon} name="ArrowRight" /></a>
        </header>
        ${tasks.length === 0 ? html`<${EmptyState} kind="task" title="No scheduled tasks yet" text="Tasks run instructions on a schedule and report back in a conversation." action=${newBtn} />`
          : html`<div class="tk-toolbar"><${SearchBox} value=${q} onInput=${setQ} placeholder="Search tasks" />${seg}<span class="grow"></span>${newBtn}</div>
            ${shown.length ? html`<${Agenda} tasks=${shown} selectedId=${sel?.id} go=${(id) => go(id)} />`
              : html`<p class="pr-noresults">No tasks match<button type="button" class="pb-link" style="text-decoration:underline;text-underline-offset:3px" onClick=${() => { setQ(''); setStatus('all'); }}>Clear filters</button></p>`}`}
      </div></div>
      ${panel && html`<aside class="tk-panel" aria-label=${mode === 'form' ? 'Task form' : 'Task'}>${panel}</aside>`}
      ${toast && html`<div class="pr-toast" role="status"><${Icon} name="CheckCircle" />${toast}</div>`}
    </div></div>
    <${AlertDialog} open=${confirm} onClose=${() => setConfirm(false)} title="Delete this task?"
      description=${sel ? `“${sel.name}” will stop running and its history will be deleted. This can’t be undone.` : ''}
      actionLabel="Delete" onAction=${() => { setConfirm(false); setTasks((ts) => ts.filter((t) => t.id !== sel.id)); setToast('Task deleted'); nav(''); }} />
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
