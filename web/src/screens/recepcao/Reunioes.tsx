import { useEffect } from 'react'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import { useSession } from '../../session'
import type { Aluno, Reuniao } from '../../types'
import { EmptyState, SectionLabel } from '../../components/ui'
import { ReuniaoCard } from '../shared/Reunioes'

export default function Reunioes() {
  const { session } = useSession()
  const { data: reunioes, reload } = usePolling<Reuniao[]>(async () => api.get('/reunioes'), 5000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (alunoId: string) => alunos?.find((a) => a.id === alunoId)?.nome ?? '...'

  const pendentesAcao = (reunioes ?? []).filter((r) => r.estado === 'pendente' || r.estado === 'aceita_pelo_pai')
  const aguardandoPai = (reunioes ?? []).filter((r) => r.estado === 'contraproposta')
  const encerradas = (reunioes ?? []).filter((r) => r.estado === 'confirmada' || r.estado === 'cancelada')

  useEffect(() => {
    const naoVistas = pendentesAcao.filter((r) => !r.vistoPelaCoordenacaoEm)
    if (!naoVistas.length) return
    api.post('/reunioes/marcar-vistas', { ids: naoVistas.map((r) => r.id) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reunioes])

  if (!reunioes?.length) return <EmptyState>Nenhuma solicitação de reunião ainda.</EmptyState>

  return (
    <div className="flex flex-col gap-4">
      {!!pendentesAcao.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Aguardando ação ({pendentesAcao.length})</SectionLabel>
          {pendentesAcao.map((r) => (
            <ReuniaoCard key={r.id} reuniao={r} papel="staff" autor={session?.nome ?? ''} alunoNome={nome(r.alunoId)} onReload={reload} />
          ))}
        </div>
      )}
      {!!aguardandoPai.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Aguardando o responsável ({aguardandoPai.length})</SectionLabel>
          {aguardandoPai.map((r) => (
            <ReuniaoCard key={r.id} reuniao={r} papel="staff" autor={session?.nome ?? ''} alunoNome={nome(r.alunoId)} onReload={reload} />
          ))}
        </div>
      )}
      {!!encerradas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Encerradas</SectionLabel>
          {encerradas.map((r) => (
            <ReuniaoCard key={r.id} reuniao={r} papel="staff" autor={session?.nome ?? ''} alunoNome={nome(r.alunoId)} onReload={reload} />
          ))}
        </div>
      )}
    </div>
  )
}
