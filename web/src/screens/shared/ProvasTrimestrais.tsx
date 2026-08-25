import type { ReactNode } from 'react'
import type { ProvaTrimestral, Turma } from '../../types'
import { Card, Pill, formatDateBR } from '../../components/ui'
import { IconAlert } from '../../components/Icons'

export const ACCEPT_PROVA = 'application/pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Converte a data URL pra Blob e abre por objectURL — um link direto com href="data:..."
// e target="_blank" é bloqueado ou vira download em vários navegadores mobile (Chrome/Safari
// no Android/iOS não navegam de forma confiável pra uma data: URL em nova aba); blob: URL
// funciona igual em qualquer navegador, desktop ou celular.
function abrirArquivoEmNovaAba(dataUrl: string, tipo: string) {
  const [, base64] = dataUrl.split(',')
  const binario = atob(base64 ?? '')
  const bytes = new Uint8Array(binario.length)
  for (let i = 0; i < binario.length; i++) bytes[i] = binario.charCodeAt(i)
  const blob = new Blob([bytes], { type: tipo })
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function elegivelProvaTrimestral(turma?: Turma): boolean {
  if (!turma) return false
  return turma.segmento !== 'infantil'
}

export const ESTADO_INFO: Record<ProvaTrimestral['estado'], { label: string; tone: 'muted' | 'amber' | 'green' | 'red' | 'blue' }> = {
  aguardando_envio: { label: 'Aguardando envio', tone: 'muted' },
  aguardando_aprovacao: { label: 'Aguardando aprovação', tone: 'amber' },
  alteracao_necessaria: { label: 'Alteração necessária', tone: 'red' },
  liberada_impressao: { label: 'Liberada para impressão', tone: 'blue' },
  impressa: { label: 'Impressa', tone: 'green' },
}

export function ProvaTrimestralCard({ prova, turmaNome, materiaNome, children }: {
  prova: ProvaTrimestral
  turmaNome: string
  materiaNome: string
  children?: ReactNode
}) {
  const info = ESTADO_INFO[prova.estado]
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-bold">{turmaNome}</span>
          <Pill tone="blue">{materiaNome}</Pill>
        </div>
        <Pill tone={info.tone}>{info.label}</Pill>
      </div>
      <p className="mt-1 text-[11px] text-faint">
        Prova em {formatDateBR(prova.data)} · {prova.trimestre}º trimestre {prova.anoLetivo}
        {prova.professorNome && ` · anexada por ${prova.professorNome}`}
      </p>

      {prova.estado === 'alteracao_necessaria' && prova.comentarioCoordenacao && (
        <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-light px-2.5 py-2.5 text-[13px] font-semibold text-red">
          <IconAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span><b>Recado da coordenação:</b> {prova.comentarioCoordenacao}</span>
        </div>
      )}

      {prova.arquivoDataUrl && (
        prova.arquivoTipo === 'application/pdf' ? (
          <button
            type="button"
            onClick={() => abrirArquivoEmNovaAba(prova.arquivoDataUrl!, prova.arquivoTipo!)}
            className="mt-2 inline-flex self-start text-[12px] font-bold text-blue underline"
          >
            Abrir prova em outra aba ({prova.arquivoNome})
          </button>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            <a
              href={prova.arquivoDataUrl}
              download={prova.arquivoNome ?? 'prova'}
              className="inline-flex self-start text-[12px] font-bold text-blue underline"
            >
              Baixar arquivo Word ({prova.arquivoNome})
            </a>
            <p className="text-[11px] text-faint">Arquivo Word não abre direto no navegador — baixa pra ver.</p>
          </div>
        )
      )}

      {prova.estado === 'impressa' && (
        <p className="mt-1.5 text-[11px] text-faint">
          Impressa por {prova.provaImpressaPor} · {prova.provaImpressaEm && formatDateBR(prova.provaImpressaEm)}
        </p>
      )}

      {children}
    </Card>
  )
}
