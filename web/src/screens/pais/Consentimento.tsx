import { useState } from 'react'
import { useSession } from '../../session'
import { api } from '../../api'
import { Button } from '../../components/ui'

export default function Consentimento() {
  const { session, refreshPai } = useSession()
  const [aceitando, setAceitando] = useState(false)

  async function aceitar() {
    if (!session) return
    setAceitando(true)
    try {
      await api.patch(`/pais/${session.personaId}/consentimento`)
      await refreshPai()
    } finally {
      setAceitando(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-[480px] flex-col justify-center gap-4 px-6 py-10">
      <h1 className="font-display text-lg font-bold">Antes de continuar</h1>
      <p className="text-[13.5px] leading-relaxed text-muted">
        Para acompanhar a rotina do seu filho(a), o aplicativo registra e armazena informações
        do dia a dia dele(a) na escola, incluindo alimentação, sono, higiene, fotos,
        lições de casa e ocorrências de saúde. Esses dados são usados exclusivamente para a
        comunicação entre a escola e a família, conforme a Lei Geral de Proteção de Dados
        (LGPD), e não são compartilhados com terceiros.
      </p>
      <p className="text-[13.5px] leading-relaxed text-muted">
        Ao continuar, você, como responsável legal, consente com o tratamento desses dados
        pela escola para essa finalidade.
      </p>
      <Button disabled={aceitando} onClick={aceitar}>
        {aceitando ? 'Aguarde...' : 'Aceito e quero continuar'}
      </Button>
    </div>
  )
}
