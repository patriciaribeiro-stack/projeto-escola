import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { usePolling } from '../../usePolling'
import { api, qs } from '../../api'
import type { Aluno, Aviso, FotoRotina, Materia, Relatorio, Turma } from '../../types'
import { Card, EmptyState, Pill, SectionLabel, timeAgo } from '../../components/ui'
import { LicoesLista } from '../shared/LicoesLista'
import { AtividadesAvaliativasLista, elegivelAtividadeAvaliativa } from '../shared/AtividadesAvaliativas'
import type { ProfessorContext } from './ProfessorLayout'

type Sub = 'licoes' | 'publicacoes' | 'avaliativas'

export default function Acompanhar() {
  const [sub, setSub] = useState<Sub>('licoes')
  const { turmaId } = useOutletContext<ProfessorContext>()
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: alunos } = usePolling<Aluno[]>(async () => (turmaId ? api.get(`/alunos${qs({ turmaId })}`) : []), 30000, [turmaId])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const turma = turmas?.find((t) => t.id === turmaId)
  const mostrarAvaliativas = elegivelAtividadeAvaliativa(turma)

  const abas: [Sub, string][] = [
    ['licoes', 'Lições'],
    ['publicacoes', 'Publicações'],
    ...(mostrarAvaliativas ? [['avaliativas', 'Avaliativas'] as [Sub, string]] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {abas.map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg border border-line py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'bg-green-light text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'licoes' && <LicoesLista turmaId={turmaId} />}
      {sub === 'publicacoes' && <Publicacoes turmaId={turmaId} />}
      {sub === 'avaliativas' && mostrarAvaliativas && <AtividadesAvaliativasLista turmaId={turmaId} alunos={alunos} materias={materias} />}
    </div>
  )
}

type Post = { id: string; tipo: 'aviso' | 'foto' | 'relatorio'; titulo: string; sub: string; criadoEm: string; fotos?: string[] }

function Publicacoes({ turmaId }: { turmaId: string }) {
  const { data: avisos } = usePolling<Aviso[]>(async () => (turmaId ? api.get(`/avisos${qs({ turmaId })}`) : []), 8000, [turmaId])
  const { data: fotos } = usePolling<FotoRotina[]>(async () => (turmaId ? api.get(`/fotos${qs({ turmaId })}`) : []), 8000, [turmaId])
  const { data: relatorios } = usePolling<Relatorio[]>(async () => (turmaId ? api.get(`/relatorios${qs({ turmaId })}`) : []), 8000, [turmaId])

  const lotesFotos = new Map<string, FotoRotina[]>()
  for (const f of fotos ?? []) {
    lotesFotos.set(f.publicacaoId, [...(lotesFotos.get(f.publicacaoId) ?? []), f])
  }

  const posts: Post[] = [
    ...(avisos ?? []).map((a) => ({ id: a.id, tipo: 'aviso' as const, titulo: 'Aviso geral', sub: a.texto, criadoEm: a.criadoEm })),
    ...[...lotesFotos.values()].map((lote) => ({
      id: lote[0].publicacaoId,
      tipo: 'foto' as const,
      titulo: `Foto da rotina${lote.length > 1 ? ` (${lote.length} fotos)` : ''}`,
      sub: lote[0].legenda,
      criadoEm: lote[0].criadoEm,
      fotos: lote.map((f) => f.fotoDataUrl),
    })),
    ...(relatorios ?? []).map((r) => ({
      id: r.id,
      tipo: 'relatorio' as const,
      titulo: r.alunoId ? 'Relatório individual' : 'Relatório de turma',
      sub: r.aulas?.length ? `${r.texto} · Aulas de hoje: ${r.aulas.join(', ')}` : r.texto,
      criadoEm: r.criadoEm,
    })),
  ].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))

  if (!posts.length) return <EmptyState>Nada publicado ainda — use a aba "Publicar".</EmptyState>

  return (
    <div className="flex flex-col gap-2.5">
      <SectionLabel>Tudo o que você publicou para a turma</SectionLabel>
      {posts.map((p) => (
        <Card key={`${p.tipo}-${p.id}`}>
          <div className="flex items-center justify-between">
            <Pill tone={p.tipo === 'aviso' ? 'blue' : p.tipo === 'foto' ? 'green' : 'amber'}>{p.titulo}</Pill>
            <span className="text-[11px] text-faint">{timeAgo(p.criadoEm)}</span>
          </div>
          <p className="mt-1.5 text-[13px]">{p.sub}</p>
          {!!p.fotos?.length && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {p.fotos.map((src, i) => (
                <img key={i} src={src} alt="" className="h-16 w-16 flex-shrink-0 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
