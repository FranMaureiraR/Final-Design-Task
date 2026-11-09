// Datos de ejemplo (iguales a los de la cuenta al momento de capturar).
export const COUNTRIES = [
  { code: 'CL', name: 'Chile' }, { code: 'PE', name: 'Peru' }, { code: 'CO', name: 'Colombia' },
  { code: 'CR', name: 'Costa Rica' }, { code: 'AR', name: 'Argentina' }, { code: 'UY', name: 'Uruguay' },
  { code: 'EC', name: 'Ecuador' }, { code: 'BR', name: 'Brasil' }, { code: 'MX', name: 'México' },
  { code: 'PY', name: 'Paraguay' }, { code: 'BO', name: 'Bolivia' }, { code: 'PA', name: 'Panamá' },
  { code: 'GT', name: 'Guatemala' }, { code: 'DO', name: 'República Dominicana' },
];

// Playbook real de la cuenta: es el que se aplica en la conversación "Revisión de NDA".
export const SEED_PLAYBOOKS = [
  {
    id: 'pbk-01a1b29e-78ab', name: 'NDA de Proveedores', description: 'Prueba', country: 'CL', mine: true,
    rules: [{
      id: 'r1', name: 'Rule 1',
      body: `Cláusula de Confidencialidad / Duración:
Posición Estándar (Ideal): La obligación de confidencialidad debe durar 3 años desde la fecha de firma.
Alternativa Aceptable (Fallback): Máximo 5 años.
Inaceptable (Red Flag): Duración indefinida o superior a 5 años.
Ley Aplicable y Jurisdicción:
Posición Estándar (Ideal): Leyes de Chile y tribunales de Santiago.
Alternativa Aceptable (Fallback): Arbitraje (ej. CAM Santiago).
Inaceptable (Red Flag): Leyes de jurisdicciones extranjeras (ej. EE. UU. o Inglaterra).
Límite de Responsabilidad (Indemnización):
Posición Estándar (Ideal): La responsabilidad total está limitada al monto contratado o a USD $10,000.
Inaceptable (Red Flag): Responsabilidad ilimitada o cláusulas de indemnización abierta sin tope.`,
    }],
  },
];
