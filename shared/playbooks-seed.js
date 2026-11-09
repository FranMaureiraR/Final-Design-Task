// Datos y utilidades compartidas por los rediseños de Playbooks (A, B y C).
// Las tres variantes usan el mismo contenido para que la comparación sea justa.
// Cada regla guarda las 3 posiciones por separado; `ruleToText` / `textToRule` las convierten
// al formato de texto libre que Magnar usa hoy ("Posición Estándar (Ideal): …").

export const TODAY = new Date('2026-11-07T12:00:00-03:00');
export const ME = 'Francisca Maureira';

export const COUNTRY_NAMES = { CL: 'Chile', PE: 'Peru', CO: 'Colombia', MX: 'México', AR: 'Argentina' };

export const CONTRACT_TYPES = ['NDA', 'Lease', 'Services', 'Employment', 'Data protection', 'M&A'];

const r = (id, title, standard, fallback, unacceptable) => ({ id, title, standard, fallback, unacceptable });

export const PLAYBOOKS = [
  {
    id: 'nda-proveedores', name: 'NDA de Proveedores', type: 'NDA',
    description: 'Para acuerdos de confidencialidad unilaterales y mutuos con proveedores y contratistas.',
    country: 'CL', visibility: 'private', owner: ME, edited: '2026-11-05',
    rules: [
      r('r1', 'Duración de la confidencialidad', 'La obligación de confidencialidad dura 3 años desde la fecha de firma.', 'Máximo 5 años desde la fecha de firma.', 'Duración indefinida o superior a 5 años.'),
      r('r2', 'Ley aplicable y jurisdicción', 'Leyes de Chile y tribunales ordinarios de Santiago.', 'Arbitraje ante el Centro de Arbitraje y Mediación (CAM) Santiago.', 'Leyes o tribunales extranjeros, por ejemplo de EE. UU. o Inglaterra.'),
      r('r3', 'Límite de responsabilidad', 'La responsabilidad total queda limitada al monto contratado o a USD 10.000.', '', 'Responsabilidad ilimitada o cláusulas de indemnización abiertas, sin tope.'),
    ],
  },
  {
    id: 'arrendamiento-comercial', name: 'Arrendamiento comercial (arrendatario)', type: 'Lease',
    description: 'Revisión de contratos de arriendo de oficinas y locales desde la posición del arrendatario.',
    country: 'CL', visibility: 'shared', owner: ME, edited: '2026-11-02',
    rules: [
      r('r1', 'Plazo y renovación', 'Plazo de 5 años con renovación automática por períodos iguales, salvo aviso con 6 meses de anticipación.', 'Plazo de 3 años con opción de renovación a favor del arrendatario.', 'Plazo menor a 2 años o renovación sujeta solo a la voluntad del arrendador.'),
      r('r2', 'Reajuste de la renta', 'Reajuste anual según la variación del IPC.', 'Reajuste anual de IPC más 1%.', 'Reajustes discrecionales del arrendador o superiores a IPC más 2%.'),
      r('r3', 'Garantía', 'Garantía equivalente a un mes de renta, restituida dentro de 30 días desde la entrega del inmueble.', '', 'Garantía superior a dos meses de renta o boleta bancaria a la vista sin plazo.'),
      r('r4', 'Término anticipado', 'El arrendatario puede terminar con aviso de 90 días y sin multa desde el segundo año.', 'Multa máxima equivalente a tres meses de renta.', 'Sin derecho a término anticipado para el arrendatario.'),
      r('r5', 'Mejoras', 'Las mejoras útiles se reembolsan al arrendatario al término del contrato.', 'Las mejoras quedan a favor del arrendador si fueron autorizadas por escrito.', 'Obligación de retirar todas las mejoras a costo del arrendatario.'),
    ],
  },
  {
    id: 'servicios-ti', name: 'Prestación de servicios TI', type: 'Services',
    description: 'Contratos de desarrollo de software, soporte y servicios cloud con proveedores tecnológicos.',
    country: 'CL', visibility: 'private', owner: ME, edited: '2026-10-17',
    rules: [
      r('r1', 'Niveles de servicio (SLA)', 'Disponibilidad mensual de 99,5% con créditos de servicio por incumplimiento.', 'Disponibilidad de 99% con créditos de servicio.', 'Sin SLA medible ni compensación por incumplimiento.'),
      r('r2', 'Propiedad intelectual', 'Los desarrollos a medida son de propiedad del cliente desde su pago.', 'Licencia perpetua, exclusiva e irrevocable a favor del cliente.', 'El proveedor retiene la propiedad y puede reutilizar los desarrollos sin restricción.'),
      r('r3', 'Tratamiento de datos', 'El proveedor actúa como encargado y trata los datos solo según instrucciones del cliente.', '', 'Uso de los datos para fines propios del proveedor.'),
      r('r4', 'Límite de responsabilidad', 'Tope equivalente a 12 meses de honorarios, excluyendo dolo, culpa grave y datos personales.', 'Tope de 6 meses de honorarios con las mismas exclusiones.', 'Tope inferior a 3 meses de honorarios o sin exclusiones.'),
      r('r5', 'Plazo de pago', '30 días desde la recepción conforme de la factura.', 'Hasta 45 días desde la recepción de la factura.', 'Pago anticipado total o intereses sobre el máximo convencional.'),
      r('r6', 'Término por conveniencia', 'El cliente puede terminar con aviso de 30 días, pagando solo los servicios prestados.', 'Aviso de 60 días.', 'Sin término por conveniencia o con multa por terminar.'),
      r('r7', 'Subcontratación', 'Requiere autorización previa y por escrito del cliente.', 'Permitida con aviso previo y responsabilidad solidaria del proveedor.', ''),
    ],
  },
  {
    id: 'contrato-trabajo', name: 'Contrato de trabajo', type: 'Employment',
    description: 'Contratos individuales de trabajo para cargos administrativos y profesionales.',
    country: 'CL', visibility: 'shared', owner: 'Catalina Soto', edited: '2026-11-06',
    rules: [
      r('r1', 'Jornada', 'Jornada ordinaria de 42 horas semanales, conforme a la Ley 21.561.', 'Jornada parcial pactada por escrito, de hasta 30 horas semanales.', 'Jornada superior al máximo legal o sin distribución definida.'),
      r('r2', 'Remuneración', 'Sueldo base mensual fijo, con fecha de pago y gratificación legal explícitas.', 'Remuneración variable con un mínimo garantizado no inferior al ingreso mínimo.', 'Remuneración inferior al ingreso mínimo mensual o sin fecha de pago.'),
      r('r3', 'No competencia', 'Sin cláusula de no competencia posterior al contrato.', 'Hasta 6 meses, limitada al mismo rubro y con compensación económica.', 'No competencia sin compensación o superior a 12 meses.'),
      r('r4', 'Teletrabajo', 'Modalidad y lugar de teletrabajo definidos, con derecho a desconexión de 12 horas.', '', 'Sin derecho a desconexión.'),
    ],
  },
  {
    id: 'dpa-21719', name: 'DPA (Ley 21.719 de datos personales)', type: 'Data protection',
    description: 'Acuerdos de tratamiento de datos con encargados, según la nueva ley de protección de datos.',
    country: 'CL', visibility: 'shared', owner: 'Tomás Rivas', edited: '2026-10-02',
    rules: [
      r('r1', 'Finalidad del tratamiento', 'Los datos se tratan solo para los fines del contrato principal.', 'Fines compatibles, informados previamente al responsable.', 'Tratamiento para fines propios del encargado.'),
      r('r2', 'Medidas de seguridad', 'Medidas técnicas y organizativas documentadas y auditables una vez al año.', 'Certificación ISO 27001 vigente en reemplazo de la auditoría.', 'Sin obligación de medidas de seguridad específicas.'),
      r('r3', 'Notificación de brechas', 'Aviso al responsable dentro de 24 horas desde que se conoce la brecha.', 'Aviso dentro de 48 horas.', 'Sin plazo de aviso o plazo superior a 72 horas.'),
      r('r4', 'Subencargados', 'Requieren autorización previa y por escrito del responsable.', 'Autorización general, con aviso de cambios y derecho a objetar.', 'Libre designación de subencargados.'),
      r('r5', 'Transferencia internacional', 'Solo a países con nivel adecuado de protección según la Agencia de Protección de Datos.', 'Con cláusulas contractuales tipo aprobadas.', 'Transferencias internacionales sin garantías.'),
      r('r6', 'Devolución y eliminación', 'Devolución y eliminación de los datos dentro de 30 días desde el término.', '', 'Conservación indefinida de los datos.'),
    ],
  },
  {
    id: 'compraventa-acciones', name: 'Compraventa de acciones', type: 'M&A',
    description: 'Contratos de compraventa de acciones de sociedades anónimas cerradas, desde el comprador.',
    country: 'CL', visibility: 'private', owner: ME, edited: '2026-09-10',
    rules: [
      r('r1', 'Declaraciones y garantías', 'Declaraciones del vendedor sobre títulos y contingencias tributarias y laborales, vigentes por 3 años.', 'Vigencia de 2 años, con tope de 30% del precio.', 'Venta "como está", sin declaraciones del vendedor.'),
    ],
  },
];

// Reglas que Magnar "sugiere" al extraer de un contrato modelo (crear playbook → desde un contrato).
export const SUGGESTED_FROM_CONTRACT = {
  file: 'Contrato-Servicios-Cloud-2026.pdf',
  rules: [
    r('s1', 'Niveles de servicio (SLA)', 'Disponibilidad mensual de 99,9% medida por el proveedor.', 'Disponibilidad de 99,5% con créditos de servicio.', 'Sin compromiso de disponibilidad.'),
    r('s2', 'Ubicación de los datos', 'Datos alojados en Chile o en países con nivel adecuado de protección.', 'Alojamiento en EE. UU. con cláusulas contractuales tipo.', 'Ubicación no informada o modificable sin aviso.'),
    r('s3', 'Renovación automática', 'Renovación anual con aviso de no renovación de 30 días.', '', 'Renovación por períodos mayores a un año sin aviso.'),
    r('s4', 'Reajuste de precios', 'Precio fijo durante el primer año y reajuste anual según IPC.', 'Reajuste anual de hasta 5%.', 'Cambios de precio unilaterales durante la vigencia.'),
  ],
};

// ------------------------------------------------------------ helpers
export const countryName = (c) => COUNTRY_NAMES[c] || 'No country';
export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
export const blankRule = (n) => r('n' + Date.now().toString(36) + n, '', '', '', '');

export function daysAgo(iso) { return Math.round((TODAY - new Date(iso + 'T12:00:00-03:00')) / 864e5); }
// "today", "yesterday", "2 days ago", "3 weeks ago", "2 months ago"
export function relTime(iso) {
  const d = daysAgo(iso);
  if (d <= 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 14) return `${d} days ago`;
  if (d < 45) return `${Math.round(d / 7)} weeks ago`;
  return `${Math.round(d / 30)} months ago`;
}
// Versión corta para filas densas: "2d", "3w", "2mo"
export function relShort(iso) {
  const d = daysAgo(iso);
  if (d <= 0) return 'today';
  if (d < 14) return `${d}d ago`;
  if (d < 45) return `${Math.round(d / 7)}w ago`;
  return `${Math.round(d / 30)}mo ago`;
}
export const fullDate = (iso) => new Date(iso + 'T12:00:00-03:00').toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });

export const POSITIONS = [
  { key: 'standard', label: 'Standard', long: 'Standard position', color: 'var(--success)', text: 'Posición Estándar (Ideal)' },
  { key: 'fallback', label: 'Fallback', long: 'Acceptable fallback', color: 'var(--warning)', text: 'Alternativa Aceptable (Fallback)' },
  { key: 'unacceptable', label: 'Unacceptable', long: 'Unacceptable (red flag)', color: 'var(--destructive)', text: 'Inaceptable (Red Flag)' },
];

// Formato de texto libre que Magnar usa hoy en el textarea de cada regla.
export function ruleToText(rule) {
  const lines = [rule.title ? rule.title + ':' : ''];
  POSITIONS.forEach((p) => { if (rule[p.key]) lines.push(`${p.text}: ${rule[p.key]}`); });
  return lines.filter(Boolean).join('\n');
}
export function textToRule(text, base) {
  const out = { ...base, standard: '', fallback: '', unacceptable: '' };
  const lines = text.split('\n');
  let current = null;
  lines.forEach((line, i) => {
    const p = POSITIONS.find((x) => line.toLowerCase().startsWith(x.text.toLowerCase()));
    if (p) { current = p.key; out[current] = line.slice(p.text.length).replace(/^\s*:\s*/, ''); }
    else if (i === 0 && !current) out.title = line.replace(/:\s*$/, '');
    else if (current) out[current] += (out[current] ? '\n' : '') + line;
  });
  return out;
}
export const missingFallback = (pb) => pb.rules.filter((x) => !x.fallback.trim()).length;
export const emptyCells = (pb) => pb.rules.reduce((n, x) => n + POSITIONS.filter((p) => !x[p.key].trim()).length, 0);

// ------------------------------------------------------------ estado en la URL
// Cada estado del prototipo tiene su propia URL (sirve para navegar y para las capturas).
// Formato: #/<ruta>?k=v&k2=v2
export function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [path, q = ''] = h.split('?');
  return { path, params: Object.fromEntries(new URLSearchParams(q)) };
}
export function hashFor(path, params = {}) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== false && v !== ''));
  const s = q.toString();
  return '#/' + path + (s ? '?' + s : '');
}
// Vista dividida: ?split=50 (o 40, 60) en la query normal de la página = % del chat a la izquierda.
export const splitParam = () => { const v = new URLSearchParams(location.search).get('split'); return v ? Number(v) : null; };
