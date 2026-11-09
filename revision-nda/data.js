// Contenido de la conversación "Revisión de NDA" tal como está en Magnar (copiado el 6-nov-2026).

export const FILE_NAME = 'NDA-Google-Drive.txt';

// Ícono de archivo .txt que usa Magnar (SVG embebido)
export const TXT_ICON = "data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2040%2048%22%3E%0A%3Cdefs%3E%3CclipPath%20id%3D%22page%22%3E%3Crect%20width%3D%2240%22%20height%3D%2248%22%20rx%3D%223%22%2F%3E%3C%2FclipPath%3E%3C%2Fdefs%3E%0A%3Cg%20clip-path%3D%22url(%23page)%22%3E%3Cpath%20d%3D%22M0%200h28l12%2012v36H0Z%22%20fill%3D%22%23fff%22%2F%3E%0A%3Cpath%20d%3D%22M28%200v9a3%203%200%200%200%203%203h9%22%20fill%3D%22%23e5e7eb%22%2F%3E%0A%3Cpath%20d%3D%22M0%2034h40v14H0Z%22%20fill%3D%22%232b579a%22%2F%3E%3Ctext%20x%3D%2220%22%20y%3D%2244%22%20font-family%3D%22Arial%2C%20sans-serif%22%20font-size%3D%229%22%20font-weight%3D%22bold%22%20text-anchor%3D%22middle%22%20fill%3D%22%23fff%22%3ETXT%3C%2Ftext%3E%3C%2Fg%3E%0A%3Cg%20transform%3D%22translate(-4%200)%22%20fill%3D%22%232b579a%22%3E%3Cpath%20d%3D%22M12%204H0v2h12V4zM0%2010h18V8H0v2zM0%200v2h18V0H0z%22%20transform%3D%22translate(15%2015)%22%20fill-rule%3D%22evenodd%22%3E%3C%2Fpath%3E%3C%2Fg%3E%0A%3Cpath%20d%3D%22M3%20.5h24.8L39.5%2012v33a2.5%202.5%200%200%201-2.5%202.5H3A2.5%202.5%200%200%201%20.5%2045V3A2.5%202.5%200%200%201%203%20.5Z%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-opacity%3D%22.2%22%2F%3E%0A%3C%2Fsvg%3E";

// Texto actual del archivo de la conversación (después de "rehacelo")
export const DOCUMENT = {
  title: 'ACUERDO DE CONFIDENCIALIDAD',
  clauses: [
    'Duración de la Confidencialidad: Las Partes acuerdan que toda la Información Confidencial entregada bajo este acuerdo mantendrá su carácter confidencial durante tres años contados desde la fecha de suscripción.',
    'Ley Aplicable: El presente acuerdo se regirá e interpretará de acuerdo con las leyes del Estado de Nueva York, EE. UU., sometiéndose las partes a la jurisdicción exclusiva de los tribunales de Manhattan.',
    'Limitación de Responsabilidad: La responsabilidad total de cada Parte derivada del incumplimiento de este acuerdo estará limitada al monto contratado o a USD $10,000, lo que sea mayor.',
  ],
};
export const DOCUMENT_RAW = DOCUMENT.title + '\n' + DOCUMENT.clauses.map((c, i) => `${i + 1}. ${c}`).join('\n');

// Textos que resalta cada cita "1" (quote del enlace original)
export const Q = {
  incompleta: 'toda la Información Confidencial entregada bajo este acuerdo La responsabilidad total',
  sinLimite: 'cualquier daño o perjuicio directo o indirecto, sin limitación de monto',
  limite: 'limitada al monto contratado o a USD $10,000, lo que sea mayor',
  tresAnios: 'durante tres años contados desde la fecha de suscripción',
  responsabilidad: 'La responsabilidad total de cada Parte derivada del incumplimiento de este acuerdo estará limitada al monto contratado o a USD $10,000, lo que sea mayor',
  ley: 'las leyes del Estado de Nueva York, EE. UU., sometiéndose las partes a la jurisdicción exclusiva de los tribunales de Manhattan.',
};

// Pasos de "Worked for" (icon: null = paso sin ícono)
export const STEPS = {
  m1: [
    [null, 'Inspecting playbook and plugin discovery'], ['FileText', 'Revisando cómo ejecutar el playbook'], ['FolderOpen', 'Buscando la conexión de Google Drive'],
    ['FolderOpen', 'Revisando los archivos de la conversación'], [null, 'Checking for available plugins'], ['Cube', 'Consultando los playbooks disponibles'], [null, 'Requesting document access'],
  ],
  m3: [
    [null, 'Retrieving Google Doc content'], ['Globe', 'Abriendo el NDA compartido'], [null, 'Attempting URL export'], ['Globe', 'Intentando obtener el texto completo del NDA'],
    [null, 'Saving and running playbook'], ['FileText', 'Guardando el texto del NDA para su revisión'], ['Cube', 'Revisando las reglas del playbook'], ['Cube', 'Ejecutando el playbook sobre el NDA'],
    ['ListChecks', 'Preparando playbook'], ['SealCheck', 'Regla 1 · Rule 1'], ['FileText', 'Guardando resultado'], ['CheckCircle', 'Acción completada'],
  ],
  m5: [
    [null, 'Noticing exact change causes issues'], ['FileText', 'Aplicando el cambio solicitado al NDA'], [null, 'Preparing exact citations'],
    ['FileText', 'Consultando el formato de hallazgos'], [null, 'Noting document block warning'],
  ],
  m9: [
    [null, 'Correcting with playbook and preserving law'], ['FileText', 'Revisando el texto actual del NDA'], ['FileText', 'Corrigiendo la duración y el límite de responsabilidad'],
    [null, 'Gathering UI files'], ['FileText', 'Preparando el archivo corregido'],
  ],
};

// Resultado de aplicar el playbook "NDA de Proveedores"
export const REVIEW = {
  playbook: 'NDA de Proveedores',
  rules: [{
    verdict: 'Unacceptable',
    name: 'Rule 1',
    summary: 'La confidencialidad es indefinida, lo que excede el máximo aceptable de 5 años. Además, el acuerdo elige leyes y tribunales de EE. UU. y establece responsabilidad sin límite, ambos riesgos inaceptables según la regla.',
    // Cada opción: lista de segmentos [tipo, texto] — tipo: 'ins' (agregado), 'del' (eliminado), 'txt' (igual)
    options: [
      [['ins', 'Las Partes acuerdan que toda la Información Confidencial entregada bajo este acuerdo'], ['txt', ' mantendrá su carácter confidencial '], ['del', 'de forma indefinida'], ['sp'], ['ins', 'por un plazo de 3 años'], ['txt', ' a contar de la fecha de suscripción.']],
      [['del', 'mantendrá su carácter confidencial de forma indefinida a contar de la fecha de suscripción'], ['sp'], ['ins', 'El presente acuerdo se regirá e interpretará de acuerdo con las leyes de Chile, sometiéndose las partes a la jurisdicción de los tribunales de Santiago'], ['txt', '.']],
      [['del', 'mantendrá su carácter confidencial de forma indefinida a contar de la fecha de suscripción'], ['sp'], ['ins', 'La responsabilidad total de cada Parte derivada del incumplimiento de este acuerdo estará limitada al monto contratado o a USD $10,000, lo que sea mayor'], ['txt', '.']],
    ],
  }],
};

export const CONSEQUENCES = [
  { severity: 'High', where: 'Cláusula 1', title: 'Cláusula incompleta', quote: Q.incompleta, body: 'El reemplazo interrumpe la oración y elimina el plazo de confidencialidad.', excerpt: 'toda la Información Confidencial entregada bajo este acuerdo La responsabilidad total' },
  { severity: 'High', where: 'Cláusulas 1 y 3', title: 'Límites contradictorios', quote: Q.sinLimite, body: 'El nuevo límite contradice la responsabilidad sin límite de la cláusula 3.', excerpt: 'cualquier daño o perjuicio directo o indirecto, sin limitación de monto' },
];

export const DRIVE_URL = 'https://docs.google.com/document/d/1bRGlV-K8q-Xubts0PiPi8Wd\\_BnV-82Np\\_hpRpJ5i-qs/edit?usp=sharing';

// Playbooks disponibles en el menú "+ › Playbooks"
export const PLAYBOOKS = [{ name: 'NDA de Proveedores', description: 'Prueba', country: 'CL', countryName: 'Chile' }];
