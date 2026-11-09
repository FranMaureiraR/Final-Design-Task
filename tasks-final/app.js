// Scheduled tasks · versión final.
// Home: arriba, al centro, la pregunta a Magnar ("What task do you want to set up?") con su composer, como el home de Magnar,
// e ideas en cards sacadas de tus tasks recientes. Abajo, pestañas All / Active / Paused con el buscador y "New task",
// y la tabla de Playbooks B. Al abrir o crear una task, la tabla pasa a columna y la task se abre en un panel de media pantalla.
// La task se lee como un plan de 4 pasos (When · Do · Where it runs · Notify), en cards como las reglas de un playbook.
// Solo usa los campos que Magnar ya tiene. Para el prototipo, el composer y el cuadro "AI" traen un texto fijo: solo se envía.
//
// Estados por URL:
//   #/                   home              ?empty=1 sin tasks · ?status=paused · ?q=…
//   #/?chat=schedule     chat preguntando cuándo · ?chat=notify preguntando cómo avisar · ?chat=draft con el plan listo
//   #/<id>               task abierta      ?step=when paso abierto · ?dirty=1 con 2 cambios sin guardar · ?running=1 · ?wide=1 sin la lista
//   #/new                crear             ?demo=1 con datos · ?ai=1 con el cuadro "AI" abierto
//   ?split=50 (antes del #) vista dividida · ?v=b (antes del #) el menú lleva a Playbooks versión B
import { html, render, useState, useEffect, useLayoutEffect, useRef } from '../vendor/preact-htm.js';
import { Icon } from '../shared/icons.js';
import { AlertDialog } from '../shared/ui.js';
import { Frame } from '../shared/split-shell.js';
import { splitParam } from '../shared/playbooks-seed.js';
import { useHashState } from '../shared/redesign-ui.js';
import { cx, Tip, MenuButton, SearchBox, ghost } from '../shared/pb-kit.js';
import { EmptyState, SaveBar, SIDEBAR_LINKS } from '../shared/pr-ui.js';
import { WEEKDAYS, defaultSchedule, fmtTime, summary, nextRuns, tzOffset, parseNatural } from '../tasks/schedule.js';

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
const STATUS_OPTS = [{ key: 'active', label: 'Active', lead: html`<span class="tk-st"><i></i></span>` }, { key: 'paused', label: 'Paused', lead: html`<span class="tk-st is-paused"><i></i></span>` }];
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
const whereLabel = (t) => [t.conversation === 'new' ? 'New conversation each run' : lbl(CONVERSATIONS, t.conversationId), t.project, lbl(TIERS, t.tier) + ' tier'].filter(Boolean).join(' · ');
const changes = (a, b) => (!a || !b ? 0 : FIELDS.filter((k) => a[k] !== b[k]).length + (JSON.stringify(a.schedule) !== JSON.stringify(b.schedule) ? 1 : 0));

// fechas
const sod = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const dayDiff = (d) => Math.round((sod(d) - sod(new Date())) / 864e5);
const t12 = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const nextLabel = (d) => { const n = dayDiff(d); return (n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })) + ' · ' + t12(d); };
const fmtRunAt = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' · ' + t12(d);
const nextOf = (t) => (t.status === 'paused' ? null : nextRuns(t.schedule, 1)[0] || null);

// ------------------------------------------------------------ chat: interpretar lo que escribe la persona
// Lo mismo que hace el botón "AI" de Magnar (parseNatural), más "weekdays" / "días hábiles".
const WHEN = /\b(every|each|daily|weekly|monthly|weekdays?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|tomorrow|cada|todos|todas|diari[oa]|semanal|mensual|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados?|domingos?|h[aá]biles)\b|\bat \d|\ba las \d|\d\s?(am|pm)\b/i;
function readSchedule(text) {
  if (!WHEN.test(text)) return null;
  const s = parseNatural(text, sch({}));
  if (/weekdays?|business days?|d[ií]as h[aá]biles|lunes a viernes|monday to friday/i.test(text)) { s.repeat = 'weekly'; s.days = [1, 2, 3, 4, 5]; }
  return s;
}
function readTask(text) {
  // Se separa el "cuándo" del "qué": "Todos los viernes a las 5, resume los NDA" → "Resume los NDA".
  const clean = text.trim().replace(/\s+/g, ' ');
  const parts = clean.split(/\s*[,;]\s*/).filter((p) => !WHEN.test(p));
  let body = (parts.join(', ') || clean)
    .split(/\s+(?:every|each|daily|weekly|monthly|on (?:mon|tue|wed|thu|fri|sat|sun)\w*|at \d|cada|todos los|todas las|a las \d|los (?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bados|domingos))\b/i)[0]
    .replace(/^(please|por favor|quiero que|i want you to|can you)\s+/i, '').replace(/[.,;:]+$/, '');
  if (body.length < 4) body = clean.replace(/[.,;:]+$/, '');
  body = body.charAt(0).toUpperCase() + body.slice(1);
  const name = body.length > 42 ? body.slice(0, 40).replace(/\s+\S*$/, '') + '…' : body;
  return { name, instructions: /[.!?]$/.test(body) ? body : body + '.' };
}
// Texto fijo que aparece al hacer click en el composer, según lo que Magnar está preguntando.
const FIXED = {
  idle: 'Todos los lunes a las 9, resume los contratos que se subieron la semana pasada',
  schedule: 'Every Monday at 9:00 AM',
  notify: 'Push',
  done: 'Cada viernes a las 5, avísame qué NDA siguen sin firmar',
};
// Ideas a partir de tus tasks recientes
const IDEAS = [
  { title: 'NDA firmados', from: 'NDA pendientes', text: 'Todos los viernes a las 5, resume los NDA que se firmaron en la semana' },
  { title: 'Vencen este mes', from: 'Contratos por vencer', text: 'El primer día de cada mes, dime qué contratos vencen ese mes' },
  { title: 'Novedades laborales', from: 'Cambios en la ley laboral', text: 'Cada lunes a las 8, resume los cambios en la ley laboral' },
];
// Nombre corto para los textos fijos (como lo haría Magnar)
const PRESET_NAMES = { [FIXED.idle]: 'Resumen de contratos nuevos', [FIXED.done]: 'NDA sin firmar', ...Object.fromEntries(IDEAS.map((x) => [x.text, x.title])) };
const WHEN_CHIPS = [
  { label: 'Every weekday at 9:00 AM', s: { repeat: 'weekly', days: [1, 2, 3, 4, 5], time: '09:00' } },
  { label: 'Every Monday at 9:00 AM', s: { repeat: 'weekly', days: [1], time: '09:00' } },
  { label: 'Every day at 8:00 AM', s: { repeat: 'daily', time: '08:00' } },
  { label: 'First day of every month', s: { repeat: 'monthly', monthOn: 'day', monthDay: 1, time: '09:00' } },
];
const NOTIFY_CHIPS = [
  { label: 'Push', push: true, email: false }, { label: 'Email', push: false, email: true },
  { label: 'Push and email', push: true, email: true }, { label: 'Only in the conversation', push: false, email: false },
];

// ------------------------------------------------------------ home: pregunta a Magnar, al centro
function Ask({ chat, send, pick, createDraft, reviewDraft, reset, openTask, compact }) {
  const [text, setText] = useState('');
  const thread = useRef();
  const started = chat.msgs.length > 0;
  const fixed = FIXED[chat.step] || '';
  useEffect(() => { setText(''); }, [chat.step]);
  useLayoutEffect(() => { const t = thread.current; if (t) t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' }); }, [chat.msgs.length, chat.typing]);
  const fill = (v) => { if (!chat.typing && (v || fixed)) setText(v || fixed); };
  const submit = (e) => { e?.preventDefault(); if (!text.trim() || chat.typing) return; send(text.trim()); setText(''); };
  const last = chat.msgs[chat.msgs.length - 1];
  const canWrite = chat.step !== 'draft';
  return html`<section class=${cx('tf-ask', started && 'is-started', compact && 'is-hidden')} aria-label="Ask Magnar to set up a task" inert=${compact}>
    <div class="tf-ask-in"><div class="tf-ask-pad">
      <h2 class="tf-hello">What task do you want to set up?</h2>
      <p class="tf-sub">Tell Magnar what to do and when. It asks for anything missing.</p>
      ${started && html`<div class="tf-thread" ref=${thread} aria-live="polite">
        ${chat.msgs.map((m, i) => m.from === 'me'
          ? html`<div class="tf-msg is-me" key=${i}><p>${m.text}</p></div>`
          : html`<div class="tf-msg is-ai" key=${i}>
              ${m.text && html`<p>${m.text}</p>`}
              ${m.draft && html`<${DraftPlan} d=${m.draft} done=${m.done} onCreate=${createDraft} onReview=${reviewDraft} onOpen=${() => openTask(m.done)} />`}
              ${m.chips && m === last && !chat.typing && html`<div class="tf-chips">${m.chips.map((c) => html`<button type="button" class="tf-chip" onClick=${() => pick(c)}>${c.label}</button>`)}</div>`}
            </div>`)}
        ${chat.typing && html`<div class="tf-msg is-ai"><span class="tf-typing" aria-label="Magnar is typing"><i></i><i></i><i></i></span></div>`}
      </div>`}
      <form class=${cx('tf-composer', text && 'is-filled')} onSubmit=${submit} onClick=${() => canWrite && !text && fill()}>
        <textarea rows="2" readonly aria-label="Describe a task" value=${text} onFocus=${() => canWrite && !text && fill()}
          placeholder=${!canWrite ? 'Create the task, or review it first' : started ? 'Reply to Magnar…' : 'Describe a task and when it should run…'}
          onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) submit(e); }}></textarea>
        <div class="tf-composer-bar">
          ${started ? html`<button type="button" class="tf-reset" onClick=${(e) => { e.stopPropagation(); reset(); setText(''); }}><${Icon} name="NotePencil" />Start over</button>` : html`<span></span>`}
          <button type="submit" class="tf-send" aria-label="Send" disabled=${!text.trim() || chat.typing}><${Icon} name="ArrowUp" /></button>
        </div>
      </form>
      ${!started && html`<div class="tf-ideas">
        <h3 class="pb-eyebrow">From your recent tasks</h3>
        <div class="tf-idea-row">${IDEAS.map((x, i) => html`<button type="button" class="tf-idea" style=${`animation-delay:${80 + i * 40}ms`} onClick=${() => fill(x.text)}>
          <span class="pb-vis is-shared"><${Icon} name="Clock" /></span>
          <span class="t">${x.title}</span><span class="d">Like ${x.from}</span></button>`)}</div>
      </div>`}
    </div></div>
  </section>`;
}

// ------------------------------------------------------------ el plan (estilo Front): 4 pasos numerados, unidos por una línea
const STEPS = [
  { key: 'when', label: 'When', note: 'How often it runs' },
  { key: 'do', label: 'Do', note: 'What Magnar does each time' },
  { key: 'where', label: 'Where it runs', note: 'Conversation, project and agent tier' },
  { key: 'notify', label: 'Notify', note: 'Only when the agent requests an update' },
];
const stepValue = (k, d) => (k === 'when' ? freq(d.schedule) : k === 'do' ? d.instructions || 'Add instructions' : k === 'where' ? whereLabel(d) : notifLabel(d));
// Versión corta dentro del chat
function DraftPlan({ d, done, onCreate, onReview, onOpen }) {
  return html`<div class=${cx('tf-plan-card', done && 'is-done')}>
    <div class="h"><b>${d.name}</b>${done && html`<span class="ok"><${Icon} name="CheckCircle" />Created</span>`}</div>
    <ol class="tf-mini">${STEPS.map((s, i) => html`<li><span class="pr-num">${String(i + 1).padStart(2, '0')}</span><span class="k">${s.label}</span><span class="v">${stepValue(s.key, d)}</span></li>`)}</ol>
    ${done ? html`<div class="f"><button type="button" class="pb-btn pb-btn-secondary sm" onClick=${onOpen}>Open task<${Icon} name="ArrowRight" /></button></div>`
      : html`<div class="f"><button type="button" class="pb-btn pb-btn-ghost sm" onClick=${onReview}>Review details</button><button type="button" class="pb-btn pb-btn-primary sm" onClick=${onCreate}>Create task</button></div>`}
  </div>`;
}

// ------------------------------------------------------------ lista (misma tabla que Playbooks B)
const Status = ({ t, running }) => html`<span class=${cx('tk-st', t.status === 'paused' && 'is-paused', running && 'is-run')}><i></i>${running ? 'Running' : t.status === 'paused' ? 'Paused' : 'Active'}</span>`;
const lead = (t) => html`<span class=${cx('pb-vis', t.status === 'paused' ? 'tf-paused' : 'is-shared')}><${Icon} name=${t.status === 'paused' ? 'Pause' : 'Clock'} /></span>`;
function TaskRow({ t, selected, running, fresh, dirty, go, menu }) {
  const n = nextOf(t);
  return html`<div data-tid=${t.id} class=${cx('pr-li tf-li', selected && 'is-on', t.status === 'paused' && 'is-paused', fresh && 'pb-flash')} role="link" tabindex="0" aria-label=${t.name}
    aria-current=${selected ? 'page' : undefined} onClick=${() => go(t.id)} onKeyDown=${(e) => { if (e.key === 'Enter') { e.preventDefault(); go(t.id); } }}>
    ${lead(t)}
    <span class="main"><span class="name"><span>${t.name}</span>${dirty && html`<span class="pr-dot" title="Unsaved changes"></span>`}${t.unread && html`<span class="tk-unread" title="Unread result">Unread result</span>`}</span>
      <span class="d"><span class="full">${t.instructions}</span><span class="short num">${running ? 'Running now' : n ? nextLabel(n) : 'Paused · ' + freq(t.schedule)}</span></span></span>
    <span class="col num">${freq(t.schedule)}</span>
    <span class="col num">${running ? 'Now' : n ? nextLabel(n) : '—'}</span>
    <span class="col st"><${Status} t=${t} running=${running} /></span>
    <span class="pr-more" onClick=${(e) => e.stopPropagation()} onKeyDown=${(e) => e.stopPropagation()}>${menu(t)}</span>
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

// ------------------------------------------------------------ campos (mismos que Magnar, mismos estilos de input que Playbooks)
const Field = ({ label, id, children }) => html`<div class="tk-field"><label class="pr-flabel" for=${id}>${label}</label>${children}</div>`;
function Pick({ id, value, options, onChange, icon, width = 220, wide }) {
  const o = options.find((x) => x.key === value) || options[0];
  return html`<${MenuButton} items=${options} selected=${[value]} width=${width} onSelect=${onChange} cls=${options.length > 8 ? 'tr-scroll' : undefined}
    trigger=${(p) => html`<button id=${id} type="button" ...${p} class=${cx('tk-select', wide && 'is-wide')}>${icon && html`<${Icon} name=${icon} />`}<span>${o.label}</span>${o.count && html`<span class="off">${o.count}</span>`}<${Icon} name="CaretDown" class="chev" /></button>`} />`;
}
const AI_TEXT = 'Every Friday at 9 AM';
function Schedule({ s, setS, aiOpen }) {
  const [ai, setAi] = useState(!!aiOpen);
  const [aiText, setAiText] = useState(aiOpen ? AI_TEXT : '');
  const generate = () => { setS(readSchedule(aiText) || parseNatural(aiText, s)); setAi(false); setAiText(''); };
  const runs = nextRuns(s, 3);
  return html`<div>
    <div class="tk-sched">
      <span class="k">Repeat</span><div class="v"><${Pick} value=${s.repeat} options=${REPEAT} onChange=${(v) => setS({ repeat: v })} />
        <span class="tk-ai-wrap"><button type="button" class=${cx('tk-select', ai && 'is-on')} aria-expanded=${ai} onClick=${() => setAi(!ai)}><${Icon} name="Sparkle" /><span>AI</span></button>
        ${ai && html`<div class="pb-menu tk-ai" role="dialog" aria-label="Describe when it should run">
          <label class="pr-flabel" for="t-ai">Describe when it should run</label>
          <input id="t-ai" class="pr-filled" readonly placeholder="Click to write" value=${aiText} onFocus=${() => !aiText && setAiText(AI_TEXT)} onClick=${() => !aiText && setAiText(AI_TEXT)}
            onKeyDown=${(e) => e.key === 'Enter' && aiText.trim() && generate()} />
          <div class="tk-ai-foot"><button type="button" class="pb-btn pb-btn-primary sm" disabled=${!aiText.trim()} onClick=${generate}>Generate</button></div>
        </div>`}</span></div>
      ${s.repeat === 'weekly' && html`<span class="k">Days</span><div class="v tk-days">${WEEKDAYS.map((w) => html`<button type="button" class="tk-day-btn" aria-pressed=${s.days.includes(w.v)}
        onClick=${() => setS({ days: s.days.includes(w.v) ? (s.days.length > 1 ? s.days.filter((x) => x !== w.v) : s.days) : [...s.days, w.v] })}>${w.short}</button>`)}</div>`}
      ${s.repeat !== 'interval' && html`<span class="k">Time</span><div class="v"><${Pick} value=${s.time} options=${TIMES} onChange=${(v) => setS({ time: v })} icon="Clock" width=${140} />
        <${Pick} value=${s.tz} options=${ZONES} onChange=${(v) => setS({ tz: v })} icon="Globe" width=${300} /></div>`}
    </div>
    ${runs.length > 0 && html`<p class="tf-runs num"><span>Next runs</span>${runs.map((d) => fmtRunAt(d)).join('  ·  ')}</p>`}
  </div>`;
}

// Un paso del plan: card como la regla de un playbook (número, título y una línea; se abre para editar)
function Step({ n, step, d, open, toggle, children }) {
  return html`<li class=${cx('pr-rule tf-step', open && 'is-open')} data-step=${step.key}>
    <div class="pr-rule-head" role="button" tabindex="0" aria-expanded=${open ? 'true' : 'false'} onClick=${toggle}
      onKeyDown=${(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); toggle(); } }}>
      <span class="pr-num">${String(n).padStart(2, '0')}</span>
      <span class="txt"><span class="title">${step.label}</span><span class=${cx('prev', step.key === 'do' && !d.instructions && 'is-empty')}>${open ? step.note : stepValue(step.key, d)}</span></span>
      <span class="pr-chev"><${Icon} name="CaretDown" /></span>
    </div>
    <div class="pr-rule-body" inert=${!open}><div><div class="pr-rule-pad">${children}</div></div></div>
  </li>`;
}

// ------------------------------------------------------------ panel: task abierta o nueva (misma jerarquía que el playbook)
function TaskPane({ t, isNew, draft, update, running, back, close, onRun, onPause, onDelete, aiOpen, onCreate, initStep }) {
  const d = draft;
  const set = (p) => update((x) => ({ ...x, ...p }));
  const setS = (p) => update((x) => ({ ...x, schedule: { ...x.schedule, ...p } }));
  const [open, setOpen] = useState(() => new Set(isNew ? STEPS.map((s) => s.key) : initStep ? [initStep] : []));
  const toggle = (k) => setOpen((o) => { const x = new Set(o); x.has(k) ? x.delete(k) : x.add(k); return x; });
  const n = !isNew && nextOf({ ...t, ...d });
  const ok = d.name.trim() && d.instructions.trim();
  const paused = !isNew && d.status === 'paused';
  return html`<div class="pr-scroll"><div class="pr-detail tf-detail pr-enter" data-flip="page">
    <div>
      ${back}
      <nav class="pr-crumb" aria-label="Breadcrumb"><a href="#/" onClick=${(e) => { e.preventDefault(); close(); }}>Scheduled tasks</a><span>/</span><span class="cur">${isNew ? 'New task' : d.name || 'Untitled task'}</span></nav>
      <div class="pr-head">
        <textarea class="pb-inline pr-title" rows="1" aria-label="Task name" placeholder=${isNew ? 'Untitled task' : 'Untitled task'} value=${d.name}
          onKeyDown=${(e) => e.key === 'Enter' && e.preventDefault()} onInput=${(e) => set({ name: e.target.value.replace(/\n/g, ' ') })}></textarea>
        ${!isNew && html`<div class="pr-edited num">${running ? 'Running now' : n ? 'Next ' + nextLabel(n) : 'Paused'}
          <${MenuButton} align="end" width=${190} items=${[
              { key: 'run', label: 'Run now', lead: html`<${Icon} name="Play" />` }, 'sep',
              { key: 'delete', label: 'Delete task', danger: true, lead: html`<${Icon} name="Trash" />` }]}
            onSelect=${(k) => (k === 'run' ? onRun() : onDelete())}
            trigger=${(p) => html`<button type="button" ...${p} class="pb-icon-btn sm" style="margin-left:4px" aria-label="Task options"><${Icon} name="DotsThree" /></button>`} /></div>`}
      </div>
      <div class="pr-props">
        ${!isNew && html`<${MenuButton} items=${STATUS_OPTS} selected=${[d.status]} width=${160} onSelect=${(v) => v !== d.status && onPause()}
          trigger=${(p) => html`<button type="button" ...${p} class="pr-prop" aria-label="Status"><${Status} t=${d} running=${running} /></button>`} /><span class="sep">·</span>`}
        <span class="pr-prop is-static"><${Icon} name="Clock" />${freq(d.schedule)}</span>
        ${d.project && html`<span class="sep">·</span><span class="pr-prop is-static">${d.project}</span>`}
      </div>
      <div style="margin-top:40px">
        <div class="pr-rules-h"><h2>Plan</h2><span class="c">4 steps</span>
          ${!isNew && html`<span class="grow"></span><button type="button" class="pb-btn pb-btn-secondary sm" disabled=${running || paused} onClick=${onRun}><${Icon} name="Play" />Run now</button>`}</div>
        <p class="pr-note">${isNew ? 'Set when it runs, what Magnar does, and where the result goes.' : 'Open a step to change it.'}</p>
        <ol class="pr-rules tf-plan">
          <${Step} n=${1} step=${STEPS[0]} d=${d} open=${open.has('when')} toggle=${() => toggle('when')}>
            <${Schedule} s=${d.schedule} setS=${setS} aiOpen=${aiOpen} /><//>
          <${Step} n=${2} step=${STEPS[1]} d=${d} open=${open.has('do')} toggle=${() => toggle('do')}>
            <label class="pr-flabel" for="t-ins">Instructions</label>
            <textarea id="t-ins" class="pr-filled" rows="3" placeholder="E.g. Revisa los contratos que se subieron esta semana y haz un resumen corto de cada uno."
              value=${d.instructions} onInput=${(e) => set({ instructions: e.target.value })}></textarea><//>
          <${Step} n=${3} step=${STEPS[2]} d=${d} open=${open.has('where')} toggle=${() => toggle('where')}>
            <${Field} label="Conversation" id="t-conv"><${Pick} id="t-conv" value=${d.conversation} options=${CONV} onChange=${(v) => set({ conversation: v })} wide /><//>
            ${d.conversation === 'existing' && html`<${Field} label="Select a conversation" id="t-cid"><${Pick} id="t-cid" value=${d.conversationId} options=${CONVERSATIONS} onChange=${(v) => set({ conversationId: v })} wide /><//>`}
            <div class="tk-grid2">
              <${Field} label="Project" id="t-proj"><${Pick} id="t-proj" value=${d.project} options=${PROJECTS} onChange=${(v) => set({ project: v })} icon="Briefcase" wide /><//>
              <${Field} label="Agent tier" id="t-tier"><${Pick} id="t-tier" value=${d.tier} options=${TIERS} onChange=${(v) => set({ tier: v })} width=${160} wide /><//>
            </div><//>
          <${Step} n=${4} step=${STEPS[3]} d=${d} open=${open.has('notify')} toggle=${() => toggle('notify')}>
            <div class="tr-checks" style="margin-top:0">
              <label class="tr-check"><input type="checkbox" checked=${d.push} onChange=${(e) => set({ push: e.target.checked })} />Push</label>
              <label class="tr-check"><input type="checkbox" checked=${d.email} onChange=${(e) => set({ email: e.target.checked })} />Email</label>
            </div>
            <p class="tk-hint">These channels are used only when the agent requests an update, following your instructions.</p><//>
        </ol>
      </div>
      ${!isNew && html`<section class="tf-history" aria-labelledby="h-runs">
        <div class="pr-rules-h"><h2 id="h-runs">Run history</h2><span class="c">${t.runs.length}</span>${t.unread && html`<span class="tk-unread">Unread result</span>`}</div>
        ${t.runs.length ? html`<ol>${t.runs.slice(0, 4).map((r) => html`<li><span class="num">${fmtRunAt(r.at)}</span>
            <span class=${cx('tk-st', r.status === 'Failed' && 'is-fail', r.status === 'Running' && 'is-run')}><i></i>${r.status}</span></li>`)}</ol>`
          : html`<p class="pr-note" style="margin-top:8px">No runs yet</p>`}
      </section>`}
    </div>
  </div></div>
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
const emptyChat = () => ({ msgs: [], step: 'idle', draft: null, typing: false });
function demoChat(kind) {
  const d = { ...blank(), name: 'Resumen de contratos nuevos', instructions: 'Resume los contratos que se subieron la semana pasada.', schedule: sch({ repeat: 'weekly', days: [1], time: '09:00' }) };
  const msgs = [{ from: 'me', text: 'Resume los contratos que se subieron la semana pasada' }];
  if (kind === 'schedule') return { ...emptyChat(), step: 'schedule', draft: d, msgs: [...msgs, { from: 'ai', text: 'Got it. When should it run?', chips: WHEN_CHIPS }] };
  msgs.push({ from: 'ai', text: 'Got it. When should it run?' }, { from: 'me', text: 'Every Monday at 9:00 AM' });
  if (kind === 'notify') return { ...emptyChat(), step: 'notify', draft: d, msgs: [...msgs, { from: 'ai', text: 'Okay: every Mon · 9:00 AM. How should Magnar let you know when there’s something new?', chips: NOTIFY_CHIPS }] };
  msgs.push({ from: 'ai', text: 'Okay: every Mon · 9:00 AM. How should Magnar let you know when there’s something new?' }, { from: 'me', text: 'Push' });
  return { ...emptyChat(), step: 'draft', draft: d, msgs: [...msgs, { from: 'ai', text: 'Here’s the plan. Create it as is, or review the details first.', draft: d }] };
}

function App() {
  const { path, params, nav } = useHashState();
  const [tasks, setTasks] = useState(() => (params.empty ? [] : SEED));
  const [drafts, setDrafts] = useState({});
  const [newDraft, setNewDraft] = useState(null);
  const [q, setQ] = useState(params.q || '');
  const [status, setStatus] = useState(params.status || 'all');
  const [running, setRunning] = useState(params.running ? path : null);
  const [fresh, setFresh] = useState(null);
  const [chat, setChat] = useState(() => (params.chat ? demoChat(params.chat) : emptyChat()));
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

  const go = (p, qp = {}) => { if (compact && p && p !== path) ghost(document.querySelector('.pr-pane-inner > .pr-scroll'), 200); nav(p, qp); };
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

  // ---------------- chat: Magnar pregunta solo lo que falta (cuándo y cómo avisar) y arma el plan
  const say = (next, delay = 650) => { setChat((c) => ({ ...c, typing: true })); setTimeout(() => setChat((c) => ({ ...next(c), typing: false })), delay); };
  const askNotify = (c, draft) => ({ ...c, step: 'notify', draft, msgs: [...c.msgs, { from: 'ai', text: `Okay: ${freq(draft.schedule).replace(/^./, (x) => x.toLowerCase())}. How should Magnar let you know when there’s something new?`, chips: NOTIFY_CHIPS }] });
  const showPlan = (c, draft) => ({ ...c, step: 'draft', draft, msgs: [...c.msgs, { from: 'ai', text: 'Here’s the plan. Create it as is, or review the details first.', draft }] });
  const send = (text) => {
    setChat((c) => ({ ...c, msgs: [...c.msgs, { from: 'me', text }] }));
    if (chat.step === 'idle' || chat.step === 'done') {
      const s = readSchedule(text);
      const t = readTask(text); if (PRESET_NAMES[text]) t.name = PRESET_NAMES[text];
      const draft = { ...blank(), ...t, schedule: s || blank().schedule };
      say((c) => (s ? askNotify(c, draft) : { ...c, step: 'schedule', draft, msgs: [...c.msgs, { from: 'ai', text: 'Got it. When should it run?', chips: WHEN_CHIPS }] }));
    } else if (chat.step === 'schedule') {
      const s = readSchedule(text);
      say((c) => (s ? askNotify(c, { ...c.draft, schedule: s }) : { ...c, msgs: [...c.msgs, { from: 'ai', text: 'I didn’t catch the time. Pick one:', chips: WHEN_CHIPS }] }));
    } else if (chat.step === 'notify') {
      const tx = text.toLowerCase();
      say((c) => showPlan(c, { ...c.draft, push: /push|both|ambos/.test(tx), email: /mail|correo|both|ambos/.test(tx) }));
    }
  };
  const pick = (chip) => {
    setChat((c) => ({ ...c, msgs: [...c.msgs, { from: 'me', text: chip.label }] }));
    if (chat.step === 'schedule') say((c) => askNotify(c, { ...c.draft, schedule: sch(chip.s) }));
    else if (chat.step === 'notify') say((c) => showPlan(c, { ...c.draft, push: chip.push, email: chip.email }), 550);
  };
  const markDone = (id) => setChat((c) => ({ ...c, step: 'done', msgs: c.msgs.map((m) => (m.draft && !m.done ? { ...m, done: id } : m)) }));
  const createDraft = () => {
    const id = addTask(chat.draft); const n = nextRuns(chat.draft.schedule, 1)[0];
    markDone(id);
    say((c) => ({ ...c, msgs: [...c.msgs, { from: 'ai', text: `Done. It’s in your list${n ? ', first run ' + nextLabel(n).replace(' · ', ' at ') : ''}.` }] }), 500);
    setToast('Task created');
  };
  const reviewDraft = () => { setNewDraft(chat.draft); go('new'); };

  let pane = null;
  const back = html`<button type="button" class="pr-back" style="margin-bottom:16px" onClick=${() => go('')}><${Icon} name="ArrowLeft" />Scheduled tasks</button>`;
  if (isNew && newDraft) pane = html`<${TaskPane} key="new" isNew draft=${newDraft} update=${(fn) => setNewDraft((d) => fn(d))} aiOpen=${!!params.ai} back=${back} close=${() => { setNewDraft(null); go(''); }}
    onCreate=${() => { const id = addTask(newDraft); setNewDraft(null); if (chat.step === 'draft') markDone(id); setToast('Task created'); go(id); }} />`;
  else if (current) pane = html`<${TaskPane} key=${current.id} t=${current} draft=${drafts[current.id] || current} update=${update(current.id)} running=${running === current.id} back=${back}
    initStep=${params.step} close=${() => go('')} onRun=${() => runNow(current)} onPause=${() => togglePause(drafts[current.id] || current)} onDelete=${() => setDel(current)} />`;
  const count = current ? changes(drafts[current.id], current) : 0;

  const newBtn = (sm) => html`<button type="button" class=${cx('pb-btn pb-btn-primary', sm && 'sm')} onClick=${() => { setNewDraft(null); go('new'); }}><${Icon} name="Plus" />New task</button>`;
  const body = tasks.length === 0
    ? html`<${EmptyState} kind="task" title="No scheduled tasks yet" text="Describe one above, or create it step by step." action=${newBtn(false)} />`
    : html`
      <div class="tf-sticky"><${StatusTabs} value=${status} onChange=${setStatus} counts=${counts}
        trailing=${!compact && html`<div class="tf-tools"><${SearchBox} value=${q} onInput=${setQ} placeholder="Search tasks" width="240px" />${newBtn(false)}</div>`} /></div>
      ${compact && html`<div class="tf-colsearch"><${SearchBox} value=${q} onInput=${setQ} placeholder="Search tasks" width="100%" /></div>`}
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
          <${Ask} chat=${chat} send=${send} pick=${pick} createDraft=${createDraft} reviewDraft=${reviewDraft} reset=${() => setChat(emptyChat())} openTask=${(id) => go(id)} compact=${compact} />
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
