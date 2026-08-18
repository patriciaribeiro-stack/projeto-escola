import { useState } from 'react'
import { useSession } from '../../session'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { AchadoPerdido } from '../../types'
import { Card, EmptyState, Pill, SectionLabel, Button, timeAgo } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import { FileAttach, type Anexo } from '../../components/FileAttach'

export default function AchadosTab() {
  const { aluno } = useSession()
  const { data: achados, reload } = usePolling<AchadoPerdido[]>(async () => api.get('/achados'), 8000, [])
  const [aberto, setAberto] = useState(false)
  const [descricao, setDescricao] = useState('')
  const [foto, setFoto] = useState<Anexo | null>(null)
  const [enviando, setEnviando] = useState(false)

  const meus = achados?.filter((a) => a.alunoId === aluno?.id) ?? []

  async function reportar() {
    if (!aluno) return
    setEnviando(true)
    try {
      await api.post('/achados', {
        alunoId: aluno.id,
        descricao,
        fotoNome: foto?.nome ?? null,
        fotoTipo: foto?.tipo ?? null,
        fotoDataUrl: foto?.dataUrl ?? null,
      })
      setDescricao('')
      setFoto(null)
      setAberto(false)
      reload()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-center justify-between">
          <SectionLabel>Avisar sobre item perdido</SectionLabel>
          <button onClick={() => setAberto((v) => !v)} className="text-[12px] font-bold text-blue">
            {aberto ? 'Cancelar' : '+ Novo item'}
          </button>
        </div>
        {aberto && (
          <div className="mt-2.5 flex flex-col gap-2.5">
            <input autoComplete="off"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Casaco azul-marinho com capuz"
              className={inputCls}
            />
            <FileAttach value={foto} onChange={setFoto} accept="image/*" label="Adicionar foto do item" />
            <Button disabled={!descricao || enviando} onClick={reportar}>
              {enviando ? 'Enviando...' : 'Avisar a escola'}
            </Button>
          </div>
        )}
      </Card>

      <div className="flex flex-col gap-2">
        <SectionLabel>Seus itens avisados</SectionLabel>
        {!meus.length && <EmptyState>Nenhum item avisado ainda.</EmptyState>}
        {meus.map((a) => (
          <Card key={a.id} className="flex items-center gap-3">
            {a.fotoDataUrl ? (
              <img src={a.fotoDataUrl} alt="" className="h-10 w-10 flex-shrink-0 rounded-lg object-cover" />
            ) : (
              <div className="h-10 w-10 flex-shrink-0 rounded-lg bg-paper-sunken" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold">{a.descricao}</div>
              <div className="text-[11px] text-faint">{timeAgo(a.criadoEm)}</div>
            </div>
            <Pill tone={a.estado === 'encontrado' ? 'green' : 'red'}>{a.estado === 'encontrado' ? 'Encontrado' : 'Procurando'}</Pill>
          </Card>
        ))}
      </div>
    </div>
  )
}
