# Propuesta "Refinada"

Los frames de Figma (39:8958, 39:9204, 39:10629/10630) llevados a producto terminado. Solo funciones que Magnar ya tiene.

## Decisiones

| Cambio | Qué había | Por qué | Referencia |
|---|---|---|---|
| Una sola acción de crear: "New playbook" negro a la derecha de los filtros | Card "Create new playbook" y "+" junto a los tabs | Una entrada por pantalla. El negro es el único color de marca: marca la acción principal | Vercel |
| Buscador + pills en una fila; pill con valor "Visibility: Private" en wash y × | Filtros escondidos tras un ícono | El filtro activo se lee sin abrir nada. Mismo alto (28/32) y radio (6) en toda la barra | Linear, Front |
| Encabezado de grupo "MY PLAYBOOKS 4", "3 of 4" con filtros | "My playbooks · 4" | El contador explica el filtro. 32px antes del grupo, 12 después: ritmo fijo | Vercel |
| Card de alto mínimo 112, 3 filas fijas, meta abajo | Cards de alto variable, descripción cortada a media palabra | Grilla pareja; la descripción usa 2 líneas con elipsis | Figma A/Index row |
| Candado neutro de 14 en ink-3 | Candado naranja | En naranja se leía como alerta. La visibilidad es un dato, no un aviso | Tokens de Magnar |
| Vista previa al pasar el mouse (450ms) | Para saber qué cubre un playbook había que abrirlo | Descripción completa + 3 primeras reglas, sin cambiar de pantalla. Cambia entre vecinas sin espera | Linear, Vercel |
| Biblioteca colapsada como filas de 52px | Cards en una columna angosta | Las cards desperdician alto en 340px. Seleccionado: wash + barra de 2px en ink | Figma 39:10629 |
| Crear como página, columna de 640 en el tercio superior | Modal de nombre + país | El título en serif marca la página; el subtítulo dice lo que pasa de verdad | Figma 39:9204 |
| Regla: cerrada → lectura → edición | Textarea mono siempre abierto, "Rule 1" | Número en columna fija, título y una línea. La lectura formatea el texto existente (subtítulos y "Posición estándar / Alternativa / Inaceptable") sin crear campos | Legora |
| Borrar con confirmación dentro de la card | Papelera sin confirmación | Confirmar donde está la atención, sin modal que tape la regla | Front |
| "Saved" / "Unsaved changes · Save" junto al título, ⌘S | Save gris aislado en una esquina | Misma función, donde se edita. Punto warning de 6px en la card | Front |
| Container queries; índice sticky con más de 5 reglas | Breakpoints de ventana: reglas en 0px en vista dividida | Bajo 760px de panel se oculta la biblioteca y aparece "← Playbooks". Un scroll por zona | Bug actual (abajo) |

## Causa del bug de scroll en vista dividida

El editor original usa breakpoints de **ventana** (`xl:`), no del panel. Con la ventana a 1440px y el panel al 50% (≈690px), `xl:flex-row` sigue activo: lista de 320px + columna Name/Description de 384px = 704px. La columna de reglas (`min-w-0 flex-1`) queda en **0px** y `xl:overflow-hidden` recorta el resto. Además hay dos scrolls anidados. Captura: `screenshots/original/04-split-50.png`.

**Solución:** `container: pr / inline-size` y `@container pr (width < 760px)`. Cada zona con `min-height: 0` + `overflow-y: auto`. Verificado en 50/50, 60/40 y 40/60.

## Sistema y valores

- Tokens en `shared/pb-system.css`, todos desde el `:root` de Magnar: ink 14,5% · ink-2 45% · ink-3 62% · line 92,2% · line-strong 87% · canvas 98,5% · wash = `--tint-wash`.
- Inter 400/500 (600 solo en "Knowledge"); Newsreader 400 solo en títulos de página. Números con `tabular-nums`.
- Radios 6 (controles) · 8 (cards) · 12 (paneles). Sombra solo en menús y en la vista previa.
- Íconos Phosphor regular, la familia que ya usa Magnar (el brief pide trazo 1.5; Phosphor regular es la versión de Magnar y se mantiene).
- **Contract type:** no existe en Magnar. Queda construido detrás de `SHOW_CONTRACT_TYPE = false` (en `shared/pb-kit.js`); si se activa, se infiere del nombre del playbook o lo asigna el autor.

## Estados (URL → `screenshots/playbooks-refinada/`)

| Estado | URL |
|---|---|
| Biblioteca · vacía · cargando · sin resultados · filtro activo | `#/` · `?empty=1` · `?loading=1` · `?q=arriendo` · `?vis=private` |
| Vista previa (grilla / columna) | `#/?preview=nda-proveedores` · `#/nda-proveedores?preview=dpa-21719` |
| Crear vacío · 1 regla en edición · 3 reglas | `#/new` · `?demo=1` · `?demo=3` |
| Detalle · lectura · edición · confirmar borrado | `#/nda-proveedores` · `?rule=r1` · `?edit=r2` · `?del=r3` |
| Sin guardar · guardado · índice (biblioteca oculta) | `?dirty=1` · luego "Save" · `#/servicios-ti?wide=1` |
| Vista dividida 50/50 · 60/40 · 40/60 | `?split=50#/…` · `?split=60` · `?split=40` |

La vista previa cambiando entre cards vecinas está como secuencia: `07-preview-a`, `08-preview-b`, `09-preview-c` (no hay ffmpeg en este equipo para armar un GIF).
