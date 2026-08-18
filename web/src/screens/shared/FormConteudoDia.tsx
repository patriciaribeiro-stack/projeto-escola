import { useEffect, useRef, useState } from 'react'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { ConteudoDia, Materia, Semanario, UnidadeLivro } from '../../types'
import { Button } from '../../components/ui'
import { Field, Sucesso, inputCls } from './formHelpers'

type Entrada = { uid: string; materiaId: string; descricao: string; unidadeConcluidaId: string }

function novaEntrada(materiaId: string, descricao = ''): Entrada {
  return { uid: crypto.randomUUID(), materiaId, descricao, unidadeConcluidaId: '' }
}

export function FormConteudoDia({
  turmaId, serie, autor, materias, onDone,
}: {
  turmaId: string
  serie: number | undefined
  autor: string
  materias: Materia[]
  onDone: () => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)

  const { data: semanarios } = usePolling<Semanario[]>(
    async () => api.get(`/semanarios${qs({ turmaId, estado: 'aprovado' })}`),
    30000,
    [turmaId],
  )
  const diaSemanario = (semanarios ?? []).flatMap((s) => s.dias).find((d) => d.data === hoje && d.aulas.some((a) => a.conteudo))

  const [entradas, setEntradas] = useState<Entrada[]>(() => [novaEntrada(materias[0]?.id ?? '')])
  const [ok, setOk] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const preenchidoRef = useRef(false)

  useEffect(() => {
    if (preenchidoRef.current) return
    const aulasComConteudo = diaSemanario?.aulas.filter((a) => a.conteudo) ?? []
    if (!aulasComConteudo.length) return
    preenchidoRef.current = true
    setEntradas(aulasComConteudo.map((a) => {
      const materia = materias.find((m) => m.nome.toLowerCase() === a.aula.trim().toLowerCase())
      return novaEntrada(materia?.id ?? materias[0]?.id ?? '', a.conteudo)
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanarios])

  function atualizar(uid: string, campo: Partial<Entrada>) {
    setEntradas((prev) => prev.map((e) => (e.uid === uid ? { ...e, ...campo } : e)))
  }

  function adicionar() {
    setEntradas((prev) => [...prev, novaEntrada(materias[0]?.id ?? '')])
  }

  function remover(uid: string) {
    setEntradas((prev) => prev.filter((e) => e.uid !== uid))
  }

  async function enviar() {
    const validas = entradas.filter((e) => e.materiaId && e.descricao)
    if (!validas.length) return
    setEnviando(true)
    try {
      for (const en of validas) {
        const materiaNome = materias.find((m) => m.id === en.materiaId)?.nome ?? ''
        await api.post('/conteudos-dia', {
          turmaId, materiaId: en.materiaId, data: hoje, autor, descricao: en.descricao,
          unidadeConcluidaId: en.unidadeConcluidaId || null,
        })
        await api.post('/relatorios', { turmaId, alunoId: null, autor, texto: en.descricao, aulas: materiaNome ? [materiaNome] : [] })
      }
      const nomesAulas = validas
        .map((en) => materias.find((m) => m.id === en.materiaId)?.nome)
        .filter((n): n is string => !!n)
      if (nomesAulas.length) await api.post('/rotinas/aulas/bulk', { turmaId, data: hoje, aulas: nomesAulas })
      setOk(true)
      setTimeout(onDone, 1200)
    } finally {
      setEnviando(false)
    }
  }

  if (ok) return <Sucesso>Conteúdo do dia registrado.</Sucesso>

  if (!materias.length) {
    return <p className="text-[13px] text-muted">Você não tem nenhuma matéria vinculada a essa turma ainda. Fale com a secretaria.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      {!!diaSemanario && (
        <p className="rounded-lg bg-paper-sunken px-2.5 py-2 text-[11.5px] text-muted">
          Preenchido a partir do semanário de hoje — confira e ajuste antes de enviar.
        </p>
      )}

      {entradas.map((entrada) => (
        <EntradaConteudo
          key={entrada.uid}
          entrada={entrada}
          materias={materias}
          serie={serie}
          turmaId={turmaId}
          podeRemover={entradas.length > 1}
          onChange={(campo) => atualizar(entrada.uid, campo)}
          onRemove={() => remover(entrada.uid)}
        />
      ))}

      <button type="button" onClick={adicionar} className="self-start text-[12.5px] font-bold text-blue">
        + Adicionar aula
      </button>

      <Button disabled={!entradas.some((e) => e.materiaId && e.descricao) || enviando} onClick={enviar}>
        {enviando ? 'Enviando...' : 'Enviar conteúdo do dia'}
      </Button>
    </div>
  )
}

function EntradaConteudo({
  entrada, materias, serie, turmaId, podeRemover, onChange, onRemove,
}: {
  entrada: Entrada
  materias: Materia[]
  serie: number | undefined
  turmaId: string
  podeRemover: boolean
  onChange: (campo: Partial<Entrada>) => void
  onRemove: () => void
}) {
  const { data: unidades } = usePolling<UnidadeLivro[]>(
    async () => (entrada.materiaId && serie ? api.get(`/unidades-livro?materiaId=${entrada.materiaId}&serie=${serie}`) : []),
    30000,
    [entrada.materiaId, serie],
  )
  const { data: conteudosExistentes } = usePolling<ConteudoDia[]>(
    async () => (entrada.materiaId ? api.get(`/conteudos-dia?turmaId=${turmaId}&materiaId=${entrada.materiaId}`) : []),
    30000,
    [entrada.materiaId, turmaId],
  )

  const concluidasIds = new Set((conteudosExistentes ?? []).map((c) => c.unidadeConcluidaId).filter(Boolean))
  const unidadesPendentes = (unidades ?? []).filter((u) => !concluidasIds.has(u.id))

  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <Field label="Matéria">
            <select className={inputCls} value={entrada.materiaId} onChange={(e) => onChange({ materiaId: e.target.value, unidadeConcluidaId: '' })}>
              {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </Field>
        </div>
        {podeRemover && (
          <button type="button" onClick={onRemove} className="mt-5 text-[11.5px] font-bold text-red">
            Remover
          </button>
        )}
      </div>
      <Field label="O que foi trabalhado hoje">
        <textarea autoComplete="off" className={inputCls} rows={4} value={entrada.descricao} onChange={(e) => onChange({ descricao: e.target.value })} />
      </Field>
      <Field label="Marcar unidade concluída hoje (opcional)">
        <select className={inputCls} value={entrada.unidadeConcluidaId} onChange={(e) => onChange({ unidadeConcluidaId: e.target.value })}>
          <option value="">Nenhuma</option>
          {unidadesPendentes.map((u) => <option key={u.id} value={u.id}>{u.numero}. {u.titulo}</option>)}
        </select>
      </Field>
    </div>
  )
}
