import { useState } from 'react'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { AtividadeAvaliativa, Aluno, Materia, Presenca, Turma } from '../../types'
import { Avatar, Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { FileAttach, type Anexo } from '../../components/FileAttach'
import { inputCls } from './formHelpers'

export function elegivelAtividadeAvaliativa(turma?: Turma): boolean {
  if (!turma) return false
  if (turma.segmento === 'fundamental_2') return true
  return turma.segmento === 'fundamental_1' && (turma.serie === 4 || turma.serie === 5)
}

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

// Se a matéria teve mais de uma aula no dia (ex: dois horários de Matemática), prioriza
// mostrar falta se o aluno faltou em qualquer uma delas.
export function presencaDoAluno(presencas: Presenca[], alunoId: string, data: string, materiaId: string | null): Presenca | undefined {
  const candidatas = presencas.filter((p) => p.alunoId === alunoId && p.data === data && p.materiaId === materiaId)
  return candidatas.find((p) => !p.presente) ?? candidatas[0]
}

export function FormAtividadeAvaliativa({ turmaId, materiasDisponiveis, autor, onDone }: {
  turmaId: string
  materiasDisponiveis: Materia[]
  autor: string
  onDone: () => void
}) {
  const [materiaId, setMateriaId] = useState(materiasDisponiveis[0]?.id ?? '')
  const [data, setData] = useState('')
  const [valor, setValor] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [prova, setProva] = useState<Anexo | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function salvar() {
    setEnviando(true)
    try {
      await api.post('/atividades-avaliativas', {
        turmaId, materiaId, data, valor, conteudo, autor,
        provaAnexoNome: prova?.nome ?? null,
        provaAnexoTipo: prova?.tipo ?? null,
        provaAnexoDataUrl: prova?.dataUrl ?? null,
      })
      setData('')
      setValor('')
      setConteudo('')
      setProva(null)
      onDone()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <SectionLabel>Agendar atividade avaliativa</SectionLabel>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <select className={inputCls} value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
          {materiasDisponiveis.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
        <input autoComplete="off" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
        <input
          autoComplete="off"
          className={inputCls}
          placeholder="Vale quanto (ex: 10 pontos)"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
        />
        <textarea
          autoComplete="off"
          className={inputCls}
          rows={3}
          placeholder="Conteúdo a estudar — capítulo, caderno..."
          value={conteudo}
          onChange={(e) => setConteudo(e.target.value)}
        />
        <FileAttach value={prova} onChange={setProva} accept="application/pdf,image/*" label="Anexar a prova (opcional — só a coordenação vê)" />
        <Button disabled={!materiaId || !data || !valor.trim() || !conteudo.trim() || enviando} onClick={salvar}>
          {enviando ? 'Salvando...' : 'Agendar atividade'}
        </Button>
      </div>
    </Card>
  )
}

export function AtividadeAvaliativaCard({ atividade, materiaNome, alunos, presencas, podeExcluir, onDelete }: {
  atividade: AtividadeAvaliativa
  materiaNome: string
  alunos: Aluno[]
  presencas: Presenca[]
  podeExcluir?: boolean
  onDelete?: () => void
}) {
  const [aberto, setAberto] = useState(false)
  const jaAconteceu = atividade.data <= hoje()

  async function excluir() {
    if (!confirm(`Excluir a atividade avaliativa de ${materiaNome}?`)) return
    await api.delete(`/atividades-avaliativas/${atividade.id}`)
    onDelete?.()
  }

  return (
    <Card accent="licoes">
      <button onClick={() => setAberto((v) => !v)} className="w-full text-left">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold">{materiaNome}</span>
          <Pill tone={jaAconteceu ? 'muted' : 'amber'}>{jaAconteceu ? 'Já ocorreu' : 'Agendada'}</Pill>
        </div>
        <p className="mt-1 text-[12px] text-muted">{atividade.conteudo}</p>
        <p className="mt-1 text-[11px] text-faint">Aplicação {formatDateBR(atividade.data)} · vale {atividade.valor} · por {atividade.autor}</p>
        {!!atividade.provaAnexoNome && (
          <p className="mt-1 text-[11px] text-faint">
            Prova anexada
            {atividade.provaImpressaEm ? ' · já impressa' : atividade.provaLiberadaParaImpressao ? ' · liberada para impressão' : ' · aguardando aprovação da coordenação'}
          </p>
        )}
      </button>

      {aberto && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          {jaAconteceu ? (
            alunos.map((a) => {
              const p = presencaDoAluno(presencas, a.id, atividade.data, atividade.materiaId)
              return (
                <div key={a.id} className="flex items-center gap-2.5">
                  <Avatar label={a.iniciais} tone="green" />
                  <span className="flex-1 text-[12.5px] font-semibold">{a.nome}</span>
                  {p === undefined && <Pill tone="muted">Presença não lançada</Pill>}
                  {p?.presente === true && <Pill tone="green">Presente</Pill>}
                  {p?.presente === false && <Pill tone="red">Faltou</Pill>}
                </div>
              )
            })
          ) : (
            <p className="text-[12px] text-muted">A presença de cada aluno aparece aqui depois da data da atividade.</p>
          )}
          {podeExcluir && (
            <button onClick={excluir} className="mt-1 self-start text-[11.5px] font-bold text-red">Excluir</button>
          )}
        </div>
      )}
    </Card>
  )
}

export function AtividadesAvaliativasLista({ turmaId, alunos, materias }: {
  turmaId: string
  alunos: Aluno[] | null
  materias: Materia[] | null
}) {
  const { data: atividades, reload } = usePolling<AtividadeAvaliativa[]>(
    async () => api.get(`/atividades-avaliativas${qs({ turmaId })}`),
    8000,
    [turmaId],
  )
  const { data: presencas } = usePolling<Presenca[]>(async () => api.get(`/presencas${qs({ turmaId })}`), 8000, [turmaId])

  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  if (!atividades?.length) return <EmptyState>Nenhuma atividade avaliativa agendada ainda.</EmptyState>

  const proximas = atividades.filter((a) => a.data >= hoje())
  const passadas = [...atividades.filter((a) => a.data < hoje())].reverse()

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>Próximas ({proximas.length})</SectionLabel>
        {!proximas.length && <EmptyState>Nenhuma atividade agendada.</EmptyState>}
        {proximas.map((at) => (
          <AtividadeAvaliativaCard
            key={at.id}
            atividade={at}
            materiaNome={materiaNome(at.materiaId)}
            alunos={alunos ?? []}
            presencas={presencas ?? []}
            podeExcluir
            onDelete={reload}
          />
        ))}
      </div>
      {!!passadas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Já ocorreram</SectionLabel>
          {passadas.map((at) => (
            <AtividadeAvaliativaCard
              key={at.id}
              atividade={at}
              materiaNome={materiaNome(at.materiaId)}
              alunos={alunos ?? []}
              presencas={presencas ?? []}
              podeExcluir
              onDelete={reload}
            />
          ))}
        </div>
      )}
    </div>
  )
}
