import { api } from '../../api'
import { usePolling } from '../../usePolling'
import { useSession } from '../../session'
import type { Aluno, Licao, LicaoStatus, Turma } from '../../types'
import { Avatar, Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'

const SEGMENTOS_FUNDAMENTAL = ['fundamental_1', 'fundamental_2']

export default function Licoes() {
  const { session } = useSession()
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: alunosTodos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 15000, [])
  const { data: licoesTodas } = usePolling<Licao[]>(async () => api.get('/licoes'), 10000, [])
  const { data: statusTodos, reload } = usePolling<LicaoStatus[]>(async () => api.get('/licao-status'), 6000, [])

  const turmasIntegral = (turmas ?? []).filter((t) => SEGMENTOS_FUNDAMENTAL.includes(t.segmento))
  const alunosIntegral = (alunosTodos ?? []).filter(
    (a) => a.periodo === 'integral' && turmasIntegral.some((t) => t.id === a.turmaId),
  )
  async function marcar(statusId: string, estado: string) {
    await api.patch(`/licao-status/${statusId}`, { estado, autor: session?.nome })
    reload()
  }

  async function marcarFeitaNoIntegral(statusId: string) {
    await api.patch(`/licao-status/${statusId}/observacao-integral`, {
      observacaoIntegral: `Realizou no integral (registrado por ${session?.nome ?? 'monitor(a)'})`,
    })
    reload()
  }

  if (!alunosTodos || !turmas || !licoesTodas || !statusTodos) return null

  if (!alunosIntegral.length) {
    return <EmptyState>Nenhum aluno do integral (Fund. I/II) encontrado.</EmptyState>
  }

  const pendenciasPorAluno = alunosIntegral
    .map((aluno) => {
      const pendentes = statusTodos
        .filter((s) => s.alunoId === aluno.id && s.estado === 'pendente' && !s.observacaoIntegral)
        .map((s) => ({ status: s, licao: licoesTodas.find((l) => l.id === s.licaoId) }))
        .filter((p): p is { status: LicaoStatus; licao: Licao } => !!p.licao)
        .sort((a, b) => a.licao.entrega.localeCompare(b.licao.entrega))
      return { aluno, pendentes }
    })
    .filter((p) => p.pendentes.length)

  if (!pendenciasPorAluno.length) {
    return <EmptyState>Nenhuma lição pendente pros alunos do integral agora.</EmptyState>
  }

  const nomeTurma = (turmaId: string) => turmas.find((t) => t.id === turmaId)?.nome ?? ''

  return (
    <div className="flex flex-col gap-4">
      {pendenciasPorAluno.map(({ aluno, pendentes }) => (
        <div key={aluno.id}>
          <div className="flex items-center gap-2">
            <Avatar label={aluno.iniciais} tone="green" />
            <SectionLabel>{aluno.nome}</SectionLabel>
          </div>
          <div className="mt-2 flex flex-col gap-2">
            {pendentes.map(({ status, licao }) => (
              <Card key={status.id}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold">{licao.titulo}</span>
                  <Pill tone="blue">{nomeTurma(licao.turmaId)}</Pill>
                </div>
                <p className="mt-1 text-[11px] text-faint">Entrega {formatDateBR(licao.entrega)} · por {licao.autor}</p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  <Button className="w-auto px-3 py-2 text-[12px]" onClick={() => marcarFeitaNoIntegral(status.id)}>
                    Realizou no integral
                  </Button>
                  <Button variant="ghost" className="w-auto px-3 py-2 text-[12px]" onClick={() => marcar(status.id, 'faltou')}>
                    Faltou no dia
                  </Button>
                  <Button variant="ghost" className="w-auto px-3 py-2 text-[12px]" onClick={() => marcar(status.id, 'vai_para_casa')}>
                    Vai fazer em casa
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
