import { usePolling } from '../../usePolling'
import { api } from '../../api'
import { useSession } from '../../session'
import type { Materia, ProvaTrimestral, Turma } from '../../types'
import { Button, EmptyState, SectionLabel } from '../../components/ui'
import { ProvaTrimestralCard } from '../shared/ProvasTrimestrais'

export default function ImpressaoProvasTrimestrais() {
  const { session } = useSession()
  const { data: provas, reload } = usePolling<ProvaTrimestral[]>(async () => api.get('/provas-trimestrais'), 5000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const turmaNome = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? '...'
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  async function marcarImpressa(id: string) {
    await api.patch(`/provas-trimestrais/${id}/marcar-impressa`, { impressoPor: session?.nome })
    reload()
  }

  const liberadas = (provas ?? []).filter((p) => p.estado === 'liberada_impressao')
  const impressas = (provas ?? []).filter((p) => p.estado === 'impressa')

  if (!liberadas.length && !impressas.length) {
    return <EmptyState>Nenhuma prova trimestral liberada para impressão no momento.</EmptyState>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>Pendentes de impressão ({liberadas.length})</SectionLabel>
        {!liberadas.length && <EmptyState>Nada pendente — tudo impresso.</EmptyState>}
        {liberadas.map((p) => (
          <ProvaTrimestralCard key={p.id} prova={p} turmaNome={turmaNome(p.turmaId)} materiaNome={materiaNome(p.materiaId)}>
            <div className="mt-2.5">
              <Button className="w-auto px-3.5 py-2 text-[12.5px]" onClick={() => marcarImpressa(p.id)}>
                Já imprimi
              </Button>
            </div>
          </ProvaTrimestralCard>
        ))}
      </div>

      {!!impressas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Já impressas</SectionLabel>
          {impressas.map((p) => (
            <ProvaTrimestralCard key={p.id} prova={p} turmaNome={turmaNome(p.turmaId)} materiaNome={materiaNome(p.materiaId)} />
          ))}
        </div>
      )}
    </div>
  )
}
