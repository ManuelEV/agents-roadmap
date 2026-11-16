import { useState } from 'react'
import { Lab, toneVar } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { LAYERS, MIDDLEWARE_CODE, RUN_TIMELINE, type LayerId } from './data'

const ORDER: LayerId[] = ['agent', 'chat', 'function']

export function MiddlewareLab() {
  const [sel, setSel] = useState<LayerId>('agent')
  const layer = LAYERS[sel]
  const hits = sel === 'agent' ? 1 : RUN_TIMELINE.filter((b) => b.layer === sel).length

  return (
    <Lab title="Tres capas de middleware sobre un mismo run" hint="Elige una capa y mira dónde se dispara">
      <div className="az-hw-mw-tabs" role="tablist">
        {ORDER.map((id) => (
          <button key={id} role="tab" aria-selected={id === sel} className={`az-hw-mw-tab${id === sel ? ' is-active' : ''}`} style={{ ['--tone' as string]: toneVar(LAYERS[id].tone) }} onClick={() => setSel(id)}>
            <span className="dot" />
            <span className="mono">{LAYERS[id].label} middleware</span>
          </button>
        ))}
      </div>

      <div className={`az-hw-mw-run${sel === 'agent' ? ' is-hit' : ''}`} style={{ ['--tone' as string]: toneVar(LAYERS.agent.tone) }}>
        <div className="az-hw-mw-run-head mono">
          agent.run("Quiero el reembolso del pedido 4790…")
          {sel === 'agent' && <span className="az-hw-mw-hit">aquí · 1 vez</span>}
        </div>
        <div className="az-hw-mw-blocks">
          {RUN_TIMELINE.map((b, i) => {
            const on = b.layer === sel
            return (
              <div key={b.id} className={`az-hw-mw-block${on ? ' is-hit' : ''}${sel !== 'agent' && !on ? ' is-dim' : ''}`} style={{ ['--tone' as string]: toneVar(LAYERS[b.layer].tone) }}>
                <span className="n">{i + 1}</span>
                <span className="mono l">{b.label}</span>
                <span className="small muted">{b.sub}</span>
                {on && <span className="az-hw-mw-hit">aquí</span>}
              </div>
            )
          })}
        </div>
      </div>

      <div className="az-hw-mw-grid">
        <div className="cmp anim-fade" key={sel}>
          <div className="cmp-row">
            <span className="k">Se dispara</span>
            <span>
              {layer.fires} <strong>({hits} {hits === 1 ? 'vez' : 'veces'} en este run)</strong>
            </span>
          </div>
          <div className="cmp-row">
            <span className="k">Contexto</span>
            <span className="mono">{layer.context}</span>
          </div>
          <div className="cmp-row">
            <span className="k">Como función</span>
            <span className="mono">{layer.decorator}</span>
          </div>
          <div className="cmp-row">
            <span className="k">Sirve para</span>
            <span>{layer.use}</span>
          </div>
        </div>
        <Code
          code={MIDDLEWARE_CODE}
          lang="python"
          title="ejemplo de la documentación · agent middleware"
          highlight={sel === 'agent' ? linesOf(MIDDLEWARE_CODE, 'context.result = AgentResponse(', 'return  ', 'await call_next()', 'middleware=[SecurityAgentMiddleware()]') : []}
          maxHeight={300}
        />
      </div>
    </Lab>
  )
}
