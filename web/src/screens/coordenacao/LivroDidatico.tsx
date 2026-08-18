import { useState } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { ConteudoDia, Materia, Professor, Turma, UnidadeLivro } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'

const ehFundamental = (t: Turma) => t.segmento === 'fundamental_1' || t.segmento === 'fundamental_2'

export default function LivroDidatico() {
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 30000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 30000, [])
  const { data: professores } = usePolling<Professor[]>(async () => api.get('/professores'), 30000, [])
  const { data: unidades, reload: reloadUnidades } = usePolling<UnidadeLivro[]>(async () => api.get('/unidades-livro'), 15000, [])
  const { data: conteudos } = usePolling<ConteudoDia[]>(async () => api.get('/conteudos-dia'), 15000, [])

  const [materiaId, setMateriaId] = useState('')
  const [serie, setSerie] = useState('')
  const [numero, setNumero] = useState('')
  const [titulo, setTitulo] = useState('')
  const [paginaInicio, setPaginaInicio] = useState('')
  const [paginaFim, setPaginaFim] = useState('')
  const [salvando, setSalvando] = useState(false)

  const materiaNome = (id: string) => materias?.find((m) => m.id === id)?.nome ?? '...'

  const unidadesFiltradas = (unidades ?? []).filter((u) => u.materiaId === materiaId && u.serie === Number(serie))

  async function adicionarUnidade() {
    setSalvando(true)
    try {
      await api.post('/unidades-livro', {
        materiaId, serie: Number(serie), numero: Number(numero), titulo,
        paginaInicio: paginaInicio ? Number(paginaInicio) : undefined,
        paginaFim: paginaFim ? Number(paginaFim) : undefined,
      })
      setNumero('')
      setTitulo('')
      setPaginaInicio('')
      setPaginaFim('')
      reloadUnidades()
    } finally {
      setSalvando(false)
    }
  }

  async function excluirUnidade(id: string) {
    if (!confirm('Excluir essa unidade?')) return
    await api.delete(`/unidades-livro/${id}`)
    reloadUnidades()
  }

  const turmasFundamental = (turmas ?? []).filter(ehFundamental)

  function materiasDaTurma(turmaId: string): string[] {
    const ids = new Set<string>()
    for (const p of professores ?? []) {
      for (const v of p.vinculos) if (v.turmaId === turmaId) ids.add(v.materiaId)
    }
    return [...ids]
  }

  function progresso(turma: Turma, materiaIdAlvo: string) {
    const total = (unidades ?? []).filter((u) => u.materiaId === materiaIdAlvo && u.serie === turma.serie).length
    const concluidasIds = new Set(
      (conteudos ?? [])
        .filter((c) => c.turmaId === turma.id && c.materiaId === materiaIdAlvo && c.unidadeConcluidaId)
        .map((c) => c.unidadeConcluidaId),
    )
    return { total, concluidas: concluidasIds.size }
  }

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      <Card>
        <SectionLabel>Configurar unidades do livro</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <div className="flex gap-2">
            <select className={`${inputCls} flex-1`} value={materiaId} onChange={(e) => setMateriaId(e.target.value)}>
              <option value="">Matéria</option>
              {materias?.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
            <select className={`${inputCls} w-28`} value={serie} onChange={(e) => setSerie(e.target.value)}>
              <option value="">Série</option>
              {Array.from({ length: 9 }, (_, i) => i + 1).map((s) => <option key={s} value={s}>{s}ª série</option>)}
            </select>
          </div>

          {materiaId && serie && (
            <>
              {!unidadesFiltradas.length && (
                <p className="text-[12px] text-faint">Nenhuma unidade cadastrada ainda pra {materiaNome(materiaId)} · {serie}ª série.</p>
              )}
              {!!unidadesFiltradas.length && (
                <div className="flex flex-col gap-1.5">
                  {unidadesFiltradas.map((u) => (
                    <div key={u.id} className="flex items-center justify-between rounded-lg bg-paper-sunken px-3 py-2">
                      <span className="text-[12.5px]">
                        <b className="font-mono">{u.numero}.</b> {u.titulo}
                        {u.paginaInicio ? <span className="font-mono"> {`(p. ${u.paginaInicio}${u.paginaFim ? `–${u.paginaFim}` : ''})`}</span> : ''}
                      </span>
                      <button onClick={() => excluirUnidade(u.id)} className="text-[11px] font-bold text-red">Excluir</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <input autoComplete="off" inputMode="numeric" className={`${inputCls} w-20`} placeholder="Nº" value={numero} onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))} />
                <input autoComplete="off" className={`${inputCls} flex-1`} placeholder="Título da unidade" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <input autoComplete="off" inputMode="numeric" className={`${inputCls} flex-1`} placeholder="Página início (opcional)" value={paginaInicio} onChange={(e) => setPaginaInicio(e.target.value.replace(/\D/g, ''))} />
                <input autoComplete="off" inputMode="numeric" className={`${inputCls} flex-1`} placeholder="Página fim (opcional)" value={paginaFim} onChange={(e) => setPaginaFim(e.target.value.replace(/\D/g, ''))} />
              </div>
              <Button disabled={!numero || !titulo || salvando} onClick={adicionarUnidade}>{salvando ? 'Salvando...' : 'Adicionar unidade'}</Button>
            </>
          )}
        </div>
      </Card>

      <div>
        <SectionLabel>Progresso por turma</SectionLabel>
        {!turmasFundamental.length && <EmptyState>Nenhuma turma do Fundamental cadastrada.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {turmasFundamental.map((t) => {
            const materiasIds = materiasDaTurma(t.id)
            return (
              <Card key={t.id}>
                <span className="text-[13px] font-bold">{t.nome}</span>
                {!materiasIds.length && <p className="mt-1 text-[12px] text-faint">Nenhum professor vinculado a matéria nessa turma ainda.</p>}
                <div className="mt-1.5 flex flex-col gap-1">
                  {materiasIds.map((mid) => {
                    const { total, concluidas } = progresso(t, mid)
                    return (
                      <div key={mid} className="flex items-center justify-between text-[12.5px]">
                        <span>{materiaNome(mid)}</span>
                        {total ? (
                          <Pill tone={concluidas === total ? 'green' : 'blue'}><span className="font-mono">{concluidas} de {total}</span> unidades</Pill>
                        ) : (
                          <span className="text-faint">Sem unidades cadastradas</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
