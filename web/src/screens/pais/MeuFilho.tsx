import { useEffect, useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, AtividadeAvaliativa, Licao, LicaoStatus, Materia, MedicacaoAgendada, Ocorrencia, OcorrenciaGeral, Periodo, Presenca, RefeicaoRegistro, Relatorio, Rotina, SaidaAntecipada, Turma } from '../../types'
import { Card, CategoriaChip, EmptyState, Pill, SectionLabel, Button, formatDateBR, timeAgo, SubjectChip } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import { useCountdown } from '../../useCountdown'
import { IconCross, IconBell, IconClock } from '../../components/Icons'
import { FileAttach, type Anexo } from '../../components/FileAttach'
import { EditorFichaMedica, FichaMedicaView } from '../shared/FichaMedica'
import { classificarLicao, type ClassificacaoLicao } from '../shared/LicoesLista'
import { presencaDoAluno } from '../shared/AtividadesAvaliativas'
import { FormNovaMedicacao, MedicacaoCard } from '../shared/Medicacoes'
import { TabGroup, TabPills, type TabOption } from '../../components/TabGroup'

type Tab = 'rotina' | 'licoes' | 'saude' | 'ocorrencias'

const licaoPill: Record<LicaoStatus['estado'], { tone: 'green' | 'red' | 'muted'; label: string }> = {
  pendente: { tone: 'red', label: 'Pendente' },
  certo: { tone: 'green', label: 'Entregue certo' },
  fora_padrao: { tone: 'red', label: 'Fora do combinado' },
  faltou: { tone: 'red', label: 'Faltou' },
  vai_para_casa: { tone: 'muted', label: 'Vai fazer em casa' },
}

export default function MeuFilho() {
  const { aluno } = useSession()
  const { data: ocorrencias } = usePolling<Ocorrencia[]>(
    async () => (aluno ? api.get(`/ocorrencias${qs({ alunoId: aluno.id })}`) : []),
    3000,
    [aluno?.id],
  )
  const { data: gerais } = usePolling<OcorrenciaGeral[]>(
    async () => (aluno ? api.get(`/ocorrencias-gerais${qs({ alunoId: aluno.id, estado: 'aprovada' })}`) : []),
    5000,
    [aluno?.id],
  )
  const ativa = ocorrencias?.find((o) => o.estado !== 'resolvida')
  const precisaRespostaSaude = ativa?.estado === 'aguardando_resposta' || ativa?.estado === 'escalonada'
  const geralPendente = gerais?.some((o) => !o.cientePor) ?? false
  const [tab, setTab] = useState<Tab>('rotina')
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const turmaAtual = turmas?.find((t) => t.id === aluno?.turmaId)
  const turmaNome = turmaAtual?.nome
  const ehFundamental = turmaAtual?.segmento === 'fundamental_1' || turmaAtual?.segmento === 'fundamental_2'

  if (!aluno) return null

  const tabs: TabOption<Tab>[] = [
    { key: 'rotina', label: 'Rotina' },
    { key: 'licoes', label: 'Lição de casa' },
    { key: 'saude', label: precisaRespostaSaude ? 'Saúde •' : 'Saúde', alerta: precisaRespostaSaude },
    { key: 'ocorrencias', label: geralPendente ? 'Recados •' : 'Recados', alerta: geralPendente },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="font-display text-lg font-bold">{aluno.nome}</div>
        <div className="text-[12px] text-muted">Turma {turmaNome ?? ''}</div>
      </div>

      <TabGroup tabs={tabs} value={tab} onChange={setTab} />

      {tab === 'rotina' && <RotinaTab alunoId={aluno.id} turmaId={aluno.turmaId} ehFundamental={ehFundamental} periodo={aluno.periodo} />}
      {tab === 'licoes' && <LicoesTab alunoId={aluno.id} turmaId={aluno.turmaId} />}
      {tab === 'saude' && <SaudeTab aluno={aluno} ocorrencias={ocorrencias ?? []} />}
      {tab === 'ocorrencias' && <OcorrenciasGeraisTab alunoId={aluno.id} />}
    </div>
  )
}

function OcorrenciasGeraisTab({ alunoId }: { alunoId: string }) {
  const { session } = useSession()
  const { data: gerais, reload } = usePolling<OcorrenciaGeral[]>(
    async () => api.get(`/ocorrencias-gerais${qs({ alunoId, estado: 'aprovada' })}`),
    8000,
    [alunoId],
  )

  async function marcarCiente(id: string) {
    await api.patch(`/ocorrencias-gerais/${id}/ciente`, { cientePor: session?.nome })
    reload()
  }

  if (!gerais?.length) return <EmptyState>Nenhuma ocorrência registrada.</EmptyState>

  return (
    <div className="flex flex-col gap-2.5">
      {gerais.slice(0, 10).map((o) => (
        <Card key={o.id} className={o.cientePor ? '' : 'border-red'}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold">{o.titulo}</span>
            {!o.cientePor && <Pill tone="red" dot>Aguardando confirmação</Pill>}
          </div>
          <p className="mt-1 text-[12.5px] text-muted">{o.descricao}</p>
          <p className="mt-1 text-[11px] text-faint">Registrada por {o.registradoPor} · {timeAgo(o.registradoEm)}</p>
          {o.cientePor ? (
            <Pill tone="blue" dot>Você está ciente</Pill>
          ) : (
            <Button className="mt-2.5" onClick={() => marcarCiente(o.id)}>Estou ciente</Button>
          )}
        </Card>
      ))}
    </div>
  )
}

const STATUS_LABEL: Record<string, string> = {
  comeu_bem: 'Comeu bem',
  comeu_pouco: 'Comeu pouco',
  nao_quis: 'Não quis comer',
  nao_oferecido: 'Não foi oferecido',
}

const HIGIENE_LABEL: Record<string, string> = {
  troca: 'Troca de fralda',
  evacuacao: 'Evacuação',
  escape: 'Escape',
}

function RefeicaoCard({ titulo, registro }: { titulo: string; registro: RefeicaoRegistro | null }) {
  return (
    <Card>
      <SectionLabel>{titulo}</SectionLabel>
      {registro ? (
        <>
          <p className="mt-1 text-[13px] font-semibold">{STATUS_LABEL[registro.status] ?? registro.status}</p>
          {registro.observacao && <p className="mt-0.5 text-[12px] text-muted">{registro.observacao}</p>}
          {!!registro.itensAceitos?.length && (
            <p className="mt-1 text-[12px] text-muted">Aceitou: {registro.itensAceitos.join(', ')}</p>
          )}
        </>
      ) : (
        <p className="mt-1 text-[12.5px] text-muted">Ainda não registrado hoje.</p>
      )}
    </Card>
  )
}

function SaidaAntecipadaCard({ alunoId, turmaId }: { alunoId: string; turmaId: string }) {
  const { session } = useSession()
  const hoje = new Date().toISOString().slice(0, 10)
  const { data: saidas, reload } = usePolling<SaidaAntecipada[]>(
    async () => api.get(`/saidas-antecipadas${qs({ alunoId, data: hoje })}`),
    8000,
    [alunoId],
  )
  const saida = saidas?.[0]
  const [aberto, setAberto] = useState(false)
  const [horario, setHorario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    setEnviando(true)
    try {
      await api.post('/saidas-antecipadas', { alunoId, turmaId, data: hoje, horario, motivo: motivo || null, criadoPor: session?.nome })
      setHorario('')
      setMotivo('')
      setAberto(false)
      reload()
    } finally {
      setEnviando(false)
    }
  }

  async function cancelar(id: string) {
    await api.delete(`/saidas-antecipadas/${id}`)
    reload()
  }

  if (saida) {
    return (
      <Card>
        <div className="flex items-center justify-between">
          <SectionLabel>Saída antecipada hoje</SectionLabel>
          <button onClick={() => cancelar(saida.id)} className="text-[11.5px] font-bold text-red">Cancelar aviso</button>
        </div>
        <p className="mt-1 text-[13px] font-semibold">Sai às {saida.horario}</p>
        {saida.motivo && <p className="mt-0.5 text-[12px] text-muted">{saida.motivo}</p>}
        <p className="mt-1 text-[11px] text-faint">Professora e coordenação avisadas.</p>
      </Card>
    )
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionLabel>Saída antecipada</SectionLabel>
        <button onClick={() => setAberto((v) => !v)} className="text-[12px] font-bold text-blue">
          {aberto ? 'Cancelar' : 'Avisar'}
        </button>
      </div>
      {!aberto && <p className="mt-1 text-[12px] text-muted">Se o seu filho vai sair mais cedo hoje, avise a professora e a coordenação aqui.</p>}
      {aberto && (
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off"
            value={horario}
            onChange={(e) => setHorario(e.target.value)}
            placeholder="Horário de saída (ex: 15:30)"
            className={inputCls}
          />
          <input autoComplete="off"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Motivo (opcional)"
            className={inputCls}
          />
          <Button disabled={!horario || enviando} onClick={enviar}>
            {enviando ? 'Enviando...' : 'Avisar professora e coordenação'}
          </Button>
        </div>
      )}
    </Card>
  )
}

function RotinaTab({ alunoId, turmaId, ehFundamental, periodo }: { alunoId: string; turmaId: string; ehFundamental: boolean; periodo: Periodo }) {
  const hoje = new Date().toISOString().slice(0, 10)
  const { data } = usePolling<Rotina[]>(async () => api.get(`/rotinas${qs({ alunoId, data: hoje })}`), 8000, [alunoId])
  const rotina = data?.[0]
  const { data: relatorios } = usePolling<Relatorio[]>(async () => api.get(`/relatorios${qs({ turmaId })}`), 8000, [turmaId])
  const relatoriosHoje = (relatorios ?? []).filter(
    (r) => (r.alunoId === null || r.alunoId === alunoId) && r.criadoEm.slice(0, 10) === hoje,
  )

  return (
    <div className="flex flex-col gap-3">
      <SaidaAntecipadaCard alunoId={alunoId} turmaId={turmaId} />

      {!ehFundamental && (
        <>
          <SectionLabel>Registros do dia</SectionLabel>
          {periodo === 'integral' && (
            <>
              <RefeicaoCard titulo="Lanche da manhã" registro={rotina?.lancheManha ?? null} />
              <RefeicaoCard titulo="Almoço" registro={rotina?.almoco ?? null} />
            </>
          )}
          <RefeicaoCard titulo="Lanche da tarde" registro={rotina?.lancheTarde ?? null} />

          <Card>
            <SectionLabel>Sono</SectionLabel>
            {!rotina?.sono?.dormiuAs && <p className="mt-1 text-[12.5px] text-muted">Ainda não dormiu hoje.</p>}
            {rotina?.sono?.dormiuAs && !rotina.sono.acordouAs && (
              <p className="mt-1 text-[13px] font-semibold">Dormiu às {rotina.sono.dormiuAs}</p>
            )}
            {rotina?.sono?.dormiuAs && rotina.sono.acordouAs && (
              <p className="mt-1 text-[13px] font-semibold">Dormiu às {rotina.sono.dormiuAs} · Acordou às {rotina.sono.acordouAs}</p>
            )}
          </Card>

          {!!rotina?.higienizacoes.length && (
            <Card>
              <SectionLabel>Higiene</SectionLabel>
              <div className="mt-2 flex flex-col gap-1.5">
                {rotina.higienizacoes.map((h) => (
                  <div key={h.id} className="flex items-center justify-between text-[12.5px]">
                    <span className="font-semibold">{HIGIENE_LABEL[h.tipo] ?? h.tipo}</span>
                    <span className="text-faint">{new Date(h.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {!!rotina?.aulas.length && (
        <Card>
          <SectionLabel>Aulas de hoje</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {rotina.aulas.map((au) => (
              <SubjectChip key={au}>{au}</SubjectChip>
            ))}
          </div>
        </Card>
      )}

      {relatoriosHoje.map((r) => (
        <Card key={r.id}>
          <SectionLabel>Relatório do dia</SectionLabel>
          <p className="mt-1 whitespace-pre-line text-[13px]">{r.texto}</p>
          <p className="mt-1 text-[11px] text-faint">{r.autor} · {timeAgo(r.criadoEm)}</p>
        </Card>
      ))}

      <p className="px-1 text-[11px] text-faint">Visível só para a sua família.</p>
    </div>
  )
}

function hojeISO() {
  return new Date().toISOString().slice(0, 10)
}

type FiltroLicoes = 'aberto' | 'realizada' | 'avaliativa'

type ItemLicoes =
  | { tipo: 'licao'; ordem: string; licao: Licao; status?: LicaoStatus; classificacao: ClassificacaoLicao }
  | { tipo: 'avaliativa'; ordem: string; atividade: AtividadeAvaliativa; materiaNome: string; presenca?: Presenca }

export function LicoesTab({ alunoId, turmaId, podeEnviarAnexo }: { alunoId: string; turmaId: string; podeEnviarAnexo?: boolean }) {
  const { data: licoes } = usePolling<Licao[]>(async () => api.get(`/licoes${qs({ turmaId })}`), 8000, [turmaId])
  const { data: status, reload: reloadStatus } = usePolling<LicaoStatus[]>(async () => api.get(`/licao-status${qs({ alunoId })}`), 8000, [alunoId])
  const { data: atividades } = usePolling<AtividadeAvaliativa[]>(async () => api.get(`/atividades-avaliativas${qs({ turmaId })}`), 8000, [turmaId])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const { data: presencas } = usePolling<Presenca[]>(async () => api.get(`/presencas${qs({ turmaId })}`), 8000, [turmaId])
  const [filtro, setFiltro] = useState<FiltroLicoes>('aberto')

  if (!licoes?.length && !atividades?.length) return <EmptyState>Nenhuma lição de casa publicada ainda.</EmptyState>

  const hoje = hojeISO()
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  const itensLicao: ItemLicoes[] = (licoes ?? []).map((l) => {
    const st = status?.find((s) => s.licaoId === l.id)
    return { tipo: 'licao', ordem: l.entrega, licao: l, status: st, classificacao: classificarLicao(l, st ? [st] : []) }
  })
  const itensAvaliativa: ItemLicoes[] = (atividades ?? []).map((at) => ({
    tipo: 'avaliativa',
    ordem: at.data,
    atividade: at,
    materiaNome: materiaNome(at.materiaId),
    presenca: presencaDoAluno(presencas ?? [], alunoId, at.data, at.materiaId),
  }))

  const itensFiltrados = [...itensLicao, ...itensAvaliativa].filter((item) => {
    if (filtro === 'avaliativa') return item.tipo === 'avaliativa'
    if (item.tipo === 'avaliativa') return filtro === 'aberto' ? item.atividade.data >= hoje : item.atividade.data < hoje
    return filtro === 'aberto' ? item.classificacao !== 'realizada' : item.classificacao === 'realizada'
  })
  itensFiltrados.sort((a, b) => (filtro === 'aberto' ? a.ordem.localeCompare(b.ordem) : b.ordem.localeCompare(a.ordem)))

  const filtros: { value: FiltroLicoes; label: string }[] = [
    { value: 'aberto', label: 'Em aberto' },
    { value: 'realizada', label: 'Realizadas' },
    ...(atividades?.length ? [{ value: 'avaliativa' as const, label: 'Atividades avaliativas' }] : []),
  ]

  return (
    <div className="flex flex-col gap-2.5">
      <TabPills tabs={filtros.map((f) => ({ key: f.value, label: f.label }))} value={filtro} onChange={setFiltro} tom="sage" />
      {!itensFiltrados.length && <EmptyState>Nada encontrado com esse filtro.</EmptyState>}
      {!!itensFiltrados.length && (
      <Card className="p-0">
      {itensFiltrados.map((item, i) => {
        if (item.tipo === 'avaliativa') {
          const { atividade: at, presenca, materiaNome: nomeMateria } = item
          const jaOcorreu = at.data <= hoje
          return (
            <div key={`av-${at.id}`} className={`p-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-[13px] font-bold">{nomeMateria}</span>
                    <Pill tone="amber">Atividade avaliativa</Pill>
                  </div>
                  <div className="mt-0.5 text-[11.5px] text-muted">{at.conteudo}</div>
                  <div className="mt-1 text-[11px] text-faint">Aplicação {formatDateBR(at.data)} · vale {at.valor}</div>
                </div>
                {!jaOcorreu && <Pill tone="blue">Agendada</Pill>}
                {jaOcorreu && presenca?.presente === true && <Pill tone="green">Presente</Pill>}
                {jaOcorreu && presenca?.presente === false && <Pill tone="red">Faltou</Pill>}
                {jaOcorreu && presenca === undefined && <Pill tone="muted">Aguardando</Pill>}
              </div>
            </div>
          )
        }

        const { licao: l, status: st, classificacao } = item
        const meta = st ? licaoPill[st.estado] : licaoPill.pendente
        return (
          <div key={l.id} className={`p-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <div className="truncate text-[13px] font-bold">{l.titulo}</div>
                  {classificacao === 'vencida' && <Pill tone="red" dot>Atrasada</Pill>}
                </div>
                <div className="mt-0.5 text-[11.5px] text-muted">{l.descricao}</div>
                <div className="mt-1 text-[11px] text-faint">Entrega {formatDateBR(l.entrega)}</div>
                {l.anexoDataUrl && (
                  <a href={l.anexoDataUrl} download={l.anexoNome ?? 'anexo'} className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] font-bold text-blue underline">
                    Anexo: {l.anexoNome}
                  </a>
                )}
              </div>
              <Pill tone={meta.tone}>{meta.label}</Pill>
            </div>
            {st?.observacaoIntegral && (
              <p className="mt-1.5 text-[11px] text-muted">{st.observacaoIntegral}</p>
            )}
            {podeEnviarAnexo && l.aceitaEntregaPdf && st && (
              <div className="mt-2.5">
                <EnvioEntregaLicao status={st} onEnviado={reloadStatus} />
              </div>
            )}
          </div>
        )
      })}
      </Card>
      )}
    </div>
  )
}

function EnvioEntregaLicao({ status, onEnviado }: { status: LicaoStatus; onEnviado: () => void }) {
  const [enviando, setEnviando] = useState(false)

  async function enviar(anexo: Anexo | null) {
    if (!anexo) return
    setEnviando(true)
    try {
      await api.patch(`/licao-status/${status.id}/entrega`, {
        entregaAnexoNome: anexo.nome, entregaAnexoTipo: anexo.tipo, entregaAnexoDataUrl: anexo.dataUrl,
      })
      onEnviado()
    } finally {
      setEnviando(false)
    }
  }

  if (enviando) return <p className="text-[11.5px] text-muted">Enviando...</p>

  if (status.entregaAnexoDataUrl) {
    return (
      <div className="flex flex-col gap-1.5 rounded-lg bg-green-light p-2.5">
        <span className="text-[11.5px] font-semibold text-green-dark">Enviado: {status.entregaAnexoNome}</span>
        <FileAttach value={null} onChange={enviar} accept="application/pdf" label="Reenviar (substitui o anterior)" />
      </div>
    )
  }

  return <FileAttach value={null} onChange={enviar} accept="application/pdf" label="Anexar PDF da lição feita" />
}

function SaudeTab({ aluno, ocorrencias }: { aluno: Aluno; ocorrencias: Ocorrencia[] }) {
  const { refreshPai, session } = useSession()
  const ativas = ocorrencias.filter((o) => o.estado !== 'resolvida')
  const historico = ocorrencias.filter((o) => o.estado === 'resolvida')
  const [atestadoAberto, setAtestadoAberto] = useState(false)
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [medicacaoAberta, setMedicacaoAberta] = useState(false)
  const { data: medicacoes, reload: reloadMedicacoes } = usePolling<MedicacaoAgendada[]>(
    async () => api.get(`/medicacoes${qs({ alunoId: aluno.id })}`),
    8000,
    [aluno.id],
  )

  useEffect(() => {
    const naoVistas = ocorrencias.filter((o) => o.respostaEvolucaoTexto && !o.respostaEvolucaoVistaPeloPaiEm)
    for (const o of naoVistas) {
      api.patch(`/ocorrencias/${o.id}/marcar-evolucao-vista`, {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ocorrencias])

  return (
    <div className="flex flex-col gap-4">
      <CategoriaChip categoria="saude" icon={IconCross}>Saúde</CategoriaChip>
      <div>
        <SectionLabel>{ativas.length > 1 ? 'Ocorrências ativas' : 'Ocorrência ativa'}</SectionLabel>
        <div className="mt-2 flex flex-col gap-3">
          {ativas.length ? ativas.map((o) => <OcorrenciaAtiva key={o.id} ocorrencia={o} />) : (
            <EmptyState>Nenhuma ocorrência de saúde em aberto. Tudo tranquilo por aqui.</EmptyState>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <SectionLabel>Ficha médica</SectionLabel>
          <button onClick={() => setEditandoFicha((v) => !v)} className="text-[12px] font-bold text-blue">
            {editandoFicha ? 'Cancelar' : aluno.fichaMedica ? 'Editar' : 'Preencher'}
          </button>
        </div>
        <div className="mt-2">
          {editandoFicha ? (
            <EditorFichaMedica aluno={aluno} onSalvo={() => { setEditandoFicha(false); refreshPai() }} />
          ) : (
            <FichaMedicaView ficha={aluno.fichaMedica} />
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <SectionLabel>Medicação na escola</SectionLabel>
          <button onClick={() => setMedicacaoAberta((v) => !v)} className="text-[12px] font-bold text-blue">
            {medicacaoAberta ? 'Cancelar' : 'Enviar medicamento'}
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {medicacaoAberta && (
            <FormNovaMedicacao
              alunoId={aluno.id}
              autor={session?.nome ?? ''}
              onDone={() => {
                setMedicacaoAberta(false)
                reloadMedicacoes()
              }}
            />
          )}
          {!medicacoes?.length && !medicacaoAberta && <EmptyState>Nenhum medicamento enviado.</EmptyState>}
          {medicacoes?.map((m) => (
            <MedicacaoCard key={m.id} medicacao={m} papel="pai" onReload={reloadMedicacoes} />
          ))}
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-bold">Atestado médico</div>
          <button onClick={() => setAtestadoAberto((v) => !v)} className="text-[12px] font-bold text-blue">
            {atestadoAberto ? 'Cancelar' : 'Anexar'}
          </button>
        </div>
        {!atestadoAberto && (
          <p className="mt-1 text-[12px] text-muted">Anexe um atestado para justificar falta — a coordenação e os professores são notificados na hora.</p>
        )}
        {atestadoAberto && <AtestadoForm alunoId={aluno.id} onDone={() => setAtestadoAberto(false)} />}
      </Card>

      {!!historico.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Histórico</SectionLabel>
          {historico.map((o) => (
            <Card key={o.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{o.tipo}</span>
                <Pill tone="green">Resolvida</Pill>
              </div>
              <p className="mt-1 text-[12px] text-muted">{o.descricao}</p>
              <p className="mt-1 text-[11px] text-faint">{timeAgo(o.registradoEm)}</p>
              {o.respostaEvolucaoTexto && (
                <div className="mt-2 border-t border-line pt-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Resposta da coordenação sobre a evolução</p>
                  <p className="mt-1 text-[12.5px]">{o.respostaEvolucaoTexto}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

type Modo = null | 'medicacao' | 'buscar'

function OcorrenciaAtiva({ ocorrencia }: { ocorrencia: Ocorrencia }) {
  const [busy, setBusy] = useState(false)
  const [local, setLocal] = useState(ocorrencia)
  const [modo, setModo] = useState<Modo>(null)
  const [medNome, setMedNome] = useState('')
  const [medDosagem, setMedDosagem] = useState('')
  const [previsaoChegada, setPrevisaoChegada] = useState('')
  const [medicarAteChegar, setMedicarAteChegar] = useState(false)
  const countdown = useCountdown(local.estado === 'aguardando_resposta' ? local.prazoEscalonamentoEm : null)
  const prazoEvolucao = local.respostaPaiEm ? new Date(new Date(local.respostaPaiEm).getTime() + 40 * 60_000).toISOString() : null
  const countdownEvolucao = useCountdown(local.respostaPaiEm && !local.perguntaEvolucaoEm ? prazoEvolucao : null)
  const [perguntando, setPerguntando] = useState(false)

  async function responder(tipo: 'ciente' | 'medicacao' | 'buscar') {
    setBusy(true)
    try {
      const updated = await api.patch<Ocorrencia>(`/ocorrencias/${local.id}/responder`, {
        tipo,
        medicacaoNome: tipo === 'medicacao' || (tipo === 'buscar' && medicarAteChegar) ? medNome : undefined,
        medicacaoDosagem: tipo === 'medicacao' || (tipo === 'buscar' && medicarAteChegar) ? medDosagem : undefined,
        previsaoChegada: tipo === 'buscar' ? previsaoChegada : undefined,
        medicarAteChegada: tipo === 'buscar' ? medicarAteChegar : undefined,
      })
      setLocal(updated)
    } finally {
      setBusy(false)
    }
  }

  async function perguntarEvolucao() {
    setPerguntando(true)
    try {
      const updated = await api.patch<Ocorrencia>(`/ocorrencias/${local.id}/perguntar-evolucao`, {})
      setLocal(updated)
    } finally {
      setPerguntando(false)
    }
  }

  const respondida = local.estado !== 'aguardando_resposta' && local.estado !== 'escalonada'

  return (
    <Card className="border-red">
      <div className="flex items-center justify-between">
        {local.estado === 'aguardando_resposta' && <Pill tone="red" dot>Aguardando sua resposta</Pill>}
        {local.estado === 'escalonada' && <Pill tone="red" dot>Com a coordenação</Pill>}
        {local.estado === 'ciente' && <Pill tone="red" dot>Você está ciente</Pill>}
        {local.estado === 'medicacao_autorizada' && <Pill tone="red" dot>Medicação autorizada</Pill>}
        {local.estado === 'indo_buscar' && <Pill tone="red" dot>Você vai buscar</Pill>}
        <span className="text-[11px] text-faint">
          {new Date(local.registradoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <div className="mt-3">
        <div className="text-[15px] font-bold">{local.tipo}</div>
        <p className="mt-1 text-[13px] text-muted">{local.descricao}</p>
        <p className="mt-1 text-[11.5px] text-faint">Registrado por {local.registradoPor} · gravidade {local.gravidade}</p>
      </div>

      {local.estado === 'aguardando_resposta' && (
        <>
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-light px-3 py-2 text-[12px] font-semibold text-red">
            <IconClock className="h-3.5 w-3.5" />
            {countdown.isOver ? 'Avisando a coordenação...' : `Se não responder, a coordenação é avisada automaticamente em ${countdown.label}`}
          </div>

          {modo === null && (
            <div className="mt-3 flex flex-col gap-2">
              <Button disabled={busy} onClick={() => setModo('medicacao')}>
                Autorizar medicação
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => setModo('buscar')}>
                Vou buscar o aluno
              </Button>
              <Button variant="ghost" disabled={busy} onClick={() => responder('ciente')}>
                Estou ciente, sem medicação
              </Button>
            </div>
          )}

          {modo === 'medicacao' && (
            <div className="mt-3 flex flex-col gap-2.5">
              <p className="text-[11.5px] text-muted">
                Escreva exatamente o que autoriza dar ao seu filho agora — o app não sugere nem preenche nada.
              </p>
              <input autoComplete="off"
                value={medNome}
                onChange={(e) => setMedNome(e.target.value)}
                placeholder="Nome do medicamento (ex: Dipirona gotas)"
                className={inputCls}
              />
              <input autoComplete="off"
                value={medDosagem}
                onChange={(e) => setMedDosagem(e.target.value)}
                placeholder="Dosagem (ex: 10 gotas, dose única)"
                className={inputCls}
              />
              <div className="flex gap-2">
                <Button disabled={!medNome || !medDosagem || busy} onClick={() => responder('medicacao')}>
                  Confirmar autorização
                </Button>
                <Button variant="ghost" onClick={() => setModo(null)}>Cancelar</Button>
              </div>
            </div>
          )}

          {modo === 'buscar' && (
            <div className="mt-3 flex flex-col gap-2.5">
              <p className="text-[11.5px] text-muted">Avise a escola até que horas você chega.</p>
              <input autoComplete="off"
                value={previsaoChegada}
                onChange={(e) => setPrevisaoChegada(e.target.value)}
                placeholder="Previsão de chegada (ex: 14:30)"
                className={inputCls}
              />
              <label className="flex items-center gap-2 text-[12.5px] font-semibold">
                <input autoComplete="off" type="checkbox" checked={medicarAteChegar} onChange={(e) => setMedicarAteChegar(e.target.checked)} />
                Quero que medique meu filho até eu chegar
              </label>
              {medicarAteChegar && (
                <>
                  <input autoComplete="off"
                    value={medNome}
                    onChange={(e) => setMedNome(e.target.value)}
                    placeholder="Nome do medicamento (ex: Dipirona gotas)"
                    className={inputCls}
                  />
                  <input autoComplete="off"
                    value={medDosagem}
                    onChange={(e) => setMedDosagem(e.target.value)}
                    placeholder="Dosagem (ex: 10 gotas, dose única)"
                    className={inputCls}
                  />
                </>
              )}
              <div className="flex gap-2">
                <Button
                  disabled={!previsaoChegada || (medicarAteChegar && (!medNome || !medDosagem)) || busy}
                  onClick={() => responder('buscar')}
                >
                  Confirmar
                </Button>
                <Button variant="ghost" onClick={() => setModo(null)}>Cancelar</Button>
              </div>
            </div>
          )}
        </>
      )}

      {local.estado === 'escalonada' && (
        <div className="mt-3 rounded-lg bg-red-light px-3 py-2 text-[12px] font-semibold text-red">
          Você não respondeu a tempo — a coordenação já foi avisada e está acompanhando o caso.
        </div>
      )}

      {local.estado === 'medicacao_autorizada' && (
        <div className="mt-3 rounded-lg bg-red-light px-3 py-2 text-[12px] font-semibold text-red">
          Você autorizou: {local.medicacaoNome} — {local.medicacaoDosagem}
        </div>
      )}

      {local.estado === 'indo_buscar' && (
        <div className="mt-3 rounded-lg bg-red-light px-3 py-2 text-[12px] font-semibold text-red">
          Previsão de chegada: {local.previsaoChegada}
          {local.medicarAteChegada && ` · Medicar até você chegar: ${local.medicacaoNome} — ${local.medicacaoDosagem}`}
        </div>
      )}

      {respondida && (
        <div className="mt-3 rounded-lg bg-red-light px-3 py-2 text-[12px] font-semibold text-red">
          Em acompanhamento pela escola até o retorno para a sala.
        </div>
      )}

      {respondida && local.respostaPaiEm && (
        <div className="mt-3 border-t border-line pt-3">
          {local.respostaEvolucaoTexto ? (
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-faint">Resposta da coordenação</p>
              <p className="mt-1 text-[13px]">{local.respostaEvolucaoTexto}</p>
            </div>
          ) : local.perguntaEvolucaoEm ? (
            <p className="text-[12px] text-muted">Você perguntou sobre a evolução — aguardando resposta da coordenação.</p>
          ) : countdownEvolucao.isOver ? (
            <Button variant="secondary" disabled={perguntando} onClick={perguntarEvolucao}>
              {perguntando ? 'Enviando...' : 'Perguntar sobre a evolução'}
            </Button>
          ) : (
            <p className="text-[11.5px] text-faint">
              Você poderá perguntar sobre a evolução em {countdownEvolucao.label}.
            </p>
          )}
        </div>
      )}
    </Card>
  )
}

function AtestadoForm({ alunoId, onDone }: { alunoId: string; onDone: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10))
  const [dataFim, setDataFim] = useState(new Date().toISOString().slice(0, 10))
  const [arquivo, setArquivo] = useState<Anexo | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)

  async function enviar() {
    setEnviando(true)
    try {
      await api.post('/atestados', {
        alunoId,
        motivo,
        dataInicio,
        dataFim,
        arquivoNome: arquivo?.nome ?? null,
        arquivoTipo: arquivo?.tipo ?? null,
        arquivoDataUrl: arquivo?.dataUrl ?? null,
      })
      setEnviado(true)
      setTimeout(onDone, 1400)
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg bg-green-light px-3 py-2 text-[12px] font-semibold text-green-dark">
        <IconBell className="h-4 w-4" /> Atestado enviado — coordenação e professores notificados.
      </div>
    )
  }

  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <input autoComplete="off"
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        placeholder="Motivo (ex: virose, consulta médica)"
        className={inputCls}
      />
      <div className="flex gap-2">
        <label className="flex-1 text-[11px] text-muted">
          De
          <input autoComplete="off" type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
        <label className="flex-1 text-[11px] text-muted">
          Até
          <input autoComplete="off" type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className={`mt-1 w-full ${inputCls}`} />
        </label>
      </div>
      <FileAttach value={arquivo} onChange={setArquivo} accept="image/*,.pdf" label="Anexar foto ou PDF do atestado" />
      <Button disabled={!motivo || !arquivo || enviando} onClick={enviar}>
        {enviando ? 'Enviando...' : 'Enviar atestado'}
      </Button>
    </div>
  )
}
