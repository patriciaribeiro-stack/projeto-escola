import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, AtividadeAvaliativa, Materia, MedicacaoAgendada, Ocorrencia, OcorrenciaGeral, Presenca, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR, timeAgo } from '../../components/ui'
import { FichaMedicaView } from '../shared/FichaMedica'
import { inputCls } from '../shared/formHelpers'
import { MedicacaoCard } from '../shared/Medicacoes'

type Sub = 'saude' | 'gerais' | 'medicacao'

export default function Notificacoes() {
  const [params] = useSearchParams()
  const subInicial = (params.get('sub') as Sub) || 'saude'
  const [sub, setSub] = useState<Sub>(subInicial)
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['saude', 'Saúde'],
            ['gerais', 'Ocorrência'],
            ['medicacao', 'Medicação'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 whitespace-nowrap rounded-lg border border-line py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'bg-green-light text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'saude' && <SaudeCoord />}
      {sub === 'gerais' && <GeraisCoord />}
      {sub === 'medicacao' && <MedicacaoCoord />}
    </div>
  )
}

function ProvaBlock({ atividade, onReload }: { atividade: AtividadeAvaliativa; onReload: () => void }) {
  const { session } = useSession()
  const [liberando, setLiberando] = useState(false)

  async function liberar() {
    setLiberando(true)
    try {
      await api.patch(`/atividades-avaliativas/${atividade.id}/liberar-impressao`, { liberadoPor: session?.nome })
      onReload()
    } finally {
      setLiberando(false)
    }
  }

  if (!atividade.provaAnexoNome) return null

  return (
    <div className="mt-2.5 flex flex-col gap-1.5 border-t border-line pt-2.5">
      <a
        href={atividade.provaAnexoDataUrl ?? undefined}
        download={atividade.provaAnexoNome}
        target="_blank"
        rel="noreferrer"
        className="inline-flex self-start text-[12px] font-bold text-blue underline"
      >
        Ver prova anexada ({atividade.provaAnexoNome})
      </a>
      {atividade.provaImpressaEm && (
        <Pill tone="green">Impressa por {atividade.provaImpressaPor}</Pill>
      )}
      {!atividade.provaImpressaEm && atividade.provaLiberadaParaImpressao && (
        <Pill tone="blue">Liberada para impressão</Pill>
      )}
      {!atividade.provaLiberadaParaImpressao && (
        <Button className="w-auto self-start px-3.5 py-2 text-[12.5px]" disabled={liberando} onClick={liberar}>
          {liberando ? 'Liberando...' : 'OK — liberar para impressão'}
        </Button>
      )}
    </div>
  )
}

export function AvaliativasCoord() {
  const { data: atividades, reload } = usePolling<AtividadeAvaliativa[]>(async () => api.get('/atividades-avaliativas'), 8000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const { data: presencas } = usePolling<Presenca[]>(async () => api.get('/presencas'), 15000, [])
  const turmaNome = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? '...'
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'
  const hoje = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    const naoVistas = (atividades ?? []).filter((a) => !a.vistoPelaCoordenacaoEm)
    if (!naoVistas.length) return
    api.post('/atividades-avaliativas/marcar-vistas', { ids: naoVistas.map((a) => a.id) })
  }, [atividades])

  if (!atividades?.length) return <EmptyState>Nenhuma atividade avaliativa agendada ainda.</EmptyState>

  const proximas = atividades.filter((a) => a.data > hoje)
  const passadas = [...atividades.filter((a) => a.data <= hoje)].reverse()

  function faltas(a: AtividadeAvaliativa) {
    const alunosDaTurma = alunos?.filter((al) => al.turmaId === a.turmaId) ?? []
    const presencasDaAula = presencas?.filter((p) => p.turmaId === a.turmaId && p.data === a.data && p.materiaId === a.materiaId) ?? []
    if (!presencasDaAula.length) return { status: 'sem-registro' as const, nomes: [] as string[] }
    const nomes = alunosDaTurma
      .filter((al) => presencasDaAula.some((p) => p.alunoId === al.id && !p.presente))
      .map((al) => al.nome)
    return { status: nomes.length ? 'tem-falta' as const : 'todos-presentes' as const, nomes }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>Próximas ({proximas.length})</SectionLabel>
        {!proximas.length && <EmptyState>Nenhuma atividade agendada.</EmptyState>}
        {proximas.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center gap-1.5">
              <span className="text-[13px] font-bold">{turmaNome(a.turmaId)}</span>
              <Pill tone="blue">{materiaNome(a.materiaId)}</Pill>
            </div>
            <p className="mt-1 text-[12.5px] text-muted">{a.conteudo}</p>
            <p className="mt-1 text-[11px] text-faint">Aplicação {formatDateBR(a.data)} · vale {a.valor} · por {a.autor}</p>
            <ProvaBlock atividade={a} onReload={reload} />
          </Card>
        ))}
      </div>
      {!!passadas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Já ocorreram</SectionLabel>
          {passadas.map((a) => {
            const f = faltas(a)
            return (
              <Card key={a.id}>
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-bold">{turmaNome(a.turmaId)}</span>
                  <Pill tone="muted">{materiaNome(a.materiaId)}</Pill>
                </div>
                <p className="mt-1 text-[12.5px] text-muted">{a.conteudo}</p>
                <p className="mt-1 text-[11px] text-faint">Aplicação {formatDateBR(a.data)} · vale {a.valor} · por {a.autor}</p>
                {f.status === 'sem-registro' && (
                  <p className="mt-1.5 text-[11.5px] font-semibold text-muted">Presença dessa aula ainda não lançada.</p>
                )}
                {f.status === 'todos-presentes' && (
                  <p className="mt-1.5 text-[11.5px] font-semibold text-green-dark">Todos os alunos estavam presentes.</p>
                )}
                {f.status === 'tem-falta' && (
                  <p className="mt-1.5 text-[11.5px] font-semibold text-red">Faltou: {f.nomes.join(', ')}</p>
                )}
                <ProvaBlock atividade={a} onReload={reload} />
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MedicacaoCoord() {
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

function GeraisCoord() {
  const { session } = useSession()
  const { data: gerais, reload } = usePolling<OcorrenciaGeral[]>(async () => api.get('/ocorrencias-gerais'), 5000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  const pendentes = gerais?.filter((o) => o.estado === 'pendente_aprovacao') ?? []
  const avaliadas = gerais?.filter((o) => o.estado !== 'pendente_aprovacao') ?? []

  useEffect(() => {
    const naoVistas = (gerais ?? []).filter((o) => o.estado === 'aprovada' && o.cientePor && !o.vistoPelaCoordenacaoEm)
    if (!naoVistas.length) return
    api.post('/ocorrencias-gerais/marcar-vistas', { ids: naoVistas.map((o) => o.id) })
  }, [gerais])

  async function aprovar(id: string) {
    await api.patch(`/ocorrencias-gerais/${id}/aprovar`, { avaliadoPor: session?.nome })
    reload()
  }
  async function rejeitar(id: string) {
    await api.patch(`/ocorrencias-gerais/${id}/rejeitar`, { avaliadoPor: session?.nome })
    reload()
  }
  async function excluir(id: string, titulo: string) {
    if (!confirm(`Excluir a ocorrência "${titulo}"? Essa ação não pode ser desfeita.`)) return
    await api.delete(`/ocorrencias-gerais/${id}`)
    reload()
  }

  if (!gerais?.length) return <EmptyState>Nenhuma ocorrência geral registrada ainda.</EmptyState>

  return (
    <div className="flex flex-col gap-4">
      {!!pendentes.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Pendentes de aprovação ({pendentes.length})</SectionLabel>
          {pendentes.map((o) => (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{nome(o.alunoId)}</span>
                <Pill tone="red">Pendente</Pill>
              </div>
              <p className="mt-1 text-[13px] font-semibold">{o.titulo}</p>
              <p className="mt-0.5 text-[12.5px] text-muted">{o.descricao}</p>
              <p className="mt-1 text-[11px] text-faint">Registrada por {o.registradoPor} · {timeAgo(o.registradoEm)}</p>
              <div className="mt-2.5 flex gap-2">
                <Button onClick={() => aprovar(o.id)}>Aprovar e enviar aos pais</Button>
                <Button variant="ghost" onClick={() => rejeitar(o.id)}>Rejeitar</Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {!!avaliadas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Avaliadas</SectionLabel>
          {avaliadas.map((o) => {
            const respostaNova = o.estado === 'aprovada' && !!o.cientePor && !o.vistoPelaCoordenacaoEm
            return (
              <Card key={o.id} className={respostaNova ? 'border-blue' : ''}>
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold">{nome(o.alunoId)}</span>
                  <Pill tone={o.estado === 'aprovada' ? 'green' : 'muted'}>{o.estado === 'aprovada' ? 'Aprovada' : 'Rejeitada'}</Pill>
                </div>
                <p className="mt-1 text-[13px] font-semibold">{o.titulo}</p>
                <p className="mt-0.5 text-[12.5px] text-muted">{o.descricao}</p>
                <p className="mt-1 text-[11px] text-faint">
                  Por {o.registradoPor} · avaliado por {o.avaliadoPor} · {o.avaliadoEm && timeAgo(o.avaliadoEm)}
                </p>
                {o.estado === 'aprovada' && (
                  <div className="mt-1.5 flex items-center gap-2">
                    {o.cientePor ? (
                      respostaNova ? (
                        <Pill tone="blue" dot>Nova resposta do responsável</Pill>
                      ) : (
                        <span className="text-[11px] text-faint">Responsável ciente · {o.cienteEm && timeAgo(o.cienteEm)}</span>
                      )
                    ) : (
                      <span className="text-[11px] text-faint">Responsável ainda não visualizou</span>
                    )}
                  </div>
                )}
                <button onClick={() => excluir(o.id, o.titulo)} className="mt-2 text-[11.5px] font-bold text-red">
                  Excluir
                </button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

function SaudeCoord() {
  const { data: ativas, reload } = usePolling<Ocorrencia[]>(async () => api.get(`/ocorrencias${qs({ ativas: 'true' })}`), 4000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'
  const [aberto, setAberto] = useState(false)

  const aguardandoLiberacao = ativas?.filter((o) => o.estado === 'aguardando_liberacao') ?? []
  const escalonadas = ativas?.filter((o) => o.estado === 'escalonada') ?? []
  const outras = ativas?.filter((o) => o.estado !== 'escalonada' && o.estado !== 'aguardando_liberacao') ?? []

  useEffect(() => {
    const respondidasNaoVistas = (ativas ?? []).filter((o) =>
      (o.estado === 'ciente' || o.estado === 'medicacao_autorizada' || o.estado === 'indo_buscar') && !o.vistoPelaCoordenacaoEm,
    )
    if (!respondidasNaoVistas.length) return
    api.post('/ocorrencias/marcar-vistas', { ids: respondidasNaoVistas.map((o) => o.id) })
  }, [ativas])

  return (
    <div className="flex flex-col gap-4">
      {!aberto ? (
        <Button onClick={() => setAberto(true)}>Registrar ocorrência de saúde</Button>
      ) : (
        alunos && (
          <NovaOcorrenciaCoord
            alunos={alunos}
            onDone={() => {
              setAberto(false)
              reload()
            }}
            onCancel={() => setAberto(false)}
          />
        )
      )}

      {!ativas?.length && <EmptyState>Nenhuma ocorrência de saúde ativa no momento.</EmptyState>}

      {!!aguardandoLiberacao.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Aguardando sua decisão — ainda não chegou pra família</SectionLabel>
          {aguardandoLiberacao.map((o) => <LinhaAguardandoLiberacao key={o.id} o={o} nome={nome(o.alunoId)} onDone={reload} />)}
        </div>
      )}
      {!!escalonadas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Com a coordenação — sem resposta do responsável</SectionLabel>
          {escalonadas.map((o) => <LinhaOcorrencia key={o.id} o={o} nome={nome(o.alunoId)} onDelete={reload} />)}
        </div>
      )}
      {!!outras.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Em acompanhamento</SectionLabel>
          {outras.map((o) => <LinhaOcorrencia key={o.id} o={o} nome={nome(o.alunoId)} onDelete={reload} />)}
        </div>
      )}
    </div>
  )
}

function NovaOcorrenciaCoord({ alunos, onDone, onCancel }: { alunos: Aluno[]; onDone: () => void; onCancel: () => void }) {
  const { session } = useSession()
  const [alunoId, setAlunoId] = useState(alunos[0]?.id ?? '')
  const [tipo, setTipo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [gravidade, setGravidade] = useState<'leve' | 'moderada' | 'grave'>('leve')
  const [enviando, setEnviando] = useState(false)
  const alunoSelecionado = alunos.find((a) => a.id === alunoId)

  async function registrar() {
    setEnviando(true)
    try {
      await api.post('/ocorrencias', {
        alunoId,
        tipo,
        descricao,
        gravidade,
        registradoPor: `Coordenação (${session?.nome})`,
      })
      onDone()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <SectionLabel>Nova ocorrência de saúde</SectionLabel>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <select className={inputCls} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        {alunoSelecionado && <FichaMedicaView ficha={alunoSelecionado.fichaMedica} />}
        <input autoComplete="off" className={inputCls} placeholder="Tipo (ex: dor de cabeça, febre, queda)" value={tipo} onChange={(e) => setTipo(e.target.value)} />
        <textarea autoComplete="off" className={inputCls} rows={3} placeholder="Descrição do ocorrido" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <div className="flex gap-2">
          {(['leve', 'moderada', 'grave'] as const).map((g) => (
            <button key={g} onClick={() => setGravidade(g)} className={`flex-1 rounded-lg py-2 text-[12px] font-bold capitalize ${gravidade === g ? 'bg-blue text-white' : 'bg-paper-sunken text-muted'}`}>
              {g}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button disabled={!alunoId || !tipo || !descricao || enviando} onClick={registrar}>
            {enviando ? 'Enviando...' : 'Notificar o responsável agora'}
          </Button>
          <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        </div>
      </div>
    </Card>
  )
}

function LinhaAguardandoLiberacao({ o, nome, onDone }: { o: Ocorrencia; nome: string; onDone: () => void }) {
  const { session } = useSession()
  const [processando, setProcessando] = useState(false)

  async function liberar() {
    setProcessando(true)
    try {
      await api.patch(`/ocorrencias/${o.id}/liberar`, { avaliadoPor: session?.nome })
      onDone()
    } finally {
      setProcessando(false)
    }
  }

  async function rejeitar() {
    if (!confirm(`Marcar "${o.tipo}" de ${nome} como não sendo uma emergência? A família não vai ser avisada.`)) return
    setProcessando(true)
    try {
      await api.patch(`/ocorrencias/${o.id}/rejeitar`, { avaliadoPor: session?.nome })
      onDone()
    } finally {
      setProcessando(false)
    }
  }

  return (
    <Card accent="saude">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{nome}</span>
        <Pill tone="amber" dot>Aguardando liberação</Pill>
      </div>
      <p className="mt-1 text-[12.5px] text-muted">{o.tipo} · {o.descricao}</p>
      <p className="mt-1 text-[11px] text-faint">Registrado por {o.registradoPor} · {timeAgo(o.registradoEm)} · gravidade {o.gravidade}</p>
      <div className="mt-2.5 flex gap-2">
        <Button className="w-auto flex-1 px-3.5 py-2 text-[12.5px]" disabled={processando} onClick={liberar}>
          Liberar pra família
        </Button>
        <Button className="w-auto flex-1 px-3.5 py-2 text-[12.5px]" variant="ghost" disabled={processando} onClick={rejeitar}>
          Não é emergência
        </Button>
      </div>
    </Card>
  )
}

function LinhaOcorrencia({ o, nome, onDelete }: { o: Ocorrencia; nome: string; onDelete: () => void }) {
  const [resposta, setResposta] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function excluir() {
    if (!confirm(`Excluir a ocorrência "${o.tipo}" de ${nome}? Essa ação não pode ser desfeita.`)) return
    await api.delete(`/ocorrencias/${o.id}`)
    onDelete()
  }

  async function responderEvolucao() {
    setEnviando(true)
    try {
      await api.patch(`/ocorrencias/${o.id}/responder-evolucao`, { texto: resposta })
      setResposta('')
      onDelete()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card accent="saude">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-bold">{nome}</span>
        {o.estado === 'aguardando_resposta' && <Pill tone="red" dot>Aguardando resposta</Pill>}
        {o.estado === 'escalonada' && <Pill tone="red" dot>Com a coordenação</Pill>}
        {o.estado === 'ciente' && <Pill tone="red" dot>Ciente</Pill>}
        {o.estado === 'medicacao_autorizada' && <Pill tone="red" dot>Medicação autorizada</Pill>}
        {o.estado === 'indo_buscar' && <Pill tone="red" dot>Responsável vai buscar</Pill>}
      </div>
      <p className="mt-1 text-[12.5px] text-muted">{o.tipo} · {o.descricao}</p>
      <p className="mt-1 text-[11px] text-faint">
        Registrado por {o.registradoPor} · {timeAgo(o.registradoEm)}
        {o.escalonadoEm && ` · coordenação acionada ${timeAgo(o.escalonadoEm)}`}
      </p>
      {o.estado === 'medicacao_autorizada' && (
        <p className="mt-2 rounded-lg bg-red-light px-2.5 py-2 text-[12px] font-semibold text-red">
          Medicação informada pelo responsável: {o.medicacaoNome} — {o.medicacaoDosagem}
        </p>
      )}
      {o.estado === 'indo_buscar' && (
        <p className="mt-2 rounded-lg bg-red-light px-2.5 py-2 text-[12px] font-semibold text-red">
          Responsável chega às {o.previsaoChegada}
          {o.medicarAteChegada && ` · medicar até chegar: ${o.medicacaoNome} — ${o.medicacaoDosagem}`}
        </p>
      )}
      {o.perguntaEvolucaoEm && !o.respostaEvolucaoTexto && (
        <div className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5">
          <p className="text-[12px] font-semibold text-blue">O responsável perguntou sobre a evolução do caso.</p>
          <textarea
            autoComplete="off"
            className={inputCls}
            rows={2}
            placeholder="Escreva a resposta pro responsável"
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
          />
          <Button className="w-auto px-3.5 py-2 text-[12.5px]" disabled={!resposta || enviando} onClick={responderEvolucao}>
            {enviando ? 'Enviando...' : 'Responder'}
          </Button>
        </div>
      )}
      {!!o.respostaEvolucaoTexto && (
        <div className="mt-2.5 border-t border-line pt-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Resposta enviada sobre a evolução</p>
          <p className="mt-1 text-[12.5px]">{o.respostaEvolucaoTexto}</p>
        </div>
      )}
      <button onClick={excluir} className="mt-2 text-[11.5px] font-bold text-red">
        Excluir
      </button>
    </Card>
  )
}
