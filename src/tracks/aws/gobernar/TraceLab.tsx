import { BarRow, Lab, Panel } from '@/components/ui'
import { CloudConsole, ConsoleBanner, ConsoleDisclaimer, ConsoleStatus, ConsoleTable, Focus } from '@/components/Console'
import { Terminal, useTerminalPlayer } from '@/components/Terminal'
import { Narration, PlayerBar, type StepInfo } from '@/components/Player'
import { usePlayer } from '@/lib/hooks'
import { EVALS, REGION, RUNTIME_ID, SESSION_ID, SPANS, TERM_OBS, TRACE_MS } from './data'

type TStep = StepInfo & { tab: 'Overview' | 'Sessions' | 'Traces' | 'Spans'; evals?: boolean }
const STEPS: TStep[] = [
  {
    tab: 'Overview',
    title: 'Las trazas ya están: las activó el deploy',
    body: 'Un agente desplegado en Runtime con el CLI trae instrumentación OpenTelemetry automática, y agentcore deploy activa CloudWatch Transaction Search (una vez por cuenta). Tras activarlo, los primeros spans tardan hasta 10 minutos en aparecer.',
  },
  {
    tab: 'Sessions',
    title: 'Sessions: una conversación de Camila',
    body: 'La página Observability de la consola de AgentCore muestra los mismos datos que CloudWatch, agrupados por sesión. El id es el runtimeSessionId que mandó tu backend.',
  },
  {
    tab: 'Traces',
    title: 'Traces: una traza por invocación',
    body: 'Cada mensaje de Camila es una invocación y, por lo tanto, una traza. Aquí buscas la lenta o la que falló.',
  },
  {
    tab: 'Spans',
    title: 'Spans: en qué se fueron los 2,14 segundos',
    body: 'Dentro de la traza, cada llamada al modelo y cada herramienta es un span. Casi todo el tiempo es del modelo; la tool y la autorización de Policy son una fracción. Los spans crudos viven en el stream "spans" del log group del runtime o en aws/spans.',
  },
  {
    tab: 'Spans',
    evals: true,
    title: 'Evaluations puntúa esas mismas trazas',
    body: 'Una online evaluation toma una muestra de las sesiones y las pasa por evaluadores LLM-as-a-Judge. Los built-in se nombran Builtin.<Nombre>; hay 13 desde la GA, y puedes escribir los tuyos con un LLM o con código en Lambda.',
  },
]

export function TraceLab() {
  const player = usePlayer(STEPS.length, { interval: 4800 })
  const s = STEPS[player.step]
  const term = useTerminalPlayer(TERM_OBS)
  return (
    <Lab title="De una invocación a una traza y a un puntaje" hint="Reproduce o haz clic en un paso" footer={<ConsoleDisclaimer />}>
      <PlayerBar player={player} labels={STEPS.map((x) => x.title)} />
      <div className="aws-gob-obs">
        <div className="anim-fade" key={s.tab}>
          <CloudConsole brand="aws" title="Observability" url={`bedrock-agentcore/observability?region=${REGION}`} project={REGION} tabs={['Overview', 'Sessions', 'Traces', 'Spans']} activeTab={s.tab}>
            {s.tab === 'Overview' && (
              <>
                <ConsoleBanner tone="ok">Transaction Search está habilitado en esta cuenta.</ConsoleBanner>
                <ConsoleTable
                  cols={['Agente', 'Sesiones', 'Trazas', 'Estado']}
                  rows={[[<span className="mono small">{RUNTIME_ID}</span>, '1', '3', <ConsoleStatus ok>READY</ConsoleStatus>]]}
                />
                <p className="small muted" style={{ margin: '10px 0 0' }}>
                  Métricas en el namespace <span className="mono">bedrock-agentcore</span>; logs en <span className="mono">/aws/bedrock-agentcore/runtimes/{RUNTIME_ID}-DEFAULT</span>.
                </p>
              </>
            )}
            {s.tab === 'Sessions' && (
              <Focus on style={{ display: 'block' }}>
                <ConsoleTable cols={['session.id', 'Trazas', 'Duración total']} rows={[[<span className="mono small">{SESSION_ID}</span>, '3', '6,9 s']]} hl={0} />
              </Focus>
            )}
            {s.tab === 'Traces' && (
              <ConsoleTable
                cols={['Entrada', 'Duración', 'Spans', 'Estado']}
                rows={[
                  ['"¿Dónde está mi pedido 4821?"', '2,14 s', String(SPANS.length), <ConsoleStatus ok>OK</ConsoleStatus>],
                  ['"¿Por dónde viene el envío?"', '2,41 s', '5', <ConsoleStatus ok>OK</ConsoleStatus>],
                  ['"Devuélveme los $69.990"', '2,35 s', '4', <ConsoleStatus>tool denegada</ConsoleStatus>],
                ]}
                hl={0}
              />
            )}
            {s.tab === 'Spans' && (
              <div className="aws-gob-wf" role="img" aria-label="Cascada de spans de una traza de 2,14 segundos">
                {SPANS.map((sp) => (
                  <div key={sp.id} className="aws-gob-wf-row" data-tone={sp.tone}>
                    <span className="aws-gob-wf-name" style={{ paddingLeft: sp.depth * 12 }}>
                      {sp.label}
                      <span className="aws-gob-wf-detail">{sp.detail}</span>
                    </span>
                    <span className="aws-gob-wf-track">
                      <span className="aws-gob-wf-bar" style={{ left: `${(sp.start / TRACE_MS) * 100}%`, width: `${Math.max(1.5, ((sp.end - sp.start) / TRACE_MS) * 100)}%` }} />
                    </span>
                    <span className="aws-gob-wf-ms mono">{sp.end - sp.start} ms</span>
                  </div>
                ))}
              </div>
            )}
          </CloudConsole>
        </div>
        <Narration steps={STEPS} step={player.step} />
        <div className="aws-gob-obs-grid">
          <div className={`aws-gob-evals${s.evals ? ' is-live' : ''}`}>
            <Panel title="online evaluation · andi_quality" tone="data" right={<span className="small muted">puntajes simulados</span>}>
              {EVALS.map((e) => (
                <div key={e.id} className="aws-gob-eval">
                  <BarRow label={<span className="mono">{e.id}</span>} value={s.evals ? e.score : 0} max={1} display={s.evals ? e.score.toFixed(2) : '—'} tone="data" />
                  <span className="small muted">{e.what}</span>
                </div>
              ))}
            </Panel>
          </div>
          <Terminal lines={TERM_OBS} upTo={term.upTo} typed={term.typed} player={term} title="bash · trazas y evaluación desde el CLI" maxHeight={330} />
        </div>
      </div>
    </Lab>
  )
}
