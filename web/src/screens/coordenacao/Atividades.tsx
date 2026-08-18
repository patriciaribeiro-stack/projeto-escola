import { useState } from 'react'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Atividade, Role } from '../../types'
import { Avatar, Card, EmptyState, Pill, SectionLabel, timeAgo } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'
import { papelLabel } from './papelLabel'

const PAPEL_OPCOES: { value: Role | ''; label: string }[] = [
  { value: '', label: 'Todos (equipe)' },
  { value: 'professor', label: papelLabel.professor },
  { value: 'coordenacao', label: papelLabel.coordenacao },
  { value: 'secretaria', label: papelLabel.secretaria },
  { value: 'recepcao', label: papelLabel.recepcao },
  { value: 'integral', label: papelLabel.integral },
  { value: 'substituto', label: papelLabel.substituto },
]

export default function Atividades() {
  const [papel, setPapel] = useState<Role | ''>('')
  const [busca, setBusca] = useState('')
  const [antigas, setAntigas] = useState<Atividade[]>([])
  const [carregandoMais, setCarregandoMais] = useState(false)

  const { data: recentes } = usePolling<Atividade[]>(
    async () => api.get(`/atividades${qs({ papel: papel || undefined })}`),
    8000,
    [papel],
  )

  const todas = [...(recentes ?? []), ...antigas]
  const filtradas = busca ? todas.filter((a) => a.nome.toLowerCase().includes(busca.toLowerCase())) : todas

  function mudarPapel(novoPapel: Role | '') {
    setPapel(novoPapel)
    setAntigas([])
  }

  async function carregarMais() {
    const ultima = todas[todas.length - 1]
    if (!ultima) return
    setCarregandoMais(true)
    try {
      const mais = await api.get<Atividade[]>(`/atividades${qs({ papel: papel || undefined, antes: ultima.quando })}`)
      setAntigas((prev) => [...prev, ...mais])
    } finally {
      setCarregandoMais(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionLabel>Filtrar atividades</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" className={inputCls} placeholder="Buscar por nome" value={busca} onChange={(e) => setBusca(e.target.value)} />
          <select className={inputCls} value={papel} onChange={(e) => mudarPapel(e.target.value as Role | '')}>
            {PAPEL_OPCOES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </Card>

      {!filtradas.length && <EmptyState>Nenhuma atividade registrada ainda.</EmptyState>}
      {!!filtradas.length && (
        <Card className="p-0">
          {filtradas.map((a, i) => (
            <div key={a.id} className={`flex items-center gap-3 p-3.5 ${i > 0 ? 'border-t border-line' : ''}`}>
              <Avatar label={a.nome.split(' ').slice(0, 2).map((n) => n[0]).join('')} tone={a.role === 'pai' ? 'blue' : 'green'} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-bold">{a.nome}</div>
                <div className="text-[11px] text-muted">{papelLabel[a.role]}</div>
                <div className="mt-0.5 text-[12px] text-ink">{a.resumo}</div>
              </div>
              <div className="text-right">
                <Pill tone="muted">{timeAgo(a.quando)}</Pill>
              </div>
            </div>
          ))}
        </Card>
      )}

      {!!todas.length && (
        <button
          onClick={carregarMais}
          disabled={carregandoMais}
          className="self-center text-[12px] font-bold text-blue"
        >
          {carregandoMais ? 'Carregando...' : 'Carregar mais antigas'}
        </button>
      )}
    </div>
  )
}
