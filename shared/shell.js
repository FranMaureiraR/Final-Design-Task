// Marco de la app de Magnar: sidebar colapsado (íconos), tira de pestañas y panel principal.
// Es igual para ambos flujos; cada flujo solo cambia qué app está activa y el contenido del panel.
import { html } from '../vendor/preact-htm.js';
import { C } from './classes.js';
import { Icon } from './icons.js';

const NAV_TOP = [
  { label: 'New chat', icon: 'NotePencil' },
  { label: 'History', icon: 'ClockCounterClockwise' },
  { label: 'Projects', icon: 'Briefcase' },
];
const APPS = [
  { key: 'drive', label: 'Drive', icon: 'HardDrives' },
  { key: 'artifacts', label: 'Artifacts', icon: 'Browser' },
  { key: 'tasks', label: 'Scheduled tasks', icon: 'Clock', href: '../tasks/' },
  { key: 'compare', label: 'Compare', icon: 'ArrowsLeftRight' },
  { key: 'sign', label: 'Sign', icon: 'FileText' },
  { key: 'addons', label: 'Add-ons', icon: 'PuzzlePiece' },
  { key: 'knowledge', label: 'Knowledge', icon: 'Books', href: '../playbooks/' },
];

function NavItem({ item, active }) {
  return html`<li data-slot="sidebar-menu-item" data-sidebar="menu-item" class="group/menu-item relative overflow-hidden">
    <div class="select-none"><div class="flex justify-center py-0.5 select-none">
      <a aria-label=${item.label} title=${item.label} href=${item.href || '#'} data-sidebar="menu-button" data-active=${active ? '' : undefined} class=${C.sidebarBtn}
        onClick=${(e) => !item.href && e.preventDefault()}><${Icon} name=${item.icon} /></a>
    </div></div>
  </li>`;
}

export function Sidebar({ activeApp, links }) {
  return html`
  <div class="group peer text-sidebar-foreground hidden md:block" data-state="collapsed" data-collapsible="icon" data-variant="inset" data-side="left" data-slot="sidebar">
    <div data-slot="sidebar-gap" class=${C.sidebarGap}></div>
    <div data-slot="sidebar-container" data-side="left" class=${C.sidebarContainer}>
      <div data-sidebar="sidebar" data-slot="sidebar-inner" class="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:shadow-sm group-data-[variant=floating]:ring-1 group-data-[variant=floating]:ring-sidebar-border">
        <div data-slot="sidebar-header" data-sidebar="header" class=${C.sidebarHeader}>
          <div class="pb-1.5"><ul data-slot="sidebar-menu" class="flex w-full min-w-0 flex-col gap-0">
            <li data-slot="sidebar-menu-item" class="group/menu-item group/menu-item relative flex justify-center py-0.5">
              <button type="button" data-sidebar="menu-button" aria-label="Personal" class=${C.sidebarBtn}>
                <span class="flex size-6 shrink-0 items-center justify-center rounded-md bg-sidebar-foreground/5"><${Icon} name="User" class="size-3.5!" /></span>
              </button>
            </li>
          </ul></div>
          <fieldset aria-label="Conversations" class="w-full min-w-0">
            ${NAV_TOP.map((i) => html`<ul data-slot="sidebar-menu" class="flex w-full min-w-0 flex-col gap-0">
              <li data-slot="sidebar-menu-item" class="group/menu-item group/menu-item relative flex justify-center py-0.5">
                <a href="#" aria-label=${i.label} title=${i.label} data-sidebar="menu-button" class=${C.sidebarBtn} onClick=${(e) => e.preventDefault()}><${Icon} name=${i.icon} class="shrink-0" /></a>
              </li></ul>`)}
          </fieldset>
        </div>
        <div data-slot="sidebar-content" data-sidebar="content" class="no-scrollbar no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-auto [&_[data-sidebar=group]]:px-0">
          <div data-slot="sidebar-group" data-sidebar="group" class="relative flex w-full min-w-0 flex-col p-2 pt-0" aria-label="Apps">
            <div class="mx-auto my-1.5 h-px w-4 shrink-0 bg-sidebar-border"></div>
            <div data-slot="sidebar-group-content" class="w-full text-sm">
              <ul data-slot="sidebar-menu" class="flex w-full min-w-0 flex-col gap-0">
                ${APPS.map((a) => html`<${NavItem} item=${links && links[a.key] ? { ...a, href: links[a.key] } : a} active=${a.key === activeApp} />`)}
                <li data-slot="sidebar-menu-item" class="group/menu-item group/menu-item relative flex justify-center py-0.5">
                  <button type="button" data-sidebar="menu-button" aria-label="More" class=${C.sidebarBtn}><${Icon} name="DotsThree" /></button>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div data-slot="sidebar-footer" data-sidebar="footer" class="flex flex-col gap-2 p-2 border-t transition-colors px-0 pb-0.5 border-transparent">
          <button type="button" data-sidebar="menu-button" aria-label="Open product updates" class=${C.sidebarBtn}><${Icon} name="Sparkle" /></button>
          <div class="flex flex-col">
            <div class="flex justify-center py-0.5"><button type="button" data-sidebar="menu-button" aria-label="Help" class=${C.sidebarBtn}><${Icon} name="Question" /></button></div>
            <div class="flex justify-center py-0.5"><button type="button" data-sidebar="menu-button" aria-label="Account" class=${C.sidebarBtn}>
              <span class="relative shrink-0 overflow-visible!">
                <span data-slot="avatar" class="group/avatar relative flex shrink-0 select-none after:absolute after:inset-0 after:rounded-full after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten size-6 rounded-full">
                  <span class="flex size-full items-center justify-center rounded-full bg-muted text-[10px] font-medium text-foreground">F</span>
                </span>
                <span class="absolute -right-1 -bottom-0.5 h-2 w-3 overflow-hidden rounded-[2px] ring-1 ring-sidebar"><img src="../flags/CL.svg" alt="" class="block size-full!" /></span>
              </span>
            </button></div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
}

export function TabStrip({ tabs, label = 'Open tabs', trailing = 'split', onTrailing, padLeft = true }) {
  return html`
  <div data-drive-tab-strip="" class=${C.tabStrip} style=${padLeft ? "padding-left: max(0.5rem, calc(var(--desktop-navigation-controls-end, var(--desktop-safe-area-left, 0px)) - 48px + 0.5rem));" : undefined}>
    <div class="desktop-no-drag flex shrink-0 items-center gap-1 empty:hidden mb-px"></div>
    <div aria-label=${label} class=${C.tabList}>
      ${tabs.map((t) => html`
        <div class=${t.active ? C.tabActive : C.tab} data-collapsed=${t.collapsed ? '' : undefined}
          style=${t.collapsed !== undefined ? `transition: width .32s cubic-bezier(.2,.8,.2,1), min-width .32s cubic-bezier(.2,.8,.2,1), flex-basis .32s cubic-bezier(.2,.8,.2,1);${t.collapsed ? 'width:34px;min-width:34px;flex:0 0 34px;' : ''}` : undefined}>
          <button type="button" aria-selected=${t.active ? 'true' : 'false'} title=${t.title} class=${C.tabButton} onClick=${t.onClick}
            style=${t.collapsed ? 'justify-content:center;padding:0;' : undefined}>
            ${t.img ? html`<img alt="" draggable="false" width="16" height="16" class="shrink-0 select-none object-contain" src=${t.img} />` : html`<${Icon} name=${t.icon} class="size-4 shrink-0" />`}
            <span class=${t.active ? C.tabLabelActive : C.tabLabel} style=${t.collapsed ? 'display:none' : undefined}>${t.title}</span>
          </button>
          ${!t.collapsed && html`<button type="button" aria-label=${'Close ' + t.title} class=${t.active ? C.tabCloseActive : C.tabClose}><${Icon} name="X" class="size-3" /></button>`}
        </div>`)}
    </div>
    <button type="button" aria-label="New tab" class=${C.stripBtn + ' mb-px'}><${Icon} name="Plus" class="size-4" /></button>
    ${trailing && html`<div class="ml-auto flex shrink-0 items-center gap-1 mb-px">
      <button type="button" aria-label=${trailing === 'split' ? 'Open split view' : 'Close split view'} class=${C.stripBtn} onClick=${onTrailing}><${Icon} name="SquareSplitHorizontal" class="size-4" /></button>
    </div>`}
  </div>`;
}

// `tab` = pestaña activa. `prevTab` = pestaña anterior (por defecto la conversación "Ley del trabajador").
export function AppShell({ activeApp, tab, prevTab = { title: "Ley del trabajador", icon: "ChatCircle" }, tabs: tabsOverride, links, children }) {
  const tabs = tabsOverride || [prevTab, { ...tab, active: true }];
  return html`
  <div data-slot="sidebar-wrapper" class="group/sidebar-wrapper group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar" style="--sidebar-width: 16rem; --sidebar-width-icon: 32px;">
    <${Sidebar} activeApp=${activeApp} links=${links} />
    <main data-slot="sidebar-inset" class=${C.inset}>
      <div class="flex-1 flex flex-col overflow-auto scroll-smooth">
        <div class="relative flex min-h-0 flex-1 flex-col">
          <${TabStrip} tabs=${tabs} />
          <div class="relative grid min-h-0 flex-1 grid-rows-1">
            <section role="tabpanel" class=${C.panel} style="grid-column: 1 / -1;">
              <div class="flex min-h-0 flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
                ${children}
              </div></div>
            </section>
          </div>
        </div>
      </div>
    </main>
  </div>`;
}

// Cabecera de página (breadcrumb / título + acciones + pestañas de sección)
export function PageHeader({ title, actions, toolbar, tabsRow, inlineTabs, meta }) {
  return html`
  <div data-slot="pane-header" class="contents"><header class=${C.pageHeader}>
    <div class=${C.pageHeaderRow}>
      <div class=${C.phLead}></div>
      <div class=${C.phTitle}>
        ${inlineTabs ? html`<div class="desktop-no-drag min-w-0 overflow-x-auto empty:hidden flex-1">${inlineTabs}</div>` : html`<div class=${C.phCrumbWrap}>${title}</div>`}
        <div class="desktop-no-drag flex min-w-56 flex-1 self-stretch empty:hidden"></div>
        <div class="flex min-w-0 max-w-full items-center gap-2 empty:hidden">${inlineTabs ? html`<button type="button" aria-label="View information" class=${C.btnGhostIcon8}><${Icon} name="Info" class="h-4 w-4 text-muted-foreground" /></button>` : meta}</div>
      </div>
      <div class=${C.phToolbar}>${toolbar}</div>
      <div class=${C.phActions}><div class=${C.phActionsInner}>${actions}</div></div>
      ${tabsRow !== undefined && html`<div class=${C.phTabsRow}>${tabsRow}</div>`}
    </div>
  </header></div>`;
}

export function Breadcrumb({ items }) {
  // items: [{label, href}] ; el último es la página actual (puede traer `node` propio)
  return html`<nav aria-label="Breadcrumb" data-slot="breadcrumb" class="@container/breadcrumbs min-w-0 w-full">
    <ol data-slot="breadcrumb-list" class=${C.crumbList}>
      ${items.map((it, i) => {
        const last = i === items.length - 1;
        if (last) return html`<li data-slot="breadcrumb-item" class=${C.crumbPage}>${it.node || html`<span data-slot="breadcrumb-page" class="font-semibold text-foreground truncate" title=${it.label}><h1>${it.label}</h1></span>`}</li>`;
        return html`
          <li data-slot="breadcrumb-item" class=${C.crumbItem}><a class="block truncate transition-colors hover:text-foreground" title=${it.label} data-slot="breadcrumb-link" href=${it.href || '#'} onClick=${it.onClick}>${it.label}</a></li>
          ${i === 0 && items.length > 2 && html`<li data-slot="breadcrumb-item" class=${C.crumbItemNarrow}><button type="button" aria-label="Breadcrumb" class=${C.crumbEllipsisBtn}><span data-slot="breadcrumb-ellipsis" class="flex size-5 items-center justify-center [&>svg]:size-4"><${Icon} name="DotsThree" /><span class="sr-only">More</span></span></button></li>`}
          <li data-slot="breadcrumb-separator" class=${i === 0 ? C.crumbSep : '[&>svg]:size-3.5 shrink-0'}><${Icon} name="CaretRight" class="cn-rtl-flip" /></li>`;
      })}
    </ol>
  </nav>`;
}
