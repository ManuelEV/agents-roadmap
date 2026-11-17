/* Andes Market: el escenario de negocio que comparten TODAS las secciones de ecosistema.
   Mismo cliente, mismos pedidos, mismas herramientas; lo que cambia entre nubes
   es la plataforma. Los datos viven en src/sim/google/scenario.ts (la primera sección
   que se escribió) y se reexportan aquí con un nombre neutral. */
export { COMPANY, AGENT_NAME, AGENT_DISPLAY, CUSTOMER, ORDERS, INVENTORY, REFUND_POLICY, ROOT_INSTRUCTION, orderById, runTool, type Order } from './google/scenario'
export { rng, hashString, countTokens, fmt, fmtInt, fmtUsd, fmtClp, pct, fold, clamp } from './google/math'

/** Las herramientas de negocio de Andi, descritas de forma neutral (cada sección las declara con su SDK). */
export const ANDES_TOOLS = [
  { name: 'get_order_status', description: 'Estado, transportista y fecha estimada de un pedido de Andes Market.', args: { order_id: 'string' } },
  { name: 'track_shipment', description: 'Último evento de un envío en la API del transportista AndesExpress.', args: { tracking: 'string' } },
  { name: 'get_stock', description: 'Stock disponible de un SKU en la bodega.', args: { sku: 'string' } },
  { name: 'request_refund', description: 'Solicita un reembolso. Sobre el tope automático requiere aprobación de un supervisor.', args: { order_id: 'string', amount_clp: 'number', reason: 'string' } },
] as const
