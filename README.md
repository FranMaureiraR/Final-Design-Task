# Magnar — flujos recreados

Recreación de dos flujos de [app.magnar.ai](https://app.magnar.ai) para rediseñarlos por separado:

| Flujo | Carpeta | Qué incluye |
|---|---|---|
| **Playbooks** | [`playbooks/`](playbooks/) | Lista sin selección, detalle/edición (nombre, descripción, reglas, guardar), modal *New Playbook* con selector de país, buscador y filtro *Only my playbooks*. |
| **Scheduled tasks** | [`tasks/`](tasks/) | Lista (vacía y con tareas, con menú ⋯ Edit/Pause/Delete), modal *New task* con todas las variantes de *Repeat* (Once, At an interval, Every day/week/month, Custom), popovers de hora, zona horaria, AI, proyecto, calendario y fechas excluidas. Al guardar abre el **detalle de la tarea** (Run now, Pause, Delete, Run history), modal *Edit* y confirmación de borrado. |

| **Aplicar un playbook** | [`revision-nda/`](revision-nda/) | La conversación "Revisión de NDA" completa en vista dividida: chat a la izquierda y el documento `NDA-Google-Drive.txt` a la derecha. Incluye "Worked for" (pasos), la tarjeta *Playbook · NDA de Proveedores* con la regla y sus 3 opciones (texto agregado/eliminado), "Consecuencias del cambio", citas "1" que abren el documento en modo *Transcription* y resaltan el texto citado, tarjeta del archivo (modo *View*), *Cited sources*, barra de acciones y el compositor con el menú **+ › Add context › Playbooks** (agregar el playbook como chip o *Create with AI*). |

El flujo de **crear un playbook** tiene dos entradas, ambas recreadas: *Knowledge › Playbooks › New Playbook* (en `playbooks/`) y *+ › Playbooks › Create with AI* en el chat (en `revision-nda/`, rellena "Create a playbook to review").

## Rediseños de Playbooks

Tres direcciones sobre la misma data (6 playbooks en `shared/playbooks-seed.js`). La carpeta `playbooks/` original no se tocó.

| Rediseño | Carpeta | Idea |
|---|---|---|
| A · Índice + panel | [`playbooks-a/`](playbooks-a/) | Índice + resumen; cada regla se edita en un panel lateral expandible. |
| B · Documento | [`playbooks-b/`](playbooks-b/) | El playbook se lee como documento y se edita en el lugar. |
| C · Matriz de posiciones | [`playbooks-c/`](playbooks-c/) | Cláusulas × Standard / Fallback / Unacceptable. |
| **Refinada** | [`playbooks-refinada/`](playbooks-refinada/) | Frames de Figma a nivel producto. Sistema en `shared/pb-system.css` y `shared/pb-kit.js`. |
| **Documento** | [`playbooks-documento/`](playbooks-documento/) | Biblioteca en tabla; crear = escribir un documento. |
| **Final** | [`playbooks-final/`](playbooks-final/) | Desde Figma (39:8958 / 39:9010 / 39:9204). Solo funciones que Magnar ya tiene; reglas como cards expandibles. |

- Cada carpeta tiene `DECISIONS.md`: la tabla Cambio / Problema / Por qué / Referencia, la causa del bug de scroll y lo que se reutilizó.
- Cada estado tiene su URL. `?split=50` o `?split=60` antes del `#` monta la página en vista dividida, con el chat a la izquierda.
- `playbooks-before/` carga el original sin modificarlo, en vista dividida, para la captura del "antes".
- Capturas a 1440×900 @2x en `screenshots/` (original, playbooks-a, playbooks-b y playbooks-c). Para regenerarlas, con el servidor corriendo:

```bash
ruby screenshots/shoot.rb            # todas; o: ruby screenshots/shoot.rb playbooks-b
```

El script controla Google Chrome por el protocolo DevTools (viewport 1440×900, deviceScaleFactor 2, igual que Playwright) y no necesita Node.

## Cómo se hizo (fidelidad)

- `styles/magnar.css` es **el CSS compilado de Magnar** (Tailwind v4 + shadcn), descargado tal cual. Los componentes usan las mismas clases que el DOM real, así que tipografías, colores, radios y espaciados son los mismos.
- Fuentes: **Inter** (Google Fonts, igual que Magnar) y **Magnar Title** (`fonts/`).
- Íconos: Phosphor (variante regular), con los mismos paths SVG. Banderas: `country-flag-icons` 3x2, igual que Magnar.
- Se comparó posición y tamaño de los elementos con la app real a 1440×900: coinciden al píxel.

## Ejecutar

No necesita build ni `npm install`. Sirve la carpeta con cualquier servidor estático:

```bash
ruby -run -e httpd . -p 5178
```

o `python3 -m http.server 5178`, o `npx serve .` Luego abre <http://localhost:5178>.

## Estructura

```
index.html            portada con links a ambos flujos
shared/               lo común a los dos flujos (no hace falta tocarlo para rediseñar)
  shell.js            sidebar, pestañas superiores, panel, cabecera de página
  ui.js               Dialog, Select, Popover, CommandList, Checkbox, Calendar
  classes.js          clases de Tailwind copiadas de Magnar
  icons.js            íconos Phosphor
playbooks/            flujo de Playbooks (app.js + data.js)
tasks/                flujo de Scheduled tasks (app.js + schedule.js)
styles/, fonts/, flags/, vendor/   assets
```

Cada flujo es independiente: puedes editar `playbooks/app.js` sin afectar `tasks/` y viceversa.
Los componentes están escritos con [Preact + htm](https://github.com/developit/htm) (sintaxis tipo JSX, sin compilar).

## Lo que no es copia exacta

- **Tareas pausadas y historial de ejecuciones**: no se vieron en la app real. "Resume" (con ícono Play), el texto "Paused" y las filas de *Run history* después de *Run now* son deducidos.
- **Menú "Playbook options"** (los ⋯ junto al nombre en el breadcrumb) y **Agent tier**: no se capturaron los submenús/descripciones; el botón está pero no abre menú.
- **AI → Generate**: simulado; interpreta frases simples en inglés ("every monday at 9 am", "the last Friday of every month at 6 pm").
- **Ends → After** y la selección de día de la semana en "On: first/second/…": deducidos, no vistos.
- **Revisión de NDA**: enviar un mensaje o elegir una *Option* agrega mensajes simulados (Magnar llama a la IA). Las citas que apuntan a texto que ya no existe en el archivo (versión anterior) en Magnar abren el archivo crudo en otra pestaña; aquí abren el documento sin resaltar. No se recrearon: el panel "Conversation files", "Float chat", el menú "Chat options", el popover "Auto" (effort), los submenús Skills/Templates/Plugins/Libraries ni la barra de marcadores de mensajes a la izquierda del chat.
- Los datos viven en memoria (se reinician al recargar). Las pestañas de sección (Templates, Skills, Libraries) y el sidebar son solo visuales.
- El avatar del usuario se reemplazó por una inicial.

> Repositorio privado: contiene CSS y fuentes propiedad de Magnar, solo para trabajo interno de rediseño.
