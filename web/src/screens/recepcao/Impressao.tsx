import { usePolling } from '../../usePolling'
import { api } from '../../api'
import { useSession } from '../../session'
import type { AtividadeAvaliativa, Materia, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'

export default function Impressao() {
  const { session } = useSession()
  const { data: atividades, reload } = usePolling<AtividadeAvaliativa[]>(async () => api.get('/atividades-avaliativas'), 5000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const turmaNome = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? '...'
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  async function marcarImpressa(id: string) {
    await api.patch(`/atividades-avaliativas/${id}/marcar-impressa`, { impressoPor: session?.nome })
    reload()
  }

  const liberadas = (atividades ?? []).filter((a) => a.provaLiberadaParaImpressao)
  const pendentes = liberadas.filter((a) => !a.provaImpressaEm)
  const impressas = liberadas.filter((a) => a.provaImpressaEm)

  if (!liberadas.length) return <EmptyState>Nenhuma prova liberada para impressão no momento.</EmptyState>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>Pendentes de impressão ({pendentes.length})</SectionLabel>
        {!pendentes.length && <EmptyState>Nada pendente — tudo impresso.</EmptyState>}
        {pendentes.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold">{turmaNome(a.turmaId)}</span>
              <Pill tone="blue">{materiaNome(a.materiaId)}</Pill>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">{a.conteudo}</p>
            <p className="mt-1 text-[11px] text-faint">Aplicação {formatDateBR(a.data)} · vale {a.valor} · por {a.autor}</p>
            {a.provaAnexoDataUrl && (
              <a
                href={a.provaAnexoDataUrl}
                download={a.provaAnexoNome ?? 'prova'}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex text-[12px] font-bold text-blue underline"
              >
                Abrir/baixar prova ({a.provaAnexoNome})
              </a>
            )}
            <div className="mt-2.5">
              <Button className="w-auto px-3.5 py-2 text-[12.5px]" onClick={() => marcarImpressa(a.id)}>
                Já imprimi
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {!!impressas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Já impressas</SectionLabel>
          {impressas.map((a) => (
            <Card key={a.id}>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-bold">{turmaNome(a.turmaId)}</span>
                <Pill tone="muted">{materiaNome(a.materiaId)}</Pill>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{a.conteudo}</p>
              <p className="mt-1 text-[11px] text-faint">
                Aplicação {formatDateBR(a.data)} · impressa por {a.provaImpressaPor} · {a.provaImpressaEm && formatDateBR(a.provaImpressaEm)}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
