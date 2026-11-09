// Flujo "Aplicar un playbook" — conversación "Revisión de NDA"
// Vista dividida: chat a la izquierda y el documento (NDA-Google-Drive.txt) a la derecha.
// - Las citas "1" abren el documento en modo Transcription y resaltan el texto citado.
// - La tarjeta del archivo abre el documento en modo View (texto plano).
// - El menú "+" del compositor permite agregar un playbook (Add context › Playbooks) o "Create with AI".
import { html, render, useState, useRef, useEffect } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon } from '../shared/icons.js';
import { Sidebar, TabStrip, PageHeader, Breadcrumb } from '../shared/shell.js';
import { Popover, cx } from '../shared/ui.js';
import { K, Group, Block, P, B, Cite, UserMessage, UserText, AssistantMessage, PlaybookReview, Consequences, FileCard, FileChip, PlaybookChip } from './chat.js';
import { FILE_NAME, TXT_ICON, DOCUMENT, DOCUMENT_RAW, Q, STEPS, REVIEW, CONSEQUENCES, DRIVE_URL, PLAYBOOKS } from './data.js';

const H = {
  chatHeader: 'desktop-drag-region flex shrink-0 items-center justify-between gap-3 border-b px-2 transition-[padding-left] duration-200 ease-linear h-9 max-md:h-12',
  rename: 'min-w-0 max-w-full truncate rounded-sm text-left text-sm font-semibold leading-5 transition-colors hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
  iconBtn: "group/button inline-flex items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg size-7 shrink-0",
  optionsBtn: "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg size-7 text-foreground",
  composerBox: 'flex w-full flex-col items-end rounded-2xl border border-input p-2 focus-within:outline-none focus-within:ring-1 focus-within:ring-ring bg-background',
  editor: "tiptap ProseMirror w-full max-h-[400px] overflow-auto break-words px-3 py-2 text-[16px] leading-6 outline-hidden focus-visible:outline-none sm:[@media(hover:hover)_and_(pointer:fine)]:text-sm [&_.is-editor-empty:first-child]:before:pointer-events-none [&_.is-editor-empty:first-child]:before:float-left [&_.is-editor-empty:first-child]:before:h-0 [&_.is-editor-empty:first-child]:before:text-muted-foreground [&_.is-editor-empty:first-child]:before:content-[attr(data-placeholder)] [&_p]:leading-6 [&_p:not(:first-child)]:mt-4",
  toolbar: '@container/composer-toolbar flex w-full flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-1 pt-1',
  addBtn: "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-muted hover:text-foreground aria-expanded:text-foreground dark:hover:bg-muted/50 in-data-[slot=button-group]:rounded-lg group/add relative size-8 rounded-full text-foreground transition-[background-color,transform] duration-150 active:scale-95 aria-expanded:bg-muted motion-reduce:transition-none",
  roundBtn: "group/button inline-flex items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-muted dark:hover:bg-muted/50 in-data-[slot=button-group]:rounded-lg size-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
  effort: "group/button inline-flex items-center justify-center border border-transparent bg-clip-padding whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-muted dark:hover:bg-muted/50 in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 h-8 shrink-0 gap-1 rounded-full px-3 text-[13px] font-medium text-muted-foreground hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
  send: "group/button group/button inline-flex items-center justify-center border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 bg-primary text-primary-foreground hover:bg-primary/80 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 h-control gap-1.5 shrink-0 rounded-full dark:border-border motion-reduce:transition-none ml-1 size-8 p-0 disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 [&_svg]:size-4 border-0",
  menuPop: 'z-50 flex origin-(--transform-origin) flex-col gap-2.5 bg-popover text-sm text-popover-foreground shadow-md ring-1 ring-foreground/10 outline-hidden data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 p-0 w-[min(21rem,calc(100vw-1rem))] overflow-hidden rounded-xl duration-150 ease-out',
  menuCmd: 'flex size-full flex-col overflow-hidden rounded-xl! bg-popover p-1 text-popover-foreground',
  menuGroup: 'overflow-hidden p-1 text-foreground **:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:text-muted-foreground',
  menuItem: "group/command-item relative flex cursor-default items-center text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground gap-2.5 rounded-lg px-2.5 py-1.5 transition-colors duration-100 data-popup-open:bg-muted",
  shortcut: 'ml-auto text-xs text-muted-foreground group-data-selected/command-item:text-foreground min-w-0 truncate tracking-normal',
  shortcutIcon: 'ml-auto text-xs text-muted-foreground group-data-selected/command-item:text-foreground flex items-center gap-1.5 tracking-normal',
  kbd: 'pointer-events-none inline-flex h-4 w-fit min-w-4 items-center justify-center gap-0.5 rounded-sm bg-current/10 px-1 font-sans text-[11px] leading-none font-medium tabular-nums [font-variant-emoji:text] opacity-70 select-none',
  pbItem: "group/command-item relative flex cursor-default items-center text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-selected:bg-muted data-selected:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-selected:*:[svg]:text-foreground gap-3 rounded-lg px-2.5 py-2",
  pbCountry: 'inline-flex min-w-0 items-center gap-1.5 ml-auto max-w-24 shrink-0 text-[11px] text-muted-foreground',
  docToggleOn: 'flex size-7 items-center justify-center rounded-md transition-colors bg-muted text-foreground',
  docToggleOff: 'flex size-7 items-center justify-center rounded-md transition-colors text-muted-foreground hover:text-foreground',
  docCard: 'w-full max-w-3xl rounded-lg bg-card px-8 py-7 shadow-sm ring-1 ring-black/5 dark:ring-white/10',
  docProse: 'space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose dark:prose-invert max-w-none text-sm',
  mark: 'rounded-sm bg-yellow-200/80 px-0.5 text-inherit dark:bg-yellow-300/40',
  scrollViewport: 'size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 base-ui-disable-scrollbar overflow-auto',
};

// ------------------------------------------------------------ conversación
function Conversation({ onCite, onOpenFile, onOption, extra }) {
  return html`
    <${UserMessage}><${UserText}>quiero revisar un NDA de mi google drive con el playbook de NDA<//><//>

    <${AssistantMessage} worked=${{ label: 'Worked for 7s', steps: STEPS.m1 }}>
      <${Block} first><${P}>Encontré el playbook “NDA de Proveedores”. Para aplicarlo, necesito el NDA: adjúntalo aquí o compárteme un enlace accesible de Google Drive.<//><//>
    <//>

    <${UserMessage}><${UserText}>
      <a target="_blank" rel="noopener noreferrer" href=${DRIVE_URL} class=${K.link}><img alt="" class="shrink-0 rounded-[2px] object-contain inline-block size-3.5 align-[-0.125em] mr-1" draggable="false" referrerpolicy="no-referrer" src="https://www.google.com/s2/favicons?domain_url=https%3A%2F%2Fdocs.google.com&sz=64" />${DRIVE_URL}</a>
    <//><//>

    <${AssistantMessage} groups worked=${{ label: 'Worked for 56s', steps: STEPS.m3 }}>
      <${Group}><${PlaybookReview} review=${REVIEW} onOpenFile=${onOpenFile} onOption=${onOption} /><//>
      <${Group}><${Block} first><${P}>La revisión identificó <${B}>una regla inaceptable<//> según el playbook “NDA de Proveedores”.<//><//><//>
    <//>

    <${UserMessage} collapsible>
      <div><div class=${K.prose}><p class=${K.userP}>Necesito que hagas los siguientes cambios en el archivo <${FileChip} name="NDA-Google-Drive" onClick=${onOpenFile} />:</p></div></div>
      <div><div class=${K.prose}><ul class="my-2 ml-6 list-disc">
        <li class="mt-1">"mantendrá su carácter confidencial de forma indefinida a contar de la fecha de suscripción." -> "La responsabilidad total de cada Parte derivada del incumplimiento de este acuerdo estará limitada al monto contratado o a USD $10,000, lo que sea mayor."</li>
      </ul></div></div>
    <//>

    <${AssistantMessage} worked=${{ label: 'Worked for 11s', steps: STEPS.m5 }} cited onOpenFile=${onOpenFile}>
      <${Block} first><${P}>Cambio aplicado en el <${Cite} label="archivo de la conversación" onCite=${() => onOpenFile()} />. No modifica el documento original de Google Drive.<//><//>
      <${Block}><${P}><${B}>Atención:<//> el reemplazo dejó incompleta la cláusula de confidencialidad y contradice la responsabilidad ilimitada de la cláusula 3. <${Cite} quote=${Q.incompleta} onCite=${onCite} /> <${Cite} quote=${Q.limite} onCite=${onCite} /><//><//>
      <${Block}><${Consequences} items=${CONSEQUENCES} onCite=${onCite} /><//>
    <//>

    <${UserMessage}><${UserText}>y que significa eso<//><//>

    <${AssistantMessage} cited onOpenFile=${onOpenFile}>
      <${Block} first><${P}>El cambio se aplicó exactamente donde lo pediste, pero produjo dos problemas:<//><//>
      <${Block}><ul class="my-2 ml-6 list-disc">
        <li class="mt-1"><${B}>Ya no queda claro cuánto dura la confidencialidad:<//> se reemplazó el texto que decía que era indefinida y la frase quedó incompleta. <${Cite} quote=${Q.incompleta} onCite=${onCite} /></li>
        <li class="mt-1"><${B}>Hay dos reglas opuestas sobre responsabilidad:<//> el texto nuevo pone un límite, pero la cláusula 3 sigue diciendo que no hay límite. Eso deja dudas sobre cuál se pretendía aplicar. <${Cite} quote=${Q.limite} onCite=${onCite} /> <${Cite} quote=${Q.sinLimite} onCite=${onCite} /></li>
      </ul><//>
      <${Block}><${P}>En términos prácticos, el límite debería ubicarse en la cláusula de responsabilidad y convendría definir nuevamente la duración de la confidencialidad.<//><//>
    <//>

    <${UserMessage}><${UserText}>rehacelo<//><//>

    <${AssistantMessage} worked=${{ label: 'Worked for 12s', steps: STEPS.m9 }} cited onOpenFile=${onOpenFile}>
      <${Block} first><${P}>Corregí el archivo: fijé la confidencialidad en tres años, conforme al playbook, y trasladé el límite de responsabilidad a la cláusula 3. <${Cite} quote=${Q.tresAnios} onCite=${onCite} /> <${Cite} quote=${Q.responsabilidad} onCite=${onCite} /><//><//>
      <${Block}><${P}>La ley de Nueva York y la jurisdicción de Manhattan permanecen sin cambios y siguen siendo incompatibles con el playbook. <${Cite} quote=${Q.ley} onCite=${onCite} /><//><//>
      <${Block}><${P}>El original de Google Drive no fue modificado.<//><//>
      <${Block}><${FileCard} onOpenFile=${onOpenFile} /><//>
    <//>

    ${extra}
  `;
}

// ------------------------------------------------------------ menú "+" (Add files and context)
function AddMenu({ onPickPlaybook, onCreateWithAI }) {
  const [view, setView] = useState('root'); // 'root' | 'playbooks'
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const item = (i, icon, label, right, onClick, sub) => html`
    <div data-slot=${sub ? 'popover-trigger' : 'command-item'} class=${H.menuItem} data-selected=${active === i ? 'true' : 'false'} cmdk-item=""
      onMouseMove=${() => setActive(i)} onClick=${onClick}>
      <${Icon} name=${icon} class="text-muted-foreground" />
      <span class=${sub || i > 1 ? 'min-w-0 flex-1 truncate' : 'shrink-0'}>${label}</span>
      ${right}
    </div>`;
  const chevron = html`<span data-slot="command-shortcut" class=${H.shortcutIcon}><${Icon} name="CaretRight" class="size-3.5" /></span>`;
  const search = (ph) => html`<div data-slot="command-input-wrapper" class="p-1 pb-0"><div data-slot="input-group" class=${C.commandInputGroup}>
    <input data-slot="command-input" class=${C.commandInput} placeholder=${ph} autocomplete="off" type="text" value=${q} onInput=${(e) => setQ(e.target.value)} ref=${(el) => el && setTimeout(() => el.focus(), 0)} />
    <div data-slot="input-group-addon" class=${C.commandAddon}><${Icon} name="MagnifyingGlass" class="size-4 shrink-0 opacity-50" /></div>
  </div></div>`;

  if (view === 'playbooks') {
    const list = PLAYBOOKS.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    return html`<div data-slot="command" class=${H.menuCmd} cmdk-root="">
      <div class="flex items-center gap-1.5 px-1 pt-1 pb-2 md:px-3 md:pt-3">
        <button type="button" aria-label="Back" class=${C.btnGhostIcon7} onClick=${() => { setView('root'); setQ(''); }}><${Icon} name="CaretLeft" class="size-4" /></button>
        <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">Playbooks</p></div>
        <button type="button" aria-label="Create with AI" title="Create with AI" class=${C.btnGhostIcon7 + ' -my-1'} onClick=${onCreateWithAI}><${Icon} name="Plus" class="size-4" /></button>
      </div>
      ${search('Search playbooks…')}
      <div data-slot="command-list" class="no-scrollbar scroll-py-1 overflow-x-hidden overflow-y-auto outline-none max-h-[min(22rem,55vh)] pt-1" cmdk-list="">
        ${list.length === 0 && html`<div class="py-6 text-center text-sm">No results</div>`}
        ${list.map((p) => html`<div data-slot="command-item" class=${H.pbItem} data-selected="true" cmdk-item="" onClick=${() => onPickPlaybook(p)}>
          <div class="min-w-0 flex-1">
            <div class="flex min-w-0 items-center gap-2"><span class="min-w-0 truncate font-medium">${p.name}</span>
              <span class=${H.pbCountry}><img src=${'../flags/' + p.country + '.svg'} alt="" class="size-3.5 shrink-0 object-contain" /><span class="truncate">${p.countryName}</span></span></div>
            <p class="mt-0.5 line-clamp-2 text-xs text-muted-foreground">${p.description}</p>
          </div>
        </div>`)}
      </div>
    </div>`;
  }
  return html`<div data-slot="command" class=${H.menuCmd} cmdk-root="">
    ${search('Search skills, plugins, templates and more…')}
    <div data-slot="command-list" class="no-scrollbar scroll-py-1 overflow-x-hidden overflow-y-auto outline-none max-h-[min(26rem,60vh)]" cmdk-list="">
      <div data-slot="command-group" class=${H.menuGroup + ' pb-0'}>
        ${item(0, 'UploadSimple', 'Upload files', html`<span data-slot="command-shortcut" class=${H.shortcut}>From this device</span>`)}
        ${item(1, 'FolderOpen', 'My files', html`<span data-slot="command-shortcut" class=${H.shortcut}>Magnar and connections</span>`)}
      </div>
      <div data-slot="command-group" class=${H.menuGroup}>
        <div cmdk-group-heading="">Add context</div>
        ${item(2, 'SlidersHorizontal', 'Skills', chevron, null, true)}
        ${item(3, 'FileText', 'Templates', chevron, null, true)}
        ${item(4, 'BookOpenText', 'Playbooks', chevron, () => { setView('playbooks'); setQ(''); }, true)}
        ${item(5, 'Plug', 'Plugins', chevron, null, true)}
        ${item(6, 'Archive', 'Libraries', chevron, null, true)}
        ${item(7, 'At', 'Mention a file or person', html`<span data-slot="command-shortcut" class=${H.shortcutIcon}><kbd data-slot="kbd" class=${H.kbd}>@</kbd></span>`)}
      </div>
    </div>
  </div>`;
}

// ------------------------------------------------------------ compositor
function Composer({ onSend }) {
  const [text, setText] = useState('');
  const [chips, setChips] = useState([]); // playbooks agregados
  const [menuOpen, setMenuOpen] = useState(false);
  const edRef = useRef();
  const empty = !text.trim() && chips.length === 0;
  const send = () => { if (empty) return; onSend({ text: text.trim(), chips }); setText(''); setChips([]); if (edRef.current) edRef.current.textContent = ''; };
  return html`<div class="absolute inset-x-0 top-0 bottom-4 pointer-events-none"><div class="flex min-h-full flex-col justify-end px-4">
    <div class="pointer-events-auto relative w-full"><div class="w-full"><div class="relative mx-auto max-w-[calc(var(--container-chat)-2rem)]"><div class="relative"><div class="relative z-10">
      <div class=${H.composerBox}>
        <div class="relative w-full"><div>
          <div translate="no" class=${H.editor + ' cursor-text'} aria-label="Message" onClick=${(e) => e.target === e.currentTarget || e.target.tagName === 'P' ? edRef.current?.focus() : null}>
            <p class=${empty ? 'is-empty is-editor-empty' : ''} data-placeholder="Ask me a question…">
              ${chips.map((c) => html`<span class="react-renderer node-composerChip"><${PlaybookChip} name=${c.name} onRemove=${() => setChips(chips.filter((x) => x !== c))} /></span> `)}
              <span ref=${edRef} contenteditable="true" class="inline-block min-w-[2px] outline-none" onInput=${(e) => setText(e.target.textContent)}
                onKeyDown=${(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === 'Backspace' && !text && chips.length) setChips(chips.slice(0, -1)); }}></span>
            </p>
          </div>
        </div></div>
        <div class=${H.toolbar}>
          <div class="flex min-w-0 flex-wrap items-center gap-1.5"><div class="flex min-w-0 flex-wrap items-center gap-1.5">
            <${Popover} open=${menuOpen} onOpenChange=${setMenuOpen} class=${H.menuPop}
              trigger=${(p) => html`<button type="button" ...${p} aria-label="Add files and context" title="Add files and context" class=${H.addBtn}>
                <span class="pointer-fine:hidden absolute top-1/2 left-1/2 size-12 -translate-1/2"></span>
                <${Icon} name="Plus" class="size-4 transition-transform duration-150 group-aria-expanded/add:rotate-45 motion-reduce:transition-none" /></button>`}>
              <${AddMenu}
                onPickPlaybook=${(p) => { setChips([...chips, p]); setMenuOpen(false); setTimeout(() => edRef.current?.focus(), 0); }}
                onCreateWithAI=${() => { const t = ' Create a playbook to review '; setText(t); if (edRef.current) edRef.current.textContent = t; setMenuOpen(false); setTimeout(() => edRef.current?.focus(), 0); }} />
            <//>
          </div></div>
          <div class="ml-auto flex shrink-0 items-center gap-0.5">
            <button type="button" disabled=${empty} title="Improve query" class=${H.roundBtn}><${Icon} name="MagicWand" class="size-4" /><span class="sr-only">Improve query</span></button>
            <div class="relative"><button type="button" aria-label="Effort: Auto" class=${H.effort}>Auto<${Icon} name="CaretDown" class="size-3" /></button></div>
            <button type="button" aria-label="Start dictation" title="Start dictation" class=${H.roundBtn}><${Icon} name="Microphone" class="size-4" /></button>
            <button type="button" disabled=${empty} aria-label="Send message" class=${H.send} onClick=${send}><${Icon} name="ArrowUp" /></button>
          </div>
        </div>
      </div>
    </div></div></div></div></div>
  </div></div>`;
}

// ------------------------------------------------------------ panel de chat
function ChatPane({ split, onOpenFile, onCite, onCloseSplit }) {
  const [extra, setExtra] = useState([]);
  const scrollRef = useRef();
  useEffect(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [extra.length]);
  // Mensajes nuevos (simulados): el usuario envía algo desde el compositor o elige una opción.
  const push = (user, reply) => setExtra((x) => [...x, { user, reply }]);
  const onSend = ({ text, chips }) => push(
    html`<${UserText}>${chips.map((c) => html`<span class=${K.playbookChip}><span class=${K.playbookChipIcon}><${Icon} name="ListChecksBold" class="size-2.75" /></span><span class="min-w-0 truncate">${c.name}</span></span> `)}${text}<//>`,
    chips.length ? 'review' : 'text');
  const onOption = (segs) => push(html`
    <div><div class=${K.prose}><p class=${K.userP}>Necesito que hagas los siguientes cambios en el archivo <${FileChip} name="NDA-Google-Drive" onClick=${onOpenFile} />:</p></div></div>
    <div><div class=${K.prose}><ul class="my-2 ml-6 list-disc"><li class="mt-1">"${segs.filter(([t]) => t === 'del').map(([, s]) => s).join(' ')}" -> "${segs.filter(([t]) => t === 'ins').map(([, s]) => s).join(' ')}"</li></ul></div></div>`, 'change');

  const extraNodes = extra.map((m) => html`
    <${UserMessage} collapsible=${m.reply === 'change'}>${m.user}<//>
    ${m.reply === 'review' ? html`<${AssistantMessage} groups worked=${{ label: 'Worked for 56s', steps: STEPS.m3 }}>
        <${Group}><${PlaybookReview} review=${REVIEW} onOpenFile=${onOpenFile} onOption=${onOption} /><//>
        <${Group}><${Block} first><${P}>La revisión identificó <${B}>una regla inaceptable<//> según el playbook “NDA de Proveedores”.<//><//><//>
      <//>`
    : m.reply === 'change' ? html`<${AssistantMessage} worked=${{ label: 'Worked for 11s', steps: STEPS.m5 }} cited onOpenFile=${onOpenFile}>
        <${Block} first><${P}>Cambio aplicado en el <${Cite} label="archivo de la conversación" onCite=${() => onOpenFile()} />. No modifica el documento original de Google Drive.<//><//>
      <//>`
    : html`<${AssistantMessage}><${Block} first><${P}>(Respuesta simulada)<//><//><//>`}`);

  return html`<div class="flex min-h-0 flex-1 flex-col">
    <div data-slot="pane-header" class="contents"><header class=${H.chatHeader}>
      <div class="flex min-w-0 items-center gap-2">
        <div class="flex min-w-0 items-center gap-1"><button type="button" class=${H.rename} title="Rename chat" aria-label="Rename chat">Revisión de NDA</button></div>
        <button type="button" aria-label="Chat options" class=${H.optionsBtn}><${Icon} name="DotsThree" class="size-4" /></button>
      </div>
      <div class="flex shrink-0 items-center gap-1">
        <button type="button" aria-label="Open conversation files" title="Open conversation files" class=${H.iconBtn}><${Icon} name="Folders" class="size-4" /></button>
        ${split && html`<button type="button" aria-label="Float chat" title="Float chat" class=${H.iconBtn + ' desktop-no-drag'}><${Icon} name="PictureInPicture" class="size-4" /></button>`}
      </div>
    </header></div>
    <div class="flex min-h-0 flex-1 flex-col overflow-auto scroll-smooth"><div class="flex min-h-full flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
      <div data-slot="sidebar-wrapper" class="group/sidebar-wrapper group/sidebar-wrapper w-full has-data-[variant=inset]:bg-sidebar relative flex min-w-0 flex-1 overflow-hidden min-h-0 h-full" style="--sidebar-width: min(760px, 92vw); --sidebar-width-icon: 3rem;">
        <div class="relative flex min-w-0 flex-col flex-1 overflow-hidden">
          <div data-slot="message-scroller" class="relative min-h-0 overflow-hidden @container mx-auto w-full min-w-0 flex-1">
            <div ref=${scrollRef} data-slot="message-scroller-viewport" class="size-full overflow-y-auto overscroll-contain outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_bottom,transparent,#000_1.5rem)] scroll-auto">
              <div data-slot="message-scroller-content" class="min-h-full min-w-0 w-full max-w-[calc(min(100%,var(--container-chat),100dvw))] space-y-4 px-4 py-8 lg:mx-auto pb-32">
                <${Conversation} onCite=${onCite} onOpenFile=${onOpenFile} onOption=${onOption} extra=${extraNodes} />
                <div class="pointer-events-none"></div>
              </div>
            </div>
          </div>
          <${Composer} onSend=${onSend} />
        </div>
      </div>
    </div></div></div>
  </div>`;
}

// ------------------------------------------------------------ panel del documento
function highlight(text, quote) {
  if (!quote) return text;
  const i = text.indexOf(quote);
  if (i < 0) return text;
  return html`${text.slice(0, i)}<mark class=${H.mark}>${quote}</mark>${text.slice(i + quote.length)}`;
}

function DocumentPane({ mode, setMode, quote }) {
  const toggles = html`<div class="flex min-w-0 items-center gap-1 overflow-x-auto overflow-y-hidden empty:hidden">
    <div class="flex shrink-0 items-center gap-2 empty:hidden"></div>
    <div class="flex items-center gap-0.5">
      <button type="button" aria-label="View" title="View" class=${mode === 'view' ? H.docToggleOn : H.docToggleOff} onClick=${() => setMode('view')}><${Icon} name="Eye" class="size-4" /></button>
      <button type="button" aria-label="Transcription" title="Transcription" class=${mode === 'transcription' ? H.docToggleOn : H.docToggleOff} onClick=${() => setMode('transcription')}><${Icon} name="TextT" class="size-4" /></button>
    </div>
    <span class="mx-0.5 h-5 w-px bg-border"></span>
    <button type="button" aria-label="Share" title="Share" class=${H.iconBtn.replace(' shrink-0', '')}><${Icon} name="ShareNetwork" /></button>
    <button type="button" aria-label="Options" class=${C.btnGhostIcon8}><${Icon} name="DotsThree" class="size-4" /></button>
  </div>`;
  return html`<div class="flex min-h-0 flex-1 flex-col">
    <${PageHeader} title=${html`<${Breadcrumb} items=${[{ label: FILE_NAME }]} />`} actions=${toggles} tabsRow=${null} />
    <div class="flex min-h-0 flex-1 flex-col overflow-auto scroll-smooth"><div class="flex min-h-full flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
      <div class="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-background"><div class="flex min-h-0 flex-col overflow-hidden bg-background h-full flex-1">
        <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div data-slot="scroll-area" class=${cx('relative min-h-0 overflow-hidden flex-1', mode === 'transcription' && 'bg-muted/30')}>
            <div data-slot="scroll-area-viewport" class=${H.scrollViewport}><div data-slot="scroll-area-content">
              ${mode === 'view'
                ? html`<pre class="p-5 text-xs font-mono whitespace-pre-wrap break-words">${DOCUMENT_RAW}</pre>`
                : html`<div class="flex justify-center px-4 py-6"><div class=${H.docCard}><div class=${H.docProse}>
                    <p class=${K.p}>${DOCUMENT.title}</p>
                    <ol class="my-4 ml-6 list-decimal">${DOCUMENT.clauses.map((c) => html`<li class="mt-2">${highlight(c, quote)}</li>`)}</ol>
                  </div></div></div>`}
            </div></div>
          </div>
        </div>
      </div></div>
    </div></div></div>
  </div>`;
}

// ------------------------------------------------------------ app
function App() {
  const [doc, setDoc] = useState({ open: true, mode: 'view', quote: null }); // empieza como en la captura: documento abierto
  const openFile = () => setDoc({ open: true, mode: 'view', quote: null });
  const onCite = (quote) => setDoc({ open: true, mode: quote ? 'transcription' : 'view', quote });
  const closeSplit = () => setDoc({ ...doc, open: false });
  useEffect(() => { document.title = 'Revisión de NDA - Magnar'; }, []);

  const chatTab = { title: 'Revisión de NDA', icon: 'ChatCircle', active: true };
  const gridCols = 'grid-template-columns: minmax(340px, var(--drive-split)) auto minmax(360px, 1fr);';
  const stripPad = 'padding-left: max(0.5rem, calc(var(--desktop-navigation-controls-end, var(--desktop-safe-area-left, 0px)) - 48px + 0.5rem));';

  return html`
  <div data-slot="sidebar-wrapper" class="group/sidebar-wrapper group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar" style="--sidebar-width: 16rem; --sidebar-width-icon: 32px;">
    <${Sidebar} activeApp=${null} />
    <main data-slot="sidebar-inset" class=${C.inset}>
      <div class="flex-1 flex flex-col overflow-auto scroll-smooth">
        <div class="relative flex min-h-0 flex-1 flex-col" style="--drive-split: 40%;">
          ${doc.open ? html`
            <div class="grid shrink-0" style=${gridCols}>
              <${TabStrip} tabs=${[chatTab]} label="Left side tabs" trailing=${null} />
              <div class="desktop-drag-region w-2"></div>
              <${TabStrip} tabs=${[{ title: FILE_NAME, img: TXT_ICON, active: true }]} label="Right side tabs" trailing="close" onTrailing=${closeSplit} padLeft=${false} />
            </div>
            <div class="relative grid min-h-0 flex-1 grid-rows-1" style=${gridCols}>
              <section role="tabpanel" class=${C.panel} style="grid-column: 1;">
                <div class="flex min-h-0 flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
                  <${ChatPane} split onOpenFile=${openFile} onCite=${onCite} />
                </div></div>
              </section>
              <div class="col-start-2 row-start-1 flex"><div class="w-2"></div></div>
              <section role="tabpanel" class=${C.panel} style="grid-column: 3;">
                <div class="flex min-h-0 flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
                  <${DocumentPane} mode=${doc.mode} quote=${doc.quote} setMode=${(m) => setDoc({ ...doc, mode: m })} />
                </div></div>
              </section>
            </div>`
          : html`
            <${TabStrip} tabs=${[chatTab]} />
            <div class="relative grid min-h-0 flex-1 grid-rows-1">
              <section role="tabpanel" class=${C.panel} style="grid-column: 1 / -1;">
                <div class="flex min-h-0 flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
                  <${ChatPane} onOpenFile=${openFile} onCite=${onCite} />
                </div></div>
              </section>
            </div>`}
        </div>
      </div>
    </main>
  </div>`;
}

render(html`<${App} />`, document.getElementById('root'));
