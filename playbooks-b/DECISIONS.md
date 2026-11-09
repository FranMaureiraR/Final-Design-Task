# Rediseño B: Documento

Un playbook es la posición de un estudio frente a un tipo de contrato, es decir, un documento. Hoy se presenta como formulario (inputs + textarea mono). Aquí se lee como documento, en una columna de arriba a abajo, y se edita donde se lee.

## Decisiones

| Cambio | Problema en la vista actual | Por qué esta solución | Referencia |
|---|---|---|---|
| Biblioteca en su propia página | La lista ocupa una columna fija aunque ya elegiste un playbook | Dentro del playbook no hace falta ver la lista. Es lo que más espacio libera | Vercel |
| Cambiar de playbook desde el breadcrumb | Para cambiar hay que volver a la lista lateral | El nombre en el breadcrumb abre un selector. Cuesta un click y no ocupa ancho | Vercel |
| Biblioteca agrupada: Mis playbooks / Compartidos conmigo | Todos los playbooks se ven iguales, sin autor ni fecha | Encabezados pequeños, filas con divisor hairline y columnas precisas | Vercel, Front (Audit logs) |
| Filtros como pills | Los filtros quedan escondidos tras un ícono | País, visibilidad y tipo de contrato quedan visibles. El activo muestra su valor | Front |
| Columna de lectura de 720px | Formulario a 3 columnas y textarea mono | Una sola línea de lectura, a un largo de línea cómodo | Claude |
| Título en la serif de Magnar | Nada distingue el nombre del playbook | La serif del home de Magnar, en un solo nivel: el título de la página | Claude, home de Magnar |
| Escalera Ideal → Acceptable → Unacceptable | Las 3 posiciones van mezcladas en texto libre | Cada posición en su fila. El color va solo en un punto unido por una línea fina | Harvey / Spellbook |
| Índice de reglas sticky | Con 7 reglas no hay forma de saltar a una | El outline marca la regla visible al hacer scroll. Se oculta bajo 1100px de contenedor | Vercel (docs) |
| Edición en el lugar | Editar y leer son pantallas distintas (inputs siempre visibles) | "Edit" aparece en hover. Los textos pasan a campos sin moverse y el resto baja su opacidad | Front (Branching rules) |
| "+ Add rule" entre secciones | Solo se puede agregar al final | Aparece en hover entre bloques, donde va la regla | Notion / Claude |
| Barra flotante de cambios | Save gris aislado, sin decir qué cambió | "2 unsaved changes · Discard · Save" aparece solo cuando hay cambios | Front |
| Crear como página con pregunta en serif | El modal de 2 campos no dice cómo empezar | "What type of contract will you review?" + 3 caminos en lista, con el lenguaje del home | Home de Magnar |

Microcopy: "Evaluated separately" reemplaza a "Each rule is evaluated with an independent AI call". Dice lo mismo sin jerga técnica (Fintual).

## Causa del bug de scroll en vista dividida

El editor original usa breakpoints de **ventana** (`md:`, `xl:`), no del panel. Con la ventana a 1440px y el panel al 50% (≈690px), `xl:` sigue activo:

1. El form se arma en fila: lista de 320px + Name/Description de 384px = 704px, más que los 690px disponibles.
2. La sección de reglas (`min-w-0 flex-1`) queda con **0px** de ancho.
3. `xl:overflow-hidden` recorta el resto, sin scroll horizontal.
4. Hay dos scrolls anidados (el form y la lista de reglas).

Se reproduce en `/playbooks-before/?split=50`, que carga `playbooks/app.js` sin modificarlo. Captura: `screenshots/original/04-split-50.png`.

**Solución en B:** al ser una sola columna, el layout se adapta solo. `@container pb (width < 1100px)` oculta el índice lateral y `(width < 760px)` baja el padding, apila la escalera y pasa la biblioteca a filas con metadatos en línea. Un solo scroll por panel (`.pb-scroll` con `min-height: 0` + `overflow-y: auto`). Verificado a 1440×900 en 50/50 (682px) y 60/40 (544px), con el chat a la izquierda.

## Qué se reutilizó (Paso 0)

- **Tokens:** `--background`, `--foreground`, `--muted-foreground`, `--border`, `--ring`, `--success`, `--warning`, `--destructive`, `--radius` y el tint (`--tint-hue`, `--tint-wash`, `--tint-ink`).
- **Tipografía:** Inter en toda la interfaz. **Magnar Title** (`--title-font`) solo en el título de cada página. Tamaños de texto: 12, 13, 15 y 17px, más el título.
- **Componentes:** `AppShell`, `PageHeader`, `Breadcrumb`, `Popover`, `Select`, íconos Phosphor, banderas, y las clases de botones, inputs y textarea de Magnar.

## Qué se agregó y por qué

- `styles/redesign.css` + `playbooks-b/styles.css`: hacen falta para las container queries, la escalera, el índice y la barra flotante, que no están en el CSS compilado. Solo usan tokens existentes.
- Sombra solo en la barra flotante: es lo único que flota sobre el contenido. Ninguna card lleva sombra.

## Estados (URL → captura en `screenshots/playbooks-b/`)

| Estado | URL |
|---|---|
| Biblioteca | `#/` |
| Empty state | `#/?empty=1` |
| Crear (3 caminos) / con contrato elegido | `#/new` · `#/new?start=contract&file=1` |
| Procesando contrato | `#/servicios-cloud?demo=loading&hold=1` |
| Reglas propuestas (Accept · Edit · Discard) | `#/servicios-cloud?demo=suggested` |
| Documento en lectura | `#/servicios-ti` |
| Regla en edición / como texto | `#/servicios-ti?edit=r2` · `&text=1` |
| Cambios sin guardar | `#/servicios-ti?dirty=1` |
| Vista dividida 50/50 · 60/40 | `?split=50#/servicios-ti` · `?split=60#/…` |
