import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Evento, EventoResposta } from '../../types'
import { Card, EmptyState, Pill, SectionLabel, Button, formatDateBR, formatBRL } from '../../components/ui'
import { SignaturePad } from '../../components/SignaturePad'

function diasAte(dataStr: string) {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const dataEvento = new Date(dataStr + 'T00:00:00')
  return Math.round((dataEvento.getTime() - hoje.getTime()) / 86_400_000)
}

export default function EventosTab() {
  const { aluno } = useSession()
  const { data: eventos } = usePolling<Evento[]>(
    async () => (aluno ? api.get(`/eventos${qs({ turmaId: aluno.turmaId })}`) : []),
    6000,
    [aluno?.turmaId],
  )
  const { data: respostas, reload } = usePolling<EventoResposta[]>(
    async () => (aluno ? api.get(`/evento-respostas${qs({ alunoId: aluno.id })}`) : []),
    5000,
    [aluno?.id],
  )
  const [aberto, setAberto] = useState<string | null>(null)

  if (!eventos?.length) return <EmptyState>Nenhum evento no momento.</EmptyState>

  const lembretes = eventos
    .filter((ev) => diasAte(ev.data) === 1)
    .map((ev) => ({ ev, resp: respostas?.find((r) => r.eventoId === ev.id) }))

  return (
    <div className="flex flex-col gap-3">
      {lembretes.map(({ ev, resp }) => {
        const confirmado = resp?.presenca === 'confirmado'
        return (
          <div
            key={`lembrete-${ev.id}`}
            className={`rounded-xl px-3.5 py-3 text-[13px] font-semibold ${confirmado ? 'bg-green-light text-green-dark' : 'bg-red-light text-red'}`}
          >
            {confirmado
              ? `Amanhã é o dia de "${ev.titulo}" — não esqueça de marcar na sua agenda!`
              : `Amanhã é o dia de "${ev.titulo}" e você ainda não confirmou presença — marque na sua agenda e confirme agora!`}
          </div>
        )
      })}

      {eventos.map((ev) => {
        const resp = respostas?.find((r) => r.eventoId === ev.id)
        if (!resp) return null
        return (
          <EventoCard
            key={ev.id}
            evento={ev}
            resposta={resp}
            expanded={aberto === ev.id}
            onToggle={() => setAberto(aberto === ev.id ? null : ev.id)}
            onChanged={reload}
          />
        )
      })}
    </div>
  )
}

function EventoCard({
  evento,
  resposta,
  expanded,
  onToggle,
  onChanged,
}: {
  evento: Evento
  resposta: EventoResposta
  expanded: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [assinatura, setAssinatura] = useState<string | null>(resposta.termoAssinaturaDataUrl)

  async function confirmarTermo() {
    setBusy(true)
    try {
      await api.patch(`/evento-respostas/${resposta.id}/termo`, { termoAssinaturaDataUrl: assinatura })
      onChanged()
    } finally {
      setBusy(false)
    }
  }

  async function responder(presenca: 'confirmado' | 'recusado') {
    setBusy(true)
    setErro(null)
    try {
      await api.patch(`/evento-respostas/${resposta.id}/presenca`, { presenca })
      onChanged()
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function marcarPago() {
    const numero = '5511940285471'
    const texto = encodeURIComponent(
      `Comprovante de pagamento — ${evento.titulo}\nValor: R$ ${formatBRL(evento.valor)}\n(envio o comprovante em seguida)`,
    )
    window.open(`https://wa.me/${numero}?text=${texto}`, '_blank')
  }

  const precisaTermo = evento.tipo === 'pago' && evento.exigeTermo && !resposta.termoAssinado

  return (
    <Card>
      <button onClick={onToggle} className="flex w-full items-start justify-between text-left">
        <span>
          <div className="text-[14px] font-bold">{evento.titulo}</div>
          <div className="text-[11.5px] text-muted">{formatDateBR(evento.data)} <span className="font-mono">{evento.tipo === 'pago' ? `· R$ ${formatBRL(evento.valor)}` : '· gratuito'}</span></div>
        </span>
        {resposta.presenca === 'pendente' && <Pill tone="red">Pendente</Pill>}
        {resposta.presenca === 'confirmado' && <Pill tone="green">Confirmado</Pill>}
        {resposta.presenca === 'recusado' && <Pill tone="muted">Recusado</Pill>}
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3">
          <p className="text-[13px] text-muted">{evento.descricao}</p>

          {precisaTermo && (
            <div>
              <SectionLabel>Termo de autorização</SectionLabel>
              <p className="mt-1.5 rounded-lg bg-paper-sunken p-3 text-[12.5px] leading-relaxed text-ink">{evento.termoTexto}</p>
              <p className="mt-2 text-[12px] font-semibold">Assine para autorizar</p>
              <div className="mt-1.5">
                <SignaturePad onChange={setAssinatura} />
              </div>
              <Button className="mt-2" disabled={!assinatura || busy} onClick={confirmarTermo}>
                Confirmar assinatura
              </Button>
            </div>
          )}

          {!precisaTermo && resposta.presenca === 'pendente' && (
            <div className="flex gap-2">
              <Button disabled={busy} onClick={() => responder('confirmado')}>Confirmar presença</Button>
              <Button variant="secondary" disabled={busy} onClick={() => responder('recusado')}>Recusar</Button>
            </div>
          )}

          {resposta.presenca === 'confirmado' && evento.tipo === 'pago' && (
            <div className="rounded-lg bg-paper-sunken p-3">
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-semibold">Pagamento</span>
                {resposta.pagamento === 'realizado' ? <Pill tone="green">Realizado</Pill> : <Pill tone="red">Pendente</Pill>}
              </div>
              {resposta.pagamento !== 'realizado' && (
                <Button variant="secondary" className="mt-2" onClick={marcarPago}>
                  Pagar via Pix e enviar comprovante no WhatsApp
                </Button>
              )}
            </div>
          )}

          {resposta.presenca === 'confirmado' && <Pill tone="green">Presença confirmada</Pill>}
          {resposta.presenca === 'recusado' && <Pill tone="muted">Você recusou este evento</Pill>}
          {erro && <p className="text-[12px] font-semibold text-red">{erro}</p>}
        </div>
      )}
    </Card>
  )
}
