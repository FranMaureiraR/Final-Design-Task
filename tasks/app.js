// Flujo de Scheduled tasks ("Hacer una Task")
// Pantallas: lista (vacía / con tareas) · modal "New task" con todas sus variantes de agenda.
import { html, render, useState, useEffect, useMemo } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon } from '../shared/icons.js';
import { AppShell, PageHeader, Breadcrumb } from '../shared/shell.js';
import { Dialog, AlertDialog, DropdownMenu, Select, Popover, CommandList, Checkbox, Calendar, Field, cx } from '../shared/ui.js';
import { WEEKDAYS, defaultSchedule, fmtTime, fmtRun, fmtDateBtn, tzOffset, summary, nextRuns, parseNatural } from './schedule.js';

const opt = (arr) => arr.map((v) => (typeof v === 'string' ? { value: v, label: v } : v));
const REPEAT = [
  { value: 'once', label: 'Once' }, { value: 'interval', label: 'At an interval' }, { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' }, { value: 'monthly', label: 'Every month' }, { value: 'custom', label: 'Custom' },
];
const TIMES = Array.from({ length: 48 }, (_, i) => { const v = String(Math.floor(i / 2)).padStart(2, '0') + ':' + (i % 2 ? '30' : '00'); return { value: v, label: fmtTime(v) }; });
const TIMEZONES = (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : ['America/Santiago']).map((z) => ({ value: z, label: z.replace(/_/g, ' ') }));
// Mock: la cuenta capturada no tenía proyectos. Agrega aquí si quieres probar la lista.
const PROJECTS = [];
const CONVERSATIONS = [{ value: 'c1', label: 'Ley del trabajador' }];

// ------------------------------------------------------------ piezas del formulario de agenda
function Row({ label, children }) {
  return html`<span class="self-start pt-1.5 text-[13px] text-muted-foreground">${label}</span>
    <div class="min-w-0 space-y-1.5"><div class="flex min-w-0 flex-wrap items-center gap-2">${children}</div></div>`;
}

function DateButton({ value, onChange }) {
  return html`<div><div class="grid min-w-0 gap-2"><div class="grid min-w-0 gap-2">
    <${Popover} class=${C.popoverBase + ' w-auto p-0'} trigger=${(p) => html`<button type="button" ...${p} aria-label=${fmtDateBtn(value)} class=${C.btnDate}><${Icon} name="CalendarBlankDot" class="size-4" />${fmtDateBtn(value)}</button>`}>
      ${(close) => html`<${Calendar} selected=${value} onSelect=${(d) => { onChange(d); close(); }} />`}
    <//>
  </div></div></div>`;
}

function TimeButton({ value, onChange }) {
  return html`<${Popover} class=${C.popoverBase + ' p-0 max-h-[var(--available-height)] min-w-[var(--anchor-width)] w-56'}
    trigger=${(p) => html`<button type="button" ...${p} aria-label="Time" class=${C.btnOutline}><${Icon} name="Clock" class="size-4 text-muted-foreground" /><span class="tabular-nums">${fmtTime(value)}</span><${Icon} name="CaretDown" class="size-3.5 text-muted-foreground" /></button>`}>
    ${(close) => html`<${CommandList} placeholder="Type a time, like 9:15" items=${TIMES} value=${value}
      renderItem=${(i) => html`<span class="tabular-nums">${i.label}</span>`}
      filterText=${(i) => i.label + ' ' + i.value}
      onSelect=${(v) => { onChange(v); close(); }} />`}
  <//>`;
}

function TimezoneButton({ value, onChange }) {
  const items = useMemo(() => TIMEZONES.map((z) => ({ ...z, off: tzOffset(z.value) })), []);
  return html`<${Popover} class=${C.popoverBase + ' p-0 max-h-[var(--available-height)] min-w-[var(--anchor-width)] w-72'}
    trigger=${(p) => html`<button type="button" ...${p} aria-label="Time zone" class=${C.btnTimezone}><${Icon} name="Globe" class="size-4 text-muted-foreground" /><span class="truncate">${value.replace(/_/g, ' ')}</span><span class="text-muted-foreground">${tzOffset(value)}</span><${Icon} name="CaretDown" class="size-3.5 text-muted-foreground" /></button>`}>
    ${(close) => html`<${CommandList} placeholder="Search time zones" items=${items} value=${value}
      renderItem=${(i) => html`<span class="min-w-0 flex-1 truncate">${i.label}</span><span class="text-xs text-muted-foreground">${i.off}</span>`}
      onSelect=${(v) => { onChange(v); close(); }} />`}
  <//>`;
}

function AIButton({ schedule, onApply }) {
  const [text, setText] = useState('');
  return html`<${Popover} align="end" class=${C.popoverBase + ' p-2.5 w-80 space-y-3'}
    trigger=${(p) => html`<button type="button" ...${p} class=${C.btnOutline}><${Icon} name="Chats" class="size-4" />AI</button>`}>
    ${(close) => html`
      <p class="text-sm font-medium">Describe when it should run</p>
      <input data-slot="input" aria-label="Describe when it should run" placeholder="E.g. the last Friday of every month at 6 pm" class=${C.input} value=${text} onInput=${(e) => setText(e.target.value)}
        ref=${(el) => el && setTimeout(() => el.focus(), 0)} />
      <div class="flex justify-end"><button type="button" disabled=${!text.trim()} data-slot="button" class=${C.btnPrimary}
        onClick=${() => { onApply(parseNatural(text, schedule)); setText(''); close(); }}>Generate</button></div>`}
  <//>`;
}

function DaysPicker({ days, onChange }) {
  const toggle = (v) => { const n = days.includes(v) ? days.filter((d) => d !== v) : [...days, v]; if (n.length) onChange(n); };
  return html`<div class="flex flex-wrap gap-1.5">${WEEKDAYS.map((w) => html`<button type="button" data-slot="button" aria-label=${w.long} aria-pressed=${days.includes(w.v)}
    class=${days.includes(w.v) ? C.btnDayOn : C.btnDayOff} onClick=${() => toggle(w.v)}>${w.short}</button>`)}</div>`;
}

function MonthOn({ s, set }) {
  return html`<div class="flex flex-wrap items-center gap-2">
    <${Select} label="On" value=${s.monthOn} onChange=${(v) => set({ monthOn: v })} options=${opt(['day', 'last day', 'first', 'second', 'third', 'fourth', 'last'])} />
    ${s.monthOn === 'day' && html`<${Select} label="day" value=${s.monthDay} onChange=${(v) => set({ monthDay: v })} options=${Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: String(i + 1) }))} />`}
    ${['first', 'second', 'third', 'fourth', 'last'].includes(s.monthOn) && html`<${Select} label="Weekday" value=${s.monthWeekday} onChange=${(v) => set({ monthWeekday: v })} options=${WEEKDAYS.map((w) => ({ value: w.v, label: w.long }))} />`}
  </div>`;
}

function ExceptDates({ dates, onChange }) {
  const has = (d) => dates.some((x) => x.toDateString() === d.toDateString());
  const toggle = (d) => onChange(has(d) ? dates.filter((x) => x.toDateString() !== d.toDateString()) : [...dates, d].sort((a, b) => a - b));
  return html`<div class="flex flex-wrap items-center gap-1.5">
    ${dates.map((d) => html`<button type="button" class=${C.btnOutlineSm} onClick=${() => toggle(d)}>${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}<${Icon} name="X" /></button>`)}
    <${Popover} class=${C.popoverBase + ' w-auto p-0'} trigger=${(p) => html`<button type="button" ...${p} class=${C.btnOutline}><${Icon} name="CalendarBlank" class="size-4 text-muted-foreground" />Pick dates</button>`}>
      <${Calendar} isSelected=${has} onSelect=${toggle} />
    <//>
  </div>`;
}

function ScheduleFields({ s, set }) {
  const runs = nextRuns(s);
  const intervalTooShort = s.repeat === 'interval' && s.intervalN * (s.intervalUnit === 'hours' ? 60 : 1) < 30;
  return html`<div class="space-y-5">
    <div class="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-3">
      <${Row} label="Repeat">
        <${Select} label="Repeat" value=${s.repeat} onChange=${(v) => set({ repeat: v })} options=${REPEAT} />
        <${AIButton} schedule=${s} onApply=${(n) => set(n)} />
      <//>

      ${s.repeat === 'once' && html`<${Row} label="Date"><${DateButton} value=${s.date} onChange=${(d) => set({ date: d })} /><//>`}

      ${s.repeat === 'interval' && html`
        <span class="self-start pt-1.5 text-[13px] text-muted-foreground">Every</span>
        <div class="min-w-0 space-y-1.5">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <input data-slot="input" inputmode="numeric" min="1" max="10080" aria-label="Every" class=${C.inputNumber} type="number" value=${s.intervalN}
              aria-invalid=${intervalTooShort ? 'true' : undefined} onInput=${(e) => set({ intervalN: +e.target.value || 0 })} />
            <${Select} label="Every" value=${s.intervalUnit} onChange=${(v) => set({ intervalUnit: v })} options=${opt(['minutes', 'hours'])} />
          </div>
          <p class="text-[13px] text-muted-foreground">At least 30 minutes.</p>
        </div>`}

      ${s.repeat === 'weekly' && html`<${Row} label="Days"><${DaysPicker} days=${s.days} onChange=${(d) => set({ days: d })} /><//>`}
      ${s.repeat === 'monthly' && html`<${Row} label="On"><${MonthOn} s=${s} set=${set} /><//>`}

      ${s.repeat === 'custom' && html`
        <${Row} label="Every">
          <input data-slot="input" inputmode="numeric" min="1" max="100" aria-label="Every" class=${C.inputNumber} type="number" value=${s.customN} onInput=${(e) => set({ customN: Math.max(1, +e.target.value || 1) })} />
          <${Select} label="Every" value=${s.customUnit} onChange=${(v) => set({ customUnit: v })} options=${opt(['day', 'week', 'month'])} />
        <//>
        ${s.customUnit === 'week' && html`<${Row} label="Days"><${DaysPicker} days=${s.days} onChange=${(d) => set({ days: d })} /><//>`}
        ${s.customUnit === 'month' && html`<${Row} label="On"><${MonthOn} s=${s} set=${set} /><//>`}`}

      ${s.repeat !== 'interval' && html`<${Row} label="Time">
        <${TimeButton} value=${s.time} onChange=${(v) => set({ time: v })} />
        <${TimezoneButton} value=${s.tz} onChange=${(v) => set({ tz: v })} />
      <//>`}

      ${s.repeat === 'custom' && html`
        <${Row} label="Starts"><${DateButton} value=${s.start} onChange=${(d) => set({ start: d })} /><//>
        <${Row} label="Ends"><div class="flex flex-wrap items-center gap-2">
          <${Select} label="Ends" value=${s.ends} onChange=${(v) => set({ ends: v, endDate: v === 'date' && !s.endDate ? new Date(Date.now() + 30 * 864e5) : s.endDate })}
            options=${[{ value: 'never', label: 'Never' }, { value: 'date', label: 'On a date' }, { value: 'after', label: 'After' }]} />
          ${s.ends === 'date' && html`<${DateButton} value=${s.endDate} onChange=${(d) => set({ endDate: d })} />`}
          ${s.ends === 'after' && html`<input data-slot="input" inputmode="numeric" min="1" aria-label="Runs" class=${C.inputNumber} type="number" value=${s.endCount} onInput=${(e) => set({ endCount: Math.max(1, +e.target.value || 1) })} /><span class="text-sm text-muted-foreground">runs</span>`}
        </div><//>
        <${Row} label="Except"><${ExceptDates} dates=${s.except} onChange=${(d) => set({ except: d })} /><//>`}
    </div>

    <div class="space-y-2 rounded-xl bg-muted/60 px-4 py-3">
      <p class="text-sm font-medium">${summary(s)}</p>
      <div class="space-y-1">
        <p class="text-[13px] text-muted-foreground">Next runs</p>
        <ul class="space-y-0.5 text-[13px] tabular-nums">
          ${runs.map((r) => html`<li class="first-letter:uppercase">${fmtRun(r)}</li>`)}
          ${runs.length === 0 && html`<li class="text-muted-foreground">—</li>`}
        </ul>
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------ modal New task
function TaskDialog({ open, initial, onClose, onSave }) {
  const blank = () => ({ name: '', instructions: '', conversation: 'new', conversationId: '', project: null, tier: 'auto', schedule: defaultSchedule(), push: true, email: true });
  const [f, setF] = useState(blank);
  const [tried, setTried] = useState(false);
  useEffect(() => { if (open) { setF(initial || blank()); setTried(false); } }, [open]);
  const set = (p) => setF((x) => ({ ...x, ...p }));
  const setS = (p) => setF((x) => ({ ...x, schedule: { ...x.schedule, ...p } }));
  const submit = (e) => { e.preventDefault(); setTried(true); if (!f.name.trim() || !f.instructions.trim()) return; onSave(f); };

  return html`<${Dialog} open=${open} onClose=${onClose} class=${C.dialogLarge}>
    <div data-slot="dialog-header" class="flex flex-col gap-2">
      <h2 data-slot="dialog-title" class="cn-font-heading text-base leading-none font-medium">${initial ? 'Edit' : 'New task'}</h2>
    </div>
    <form class="space-y-8" onSubmit=${submit}>
      <${Field} label="Name"><input data-slot="input" aria-label="Name" class=${C.input} type="text" value=${f.name} aria-invalid=${tried && !f.name.trim() ? 'true' : undefined} onInput=${(e) => set({ name: e.target.value })} /><//>
      <${Field} label="Instructions"><textarea data-slot="textarea" class=${C.textarea} value=${f.instructions} aria-invalid=${tried && !f.instructions.trim() ? 'true' : undefined} onInput=${(e) => set({ instructions: e.target.value })}></textarea><//>
      <${Field} label="Conversation"><${Select} label="Conversation" value=${f.conversation} onChange=${(v) => set({ conversation: v })}
        options=${[{ value: 'new', label: 'New conversation each run' }, { value: 'existing', label: 'Existing conversation' }]} /><//>
      ${f.conversation === 'existing' && html`<${Field} label="Select a conversation"><${Select} label="Select a conversation" value=${f.conversationId} onChange=${(v) => set({ conversationId: v })} options=${CONVERSATIONS} /><//>`}
      <fieldset class="grid min-w-0 gap-2">
        <label data-slot="label" class=${C.labelPlain}>Project</label>
        <${Popover} class=${C.popoverBase + ' w-[var(--anchor-width)] p-0 max-h-[var(--available-height)] min-w-[var(--anchor-width)]'}
          trigger=${(p) => html`<button type="button" ...${p} class=${cx(C.btnCombobox, f.project && 'text-foreground')}>
            <span class="flex min-w-0 items-center gap-2"><span class="text-muted-foreground"><${Icon} name="Briefcase" class="size-4 shrink-0" /></span>
            <span class="min-w-0 truncate text-left">${f.project ? PROJECTS.find((x) => x.value === f.project)?.label : 'Select project'}</span></span>
            <${Icon} name="CaretDown" class="h-4 w-4 shrink-0 opacity-50" /></button>`}>
          ${(close) => html`<${CommandList} placeholder="Search project…" items=${PROJECTS} value=${f.project} onSelect=${(v) => { set({ project: v === f.project ? null : v }); close(); }} />`}
        <//>
      </fieldset>
      <${Field} label="Agent tier"><${Select} label="Agent tier" value=${f.tier} onChange=${(v) => set({ tier: v })}
        options=${[{ value: 'auto', label: 'Auto' }, { value: 'low', label: 'Low' }, { value: 'mid', label: 'Mid' }, { value: 'high', label: 'High' }]} /><//>
      <${Field} label="Schedule"><${ScheduleFields} s=${f.schedule} set=${setS} /><//>
      <div class="space-y-2">
        <p class="text-sm font-medium">Notification channels</p>
        <div class="flex gap-5">
          <div><div class="grid min-w-0 gap-2"><${Checkbox} id="push" label="Push" checked=${f.push} onChange=${(v) => set({ push: v })} /></div></div>
          <div><div class="grid min-w-0 gap-2"><${Checkbox} id="email" label="Email" checked=${f.email} onChange=${(v) => set({ email: v })} /></div></div>
        </div>
        <p class="text-xs text-muted-foreground">These channels are used only when the agent requests an update, following your instructions.</p>
      </div>
      <div class="flex flex-wrap items-center justify-end gap-2">
        <button type="button" data-slot="button" class=${C.btnOutline} onClick=${onClose}>Cancel</button>
        <button type="submit" data-slot="button" class=${C.btnPrimary}>Save</button>
      </div>
    </form>
  <//>`;
}

// ------------------------------------------------------------ router (hash): #/ = lista · #/<id> = detalle
function useRoute() {
  const get = () => location.hash.replace(/^#\/?/, '');
  const [r, setR] = useState(get());
  useEffect(() => { const f = () => setR(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
const go = (id) => { location.hash = id ? '/' + id : '/'; };
const uid = () => 'aut-' + Math.random().toString(16).slice(2, 10);
const statusLabel = (t) => (t.status === 'paused' ? 'Paused' : 'Active');
// "11/30/2026, 9:00:00 AM" — formato que usa Magnar en "Next run"
const fmtNext = (d) => d.toLocaleString('en-US');

function Pagination() {
  return html`<div class="mt-4"><div class=${C.pagination}><div class="ml-auto flex shrink-0 items-center gap-4"><span class="flex items-center gap-1">
    <span class="mr-1 tabular-nums">Page 1</span>
    <button type="button" disabled data-slot="button" aria-label="Previous page" class=${C.btnGhostIcon6}><${Icon} name="CaretLeft" class="size-4" /></button>
    <button type="button" disabled data-slot="button" aria-label="Next page" class=${C.btnGhostIcon6}><${Icon} name="CaretRight" class="size-4" /></button>
  </span></div></div></div>`;
}

function taskMenuItems(t, { onEdit, onTogglePause, onDelete }) {
  return [
    { label: 'Edit', icon: 'PencilSimpleLine', onSelect: onEdit }, 'separator',
    { label: t.status === 'paused' ? 'Resume' : 'Pause', icon: t.status === 'paused' ? 'Play' : 'Pause', onSelect: onTogglePause }, 'separator',
    { label: 'Delete', icon: 'Trash', onSelect: onDelete },
  ];
}

// ------------------------------------------------------------ lista
function TaskRow({ t, actions }) {
  const next = t.status === 'paused' ? null : nextRuns(t.schedule, 1)[0];
  return html`<div class="flex items-center gap-3">
    <a class=${C.taskRow} href=${'#/' + t.id}>
      <div class="min-w-0 flex-1 basis-48">
        <div class="flex flex-wrap items-center gap-2"><span class="break-words text-sm font-medium">${t.name}</span> </div>
        <p class="mt-1 break-words text-xs text-muted-foreground">${statusLabel(t)} · ${t.schedule.tz}</p>
      </div>
      <div class="text-xs text-muted-foreground sm:text-right">${next && html`<div>Next run: ${fmtNext(next)}</div>`}</div>
    </a>
    <${DropdownMenu} label=${'Options for ' + t.name} heading=${t.name} items=${taskMenuItems(t, actions)}
      trigger=${(p) => html`<button type="button" ...${p} aria-label=${'Options for ' + t.name} class=${C.btnGhostIcon8}><${Icon} name="DotsThree" class="size-4" /></button>`} />
  </div>`;
}

function TaskList({ tasks, onNew, actionsFor }) {
  return html`
    <${PageHeader}
      title=${html`<${Breadcrumb} items=${[{ label: 'Scheduled tasks' }]} />`}
      actions=${html`<button type="button" data-slot="button" aria-label="New task" class=${C.btnPrimary} onClick=${onNew}><${Icon} name="Plus" class="size-4" />New task</button>`}
      tabsRow=${null} />
    <div class="flex min-h-0 flex-1 flex-col overflow-auto scroll-smooth"><div class="flex min-h-full flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
      <div class="p-4">
        <div data-slot="alert" class=${C.alert}>
          <${Icon} name="ChatCircleDots" />
          <div data-slot="alert-description" class=${C.alertDescription}>Creating and editing scheduled tasks with the agent works best: tell Magnar what to do and when, and it sets up the task for you.</div>
          <div data-slot="alert-action" class="absolute top-2 right-2"><button type="button" data-slot="button" class=${C.btnOutlineSm}>New conversation</button></div>
        </div>
        ${tasks.length === 0
          ? html`<p class="py-8 text-sm text-muted-foreground">No scheduled tasks yet</p>`
          : html`<div class="divide-y border-y">${tasks.map((t) => html`<${TaskRow} key=${t.id} t=${t} actions=${actionsFor(t)} />`)}</div>`}
        <${Pagination} />
      </div>
    </div></div></div>`;
}

// ------------------------------------------------------------ detalle
function TaskDetail({ t, onEdit, onTogglePause, onDelete, onRunNow }) {
  const next = t.status === 'paused' ? null : nextRuns(t.schedule, 1)[0];
  return html`
    <${PageHeader}
      title=${html`<${Breadcrumb} items=${[{ label: t.name }]} />`}
      meta=${`${statusLabel(t)} · ${summary(t.schedule)} · ${t.schedule.tz}`}
      actions=${html`<button type="button" aria-label="Edit" title="Edit" class=${C.btnOutlineIcon} onClick=${onEdit}><${Icon} name="PencilSimple" class="size-4" /></button>`}
      tabsRow=${null} />
    <div class="flex min-h-0 flex-1 flex-col overflow-auto scroll-smooth"><div class="flex min-h-full flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
      <div class="p-4">
        ${next && html`<p class="mt-2 text-sm">Next run: ${fmtNext(next)}</p>`}
        <p class="my-5 whitespace-pre-wrap break-words text-sm">${t.instructions}</p>
        <div class="flex flex-wrap gap-2">
          <button type="button" data-slot="button" class=${C.btnPrimary} onClick=${onRunNow}>Run now</button>
          <button type="button" data-slot="button" class=${C.btnOutline} onClick=${onTogglePause}>${t.status === 'paused' ? 'Resume' : 'Pause'}</button>
          <button type="button" data-slot="button" class=${C.btnGhost} onClick=${onDelete}>Delete</button>
        </div>
        <section class="mt-8">
          <h2 class="mb-3 text-sm font-semibold">Run history</h2>
          ${t.runs.length === 0
            ? html`<p class="text-sm text-muted-foreground">No runs yet</p>`
            : html`<div class="divide-y border-y">${t.runs.map((r) => html`
                <div class="flex flex-wrap items-center justify-between gap-4 py-3 text-sm">
                  <span>${fmtNext(r.at)}</span><span class="text-xs text-muted-foreground">${r.status}</span>
                </div>`)}</div>`}
          <${Pagination} />
        </section>
      </div>
    </div></div></div>`;
}

// ------------------------------------------------------------ app
function App() {
  const route = useRoute();
  const [tasks, setTasks] = useState([]);
  const [dialog, setDialog] = useState(null); // null | { task? }
  const [confirm, setConfirm] = useState(null); // tarea a borrar
  const current = tasks.find((t) => t.id === route);
  useEffect(() => { document.title = (current ? current.name : 'Scheduled tasks') + ' - Magnar'; }, [current?.name]);

  const update = (id, p) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...p } : t)));
  const save = (f) => {
    if (dialog.task) update(dialog.task.id, f);
    else { const t = { ...f, id: uid(), status: 'active', runs: [] }; setTasks((ts) => [...ts, t]); go(t.id); }
    setDialog(null);
  };
  const actionsFor = (t) => ({
    onEdit: () => setDialog({ task: t }),
    onTogglePause: () => update(t.id, { status: t.status === 'paused' ? 'active' : 'paused' }),
    onDelete: () => setConfirm(t),
  });
  const doDelete = () => { setTasks((ts) => ts.filter((t) => t.id !== confirm.id)); if (current?.id === confirm.id) go(); setConfirm(null); };

  const tab = current ? { title: current.name, icon: 'Clock' } : { title: 'Scheduled tasks', icon: 'Clock' };
  const prevTab = current ? { title: 'Scheduled tasks', icon: 'Clock' } : undefined;
  return html`<${AppShell} activeApp="tasks" tab=${tab} prevTab=${prevTab}>
    ${current
      ? html`<${TaskDetail} t=${current} ...${actionsFor(current)}
          onRunNow=${() => update(current.id, { runs: [{ at: new Date(), status: 'Running' }, ...current.runs] })} />`
      : html`<${TaskList} tasks=${tasks} onNew=${() => setDialog({})} actionsFor=${actionsFor} />`}
    <${TaskDialog} open=${!!dialog} initial=${dialog?.task} onClose=${() => setDialog(null)} onSave=${save} />
    <${AlertDialog} open=${!!confirm} onClose=${() => setConfirm(null)} title=${confirm ? `Delete “${confirm.name}”?` : ''}
      description="It will stop running. Work already in progress may finish." actionLabel="Delete" onAction=${doDelete} />
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
