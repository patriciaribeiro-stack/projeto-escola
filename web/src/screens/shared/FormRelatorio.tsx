import { useEffect, useRef, useState } from 'react'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, Semanario } from '../../types'
import { Button } from '../../components/ui'
import { Field, Sucesso, inputCls } from './formHelpers'

export function FormRelatorio({
  turmaId,
  alunos,
  autor,
  onDone,
}: {
  turmaId: string
  autor: string
  alunos: Aluno[]
  onDone: () => void
}) {
  const hoje = new Date().toISOString().slice(0, 10)
  const { data: semanarios } = usePolling<Semanario[]>(
    async () => api.get(`/semanarios${qs({ turmaId, estado: 'aprovado' })}`),
    30000,
    [turmaId],
  )
  const aulasDeHoje = (semanarios ?? [])
    .flatMap((s) => s.dias)
    .filter((d) => d.data === hoje)
    .flatMap((d) => d.aulas)
    .filter((a) => a.conteudo)

  const [alunoId, setAlunoId] = useState<string>('turma')
  const [texto, setTexto] = useState('')
  const [aulas, setAulas] = useState('')
  const [ok, setOk] = useState(false)
  const preenchidoRef = useRef(false)

  useEffect(() => {
    if (preenchidoRef.current || !aulasDeHoje.length) return
    preenchidoRef.current = true
    setTexto(aulasDeHoje.map((a) => (a.aula ? `${a.aula}: ${a.conteudo}` : a.conteudo)).join('\n'))
    setAulas(aulasDeHoje.map((a) => a.aula).filter(Boolean).join(', '))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [semanarios])

  async function enviar() {
    const listaAulas = aulas.split(',').map((s) => s.trim()).filter(Boolean)
    await api.post('/relatorios', { turmaId, alunoId: alunoId === 'turma' ? null : alunoId, autor, texto, aulas: listaAulas })
    if (listaAulas.length) {
      const data = new Date().toISOString().slice(0, 10)
      if (alunoId === 'turma') await api.post('/rotinas/aulas/bulk', { turmaId, data, aulas: listaAulas })
      else await api.patch('/rotinas/aulas', { alunoId, data, aulas: listaAulas })
    }
    setOk(true)
    setTimeout(onDone, 1200)
  }

  if (ok) return <Sucesso>Relatório enviado.</Sucesso>

  return (
    <div className="flex flex-col gap-3">
      {!!aulasDeHoje.length && (
        <p className="rounded-lg bg-paper-sunken px-2.5 py-2 text-[11.5px] text-muted">
          Preenchido a partir do semanário de hoje — confira e ajuste antes de enviar.
        </p>
      )}
      <Field label="Destino">
        <select className={inputCls} value={alunoId} onChange={(e) => setAlunoId(e.target.value)}>
          <option value="turma">Turma toda</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
      </Field>
      <Field label="Relatório"><textarea autoComplete="off" className={inputCls} rows={4} value={texto} onChange={(e) => setTexto(e.target.value)} /></Field>
      <Field label="Aulas de hoje (opcional, separadas por vírgula)">
        <input autoComplete="off" className={inputCls} value={aulas} onChange={(e) => setAulas(e.target.value)} placeholder="Roda de conversa, Artes, Educação física" />
      </Field>
      <Button disabled={!texto} onClick={enviar}>Enviar relatório</Button>
    </div>
  )
}
