// Flujo de Playbooks (Knowledge › Playbooks)
// Pantallas: lista sin selección · detalle/edición · modal "New Playbook" · filtros.
import { html, render, useState, useEffect } from '../vendor/preact-htm.js';
import { C } from '../shared/classes.js';
import { Icon, Flag } from '../shared/icons.js';
import { AppShell, PageHeader, Breadcrumb } from '../shared/shell.js';
import { Dialog, Select, Popover, Field, cx } from '../shared/ui.js';
import { COUNTRIES, SEED_PLAYBOOKS } from './data.js';

const uid = () => 'pbk-' + Math.random().toString(16).slice(2, 10);
const countryName = (code) => COUNTRIES.find((c) => c.code === code)?.name;

// ------------------------------------------------------------ router (hash)
function useRoute() {
  const get = () => location.hash.replace(/^#\/?/, '');
  const [r, setR] = useState(get());
  useEffect(() => { const f = () => setR(get()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
const go = (id) => { location.hash = id ? '/' + id : '/'; };

// ------------------------------------------------------------ piezas
function SectionTabs() {
  const tabs = [['Templates', 'FileText'], ['Skills', 'SlidersHorizontal'], ['Playbooks', 'BookOpenText'], ['Libraries', 'Archive']];
  return html`<div class="@container/section-tabs min-w-0 w-full">
    <div data-orientation="horizontal" data-slot="tabs" class="group/tabs group/tabs flex gap-2 data-horizontal:flex-col" data-horizontal="">
      <div data-orientation="horizontal" data-slot="tabs-list" data-variant="line" aria-label="Knowledge" class=${C.sectionTabsList}>
        ${tabs.map(([l, i]) => html`<button type="button" data-orientation="horizontal" data-active=${l === 'Playbooks' ? '' : undefined} aria-selected=${l === 'Playbooks'} data-slot="tabs-trigger" aria-label=${l} class=${C.sectionTab}>
          <${Icon} name=${i} class="size-4" /><span class="hidden @min-[28rem]/section-tabs:inline">${l}</span></button>`)}
      </div>
    </div>
  </div>`;
}

function FiltersButton({ onlyMine, setOnlyMine }) {
  return html`<${Popover} align="end" class=${C.popoverBase + ' p-2.5 w-80 max-w-[calc(100vw-2rem)] max-h-[var(--available-height)] space-y-4 overflow-y-auto'}
    trigger=${(p) => html`<button type="button" ...${p} aria-label="Filters" class=${C.btnOutlineIconRel}><${Icon} name="SlidersHorizontal" />
      ${onlyMine && html`<span class="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary"></span>`}</button>`}>
    <div class="flex items-center justify-between gap-3"><h2 class="text-sm font-medium">Filters</h2></div>
    <button type="button" class=${C.filterOption} onClick=${() => setOnlyMine(!onlyMine)}>
      <span class="flex size-3.5 shrink-0 items-center justify-center">${onlyMine && html`<${Icon} name="Check" class="size-3.5" />`}</span>
      <span class="truncate">Only my playbooks</span>
    </button>
  <//>`;
}

function SearchInput({ value, onInput }) {
  return html`<div class="relative min-w-0 max-w-full"><div class="relative transition-opacity motion-reduce:transition-none">
    <${Icon} name="MagnifyingGlass" class=${C.searchIcon} />
    <input data-slot="input" placeholder="Search playbooks..." aria-label="Search playbooks..." class=${C.searchInput} type="text" value=${value} onInput=${(e) => onInput(e.target.value)} />
  </div></div>`;
}

// Buscador colapsable de la cabecera (pantalla sin selección)
function HeaderSearch({ value, onInput }) {
  const [open, setOpen] = useState(!!value);
  return html`<div class=${cx('relative min-w-0 max-w-full h-control shrink-0 transition-[width] duration-200', open ? 'w-64' : 'w-8')}>
    <button type="button" aria-label="Search playbooks..." title="Search playbooks..." class=${cx(C.btnOutlineIcon, 'absolute inset-0 transition-opacity motion-reduce:transition-none', open && 'pointer-events-none opacity-0')}
      onClick=${() => setOpen(true)}><${Icon} name="MagnifyingGlass" class="size-4" /></button>
    <div class=${cx('relative transition-opacity motion-reduce:transition-none', !open && 'pointer-events-none opacity-0')}>
      <${Icon} name="MagnifyingGlass" class=${C.searchIcon} />
      <input data-slot="input" placeholder="Search playbooks..." aria-label="Search playbooks..." class=${C.searchInput} type="text" value=${value}
        ref=${(el) => open && el && !value && setTimeout(() => el.focus(), 0)} onInput=${(e) => onInput(e.target.value)} onBlur=${() => !value && setOpen(false)} />
    </div>
  </div>`;
}

function PlaybookItem({ pb, selected }) {
  return html`<a class=${selected ? 'group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors bg-accent text-accent-foreground' : 'group flex items-center gap-2 rounded-md px-2.5 py-2 transition-colors hover:bg-muted/60 data-[highlighted]:bg-muted/60'}
    href=${'#/' + pb.id}>
    <div class="flex min-w-0 flex-1 flex-col gap-1.5">
      <div class="min-w-0 flex-1">
        <div class="truncate text-sm font-medium leading-5">${pb.name}</div>
        <div class=${cx('truncate text-xs leading-4', selected ? 'text-accent-foreground/70' : 'text-muted-foreground')}>${pb.description || 'No description'}</div>
      </div>
      <div class="flex min-w-0 flex-wrap items-center text-muted-foreground">
        <span class="flex min-w-0 items-center gap-2">
          <span class="text-xs tabular-nums">${pb.rules.length}</span>
          ${pb.country && html`<span class="inline-flex min-w-0 items-center gap-1.5 text-muted-foreground max-w-28 text-xs"><span class="truncate">${countryName(pb.country)}</span></span>`}
          <span class=${C.badge}><${Icon} name="Lock" class="size-3" />Private</span>
        </span>
      </div>
    </div>
  </a>`;
}

function PlaybookList({ items, selectedId, withHeader, search, setSearch, onlyMine, setOnlyMine, onNew }) {
  return html`<aside class=${cx('w-full flex-col border-r md:flex md:w-72 md:shrink-0 xl:w-80', withHeader ? 'hidden' : 'flex')}>
    ${withHeader && html`
      <header class="flex h-11 shrink-0 items-center justify-between gap-2 px-3">
        <h2 class="truncate text-sm font-semibold">Playbooks</h2>
        <button type="button" data-slot="button" aria-label="New Playbook" title="New Playbook" class=${C.btnGhostIcon7} onClick=${onNew}><${Icon} name="Plus" class="size-4" /></button>
      </header>
      <div class="flex shrink-0 items-center gap-1.5 px-2 pb-2">
        <div class="min-w-0 flex-1"><${SearchInput} value=${search} onInput=${setSearch} /></div>
        <${FiltersButton} onlyMine=${onlyMine} setOnlyMine=${setOnlyMine} />
      </div>`}
    <nav class="flex-1 space-y-0.5 overflow-y-auto px-2 py-1.5 transition-opacity">
      ${items.map((pb) => html`<${PlaybookItem} key=${pb.id} pb=${pb} selected=${pb.id === selectedId} />`)}
      ${items.length === 0 && html`<p class="px-2.5 py-2 text-sm text-muted-foreground">No playbooks found</p>`}
    </nav>
    <div class=${C.listFooter}>
      <span class="min-w-0 truncate tabular-nums">${items.length} ${items.length === 1 ? 'playbook' : 'playbooks'}</span>
      <div class="ml-auto flex shrink-0 items-center gap-4"></div>
    </div>
  </aside>`;
}

function EmptySelection() {
  return html`<main class="min-w-0 flex-1 flex-col overflow-y-auto md:flex hidden">
    <div class=${C.emptyState}>
      <span class=${C.emptyIcon}><${Icon} name="BookOpenText" class="size-6" /></span>
      <div class="break-words w-full max-w-sm space-y-1 text-sm">
        <h2 class="font-medium text-foreground">Select a playbook</h2>
        <p class="text-muted-foreground">Pick a playbook from the list to review and edit its rules.</p>
      </div>
    </div>
  </main>`;
}

// ------------------------------------------------------------ editor
function PlaybookEditor({ pb, onSave }) {
  const [draft, setDraft] = useState(pb);
  useEffect(() => setDraft(pb), [pb.id, pb]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(pb);
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setRules = (fn) => setDraft((d) => ({ ...d, rules: fn(d.rules) }));
  const setRule = (id, k, v) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [k]: v } : r)));
  const addRule = () => setRules((rs) => [...rs, { id: uid(), name: 'Rule ' + (rs.length + 1), body: '' }]);
  const delRule = (id) => setRules((rs) => rs.filter((r) => r.id !== id));

  return html`<main class="min-w-0 flex-1 flex-col overflow-y-auto md:flex flex">
    <div class="flex h-11 shrink-0 items-center border-b px-2 md:hidden">
      <a class="flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground" href="#/"><${Icon} name="CaretLeft" class="size-4" />Playbooks</a>
    </div>
    <form class="flex min-h-0 flex-1 flex-col overflow-y-auto xl:flex-row xl:overflow-hidden" onSubmit=${(e) => { e.preventDefault(); onSave(draft); }}>
      <aside class="w-full shrink-0 space-y-6 border-b p-5 xl:w-96 xl:overflow-y-auto xl:border-r xl:border-b-0">
        <section class="space-y-4">
          <${Field} label="Name"><input data-slot="input" autocomplete="off" placeholder="NDA review" class=${C.input} type="text" value=${draft.name} onInput=${(e) => set('name', e.target.value)} /><//>
          <${Field} label="Description"><textarea data-slot="textarea" class=${C.textarea} placeholder="When to use this playbook..." rows="4" autocomplete="off" value=${draft.description} onInput=${(e) => set('description', e.target.value)}></textarea><//>
        </section>
      </aside>
      <section class="flex min-h-96 min-w-0 flex-1 flex-col xl:min-h-0">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2">
          <div>
            <h2 class="text-sm font-medium">Rules</h2>
            <p class="text-xs text-muted-foreground">Each rule is evaluated with an independent AI call.</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" data-slot="button" class=${C.btnOutlineXs} onClick=${addRule}><${Icon} name="Plus" class="size-3.5" />Rule</button>
            <button type="submit" disabled=${!dirty || !draft.name.trim()} data-slot="button" class=${C.btnPrimaryXs}><${Icon} name="FloppyDisk" class="size-3.5" />Save</button>
          </div>
        </header>
        <div class="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          ${draft.rules.length === 0 && html`<div class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">This playbook does not have rules yet.</div>`}
          ${draft.rules.map((r) => html`
            <div key=${r.id} class="space-y-3 rounded-lg border p-4">
              <div class="flex items-start gap-3">
                <div><div class="grid min-w-0 gap-2">
                  <input data-slot="input" aria-label="Rule name" autocomplete="off" placeholder="Rule name" class=${C.input} type="text" value=${r.name} onInput=${(e) => setRule(r.id, 'name', e.target.value)} />
                </div></div>
                <button type="button" data-slot="button" aria-label="Delete rule" class=${C.btnOutlineIcon} onClick=${() => delRule(r.id)}><${Icon} name="Trash" class="size-4" /></button>
              </div>
              <div><div class="grid min-w-0 gap-2">
                <textarea data-slot="textarea" class=${C.textareaMono} rows="4" spellcheck="false" autocomplete="off"
                  placeholder="Describe in free text what this rule should review, what is acceptable, what requires review, and what is unacceptable."
                  value=${r.body} onInput=${(e) => setRule(r.id, 'body', e.target.value)}></textarea>
              </div></div>
            </div>`)}
        </div>
      </section>
    </form>
  </main>`;
}

// ------------------------------------------------------------ modal New Playbook
function NewPlaybookDialog({ open, onClose, onCreate }) {
  const [name, setName] = useState('');
  const [country, setCountry] = useState('CL');
  useEffect(() => { if (open) { setName(''); setCountry('CL'); } }, [open]);
  const options = [{ value: '', label: 'No country', render: () => html`<div class="flex items-center gap-2"><${Icon} name="Globe" class="size-3.5 text-muted-foreground" /><span>No country</span></div>` },
    ...COUNTRIES.map((c) => ({ value: c.code, label: c.name, render: () => html`<div class="flex items-center gap-2"><${Flag} code=${c.code} /><span>${c.name}</span></div>` }))];
  return html`<${Dialog} open=${open} onClose=${onClose}>
    <div data-slot="dialog-header" class="flex flex-col gap-2">
      <h2 data-slot="dialog-title" class="cn-font-heading text-base leading-none font-medium">New Playbook</h2>
      <p data-slot="dialog-description" class=${C.dialogDescription}>Create a playbook with reusable rules.</p>
    </div>
    <form class="space-y-6" onSubmit=${(e) => { e.preventDefault(); name.trim() && onCreate({ name: name.trim(), country }); }}>
      <fieldset class="min-w-0 space-y-6">
        <${Field} label="Name"><input data-slot="input" autocomplete="off" placeholder="NDA review" class=${C.input} type="text" value=${name} onInput=${(e) => setName(e.target.value)} /><//>
        <${Field} label="Country"><${Select} label="Country" value=${country} onChange=${setCountry} options=${options} renderValue=${(o) => o.render()} /><//>
      </fieldset>
      <div data-slot="dialog-footer" class=${C.dialogFooter}>
        <button type="button" data-slot="button" class=${C.btnOutline} onClick=${onClose}>Cancel</button>
        <button type="submit" disabled=${!name.trim()} data-slot="button" class=${C.btnPrimary}>Create</button>
      </div>
    </form>
  <//>`;
}

// ------------------------------------------------------------ app
function App() {
  const route = useRoute();
  const [playbooks, setPlaybooks] = useState(SEED_PLAYBOOKS);
  const [search, setSearch] = useState('');
  const [onlyMine, setOnlyMine] = useState(false);
  const [dialog, setDialog] = useState(false);

  const selected = playbooks.find((p) => p.id === route);
  const filtered = playbooks.filter((p) => (!onlyMine || p.mine) && (p.name + ' ' + p.description).toLowerCase().includes(search.toLowerCase()));
  useEffect(() => { document.title = 'Playbooks - Magnar'; }, []);

  const create = ({ name, country }) => {
    const pb = { id: uid(), name, description: '', country, mine: true, rules: [] };
    setPlaybooks([pb, ...playbooks]); setDialog(false); go(pb.id);
  };
  const save = (draft) => setPlaybooks(playbooks.map((p) => (p.id === draft.id ? draft : p)));

  const header = selected
    ? html`<${PageHeader}
        title=${html`<${Breadcrumb} items=${[
          { label: 'Knowledge', href: '#/' },
          { label: 'My Playbooks', href: '#/' },
          { node: html`<h1 class="flex min-w-0 items-center text-foreground"><button type="button" class=${C.crumbMenuBtn}><span class="line-clamp-1">${selected.name}</span><${Icon} name="DotsThree" class="ml-1 size-3" /><span class="sr-only">Playbook options</span></button></h1>` },
        ]} />`}
        tabsRow=${html`<${SectionTabs} />`} />`
    : html`<${PageHeader}
        inlineTabs=${html`<${SectionTabs} />`}
        toolbar=${html`<${HeaderSearch} value=${search} onInput=${setSearch} /><${FiltersButton} onlyMine=${onlyMine} setOnlyMine=${setOnlyMine} />`}
        actions=${html`<button type="button" data-slot="button" aria-label="New Playbook" class=${C.btnPrimary} onClick=${() => setDialog(true)}><${Icon} name="Plus" class="size-4" />New Playbook</button>`} />`;

  return html`<${AppShell} activeApp="knowledge" tab=${{ title: selected ? selected.name : 'My Playbooks', icon: 'Books' }}>
    ${header}
    <div class="flex min-h-0 flex-1 flex-col overflow-auto scroll-smooth"><div class="flex min-h-full flex-1 flex-col"><div class="flex min-h-0 flex-1 flex-col">
      <div class="flex min-h-0 flex-1 overflow-hidden">
        <${PlaybookList} items=${filtered} selectedId=${selected?.id} withHeader=${!!selected} search=${search} setSearch=${setSearch}
          onlyMine=${onlyMine} setOnlyMine=${setOnlyMine} onNew=${() => setDialog(true)} />
        ${selected ? html`<${PlaybookEditor} pb=${selected} onSave=${save} />` : html`<${EmptySelection} />`}
      </div>
    </div></div></div>
    <${NewPlaybookDialog} open=${dialog} onClose=${() => setDialog(false)} onCreate=${create} />
  <//>`;
}

render(html`<${App} />`, document.getElementById('root'));
