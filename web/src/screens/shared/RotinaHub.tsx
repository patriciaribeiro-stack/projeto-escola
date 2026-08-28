import { useState, type ReactNode } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, CardapioDia, HigienizacaoTipo, Rotina, StatusRefeicao } from '../../types'
import { Avatar, Button, Card, EmptyState, SectionLabel } from '../../components/ui'
import { inputCls } from './formHelpers'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Sub = 'lancheManha' | 'almoco' | 'lancheTarde' | 'sono' | 'higiene'

const TABS: TabOption<Sub>[] = [
  { key: 'lancheManha', label: 'Lanche manhã' },
  { key: 'almoco', label: 'Almoço' },
  { key: 'lancheTarde', label: 'Lanche tarde' },
  { key: 'sono', label: 'Sono' },
  { key: 'higiene', label: 'Higiene' },
]

const STATUS_REFEICAO: { value: StatusRefeicao; label: string }[] = [
  { value: 'comeu_bem', label: 'Comeu bem' },
  { value: 'comeu_pouco', label: 'Comeu pouco' },
  { value: 'nao_quis', label: 'Não quis comer' },
  { value: 'nao_oferecido', label: 'Não foi oferecido' },
]

const HIGIENE_LABEL: Record<HigienizacaoTipo, string> = {
  troca: 'Troca de fralda',
  evacuacao: 'Evacuação',
  escape: 'Escape',
}

const selectCls = 'rounded-lg border border-line bg-paper px-2.5 py-2 text-[12.5px] font-semibold'
export const hoje = () => new Date().toISOString().slice(0, 10)
const horaAgora = () => new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

export function RotinaHub({ turmaId, alunos }: { turmaId: string; alunos: Aluno[] | null }) {
  const [sub, setSub] = useState<Sub>('lancheManha')
  const [data, setData] = useState(hoje())

  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={TABS} value={sub} onChange={setSub} />

      <div className="flex items-center gap-2">
        <label className="text-[12px] font-bold text-muted">Dia</label>
        <input autoComplete="off" type="date" value={data} onChange={(e) => setData(e.target.value)} className={selectCls} />
      </div>

      {sub === 'lancheManha' && <RefeicaoForm turmaId={turmaId} alunos={alunos} campo="lancheManha" titulo="Lanche da manhã" data={data} />}
      {sub === 'almoco' && <AlmocoForm turmaId={turmaId} alunos={alunos} data={data} />}
      {sub === 'lancheTarde' && <RefeicaoForm turmaId={turmaId} alunos={alunos} campo="lancheTarde" titulo="Lanche da tarde" data={data} />}
      {sub === 'sono' && <SonoForm alunos={alunos} data={data} />}
      {sub === 'higiene' && <HigieneForm alunos={alunos} data={data} />}
    </div>
  )
}

export function useTurmaRotinas(alunos: Aluno[] | null, data: string) {
  const { data: rotinas, reload } = usePolling<Rotina[]>(async () => api.get(`/rotinas?data=${data}`), 5000, [data])
  const doAluno = (alunoId: string) => rotinas?.find((r) => r.alunoId === alunoId) ?? null
  return { doAluno, reload, carregado: !!alunos }
}

function RefeicaoForm({
  turmaId, alunos, campo, titulo, contexto, data,
}: { turmaId: string; alunos: Aluno[] | null; campo: 'lancheManha' | 'almoco' | 'lancheTarde'; titulo: string; contexto?: ReactNode; data: string }) {
  const { doAluno, reload } = useTurmaRotinas(alunos, data)
  const [bulkStatus, setBulkStatus] = useState<StatusRefeicao>('comeu_bem')
  const [aplicando, setAplicando] = useState(false)

  async function aplicarTodos() {
    setAplicando(true)
    try {
      await api.post('/rotinas/refeicao/bulk', { turmaId, data, campo, status: bulkStatus })
      reload()
    } finally {
      setAplicando(false)
    }
  }

  async function definirAluno(alunoId: string, status: string) {
    await api.patch('/rotinas/refeicao', { alunoId, data, campo, status })
    reload()
  }

  if (!alunos) return null

  return (
    <div className="flex flex-col gap-3">
      {contexto}
      <Card>
        <SectionLabel>Aplicar para toda a turma — {titulo.toLowerCase()}</SectionLabel>
        <div className="mt-2 flex gap-2">
          <select className={`${selectCls} flex-1`} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as StatusRefeicao)}>
            {STATUS_REFEICAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button className="w-auto px-4" disabled={aplicando} onClick={aplicarTodos}>
            {aplicando ? 'Aplicando...' : 'Aplicar a todos'}
          </Button>
        </div>
      </Card>

      <Card className="p-0">
        {alunos.map((a, i) => {
          const atual = doAluno(a.id)?.[campo]
          return (
            <div key={a.id} className={`flex items-center gap-2.5 p-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <Avatar label={a.iniciais} tone="green" />
              <span className="flex-1 truncate text-[13px] font-semibold">{a.nome}</span>
              <select
                className={selectCls}
                value={atual?.status ?? ''}
                onChange={(e) => definirAluno(a.id, e.target.value)}
              >
                <option value="" disabled>Selecionar</option>
                {STATUS_REFEICAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          )
        })}
      </Card>
    </div>
  )
}

function AlmocoForm({ turmaId, alunos, data }: { turmaId: string; alunos: Aluno[] | null; data: string }) {
  const { data: cardapio } = usePolling<CardapioDia | null>(async () => api.get(`/cardapio?data=${data}`), 60000, [data])
  const { doAluno, reload } = useTurmaRotinas(alunos, data)
  const [bulkStatus, setBulkStatus] = useState<StatusRefeicao>('comeu_bem')
  const [aplicando, setAplicando] = useState(false)

  async function aplicarTodos() {
    setAplicando(true)
    try {
      await api.post('/rotinas/refeicao/bulk', { turmaId, data, campo: 'almoco', status: bulkStatus })
      reload()
    } finally {
      setAplicando(false)
    }
  }

  async function definirStatus(alunoId: string, status: string) {
    const atual = doAluno(alunoId)?.almoco
    await api.patch('/rotinas/refeicao', { alunoId, data, campo: 'almoco', status, itensAceitos: atual?.itensAceitos ?? [] })
    reload()
  }

  async function alternarItem(alunoId: string, item: string) {
    const atual = doAluno(alunoId)?.almoco
    const itensAtuais = atual?.itensAceitos ?? []
    const novosItens = itensAtuais.includes(item) ? itensAtuais.filter((i) => i !== item) : [...itensAtuais, item]
    await api.patch('/rotinas/refeicao', {
      alunoId, data, campo: 'almoco',
      status: atual?.status ?? 'comeu_bem',
      itensAceitos: novosItens,
    })
    reload()
  }

  if (!alunos) return null
  const itens = cardapio?.itens ?? []

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionLabel>Cardápio do dia</SectionLabel>
        <p className="mt-1 text-[13px]">{cardapio?.descricao ?? 'Cardápio ainda não publicado.'}</p>
      </Card>

      <Card>
        <SectionLabel>Aplicar avaliação para toda a turma</SectionLabel>
        <div className="mt-2 flex gap-2">
          <select className={`${selectCls} flex-1`} value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value as StatusRefeicao)}>
            {STATUS_REFEICAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Button className="w-auto px-4" disabled={aplicando} onClick={aplicarTodos}>
            {aplicando ? 'Aplicando...' : 'Aplicar a todos'}
          </Button>
        </div>
      </Card>

      <div className="flex flex-col gap-2">
        {alunos.map((a) => (
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
  )
}

export function AlmocoAlunoLinha({
  aluno, registro, itensCardapio, onStatus, onToggleItem,
}: {
  aluno: Aluno
  registro: { status: string; itensAceitos: string[] | null } | null
  itensCardapio: string[]
  onStatus: (status: string) => void
  onToggleItem: (item: string) => void
}) {
  return (
    <Card>
      <div className="flex items-center gap-2.5">
        <Avatar label={aluno.iniciais} tone="green" />
        <span className="flex-1 truncate text-[13px] font-semibold">{aluno.nome}</span>
        <select
          className={selectCls}
          value={registro?.status ?? ''}
          onChange={(e) => onStatus(e.target.value)}
        >
          <option value="" disabled>Selecionar</option>
          {STATUS_REFEICAO.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
      {!!itensCardapio.length && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {itensCardapio.map((item) => {
            const marcado = registro?.itensAceitos?.includes(item) ?? false
            return (
              <label
                key={item}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-2.5 py-1.5 text-[11.5px] font-semibold ${
                  marcado ? 'border-green bg-green-light text-green-dark' : 'border-line text-muted'
                }`}
              >
                <input autoComplete="off" type="checkbox" checked={marcado} onChange={() => onToggleItem(item)} className="hidden" />
                {item}
              </label>
            )
          })}
        </div>
      )}
    </Card>
  )
}

function SonoForm({ alunos, data }: { alunos: Aluno[] | null; data: string }) {
  const { doAluno, reload } = useTurmaRotinas(alunos, data)

  async function registrarDormiu(alunoId: string) {
    await api.patch('/rotinas/sono/dormiu', { alunoId, data, horario: horaAgora() })
    reload()
  }
  async function registrarAcordou(alunoId: string) {
    await api.patch('/rotinas/sono/acordou', { alunoId, data, horario: horaAgora() })
    reload()
  }

  if (!alunos) return null

  return (
    <Card className="p-0">
      {alunos.map((a, i) => {
        const sono = doAluno(a.id)?.sono
        return (
          <div key={a.id} className={`flex items-center gap-2.5 p-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
            <Avatar label={a.iniciais} tone="green" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{a.nome}</div>
              <div className="text-[11.5px] text-muted">
                {!sono?.dormiuAs && 'Ainda não dormiu'}
                {sono?.dormiuAs && !sono.acordouAs && `Dormiu às ${sono.dormiuAs}`}
                {sono?.dormiuAs && sono.acordouAs && `Dormiu às ${sono.dormiuAs} · Acordou às ${sono.acordouAs}`}
              </div>
            </div>
            {!sono?.dormiuAs && (
              <button onClick={() => registrarDormiu(a.id)} className="flex-shrink-0 rounded-lg bg-blue px-3 py-2 text-[11.5px] font-bold text-white">
                Dormiu agora
              </button>
            )}
            {sono?.dormiuAs && !sono.acordouAs && (
              <button onClick={() => registrarAcordou(a.id)} className="flex-shrink-0 rounded-lg bg-green px-3 py-2 text-[11.5px] font-bold text-white">
                Acordou agora
              </button>
            )}
          </div>
        )
      })}
    </Card>
  )
}

function HigieneForm({ alunos, data }: { alunos: Aluno[] | null; data: string }) {
  const { doAluno, reload } = useTurmaRotinas(alunos, data)
  const [alunoId, setAlunoId] = useState(alunos?.[0]?.id ?? '')
  const [observacao, setObservacao] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function registrar(tipo: HigienizacaoTipo) {
    if (!alunoId) return
    setEnviando(true)
    try {
      await api.post('/rotinas/higienizacao', { alunoId, data, tipo, observacao: observacao || undefined })
      setObservacao('')
      reload()
    } finally {
      setEnviando(false)
    }
  }

  if (!alunos) return null
  const registros = doAluno(alunoId)?.higienizacoes ?? []

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionLabel>Aluno</SectionLabel>
        <select className={`${selectCls} mt-2 w-full`} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <input autoComplete="off"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observação (opcional)"
          className={`mt-2.5 w-full ${inputCls}`}
        />
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          <button disabled={enviando} onClick={() => registrar('troca')} className="rounded-lg bg-blue-light py-2.5 text-[12px] font-bold text-blue">Troca</button>
          <button disabled={enviando} onClick={() => registrar('evacuacao')} className="rounded-lg bg-amber-light py-2.5 text-[12px] font-bold text-amber">Evacuação</button>
          <button disabled={enviando} onClick={() => registrar('escape')} className="rounded-lg bg-red-light py-2.5 text-[12px] font-bold text-red">Escape</button>
        </div>
      </Card>

      <SectionLabel>Registros do dia — {alunos.find((a) => a.id === alunoId)?.nome}</SectionLabel>
      {!registros.length ? (
        <EmptyState>Nenhum registro ainda nesse dia.</EmptyState>
      ) : (
        <Card className="p-0">
          {[...registros].reverse().map((r, i) => (
            <div key={r.id} className={`flex items-center justify-between p-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <span className="text-[12.5px] font-semibold">{HIGIENE_LABEL[r.tipo]}</span>
              <span className="text-[11.5px] text-faint">{new Date(r.horario).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
