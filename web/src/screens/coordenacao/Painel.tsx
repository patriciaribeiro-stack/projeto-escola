import { useEffect, useRef, useState, type ReactNode } from 'react'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { AchadoPerdido, Aluno, Atestado, SaidaAntecipada, Substituto, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, formatDateBR, timeAgo } from '../../components/ui'
import { IconChevron } from '../../components/Icons'
import { inputCls } from '../shared/formHelpers'
import Feeds from './Feeds'
import Atividades from './Atividades'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function CaixaPainel({ titulo, count, aberta, carregado, children }: {
  titulo: string
  count?: number
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

  return (
    <Card className="p-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between gap-2 p-4 text-left">
        <span className="text-[13px] font-bold">{titulo}</span>
        <div className="flex items-center gap-2">
          {!!count && <Pill tone="red" dot>{count}</Pill>}
          <IconChevron className={`h-4 w-4 flex-shrink-0 text-faint transition-transform ${open ? 'rotate-90' : ''}`} />
        </div>
      </button>
      {open && <div className="border-t border-line p-4 pt-3">{children}</div>}
    </Card>
  )
}

type Sub = 'visao' | 'atividades' | 'feeds'

export default function Painel() {
  const [sub, setSub] = useState<Sub>('visao')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['visao', 'Visão geral'],
            ['atividades', 'Atividades'],
            ['feeds', 'Feed'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'visao' && <VisaoGeral />}
      {sub === 'atividades' && <Atividades />}
      {sub === 'feeds' && <Feeds />}
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
    </div>
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
    <CaixaPainel titulo="Professor(a) eventual" aberta={!!substituto.turmaAtualId} carregado={!!substitutos}>
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
    <CaixaPainel titulo="Saídas antecipadas hoje" count={saidas?.length} aberta={!!saidas?.length} carregado={!!saidas}>
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
    <CaixaPainel titulo="Achados e Perdidos" count={pendentes} aberta={pendentes > 0} carregado={!!achados}>
      {!achados?.length ? (
        <EmptyState>Nenhum item reportado.</EmptyState>
      ) : (
        <div className="flex flex-col gap-2.5">
          {achados.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start gap-3">
                {a.fotoDataUrl ? (
                  <a href={a.fotoDataUrl} download={a.fotoNome ?? 'foto'} target="_blank" rel="noreferrer">
                    <img src={a.fotoDataUrl} alt="" className="h-12 w-12 flex-shrink-0 rounded-lg object-cover" />
                  </a>
                ) : (
                  <div className="h-12 w-12 flex-shrink-0 rounded-lg bg-paper-sunken" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold">{nome(a.alunoId)}</span>
                    <Pill tone={a.estado === 'encontrado' ? 'green' : 'red'}>{a.estado === 'encontrado' ? 'Encontrado' : 'Procurando'}</Pill>
                  </div>
                  <p className="mt-1 text-[12.5px] text-muted">{a.descricao}</p>
                  {a.fotoDataUrl && (
                    <a href={a.fotoDataUrl} download={a.fotoNome ?? 'foto'} className="mt-1 inline-block text-[11.5px] font-bold text-blue underline">
                      Ver foto
                    </a>
                  )}
                </div>
              </div>
              {a.estado === 'reportado' && (
                <button onClick={() => marcarEncontrado(a.id)} className="mt-2 text-[12px] font-bold text-blue">
                  Marcar como encontrado
                </button>
              )}
            </Card>
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
    <CaixaPainel titulo="Atestados" count={naoVistos.length} aberta={naoVistos.length > 0} carregado={!!atestados}>
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
