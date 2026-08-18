import { useMemo } from 'react'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Aluno, CantinaItem, CantinaPedido } from '../../types'
import { Card, CategoriaChip, EmptyState, Pill, SectionLabel, formatBRL, formatDateBR } from '../../components/ui'
import { IconUtensils } from '../../components/Icons'

export default function Cantina() {
  const { data: pedidos, reload } = usePolling<CantinaPedido[]>(async () => api.get('/cantina/pedidos'), 5000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const { data: catalogo } = usePolling<CantinaItem[]>(async () => api.get('/cantina/catalogo-completo'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'
  const itemNome = (id: string) => catalogo?.find((c) => c.id === id)?.nome ?? id

  const pendentes = useMemo(() => (pedidos ?? []).filter((p) => p.estado === 'aguardando_pagamento'), [pedidos])
  const pagos = useMemo(() => (pedidos ?? []).filter((p) => p.estado === 'pedido_realizado'), [pedidos])

  async function darBaixa(id: string) {
    await api.patch(`/cantina/pedidos/${id}`, { estado: 'pedido_realizado' })
    reload()
  }

  if (!pedidos?.length) return <EmptyState>Nenhum pedido de cantina ainda.</EmptyState>

  return (
    <div className="flex flex-col gap-4">
      <CategoriaChip categoria="cantina" icon={IconUtensils}>Cantina</CategoriaChip>
      <Card>
        <p className="text-[12.5px] text-muted">
          Quando o comprovante de pagamento chegar pelo WhatsApp da escola, marque o pedido correspondente como pago aqui.
        </p>
      </Card>

      {!!pendentes.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Aguardando pagamento ({pendentes.length})</SectionLabel>
          {pendentes.map((p) => (
            <Card key={p.id} accent="cantina">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{nome(p.alunoId)}</span>
                <Pill tone="red">Aguardando pagamento</Pill>
              </div>
              <p className="mt-1 text-[12px] text-muted">{p.itens.map(itemNome).join(', ')}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-faint">{formatDateBR(p.data)}</span>
                <span className="text-[13px] font-bold font-mono">R$ {formatBRL(p.total)}</span>
              </div>
              <button onClick={() => darBaixa(p.id)} className="mt-2 w-full rounded-xl bg-blue py-2.5 text-[13px] font-bold text-white">
                Marcar como pago
              </button>
            </Card>
          ))}
        </div>
      )}

      {!!pagos.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Pedidos confirmados ({pagos.length})</SectionLabel>
          {pagos.map((p) => (
            <Card key={p.id} accent="cantina">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold">{nome(p.alunoId)}</span>
                <Pill tone="green">Pedido confirmado</Pill>
              </div>
              <p className="mt-1 text-[12px] text-muted">{p.itens.map(itemNome).join(', ')}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[11px] text-faint">{formatDateBR(p.data)}</span>
                <span className="text-[13px] font-bold font-mono">R$ {formatBRL(p.total)}</span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
