import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Atendimento } from '../../types'
import { Card, EmptyState, Pill, SectionLabel, Button, formatDateBR } from '../../components/ui'
import { SignaturePad } from '../../components/SignaturePad'

const ESTADO_LABEL: Record<Atendimento['estado'], { texto: string; tone: 'muted' | 'amber' | 'green' }> = {
  rascunho: { texto: 'Em preparação', tone: 'muted' },
  aguardando_assinatura: { texto: 'Aguardando sua assinatura', tone: 'amber' },
  assinado: { texto: 'Assinado', tone: 'green' },
}

export default function AtendimentosTab() {
  const { filhos } = useSession()
  const { data: atendimentos, reload } = usePolling<Atendimento[]>(async () => api.get('/atendimentos'), 6000, [])

  const nomeAluno = (id: string) => filhos.find((f) => f.id === id)?.nome ?? '...'
  const visiveis = (atendimentos ?? []).filter((a) => a.estado !== 'rascunho')

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12.5px] text-muted">
        Relatórios de conversas com a coordenação sobre seu filho(a). Quando um relatório estiver pronto, ele aparece aqui pra você conferir e assinar.
      </p>
      {!visiveis.length && <EmptyState>Nenhuma reunião registrada ainda.</EmptyState>}
      {visiveis.map((a) => (
        <AtendimentoCard key={a.id} atendimento={a} alunoNome={nomeAluno(a.alunoId)} onReload={reload} />
      ))}
    </div>
  )
}

function AtendimentoCard({ atendimento, alunoNome, onReload }: { atendimento: Atendimento; alunoNome: string; onReload: () => void }) {
  const [assinando, setAssinando] = useState(false)
  const [assinatura, setAssinatura] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const estadoInfo = ESTADO_LABEL[atendimento.estado]

  async function confirmarAssinatura() {
    if (!assinatura) return
    setEnviando(true)
    try {
      await api.patch(`/atendimentos/${atendimento.id}/assinar`, { assinaturaDataUrl: assinatura })
      onReload()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[13px] font-bold">{alunoNome}</div>
          <div className="text-[11.5px] text-faint">{formatDateBR(atendimento.data)} · com {atendimento.coordenadoraNome}</div>
        </div>
        <Pill tone={estadoInfo.tone}>{estadoInfo.texto}</Pill>
      </div>

      <div className="mt-2.5 border-t border-line pt-2.5">
        <SectionLabel>Resumo</SectionLabel>
        <p className="mt-1 whitespace-pre-line text-[13px]">{atendimento.resumo}</p>
      </div>

      {atendimento.estado === 'assinado' && atendimento.assinaturaDataUrl && (
        <div className="mt-2.5">
          <SectionLabel>Sua assinatura</SectionLabel>
          <img src={atendimento.assinaturaDataUrl} alt="Assinatura" className="mt-1 h-14" />
        </div>
      )}

      {atendimento.estado === 'aguardando_assinatura' && (
        assinando ? (
          <div className="mt-3 flex flex-col gap-2.5">
            <SectionLabel>Assine para confirmar que leu o relatório</SectionLabel>
            <SignaturePad onChange={setAssinatura} />
            <Button disabled={!assinatura || enviando} onClick={confirmarAssinatura}>
              {enviando ? 'Enviando...' : 'Confirmar assinatura'}
            </Button>
          </div>
        ) : (
          <Button className="mt-3" onClick={() => setAssinando(true)}>Assinar relatório</Button>
        )
      )}
    </Card>
  )
}
