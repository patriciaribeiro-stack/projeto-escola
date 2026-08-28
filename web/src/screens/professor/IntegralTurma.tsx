import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Licao, LicaoStatus } from '../../types'
import { Avatar, Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { RotinaHub } from '../shared/RotinaHub'
import { FormFoto } from '../shared/PostarHub'
import type { ProfessorContext } from './ProfessorLayout'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Sub = 'rotina' | 'fotos' | 'licoes'

const TABS: TabOption<Sub>[] = [
  { key: 'rotina', label: 'Rotina' },
  { key: 'fotos', label: 'Fotos' },
  { key: 'licoes', label: 'Lições' },
]

export default function IntegralTurma() {
  const { turmaId } = useOutletContext<ProfessorContext>()
  const [sub, setSub] = useState<Sub>('rotina')
  const { data: alunos } = usePolling<Aluno[]>(async () => (turmaId ? api.get(`/alunos${qs({ turmaId })}`) : []), 15000, [turmaId])

  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={TABS} value={sub} onChange={setSub} />

      {sub === 'rotina' && <RotinaHub turmaId={turmaId} alunos={alunos ?? null} />}
      {sub === 'fotos' && <FotosIntegral turmaId={turmaId} />}
      {sub === 'licoes' && <LicoesIntegralTurma turmaId={turmaId} alunos={alunos ?? []} />}
    </div>
  )
}

function FotosIntegral({ turmaId }: { turmaId: string }) {
  const { session } = useSession()
  const [publicado, setPublicado] = useState(false)

  if (publicado) {
    return (
      <div className="flex flex-col gap-3">
        <p className="rounded-xl bg-green-light px-4 py-3 text-[13px] font-semibold text-green-dark">Fotos publicadas!</p>
        <Button variant="ghost" onClick={() => setPublicado(false)}>Publicar mais fotos</Button>
      </div>
    )
  }

  return <FormFoto turmaId={turmaId} autor={session?.nome ?? ''} onDone={() => setPublicado(true)} />
}

function LicoesIntegralTurma({ turmaId, alunos }: { turmaId: string; alunos: Aluno[] }) {
  const { session } = useSession()
  const { data: licoesTodas } = usePolling<Licao[]>(async () => (turmaId ? api.get(`/licoes${qs({ turmaId })}`) : []), 10000, [turmaId])
  const { data: statusTodos, reload } = usePolling<LicaoStatus[]>(async () => (turmaId ? api.get(`/licao-status${qs({ turmaId })}`) : []), 6000, [turmaId])

  async function marcar(statusId: string, estado: string) {
    await api.patch(`/licao-status/${statusId}`, { estado, autor: session?.nome })
    reload()
  }

  async function marcarFeitaNoIntegral(statusId: string) {
    await api.patch(`/licao-status/${statusId}/observacao-integral`, {
      observacaoIntegral: `Realizou no integral (registrado por ${session?.nome ?? 'professor(a)'})`,
    })
    reload()
  }

  if (!licoesTodas || !statusTodos) return null

  const pendenciasPorAluno = alunos
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
    return <EmptyState>Nenhuma lição pendente pra essa turma agora.</EmptyState>
  }

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
                  <Pill tone="blue">Entrega {formatDateBR(licao.entrega)}</Pill>
                </div>
                <p className="mt-1 text-[11px] text-faint">por {licao.autor}</p>
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
