// Lógica de agenda de "Scheduled tasks": textos de resumen y próximas ejecuciones.
export const WEEKDAYS = [
  { v: 1, short: 'Mon', long: 'Monday' }, { v: 2, short: 'Tue', long: 'Tuesday' }, { v: 3, short: 'Wed', long: 'Wednesday' },
  { v: 4, short: 'Thu', long: 'Thursday' }, { v: 5, short: 'Fri', long: 'Friday' }, { v: 6, short: 'Sat', long: 'Saturday' }, { v: 0, short: 'Sun', long: 'Sunday' },
];
const ORD = { first: 1, second: 2, third: 3, fourth: 4 };

export function defaultSchedule() {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1); tomorrow.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return {
    repeat: 'daily', time: '09:00', tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Santiago',
    date: tomorrow, start: today,
    intervalN: 30, intervalUnit: 'minutes',
    days: [1],
    monthOn: 'day', monthDay: 1, monthWeekday: 1,
    customN: 1, customUnit: 'month',
    ends: 'never', endDate: null, endCount: 10,
    except: [],
  };
}

export const fmtTime = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  const ap = h < 12 ? 'AM' : 'PM'; const h12 = h % 12 || 12;
  return String(h12).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ' ' + ap;
};
export const fmtRun = (d) => d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
export const fmtDateBtn = (d) => d.toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: '2-digit', year: 'numeric' });
const fmtShort = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export function tzOffset(tz) {
  try {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date());
    return p.find((x) => x.type === 'timeZoneName')?.value.replace('GMT', 'GMT') || '';
  } catch { return ''; }
}

const plural = (n, w) => (n === 1 ? w : n + ' ' + w + 's');
function monthPart(s) {
  if (s.monthOn === 'day') return 'day ' + s.monthDay;
  if (s.monthOn === 'last day') return 'last day';
  return s.monthOn + ' ' + WEEKDAYS.find((w) => w.v === s.monthWeekday).long;
}
const daysPart = (s) => WEEKDAYS.filter((w) => s.days.includes(w.v)).map((w) => w.short).join(', ');

export function summary(s) {
  const t = fmtTime(s.time);
  switch (s.repeat) {
    case 'once': return `Once · ${fmtShort(s.date)}, ${t}`;
    case 'interval': return `Every ${s.intervalN} ${s.intervalUnit}`;
    case 'daily': return `Every day · ${t}`;
    case 'weekly': return `Every week · ${daysPart(s)} · ${t}`;
    case 'monthly': return `Every month · ${monthPart(s)} · ${t}`;
    case 'custom': {
      const every = 'Every ' + plural(s.customN, s.customUnit);
      if (s.customUnit === 'day') return `${every} · ${t}`;
      if (s.customUnit === 'week') return `${every} · ${daysPart(s)} · ${t}`;
      return `${every} · ${monthPart(s)} · ${t}`;
    }
  }
  return '';
}

function atTime(d, hhmm) { const [h, m] = hhmm.split(':').map(Number); const x = new Date(d); x.setHours(h, m, 0, 0); return x; }
function monthMatch(d, s) {
  if (s.monthOn === 'day') return d.getDate() === s.monthDay;
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (s.monthOn === 'last day') return d.getDate() === last;
  if (d.getDay() !== s.monthWeekday) return false;
  if (s.monthOn === 'last') return d.getDate() + 7 > last;
  return Math.ceil(d.getDate() / 7) === ORD[s.monthOn];
}
const isExcept = (d, s) => s.except.some((e) => e.toDateString() === d.toDateString());

export function nextRuns(s, count = 5) {
  const now = new Date();
  const out = [];
  if (s.repeat === 'once') { const d = atTime(s.date, s.time); return d > now ? [d] : []; }
  if (s.repeat === 'interval') {
    const step = s.intervalN * (s.intervalUnit === 'hours' ? 60 : 1) * 60000;
    if (!(step >= 30 * 60000)) return [];
    let d = new Date(Math.ceil(now.getTime() / step) * step);
    while (out.length < count) { out.push(new Date(d)); d = new Date(d.getTime() + step); }
    return out;
  }
  const base = s.repeat === 'custom' ? new Date(s.start) : new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const d = new Date(base); d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 3 * 366 && out.length < count; i++, d.setDate(d.getDate() + 1)) {
    const run = atTime(d, s.time);
    if (run <= now) continue;
    let ok = false;
    if (s.repeat === 'daily') ok = true;
    if (s.repeat === 'weekly') ok = s.days.includes(d.getDay());
    if (s.repeat === 'monthly') ok = monthMatch(d, s);
    if (s.repeat === 'custom') {
      const days = Math.round((d - base) / 86400000);
      if (s.customUnit === 'day') ok = days % s.customN === 0;
      if (s.customUnit === 'week') ok = s.days.includes(d.getDay()) && Math.floor(days / 7) % s.customN === 0;
      if (s.customUnit === 'month') ok = monthMatch(d, s) && ((d.getFullYear() - base.getFullYear()) * 12 + d.getMonth() - base.getMonth()) % s.customN === 0;
      if (s.ends === 'date' && s.endDate && d > s.endDate) break;
      if (ok && isExcept(d, s)) ok = false;
    }
    if (ok) out.push(run);
    if (s.repeat === 'custom' && s.ends === 'after' && out.length >= s.endCount) break;
  }
  return out;
}

// Mock del botón "AI": interpreta frases simples ("every monday at 6 pm", "last friday of every month").
export function parseNatural(text, s) {
  // También entiende frases en español ("todos los viernes a las 9", "el último día del mes a las 18").
  const ES = [['lunes', 'monday'], ['martes', 'tuesday'], ['miércoles', 'wednesday'], ['miercoles', 'wednesday'], ['jueves', 'thursday'], ['viernes', 'friday'],
    ['sábado', 'saturday'], ['sabado', 'saturday'], ['domingo', 'sunday'], ['último día', 'last day'], ['ultimo dia', 'last day'], ['último', 'last'], ['ultimo', 'last'],
    ['primer', 'first'], ['segundo', 'second'], ['tercer', 'third'], ['cuarto', 'fourth'], [' mes', ' month'], ['meses', 'month']];
  let t = text.toLowerCase(); for (const [es, en] of ES) t = t.split(es).join(en);
  if (/a las (\d{1,2})(?!\s*(am|pm))/.test(t)) { const h = +t.match(/a las (\d{1,2})/)[1]; if (h >= 1 && h <= 7) t = t.replace(/a las (\d{1,2})/, 'at $1 pm'); }
  const n = { ...s };
  const tm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (tm) { let h = +tm[1]; if (tm[3] === 'pm' && h < 12) h += 12; if (tm[3] === 'am' && h === 12) h = 0; n.time = String(h).padStart(2, '0') + ':' + (tm[2] || '00'); }
  const wd = WEEKDAYS.find((w) => t.includes(w.long.toLowerCase()));
  if (t.includes('month')) {
    n.repeat = 'monthly';
    const ord = ['first', 'second', 'third', 'fourth', 'last'].find((o) => t.includes(o));
    if (ord && wd) { n.monthOn = ord; n.monthWeekday = wd.v; } else if (t.includes('last day')) n.monthOn = 'last day';
  } else if (wd) { n.repeat = 'weekly'; n.days = [wd.v]; } else n.repeat = 'daily';
  return n;
}
