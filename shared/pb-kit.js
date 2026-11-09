// Piezas comunes de las propuestas "Refinada" y "Documento".
// Datos, búsqueda con "/", pills de filtro con menú, vista previa al pasar el mouse,
// formato de lectura de las reglas (solo presentación) y FLIP para reubicar elementos.
import { html, useState, useEffect, useLayoutEffect, useRef } from '../vendor/preact-htm.js';
import { Icon, Flag } from './icons.js';
import { Portal } from './ui.js';
import { PLAYBOOKS, ME, COUNTRY_NAMES, relTime, plural, countryName } from './playbooks-seed.js';

export const cx = (...a) => a.filter(Boolean).join(' ');
// La versión B (lista) no usa banderas.
export const FLAGS = typeof window === 'undefined' || window.PR_VARIANT !== 'list';

// "Contract type" no existe en Magnar. Queda construido pero apagado: solo se infiere del nombre.
export const SHOW_CONTRACT_TYPE = false;
export const CONTRACT_TYPES = ['NDA', 'Arrendamiento', 'Servicios', 'Laboral', 'Datos personales', 'Societario'];
const TYPE_BY_ID = { 'nda-proveedores': 'NDA', 'arrendamiento-comercial': 'Arrendamiento', 'servicios-ti': 'Servicios', 'contrato-trabajo': 'Laboral', 'dpa-21719': 'Datos personales', 'compraventa-acciones': 'Societario' };

// ------------------------------------------------------------ datos
// Las reglas usan el formato de texto libre que Magnar ya tiene ("Posición Estándar (Ideal): …").
const LBL = { standard: 'Posición Estándar (Ideal)', fallback: 'Alternativa Aceptable (Fallback)', unacceptable: 'Inaceptable (Red Flag)' };
const toText = (r) => ['standard', 'fallback', 'unacceptable'].filter((k) => r[k]).map((k) => `${LBL[k]}: ${r[k]}`).join('\n');
const DESCRIPTIONS = {
  'contrato-trabajo': 'Contratos individuales para cargos administrativos y profesionales.',
  'compraventa-acciones': 'Compraventa de acciones de sociedades anónimas cerradas y SpA, desde la posición del comprador.',
  'dpa-21719': 'Acuerdos de tratamiento de datos con encargados y subencargados, conforme a la Ley 21.719 sobre protección de datos personales, que entra en vigencia en diciembre de 2026.',
};
// Una regla con subtítulos, como la escriben los abogados en Magnar hoy (líneas que terminan en ":").
const SPA_RULE = {
  id: 'r1', title: 'Declaraciones y garantías del vendedor',
  body: 'Títulos y capital:\nPosición Estándar (Ideal): El vendedor declara ser dueño exclusivo de las acciones, libres de gravámenes, prendas y derechos de terceros.\nInaceptable (Red Flag): Declaraciones sujetas al "mejor conocimiento" del vendedor.\nContingencias tributarias y laborales:\nPosición Estándar (Ideal): Indemnidad total por contingencias anteriores al cierre, vigente por 3 años.\nAlternativa Aceptable (Fallback): Vigencia de 2 años con tope del 30% del precio.\nInaceptable (Red Flag): Venta "como está", sin declaraciones del vendedor.',
};
// Datos de muestra: a propósito simples (una oración por regla). Sirven para mostrar el diseño;
// el mismo layout soporta reglas largas con posiciones, como las que se escriben hoy en Magnar.
const P = (id, name, description, owner, edited, rules, extra = {}) => ({
  id, name, description, country: 'CL', visibility: owner === ME ? 'private' : 'shared', mine: owner === ME, owner, edited, type: TYPE_BY_ID[id],
  rules: rules.map(([title, body], i) => ({ id: 'r' + (i + 1), title, body })), ...extra,
});
export const SEED = [
  P('nda-proveedores', 'NDA con proveedores', 'Para revisar acuerdos de confidencialidad con proveedores.', ME, '2026-11-05', [
    ['Duración', 'La confidencialidad dura como máximo 3 años.'],
    ['Ley aplicable', 'El contrato se rige por la ley chilena.'],
    ['Responsabilidad', 'La responsabilidad tiene un tope igual al monto del contrato.'],
  ]),
  P('arrendamiento-comercial', 'Arriendo de oficina', 'Para revisar contratos de arriendo cuando somos el arrendatario.', ME, '2026-11-02', [
    ['Plazo', 'Plazo mínimo de 2 años, con renovación automática.'],
    ['Reajuste', 'La renta se reajusta una vez al año según el IPC.'],
    ['Garantía', 'Garantía de un mes de renta, devuelta en 30 días.'],
    ['Término anticipado', 'Se puede terminar con un aviso de 90 días.'],
    ['Mejoras', 'Las mejoras útiles se reembolsan al terminar.'],
  ], { visibility: 'shared' }),
  P('servicios-ti', 'Servicios de software', 'Para contratos con proveedores de software y soporte.', ME, '2026-10-17', [
    ['Disponibilidad', 'El servicio debe estar disponible el 99% del mes.'],
    ['Propiedad del código', 'Lo que se desarrolla para nosotros es nuestro.'],
    ['Datos', 'El proveedor solo usa los datos para prestar el servicio.'],
    ['Responsabilidad', 'Tope de responsabilidad de 12 meses de pago.'],
    ['Pago', 'Se paga a 30 días desde la factura.'],
    ['Término', 'Se puede terminar con aviso de 30 días.'],
    ['Subcontratación', 'Subcontratar requiere nuestra aprobación.'],
  ]),
  P('compraventa-acciones', 'Compra de acciones', 'Para revisar compras de acciones desde el lado del comprador.', ME, '2026-09-07', [
    ['Declaraciones del vendedor', 'El vendedor declara que las acciones están libres de deudas.'],
  ]),
  P('pacto-accionistas', 'Pacto de socios', 'Para acuerdos entre socios de una empresa.', ME, '2026-10-09', [
    ['Venta de acciones', 'Los socios tienen preferencia para comprar.'],
    ['Salida conjunta', 'Si un socio vende, los demás pueden vender en las mismas condiciones.'],
    ['Decisiones importantes', 'Requieren el acuerdo del 75% de los socios.'],
    ['Desacuerdos', 'Se resuelven primero con mediación.'],
    ['No competencia', 'Dos años después de salir de la empresa.'],
    ['Precio de salida', 'Lo fija un tercero independiente.'],
  ]),
  P('finiquito-laboral', 'Finiquito', 'Para revisar finiquitos de trabajadores.', ME, '2026-11-01', [
    ['Causal', 'La causal coincide con la carta de aviso.'],
    ['Indemnización', 'Un mes de sueldo por año trabajado.'],
  ], { visibility: 'shared' }),
  P('licencia-saas', 'Licencia de software', 'Para licencias de software que contratamos como empresa.', ME, '2026-11-03', [
    ['Usuarios', 'La licencia cubre a todo el equipo.'],
    ['Disponibilidad', 'Si el servicio se cae, hay descuento en la factura.'],
    ['Datos', 'Los datos se pueden exportar en cualquier momento.'],
    ['Renovación', 'Se avisa 30 días antes de renovar.'],
  ], { country: 'MX' }),
  P('contrato-suministro', 'Suministro', 'Para contratos de compra periódica de productos.', ME, '2026-08-14', [
    ['Entregas', 'Las entregas llegan en máximo 10 días hábiles.'],
    ['Atrasos', 'Cada día de atraso tiene una multa.'],
    ['Calidad', 'Los productos defectuosos se reponen sin costo.'],
  ], { country: 'PE' }),
  P('contrato-trabajo', 'Contrato de trabajo', 'Para contratos de trabajo de nuevos ingresos.', 'Valentina Rojas', '2026-11-06', [
    ['Jornada', 'La jornada y el horario están escritos.'],
    ['Sueldo', 'El sueldo y la fecha de pago están claros.'],
    ['Confidencialidad', 'Incluye una cláusula de confidencialidad.'],
    ['Teletrabajo', 'Si hay teletrabajo, se indica dónde y cuándo.'],
  ]),
  P('dpa-21719', 'Tratamiento de datos', 'Para acuerdos con empresas que manejan datos personales por nosotros.', 'Ignacio Pérez', '2026-10-03', [
    ['Finalidad', 'Los datos solo se usan para lo acordado.'],
    ['Seguridad', 'Hay medidas de seguridad por escrito.'],
    ['Terceros', 'Compartir datos con otros requiere aprobación.'],
    ['Otros países', 'Los datos no salen del país sin aviso.'],
    ['Incidentes', 'Se avisa de cualquier filtración en 48 horas.'],
    ['Al terminar', 'Los datos se devuelven o se borran.'],
  ]),
  P('promesa-inmueble', 'Promesa de compraventa', 'Para promesas de compra de una propiedad.', 'Valentina Rojas', '2026-10-24', [
    ['Plazo', 'La escritura se firma dentro de 90 días.'],
    ['Multa', 'La multa por no cumplir es de hasta 10% del precio.'],
    ['Títulos', 'La compra depende de que los títulos estén en orden.'],
  ]),
  P('anexo-teletrabajo', 'Anexo de teletrabajo', 'Para anexos de trabajo remoto o híbrido.', 'Ignacio Pérez', '2026-10-17', [
    ['Lugar y horario', 'Se indica desde dónde y en qué horario se trabaja.'],
    ['Equipos', 'La empresa entrega los equipos.'],
  ]),
];
export const edited = (pb) => (pb.edited ? 'Edited ' + relTime(pb.edited) : 'Not saved yet');
export const visLabel = (v) => (v === 'shared' ? 'Shared' : 'Private');
export const visIcon = (v) => (v === 'shared' ? 'Users' : 'Lock');
export { plural, countryName };
let seq = 0;
export const newRule = (title = '', body = '') => ({ id: 'n' + (++seq), title, body });
export const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export const todayIso = () => '2026-11-07';

// ------------------------------------------------------------ formato de lectura (no cambia el dato)
const POS = [
  ['posición estándar', 'Posición estándar', 'var(--success)'],
  ['alternativa aceptable', 'Alternativa aceptable', 'var(--warning)'],
  ['inaceptable', 'Inaceptable', 'var(--destructive)'],
];
const posOf = (line) => POS.find(([k]) => line.trim().toLowerCase().startsWith(k));
export function RuleText({ body, dots = false, placeholder = 'No text yet.' }) {
  const lines = body.split('\n').filter((l) => l.trim());
  if (!lines.length) return html`<p class="empty">${placeholder}</p>`;
  return lines.map((l, i) => {
    const p = posOf(l);
    if (p && l.includes(':')) return html`<div class="pos" key=${i}><span class="lbl">${dots && html`<span class="dot" style=${'--dot:' + p[2]}></span>`}${p[1]}</span><span>${l.slice(l.indexOf(':') + 1).trim()}</span></div>`;
    if (/:\s*$/.test(l)) return html`<p class="sub" key=${i}>${l.replace(/:\s*$/, '')}</p>`;
    return html`<p class="plain" key=${i}>${l}</p>`;
  });
}
// Primera línea con contenido, sin la etiqueta de posición (para vistas previas).
export function firstLine(body) {
  for (const l of body.split('\n')) {
    if (!l.trim() || /:\s*$/.test(l)) continue;
    return posOf(l) && l.includes(':') ? l.slice(l.indexOf(':') + 1).trim() : l.trim();
  }
  return '';
}

// ------------------------------------------------------------ tooltip
export const Tip = ({ label, kbd, side, children }) => html`<span class="pb-tip" data-side=${side}>${children}<span role="tooltip" class="pb-tip-body">${label}${kbd && html`<kbd>${kbd}</kbd>`}</span></span>`;

// ------------------------------------------------------------ menú anclado (popover)
// items: [{ key, label, lead, count, disabled, danger }] | 'sep' | { head }
export function Menu({ anchor, items, selected = [], onSelect, onClose, width = 220, align = "start", cls }) {
  const ref = useRef();
  const opts = items.filter((i) => i && i.key !== undefined && !i.disabled);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState(null);
  useLayoutEffect(() => {
    const r = anchor.getBoundingClientRect();
    const h = ref.current?.offsetHeight || 200;
    let left = align === 'end' ? r.right - width : r.left;
    left = Math.max(8, Math.min(left, innerWidth - width - 8));
    let top = r.bottom + 4; if (top + h > innerHeight - 8) top = r.top - h - 4;
    setPos({ left, top });
  }, [anchor]);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); anchor.focus?.(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => (a + 1) % opts.length); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => (a - 1 + opts.length) % opts.length); }
      else if (e.key === 'Enter') { e.preventDefault(); opts[active] && onSelect(opts[active].key); }
    };
    const down = (e) => { if (!ref.current?.contains(e.target) && !anchor.contains(e.target)) onClose(); };
    document.addEventListener('keydown', key, true); document.addEventListener('mousedown', down);
    return () => { document.removeEventListener('keydown', key, true); document.removeEventListener('mousedown', down); };
  }, [active, opts.length]);
  return html`<${Portal}><div ref=${ref} role="menu" class=${cx("pb-menu", cls)} style=${`width:${width}px;` + (pos ? `left:${pos.left}px;top:${pos.top}px;` : 'visibility:hidden;left:0;top:0;')}>
    ${items.map((it) => {
      if (it === 'sep') return html`<div class="pb-menu-sep"></div>`;
      if (it.head) return html`<div class="pb-menu-head">${it.head}</div>`;
      const idx = opts.indexOf(it);
      return html`<button type="button" role="menuitemcheckbox" class=${cx('pb-menu-item', it.danger && 'danger')} aria-checked=${selected.includes(it.key)}
        aria-disabled=${it.disabled ? 'true' : undefined} data-active=${idx === active ? '' : undefined}
        onMouseEnter=${() => idx >= 0 && setActive(idx)} onClick=${() => !it.disabled && onSelect(it.key)}>
        ${it.lead !== undefined && html`<span class="lead">${it.lead}</span>`}
        <span class="label">${it.label}</span>
        ${it.count !== undefined && html`<span class="count">${it.count}</span>`}
        ${selected.includes(it.key) && html`<${Icon} name="Check" class="check" />`}
      </button>`;
    })}
  </div><//>`;
}
// Botón + menú. trigger(props) recibe ref, onClick y aria-expanded.
export function MenuButton({ trigger, defaultOpen, ...menu }) {
  const [el, setEl] = useState(null);
  const ref = useRef();
  useLayoutEffect(() => { if (defaultOpen) setTimeout(() => setEl(ref.current), 350); }, []);
  return html`${trigger({ ref, 'aria-expanded': el ? 'true' : 'false', 'aria-haspopup': 'menu', onClick: () => setEl(el ? null : ref.current) })}
    ${el && html`<${Menu} anchor=${el} ...${menu} onClose=${() => setEl(null)} onSelect=${(k) => { menu.onSelect(k); if (!menu.keepOpen) setEl(null); }} />`}`;
}

// ------------------------------------------------------------ buscador con "/"
export function SearchBox({ value, onInput, width, placeholder = "Search playbooks" }) {
  const ref = useRef();
  useEffect(() => {
    const key = (e) => {
      if (e.key !== '/' || e.metaKey || e.ctrlKey) return;
      const t = e.target; if (t.closest && t.closest('input, textarea, [contenteditable=true]')) return;
      e.preventDefault(); ref.current?.focus();
    };
    addEventListener('keydown', key); return () => removeEventListener('keydown', key);
  }, []);
  return html`<label class="pb-search" style=${width ? `width:${width}` : ''}>
    <${Icon} name="MagnifyingGlass" />
    <input ref=${ref} type="text" placeholder=${placeholder} aria-label=${placeholder} value=${value}
      onInput=${(e) => onInput(e.target.value)} onKeyDown=${(e) => e.key === 'Escape' && (onInput(''), e.target.blur())} />
    ${value ? html`<button type="button" class="pb-clear" aria-label="Clear search" onClick=${() => { onInput(''); ref.current.focus(); }}><${Icon} name="X" /></button>`
      : html`<span class="pb-kbd" aria-hidden="true">/</span>`}
  </label>`;
}

// ------------------------------------------------------------ filtros
export const EMPTY_FILTERS = { country: [], visibility: [], type: [] };
export const activeCount = (f) => ['country', 'visibility', 'type'].filter((k) => f[k].length).length;
export function applyFilters(items, q, f) {
  const s = q.trim().toLowerCase();
  return items.filter((p) => (!s || (p.name + ' ' + p.description).toLowerCase().includes(s))
    && (!f.country.length || f.country.includes(p.country))
    && (!f.visibility.length || f.visibility.includes(p.visibility))
    && (!SHOW_CONTRACT_TYPE || !f.type.length || f.type.includes(p.type)));
}
const COUNTRY_KEYS = ['CL', 'PE', 'CO', 'MX', 'AR'];
function Pill({ k, label, values, items, filters, setFilters }) {
  const vals = filters[k];
  const names = vals.map((v) => items.find((i) => i.key === v)?.label || v);
  const text = names.length ? (names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0]) : '';
  const toggle = (key) => setFilters({ ...filters, [k]: vals.includes(key) ? vals.filter((v) => v !== key) : [...vals, key] });
  return html`<${MenuButton} items=${items} selected=${vals} onSelect=${toggle} keepOpen
    trigger=${(p) => html`<button type="button" ...${p} class=${cx('pb-pill', vals.length && 'has-value')}>
      ${vals.length ? html`<span class="k">${label}:</span><span>${text}</span>
          <span class="x" role="button" aria-label=${'Clear ' + label} onClick=${(e) => { e.stopPropagation(); setFilters({ ...filters, [k]: [] }); }}><${Icon} name="X" /></span>`
        : html`${label}<${Icon} name="CaretDown" class="chev" />`}
    </button>`} />`;
}
export function FilterPills({ all, filters, setFilters }) {
  const count = (fn) => all.filter(fn).length;
  const countries = COUNTRY_KEYS.map((c) => ({ key: c, label: COUNTRY_NAMES[c], lead: FLAGS ? html`<${Flag} code=${c} class="pb-flag" />` : undefined, count: count((p) => p.country === c) }))
    .map((o) => ({ ...o, disabled: o.count === 0 && !filters.country.includes(o.key) }));
  const vis = [['private', 'Private', 'Lock'], ['shared', 'Shared', 'Users']].map(([key, label, ic]) => ({ key, label, lead: html`<${Icon} name=${ic} />`, count: count((p) => p.visibility === key) }));
  const types = CONTRACT_TYPES.map((t) => ({ key: t, label: t, count: count((p) => p.type === t) }));
  return html`<div class="pb-pills">
    <${Pill} k="country" label="Country" items=${countries} filters=${filters} setFilters=${setFilters} />
    <${Pill} k="visibility" label="Visibility" items=${vis} filters=${filters} setFilters=${setFilters} />
    ${SHOW_CONTRACT_TYPE && html`<${Pill} k="type" label="Contract type" items=${types} filters=${filters} setFilters=${setFilters} />`}
    ${activeCount(filters) >= 2 && html`<button type="button" class="pb-link" style="margin-left:4px" onClick=${() => setFilters(EMPTY_FILTERS)}>Clear all</button>`}
  </div>`;
}

// ------------------------------------------------------------ vista previa al pasar el mouse
// Abre tras 450ms de hover sostenido. Con una abierta, la vecina cambia sin espera (300ms de gracia).
// Se cierra 120ms después de salir de la card y del popover. Táctil: no se muestra.
export function usePreview(forced) {
  const [st, setSt] = useState(forced ? { id: forced, forced: true } : null);
  const t = useRef(); const open = useRef(!!forced); const closedAt = useRef(0);
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(hover: none)').matches;
  const show = (id, el) => {
    clearTimeout(t.current);
    if (open.current || Date.now() - closedAt.current < 300) { open.current = true; setSt({ id, el, swap: true }); return; }
    t.current = setTimeout(() => { open.current = true; setSt({ id, el }); }, 450);
  };
  const hide = () => {
    clearTimeout(t.current);
    t.current = setTimeout(() => {
      if (!open.current) return;
      open.current = false; closedAt.current = Date.now();
      setSt((s) => s && { ...s, closing: true });
      setTimeout(() => setSt((s) => (s && s.closing ? null : s)), 100);
    }, 120);
  };
  const close = () => { clearTimeout(t.current); open.current = false; setSt(null); };
  const bind = (id) => (touch ? {} : {
    onMouseEnter: (e) => show(id, e.currentTarget), onMouseLeave: hide,
    onFocus: (e) => show(id, e.currentTarget), onBlur: hide,
    onKeyDown: (e) => { if (e.key === 'Escape') close(); },
  });
  return { st, bind, keep: () => clearTimeout(t.current), hide, close };
}
export function Preview({ prev, items, anchorSel = (id) => `[data-pid="${id}"]` }) {
  const st = prev.st;
  const ref = useRef();
  const [pos, setPos] = useState(null);
  const pb = st && items.find((p) => p.id === st.id);
  useLayoutEffect(() => {
    if (!st) return;
    const el = (st.el && st.el.isConnected) ? st.el : document.querySelector(anchorSel(st.id));
    if (!el) return;
    let r = (el.querySelector('[data-anchor]') || el).getBoundingClientRect();
    const edge = el.closest('[data-preview-edge]');   // en la columna colapsada sale desde el borde de la columna
    if (edge) { const e = edge.getBoundingClientRect(); r = { left: e.left, right: e.right, top: r.top, bottom: r.bottom }; }
    const h = ref.current?.offsetHeight || 240, W = 320;
    // A la derecha si cabe; si no, a la izquierda; si tampoco (filas anchas), debajo del elemento.
    let left, top, origin;
    if (r.right + 8 + W <= innerWidth - 8) { left = r.right + 8; top = r.top; origin = 'left top'; }
    else if (r.left - 8 - W >= 8) { left = r.left - 8 - W; top = r.top; origin = 'right top'; }
    else { left = Math.max(8, Math.min(r.left, innerWidth - W - 8)); top = r.bottom + 6; origin = 'left top'; if (top + h > innerHeight - 8) top = r.top - h - 6; }
    top = Math.max(8, Math.min(top, innerHeight - h - 8));
    setPos({ left, top, origin });
  }, [st && st.id, st && st.el]);
  if (!st || !pb) return null;
  const shown = pb.rules.slice(0, 3);
  const more = pb.rules.length - shown.length;
  // Sin país ni fecha (ya están en la card): "+N rules" y el ícono de visibilidad con el estilo de la card.
  return html`<${Portal}><div ref=${ref} class=${cx('pb-preview', st.closing && 'is-closing', st.swap && 'is-swap')} role="tooltip"
      onMouseEnter=${prev.keep} onMouseLeave=${prev.hide}
      style=${pos ? `left:${pos.left}px;top:${pos.top}px;--origin:${pos.origin}` : 'visibility:hidden;left:0;top:0'}>
    <h4><span class="min-w-0 truncate">${pb.name}</span></h4>
    <p class="desc">${pb.description || 'No description'}</p>
    <hr />
    <p class="head"><span>Rules</span><span class="num">${pb.rules.length}</span></p>
    ${shown.length ? html`<ol>${shown.map((r, i) => html`<li><span class="n">${i + 1}</span><span class="t">${r.title || 'Untitled rule'}</span></li>`)}</ol>`
      : html`<p class="more" style="padding-left:0">No rules yet</p>`}
    <footer class="pb-meta"><span class="num">${more > 0 ? `+${more} ${more === 1 ? 'rule' : 'rules'}` : ''}</span>
      <span class=${'pb-vis is-' + pb.visibility} title=${visLabel(pb.visibility)}><${Icon} name=${visIcon(pb.visibility)} /></span></footer>
  </div><//>`;
}

// ------------------------------------------------------------ FLIP
const FLIP = { rects: null };
export const snapshot = () => { FLIP.rects = new Map(); document.querySelectorAll('[data-flip]').forEach((el) => FLIP.rects.set(el.dataset.flip, el.getBoundingClientRect())); };
export function playFlip() {
  const first = FLIP.rects; FLIP.rects = null;
  if (!first || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let i = 0, j = 0;
  document.querySelectorAll('[data-flip]').forEach((el) => {
    const b = el.getBoundingClientRect(); if (!b.width) return;
    const a = first.get(el.dataset.flip);
    // Lo que aparece entra con un fundido corto y escalonado (solo lo visible, para no demorar)
    if (!a || !a.width) {
      const vis = b.top < innerHeight && b.bottom > 0;
      el.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }],
        { duration: 280, delay: 140 + (vis ? Math.min(j++, 10) * 22 : 0), easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
      return;
    }
    const dx = a.left - b.left, dy = a.top - b.top;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
    el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 420, delay: Math.min(i++, 8) * 12, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
  });
}

// Fantasma: copia lo que se ve ahora encima de su lugar y lo desvanece, mientras lo nuevo entra debajo.
// Así el cambio de un playbook a otro (o de cards a filas) es un fundido cruzado y no un corte.
export function ghost(el, duration = 180) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect(); if (!r.width) return;
  const g = el.cloneNode(true);
  g.removeAttribute('id'); g.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
  g.setAttribute('aria-hidden', 'true'); g.inert = true;
  Object.assign(g.style, { position: 'fixed', left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px', margin: 0,
    zIndex: 40, pointerEvents: 'none', overflow: 'hidden', background: getComputedStyle(el).backgroundColor === 'rgba(0, 0, 0, 0)' ? 'var(--surface)' : '' });
  const host = el.closest('.pb') || document.body; host.appendChild(g);
  if (el.scrollTop) g.scrollTop = el.scrollTop;
  g.animate([{ opacity: 1 }, { opacity: 0 }], { duration, easing: 'ease-out', fill: 'forwards' }).onfinish = () => g.remove();
}

// Scroll suave de 200ms dentro de un contenedor (scroll-behavior no deja elegir duración).
export function scrollToIn(box, target, offset = 24) {
  if (!box || !target) return;
  const from = box.scrollTop;
  const to = from + target.getBoundingClientRect().top - box.getBoundingClientRect().top - offset;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { box.scrollTop = to; return; }
  const t0 = performance.now();
  const step = (t) => { const k = Math.min(1, (t - t0) / 200); box.scrollTop = from + (to - from) * (1 - Math.pow(1 - k, 3)); if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
