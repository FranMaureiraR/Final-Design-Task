// Piezas del chat de Magnar: mensajes, "Worked for", citas, tarjeta de revisión del playbook,
// "Consecuencias del cambio", archivo adjunto, fuentes citadas y barra de acciones.
// Clases copiadas tal cual del DOM de app.magnar.ai.
import { html, useState } from '../vendor/preact-htm.js';
import { Icon } from '../shared/icons.js';
import { cx } from '../shared/ui.js';
import { TXT_ICON, FILE_NAME } from './data.js';

export const K = {
  userWrap: 'ml-auto flex min-w-0 max-w-[85%] flex-col items-end gap-2 break-words',
  userBubble: 'w-fit max-w-full rounded-xl bg-muted px-3 py-2 text-foreground',
  prose: 'space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
  proseNext: 'space-y-4 whitespace-normal [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&>h2:first-child]:mt-4 [&>[data-inline-table]:first-child]:mt-2',
  userP: 'leading-6 [&:not(:first-child)]:mt-4 whitespace-pre-line',
  p: 'leading-6 [&:not(:first-child)]:mt-4',
  workedBtn: 'flex w-fit max-w-full items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground',
  workedContent: 'relative mt-2 overflow-hidden text-popover-foreground outline-none before:absolute before:top-3 before:bottom-2 before:left-2 before:w-px before:bg-border animate-in fade-in-0 slide-in-from-top-2 pt-1',
  workedStep: 'grid w-full grid-cols-[1rem_minmax(0,1fr)_auto] gap-2 py-1 text-left text-sm text-muted-foreground',
  stepDot: 'relative z-10 mt-0.5 flex size-4 items-center justify-center',
  stepIcon: 'relative z-10 mt-0.5 flex size-4 items-center justify-center bg-background',
  actionBtn: "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5 gap-1 text-[0.8rem] h-8 w-8 p-0",
  link: 'cursor-pointer font-medium underline underline-offset-4',
  citeNum: 'inline-flex min-w-5 translate-y-[-0.08em] items-center justify-center rounded-full bg-zinc-100 px-1.5 py-0.5 text-[0.6875rem] font-semibold leading-none text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
  card: 'min-w-0 rounded-2xl bg-muted/50 p-5 sm:p-6',
  cardHeader: 'mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1',
  ruleTrigger: 'flex w-full items-start gap-3 rounded-md text-left outline-none enabled:cursor-pointer focus-visible:ring-2 focus-visible:ring-ring',
  badgeDanger: "group/badge inline-flex w-fit shrink-0 items-center justify-center overflow-hidden border border-transparent text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-secondary/80 h-auto rounded-md px-2 py-1 bg-destructive/10 text-destructive max-w-full gap-1.5",
  badgeSeverity: "group/badge inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden border border-transparent text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3! [a]:hover:bg-secondary/80 h-auto rounded-md px-2 py-1 bg-destructive/10 text-destructive",
  ruleSummary: 'mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground group-data-[open]/playbook-rule:hidden',
  ruleCaret: 'mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-data-[open]/playbook-rule:rotate-180',
  ruleBody: 'mt-1 text-sm leading-6 text-muted-foreground [&_p]:my-0 [&_p]:text-sm [&_p]:leading-6',
  option: 'block w-full rounded-xl bg-background px-4 py-3.5 text-left ring-1 ring-transparent outline-none transition-shadow sm:px-5 sm:py-4 enabled:hover:ring-border focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default',
  optionHead: 'text-[13px] leading-[18px] text-muted-foreground mb-1.5 flex items-center justify-between gap-3',
  optionText: 'block whitespace-pre-wrap break-words text-sm leading-[26px]',
  ins: 'rounded px-0.5 py-px no-underline [box-decoration-break:clone] bg-success/16 text-foreground dark:bg-success/30',
  del: 'text-muted-foreground line-through decoration-destructive',
  meta: 'text-[13px] leading-[18px] text-muted-foreground',
  where: 'text-[13px] leading-[18px] text-muted-foreground min-w-0 flex-1',
  blockquote: 'mt-4 border-l-2 pl-4 text-sm leading-6 text-muted-foreground',
  fileList: 'min-w-0 divide-y divide-border overflow-hidden rounded-lg border border-border',
  fileBtn: 'flex min-h-12 w-full min-w-0 cursor-pointer items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring disabled:cursor-default disabled:hover:bg-transparent select-none',
  citedLink: 'cursor-pointer underline-offset-4 block min-w-0 flex-1 truncate font-normal no-underline hover:no-underline',
  fileChip: 'inline-flex max-w-full cursor-pointer items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 mx-0.5 px-1.5 py-0.5 text-xs font-medium align-baseline no-underline',
  fileChipIcon: 'inline-flex size-4.5 shrink-0 items-center justify-center rounded-lg bg-blue-200 dark:bg-blue-500/30 text-blue-700 dark:text-blue-300',
  playbookChip: 'inline-flex max-w-full items-baseline gap-1 rounded-md pl-0.5 pr-1.5 py-0.5 mx-0.5 text-xs font-medium align-baseline bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 select-none cursor-default',
  playbookChipIcon: 'inline-flex size-[1lh] shrink-0 self-center items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300',
  chipRemove: "group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 in-data-[slot=button-group]:rounded-lg size-4 rounded-full p-0",
  showMore:"group/button inline-flex shrink-0 items-center justify-center border border-transparent bg-clip-padding font-medium whitespace-nowrap outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3 gap-1 relative mx-auto mt-1 h-6 px-2 text-xs text-muted-foreground transition-none hover:bg-background/50 hover:text-foreground",
};

// ------------------------------------------------------------ bloques básicos
// Un "bloque" de respuesta (cada párrafo/tarjeta va en su propio contenedor, igual que en Magnar)
export function Block({ first, children }) {
  return html`<div><div class="flex w-full gap-4 mr-auto justify-start"><div class="flex min-w-0 w-full flex-col gap-2 break-words"><div class="w-full">
    <div class=${first ? K.prose : K.proseNext}>${children}</div>
  </div></div></div></div>`;
}

export function P({ children }) { return html`<p class=${K.p}>${children}</p>`; }
export function B({ children }) { return html`<span class="font-semibold">${children}</span>`; }

// Cita numerada "1" → abre el documento resaltando `quote`
export function Cite({ quote, onCite, label }) {
  return html`<a href="#" class=${K.link} onClick=${(e) => { e.preventDefault(); onCite(quote); }}>
    <span class="inline-flex items-baseline gap-1 align-baseline">${label && html`<span>${label}</span>`}<span class=${K.citeNum}>1</span></span>
  </a>`;
}

export function Worked({ label, steps }) {
  const [open, setOpen] = useState(false);
  return html`<div data-work-section="true" class="max-w-full overflow-hidden text-sm text-muted-foreground">
    <div class="not-prose w-full space-y-2">
      <button aria-expanded=${open} data-slot="collapsible-trigger" data-state=${open ? 'open' : 'closed'} type="button" class=${K.workedBtn} onClick=${() => setOpen(!open)}>
        <span class="min-w-0 truncate text-left">${label}</span>
        <${Icon} name="CaretDown" class=${cx('size-4 shrink-0 transition-transform', open ? 'rotate-180' : 'rotate-0')} />
      </button>
      ${open && html`<div data-slot="collapsible-content" data-state="open" class=${K.workedContent}>
        <div class="relative space-y-3">
          ${steps.map(([icon, text]) => html`<div class="min-w-0"><div class=${K.workedStep}>
            <span data-work-step-icon="true" class=${icon ? K.stepIcon : K.stepDot}>${icon && html`<${Icon} name=${icon} class="size-4" />`}</span>
            <span class="min-w-0 space-y-1"><span class="block break-words leading-5 [overflow-wrap:anywhere]">${text}</span></span>
            <span class="flex items-start justify-end gap-1"></span>
          </div></div>`)}
        </div>
      </div>`}
    </div>
  </div>`;
}

export function ActionBar() {
  const btn = (label, icon) => html`<button type="button" aria-label=${label} title=${label} class=${K.actionBtn}><${Icon} name=${icon} class="h-4 w-4" /></button>`;
  return html`<div class="-ml-2.5 mr-1 mt-2"><div class="flex w-full min-w-0 items-center text-muted-foreground">
    <div class="flex shrink-0 items-center gap-1">
      ${btn('Copy final response', 'Copy')}${btn('Play audio', 'Play')}
      <div class="flex gap-1 items-center">${btn('Good response', 'ThumbsUp')}${btn('Bad response', 'ThumbsDown')}</div>
      ${btn('More options', 'DotsThree')}
    </div>
    <div class="ml-2 flex min-w-0 flex-1 items-center justify-end gap-2"></div>
  </div></div>`;
}

export function CitedSources({ onOpenFile }) {
  return html`<div class="mt-4 border-t border-border/60 pt-2 text-xs">
    <div class="mb-1 font-medium text-foreground">Cited sources</div>
    <ol class="space-y-1 text-muted-foreground"><li class="flex min-w-0 items-baseline gap-2">
      <span class="w-4 shrink-0 text-right text-[0.6875rem] tabular-nums">1</span>
      <div class="flex min-w-0 flex-1 items-baseline gap-2"><a href="#" class=${K.citedLink} onClick=${(e) => { e.preventDefault(); onOpenFile(); }}>${FILE_NAME}</a></div>
    </li></ol>
  </div>`;
}

export function FileCard({ onOpenFile }) {
  return html`<div class="not-prose my-8 space-y-6"><div class=${K.fileList}>
    <button type="button" class=${K.fileBtn} onClick=${onOpenFile}>
      <img alt="" draggable="false" width="24" height="24" class="shrink-0 select-none object-contain" src=${TXT_ICON} />
      <span class="min-w-0 flex-1 truncate text-sm text-foreground" title=${FILE_NAME}>${FILE_NAME}</span>
    </button>
  </div></div>`;
}

export function FileChip({ name, onClick }) {
  return html`<a href="#" class=${K.fileChip} onClick=${(e) => { e.preventDefault(); onClick?.(); }}>
    <span class=${K.fileChipIcon}><${Icon} name="FileText" class="size-2.75" /></span><span class="min-w-0 truncate">${name}</span>
  </a>`;
}

export function PlaybookChip({ name, onRemove }) {
  return html`<span title=${name} contenteditable="false" class=${K.playbookChip}>
    <span class=${K.playbookChipIcon}><${Icon} name="ListChecksBold" class="size-2.75" /></span>
    <span class="min-w-0 max-w-[min(28rem,calc(100vw-8rem))] truncate">${name}</span>
    ${onRemove && html`<button type="button" data-slot="button" aria-label=${'Remove ' + name} class=${K.chipRemove} onClick=${onRemove}><${Icon} name="X" class="size-2.5" /></button>`}
  </span>`;
}

// ------------------------------------------------------------ mensajes
export function UserMessage({ children, collapsible }) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = collapsible && !expanded;
  return html`<div data-slot="message-scroller-item" class="min-w-0 space-y-4"><div class="space-y-4">
    <div class="flex w-full gap-4 ml-auto justify-end"><div class=${K.userWrap}><div class=${K.userBubble}>
      <div class="flex min-w-0 flex-col">
        <div data-state=${collapsed ? 'collapsed' : 'expanded'} class=${collapsed ? 'relative flex min-w-0 flex-col gap-2 max-h-[7.5rem] overflow-hidden' : 'relative flex min-w-0 flex-col gap-2'}>
          ${children}
          ${collapsed && html`<div class="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-b from-transparent to-muted"></div>`}
        </div>
        ${collapsible && html`<button type="button" aria-expanded=${expanded} class=${K.showMore} onClick=${() => setExpanded(!expanded)}>
          <span class="absolute top-1/2 left-1/2 h-10 w-[max(100%,2.5rem)] -translate-1/2 pointer-fine:hidden"></span>${expanded ? 'Show less' : 'Show more'}</button>`}
      </div>
    </div></div></div>
  </div></div>`;
}
export function UserText({ children }) { return html`<div><div class=${K.prose}><p class=${K.userP}>${children}</p></div></div>`; }

// Grupo de bloques. Magnar separa tarjetas y texto en grupos distintos (cada uno con gap-5 interno).
export function Group({ children }) { return html`<div class="contents"><div class="flex flex-col gap-5">${children}</div></div>`; }

// `groups`: true si los hijos ya vienen envueltos en <Group> (para mensajes con varios grupos)
export function AssistantMessage({ worked, cited, onOpenFile, groups, children }) {
  return html`<div data-slot="message-scroller-item" class="min-w-0 space-y-4"><div class="space-y-4">
    ${worked && html`<${Worked} label=${worked.label} steps=${worked.steps} />`}
    ${groups ? children : html`<${Group}>${children}<//>`}
    ${cited && html`<${CitedSources} onOpenFile=${onOpenFile} />`}
    <${ActionBar} />
  </div></div>`;
}

// ------------------------------------------------------------ tarjetas
export function PlaybookReview({ review, onOpenFile, onOption }) {
  return html`<div class="not-prose my-8"><section class=${K.card}>
    <header class=${K.cardHeader}>
      <h4 class="text-sm leading-5 font-medium text-muted-foreground">Playbook · ${review.playbook}</h4>
      <span class="min-w-0 max-w-full truncate text-sm"><a href="#" class=${K.link} onClick=${(e) => { e.preventDefault(); onOpenFile(); }}>${FILE_NAME}</a></span>
    </header>
    <ul class="divide-y divide-border/60">
      ${review.rules.map((r) => html`<${RuleItem} rule=${r} onOption=${onOption} />`)}
    </ul>
  </section></div>`;
}

function RuleItem({ rule, onOption }) {
  const [open, setOpen] = useState(false);
  return html`<li class="py-3 first:pt-0 last:pb-0"><div data-slot="collapsible" class="group/playbook-rule" data-open=${open ? '' : undefined}>
    <button type="button" aria-expanded=${open} data-slot="collapsible-trigger" class=${K.ruleTrigger} onClick=${() => setOpen(!open)}>
      <span class="min-w-0 flex-1">
        <span class="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span data-slot="badge" data-variant="secondary" class=${K.badgeDanger}><span class="truncate">${rule.verdict}</span></span>
          <span class=${K.meta}>${rule.name}</span>
          <span class=${K.meta}>${rule.options.length} suggestions</span>
        </span>
        <span class="mt-1 block text-[15px] leading-6 font-medium">${rule.name}</span>
        <span class=${K.ruleSummary}>${rule.summary}</span>
      </span>
      <${Icon} name="CaretDown" class=${K.ruleCaret} />
    </button>
    ${open && html`<div data-open="" data-slot="collapsible-content">
      <div class=${K.ruleBody}><div class=${K.prose}><p class=${K.p}>${rule.summary}</p></div></div>
      <div class="mt-4 space-y-3">
        ${rule.options.map((segs, i) => html`<button type="button" class=${K.option} onClick=${() => onOption(segs)}>
          <span class=${K.optionHead}>Option ${i + 1}<${Icon} name="Circle" class="size-4.5 shrink-0" /></span>
          <span class=${K.optionText}>${segs.map(([t, s]) => t === 'ins'
            ? html`<ins class=${K.ins}><span class="sr-only">Added text: </span>${s}</ins>`
            : t === 'del' ? html`<del class=${K.del}><span class="sr-only">Removed text: </span>${s}</del>`
            : t === 'sp' ? html`<span> </span>` : s)}</span>
        </button>`)}
      </div>
    </div>`}
  </div></li>`;
}

export function Consequences({ items, onCite }) {
  return html`<div class="not-prose my-8 space-y-6"><section class=${K.card}>
    <header class=${K.cardHeader}><h4 class="text-sm leading-5 font-medium text-muted-foreground">Consecuencias del cambio</h4></header>
    <ul class="divide-y divide-border/60">
      ${items.map((c) => html`<li class="py-6 first:pt-0 last:pb-0">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span data-slot="badge" data-variant="secondary" class=${K.badgeSeverity}><span class="sr-only">Severity: </span>${c.severity}</span>
          <p class=${K.where}>${c.where}</p>
        </div>
        <p class="mt-3 text-[15px] leading-6 font-medium">${c.title} <span class="inline-flex flex-wrap items-center gap-1 align-middle"><${Cite} quote=${c.quote} onCite=${onCite} /></span></p>
        <p class="mt-1 text-sm leading-6 text-muted-foreground">${c.body}</p>
        <blockquote class=${K.blockquote}>${c.excerpt}</blockquote>
      </li>`)}
    </ul>
  </section></div>`;
}
