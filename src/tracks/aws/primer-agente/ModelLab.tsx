import { useState } from 'react'
import { Lab, Panel, Pill, Segmented } from '@/components/ui'
import { Code } from '@/components/Code'
import { MODELS, type RegionMode } from './data'

const usd = (n: number) => `$${n.toFixed(n < 0.1 ? 3 : 2)}`

export function ModelLab() {
  const [modelId, setModelId] = useState('sonnet')
  const [scope, setScope] = useState('global')
  const [region, setRegion] = useState<RegionMode>('explicit')

  const m = MODELS.find((x) => x.id === modelId)
  const pickModel = (id: string) => {
    setModelId(id)
    const next = MODELS.find((x) => x.id === id)
    if (next) setScope(next.inRegion ? 'base' : next.scopes[0])
  }

  const fullId = m ? (scope === 'base' ? m.base : `${scope}.${m.base}`) : null
  const resolvedRegion = !m || region === 'none' ? 'us-west-2' : 'us-east-1'
  const broken = !!m && scope === 'base' && !m.inRegion
  const price = !m ? undefined : scope === 'global' ? m.priceGlobal : m.inRegion && scope !== 'base' ? undefined : m.priceOther
  const rule = !m ? 4 : region === 'explicit' ? 1 : region === 'env' ? 2 : 4

  const code = !m
    ? `agent = Agent(\n    system_prompt=SYSTEM_PROMPT,\n    tools=[get_order_status],\n)   # sin model: Bedrock por defecto`
    : [
        region === 'env' ? '# en la shell: export AWS_DEFAULT_REGION=us-east-1' : null,
        'model = BedrockModel(',
        `    model_id="${fullId}",`,
        region === 'explicit' ? '    region_name="us-east-1",' : null,
        ')',
        'agent = Agent(model=model, ...)',
      ]
        .filter((l) => l !== null)
        .join('\n')

  return (
    <Lab title="¿Qué modelo y qué región termina usando tu agente?" hint="Cambia el modelo, el prefijo y la región">
      <div className="aws-pa-ctl">
        <div>
          <span className="label">modelo</span>
          <Segmented
            options={[{ value: 'default', label: 'Agent() sin model' }, ...MODELS.map((x) => ({ value: x.id, label: x.label }))]}
            value={modelId}
            onChange={pickModel}
          />
        </div>
        {m && (
          <div>
            <span className="label">prefijo del id</span>
            <Segmented options={[{ value: 'base', label: 'sin prefijo' }, ...m.scopes.map((p) => ({ value: p, label: `${p}.` }))]} value={scope} onChange={setScope} />
          </div>
        )}
        {m && (
          <div>
            <span className="label">región</span>
            <Segmented<RegionMode>
              options={[
                { value: 'explicit', label: 'region_name="us-east-1"' },
                { value: 'env', label: 'solo AWS_DEFAULT_REGION' },
                { value: 'none', label: 'no la defines' },
              ]}
              value={region}
              onChange={setRegion}
            />
          </div>
        )}
      </div>

      <div className="aws-pa-model">
        <div className="stack">
          <Code code={code} lang="python" title="agent.py" />
          <ol className="aws-pa-ladder" aria-label="Orden en que BedrockModel resuelve la región">
            <li className={rule === 1 ? 'is-win' : ''}>
              <b>1</b>
              <span>
                <code>region_name=</code> explícito
              </span>
            </li>
            <li className={rule === 2 ? 'is-win' : ''}>
              <b>2</b>
              <span>
                región de la sesión boto3 (<code>AWS_DEFAULT_REGION</code> o tu perfil)
              </span>
            </li>
            <li className="is-gap">
              <b>…</b>
              <span>
                <code>AWS_REGION</code> pesa menos que el perfil
              </span>
            </li>
            <li className={rule === 4 ? 'is-win' : ''}>
              <b>4</b>
              <span>
                default: <code>us-west-2</code>
              </span>
            </li>
          </ol>
        </div>

        <Panel title="Lo que corre de verdad" tone={broken ? 'error' : 'model'} right={<Pill tone={broken ? 'error' : !m || region === 'none' ? 'guard' : 'ok'}>{broken ? 'no se puede invocar' : !m || region === 'none' ? 'funciona, pero no lo elegiste tú' : 'explícito'}</Pill>}>
          <dl className="aws-pa-res">
            <dt>modelo</dt>
            <dd>{m ? m.label : 'Claude Sonnet 4.6'}</dd>
            <dt>model_id</dt>
            <dd className="mono">{fullId ?? 'el default de Strands'}</dd>
            <dt>región</dt>
            <dd className="mono">{resolvedRegion}</dd>
            <dt>endpoint</dt>
            <dd className="mono">{broken ? '—' : `https://bedrock-runtime.${resolvedRegion}.amazonaws.com`}</dd>
            <dt>precio</dt>
            <dd>
              {price ? (
                <>
                  <span className="mono tabular">
                    {usd(price[0])} / {usd(price[1])}
                  </span>{' '}
                  <span className="muted small">USD por 1M de tokens (input / output), tier Standard, visto el 15-nov-2026</span>
                </>
              ) : (
                <span className="muted small">no está en la tabla de precios de esta lección</span>
              )}
            </dd>
            {m && (
              <>
                <dt>para qué</dt>
                <dd>{m.role}</dd>
              </>
            )}
          </dl>
          <div className="aws-pa-why anim-fade" key={`${modelId}-${scope}-${region}`}>
            {!m && (
              <>
                La documentación de Strands lo dice literal: el default es "Claude Sonnet 4.6 in the <code>us-west-2</code> region". Funciona si tu cuenta tiene acceso, pero
                terminas pagando y depurando un modelo y una región que nadie eligió.
              </>
            )}
            {broken && (
              <>
                En <code>bedrock-runtime</code> los Claude 5.x no tienen endpoint in-region: se invocan con un perfil de inferencia. Agrega el prefijo, por ejemplo{' '}
                <code>global.{m.base}</code>. {m.note}
              </>
            )}
            {m && !broken && scope === 'global' && (
              <>
                El perfil <code>global.</code> enruta la petición entre varias regiones y es la fila más barata. Ojo en empresas: falla si una política de la organización
                (SCP) bloquea cualquiera de sus regiones destino. {m.priceNote}
              </>
            )}
            {m && !broken && scope !== 'global' && scope !== 'base' && !m.inRegion && (
              <>
                El perfil <code>{scope}.</code> mantiene el enrutamiento dentro de esa geografía. El precio mostrado es el de las filas sin sufijo <code>_global</code> del AWS
                Price List, 10 % más caras; que esas filas correspondan exactamente al uso geográfico está a confirmar. {m.priceNote} {m.note}
              </>
            )}
            {m && m.inRegion && scope === 'base' && <>Los Nova sí tienen endpoint in-region: el id base funciona directo, sin perfil y sin pasar por AWS Marketplace. {m.priceNote}</>}
            {m && m.inRegion && scope !== 'base' && (
              <>
                Nova Micro también tiene perfiles <code>us.</code> y <code>eu.</code>; el precio de esos perfiles no está en la fuente de esta lección. {m.priceNote}
              </>
            )}
            {m && !broken && region === 'none' && (
              <>
                {' '}
                Además, sin región explícita ni en la sesión, <code>BedrockModel</code> cae en <code>us-west-2</code>.
              </>
            )}
          </div>
        </Panel>
      </div>
    </Lab>
  )
}
