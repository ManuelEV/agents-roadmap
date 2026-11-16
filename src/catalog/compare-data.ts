import type { CompareRow } from './compare'

/* Datos del comparador. Fuente: docs/research/{google-agent-platform,aws,azure,vercel}-2026-11.md.
   Si un dato no está en esos archivos, no va aquí. */
export const COMPARE_VERIFIED = 'noviembre de 2026'

const L = 'https://learn.microsoft.com/en-us/azure/foundry'
const AF = 'https://learn.microsoft.com/en-us/agent-framework'
const AC = 'https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide'

export const COMPARE_ROWS: CompareRow[] = [
  /* 1 ─────────────────────────────────────────────────────────── */
  {
    id: 'framework',
    concept: 'Framework',
    question: '¿Cómo defines el agente?',
    intro:
      'El framework es la librería con la que declaras el agente: su modelo, sus instrucciones y sus herramientas. También ejecuta el ciclo de razonar, llamar una herramienta y volver a razonar.',
    topic: 'frameworks',
    cells: {
      google: {
        name: 'ADK (Agent Development Kit)',
        status: 'GA',
        note: 'Una función Python con type hints y docstring ya es una herramienta. Desde ADK 2.0 agentes, herramientas y funciones son nodos de un grafo (Workflow Runtime).',
        code: {
          lang: 'python',
          title: 'andes_ops/agent.py',
          code: `from google.adk.agents import Agent


def get_order_status(order_id: str) -> dict:
    """Devuelve el estado y el seguimiento de un pedido de Andes Market."""
    return {"status": "success", "order_id": order_id, "state": "en_ruta"}


root_agent = Agent(
    name="andes_ops",
    model="gemini-3.8-flash",
    description="Agente de operaciones de Andes Market.",
    instruction="Eres Andi. Consulta los pedidos con get_order_status.",
    tools=[get_order_status],
)`,
        },
        lesson: '/google/primer-agente',
        docs: 'https://adk.dev/agents/llm-agents/',
      },
      aws: {
        name: 'Strands Agents',
        status: 'GA',
        note: 'SDK open source guiado por el modelo: el decorador @tool convierte una función en herramienta. Su documentación lo llama ahora Strands Harness SDK; el paquete sigue siendo strands-agents. Fija siempre el modelo: el que trae por defecto es más antiguo.',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from strands import Agent, tool
from strands.models import BedrockModel


@tool
def get_order_status(order_id: str) -> str:
    """Devuelve el estado y el seguimiento de un pedido de Andes Market."""
    return f"Pedido {order_id}: en ruta con AndesExpress."


agent = Agent(
    name="andes_ops",
    model=BedrockModel(model_id="global.anthropic.claude-sonnet-5-5", region_name="us-east-1"),
    system_prompt="Eres Andi. Consulta los pedidos con get_order_status.",
    tools=[get_order_status],
)
agent("¿Dónde está mi pedido 4821?")`,
        },
        lesson: '/aws/primer-agente',
        docs: 'https://strandsagents.com/docs/user-guide/sdk/quickstart/python/',
      },
      azure: {
        name: 'Microsoft Agent Framework',
        status: 'GA',
        note: 'Framework open source para Python y .NET, sucesor de Semantic Kernel y AutoGen. El modelo llega a través de un cliente (aquí, el de Foundry) y cada herramienta declara si necesita aprobación.',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from typing import Annotated

from agent_framework import Agent, tool
from agent_framework.foundry import FoundryChatClient
from azure.identity import AzureCliCredential
from pydantic import Field


@tool(approval_mode="never_require")
def get_order_status(
    order_id: Annotated[str, Field(description="Número del pedido.")],
) -> str:
    """Devuelve el estado y el seguimiento de un pedido de Andes Market."""
    return f"Pedido {order_id}: en ruta con AndesExpress."


agent = Agent(
    client=FoundryChatClient(credential=AzureCliCredential()),  # lee FOUNDRY_PROJECT_ENDPOINT y FOUNDRY_MODEL
    name="andes_ops",
    instructions="Eres Andi. Consulta los pedidos con get_order_status.",
    tools=[get_order_status],
)`,
        },
        lesson: '/azure/primer-agente',
        docs: `${AF}/overview/`,
      },
      vercel: {
        name: 'AI SDK · ToolLoopAgent',
        status: 'GA',
        note: 'Toolkit TypeScript: el agente es un objeto con modelo, instrucciones y herramientas tipadas con Zod. Corre entero en memoria dentro de tu app y se detiene solo a los 20 pasos.',
        code: {
          lang: 'ts',
          title: 'agent.ts',
          code: `import { ToolLoopAgent, tool } from 'ai';
import { z } from 'zod';

export const andi = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  instructions: 'Eres Andi. Consulta los pedidos con get_order_status.',
  tools: {
    get_order_status: tool({
      description: 'Devuelve el estado y el seguimiento de un pedido de Andes Market.',
      inputSchema: z.object({
        order_id: z.string().describe('Número del pedido'),
      }),
      execute: async ({ order_id }) => ({ order_id, state: 'en_ruta' }),
    }),
  },
});`,
        },
        lesson: '/vercel/primer-agente',
        docs: 'https://ai-sdk.dev/docs/agents/building-agents',
      },
    },
  },

  /* 2 ─────────────────────────────────────────────────────────── */
  {
    id: 'modelo',
    concept: 'Modelo',
    question: '¿Quién razona?',
    intro:
      'El modelo decide qué herramienta llamar y redacta la respuesta. Lo habitual es un modelo capaz como orquestador y uno barato para tareas simples o sub-agentes. Precios en US$ por 1M de tokens, entrada / salida.',
    topic: 'llm',
    cells: {
      google: {
        name: 'Gemini',
        status: 'GA',
        note: 'Andi usa gemini-3.8-flash (0,75 / 3,75; sube a 1,50 / 7,50 el 1-ene-2027) y, para lo barato, gemini-3.5-flash-lite (0,30 / 2,50). El tope es gemini-4-argon (2 / 10; 4 / 20 desde el 1-dic-2026). Precios de la API en nivel pagado, vistos el 13-nov-2026; en la plataforma pueden diferir.',
        lesson: '/google/modelos',
        docs: 'https://aistudio.google.com/docs/pricing',
      },
      aws: {
        name: 'Claude en Amazon Bedrock',
        status: 'GA',
        note: 'Orquestador: global.anthropic.claude-sonnet-5-5 (2 / 10). Barato: global.anthropic.claude-haiku-5-5 (0,10 / 0,50 con prompts de hasta 100K tokens). AWS Price List, us-east-1, perfil global, visto el 15-nov-2026. Los Claude 5.x se invocan con un perfil de inferencia, no con el id base.',
        lesson: '/aws/mapa',
        docs: 'https://docs.aws.amazon.com/bedrock/latest/userguide/model-cards.html',
      },
      azure: {
        name: 'Foundry Models (OpenAI)',
        status: 'GA',
        note: 'Orquestador: gpt-5.4; barato: gpt-5.4-mini, el de los ejemplos oficiales de Agent Framework. En el código, model es el nombre de tu deployment, no el del modelo. Precios: a confirmar en la página oficial, que no mostró cifras el 15-nov-2026.',
        lesson: '/azure/mapa',
        docs: `${L}/foundry-models/concepts/models-sold-directly-by-azure`,
      },
      vercel: {
        name: 'AI Gateway',
        status: 'GA',
        note: 'Una sola credencial para cientos de modelos de varios proveedores, sin recargo sobre el precio de lista. Orquestador: anthropic/claude-sonnet-5.5 (2 / 10). Barato: anthropic/claude-haiku-5.5 (0,10 / 0,50). API de modelos del gateway, vista el 15-nov-2026.',
        lesson: '/vercel/mapa',
        docs: 'https://vercel.com/docs/ai-gateway',
      },
    },
  },

  /* 3 ─────────────────────────────────────────────────────────── */
  {
    id: 'herramientas',
    concept: 'Herramientas y MCP',
    question: '¿Cómo actúa el agente?',
    intro:
      'Una herramienta es una función que el modelo puede pedir que se ejecute. MCP es el protocolo para consumir herramientas que publica otro servidor, sin reescribirlas en tu agente.',
    topic: 'mcp',
    cells: {
      google: {
        name: 'Function tools + McpToolset',
        status: 'GA',
        note: 'Las funciones Python se registran solas como herramientas. Un servidor MCP entra como McpToolset; la documentación pide usar siempre tool_filter para exponer solo lo necesario.',
        code: {
          lang: 'python',
          title: 'andes_ops/agent.py',
          code: `from google.adk.agents import Agent
from google.adk.tools.mcp_tool import McpToolset
from google.adk.tools.mcp_tool.mcp_session_manager import StreamableHTTPConnectionParams

logistics = McpToolset(
    connection_params=StreamableHTTPConnectionParams(
        url="https://mcp.andesmarket.example/mcp",
    ),
    tool_filter=["track_shipment"],
)

root_agent = Agent(
    name="andes_ops",
    model="gemini-3.8-flash",
    tools=[get_order_status, logistics],
)`,
        },
        lesson: '/google/herramientas',
        docs: 'https://adk.dev/tools-custom/mcp-tools/',
      },
      aws: {
        name: '@tool + MCPClient',
        status: 'GA',
        note: 'El decorador @tool lee el docstring y los type hints. MCPClient va directo en la lista de herramientas y Strands gestiona su ciclo de vida; tool_filters limita lo que ve el modelo.',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from mcp.client.streamable_http import streamablehttp_client
from strands import Agent
from strands.tools.mcp import MCPClient

logistics = MCPClient(
    lambda: streamablehttp_client("https://mcp.andesmarket.example/mcp"),
    tool_filters={"allowed": ["track_shipment"]},
)

agent = Agent(tools=[get_order_status, logistics])`,
        },
        lesson: '/aws/herramientas-memoria',
        docs: 'https://strandsagents.com/docs/user-guide/sdk/tools/mcp-tools/',
      },
      azure: {
        name: '@tool + MCPStreamableHTTPTool',
        status: 'GA',
        note: 'El servidor MCP se abre como un contexto asíncrono y se pasa en la ejecución. Cada herramienta, propia o de MCP, lleva su modo de aprobación; allowed_tools filtra las del servidor.',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from agent_framework import Agent, MCPStreamableHTTPTool

async with (
    MCPStreamableHTTPTool(
        name="logistics",
        url="https://mcp.andesmarket.example/mcp",
        allowed_tools=["track_shipment"],
    ) as logistics,
    Agent(client=client, name="andes_ops",
          instructions="Eres Andi.") as agent,
):
    result = await agent.run("¿Dónde va el envío del pedido 4821?", tools=logistics)`,
        },
        lesson: '/azure/herramientas-workflows',
        docs: `${AF}/agents/tools/local-mcp-tools`,
      },
      vercel: {
        name: 'tool() + createMCPClient',
        status: 'GA',
        note: 'tool() declara la herramienta con inputSchema. El cliente MCP es liviano: convierte las herramientas del servidor en herramientas del AI SDK, y cerrarlo al terminar te toca a ti.',
        code: {
          lang: 'ts',
          title: 'agent.ts',
          code: `import { ToolLoopAgent } from 'ai';
import { createMCPClient } from '@ai-sdk/mcp';

const mcp = await createMCPClient({
  transport: { type: 'http', url: 'https://mcp.andesmarket.example/mcp' },
});
const logistics = await mcp.tools();

export const andi = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  tools: { get_order_status, ...logistics },
});
// al terminar: await mcp.close()`,
        },
        lesson: '/vercel/primer-agente',
        docs: 'https://ai-sdk.dev/docs/ai-sdk-core/mcp-tools',
      },
    },
  },

  /* 4 ─────────────────────────────────────────────────────────── */
  {
    id: 'gateway',
    concept: 'Datos y gateway de herramientas',
    question: '¿Cómo llega a tus sistemas?',
    intro:
      'En producción las herramientas tocan bases de datos y APIs internas. Un gateway administrado las publica como herramientas, con autenticación y control en un solo punto, para no cablear cada conexión dentro del agente.',
    topic: 'datos',
    cells: {
      google: {
        name: 'MCP Toolbox for Databases + Agent Gateway',
        note: 'MCP Toolbox es un servidor open source que convierte consultas SQL declaradas en tools.yaml en herramientas. Agent Gateway es el punto de control de red: deniega por defecto e inspecciona el tráfico MCP de entrada y salida.',
        code: {
          lang: 'yaml',
          title: 'tools.yaml',
          code: `kind: source
name: andes-pg
type: postgres
host: 127.0.0.1
port: 5432
database: andes
user: \${USER_NAME}
password: \${PASSWORD}
---
kind: tool
name: get_order_status
type: postgres-sql
source: andes-pg
description: Devuelve el estado de un pedido de Andes Market.
parameters:
  - name: order_id
    type: string
    description: Número del pedido.
statement: SELECT status, tracking FROM orders WHERE id = $1;`,
        },
        lesson: '/google/datos',
        docs: 'https://adk.dev/integrations/mcp-toolbox-for-databases/',
      },
      aws: {
        name: 'AgentCore Gateway',
        status: 'GA',
        note: 'Convierte funciones Lambda, APIs REST, esquemas OpenAPI y servidores MCP remotos en un único servidor MCP, con autenticación de entrada y de salida. No trae un equivalente directo a un toolbox de bases de datos. US$ 0,005 por 1.000 invocaciones (us-east-1, 15-nov-2026).',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `agentcore add gateway --name AndesGateway --authorizer-type NONE   # NONE: solo desarrollo
agentcore add gateway-target --gateway AndesGateway --target-configuration '{
    "name": "OrdersTarget",
    "targetType": "lambdaFunctionArn",
    "lambdaFunctionArn": {"lambdaArn": "<YOUR_LAMBDA_ARN>", "toolSchemaFile": "tools.json"}
  }'
agentcore deploy`,
        },
        lesson: '/aws/herramientas-memoria',
        docs: `${AC}/gateway-quick-start.html`,
      },
      azure: {
        name: 'Toolbox de Foundry + AI Gateway',
        status: 'GA',
        note: 'Un Toolbox agrupa herramientas tras un único endpoint MCP administrado, con autenticación y versiones. Los límites de tokens y el tráfico los gobierna AI Gateway (Azure API Management), cuya integración con Foundry está en preview. No hay una pieza única ni un toolbox de bases de datos equivalente.',
        code: {
          lang: 'python',
          title: 'toolbox.py',
          code: `from azure.ai.projects.models import MCPToolboxTool, ToolSearchToolboxTool

toolbox = project.toolboxes.create_version(
    name="andes-toolbox",
    description="Herramientas de pedidos de Andes Market",
    tools=[
        MCPToolboxTool(
            server_label="orders",
            server_url="https://mcp.andesmarket.example/mcp",
            require_approval="never",
            project_connection_id="orders-connection",
        ),
        ToolSearchToolboxTool(),
    ],
)`,
        },
        lesson: '/azure/herramientas-workflows',
        docs: `${L}/agents/concepts/toolbox-overview`,
      },
      vercel: {
        name: 'Lo traes tú',
        status: 'tú',
        note: 'AI Gateway es un proxy de modelos, no un gateway de herramientas. Para exponer tus datos escribes tu propio servidor MCP con mcp-handler en una ruta de Next.js o usas integraciones del Marketplace.',
        code: {
          lang: 'ts',
          title: 'app/api/mcp/route.ts',
          code: `import { createMcpHandler } from 'mcp-handler';
import { z } from 'zod';

const handler = createMcpHandler((server) => {
  server.registerTool(
    'get_order_status',
    {
      description: 'Devuelve el estado de un pedido de Andes Market.',
      inputSchema: z.object({ order_id: z.string() }),
    },
    async ({ order_id }) => ({
      content: [{ type: 'text', text: 'Pedido ' + order_id + ': en ruta' }],
    }),
  );
});

export { handler as GET, handler as POST };`,
        },
        lesson: '/vercel/produccion',
        docs: 'https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel',
      },
    },
  },

  /* 5 ─────────────────────────────────────────────────────────── */
  {
    id: 'memoria',
    concept: 'Sesiones y memoria',
    question: '¿Qué recuerda el agente?',
    intro:
      'La sesión guarda el historial y el estado de una conversación. La memoria de largo plazo extrae hechos que sobreviven entre conversaciones, por ejemplo las preferencias de un cliente.',
    topic: 'memoria',
    cells: {
      google: {
        name: 'Sessions + Memory Bank',
        status: 'GA',
        note: 'VertexAiSessionService guarda la sesión y su estado, con prefijos user:, app: y temp: para definir el alcance. Memory Bank extrae hechos con un modelo, los consolida por usuario y cobra por operación.',
        lesson: '/google/sesiones-memoria',
        docs: 'https://adk.dev/sessions/memory/',
      },
      aws: {
        name: 'AgentCore Memory',
        status: 'GA',
        note: 'Corto plazo: eventos por actor y sesión. Largo plazo: estrategias (SEMANTIC, USER_PREFERENCE, SUMMARIZATION, EPISODIC) que extraen registros de forma asíncrona. Ojo: la sesión de cómputo del runtime y el historial persistente son cosas distintas.',
        lesson: '/aws/herramientas-memoria',
        docs: `${AC}/memory-get-started.html`,
      },
      azure: {
        name: 'Conversations + Foundry Memory',
        status: 'preview',
        note: 'El historial vive en el servicio como Conversations (antes Threads). La memoria de largo plazo son memory stores con scope por usuario y sigue en preview; necesita un deployment de chat y otro de embeddings.',
        lesson: '/azure/herramientas-workflows',
        docs: `${L}/agents/how-to/memory-usage`,
      },
      vercel: {
        name: 'Lo traes tú',
        status: 'tú',
        note: 'No hay sesiones ni memoria administradas: guardas los UIMessage en tu propia base al terminar cada respuesta. Para largo plazo la documentación apunta a proveedores externos (Mem0, Letta, Supermemory, Redis) o a una herramienta propia.',
        lesson: '/vercel/interfaz',
        docs: 'https://ai-sdk.dev/docs/agents/memory',
      },
    },
  },

  /* 6 ─────────────────────────────────────────────────────────── */
  {
    id: 'runtime',
    concept: 'Dónde corre',
    question: '¿Dónde vive en producción?',
    intro:
      'El runtime administrado aloja el agente: lo escala, aísla cada conversación y le da un endpoint para invocarlo. Cambia cuánto empaquetas tú y cuánto tiempo puede durar una ejecución.',
    topic: 'despliegue',
    cells: {
      google: {
        name: 'Agent Runtime',
        note: 'Runtime administrado de la plataforma (antes Vertex AI Agent Engine). Un comando de ADK empaqueta y despliega; el recurso se sigue llamando reasoningEngines y cualquier cliente lo invoca con la misma API.',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `adk deploy agent_engine \\
  --project=$PROJECT_ID --region=$LOCATION_ID \\
  --display_name="Andi · Operaciones" \\
  --otel_to_cloud andes_ops`,
        },
        lesson: '/google/desplegar',
        docs: 'https://adk.dev/deploy/agent-runtime/deploy/',
      },
      aws: {
        name: 'AgentCore Runtime',
        status: 'GA',
        note: 'Serverless: cada sesión corre en su propia microVM, hasta 8 horas, y acepta cualquier framework. El CLI despliega con CDK. US$ 0,0895 por vCPU-hora + 0,00945 por GB-hora (V1, us-east-1, 15-nov-2026).',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `npm install -g @aws/agentcore
agentcore create --name AndesOps --template agent-python-strands
cd AndesOps
agentcore deploy
agentcore invoke --runtime agent \\
  --payload '{"prompt":"¿Dónde está mi pedido 4821?"}'`,
        },
        lesson: '/aws/desplegar',
        docs: `${AC}/agentcore-get-started-cli.html`,
      },
      azure: {
        name: 'Foundry hosted agents',
        status: 'GA',
        note: 'Tu código, como .zip o contenedor, en un sandbox por sesión con endpoint e identidad administrados. Si no necesitas código propio, un prompt agent se define sin runtime y no paga cómputo.',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `# requiere azd con la extensión de Foundry
azd auth login
azd ai agent init --template "<URL del azure.yaml de la plantilla>" \\
  --deploy-mode code --src .
azd provision
azd deploy
azd ai agent invoke "¿Dónde está mi pedido 4821?"`,
        },
        lesson: '/azure/desplegar',
        docs: `${L}/agents/quickstarts/quickstart-hosted-agent`,
      },
      vercel: {
        name: 'Vercel Functions + Vercel Workflows',
        status: 'GA',
        note: 'No hay un runtime de agentes único: el agente es una ruta de tu app web. El ciclo corto corre en una Function (300 s por defecto) y lo que debe durar más o reanudarse va en Workflows (antes Workflow DevKit).',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `npm i -g vercel
vercel link          # vincula la carpeta a un proyecto
vercel env pull      # variables y token OIDC
vercel deploy --prod`,
        },
        lesson: '/vercel/produccion',
        docs: 'https://vercel.com/docs/workflows',
      },
    },
  },

  /* 7 ─────────────────────────────────────────────────────────── */
  {
    id: 'identidad',
    concept: 'Identidad del agente',
    question: '¿Con qué permisos actúa?',
    intro:
      'El agente necesita una identidad propia, distinta de la de quien lo desarrolla y de la del usuario, para darle solo los permisos que usa y atribuirle cada acción en los registros.',
    topic: 'identidad',
    cells: {
      google: {
        name: 'Agent Identity',
        note: 'Cada agente desplegado recibe un principal propio de tipo SPIFFE al que le asignas roles de IAM directamente. Se activa antes de desplegar con identity_type AGENT_IDENTITY.',
        lesson: '/google/seguridad',
        docs: 'https://docs.cloud.google.com/gemini-enterprise-agent-platform/scale/runtime/agent-identity',
      },
      aws: {
        name: 'AgentCore Identity',
        status: 'GA',
        note: 'Identidad de carga de trabajo por agente más un token vault: el agente pide tokens OAuth o API keys sin ver secretos de larga duración. Distingue acceso delegado por el usuario y acceso autónomo. Sin costo si lo usas desde Runtime o Gateway.',
        lesson: '/aws/gobernar',
        docs: `${AC}/identity.html`,
      },
      azure: {
        name: 'Microsoft Entra Agent ID',
        status: 'GA',
        note: 'Al crear un agente en Foundry nace su agent identity a partir de un blueprint, sin secretos. Empieza sin permisos: los asignas con RBAC. Actuar en nombre del usuario desde las herramientas está en preview.',
        lesson: '/azure/gobernar',
        docs: `${L}/agents/concepts/agent-identity`,
      },
      vercel: {
        name: 'OIDC del proyecto',
        status: 'tú',
        note: 'El token OIDC de Vercel identifica al proyecto o despliegue, no a cada agente, y no hay permisos por agente. La identidad del usuario y la autorización en la ruta del agente las construyes tú.',
        lesson: '/vercel/produccion',
        docs: 'https://vercel.com/docs/ai-gateway/authentication-and-byok/oidc',
      },
    },
  },

  /* 8 ─────────────────────────────────────────────────────────── */
  {
    id: 'guardrails',
    concept: 'Guardrails',
    question: '¿Qué filtra entradas y salidas?',
    intro:
      'Los guardrails revisan lo que entra y lo que sale del modelo para frenar inyección de prompts, datos personales o contenido dañino, fuera del prompt y con reglas que puedes auditar.',
    topic: 'guardrails',
    cells: {
      google: {
        name: 'Model Armor',
        note: 'Se conecta como plugin de ADK con una plantilla para el prompt y otra para la respuesta; Agent Gateway también lo aplica en la red. El plugin no revisa las respuestas de las herramientas.',
        code: {
          lang: 'python',
          title: 'andes_ops/app.py',
          code: `from google.adk.apps import App
from google.adk.integrations.model_armor import ModelArmorConfig, ModelArmorPlugin

app = App(
    name="andes_ops",
    root_agent=root_agent,
    plugins=[ModelArmorPlugin(config=ModelArmorConfig(
        prompt_template_name="projects/P/locations/us-central1/templates/t-prompt",
        response_template_name="projects/P/locations/us-central1/templates/t-response",
        block_on_screening_failure=True,
    ))],
)`,
        },
        lesson: '/google/seguridad',
        docs: 'https://adk.dev/integrations/model-armor/',
      },
      aws: {
        name: 'Bedrock Guardrails',
        status: 'GA',
        note: 'Políticas reutilizables: filtros de contenido, temas denegados, datos personales y, además, verificación de grounding y Automated Reasoning. El filtro de ataques de prompt no evalúa resultados de herramientas; para eso se aplica en el Gateway. US$ 0,15 por 1.000 unidades de texto (15-nov-2026).',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from strands import Agent
from strands.models import BedrockModel

model = BedrockModel(
    model_id="global.anthropic.claude-sonnet-5-5",
    guardrail_id="your-guardrail-id",
    guardrail_version="1",
)
agent = Agent(model=model, tools=[get_order_status])

response = agent("¿Dónde está mi pedido 4821?")
if response.stop_reason == "guardrail_intervened":
    print("Bloqueado por el guardrail")`,
        },
        lesson: '/aws/gobernar',
        docs: 'https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails.html',
      },
      azure: {
        name: 'Guardrails de Foundry',
        status: 'preview',
        note: 'Un guardrail agrupa controles con cuatro puntos de intervención: entrada, llamada a herramienta, respuesta de herramienta y salida. Para modelos es GA; para agentes está en preview y no modera herramientas MCP ni function tools. Se asigna en el portal: Build > Guardrails.',
        lesson: '/azure/gobernar',
        docs: `${L}/guardrails/guardrails-overview`,
      },
      vercel: {
        name: 'Lo traes tú',
        status: 'tú',
        note: 'No hay un servicio propio que detecte inyección de prompts, datos personales o contenido dañino. La documentación sugiere middleware propio con wrapLanguageModel o un modelo juez barato. BotID y el WAF protegen la ruta, no el contenido.',
        lesson: '/vercel/produccion',
        docs: 'https://ai-sdk.dev/docs/ai-sdk-core/middleware',
      },
    },
  },

  /* 9 ─────────────────────────────────────────────────────────── */
  {
    id: 'aprobacion',
    concept: 'Aprobación humana',
    question: '¿Quién autoriza lo sensible?',
    intro:
      'Algunas acciones, como un reembolso, no deben ejecutarse sin que una persona las apruebe. El agente se pausa en la llamada a la herramienta, espera la decisión y luego continúa o cancela.',
    topic: 'guardrails',
    cells: {
      google: {
        name: 'Confirmación de herramientas (ADK)',
        status: 'GA',
        note: 'Marcas la herramienta con require_confirmation, o con una función que decide según los argumentos. ADK pausa la llamada y el cliente responde con un function_response especial.',
        code: {
          lang: 'python',
          title: 'andes_ops/agent.py',
          code: `def request_refund(order_id: str, amount: int) -> dict:
    """Solicita el reembolso de un pedido de Andes Market."""
    return {"status": "success", "order_id": order_id, "amount": amount}


root_agent = Agent(
    name="andes_ops",
    model="gemini-3.8-flash",
    tools=[
        get_order_status,
        FunctionTool(request_refund, require_confirmation=True),
    ],
)
# El cliente aprueba con un function_response:
#   name="adk_request_confirmation", response={"confirmed": True}`,
        },
        lesson: '/google/herramientas',
        docs: 'https://adk.dev/tools-custom/confirmation/',
      },
      aws: {
        name: 'Interrupts de Strands',
        status: 'GA',
        note: 'Un hook antes de la llamada lanza un interrupt: el agente devuelve stop_reason "interrupt" y lo retomas enviando la respuesta de la persona. Fuera del código, Policy en el Gateway permite o deniega llamadas de forma determinista.',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from strands import Agent
from strands.hooks import BeforeToolCallEvent, HookProvider, HookRegistry


class ApprovalHook(HookProvider):
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeToolCallEvent, self.approve)

    def approve(self, event: BeforeToolCallEvent) -> None:
        if event.tool_use["name"] != "request_refund":
            return
        answer = event.interrupt("andes-approval", reason=event.tool_use["input"])
        if answer.lower() != "y":
            event.cancel_tool = "Una persona rechazó el reembolso"


agent = Agent(hooks=[ApprovalHook()], tools=[get_order_status, request_refund])
# result.stop_reason == "interrupt" → respondes con interruptResponse`,
        },
        lesson: '/aws/gobernar',
        docs: 'https://strandsagents.com/docs/user-guide/sdk/interrupts/',
      },
      azure: {
        name: 'approval_mode en la herramienta',
        status: 'GA',
        note: 'Cada herramienta declara su modo de aprobación; la documentación recomienda always_require en producción. La solicitud llega como un contenido de tipo function_approval_request. En herramientas MCP, sin un valor default las no listadas no piden aprobación.',
        code: {
          lang: 'python',
          title: 'agent.py',
          code: `from agent_framework import Agent, tool


@tool(approval_mode="always_require")
def request_refund(order_id: str, amount: int) -> str:
    """Solicita el reembolso de un pedido de Andes Market."""
    return f"Reembolso de {amount} solicitado para el pedido {order_id}."


agent = Agent(
    client=client,
    name="andes_ops",
    instructions="Eres Andi.",
    tools=[get_order_status, request_refund],
)
# La respuesta trae un contenido "function_approval_request";
# se contesta con uno "function_approval_response".`,
        },
        lesson: '/azure/herramientas-workflows',
        docs: `${AF}/agents/tools/function-tools`,
      },
      vercel: {
        name: 'toolApproval',
        status: 'GA',
        note: 'Un mapa por herramienta decide si se aprueba sola, se deniega o se pide a la persona; useChat recibe la solicitud como un estado de la parte. Como el historial lo envía el cliente, firma las aprobaciones con el secreto del SDK. En un WorkflowAgent la espera es durable.',
        code: {
          lang: 'ts',
          title: 'agent.ts',
          code: `import { ToolLoopAgent } from 'ai';

export const andi = new ToolLoopAgent({
  model: 'anthropic/claude-sonnet-5.5',
  tools: { get_order_status, request_refund },
  toolApproval: {
    request_refund: async ({ amount }) =>
      amount > 30000 ? 'user-approval' : undefined,
  },
});
// En la UI: part.state === 'approval-requested' →
// addToolApprovalResponse({ id: part.approval.id, approved: true })`,
        },
        lesson: '/vercel/interfaz',
        docs: 'https://ai-sdk.dev/docs/agents/tool-approvals',
      },
    },
  },

  /* 10 ────────────────────────────────────────────────────────── */
  {
    id: 'multiagente',
    concept: 'Multi-agente y A2A',
    question: '¿Cómo colaboran varios agentes?',
    intro:
      'Un agente puede delegar en especialistas dentro del mismo proceso o llamar a agentes remotos de otro equipo. A2A es el protocolo abierto para lo segundo: cada agente publica una tarjeta que describe lo que hace.',
    topic: 'a2a',
    cells: {
      google: {
        name: 'sub_agents, Workflow y A2A en ADK',
        status: 'GA',
        note: 'Un agente raíz con sub_agents delega según la descripción de cada uno; Workflow arma grafos con rutas. Para A2A, to_a2a() expone el agente y RemoteA2aAgent consume uno remoto como sub-agente.',
        lesson: '/google/workflows',
        docs: 'https://adk.dev/workflows/collaboration/',
      },
      aws: {
        name: 'Agents as tools, Swarm y Graph',
        status: 'GA',
        note: 'Strands ofrece tres patrones: agentes como herramientas (decide el orquestador), Swarm (los agentes se pasan el control) y Graph (decide la estructura). A2A con A2AAgent y A2AServer; el Runtime aloja servidores A2A.',
        lesson: '/aws/herramientas-memoria',
        docs: 'https://strandsagents.com/docs/user-guide/sdk/multi-agent/multi-agent-patterns/',
      },
      azure: {
        name: 'Orquestaciones de Agent Framework',
        status: 'GA',
        note: 'Builders listos para secuencial, concurrente, handoff, group chat y Magentic, sobre workflows en grafo. El paquete de A2A del framework está en beta; un agente de Foundry puede exponer un endpoint A2A, solo texto y sin streaming.',
        lesson: '/azure/herramientas-workflows',
        docs: `${AF}/workflows/orchestrations/`,
      },
      vercel: {
        name: 'Sub-agentes como herramientas',
        status: 'GA',
        note: 'Un sub-agente es una herramienta cuyo execute llama a otro ToolLoopAgent. El AI SDK no tiene soporte propio de A2A: solo existe un proveedor de la comunidad.',
        lesson: '/vercel/primer-agente',
        docs: 'https://ai-sdk.dev/docs/agents/subagents',
      },
    },
  },

  /* 11 ────────────────────────────────────────────────────────── */
  {
    id: 'evaluacion',
    concept: 'Evaluación y trazas',
    question: '¿Cómo sabes que funciona?',
    intro:
      'Evaluar es medir, con casos de prueba, si el agente eligió las herramientas correctas y respondió bien. Las trazas muestran cada paso de una ejecución real: llamadas al modelo, herramientas, tiempos y tokens.',
    topic: 'evaluacion',
    cells: {
      google: {
        name: 'adk eval + Cloud Trace',
        status: 'GA',
        note: 'Los casos viven en archivos evalset y miden la trayectoria de herramientas y la respuesta final, desde la terminal o con pytest. Las trazas OpenTelemetry van a Cloud Trace con un flag del despliegue.',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `adk eval andes_ops andes.evalset.json \\
  --print_detailed_results`,
        },
        lesson: '/google/evaluar',
        docs: 'https://adk.dev/evaluate/',
      },
      aws: {
        name: 'AgentCore Evaluations + Observability',
        status: 'GA',
        note: 'Evaluations puntúa trazas reales con un modelo juez, de forma continua o a demanda, también para agentes fuera del Runtime. Las trazas van a CloudWatch en formato OpenTelemetry. Para pruebas locales existe Strands Evals.',
        code: {
          lang: 'bash',
          title: 'terminal',
          code: `agentcore add online-eval --name andes_quality --agent agent \\
  --evaluators "Builtin.GoalSuccessRate" "Builtin.Helpfulness" \\
  --sampling-rate 1.0 --enable-on-create true
agentcore deploy`,
        },
        lesson: '/aws/gobernar',
        docs: `${AC}/evaluations.html`,
      },
      azure: {
        name: 'Evaluaciones de Foundry + Application Insights',
        note: 'Las evaluaciones corren en la nube con la API de evals sobre el proyecto, con evaluadores de agentes (varios en preview). El tracing es GA: se activa al conectar Application Insights al proyecto, sin cambiar código.',
        lesson: '/azure/gobernar',
        docs: `${L}/observability/how-to/evaluate-agent`,
      },
      vercel: {
        name: 'Telemetría OTel; evals, lo traes tú',
        status: 'tú',
        note: 'El AI SDK emite trazas OpenTelemetry con @ai-sdk/otel y AI Gateway registra cada request con tokens y costo. No trae un framework de evals: ofrece mocks para pruebas unitarias y deja la evaluación a integraciones como Langfuse o Braintrust.',
        lesson: '/vercel/produccion',
        docs: 'https://ai-sdk.dev/docs/ai-sdk-core/telemetry',
      },
    },
  },

  /* 12 ────────────────────────────────────────────────────────── */
  {
    id: 'publicar',
    concept: 'Dónde lo usan las personas',
    question: '¿Dónde lo encuentra la gente?',
    intro:
      'Un agente desplegado todavía necesita una superficie: la app donde empleados o clientes conversan con él, con inicio de sesión y permisos resueltos.',
    topic: 'interfaz',
    cells: {
      google: {
        name: 'Gemini Enterprise',
        note: 'La app para empleados (antes Agentspace). Registras el agente de Agent Runtime desde la consola: Agents > Add agent > Custom agent via Agent Runtime. Desde tu propia app lo invocas con la misma API del runtime.',
        lesson: '/google/gemini-enterprise',
        docs: 'https://docs.cloud.google.com/gemini/enterprise/docs/register-and-manage-an-adk-agent',
      },
      aws: {
        name: 'AWS Quick · AWS Marketplace',
        status: 'GA',
        note: 'AWS Quick (lanzado como Amazon Quick Suite) es el espacio de trabajo con IA para empleados; Marketplace tiene una categoría de agentes y herramientas. La investigación no documenta los pasos para publicar ahí un agente de AgentCore: desde tu app lo invocas con la API del Runtime.',
        lesson: '/aws/desplegar',
        docs: 'https://aws.amazon.com/quick/',
      },
      azure: {
        name: 'Teams y Microsoft 365 Copilot',
        status: 'GA',
        note: 'Desde el agente: Publish > Teams and Microsoft Copilot, solo para ti o para toda la organización (con aprobación del administrador). Foundry registra el bot por ti.',
        lesson: '/azure/desplegar',
        docs: `${L}/agents/how-to/publish-copilot`,
      },
      vercel: {
        name: 'Tu propia app con useChat',
        status: 'GA',
        note: 'No hay una app para empleados: la interfaz es tuya. Una ruta transmite la respuesta del agente y useChat la pinta parte por parte. Para llevarlo a Slack o Teams existe Chat SDK.',
        code: {
          lang: 'ts',
          title: 'app/api/chat/route.ts',
          code: `import { createAgentUIStreamResponse } from 'ai';
import { andi } from '@/agent';

export async function POST(request: Request) {
  const { messages } = await request.json();

  return createAgentUIStreamResponse({
    agent: andi,
    uiMessages: messages,
  });
}`,
        },
        lesson: '/vercel/interfaz',
        docs: 'https://ai-sdk.dev/docs/ai-sdk-ui/overview',
      },
    },
  },
]
