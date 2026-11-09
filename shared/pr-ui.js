// Piezas de la propuesta "Refinada" que comparten Playbooks y Tasks:
// pestañas con subrayado que se desliza, estado vacío ilustrado y barra flotante de cambios.
import { html, useState, useEffect, useLayoutEffect, useRef } from '../vendor/preact-htm.js';
import { Icon } from './icons.js';
import { Tip, cx } from './pb-kit.js';

// Rutas relativas a la raíz del sitio (funcionan en localhost y en GitHub Pages bajo /magnar-flows/).
const ROOT = new URL('..', import.meta.url).pathname;
const IS_B = typeof window !== 'undefined' && window.PR_VARIANT === 'list';
export const SIDEBAR_LINKS = { knowledge: ROOT + (IS_B ? 'playbooks-lista/' : 'playbooks-refinada/'), tasks: ROOT + 'tasks-final/' + (IS_B ? '?v=b' : '') };

// ------------------------------------------------------------ pestañas
// sections: [{ key, label, icon }]. En modo compacto solo la activa muestra su nombre;
// al hacer click en otra, su nombre se abre y la anterior queda como ícono.
export function Tabs({ sections, active, onSelect, compact, trailing }) {
  const ref = useRef(); const barRef = useRef(); const first = useRef(true);
  // El subrayado sigue a la pestaña cuadro a cuadro mientras su etiqueta se abre o se cierra
  // (sin re-render por cuadro). A pantalla completa los anchos no cambian y basta la transición CSS.
  const place = (animate) => {
    const el = ref.current?.querySelector('.pr-tab.is-on'), bar = barRef.current; if (!el || !bar) return;
    bar.style.transition = animate ? '' : 'none';
    bar.style.transform = `translateX(${el.offsetLeft}px)`; bar.style.width = el.offsetWidth + 'px';
  };
  useLayoutEffect(() => {
    if (first.current) { first.current = false; place(false); return; }
    if (!compact) { place(true); return; }
    let raf, t0 = performance.now();
    const loop = (t) => { place(false); if (t - t0 < 460) raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [active, compact]);
  return html`<div class="pr-tabs" role="tablist" ref=${ref}>
    ${sections.map((s) => {
      const on = s.key === active;
      const tab = html`<button type="button" role="tab" aria-selected=${on} aria-label=${s.label} class=${cx('pr-tab', on && 'is-on')} onClick=${() => onSelect(s.key)}>
        <${Icon} name=${s.icon} /><span class="lbl">${s.label}</span></button>`;
      return compact && !on ? html`<${Tip} label=${s.label}>${tab}<//>` : tab;
    })}
    ${trailing && html`<span class="grow"></span>${trailing}`}
<span class="pr-tabs-bar" ref=${barRef}></span>
  </div>`;
}

// ------------------------------------------------------------ estado vacío ilustrado
// La ilustración está hecha con las mismas piezas de la interfaz (chips, card, puntos de posición),
// no con una imagen. Entra escalonada y las flechas se dibujan.
const Arrow = ({ d, style, delay }) => html`<svg class="arrow" style=${style} width="60" height="60" viewBox="0 0 60 60" fill="none" aria-hidden="true">
  <path d=${d} stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style=${`animation-delay:${delay}ms`} /></svg>`;
export function Illustration({ kind = 'playbook' }) {
  const isTask = kind === 'task';
  const lines = isTask
    ? [['var(--ink-3)', 120], ['var(--ink-3)', 96], ['var(--ink-3)', 132]]
    : [['var(--success)', 132], ['var(--warning)', 104], ['var(--destructive)', 120]];
  return html`<div class="pr-ill" aria-hidden="true">
    <span class="chip tinted" style="left:36px;top:52px;transform:rotate(-3deg);animation-delay:60ms">
      <${Icon} name=${isTask ? 'Clock' : 'FileText'} />${isTask ? 'Every Monday · 9:00' : 'Contrato-Servicios.pdf'}</span>
    <${Arrow} d="M8 6 C 4 26, 14 40, 34 46 M34 46 l-8 -6 M34 46 l-9 3" style="left:70px;top:92px" delay=${300} />
    <div class="sheet" style="animation-delay:180ms">
      <div class="h"><${Icon} name=${isTask ? 'ListChecks' : 'BookOpenText'} />${isTask ? 'Revisar contratos nuevos' : 'NDA de Proveedores'}</div>
      ${lines.map(([c, w], i) => html`<div class="ln"><i style=${'background:' + c}></i><b style=${'width:' + w + 'px'}></b></div>`)}
    </div>
    <${Arrow} d="M6 50 C 26 48, 40 34, 46 10 M46 10 l-7 7 M46 10 l3 9" style="left:300px;top:66px" delay=${480} />
    <span class="chip" style="right:28px;top:40px;animation-delay:400ms"><span class="ok"><${Icon} name="Check" /></span>${isTask ? 'Run completed' : 'Reviewed'}</span>
  </div>`;
}
export function EmptyState({ kind, title, text, action }) {
  return html`<div class="pr-empty">${kind && html`<${Illustration} kind=${kind} />`}
    <h2>${title}</h2><p>${text}</p>${action}</div>`;
}
// Secciones de Knowledge que no son parte de este rediseño
export const SECTION_EMPTY = {
  templates: ['No templates yet', 'Templates you save from a conversation will appear here.'],
  skills: ['No skills yet', 'Skills teach Magnar how your team works. Add one to use it in any conversation.'],
  libraries: ['No libraries yet', 'Libraries group the documents Magnar can cite in a review.'],
};

// ------------------------------------------------------------ barra flotante de cambios
export function SaveBar({ count, onDiscard, onSave, saved, message = 'Changes saved' }) {
  if (saved) return html`<div class="pr-savebar is-saved" role="status"><${Icon} name="CheckCircle" />${message}</div>`;
  if (!count) return null;
  return html`<div class="pr-savebar" role="status">
    <span class="n">${count} unsaved ${count === 1 ? 'change' : 'changes'}</span><span class="sep"></span>
    <button type="button" class="pb-btn pb-btn-ghost sm" onClick=${onDiscard}>Discard</button>
    <${Tip} label="Save" kbd="⌘S" side="top"><button type="button" class="pb-btn pb-btn-primary sm" onClick=${onSave}>Save</button><//>
  </div>`;
}
