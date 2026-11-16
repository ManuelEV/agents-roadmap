import type { ReactNode } from 'react'
import { Callout as BaseCallout } from '@/components/ui'

const MAP = {
  info: { tone: 'info', label: 'Nota' },
  tip: { tone: 'tip', label: 'Recomendación' },
  warning: { tone: 'warn', label: 'Atención' },
  danger: { tone: 'danger', label: 'Riesgo' },
  success: { tone: 'ok', label: 'En resumen' },
} as const

/** Callout de la guía (MDX): usa el mismo componente que los laboratorios. */
export function Callout({ type = 'info', title, children }: { type?: keyof typeof MAP; title?: string; children: ReactNode }) {
  const v = MAP[type]
  return (
    <BaseCallout tone={v.tone} title={title ?? v.label}>
      {children}
    </BaseCallout>
  )
}
