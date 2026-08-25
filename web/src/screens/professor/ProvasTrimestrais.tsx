import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Materia, ProvaTrimestral, Turma } from '../../types'
import { Button, EmptyState, SectionLabel } from '../../components/ui'
import { FileAttach, type Anexo } from '../../components/FileAttach'
import { ACCEPT_PROVA, ProvaTrimestralCard } from '../shared/ProvasTrimestrais'

export default function ProvasTrimestrais() {
  const { session, professor } = useSession()
  const { data: todas, reload } = usePolling<ProvaTrimestral[]>(async () => api.get('/provas-trimestrais'), 8000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const turmaNome = (id: string) => turmas?.find((t) => t.id === id)?.nome ?? '...'
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  const vinculos = professor?.vinculos ?? []
  const minhas = (todas ?? []).filter((p) => vinculos.some((v) => v.turmaId === p.turmaId && v.materiaId === p.materiaId))

  if (!vinculos.length) {
    return <EmptyState>Você ainda não tem matéria/turma vinculada. Fale com a secretaria.</EmptyState>
  }
  if (!minhas.length) {
    return <EmptyState>Nenhuma prova trimestral agendada pra suas turmas ainda.</EmptyState>
  }

  const precisamAjuste = minhas.filter((p) => p.estado === 'alteracao_necessaria')
  const paraEnviar = minhas.filter((p) => p.estado === 'aguardando_envio')
  const emAndamento = minhas.filter((p) => p.estado === 'aguardando_aprovacao')
  const concluidas = minhas.filter((p) => p.estado === 'liberada_impressao' || p.estado === 'impressa')

  return (
    <div className="flex flex-col gap-4">
      {!!precisamAjuste.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>⚠ Precisa de ajuste da coordenação ({precisamAjuste.length})</SectionLabel>
          {precisamAjuste.map((p) => (
            <AnexarCard
              key={p.id}
              prova={p}
              turmaNome={turmaNome(p.turmaId)}
              materiaNome={materiaNome(p.materiaId)}
              professorId={session?.personaId ?? ''}
              professorNome={session?.nome ?? ''}
              onReload={reload}
            />
          ))}
        </div>
      )}
      {!!paraEnviar.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Pra anexar ({paraEnviar.length})</SectionLabel>
          {paraEnviar.map((p) => (
            <AnexarCard
              key={p.id}
              prova={p}
              turmaNome={turmaNome(p.turmaId)}
              materiaNome={materiaNome(p.materiaId)}
              professorId={session?.personaId ?? ''}
              professorNome={session?.nome ?? ''}
              onReload={reload}
            />
          ))}
        </div>
      )}
      {!!emAndamento.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Aguardando aprovação ({emAndamento.length})</SectionLabel>
          {emAndamento.map((p) => (
            <ProvaTrimestralCard key={p.id} prova={p} turmaNome={turmaNome(p.turmaId)} materiaNome={materiaNome(p.materiaId)} />
          ))}
        </div>
      )}
      {!!concluidas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Aprovadas</SectionLabel>
          {concluidas.map((p) => (
            <ProvaTrimestralCard key={p.id} prova={p} turmaNome={turmaNome(p.turmaId)} materiaNome={materiaNome(p.materiaId)} />
          ))}
        </div>
      )}
    </div>
  )
}

function AnexarCard({ prova, turmaNome, materiaNome, professorId, professorNome, onReload }: {
  prova: ProvaTrimestral
  turmaNome: string
  materiaNome: string
  professorId: string
  professorNome: string
  onReload: () => void
}) {
  const [arquivo, setArquivo] = useState<Anexo | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function enviar() {
    if (!arquivo) return
    setEnviando(true)
    try {
      await api.patch(`/provas-trimestrais/${prova.id}/anexar`, {
        arquivoNome: arquivo.nome,
        arquivoTipo: arquivo.tipo,
        arquivoDataUrl: arquivo.dataUrl,
        professorId,
        professorNome,
      })
      setArquivo(null)
      onReload()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <ProvaTrimestralCard prova={prova} turmaNome={turmaNome} materiaNome={materiaNome}>
      <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
        <FileAttach value={arquivo} onChange={setArquivo} accept={ACCEPT_PROVA} maxSizeMB={20} label="Anexar a prova (Word ou PDF)" />
        <Button disabled={!arquivo || enviando} onClick={enviar}>
          {enviando ? 'Enviando...' : 'Enviar para aprovação'}
        </Button>
      </div>
    </ProvaTrimestralCard>
  )
}
