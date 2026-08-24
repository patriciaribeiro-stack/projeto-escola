import { useState } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { CardapioDia } from '../../types'
import { Button, Card, EmptyState, SectionLabel, formatDateBR } from '../../components/ui'
import { inputCls } from './formHelpers'

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
