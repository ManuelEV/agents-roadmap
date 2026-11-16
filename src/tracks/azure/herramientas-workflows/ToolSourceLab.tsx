import { useMemo, useState } from 'react'
import { Bot, Brain, Database, Server, ShieldAlert, ShieldCheck, Wrench } from 'lucide-react'
import { Lab, Pill, Segmented, Toggle } from '@/components/ui'
import { Code, linesOf } from '@/components/Code'
import { FlowDiagram, type FlowEdge, type FlowNode } from '@/components/Flow'
import { MCP_SERVER_TOOLS, MODEL_DEPLOYMENT, SOURCE_CODE, SOURCE_INFO, STOCK_RESULT, approvalModeCode, type SourceId } from './data'

function diagram(mode: SourceId): { nodes: FlowNode[]; edges: FlowEdge[]; flows: string[] } {
  const exec: FlowNode =
    mode === 'function'
      ? { id: 'exec', x: 430, y: 196, w: 190, h: 62, label: 'get_stock()', sub: 'función en tu proceso', tone: 'tool', icon: Wrench }
      : { id: 'exec', x: 430, y: 196, w: 190, h: 62, label: 'Servidor MCP', sub: 'inventario · get_stock', tone: 'tool', icon: Server, cls: 'is-outside' }
  const nodes: FlowNode[] = [
    { id: 'proc', x: 130, y: 196, w: 200, h: 62, label: 'Tu proceso', sub: mode === 'local' ? 'Agent + cliente MCP' : 'Agent de Agent Framework', tone: 'model', icon: Bot, badge: 'andes_ops' },
    { id: 'svc', x: 430, y: 52, w: 190, h: 58, label: 'Microsoft Foundry', sub: MODEL_DEPLOYMENT, tone: 'system', icon: Brain },
    exec,
    { id: 'erp', x: 710, y: 196, w: 150, h: 58, label: 'ERP', sub: 'stock por SKU', tone: 'data', icon: Database },
  ]
  const caller = mode === 'hosted' ? 'svc' : 'proc'
  const edges: FlowEdge[] = [
    { from: 'proc', to: 'svc', label: mode === 'hosted' ? 'declara la tool' : 'function_call', tone: 'model' },
    { from: caller, to: 'exec', label: mode === 'function' ? 'ejecuta' : 'tools/call', tone: 'tool' },
    { from: 'exec', to: 'erp', tone: 'data' },
  ]
  return { nodes, edges, flows: ['proc>svc', `${caller}>exec`, 'exec>erp'] }
}

export function ToolSourceLab() {
  const [mode, setMode] = useState<SourceId>('function')
  const [withDefault, setWithDefault] = useState(true)
  const info = SOURCE_INFO[mode]
  const d = useMemo(() => diagram(mode), [mode])
  const code = SOURCE_CODE[mode]
  const amCode = approvalModeCode(withDefault)

  return (
    <Lab
      title="get_stock de tres maneras: dónde corre y quién hace la llamada"
      hint="Cambia el origen de la herramienta"
      footer={<span className="small muted">El servidor MCP de inventario y su URL son del escenario. Las clases, argumentos y el resultado tienen la forma real; el diagrama es una simplificación.</span>}
    >
      <Segmented
        options={[
          { value: 'function', label: 'Función Python' },
          { value: 'local', label: 'MCP local' },
          { value: 'hosted', label: 'MCP hospedado' },
        ]}
        value={mode}
        onChange={setMode}
      />
      <div className="az-hw-source-diagram">
        <FlowDiagram nodes={d.nodes} edges={d.edges} flows={d.flows} width={820} height={262} ariaLabel={`Dónde corre get_stock como ${info.label}`} />
      </div>
      <div className="az-hw-source">
        <div className="stack">
          <div className="cmp anim-fade" key={mode}>
            <div className="cmp-row">
              <span className="k">Dónde corre</span>
              <span>{info.runs}</span>
            </div>
            <div className="cmp-row">
              <span className="k">Esquema</span>
              <span>{info.schema}</span>
            </div>
            <div className="cmp-row">
              <span className="k">Credenciales</span>
              <span>{info.auth}</span>
            </div>
            <div className="cmp-row">
              <span className="k">Elígela si</span>
              <span>{info.when}</span>
            </div>
          </div>
          <div className="az-hw-result">
            <span className="label">Lo que recibe el modelo en los tres casos</span>
            <code className="mono">{JSON.stringify(STOCK_RESULT)}</code>
          </div>
        </div>
        <Code code={code} lang="python" title={info.file} highlight={linesOf(code, ...info.needles)} maxHeight={470} />
      </div>

      <div className="az-hw-am">
        <div className="az-hw-am-head">
          <div>
            <strong>Aprobación por herramienta en un servidor MCP</strong>
            <div className="small muted">El servidor de inventario publica tres herramientas. Quita la clave "default" y mira cuál queda sin control.</div>
          </div>
          <Toggle label={<span className="mono">"default": "always_require"</span>} checked={withDefault} onChange={setWithDefault} />
        </div>
        <div className="az-hw-am-grid">
          <Code code={amCode} lang="python" highlight={withDefault ? linesOf(amCode, '"default"') : []} />
          <div className="az-hw-am-list">
            {MCP_SERVER_TOOLS.map((t) => {
              const needs = t.list === 'always' || (t.list === null && withDefault)
              const leak = t.list === null && !withDefault
              return (
                <div key={t.name} className={`az-hw-am-row${leak ? ' is-leak' : ''}`} data-tone={needs ? 'guard' : leak ? 'error' : 'ok'}>
                  {needs ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                  <span className="mono">{t.name}</span>
                  <span className="small muted">{t.what}</span>
                  <Pill tone={needs ? 'guard' : leak ? 'error' : 'ok'}>{needs ? 'pide aprobación' : leak ? 'se ejecuta sin preguntar' : 'directa'}</Pill>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </Lab>
  )
}
