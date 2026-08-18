import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, CardapioDia, Turma } from '../../types'
import { Card, EmptyState, SectionLabel } from '../../components/ui'
import { AlmocoAlunoLinha, hoje, useTurmaRotinas } from '../shared/RotinaHub'

const SEGMENTOS_FUNDAMENTAL = ['fundamental_1', 'fundamental_2']

export default function Almoco() {
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: alunosTodos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 15000, [])
  const { data: cardapio } = usePolling<CardapioDia | null>(async () => api.get(`/cardapio?data=${hoje()}`), 60000, [])

  const turmasIntegral = (turmas ?? []).filter((t) => SEGMENTOS_FUNDAMENTAL.includes(t.segmento))
  const alunosIntegral = (alunosTodos ?? []).filter(
    (a) => a.periodo === 'integral' && turmasIntegral.some((t) => t.id === a.turmaId),
  )

  const { doAluno, reload } = useTurmaRotinas(alunosIntegral, hoje())
  const itens = cardapio?.itens ?? []

  async function definirStatus(alunoId: string, status: string) {
    const atual = doAluno(alunoId)?.almoco
    await api.patch('/rotinas/refeicao', { alunoId, data: hoje(), campo: 'almoco', status, itensAceitos: atual?.itensAceitos ?? [] })
    reload()
  }

  async function alternarItem(alunoId: string, item: string) {
    const atual = doAluno(alunoId)?.almoco
    const itensAtuais = atual?.itensAceitos ?? []
    const novosItens = itensAtuais.includes(item) ? itensAtuais.filter((i) => i !== item) : [...itensAtuais, item]
    await api.patch('/rotinas/refeicao', { alunoId, data: hoje(), campo: 'almoco', status: atual?.status ?? 'comeu_bem', itensAceitos: novosItens })
    reload()
  }

  if (!alunosTodos || !turmas) return null

  if (!alunosIntegral.length) {
    return <EmptyState>Nenhum aluno do integral (Fund. I/II) encontrado.</EmptyState>
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionLabel>Cardápio de hoje</SectionLabel>
        <p className="mt-1 text-[13px]">{cardapio?.descricao ?? 'Cardápio ainda não publicado.'}</p>
      </Card>

      {turmasIntegral
        .filter((t) => alunosIntegral.some((a) => a.turmaId === t.id))
        .map((turma) => (
          <div key={turma.id}>
            <SectionLabel>{turma.nome}</SectionLabel>
            <div className="mt-2 flex flex-col gap-2">
              {alunosIntegral
                .filter((a) => a.turmaId === turma.id)
                .map((a) => (
                  <AlmocoAlunoLinha
                    key={a.id}
                    aluno={a}
                    registro={doAluno(a.id)?.almoco ?? null}
                    itensCardapio={itens}
                    onStatus={(status) => definirStatus(a.id, status)}
                    onToggleItem={(item) => alternarItem(a.id, item)}
                  />
                ))}
            </div>
          </div>
        ))}
    </div>
  )
}
