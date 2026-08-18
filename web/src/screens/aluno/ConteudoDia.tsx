import { useState } from 'react'
import { useSession } from '../../session'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { ConteudoDia, Materia } from '../../types'
import { Card, EmptyState, SectionLabel, formatDateBR } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'

export default function AlunoConteudoDia() {
  const { alunoLogado } = useSession()
  const turmaId = alunoLogado?.turmaId ?? ''
  const { data: conteudos } = usePolling<ConteudoDia[]>(
    async () => (turmaId ? api.get(`/conteudos-dia${qs({ turmaId })}`) : []),
    15000,
    [turmaId],
  )
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const [data, setData] = useState('')

  if (!alunoLogado) return null

  const ordenados = [...(conteudos ?? [])]
    .filter((c) => !data || c.data === data)
    .sort((a, b) => b.data.localeCompare(a.data))
  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel>Conteúdo do dia</SectionLabel>
      <input autoComplete="off" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
      {!ordenados.length && <EmptyState>Nenhum conteúdo do dia publicado {data ? 'nessa data' : 'ainda'}.</EmptyState>}
      {ordenados.map((c) => (
        <Card key={c.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-bold">{materiaNome(c.materiaId)}</span>
            <span className="text-[11px] text-faint">{formatDateBR(c.data)}</span>
          </div>
          <p className="mt-1 text-[12.5px]">{c.descricao}</p>
        </Card>
      ))}
    </div>
  )
}
