# Playbooks · versión final

Rediseño visual y de organización de lo que Magnar ya tiene: lista con buscador, crear, reglas (título + texto libre; agregar, eliminar, guardar) y la vista dividida. No se agregaron funciones.

## Decisiones

| Cambio | Qué había | Por qué | Referencia |
|---|---|---|---|
| Biblioteca en cards agrupadas: My playbooks / Shared with me | Lista de una columna; "Only my playbooks" escondido en un filtro | Agrupar ordena lo que el filtro separaba. Las cards dan aire y jerarquía sin agregar elementos | Figma 39:8958 |
| Cards con el estilo de Figma: candado neutro, descripción a 2 líneas, "3 rules · Chile" | Badge "Private" con más peso que el nombre; "1 · Chile" | El nombre manda; la visibilidad es información, no alerta. Cada número dice qué cuenta | Figma A/Index row, Fintual |
| Seleccionado: gris suave + borde más oscuro | El mismo gris que el hover | Se distingue a la primera sin agregar colores. Mismo lenguaje que el resto de la card | Figma 39:9010 |
| La biblioteca se repliega y abre una ventana | Lista fija + editor en 3 columnas | Al abrir un playbook o crear uno, las cards se reubican en columna (420ms) y la ventana entra al lado. X vuelve; el chevron la expande a todo el ancho | Figma 39:8958 → 39:9010 → 39:9204 |
| Pestañas como íconos al replegar | Pestañas con texto que no caben | Con la vista angosta, las pestañas (de arriba y de Knowledge) son íconos; la activa muestra su nombre y un click abre el texto | Figma 39:9010 |
| Crear con el título en serif y una sola entrada | Modal chico de nombre + país; "+" y modal aparte | La serif de Magnar en un solo nivel. Card en la biblioteca, "+" solo con la biblioteca replegada | Figma 39:9204, home de Magnar |
| Regla con 3 estados claros: cerrada · leyendo · editando | Textarea mono con borde, "Rule 1", siempre en edición | Cerrada: número, título y vista previa. Leyendo: el texto como documento (Inter 14/1.65, 68ch) y "Edit". Editando: borde marcado, chip "Editing" o "New rule", área de escritura y Cancel / Done | Legora (detalle de playbook) |
| "Unsaved changes · Save" junto al título, punto en la card | Save gris aislado en una esquina | Misma función, donde está la atención. "Saved" cuando no hay cambios | Front |
| Container queries sobre el panel | Breakpoints de ventana: reglas en 0px en vista dividida | Bajo 760px de panel se oculta la biblioteca y aparece "← Playbooks". Un scroll por zona | Bug actual (abajo) |

## Causa del bug de scroll en vista dividida

El editor original usa breakpoints de **ventana** (`xl:`), no del panel. Con la ventana a 1440px y el panel al 50% (≈690px), `xl:flex-row` sigue activo:

1. Lista de 320px + columna Name/Description de 384px = 704px, más que el panel.
2. La columna de reglas (`min-w-0 flex-1`) queda en **0px**.
3. `xl:overflow-hidden` recorta el resto: no hay scroll de rescate.
4. Además hay dos scrolls anidados que compiten por la rueda.

Se reproduce en `/playbooks-before/?split=50` (carga `playbooks/app.js` sin modificar). Captura: `screenshots/original/04-split-50.png`.

**Solución:** `container: pf / inline-size` en el contenedor y `@container pf (width < 760px)`. Cada zona tiene un solo scroll (`min-height: 0` + `overflow-y: auto` en `.pf-scroll`). Verificado a 1440×900 en 50/50 (682px) y 60/40 (542px).

## Valores nuevos (justificados)

- **Borde de cards:** `--border` al 70% sobre el fondo. Magnar ya usa `border-border/70` en su panel.
- **Borde del seleccionado:** `--border` mezclado con 22% de `--foreground` (el #bebebe de Figma 39:9010).
- **Movimiento:** 420ms `cubic-bezier(.2,.8,.2,1)` para anchos y cards; 180ms ease-out para abrir una regla. Respeta "reducir movimiento".
- **Newsreader** (Google Fonts) solo en el título de página, como en el Figma. Cae a `--title-font` (Magnar Title) si no carga.
- Sin sombras, gradientes ni radios mayores a 8px (las zonas usan los 12px del panel de Magnar).

## Lo que se dejó fuera (no existe en Magnar)

Filtros Contract type, Country y Visibility; fecha de edición; selector de visibilidad al crear (se muestra "Private" fijo). El menú "···" solo tiene "Delete playbook".

## Estados (URL → captura en `screenshots/playbooks-final/`)

| Estado | URL |
|---|---|
| Biblioteca / vacía | `#/` · `#/?empty=1` |
| Crear: sin reglas / escribiendo una regla nueva / 3 reglas / a todo el ancho | `#/new` · `#/new?demo=1` · `#/new?demo=3` · `&wide=1` |
| Detalle / regla leyendo / regla en edición | `#/servicios-ti` · `?rule=r2` · `?dirty=1&edit=r4` |
| Cambios sin guardar / guardado | `#/servicios-ti?dirty=1` · luego "Save" |
| Regla recién agregada | `#/servicios-ti?added=1` (`&hold=1` deja fijo el tint) |
| Vista dividida 50/50 · 60/40 | `?split=50#/servicios-ti` · `?split=60#/servicios-ti?rule=r2` |
