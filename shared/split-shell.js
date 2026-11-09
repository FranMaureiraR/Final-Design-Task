// Marco para los rediseños: pantalla normal (AppShell) o vista dividida con el chat
// "Revisión de NDA" a la izquierda y la página a la derecha, en el MISMO documento.
// (Con un iframe el bug no se vería: el iframe tiene su propio viewport y las media queries
// responderían al ancho del panel. En Magnar el panel comparte el viewport de la ventana.)
// Uso: ?split=50 → chat 50% / página 50%. ?split=60 → chat 60% / página 40%.
import { html } from '../vendor/preact-htm.js';
import { C } from './classes.js';
import { Icon } from './icons.js';
import { AppShell, Sidebar, TabStrip } from './shell.js';
import { Group, Block, P, B, UserMessage, AssistantMessage, PlaybookReview } from '../revision-nda/chat.js';
import { REVIEW, STEPS } from '../revision-nda/data.js';

const chatHeader = 'desktop-drag-region flex shrink-0 items-center justify-between gap-3 border-b px-2 h-9';
const composerBox = 'flex w-full flex-col items-end rounded-2xl border border-input p-2 focus-within:outline-none focus-within:ring-1 focus-within:ring-ring bg-background';

function ChatLite() {
  return html`<div class="flex min-h-0 flex-1 flex-col">
    <header class=${chatHeader}>
      <span class="truncate text-sm font-semibold leading-5">Revisión de NDA</span>
      <${Icon} name="Folders" class="size-4 text-muted-foreground" />
    </header>
    <div class="relative min-h-0 flex-1 overflow-y-auto">
      <div class="space-y-4 px-4 py-8">
        <${UserMessage}>Revisa el NDA adjunto con el playbook NDA de Proveedores.<//>
        <${AssistantMessage} groups worked=${{ label: 'Worked for 56s', steps: STEPS.m3 }}>
          <${Group}><${PlaybookReview} review=${REVIEW} onOpenFile=${() => {}} onOption=${() => {}} /><//>
          <${Group}><${Block} first><${P}>La revisión identificó <${B}>una regla inaceptable<//> según el playbook “NDA de Proveedores”.<//><//><//>
        <//>
      </div>
    </div>
    <div class="shrink-0 px-4 pb-3"><div class=${composerBox}>
      <div class="w-full px-3 py-2 text-sm text-muted-foreground">Ask me a question…</div>
      <div class="flex w-full items-center justify-between px-1 pt-1">
        <${Icon} name="Plus" class="size-4 text-muted-foreground" />
        <span class="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><${Icon} name="ArrowUp" class="size-4" /></span>
      </div>
    </div></div>
  </div>`;
}

// Arrastrar el separador cambia el porcentaje del chat (como en Magnar), entre 25% y 75%.
function dragSplit(e) {
  const box = e.currentTarget.closest('[style*="--drive-split"]'); if (!box) return;
  const r = box.getBoundingClientRect(); e.preventDefault(); document.body.style.cursor = 'col-resize';
  const move = (ev) => box.style.setProperty('--drive-split', Math.max(25, Math.min(75, ((ev.clientX - r.left) / r.width) * 100)) + '%');
  const up = () => { removeEventListener('pointermove', move); removeEventListener('pointerup', up); document.body.style.cursor = ''; };
  addEventListener('pointermove', move); addEventListener('pointerup', up);
}

export function Frame({ split, activeApp = "knowledge", tab, tabs, links, children }) {
  if (!split) return html`<${AppShell} activeApp=${activeApp} tab=${tab} tabs=${tabs} links=${links}>${children}<//>`;
  const grid = 'grid-template-columns: minmax(340px, var(--drive-split)) auto minmax(360px, 1fr);';
  return html`
  <div data-slot="sidebar-wrapper" class="group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar" style="--sidebar-width: 16rem; --sidebar-width-icon: 32px;">
    <${Sidebar} activeApp=${activeApp} links=${links} />
    <main data-slot="sidebar-inset" class=${C.inset}>
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="relative flex min-h-0 flex-1 flex-col" style=${`--drive-split: ${split}%;`}>
          <div class="grid shrink-0" style=${grid}>
            <${TabStrip} tabs=${[{ title: 'Revisión de NDA', icon: 'ChatCircle', active: true }]} label="Left side tabs" trailing=${null} />
            <div class="w-2"></div>
            <${TabStrip} tabs=${[{ ...tab, active: true }]} label="Right side tabs" trailing="close" padLeft=${false} />
          </div>
          <div class="relative grid min-h-0 flex-1 grid-rows-1" style=${grid}>
            <section role="tabpanel" class=${C.panel} style="grid-column: 1;"><${ChatLite} /></section>
            <div class="col-start-2 row-start-1 flex"><div class="w-2" style="cursor:col-resize;touch-action:none" title="Drag to resize" onPointerDown=${dragSplit}></div></div>
            <section role="tabpanel" class=${C.panel} style="grid-column: 3;">
              <div class="flex min-h-0 flex-1 flex-col">${children}</div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>`;
}
