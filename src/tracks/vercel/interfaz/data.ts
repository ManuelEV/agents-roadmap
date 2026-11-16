import type { Tone } from '@/components/ui'
import { REFUND_POLICY, runTool } from '@/sim/andes'

/* Todo nombre de API, tipo de parte y estado sale de docs/research/vercel-2026-11.md (§3 aprobación, §4, §5).
   Los ids (msg_…, call_…, approval_…) son inventados con la forma que muestra la doc del protocolo. */

export const MODEL = 'anthropic/claude-sonnet-5.5'
export const CHAT_ID = 'chat_7781_a3'
export const IDS = { message: 'msg_a1f4c0', text: 'msg_t7c2e9', call: 'call_9Kq2xB' }

export const QUESTION = '¿Dónde está mi pedido 4821?'
export const ORDER_OUTPUT = runTool('get_order_status', { order_id: '4821' })
export const ANSWER_DELTAS = ['Tu pedido 4821 ', '(Zapatillas trekking Cordillera 41) ', 'va en ruta con AndesExpress, ', 'seguimiento AX-88213-CL. ', 'Llega el 14 de noviembre.']
export const ANSWER = ANSWER_DELTAS.join('')

/* ------------------------------------------------------------------------ */
/* Lab 1 · El recorrido: cinco estaciones                                     */
/* ------------------------------------------------------------------------ */
export type Station = { id: string; label: string; where: string; tone: Tone; what: string; code: string; lang: 'ts' | 'http' | 'json' }
export const STATIONS: Station[] = [
  {
    id: 'agent',
    label: 'result.stream',
    where: 'servidor · agente',
    tone: 'model',
    what: 'El loop del agente produce un stream con todas sus partes: texto, llamadas a tools y resultados. En v7 se llama stream (antes fullStream); textStream es la versión que solo trae texto y por eso no le sirve a una interfaz que quiera dibujar tools.',
    code: `const result = streamText({
  model: '${MODEL}',
  messages: await convertToModelMessages(messages),
  tools,
  stopWhen: isStepCount(5),
});

result.stream;      // todas las partes
result.textStream;  // solo el texto`,
    lang: 'ts',
  },
  {
    id: 'convert',
    label: 'toUIMessageStream',
    where: 'servidor · borde',
    tone: 'system',
    what: 'El servidor traduce ese stream a partes de mensaje de UI y lo devuelve como respuesta HTTP. Con una instancia de ToolLoopAgent, createAgentUIStreamResponse hace las dos cosas en una llamada.',
    code: `return createUIMessageStreamResponse({
  stream: toUIMessageStream({ stream: result.stream }),
});

// con un ToolLoopAgent:
return createAgentUIStreamResponse({
  agent: andi,
  uiMessages: messages,
});`,
    lang: 'ts',
  },
  {
    id: 'wire',
    label: 'data: {json}',
    where: 'la red · SSE',
    tone: 'data',
    what: 'Por el cable viajan eventos SSE: cada uno es data: seguido de un JSON con un campo type. El stream termina con data: [DONE]. Si escribes el backend en otro lenguaje, basta con emitir estos eventos y el header x-vercel-ai-ui-message-stream: v1.',
    code: `x-vercel-ai-ui-message-stream: v1

data: {"type":"start","messageId":"${IDS.message}"}
data: {"type":"start-step"}
data: {"type":"text-delta","id":"${IDS.text}","delta":"Tu pedido 4821 "}
data: {"type":"finish"}
data: [DONE]`,
    lang: 'http',
  },
  {
    id: 'hook',
    label: 'useChat',
    where: 'navegador · hook',
    tone: 'user',
    what: 'useChat envía los mensajes con su transporte (por defecto POST /api/chat) y va armando el mensaje del asistente con cada parte que llega. Expone status (submitted, streaming, ready, error). No maneja el input: eso es un useState tuyo.',
    code: `const { messages, sendMessage, status } = useChat();

// equivale a:
useChat({
  transport: new DefaultChatTransport({ api: '/api/chat' }),
});`,
    lang: 'ts',
  },
  {
    id: 'parts',
    label: 'message.parts',
    where: 'navegador · render',
    tone: 'tool',
    what: 'Cada mensaje tiene id, role y parts, en orden. Una parte text trae texto; una parte tool-{nombre} trae el estado, el input y el output de esa tool, tipados. Tú decides qué componente dibuja cada una.',
    code: `message.parts.map(part => {
  switch (part.type) {
    case 'text':
      return <p>{part.text}</p>;
    case 'tool-get_order_status':
      return <OrderCard part={part} />;
  }
});`,
    lang: 'ts',
  },
]

/* ------------------------------------------------------------------------ */
/* Lab 2 · El cable                                                           */
/* ------------------------------------------------------------------------ */
export type Chunk = { at: number; type: string; rest: string; tone: Tone }
const ch = (at: number, type: string, tone: Tone, fields?: Record<string, unknown>): Chunk => ({
  at,
  type,
  tone,
  rest: fields ? ',' + JSON.stringify(fields).slice(1, -1) : '',
})

export const CHUNKS: Chunk[] = [
  ch(1, 'start', 'system', { messageId: IDS.message }),
  ch(1, 'start-step', 'system'),
  ch(2, 'tool-input-start', 'tool', { toolCallId: IDS.call, toolName: 'get_order_status' }),
  ch(2, 'tool-input-delta', 'tool', { toolCallId: IDS.call, inputTextDelta: '{"order_id":"48' }),
  ch(2, 'tool-input-delta', 'tool', { toolCallId: IDS.call, inputTextDelta: '21"}' }),
  ch(3, 'tool-input-available', 'tool', { toolCallId: IDS.call, toolName: 'get_order_status', input: { order_id: '4821' } }),
  ch(4, 'tool-output-available', 'data', { toolCallId: IDS.call, output: ORDER_OUTPUT }),
  ch(5, 'finish-step', 'system'),
  ch(5, 'start-step', 'system'),
  ch(6, 'text-start', 'model', { id: IDS.text }),
  ...ANSWER_DELTAS.map((delta) => ch(6, 'text-delta', 'model', { id: IDS.text, delta })),
  ch(7, 'text-end', 'model', { id: IDS.text }),
  ch(7, 'finish-step', 'system'),
  ch(7, 'finish', 'system'),
  ch(7, '[DONE]', 'system'),
]

export const SERVER_STAGES: { label: string; sub: string; tone: Tone }[] = [
  { label: 'POST /api/chat', sub: 'llega { messages }: UIMessage[]', tone: 'user' },
  { label: 'createAgentUIStreamResponse', sub: 'abre la respuesta en streaming', tone: 'system' },
  { label: 'Paso 1 · modelo', sub: 'decide llamar get_order_status', tone: 'model' },
  { label: 'execute()', sub: 'corre tu función con order_id 4821', tone: 'tool' },
  { label: 'Paso 2 · modelo', sub: 'redacta con el resultado', tone: 'model' },
  { label: 'Fin del loop', sub: 'el modelo no pidió más tools', tone: 'system' },
]

export type ToolState = 'input-streaming' | 'input-available' | 'output-available' | 'output-error'
export type WireStep = {
  title: string
  body: string
  stage: number
  status: 'submitted' | 'streaming' | 'ready'
  /** partes del mensaje del asistente en este punto */
  stepStarts: number
  tool?: ToolState
  text: 'none' | 'streaming' | 'done'
  route: string[]
  page: string[]
}
export const WIRE_STEPS: WireStep[] = [
  {
    title: 'Camila envía el mensaje',
    body: 'sendMessage({ text }) agrega el mensaje del usuario a messages y el transporte hace POST /api/chat con el arreglo completo de UIMessage. status pasa a submitted. El servidor no recuerda nada: todo lo que sabe de la conversación viene en este cuerpo.',
    stage: 0,
    status: 'submitted',
    stepStarts: 0,
    text: 'none',
    route: ['await request.json()'],
    page: ['sendMessage({ text: input })'],
  },
  {
    title: 'El servidor abre el stream',
    body: 'createAgentUIStreamResponse recibe los uiMessages, arranca el agente y devuelve la respuesta de inmediato. Llegan start (con el id del mensaje del asistente) y start-step: empieza el primer paso del loop. status pasa a streaming.',
    stage: 1,
    status: 'streaming',
    stepStarts: 1,
    text: 'none',
    route: ['createAgentUIStreamResponse({', 'agent: andi', 'uiMessages: messages'],
    page: ['useChat()'],
  },
  {
    title: 'El modelo empieza a escribir la llamada',
    body: 'El modelo no responde con texto: pide una tool. tool-input-start anuncia cuál, y los tool-input-delta traen el JSON del input a pedazos. En el mensaje ya existe una parte tool-get_order_status con state input-streaming: la interfaz puede mostrar un esqueleto.',
    stage: 2,
    status: 'streaming',
    stepStarts: 1,
    tool: 'input-streaming',
    text: 'none',
    route: ['agent: andi'],
    page: ["case 'tool-get_order_status'", '<OrderCard'],
  },
  {
    title: 'El input está completo',
    body: 'tool-input-available trae el input completo, ya como objeto. La parte pasa a input-available y part.input.order_id ya se puede leer con tipo.',
    stage: 2,
    status: 'streaming',
    stepStarts: 1,
    tool: 'input-available',
    text: 'none',
    route: ['agent: andi'],
    page: ["case 'tool-get_order_status'", '<OrderCard'],
  },
  {
    title: 'El servidor ejecuta la tool',
    body: 'execute corre en el servidor y su valor de retorno viaja entero en tool-output-available. La parte pasa a output-available y la tarjeta se completa con datos reales, antes de que el modelo haya escrito una sola palabra.',
    stage: 3,
    status: 'streaming',
    stepStarts: 1,
    tool: 'output-available',
    text: 'none',
    route: ['agent: andi'],
    page: ["case 'tool-get_order_status'", '<OrderCard'],
  },
  {
    title: 'Cierra el paso 1, abre el paso 2',
    body: 'finish-step y start-step marcan la frontera entre pasos del loop. En el mensaje queda una parte step-start: el mismo mensaje del asistente contiene los dos pasos, en orden.',
    stage: 4,
    status: 'streaming',
    stepStarts: 2,
    tool: 'output-available',
    text: 'none',
    route: ['agent: andi'],
    page: ['message.parts.map'],
  },
  {
    title: 'El texto llega en deltas',
    body: 'text-start abre una parte text con su propio id y cada text-delta le agrega un fragmento. useChat vuelve a renderizar con cada uno: por eso el texto aparece escribiéndose.',
    stage: 4,
    status: 'streaming',
    stepStarts: 2,
    tool: 'output-available',
    text: 'streaming',
    route: ['agent: andi'],
    page: ["case 'text'", 'part.text'],
  },
  {
    title: 'Fin del stream',
    body: 'text-end cierra la parte, finish-step el paso, finish el mensaje y data: [DONE] la conexión. status vuelve a ready. El mensaje del asistente quedó con cuatro partes: step-start, tool-get_order_status, step-start y text.',
    stage: 5,
    status: 'ready',
    stepStarts: 2,
    tool: 'output-available',
    text: 'done',
    route: ['return createAgentUIStreamResponse'],
    page: ["status !== 'ready'"],
  },
]

/* ------------------------------------------------------------------------ */
/* Lab 3 · Estados de una parte de tool                                       */
/* ------------------------------------------------------------------------ */
export const ERROR_TEXT = 'La base de pedidos no respondió (timeout a los 5 s).'

export const PART_STATES: { id: ToolState; note: string; needles: string[] }[] = [
  {
    id: 'input-streaming',
    note: 'El modelo todavía está generando el input. No leas part.input como si estuviera completo: dibuja un esqueleto.',
    needles: ["case 'input-streaming'", '<OrderSkeleton />'],
  },
  {
    id: 'input-available',
    note: 'El input ya está completo y tipado; la tool está corriendo en el servidor. Puedes mostrar qué se está consultando.',
    needles: ["case 'input-available'", 'id={part.input.order_id}'],
  },
  {
    id: 'output-available',
    note: 'part.output es lo que devolvió execute, con su tipo. Un error de negocio devuelto como dato (pedido inexistente) también llega aquí: es un resultado, no una falla.',
    needles: ["case 'output-available'", 'order={part.output}'],
  },
  {
    id: 'output-error',
    note: 'La ejecución falló. No hay part.output; el mensaje viene en part.errorText. Dibuja un estado de error propio en vez de dejar la tarjeta cargando.',
    needles: ["case 'output-error'", 'text={part.errorText}'],
  },
]

export function toolPart(state: ToolState): Record<string, unknown> {
  const base = { type: 'tool-get_order_status', toolCallId: IDS.call, state }
  if (state === 'input-streaming') return base
  if (state === 'input-available') return { ...base, input: { order_id: '4821' } }
  if (state === 'output-available') return { ...base, input: { order_id: '4821' }, output: ORDER_OUTPUT }
  return { ...base, input: { order_id: '4821' }, errorText: ERROR_TEXT }
}

export const ORDER_PART_CODE = `// los componentes son tuyos
case 'tool-get_order_status':
  switch (part.state) {
    case 'input-streaming':
      return <OrderSkeleton />;
    case 'input-available':
      return <OrderSkeleton id={part.input.order_id} />;
    case 'output-available':
      return <OrderCard order={part.output} />;
    case 'output-error':
      return <ToolError text={part.errorText} />;
  }
`

/* ------------------------------------------------------------------------ */
/* Lab 4 · Aprobación                                                         */
/* ------------------------------------------------------------------------ */
export const LIMIT = REFUND_POLICY.autoApproveMaxClp

export type RefundCase = { id: 'over' | 'under'; label: string; ask: string; input: { order_id: string; amount_clp: number; reason: string }; callId: string; approvalId: string }
export const REFUND_CASES: RefundCase[] = [
  {
    id: 'over',
    label: 'Pedido 5102 · $65.970',
    ask: 'Quiero cancelar el pedido 5102 y que me devuelvan el dinero.',
    input: { order_id: '5102', amount_clp: 65970, reason: 'Cancelación antes del despacho' },
    callId: 'call_Rf5102',
    approvalId: 'approval_5102_01',
  },
  {
    id: 'under',
    label: 'Pedido 4790 · $29.990',
    ask: 'El polar del pedido 4790 me quedó chico. Quiero devolverlo.',
    input: { order_id: '4790', amount_clp: 29990, reason: 'Talla incorrecta' },
    callId: 'call_Rf4790',
    approvalId: '',
  },
]

/** Resultado de execute una vez que la llamada puede correr. La simulación compartida modela el tope dentro
    de la función; en el AI SDK el tope vive en toolApproval, así que execute solo corre con el visto bueno. */
export function refundOutput(c: RefundCase): Record<string, unknown> {
  const ok = runTool('request_refund', { ...c.input, amount_clp: Math.min(c.input.amount_clp, LIMIT) })
  return { ...ok, amount_clp: c.input.amount_clp }
}

export const APPROVAL_SERVER_CODE = `// agents/andi.ts (fragmento)
export const andi = new ToolLoopAgent({
  model: '${MODEL}',
  instructions: ANDI_INSTRUCTIONS,
  tools: { get_order_status, track_shipment, get_stock, request_refund },
  toolApproval: {
    request_refund: async ({ amount_clp }) =>
      amount_clp > 50_000 ? 'user-approval' : undefined,
  },
});
`

export const APPROVAL_CLIENT_CODE = `// dentro del switch de message.parts
case 'tool-request_refund':
  if (part.state === 'approval-requested' && !part.approval.isAutomatic) {
    return (
      <RefundApproval
        input={part.input}
        onApprove={() =>
          addToolApprovalResponse({ id: part.approval.id, approved: true })}
        onReject={() =>
          addToolApprovalResponse({ id: part.approval.id, approved: false })}
      />
    );
  }
`

/* ------------------------------------------------------------------------ */
/* Lab 5 · Persistencia                                                       */
/* ------------------------------------------------------------------------ */
export type StoredMsg = { id: string; role: 'user' | 'assistant'; parts: string[]; text: string; card?: boolean }
export type Turn = { user: StoredMsg; withContext: StoredMsg; withoutContext: StoredMsg }
export const TURNS: Turn[] = [
  {
    user: { id: 'msg_u1', role: 'user', parts: ['text'], text: QUESTION },
    withContext: { id: 'msg_a1', role: 'assistant', parts: ['step-start', 'tool-get_order_status', 'step-start', 'text'], text: ANSWER, card: true },
    withoutContext: { id: 'msg_a1', role: 'assistant', parts: ['step-start', 'tool-get_order_status', 'step-start', 'text'], text: ANSWER, card: true },
  },
  {
    user: { id: 'msg_u2', role: 'user', parts: ['text'], text: '¿Y quién lo trae?' },
    withContext: { id: 'msg_a2', role: 'assistant', parts: ['step-start', 'text'], text: 'AndesExpress. El código de seguimiento es AX-88213-CL.' },
    withoutContext: { id: 'msg_a2', role: 'assistant', parts: ['step-start', 'text'], text: '¿De qué pedido me hablas? Dime el número y lo reviso.' },
  },
]

export const PERSIST_ROUTE_CODE = `// app/api/chat/route.ts — con persistencia
import {
  streamText,
  convertToModelMessages,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
  type UIMessage,
} from 'ai';
import { loadChat, saveChat } from '@/lib/chat-store'; // tu base de datos

export async function POST(req: Request) {
  const { message, id }: { message: UIMessage; id: string } = await req.json();
  const messages = [...(await loadChat(id)), message];
  // con tools, metadata o data parts: validateUIMessages({ messages, tools })

  const result = streamText({
    model: '${MODEL}',
    instructions: ANDI_INSTRUCTIONS,
    messages: await convertToModelMessages(messages),
    tools: andiTools,
    stopWhen: isStepCount(5),
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      originalMessages: messages,
      onEnd: ({ messages }) => saveChat({ chatId: id, messages }),
    }),
  });
}
`

export const PERSIST_CLIENT_CODE = `// app/chat/[id]/chat.tsx (fragmento)
const { messages, sendMessage } = useChat({
  transport: new DefaultChatTransport({
    api: '/api/chat',
    prepareSendMessagesRequest({ messages, id }) {
      return { body: { message: messages[messages.length - 1], id } };
    },
  }),
});
`

/* ------------------------------------------------------------------------ */
/* Lab 6 · Código mínimo                                                      */
/* ------------------------------------------------------------------------ */
export const ROUTE_CODE = `// app/api/chat/route.ts
import { createAgentUIStreamResponse } from 'ai';
import { andi } from '@/agents/andi';

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: andi,
    uiMessages: messages,
  });
}
`

export const PAGE_CODE = `// app/page.tsx
'use client';

import { useChat } from '@ai-sdk/react';
import { useState } from 'react';
import { OrderCard } from '@/components/order-card';

export default function Chat() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status } = useChat();

  return (
    <main>
      {messages.map(message => (
        <div key={message.id}>
          {message.parts.map((part, i) => {
            switch (part.type) {
              case 'text':
                return <p key={i}>{part.text}</p>;
              case 'tool-get_order_status':
                return <OrderCard key={i} part={part} />;
            }
          })}
        </div>
      ))}

      <form
        onSubmit={e => {
          e.preventDefault();
          sendMessage({ text: input });
          setInput('');
        }}
      >
        <input
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          disabled={status !== 'ready'}
        />
      </form>
    </main>
  );
}
`
