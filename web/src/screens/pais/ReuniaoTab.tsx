import { useState } from 'react'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import { useSession } from '../../session'
import type { Coordenador, Reuniao } from '../../types'
import { Button, EmptyState, SectionLabel } from '../../components/ui'
import { FormNovaReuniao, ReuniaoCard } from '../shared/Reunioes'

export default function ReuniaoTab() {
  const { aluno, pai } = useSession()
  const [mostrarForm, setMostrarForm] = useState(false)
  const { data: coordenadoras } = usePolling<Coordenador[]>(async () => api.get('/coordenadores'), 60000, [])
  const { data: reunioes, reload } = usePolling<Reuniao[]>(
    async () => (aluno ? api.get(`/reunioes${qs({ alunoId: aluno.id })}`) : []),
    5000,
    [aluno?.id],
  )

  if (!aluno || !pai) return null

  const ativas = (reunioes ?? []).filter((r) => r.estado !== 'cancelada')
  const canceladas = (reunioes ?? []).filter((r) => r.estado === 'cancelada')

  return (
    <div className="flex flex-col gap-4">
      <Button onClick={() => setMostrarForm((v) => !v)} variant={mostrarForm ? 'ghost' : 'primary'}>
        {mostrarForm ? 'Cancelar' : 'Solicitar reunião com a coordenação'}
      </Button>

      {mostrarForm && (
        <FormNovaReuniao
          alunoId={aluno.id}
          paiId={pai.id}
          coordenadoras={coordenadoras ?? []}
          onDone={() => {
            setMostrarForm(false)
            reload()
          }}
        />
      )}

      <div className="flex flex-col gap-2">
        <SectionLabel>Suas solicitações</SectionLabel>
        {!ativas.length && <EmptyState>Nenhuma reunião solicitada ainda.</EmptyState>}
        {ativas.map((r) => (
          <ReuniaoCard key={r.id} reuniao={r} papel="pai" autor={pai.nome} onReload={reload} />
        ))}
      </div>

      {!!canceladas.length && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Canceladas</SectionLabel>
          {canceladas.map((r) => (
            <ReuniaoCard key={r.id} reuniao={r} papel="pai" autor={pai.nome} onReload={reload} />
          ))}
        </div>
      )}
    </div>
  )
}
