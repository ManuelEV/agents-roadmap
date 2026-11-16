import { useState } from 'react'
import { Lab, Panel, Pill, Segmented } from '@/components/ui'
import { Code } from '@/components/Code'
import { ANSWER_NO_SESSION, ANSWER_SESSION, FINAL_TEXT, Q1, Q2, SESSION_CODE, contextFor } from './data'

export function SessionLab() {
  const [mode, setMode] = useState<'off' | 'on'>('off')
  const [turn, setTurn] = useState<'1' | '2'>('2')
  const on = mode === 'on'
  const t = turn === '1' ? 1 : 2
  const ctx = contextFor(on, t)
  const code = SESSION_CODE[mode]
  const runLine = (on ? 1 : 0) + t
  const answer2 = on ? ANSWER_SESSION : ANSWER_NO_SESSION
  return (
    <Lab title="La misma pregunta de seguimiento, con y sin sesión" hint="Cambia el modo y el turno">
      <div className="row az-pa-controls">
        <Segmented
          options={[
            { value: 'off', label: 'Sin sesión' },
            { value: 'on', label: 'Con sesión' },
          ]}
          value={mode}
          onChange={setMode}
        />
        <Segmented
          options={[
            { value: '1', label: 'Turno 1' },
            { value: '2', label: 'Turno 2' },
          ]}
          value={turn}
          onChange={setTurn}
        />
        <Pill tone={on ? 'memory' : 'system'} mono>
          {on ? 'session=session' : 'run() suelto'}
        </Pill>
      </div>
      <Code code={code} lang="python" title="dentro de main()" highlight={on ? [1, runLine] : [runLine]} dim />
      <div className="az-pa-ses-grid">
        <Panel title={`Lo que el modelo tiene a la vista en el turno ${t}`} tone={on ? 'memory' : 'system'} right={<span className="mono small az-pa-nowrap">{ctx.length} {ctx.length === 1 ? 'elemento' : 'elementos'}</span>}>
          <div className="msgs" key={`${mode}-${turn}`}>
            {ctx.map((c, i) => (
              <div key={i} className={`msg anim-fade${c.fromSession ? ' az-pa-from-session' : ''}`} data-tone={c.tone}>
                <div className="msg-role">
                  {c.kind}
                  {c.fromSession && <span className="tok">de la sesión</span>}
                </div>
                <div className={`msg-text${c.mono ? ' az-pa-mono' : ''}`}>{c.text}</div>
              </div>
            ))}
          </div>
          {!on && t === 2 && <div className="az-pa-empty az-pa-gap">El turno 1 no está: ese run terminó y nadie guardó su conversación.</div>}
        </Panel>
        <div className="stack">
          <Panel title="Lo que ve Camila" tone="user">
            <div className="chat az-pa-chat" key={`${mode}-${turn}`}>
              <div className="chat-msg is-user">
                <div className="chat-bubble">{Q1}</div>
              </div>
              <div className="chat-msg">
                <div className="chat-name">Andi</div>
                <div className="chat-bubble">{FINAL_TEXT}</div>
              </div>
              {t === 2 && (
                <>
                  <div className="chat-msg is-user">
                    <div className="chat-bubble">{Q2}</div>
                  </div>
                  <div className="chat-msg">
                    <div className="chat-name">Andi</div>
                    <div className="chat-bubble">{answer2}</div>
                  </div>
                </>
              )}
            </div>
          </Panel>
          <div className="az-pa-verdict anim-fade" data-tone={t === 1 ? 'system' : on ? 'ok' : 'error'} key={`${mode}-${turn}`}>
            {t === 1
              ? 'El primer turno es igual en los dos modos: una llamada a get_order_status y la respuesta.'
              : on
                ? 'Con la sesión, el pedido 4821 y su fecha estimada ya están en la conversación: el modelo responde sin volver a llamar a la función.'
                : 'Sin sesión, "¿y cuándo llega?" llega sola. No hay pedido al que referirse y Andi tiene que volver a preguntar.'}
          </div>
        </div>
      </div>
    </Lab>
  )
}
