# Rediseño C: Matriz de posiciones

Los estudios ordenan sus playbooks de negociación como tabla: para cada cláusula, qué es ideal, qué es aceptable y qué es inaceptable. Magnar ya guarda eso, pero escondido en un textarea. Aquí se ve como matriz: filas = cláusulas, columnas = Standard | Fallback | Unacceptable.

## Decisiones

| Cambio | Problema en la vista actual | Por qué esta solución | Referencia |
|---|---|---|---|
| Lista como tabla precisa | Las filas no dicen autor ni fecha de edición | Columnas Name, Rules, Country, Visibility, Edited y Author. Header sticky, filas de 52px | Front (Audit logs), Vercel |
| Ordenar por "Edited" | No hay orden explícito | Lo editado reciente va primero. La flecha muestra el sentido | Vercel |
| Filtros como pills sobre la tabla | Los filtros quedan escondidos tras un ícono | Visibles y con el valor activo a la vista | Front |
| Matriz cláusula × posición | Cada regla es un bloque de texto libre; no se puede comparar | Se lee en horizontal (una cláusula) y en vertical (todos los fallbacks) | Harvey / Spellbook |
| Celda vacía = "Not defined" punteado | Una posición que falta no se nota | El vacío se ve de un vistazo e invita a completarlo con un click | Spellbook (cobertura) |
| Cobertura en texto | No hay forma de saber si el playbook está completo | "7 rules · 1 without fallback": se calcula de las celdas vacías. Sin % ni gráficos | Fintual |
| Color solo en puntos | — | Las celdas son siempre neutras. El color identifica la columna y no compite con el texto | Vercel |
| Edición en la celda | Editar obliga a reescribir todo el bloque | Click → textarea que crece en el mismo lugar. Esc o ⌘↵ para salir | Front (Branching rules) |
| Celdas editadas marcadas "Edited" | No se sabe qué cambió antes de guardar | Fondo tint muy sutil + etiqueta pequeña. Las filas nuevas llevan una línea fina a la izquierda | Front (Branching rules) |
| Panel lateral de la regla | — | Click en la cláusula: las 3 posiciones + nota interna, con ↑ ↓, expandir y cerrar. Expandido muestra las 3 posiciones lado a lado | Front |
| 3 formas de empezar sobre la matriz vacía | El modal crea un playbook vacío sin guía | Extraer de un contrato, partir de una plantilla (NDA, Lease, Services) o en blanco. Las filas extraídas llegan como "Suggested" | Spellbook |
| Matriz → lista bajo 860px | En vista dividida las reglas quedan con 0px (ver abajo) | Container query: cada cláusula es un bloque con sus 3 posiciones apiladas. Misma información, otro eje | Bug actual |

## Causa del bug de scroll en vista dividida

El editor original usa breakpoints de **ventana** (`md:`, `xl:`), no del panel. Con la ventana a 1440px y el panel al 50% (≈690px), `xl:` sigue activo:

1. El form se arma en fila: lista de 320px + Name/Description de 384px = 704px, más que los 690px disponibles.
2. La sección de reglas (`min-w-0 flex-1`) queda con **0px** de ancho.
3. `xl:overflow-hidden` recorta el resto, sin scroll horizontal.
4. Hay dos scrolls anidados (el form y la lista de reglas).

Se reproduce en `/playbooks-before/?split=50`, que carga `playbooks/app.js` sin modificarlo. Captura: `screenshots/original/04-split-50.png`.

**Solución en C:** las tablas anchas son justo lo que se rompe en vista dividida. Por eso:

- `@container pc (width < 860px)` cambia la matriz a lista y oculta columnas secundarias en la tabla de playbooks.
- En modo tabla, la primera columna es `position: sticky` y el área tiene scroll en ambos ejes. En modo lista no hay sticky.
- Hay un solo scroll por zona (`.pc-scroll`), y la barra de cambios queda fuera de él, anclada al pie.

Verificado a 1440×900 en 50/50 (682px) y 60/40 (544px), con el chat a la izquierda.

## Qué se reutilizó (Paso 0)

- **Tokens:** `--background`, `--foreground`, `--muted-foreground`, `--border`, `--ring`, `--success`, `--warning`, `--destructive`, `--radius` y el tint (`--tint-hue`, `--tint-wash`, `--tint-ink`).
- **Tipografía:** Inter, con `tabular-nums` en conteos y fechas. **Magnar Title** (`--title-font`) solo en el nombre del playbook.
- **Componentes:** `AppShell`, `PageHeader`, `Breadcrumb`, `Dialog`, `Select`, `Popover`, `Field`, íconos Phosphor, banderas y la animación de puntos `thread-work-*`.

## Qué se agregó y por qué

- `styles/redesign.css` + `playbooks-c/styles.css`: el CSS de Magnar compilado no trae container queries ni la grilla de la matriz. Solo usan tokens existentes.
- No hay cebra ni fondos de color en las celdas. El único fondo es el tint de "editado" y "sugerido", que es un estado temporal.

## Estados (URL → captura en `screenshots/playbooks-c/`)

| Estado | URL |
|---|---|
| Lista | `#/` |
| Empty state | `#/?empty=1` |
| Crear (modal) | `#/?new=1` |
| Matriz vacía con 3 caminos | `#/servicios-cloud?demo=start` |
| Filas sugeridas | `#/servicios-cloud?demo=suggested` |
| Matriz | `#/servicios-ti` |
| Celda en edición | `#/servicios-ti?cell=r4.fallback` |
| Panel normal / expandido | `#/servicios-ti?rule=r3` · `&expand=1` |
| Cambios sin guardar | `#/servicios-ti?dirty=1` |
| Vista dividida (modo lista) 50/50 · 60/40 | `?split=50#/servicios-ti` · `?split=60#/…` |
