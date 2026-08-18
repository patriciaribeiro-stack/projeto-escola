import { useState } from 'react'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, Licao, LicaoEstado, LicaoStatus, Turma } from '../../types'
import { Avatar, Button, Card, CategoriaChip, EmptyState, Pill, formatDateBR, timeAgo } from '../../components/ui'
import { IconBook } from '../../components/Icons'
import { inputCls } from './formHelpers'

const ESTADOS: { value: LicaoEstado; label: string; tone: 'green' | 'red' | 'muted' }[] = [
  { value: 'pendente', label: 'Pendente', tone: 'red' },
  { value: 'certo', label: 'Entregue certo', tone: 'green' },
  { value: 'fora_padrao', label: 'Fora do combinado', tone: 'red' },
  { value: 'faltou', label: 'Faltou', tone: 'red' },
  { value: 'vai_para_casa', label: 'Vai fazer em casa', tone: 'muted' },
]


export type ClassificacaoLicao = 'pendente' | 'vencida' | 'realizada'

export function classificarLicao(licao: Licao, statusDaLicao: LicaoStatus[]): ClassificacaoLicao {
  const hoje = new Date().toISOString().slice(0, 10)
  const temPendente = statusDaLicao.some((s) => s.estado === 'pendente')
  if (!temPendente) return 'realizada'
  return licao.entrega < hoje ? 'vencida' : 'pendente'
}

export function licaoVencidaPendente(licao: Licao, statusDaLicao: LicaoStatus[]): boolean {
  return classificarLicao(licao, statusDaLicao) === 'vencida'
}

export const FILTROS_STATUS: { value: ClassificacaoLicao | ''; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'pendente', label: 'Pendentes' },
  { value: 'vencida', label: 'Vencidas' },
  { value: 'realizada', label: 'Realizadas' },
]

export function LicoesLista({ turmaId, podeEditar, autorConferir }: { turmaId?: string; podeEditar?: boolean; autorConferir?: string }) {
  const { data: licoes, reload } = usePolling<Licao[]>(async () => api.get(`/licoes${qs({ turmaId })}`), 8000, [turmaId])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get(`/alunos${qs({ turmaId })}`), 30000, [turmaId])
  const { data: status, reload: reloadStatus } = usePolling<LicaoStatus[]>(async () => api.get(`/licao-status${qs({ turmaId })}`), 6000, [turmaId])
  const { data: turmas } = usePolling<Turma[]>(async () => (turmaId ? Promise.resolve([]) : api.get('/turmas')), 60000, [turmaId])
  const [editando, setEditando] = useState<string | null>(null)
  const [conferindo, setConferindo] = useState<string | null>(null)
  const [filtroTurmaId, setFiltroTurmaId] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<ClassificacaoLicao | ''>('')

  const licoesFiltradas = (licoes ?? []).filter((l) => {
    if (!turmaId && filtroTurmaId && l.turmaId !== filtroTurmaId) return false
    if (filtroStatus) {
      const statusDaLicao = status?.filter((s) => s.licaoId === l.id) ?? []
      if (classificarLicao(l, statusDaLicao) !== filtroStatus) return false
    }
    return true
  })

  return (
    <div className="flex flex-col gap-2.5">
      <CategoriaChip categoria="licoes" icon={IconBook}>Lições de casa</CategoriaChip>
      {!!licoes?.length && (
        <Card>
          {!turmaId && (
            <select className={`${inputCls} mb-2`} value={filtroTurmaId} onChange={(e) => setFiltroTurmaId(e.target.value)}>
              <option value="">Todas as turmas</option>
              {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </select>
          )}
          <div className="flex flex-wrap gap-1.5">
            {FILTROS_STATUS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFiltroStatus(f.value)}
                className={`rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold ${filtroStatus === f.value ? 'border-green bg-green text-white' : 'border-line text-muted'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Card>
      )}

      {!licoes?.length && <EmptyState>Nenhuma lição publicada ainda.</EmptyState>}
      {!!licoes?.length && !licoesFiltradas.length && <EmptyState>Nenhuma lição encontrada com esse filtro.</EmptyState>}

      {licoesFiltradas.map((l) => {
        if (editando === l.id) return <EditorLicao key={l.id} licao={l} autor={autorConferir} onDone={() => { setEditando(null); reload() }} />

        const alunosDaTurma = alunos?.filter((a) => a.turmaId === l.turmaId) ?? []
        const statusDaLicao = status?.filter((s) => s.licaoId === l.id) ?? []
        const contagem = ESTADOS.map((e) => ({ ...e, count: statusDaLicao.filter((s) => s.estado === e.value).length }))
        const turmaNome = turmas?.find((t) => t.id === l.turmaId)?.nome
        const vencida = licaoVencidaPendente(l, statusDaLicao)

        return (
          <Card key={l.id} accent="licoes">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => setConferindo(conferindo === l.id ? null : l.id)} className="flex-1 text-left">
                <div className="flex items-center gap-1.5">
                  <div className="text-[13px] font-bold">{l.titulo}</div>
                  {turmaNome && <Pill tone="blue">{turmaNome}</Pill>}
                  {vencida && <Pill tone="red" dot>Prazo vencido</Pill>}
                </div>
                <div className="text-[12px] text-muted">{l.descricao}</div>
                <div className="mt-1 text-[11px] text-faint">Entrega {formatDateBR(l.entrega)} · por {l.autor}{l.anexoNome ? ` · anexo: ${l.anexoNome}` : ''}</div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {contagem.filter((c) => c.count > 0).map((c) => <Pill key={c.value} tone={c.tone}>{c.count}</Pill>)}
                </div>
              </button>
              {podeEditar && (
                <button onClick={() => setEditando(l.id)} className="flex-shrink-0 text-[12px] font-bold text-blue">
                  Editar
                </button>
              )}
            </div>

            {conferindo === l.id && (
              <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
                {alunosDaTurma.map((a) => {
                  const st = statusDaLicao.find((s) => s.alunoId === a.id)
                  return (
                    <div key={a.id} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2.5">
                        <Avatar label={a.iniciais} tone="green" />
                        <span className="flex-1 text-[12.5px] font-semibold">{a.nome}</span>
                        {st?.entregaAnexoDataUrl && (
                          <a href={st.entregaAnexoDataUrl} download={st.entregaAnexoNome ?? 'anexo.pdf'} className="text-[11px] font-bold text-blue underline">
                            Ver anexo
                          </a>
                        )}
                        <select
                          value={st?.estado ?? 'pendente'}
                          onChange={async (e) => {
                            if (!st) return
                            await api.patch(`/licao-status/${st.id}`, { estado: e.target.value, ...(autorConferir ? { autor: autorConferir } : {}) })
                            reloadStatus()
                          }}
                          className="rounded-lg border border-line bg-paper px-2 py-1.5 text-[11.5px] font-semibold"
                        >
                          {ESTADOS.map((op) => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                      </div>
                      {st?.observacaoIntegral && (
                        <p className="pl-9 text-[11px] text-muted">{st.observacaoIntegral} · {timeAgo(st.observacaoIntegralEm as string)}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}

function EditorLicao({ licao, autor, onDone }: { licao: Licao; autor?: string; onDone: () => void }) {
  const [titulo, setTitulo] = useState(licao.titulo)
  const [descricao, setDescricao] = useState(licao.descricao)
  const [entrega, setEntrega] = useState(licao.entrega)
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.patch(`/licoes/${licao.id}`, { titulo, descricao, entrega, ...(autor ? { autor } : {}) })
      onDone()
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-2.5">
        <input autoComplete="off" className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea autoComplete="off" className={inputCls} rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <input autoComplete="off" type="date" className={inputCls} value={entrega} onChange={(e) => setEntrega(e.target.value)} />
        <div className="flex gap-2">
          <Button disabled={salvando} onClick={salvar}>Salvar alteração</Button>
          <Button variant="ghost" onClick={onDone}>Cancelar</Button>
        </div>
        <p className="text-[11px] text-faint">A edição fica registrada no histórico com seu nome.</p>
      </div>
    </Card>
  )
}
