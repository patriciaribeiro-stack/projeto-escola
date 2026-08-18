import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Evento } from '../../types'
import { EmptyState } from '../../components/ui'
import { EventoLinha } from '../coordenacao/Eventos'

export default function Eventos() {
  const { data: eventos } = usePolling<Evento[]>(async () => api.get('/eventos'), 6000, [])

  if (!eventos?.length) return <EmptyState>Nenhum evento criado ainda.</EmptyState>

  return (
    <div className="flex flex-col gap-3">
      <p className="px-1 text-[11.5px] text-faint">
        Visualização de eventos criados pela coordenação. Toque num evento pago para marcar o pagamento como realizado.
      </p>
      {eventos.map((ev) => <EventoLinha key={ev.id} evento={ev} />)}
    </div>
  )
}
