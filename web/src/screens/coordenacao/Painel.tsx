import { useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import { useSearchParams } from 'react-router-dom'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { AchadoPerdido, Aluno, Atestado, SaidaAntecipada, Substituto, Turma } from '../../types'
import { Button, Card, EmptyState, formatDateBR, timeAgo } from '../../components/ui'
import { IconChevron, IconUsers, IconClock, IconHeart, IconFileCheck, IconHistory } from '../../components/Icons'
import { TabGroup, type TabOption } from '../../components/TabGroup'
import { inputCls } from '../shared/formHelpers'
import Feeds from './Feeds'
import Atividades from './Atividades'
import Eventos from './Eventos'
import { AvaliativasCoord } from './Notificacoes'
import ProvasTrimestrais from './ProvasTrimestrais'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

// Paleta do mockup do Painel — ver web/src/index.css pros tokens --color-tab-*.
// Cada aba tem seu par cor-sólida/cor-tint; os cards usam esse mesmo par pro
// círculo do ícone. "alert" é reservado pra contagens que pedem atenção da
// coordenação (em vez de contagem só informativa, que fica cinza/neutra).
type TomCaixa = 'blue' | 'sage' | 'alert' | 'muted'

const TOM_ICONE: Record<TomCaixa, { bg: string; fg: string }> = {
  blue: { bg: 'bg-tab-blue-tint', fg: 'text-tab-blue' },
  sage: { bg: 'bg-tab-sage-tint', fg: 'text-tab-sage' },
  alert: { bg: 'bg-alert-tint', fg: 'text-alert' },
  muted: { bg: 'bg-paper-sunken', fg: 'text-faint' },
}

function CaixaPainel({
  titulo, preview, icon: Icon, tomIcone = 'muted', count, tomBadge = 'alert', aberta, carregado, children,
}: {
  titulo: string
  preview: string
  icon: ComponentType<SVGProps<SVGSVGElement>>
  tomIcone?: TomCaixa
  count?: number
  tomBadge?: 'alert' | 'neutral'
  aberta: boolean
  carregado: boolean
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const inicializado = useRef(false)
  useEffect(() => {
    if (!carregado || inicializado.current) return
    inicializado.current = true
    setOpen(aberta)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregado, aberta])

  const tom = TOM_ICONE[tomIcone]

  return (
    <div className="overflow-hidden rounded-[18px] border border-line bg-paper-raised shadow-[0_1px_2px_rgba(36,30,10,0.03)]">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-4 text-left">
        <span className={`flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl ${tom.bg}`}>
          <Icon className={`h-5 w-5 ${tom.fg}`} />
        </span>
        <span className="min-w-0 flex-1">
          <div className="font-heading-painel text-[15.5px] font-semibold text-ink">{titulo}</div>
          <div className="mt-0.5 truncate text-[12.5px] text-muted">{preview}</div>
        </span>
        {!!count && (
          <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[12px] font-bold text-white ${tomBadge === 'alert' ? 'bg-alert' : 'bg-faint'}`}>
            {count}
          </span>
        )}
        <IconChevron className={`h-4 w-4 flex-shrink-0 text-[#c7c2b4] transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="border-t border-line p-4 pt-3">{children}</div>}
    </div>
  )
}

type Sub = 'visao' | 'eventos' | 'feeds' | 'avaliacoes'

const PAINEL_TABS: TabOption<Sub>[] = [
  { key: 'visao', label: 'Visão geral', tom: 'blue' },
  { key: 'eventos', label: 'Eventos', tom: 'terracotta' },
  { key: 'feeds', label: 'Feed', tom: 'sage' },
  { key: 'avaliacoes', label: 'Avaliações', tom: 'mustard' },
]

export default function Painel() {
  const [params] = useSearchParams()
  const subInicial = (params.get('sub') as Sub) || 'visao'
  const [sub, setSub] = useState<Sub>(subInicial)

  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={PAINEL_TABS} value={sub} onChange={setSub} />
      {sub === 'visao' && <VisaoGeral />}
      {sub === 'eventos' && <Eventos />}
      {sub === 'feeds' && <Feeds />}
      {sub === 'avaliacoes' && <Avaliacoes />}
    </div>
  )
}

type SubAvaliacoes = 'provas' | 'avaliativas'

const AVALIACOES_TABS: TabOption<SubAvaliacoes>[] = [
  { key: 'provas', label: 'Provas Trimestrais', tom: 'mustard' },
  { key: 'avaliativas', label: 'Atividade Avaliativa', tom: 'terracotta' },
]

function Avaliacoes() {
  const [sub, setSub] = useState<SubAvaliacoes>('provas')
  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={AVALIACOES_TABS} value={sub} onChange={setSub} />
      {sub === 'provas' && <ProvasTrimestrais />}
      {sub === 'avaliativas' && <AvaliativasCoord />}
    </div>
  )
}

function VisaoGeral() {
  return (
    <div className="flex flex-col gap-3">
      <SubstitutaBox />
      <SaidasBox />
      <AchadosBox />
      <AtestadosBox />
      <HistoricoBox />
    </div>
  )
}

function HistoricoBox() {
  return (
    <CaixaPainel titulo="Histórico" preview="Ver registros anteriores" icon={IconHistory} tomIcone="muted" aberta={false} carregado>
      <Atividades />
    </CaixaPainel>
  )
}

function SubstitutaBox() {
  const { data: substitutos, reload } = usePolling<Substituto[]>(async () => api.get('/substitutos'), 10000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const [turmaId, setTurmaId] = useState('')
  const [nome, setNome] = useState('')
  const [salvando, setSalvando] = useState(false)

  const substituto = substitutos?.[0]
  const turmaAtualNome = turmas?.find((t) => t.id === substituto?.turmaAtualId)?.nome

  async function atribuir() {
    if (!substituto) return
    setSalvando(true)
    try {
      await api.patch(`/substitutos/${substituto.id}`, { turmaAtualId: turmaId, nomeAtual: nome })
      setTurmaId('')
      setNome('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function encerrar() {
    if (!substituto) return
    await api.patch(`/substitutos/${substituto.id}`, { turmaAtualId: null, nomeAtual: null })
    reload()
  }

  if (!substituto) return null

  return (
    <CaixaPainel
      titulo="Professor(a) eventual"
      preview={substituto.turmaAtualId ? `Cobrindo ${turmaAtualNome ?? '...'}` : 'Nenhuma substituição ativa no momento'}
      icon={IconUsers}
      tomIcone="blue"
      aberta={!!substituto.turmaAtualId}
      carregado={!!substitutos}
    >
      {substituto.turmaAtualId ? (
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[13px] font-bold">{substituto.nomeAtual}</div>
            <div className="text-[11.5px] text-muted">Cobrindo {turmaAtualNome}</div>
          </div>
          <button onClick={encerrar} className="text-[11.5px] font-bold text-red">Encerrar substituição</button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[11.5px] text-faint">Nenhuma substituição ativa no momento.</p>
          <select className={inputCls} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            <option value="">Selecione a turma a cobrir</option>
            {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input autoComplete="off" className={inputCls} placeholder="Nome de quem vai cobrir" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Button disabled={!turmaId || !nome || salvando} onClick={atribuir}>
            {salvando ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </div>
      )}
    </CaixaPainel>
  )
}

function SaidasBox() {
  const { data: saidas } = usePolling<SaidaAntecipada[]>(async () => api.get(`/saidas-antecipadas${qs({ data: hoje() })}`), 8000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  return (
    <CaixaPainel
      titulo="Saídas antecipadas hoje"
      preview={saidas?.length ? `${saidas.length} ${saidas.length === 1 ? 'aluno sai' : 'alunos saem'} antes do horário` : 'Nenhuma saída antecipada avisada para hoje'}
      icon={IconClock}
      tomIcone="blue"
      count={saidas?.length}
      tomBadge="neutral"
      aberta={!!saidas?.length}
      carregado={!!saidas}
    >
      {!saidas?.length ? (
        <EmptyState>Nenhuma saída antecipada avisada para hoje.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {saidas.map((s) => (
            <Card key={s.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{nome(s.alunoId)}</span>
                <span className="text-[13px] font-bold text-blue">{s.horario}</span>
              </div>
              {s.motivo && <p className="mt-1 text-[12.5px] text-muted">{s.motivo}</p>}
              <p className="mt-1 text-[11px] text-faint">Avisado por {s.criadoPor} · {timeAgo(s.criadoEm)}</p>
            </Card>
          ))}
        </div>
      )}
    </CaixaPainel>
  )
}

function AchadosBox() {
  const { data: achados, reload } = usePolling<AchadoPerdido[]>(async () => api.get('/achados'), 6000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  async function marcarEncontrado(id: string) {
    await api.patch(`/achados/${id}`, { estado: 'encontrado' })
    reload()
  }

  const pendentes = (achados ?? []).filter((a) => a.estado === 'reportado').length

  return (
    <CaixaPainel
      titulo="Achados e Perdidos"
      preview={pendentes > 0 ? `${pendentes} ${pendentes === 1 ? 'item sem dono' : 'itens sem dono'}` : 'Nenhum item reportado'}
      icon={IconHeart}
      tomIcone="sage"
      count={pendentes}
      aberta={pendentes > 0}
      carregado={!!achados}
    >
      {!achados?.length ? (
        <EmptyState>Nenhum item reportado.</EmptyState>
      ) : (
        <div className="flex flex-col">
          {achados.map((a, i) => (
            <div key={a.id} className={`flex gap-3 ${i > 0 ? 'mt-3 border-t border-line pt-3' : ''}`}>
              {a.fotoDataUrl ? (
                <a href={a.fotoDataUrl} download={a.fotoNome ?? 'foto'} target="_blank" rel="noreferrer" className="flex-shrink-0">
                  <img src={a.fotoDataUrl} alt="" className="h-[54px] w-[54px] rounded-xl object-cover" />
                </a>
              ) : (
                <div className="h-[54px] w-[54px] flex-shrink-0 rounded-xl bg-tab-sage-tint" />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-heading-painel text-[14.5px] font-semibold text-ink">{nome(a.alunoId)}</div>
                <span className={`mt-0.5 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${a.estado === 'encontrado' ? 'bg-green-light text-green-dark' : 'bg-tab-terracotta-tint text-tab-terracotta'}`}>
                  {a.estado === 'encontrado' ? 'Encontrado' : 'Procurando'}
                </span>
                <p className="mt-1 text-[13px] text-muted">{a.descricao}</p>
                <div className="mt-1 flex items-center gap-3">
                  {a.fotoDataUrl && (
                    <a href={a.fotoDataUrl} download={a.fotoNome ?? 'foto'} className="text-[13px] font-semibold text-tab-blue">
                      Ver foto
                    </a>
                  )}
                  {a.estado === 'reportado' && (
                    <button onClick={() => marcarEncontrado(a.id)} className="text-[13px] font-semibold text-tab-blue">
                      Marcar como encontrado
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </CaixaPainel>
  )
}

function AtestadosBox() {
  const { data: atestados, reload } = usePolling<Atestado[]>(async () => api.get('/atestados'), 8000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  const naoVistos = (atestados ?? []).filter((a) => !a.vistoPelaCoordenacaoEm)

  useEffect(() => {
    if (!naoVistos.length) return
    api.post('/atestados/marcar-vistos', { ids: naoVistos.map((a) => a.id) }).then(reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atestados])

  return (
    <CaixaPainel
      titulo="Atestados"
      preview={naoVistos.length > 0 ? `${naoVistos.length} aguardando análise` : 'Nenhum atestado enviado ainda'}
      icon={IconFileCheck}
      tomIcone="alert"
      count={naoVistos.length}
      aberta={naoVistos.length > 0}
      carregado={!!atestados}
    >
      {!atestados?.length ? (
        <EmptyState>Nenhum atestado enviado ainda.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {atestados.map((a) => (
            <Card key={a.id} className="flex items-start gap-3">
              {a.arquivoDataUrl && a.arquivoTipo?.startsWith('image/') ? (
                <img src={a.arquivoDataUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-paper-sunken text-[9px] font-bold text-muted">
                  {a.arquivoNome ? 'ARQUIVO' : 'Sem anexo'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold">{nome(a.alunoId)}</div>
                <div className="mt-0.5 text-[12.5px] text-muted">{a.motivo}</div>
                <div className="mt-1 text-[11px] text-faint">
                  {formatDateBR(a.dataInicio)} a {formatDateBR(a.dataFim)} · {timeAgo(a.criadoEm)}
                </div>
                {a.arquivoDataUrl && (
                  <a href={a.arquivoDataUrl} download={a.arquivoNome ?? 'atestado'} className="mt-1 inline-block text-[11.5px] font-bold text-blue underline">
                    Ver anexo
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </CaixaPainel>
  )
}
