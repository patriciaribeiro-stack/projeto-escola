import { useMemo, useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { CantinaItem, CantinaPedido } from '../../types'
import { Chip, Button, Pill, formatBRL } from '../../components/ui'
import { IconBell } from '../../components/Icons'

const TIPO_LABEL: Record<CantinaItem['tipo'], string> = { doce: 'Doce · todos os dias', salgado: 'Salgado · hoje', suco: 'Suco · hoje' }
const TIPO_STYLE: Record<CantinaItem['tipo'], { bg: string; text: string }> = {
  doce: { bg: '#F5E1E8', text: '#A03F6E' },
  salgado: { bg: '#F5E7CE', text: '#A9701D' },
  suco: { bg: '#DCEEEA', text: '#1F7A68' },
}
const NUMERO_SECRETARIA = '5511940285471'

export default function CantinaTab() {
  const { aluno } = useSession()
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: catalogo } = usePolling<CantinaItem[]>(async () => api.get(`/cantina/catalogo${qs({ data: hoje })}`), 30000, [])
  const { data: pedidos, reload } = usePolling<CantinaPedido[]>(
    async () => (aluno ? api.get(`/cantina/pedidos${qs({ alunoId: aluno.id, data: hoje })}`) : []),
    5000,
    [aluno?.id],
  )
  const pedidoHoje = pedidos?.[0]

  const [selecionados, setSelecionados] = useState<string[]>([])
  const [enviando, setEnviando] = useState(false)

  const grupos = useMemo(() => {
    const g: Record<string, CantinaItem[]> = { doce: [], salgado: [], suco: [] }
    catalogo?.forEach((c) => g[c.tipo].push(c))
    return g
  }, [catalogo])

  const total = useMemo(
    () => (catalogo ?? []).filter((c) => selecionados.includes(c.id)).reduce((s, c) => s + c.valor, 0),
    [catalogo, selecionados],
  )

  function toggle(id: string) {
    setSelecionados((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  async function confirmar() {
    if (!aluno || !selecionados.length) return
    setEnviando(true)
    try {
      const { whatsappTexto } = await api.post<{ whatsappTexto: string }>('/cantina/pedidos', {
        alunoId: aluno.id,
        data: hoje,
        itens: selecionados,
      })
      window.open(`https://wa.me/${NUMERO_SECRETARIA}?text=${encodeURIComponent(whatsappTexto)}`, '_blank')
      setSelecionados([])
      reload()
    } finally {
      setEnviando(false)
    }
  }

  if (pedidoHoje) {
    const itensCatalogo = (catalogo ?? []).filter((c) => pedidoHoje.itens.includes(c.id))
    return (
      <div className="rounded-2xl border border-line bg-paper-raised p-4">
        <div className="flex items-center justify-between">
          <div className="text-[14px] font-bold">Pedido de hoje</div>
          {pedidoHoje.estado === 'aguardando_pagamento' ? (
            <Pill tone="red">Aguardando pagamento</Pill>
          ) : (
            <Pill tone="green">Pedido confirmado</Pill>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-1.5">
          {itensCatalogo.map((c) => (
            <div key={c.id} className="flex items-center justify-between text-[13px]">
              <span>{c.nome}</span>
              <span className="text-muted font-mono">R$ {formatBRL(c.valor)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-[13px] font-bold">Total</span>
          <span className="text-[13px] font-bold font-mono">R$ {formatBRL(pedidoHoje.total)}</span>
        </div>
        {pedidoHoje.estado === 'aguardando_pagamento' && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-red-light px-3 py-2.5 text-[12.5px] font-semibold text-red">
            <IconBell className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>Aguardando o comprovante de pagamento. Pague via Pix e envie o comprovante pra secretaria no WhatsApp — o status muda pra "pedido realizado" assim que ela confirmar.</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {(['doce', 'salgado', 'suco'] as const).map((tipo) =>
        grupos[tipo].length ? (
          <div key={tipo} className="rounded-2xl p-4" style={{ background: TIPO_STYLE[tipo].bg }}>
            <div className="text-[11px] font-bold uppercase tracking-wider" style={{ color: TIPO_STYLE[tipo].text }}>
              {TIPO_LABEL[tipo]}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {grupos[tipo].map((item) => (
                <Chip key={item.id} selected={selecionados.includes(item.id)} onClick={() => toggle(item.id)}>
                  {item.nome} · R$ {formatBRL(item.valor)}
                </Chip>
              ))}
            </div>
          </div>
        ) : null,
      )}

      <div className="flex items-center justify-between rounded-2xl border border-line bg-paper-raised p-4">
        <span className="text-[13px] font-bold">Total</span>
        <span className="text-[15px] font-bold">R$ {formatBRL(total)}</span>
      </div>

      <Button disabled={!selecionados.length || enviando} onClick={confirmar}>
        {enviando ? 'Enviando...' : 'Confirmar pedido'}
      </Button>
      <p className="text-center text-[11px] text-faint">
        Ao confirmar, o pedido é enviado para o WhatsApp da secretaria com os itens e o valor total já preenchidos.
      </p>
    </div>
  )
}
