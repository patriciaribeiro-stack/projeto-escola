import { useEffect, useState } from 'react'
import { ativarPush, statusPermissaoPush, suportaPush } from '../push'
import { Button, Card } from './ui'

export function AtivarPush() {
  const [status, setStatus] = useState<NotificationPermission | 'unsupported'>('unsupported')
  const [ativando, setAtivando] = useState(false)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (!suportaPush()) {
      setStatus('unsupported')
      return
    }
    const s = statusPermissaoPush()
    setStatus(s)
    if (s === 'granted') ativarPush()
  }, [])

  if (status === 'unsupported' || status === 'granted') return null

  async function ativar() {
    setAtivando(true)
    setErro(false)
    try {
      const resultado = await ativarPush()
      if (resultado === 'ok') setStatus('granted')
      else setErro(true)
    } finally {
      setAtivando(false)
    }
  }

  if (status === 'denied') {
    return (
      <Card className="bg-paper-sunken">
        <p className="text-[12px] text-muted">
          As notificações estão bloqueadas nesse navegador. Pra receber avisos importantes, ative nas configurações de notificação do navegador/celular.
        </p>
      </Card>
    )
  }

  return (
    <Card>
      <p className="text-[12.5px] font-semibold">Ative as notificações pra não perder avisos importantes.</p>
      {erro && <p className="mt-1 text-[11.5px] text-red">Não foi possível ativar agora. Tente de novo.</p>}
      <div className="mt-2">
        <Button className="w-auto px-4 py-2 text-[12.5px]" disabled={ativando} onClick={ativar}>
          {ativando ? 'Ativando...' : 'Ativar notificações'}
        </Button>
      </div>
    </Card>
  )
}
