import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aviso, FotoRotina, Turma } from '../../types'
import { Card, EmptyState, SectionLabel, timeAgo } from '../../components/ui'
import { PhotoCarousel } from '../../components/PhotoCarousel'

export default function Inicio() {
  const { aluno } = useSession()
  const turmaId = aluno?.turmaId

  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const turmaNome = turmas?.find((t) => t.id === turmaId)?.nome

  const { data: avisos } = usePolling<Aviso[]>(
    async () => (turmaId ? api.get(`/avisos${qs({ turmaId })}`) : []),
    6000,
    [turmaId],
  )
  const { data: fotos } = usePolling<FotoRotina[]>(
    async () => (turmaId ? api.get(`/fotos${qs({ turmaId })}`) : []),
    8000,
    [turmaId],
  )

  return (
    <div className="flex flex-col gap-4">
      <div>
        <SectionLabel>{turmaNome ? `Turma ${turmaNome}` : 'Turma'}{aluno ? ` · ${aluno.nome.split(' ')[0]}` : ''}</SectionLabel>
      </div>

      {!!fotos?.length && (
        <div>
          <SectionLabel>Fotos da turma</SectionLabel>
          <div className="mt-2">
            <PhotoCarousel fotos={fotos} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionLabel>Avisos gerais</SectionLabel>
        {!avisos?.length && <EmptyState>Nenhum aviso por enquanto.</EmptyState>}
        {avisos?.slice(0, 10).map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{a.autor}</span>
              <span className="text-[11px] text-faint">{timeAgo(a.criadoEm)}</span>
            </div>
            <p className="mt-1 text-[13px] text-ink">{a.texto}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
