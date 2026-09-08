import { usePolling } from '../../usePolling'
import { api } from '../../api'
import { Card, SectionLabel } from '../../components/ui'

type CodigoPendente = { telefone: string; nome: string; codigo: string; expiraEmSegundos: number }

// PROVISÓRIO — só existe enquanto o envio de WhatsApp de verdade não está
// ativo (ver enviarCodigoWhatsApp no servidor). Remover esse componente e a
// rota GET /api/codigos-login-pendentes assim que a Zenvia estiver integrada.
export function CodigosPendentes() {
  const { data: codigos } = usePolling<CodigoPendente[]>(async () => api.get('/codigos-login-pendentes'), 4000, [])

  if (!codigos?.length) return null

  return (
    <Card className="border-amber bg-amber-light">
      <SectionLabel>Códigos de acesso pendentes (provisório, enquanto o WhatsApp não está ativo)</SectionLabel>
      <div className="mt-2 flex flex-col gap-2">
        {codigos.map((c) => (
          <div key={c.telefone} className="flex items-center justify-between rounded-lg bg-paper-raised px-3 py-2">
            <div>
              <div className="text-[13px] font-bold">{c.nome}</div>
              <div className="text-[11.5px] text-muted">{c.telefone}</div>
            </div>
            <div className="text-right">
              <div className="font-mono text-[16px] font-bold tracking-widest">{c.codigo}</div>
              <div className="text-[11px] text-faint">expira em {c.expiraEmSegundos}s</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
