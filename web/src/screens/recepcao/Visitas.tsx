import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { VisitaAgendada, VisitaStatus } from '../../types'
import { Card, Pill, Button, EmptyState, SectionLabel, formatDateBR } from '../../components/ui'

const STATUS_PILL: Record<VisitaStatus, { tone: 'amber' | 'green' | 'muted' | 'blue'; label: string }> = {
  pendente: { tone: 'amber', label: 'Pendente' },
  confirmada: { tone: 'green', label: 'Confirmada' },
  cancelada: { tone: 'muted', label: 'Cancelada' },
  realizada: { tone: 'blue', label: 'Realizada' },
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function VisitaLinha({ visita, reload }: { visita: VisitaAgendada; reload: () => void }) {
  async function mudarStatus(status: VisitaStatus) {
    await api.patch(`/visitas/${visita.id}`, { status })
    reload()
  }

  const pill = STATUS_PILL[visita.status]

  return (
    <Card accent="eventos">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[13.5px] font-bold">
            {formatDateBR(visita.data)} às {visita.horario}
          </div>
          <div className="mt-0.5 text-[12.5px] text-muted">
            {visita.responsavel} · {visita.telefone}
          </div>
          <div className="mt-0.5 text-[11.5px] text-faint">
            {visita.segmento}
            {visita.crianca ? ` · ${visita.crianca}` : ''}
          </div>
          {visita.observacoes && <div className="mt-1.5 text-[12px] text-muted">"{visita.observacoes}"</div>}
        </div>
        <Pill tone={pill.tone}>{pill.label}</Pill>
      </div>

      {(visita.status === 'pendente' || visita.status === 'confirmada') && (
        <div className="mt-3 flex gap-2 border-t border-line pt-3">
          {visita.status === 'pendente' && (
            <Button variant="primary" className="flex-1" onClick={() => mudarStatus('confirmada')}>
              Confirmar
            </Button>
          )}
          {visita.status === 'confirmada' && (
            <Button variant="secondary" className="flex-1" onClick={() => mudarStatus('realizada')}>
              Marcar como realizada
            </Button>
          )}
          <Button variant="danger" className="flex-1" onClick={() => mudarStatus('cancelada')}>
            Cancelar
          </Button>
        </div>
      )}
    </Card>
  )
}

export default function Visitas() {
  const { data: visitas, reload } = usePolling<VisitaAgendada[]>(async () => api.get('/visitas'), 6000, [])

  if (!visitas) return null

  const futuras = visitas.filter((v) => v.data >= hoje() && v.status !== 'cancelada')
  const passadas = visitas.filter((v) => v.data < hoje() || v.status === 'cancelada')

  return (
    <div className="flex flex-col gap-5">
      <p className="px-1 text-[11.5px] text-faint">
        Pedidos de visita agendados pelo site. Atualiza sozinho a cada poucos segundos.
      </p>

      <div className="flex flex-col gap-3">
        <SectionLabel>Próximas ({futuras.length})</SectionLabel>
        {futuras.length === 0 ? (
          <EmptyState>Nenhuma visita agendada ainda.</EmptyState>
        ) : (
          futuras.map((v) => <VisitaLinha key={v.id} visita={v} reload={reload} />)
        )}
      </div>

      {passadas.length > 0 && (
        <div className="flex flex-col gap-3">
          <SectionLabel>Anteriores / canceladas ({passadas.length})</SectionLabel>
          {passadas.map((v) => (
            <VisitaLinha key={v.id} visita={v} reload={reload} />
          ))}
        </div>
      )}
    </div>
  )
}
