import { useState } from 'react'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aviso, FotoRotina, Turma } from '../../types'
import { Card, EmptyState, SectionLabel, timeAgo } from '../../components/ui'
import { PhotoCarousel } from '../../components/PhotoCarousel'
import { inputCls } from '../shared/formHelpers'

export default function Feeds() {
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const [turmaId, setTurmaId] = useState<string | null>(null)
  const turmaAtiva = turmaId ?? turmas?.[0]?.id ?? null

  const { data: avisos } = usePolling<Aviso[]>(
    async () => (turmaAtiva ? api.get(`/avisos${qs({ turmaId: turmaAtiva })}`) : []),
    6000,
    [turmaAtiva],
  )
  const { data: fotos, reload: reloadFotos } = usePolling<FotoRotina[]>(
    async () => (turmaAtiva ? api.get(`/fotos${qs({ turmaId: turmaAtiva })}`) : []),
    8000,
    [turmaAtiva],
  )

  async function apagarFotos() {
    if (!fotos?.length) return
    if (!confirm('Apagar essa publicação de fotos do feed dos pais? Essa ação não pode ser desfeita.')) return
    await api.delete(`/fotos/${fotos[0].publicacaoId}`)
    reloadFotos()
  }

  if (!turmas?.length || !turmaAtiva) return null

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Turma</span>
        <select className={inputCls} value={turmaAtiva} onChange={(e) => setTurmaId(e.target.value)}>
          {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </label>

      {!!fotos?.length && (
        <div>
          <SectionLabel>Fotos</SectionLabel>
          <div className="mt-2">
            <PhotoCarousel fotos={fotos} onDelete={apagarFotos} />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <SectionLabel>Avisos</SectionLabel>
        {!avisos?.length && <EmptyState>Nenhum aviso publicado ainda nessa turma.</EmptyState>}
        {avisos?.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-bold">{a.autor}</span>
              <span className="text-[11px] text-faint">{timeAgo(a.criadoEm)}</span>
            </div>
            <p className="mt-1 text-[13px] text-ink">{a.texto}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
