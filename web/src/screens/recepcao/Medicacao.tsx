import { useEffect } from 'react'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import { useSession } from '../../session'
import type { Aluno, MedicacaoAgendada } from '../../types'
import { EmptyState, SectionLabel } from '../../components/ui'
import { MedicacaoCard } from '../shared/Medicacoes'

export default function Medicacao() {
  const { session } = useSession()
  const { data: medicacoes, reload } = usePolling<MedicacaoAgendada[]>(async () => api.get('/medicacoes'), 5000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (alunoId: string) => alunos?.find((a) => a.id === alunoId)?.nome ?? '...'
  const hoje = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const naoVistas = (medicacoes ?? []).filter((m) => !m.vistoPelaCoordenacaoEm)
    if (!naoVistas.length) return
    api.post('/medicacoes/marcar-vistas', { ids: naoVistas.map((m) => m.id) })
  }, [medicacoes])

  if (!medicacoes?.length) return <EmptyState>Nenhum medicamento enviado ainda.</EmptyState>

  const ativas = medicacoes.filter((m) => m.ativo && m.dataFim >= hoje)
  const encerradas = medicacoes.filter((m) => !m.ativo || m.dataFim < hoje)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>Ativas ({ativas.length})</SectionLabel>
        {!ativas.length && <EmptyState>Nenhum medicamento ativo no momento.</EmptyState>}
        {ativas.map((m) => (
          <MedicacaoCard key={m.id} medicacao={m} papel="staff" alunoNome={nome(m.alunoId)} autor={session?.nome} onReload={reload} />
        ))}
      </div>
      {!!encerradas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Encerradas</SectionLabel>
          {encerradas.map((m) => (
            <MedicacaoCard key={m.id} medicacao={m} papel="staff" alunoNome={nome(m.alunoId)} autor={session?.nome} onReload={reload} />
          ))}
        </div>
      )}
    </div>
  )
}
