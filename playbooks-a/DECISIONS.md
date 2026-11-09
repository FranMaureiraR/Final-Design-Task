# Rediseño A: Índice + panel

De 3 columnas que compiten a 2 zonas con jerarquía clara: índice de playbooks a la izquierda y resumen del playbook. Cada regla se edita en un panel lateral que se puede expandir. Primero se lee y después se edita, sin perder el contexto.

## Decisiones

| Cambio | Problema en la vista actual | Por qué esta solución | Referencia |
|---|---|---|---|
| 2 zonas: índice (280px) + resumen | 3 columnas (lista, Name/Description, Rules) compiten por el ancho | Una sola zona protagonista. El ancho que ocupaba Name/Description pasa a las reglas | Front (AI replies) |
| Nombre y descripción editables en el encabezado | Name y Description viven en inputs con borde, en una columna propia | Se leen como título y párrafo. El borde aparece solo en hover/focus | Claude |
| Título en la serif de Magnar | Toda la pantalla tiene el mismo peso tipográfico | Es la serif del "How can I help you?" del home. Un solo uso, a nivel de página | Claude, home de Magnar |
| Metadatos con significado explícito | "1 · Chile · Private": el "1" no dice qué cuenta | "3 rules · Chile · Private · 2d ago". Cada dato se explica solo | Fintual, Vercel |
| Candado / ícono de personas para la visibilidad | El badge de "Private" pesa más que el nombre | Ícono + palabra, en muted. Nunca solo color | Vercel |
| Seleccionado con fondo tint sutil | El seleccionado usa el mismo gris que el hover | El tint de Magnar (`--tint-surface`) se distingue a la primera, sin bordes | Tokens de Magnar |
| Regla nombrada por su cláusula + 3 indicadores | "Rule 1" + textarea mono: hay que leer todo para saber qué cubre | Título de cláusula, resumen de 1 línea y punto Standard · Fallback · Unacceptable. Un punto vacío marca la posición que falta | Harvey / Spellbook |
| Panel lateral con ‹ › expandir y cerrar | Editar exige recorrer una columna de textareas | Se edita una regla a la vez sin salir de la lista. Esc, ⌘↑ y ⌘↓ quedan en tooltips | Front (Audit logs) |
| 3 campos con barra de color de 3px | Las 3 posiciones se escriben mezcladas en texto libre | La estructura que Magnar ya usa queda visible. El color va solo en la barra | Harvey / Spellbook |
| "Edit as text" | Quien escribe de corrido perdería el formato actual | Mismo formato de texto de hoy. Se traduce a campos y de vuelta | Magnar actual |
| Estado de guardado junto al título | Save gris aislado en una esquina, lejos de lo editado | "Unsaved changes · Discard · Save" donde está la atención. Luego "Saved" | Front (Branching rules) |
| Container queries en vez de media queries | En vista dividida la columna de reglas queda con 0px (ver abajo) | Bajo 760px de contenedor: selector en el encabezado, reglas a todo el ancho y panel como hoja con "← Back" | Bug actual |

## Causa del bug de scroll en vista dividida

El editor original usa breakpoints de **ventana** (`md:`, `xl:`), no del panel. Con la ventana a 1440px y el panel al 50% (≈690px), `xl:` sigue activo:

1. El form pasa a fila (`xl:flex-row`): lista de 320px (`xl:w-80`) + columna Name/Description de 384px (`xl:w-96`) = **704px**, más que los 690px disponibles.
2. La sección de reglas tiene `min-w-0 flex-1`, así que se encoge a **0px**. La lista de reglas queda con 32px de ancho y ≈12.700px de alto: existe, pero no se puede usar.
3. El form tiene `xl:overflow-hidden`, así que recorta todo y no hay scroll horizontal de rescate.
4. Además hay dos scrolls anidados (el form y la lista de reglas), que compiten por la rueda del mouse.

Se reproduce en `/playbooks-before/?split=50`, que carga `playbooks/app.js` sin modificarlo. Captura: `screenshots/original/04-split-50.png`.

**Solución en A:** `container-type: inline-size` en el contenedor y `@container pa (width < 760px)`. Cada zona tiene un solo scroll (`min-height: 0` + `overflow-y: auto` solo en `.pa-scroll`, `.pa-index nav` y `.pa-panel-body`). Verificado a 1440×900 en 50/50 (panel de 682px) y 60/40 (544px).

## Qué se reutilizó (Paso 0)

- **Tokens** (`:root`, oklch): `--background`, `--foreground`, `--muted`, `--muted-foreground`, `--border`, `--ring`, `--primary`, `--success`, `--warning`, `--destructive`, `--radius: .625rem` y el tint `--tint-hue: 250` con `--tint-surface`, `--tint-wash` y `--tint-ink`.
- **Tipografía:** Inter (`--font-sans`) en toda la interfaz. **Magnar Title** (`--title-font`, la serif del home) solo en el título del playbook.
- **Componentes:** `AppShell`, `PageHeader`, `Breadcrumb`, `Dialog`, `Select`, `Popover`, `Field`, íconos Phosphor y banderas, y las clases exactas de botones, inputs, badge y pie de lista.
- **De revision-nda:** `PlaybookReview`, para la vista previa "How it will look in the review".
- **Carga:** la animación de puntos `thread-work-*` de Magnar.

## Qué se agregó y por qué

- `styles/redesign.css` + `playbooks-a/styles.css`: el CSS de Magnar viene compilado y no trae container queries ni clases nuevas. Todo usa los tokens de arriba: no hay colores, fuentes ni radios nuevos.
- 10 íconos Phosphor (regular, misma familia) en `shared/icons.js`: CaretUp, ArrowsOutSimple, ArrowsInSimple, ArrowLeft, Users, FileArrowUp, TextAlignLeft, File, ArrowDown y ChatText.
- Tooltip propio (`.rd-tip`) con el aspecto del tooltip de shadcn (`bg-foreground` / `text-background`), porque la recreación no tenía uno.
- Las flechas del panel son ↑ ↓ y no ‹ ›: la lista de reglas es vertical y los atajos son ⌘↑ / ⌘↓.

## Estados (URL → captura en `screenshots/playbooks-a/`)

| Estado | URL |
|---|---|
| Lista con 6 playbooks | `#/` |
| Empty state | `#/?empty=1` |
| Crear: desde contrato / describir / en blanco | `#/?new=1&start=contract` · `start=describe` · `start=blank` |
| Extrayendo reglas | `#/servicios-cloud?demo=loading&hold=1` |
| Reglas sugeridas | `#/servicios-cloud?demo=suggested` |
| Resumen | `#/nda-proveedores` |
| Panel normal / expandido | `#/nda-proveedores?rule=r2` · `?rule=r3&expand=1` |
| Cambios sin guardar | `#/nda-proveedores?dirty=1` |
| Vista dividida 50/50 · 60/40 | `?split=50#/nda-proveedores` · `?split=60#/…` |
