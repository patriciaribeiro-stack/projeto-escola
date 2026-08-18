import { useState } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { CantinaItem, CantinaTipo, CardapioDia } from '../../types'
import { Button, Card, EmptyState, SectionLabel, formatBRL, formatDateBR } from '../../components/ui'
import { inputCls } from './formHelpers'

type Sub = 'cardapio' | 'itens'


function parseValorBR(raw: string) {
  const n = Number(raw.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
const TIPO_LABEL: Record<CantinaTipo, string> = { doce: 'Doce', salgado: 'Salgado', suco: 'Suco' }

export function CadastrosCantina() {
  const [sub, setSub] = useState<Sub>('cardapio')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['cardapio', 'Cardápio mensal'],
            ['itens', 'Itens da cantina'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'cardapio' && <CardapioCadastro />}
      {sub === 'itens' && <ItensCadastro />}
    </div>
  )
}

export function CardapioCadastro() {
  const { data: dias, reload } = usePolling<CardapioDia[]>(async () => api.get('/cardapio/semana'), 10000, [])
  const [data, setData] = useState(new Date().toISOString().slice(0, 10))
  const [descricao, setDescricao] = useState('')
  const [itens, setItens] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/cardapio', { data, descricao, itens: itens.split(',').map((s) => s.trim()).filter(Boolean) })
      setDescricao('')
      setItens('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esse dia do cardápio?')) return
    await api.delete(`/cardapio/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionLabel>Cadastrar / atualizar um dia</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
          <input autoComplete="off" className={inputCls} placeholder="Descrição (ex: Arroz, feijão, frango grelhado...)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <input autoComplete="off" className={inputCls} placeholder="Itens separados por vírgula (ex: Arroz, Feijão, Frango)" value={itens} onChange={(e) => setItens(e.target.value)} />
          <Button disabled={!descricao || !itens || salvando} onClick={salvar}>
            {salvando ? 'Salvando...' : 'Salvar cardápio do dia'}
          </Button>
        </div>
      </Card>

      <div>
        <SectionLabel>Dias cadastrados</SectionLabel>
        {!dias?.length && <EmptyState>Nenhum dia cadastrado ainda.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {dias?.map((d) => (
            <Card key={d.id}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{formatDateBR(d.data)}</span>
                <button onClick={() => excluir(d.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
              </div>
              <p className="mt-1 text-[12.5px] text-muted">{d.descricao}</p>
              <p className="mt-1 text-[11px] text-faint">Itens: {d.itens.join(', ')}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function ItensCadastro() {
  const { data: itens, reload } = usePolling<CantinaItem[]>(async () => api.get('/cantina/catalogo-completo'), 10000, [])
  const [tipo, setTipo] = useState<CantinaTipo>('doce')
  const [nome, setNome] = useState('')
  const [valor, setValor] = useState('')
  const [diaSemana, setDiaSemana] = useState<string>('todos')
  const [salvando, setSalvando] = useState(false)

  async function adicionar() {
    setSalvando(true)
    try {
      await api.post('/cantina/catalogo', {
        tipo, nome, valor: parseValorBR(valor),
        diaSemana: diaSemana === 'todos' ? null : Number(diaSemana),
      })
      setNome('')
      setValor('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Remover esse item do catálogo da cantina?')) return
    await api.delete(`/cantina/catalogo/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionLabel>Novo item</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <div className="flex gap-2">
            {(['doce', 'salgado', 'suco'] as CantinaTipo[]).map((t) => (
              <button key={t} onClick={() => setTipo(t)} className={`flex-1 rounded-lg py-2 text-[12px] font-bold ${tipo === t ? 'bg-blue text-white' : 'bg-paper-sunken text-muted'}`}>
                {TIPO_LABEL[t]}
              </button>
            ))}
          </div>
          <input autoComplete="off" className={inputCls} placeholder="Nome (ex: Coxinha)" value={nome} onChange={(e) => setNome(e.target.value)} />
          <input autoComplete="off" className={inputCls} placeholder="Valor em R$ (ex: 5,00)" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />
          <select className={inputCls} value={diaSemana} onChange={(e) => setDiaSemana(e.target.value)}>
            <option value="todos">Disponível todos os dias</option>
            {DIAS.map((d, i) => <option key={i} value={i}>Só {d.toLowerCase()}-feira</option>)}
          </select>
          <Button disabled={!nome || !valor || salvando} onClick={adicionar}>
            {salvando ? 'Adicionando...' : 'Adicionar item'}
          </Button>
        </div>
      </Card>

      <div>
        <SectionLabel>Itens cadastrados</SectionLabel>
        <Card className="mt-2 p-0">
          {itens?.map((it, i) => (
            <div key={it.id} className={`flex items-center gap-2.5 p-3 ${i > 0 ? 'border-t border-line' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">{it.nome}</div>
                <div className="text-[11px] text-faint">
                  {TIPO_LABEL[it.tipo]} · <span className="font-mono">R$ {formatBRL(it.valor)}</span> · {it.diaSemana === null ? 'todos os dias' : DIAS[it.diaSemana]}
                </div>
              </div>
              <button onClick={() => excluir(it.id)} className="flex-shrink-0 text-[11.5px] font-bold text-red">Remover</button>
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}
