import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Materia, ProvaTrimestral, Turma } from '../../types'
import { Button, Card, EmptyState, SectionLabel } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import { FileAttach, type Anexo } from '../../components/FileAttach'
import { ACCEPT_PROVA, elegivelProvaTrimestral, ProvaTrimestralCard } from '../shared/ProvasTrimestrais'

function hoje() {
  return new Date().toISOString().slice(0, 10)
}

function trimestreDoMes(mes: number): 1 | 2 | 3 {
  if (mes <= 4) return 1
  if (mes <= 8) return 2
  return 3
}

type Sub = 'hoje' | 'calendario'

export default function ProvasTrimestrais() {
  const [sub, setSub] = useState<Sub>('hoje')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['hoje', 'Hoje'],
            ['calendario', 'Calendário'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg border border-line py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'hoje' && <RevisaoHoje />}
      {sub === 'calendario' && <Calendario />}
    </div>
  )
}

function RevisaoHoje() {
  const { session } = useSession()
  const { data: provas, reload } = usePolling<ProvaTrimestral[]>(
    async () => api.get(`/provas-trimestrais${qs({ data: hoje() })}`),
    8000,
    [],
  )
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const turmaNome = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? '...'
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  const pendentes = (provas ?? []).filter((p) => p.estado === 'aguardando_aprovacao')
  const outras = (provas ?? []).filter((p) => p.estado !== 'aguardando_aprovacao')

  if (!provas?.length) return <EmptyState>Nenhuma prova trimestral agendada para hoje.</EmptyState>

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <SectionLabel>Aguardando sua revisão ({pendentes.length})</SectionLabel>
        {!pendentes.length && <EmptyState>Nada pendente de revisão hoje.</EmptyState>}
        {pendentes.map((p) => (
          <RevisaoCard
            key={p.id}
            prova={p}
            turmaNome={turmaNome(p.turmaId)}
            materiaNome={materiaNome(p.materiaId)}
            avaliadoPor={session?.nome ?? ''}
            onReload={reload}
          />
        ))}
      </div>
      {!!outras.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Outras provas de hoje</SectionLabel>
          {outras.map((p) => (
            <ProvaTrimestralCard key={p.id} prova={p} turmaNome={turmaNome(p.turmaId)} materiaNome={materiaNome(p.materiaId)} />
          ))}
        </div>
      )}
    </div>
  )
}

function RevisaoCard({ prova, turmaNome, materiaNome, avaliadoPor, onReload }: {
  prova: ProvaTrimestral
  turmaNome: string
  materiaNome: string
  avaliadoPor: string
  onReload: () => void
}) {
  const [modo, setModo] = useState<'padrao' | 'alteracao' | 'substituir'>('padrao')
  const [comentario, setComentario] = useState('')
  const [arquivo, setArquivo] = useState<Anexo | null>(null)
  const [processando, setProcessando] = useState(false)

  async function aprovar() {
    setProcessando(true)
    try {
      await api.patch(`/provas-trimestrais/${prova.id}/aprovar`, { avaliadoPor })
      onReload()
    } finally {
      setProcessando(false)
    }
  }

  async function solicitarAlteracao() {
    if (!comentario.trim()) return
    setProcessando(true)
    try {
      await api.patch(`/provas-trimestrais/${prova.id}/solicitar-alteracao`, { comentario, avaliadoPor })
      setModo('padrao')
      setComentario('')
      onReload()
    } finally {
      setProcessando(false)
    }
  }

  async function substituirArquivo() {
    if (!arquivo) return
    setProcessando(true)
    try {
      // Mantém a autoria original do professor — a coordenação só está corrigindo
      // a formatação do arquivo, o registro de quem anexou continua no histórico.
      await api.patch(`/provas-trimestrais/${prova.id}/anexar`, {
        arquivoNome: arquivo.nome,
        arquivoTipo: arquivo.tipo,
        arquivoDataUrl: arquivo.dataUrl,
        professorId: prova.professorId,
        professorNome: prova.professorNome,
      })
      setModo('padrao')
      setArquivo(null)
      onReload()
    } finally {
      setProcessando(false)
    }
  }

  return (
    <ProvaTrimestralCard prova={prova} turmaNome={turmaNome} materiaNome={materiaNome}>
      {modo === 'padrao' && (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex gap-2">
            <Button className="flex-1" disabled={processando} onClick={aprovar}>
              Aprovar e liberar para impressão
            </Button>
            <Button variant="ghost" className="w-auto px-3.5" disabled={processando} onClick={() => setModo('alteracao')}>
              Solicitar alteração
            </Button>
          </div>
          <button
            type="button"
            onClick={() => setModo('substituir')}
            className="self-start text-[11.5px] font-bold text-blue"
          >
            Corrigir formatação e substituir o arquivo
          </button>
        </div>
      )}

      {modo === 'alteracao' && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <textarea
            autoComplete="off"
            className={inputCls}
            rows={2}
            placeholder="O que precisa ser ajustado?"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
          />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!comentario.trim() || processando} onClick={solicitarAlteracao}>
              {processando ? 'Enviando...' : 'Enviar para o professor'}
            </Button>
            <Button variant="ghost" className="w-auto px-3.5" onClick={() => setModo('padrao')}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {modo === 'substituir' && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <p className="text-[11.5px] text-faint">
            Baixe o arquivo atual, corrija a formatação e suba a versão corrigida aqui — ela substitui a que está no sistema.
          </p>
          <FileAttach value={arquivo} onChange={setArquivo} accept={ACCEPT_PROVA} maxSizeMB={20} label="Subir arquivo corrigido (Word ou PDF)" />
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!arquivo || processando} onClick={substituirArquivo}>
              {processando ? 'Salvando...' : 'Substituir arquivo'}
            </Button>
            <Button variant="ghost" className="w-auto px-3.5" onClick={() => { setModo('padrao'); setArquivo(null) }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </ProvaTrimestralCard>
  )
}

function Calendario() {
  const { session } = useSession()
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const [data, setData] = useState(hoje())
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(trimestreDoMes(new Date().getMonth() + 1))
  const { data: provasDoDia, reload } = usePolling<ProvaTrimestral[]>(
    async () => api.get(`/provas-trimestrais${qs({ data })}`),
    8000,
    [data],
  )

  const turmasElegiveis = (turmas ?? []).filter(elegivelProvaTrimestral)
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Data</span>
            <input autoComplete="off" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Trimestre</span>
            <select className={inputCls} value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}>1º trimestre</option>
              <option value={2}>2º trimestre</option>
              <option value={3}>3º trimestre</option>
            </select>
          </label>
        </div>
      </Card>

      {!turmasElegiveis.length && <EmptyState>Nenhuma turma elegível cadastrada (Infantil não entra).</EmptyState>}

      <div className="flex flex-col gap-2">
        {turmasElegiveis.map((t) => (
          <TurmaDoDia
            key={t.id}
            turma={t}
            data={data}
            trimestre={trimestre}
            criadoPor={session?.nome ?? ''}
            materias={materias ?? []}
            provas={(provasDoDia ?? []).filter((p) => p.turmaId === t.id)}
            materiaNome={materiaNome}
            onReload={reload}
          />
        ))}
      </div>
    </div>
  )
}

function TurmaDoDia({ turma, data, trimestre, criadoPor, materias, provas, materiaNome, onReload }: {
  turma: Turma
  data: string
  trimestre: 1 | 2 | 3
  criadoPor: string
  materias: Materia[]
  provas: ProvaTrimestral[]
  materiaNome: (id: string) => string
  onReload: () => void
}) {
  const [materiaId, setMateriaId] = useState('')
  const [adicionando, setAdicionando] = useState(false)

  const materiasDisponiveis = materias.filter((m) => !provas.some((p) => p.materiaId === m.id))

  async function adicionar() {
    if (!materiaId) return
    setAdicionando(true)
    try {
      const anoLetivo = Number(data.slice(0, 4))
      await api.post('/provas-trimestrais', { turmaId: turma.id, materiaId, data, anoLetivo, trimestre, criadoPor })
      setMateriaId('')
      onReload()
    } finally {
      setAdicionando(false)
    }
  }

  async function remover(id: string) {
    if (!confirm('Remover essa prova do calendário desse dia?')) return
    await api.delete(`/provas-trimestrais/${id}`)
    onReload()
  }

  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-bold">{turma.nome}</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {!provas.length && <span className="text-[12px] text-faint">Nenhuma prova nesse dia.</span>}
        {provas.map((p) => (
          <span key={p.id} className="inline-flex items-center gap-1.5 rounded-full bg-paper-sunken px-2.5 py-1 text-[12px] font-semibold">
            {materiaNome(p.materiaId)}
            <button type="button" onClick={() => remover(p.id)} className="text-faint hover:text-red">×</button>
          </span>
        ))}
      </div>
      {!materiasDisponiveis.length ? null : (
        <div className="mt-2.5 flex gap-2">
          <select className={`${inputCls} flex-1`} value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
            <option value="">+ adicionar matéria...</option>
            {materiasDisponiveis.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <Button className="w-auto px-3.5 py-2 text-[12.5px]" disabled={!materiaId || adicionando} onClick={adicionar}>
            Adicionar
          </Button>
        </div>
      )}
    </Card>
  )
}
