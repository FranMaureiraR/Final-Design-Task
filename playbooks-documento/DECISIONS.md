# Propuesta "Documento"

Un playbook es la posición de un estudio frente a un tipo de contrato: un documento. Crear y editar son la misma pantalla; se abre un documento y se escribe.

## Decisiones

| Cambio | Qué había | Por qué | Referencia |
|---|---|---|---|
| Biblioteca como tabla: Name · Rules · Country · Access · Edited | Lista de una columna con "1 · Chile · Private" | Con 6+ playbooks se comparan más rápido en columnas alineadas que en cards repetidas | Front (Audit log), Vercel |
| Filas de 56px, divisores de 1px, sin bordes verticales | Lista sin estructura | Densidad de tabla sin ruido: la línea horizontal basta para guiar la vista | Vercel |
| Grupos como filas de sección en canvas | Sin agrupación | "My playbooks / Shared with me" separan sin agregar columnas | Linear |
| Hover de fila: canvas + → | Sin señal de que la fila se abre | El clic se anticipa sin botón extra | Vercel |
| Documento centrado de 680px con índice numerado a la izquierda | Formulario a 3 columnas | Una línea de lectura; el índice permite saltar sin perder el lugar | Legora |
| Título en serif 34/40, editable directo | Input "Name" con borde | Se lee como el título de un documento, no como un campo | Claude, Intercom Fin |
| Propiedades como texto con ▾ | Selects con label | Misma información sin aspecto de formulario | Notion, Intercom Fin |
| Reglas como secciones: número y título en serif 20 | Textarea mono con "Rule 1" | La regla es una cláusula del documento; 48px entre reglas marcan el ritmo | Legora |
| Etiquetas de posición en columna de 150px con punto de 6px | Todo en un bloque de texto | Presentación del texto existente: no crea campos. El color va solo en el punto | Legora |
| Edición en el lugar; las demás reglas bajan a .55 | Editar y leer eran lo mismo | El foco se ve sin modal; Esc o clic fuera sale | iA Writer |
| "Create" / "Save" y estado en la barra; borde solo con scroll | Save gris aislado | "Saving… → Saved" con fade de 150ms, sin toasts | Vercel |
| Container queries: índice → "Rules ▾" bajo 900px; etiquetas arriba bajo 560px | Reglas en 0px en vista dividida | El documento usa todo el panel angosto. Un scroll por zona | Bug actual (abajo) |

## Causa del bug de scroll en vista dividida

El editor original usa breakpoints de **ventana** (`xl:`), no del panel. Al 50% (≈690px) `xl:flex-row` sigue activo: 320px de lista + 384px de Name/Description = 704px; la columna de reglas queda en **0px** y `xl:overflow-hidden` recorta el resto, con dos scrolls anidados. Captura: `screenshots/original/04-split-50.png`.

**Solución:** `container: pd / inline-size`. El índice y el documento tienen cada uno su scroll (`min-height: 0` + `overflow-y: auto`).

## Lo que se ajustó al brief

- **Primer guardado = "Create".** En Magnar el playbook existe antes de tener reglas; aquí el documento nuevo se crea con "Create" y luego guarda con "Save".
- **Insertar regla entre otras:** no existe en Magnar. Solo "+ Add rule" al final (y en el índice).
- **"Edited" no es ordenable:** Magnar no ordena listas; la columna queda fija.
- **Contract type:** construido detrás de `SHOW_CONTRACT_TYPE = false` (`shared/pb-kit.js`).
- **Impresión:** `@media print` deja solo título, propiedades y reglas. Es CSS, no una función nueva.
- Selección de texto en wash (`::selection`).

## Estados (URL → `screenshots/playbooks-documento/`)

| Estado | URL |
|---|---|
| Biblioteca · vacía · filtro activo · hover de fila · vista previa | `#/` · `?empty=1` · `?vis=shared` · `?hover=servicios-ti` · `&preview=servicios-ti` |
| Documento nuevo (cursor en el título) | `#/new` |
| Documento con 4 reglas · regla en edición · popover de Country | `#/contrato-trabajo` · `?edit=r2` · `?menu=country` |
| Sin guardar · guardado · regla con subtítulos | `?dirty=1` · luego "Save" · `#/compraventa-acciones` |
| Vista dividida 50/50 · panel de 542px | `?split=50#/contrato-trabajo` · `?split=60#/…` |
