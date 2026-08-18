import { useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import { useSession } from '../../session'
import type { Licao, Materia, Relatorio, Semanario, SemanarioAula, SemanarioDia, Turma as TurmaType } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { Field, inputCls } from '../shared/formHelpers'
import type { ProfessorContext } from './ProfessorLayout'

const SEGMENTOS_ELEGIVEIS = ['infantil', 'fundamental_1']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

function novaAula(): SemanarioAula {
  return { id: crypto.randomUUID(), aula: '', conteudo: '', metodologia: '', atividadesDeCasa: null }
}

function novoDia(): SemanarioDia {
  return {
    id: crypto.randomUUID(),
    data: new Date().toISOString().slice(0, 10),
    aulas: [novaAula()],
    recursos: null,
    concluidoEm: null,
  }
}

const ESTADO_INFO: Record<Semanario['estado'], { label: string; tone: 'muted' | 'green' | 'red' }> = {
  rascunho: { label: 'Rascunho', tone: 'muted' },
  aguardando_aprovacao: { label: 'Aguardando aprovação', tone: 'red' },
  aprovado: { label: 'Aprovado', tone: 'green' },
  alteracao_necessaria: { label: 'Alteração necessária', tone: 'red' },
}

function imprimirSemanario(turmaNome: string, semanarios: Semanario[]) {
  const janela = window.open('', '_blank')
  if (!janela) return
  const secoes = semanarios
    .map(
      (s) => `
      <h2>${s.professorNome} — ${s.trimestre}º trimestre, ${MESES[s.mes - 1]} (${s.semanaDoMes}ª semana), ${s.anoLetivo}</h2>
      ${s.objetivos ? `<p><strong>Objetivos da semana:</strong> ${s.objetivos}</p>` : ''}
      ${s.dias
        .map(
          (d) => `
        <div class="bloco">
          <h3>${formatDateBR(d.data)}</h3>
          ${d.aulas
            .map(
              (a) => `
          <div class="aula">
            ${a.aula ? `<p><strong>Aula:</strong> ${a.aula}</p>` : ''}
            <p><strong>Conteúdo:</strong> ${a.conteudo || '—'}</p>
            <p><strong>Metodologia:</strong> ${a.metodologia || '—'}</p>
            ${a.atividadesDeCasa ? `<p><strong>Atividades de casa:</strong> ${a.atividadesDeCasa}</p>` : ''}
          </div>`,
            )
            .join('')}
          ${d.recursos ? `<p><strong>Recursos:</strong> ${d.recursos}</p>` : ''}
        </div>`,
        )
        .join('')}`,
    )
    .join('<hr/>')
  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Semanário — ${turmaNome}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 24px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  h2 { font-size: 15px; margin: 20px 0 4px; }
  h3 { font-size: 13px; margin: 12px 0 4px; }
  p { font-size: 12.5px; margin: 2px 0; }
  .bloco { border: 1px solid #d7ddda; border-radius: 8px; padding: 10px 12px; margin: 8px 0; }
  .aula { border-top: 1px dashed #d7ddda; padding-top: 6px; margin-top: 6px; }
  .aula:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
  hr { border: none; border-top: 2px solid #1B7A68; margin: 18px 0; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <h1>Semanário — ${turmaNome}</h1>
  ${secoes}
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

export default function SemanarioProfessor() {
  const { turmaId } = useOutletContext<ProfessorContext>()
  const { professor } = useSession()
  const { data: turmas } = usePolling<TurmaType[]>(async () => api.get('/turmas'), 60000, [])
  const turma = turmas?.find((t) => t.id === turmaId)

  const anoAtual = new Date().getFullYear()
  const [anoLetivo, setAnoLetivo] = useState(anoAtual)
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(1)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [semanaDoMes, setSemanaDoMes] = useState<1 | 2 | 3 | 4>(1)

  const { data: encontrados, reload } = usePolling<Semanario[]>(
    async () =>
      turmaId && professor
        ? api.get(
            `/semanarios${qs({
              turmaId,
              professorId: professor.id,
              anoLetivo: String(anoLetivo),
              trimestre: String(trimestre),
              mes: String(mes),
              semanaDoMes: String(semanaDoMes),
            })}`,
          )
        : [],
    15000,
    [turmaId, professor?.id, anoLetivo, trimestre, mes, semanaDoMes],
  )
  const semanario = encontrados?.[0] ?? null

  if (!turma) return null

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <div className="grid grid-cols-2 gap-2.5">
          <Field label="Ano letivo">
            <input
              autoComplete="off"
              inputMode="numeric"
              className={inputCls}
              value={String(anoLetivo)}
              onChange={(e) => setAnoLetivo(Number(e.target.value.replace(/\D/g, '')) || anoAtual)}
            />
          </Field>
          <Field label="Trimestre">
            <select className={inputCls} value={trimestre} onChange={(e) => setTrimestre(Number(e.target.value) as 1 | 2 | 3)}>
              <option value={1}>1º trimestre</option>
              <option value={2}>2º trimestre</option>
              <option value={3}>3º trimestre</option>
            </select>
          </Field>
          <Field label="Mês">
            <select className={inputCls} value={mes} onChange={(e) => setMes(Number(e.target.value))}>
              {MESES.map((nome, i) => (
                <option key={i} value={i + 1}>{nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Semana do mês">
            <select className={inputCls} value={semanaDoMes} onChange={(e) => setSemanaDoMes(Number(e.target.value) as 1 | 2 | 3 | 4)}>
              <option value={1}>1ª semana</option>
              <option value={2}>2ª semana</option>
              <option value={3}>3ª semana</option>
              <option value={4}>4ª semana</option>
            </select>
          </Field>
        </div>
      </Card>

      {!SEGMENTOS_ELEGIVEIS.includes(turma.segmento) ? (
        <EmptyState>O semanário não se aplica a essa turma.</EmptyState>
      ) : !semanario ? (
        <CriarSemanario
          turmaId={turmaId}
          professorId={professor!.id}
          professorNome={professor!.nome}
          anoLetivo={anoLetivo}
          trimestre={trimestre}
          mes={mes}
          semanaDoMes={semanaDoMes}
          onCriado={reload}
        />
      ) : semanario.estado === 'rascunho' || semanario.estado === 'alteracao_necessaria' ? (
        <SemanarioFormEditavel key={semanario.id} semanario={semanario} turmaNome={turma.nome} onMudou={reload} />
      ) : (
        <SemanarioVisualizacao semanario={semanario} turmaId={turmaId} turmaNome={turma.nome} />
      )}
    </div>
  )
}

function CriarSemanario({ turmaId, professorId, professorNome, anoLetivo, trimestre, mes, semanaDoMes, onCriado }: {
  turmaId: string
  professorId: string
  professorNome: string
  anoLetivo: number
  trimestre: 1 | 2 | 3
  mes: number
  semanaDoMes: 1 | 2 | 3 | 4
  onCriado: () => void
}) {
  const [criando, setCriando] = useState(false)

  async function criar() {
    setCriando(true)
    try {
      await api.post('/semanarios', { turmaId, professorId, professorNome, anoLetivo, trimestre, mes, semanaDoMes, objetivos: '' })
      onCriado()
    } finally {
      setCriando(false)
    }
  }

  return (
    <EmptyState>
      <p className="mb-3">Nenhum semanário criado pra esse período ainda.</p>
      <div className="mx-auto max-w-[220px]">
        <Button onClick={criar} disabled={criando}>{criando ? 'Criando...' : 'Criar semanário'}</Button>
      </div>
    </EmptyState>
  )
}

function SemanarioFormEditavel({ semanario, turmaNome, onMudou }: {
  semanario: Semanario
  turmaNome: string
  onMudou: () => void
}) {
  const [objetivos, setObjetivos] = useState(semanario.objetivos)
  const [dias, setDias] = useState<SemanarioDia[]>(semanario.dias)
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)

  function atualizarDia(id: string, campos: Partial<SemanarioDia>) {
    setDias((prev) => prev.map((d) => (d.id === id ? { ...d, ...campos } : d)))
  }

  function atualizarAula(diaId: string, aulaId: string, campos: Partial<SemanarioAula>) {
    setDias((prev) => prev.map((d) => (
      d.id === diaId ? { ...d, aulas: d.aulas.map((a) => (a.id === aulaId ? { ...a, ...campos } : a)) } : d
    )))
  }

  function adicionarAula(diaId: string) {
    setDias((prev) => prev.map((d) => (d.id === diaId ? { ...d, aulas: [...d.aulas, novaAula()] } : d)))
  }

  function removerAula(diaId: string, aulaId: string) {
    setDias((prev) => prev.map((d) => (d.id === diaId ? { ...d, aulas: d.aulas.filter((a) => a.id !== aulaId) } : d)))
  }

  function moverDia(id: string, direcao: -1 | 1) {
    setDias((prev) => {
      const idx = prev.findIndex((d) => d.id === id)
      const alvo = idx + direcao
      if (alvo < 0 || alvo >= prev.length) return prev
      const copia = [...prev]
      ;[copia[idx], copia[alvo]] = [copia[alvo], copia[idx]]
      return copia
    })
  }

  function removerDia(id: string) {
    setDias((prev) => prev.filter((d) => d.id !== id))
  }

  async function salvarRascunho() {
    setSalvando(true)
    try {
      await api.patch(`/semanarios/${semanario.id}`, { objetivos, dias })
      onMudou()
    } finally {
      setSalvando(false)
    }
  }

  async function enviarParaAprovacao() {
    setSalvando(true)
    try {
      await api.patch(`/semanarios/${semanario.id}`, { objetivos, dias })
      setEnviando(true)
      await api.patch(`/semanarios/${semanario.id}/enviar`)
      onMudou()
    } finally {
      setSalvando(false)
      setEnviando(false)
    }
  }

  async function excluir() {
    if (!confirm('Excluir esse semanário e recomeçar do zero?')) return
    await api.delete(`/semanarios/${semanario.id}`)
    onMudou()
  }

  const info = ESTADO_INFO[semanario.estado]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Pill tone={info.tone}>{info.label}</Pill>
        <button onClick={() => imprimirSemanario(turmaNome, [{ ...semanario, objetivos, dias }])} className="text-[11.5px] font-bold text-blue">
          Imprimir
        </button>
      </div>

      {semanario.estado === 'alteracao_necessaria' && semanario.comentarioCoordenacao && (
        <Card className="border-red bg-red-light">
          <p className="text-[12.5px] font-bold text-red">Alteração solicitada pela coordenação:</p>
          <p className="mt-1 text-[12.5px] text-red">{semanario.comentarioCoordenacao}</p>
        </Card>
      )}

      <Card>
        <Field label="Objetivos da semana">
          <textarea autoComplete="off" className={inputCls} rows={3} value={objetivos} onChange={(e) => setObjetivos(e.target.value)} />
        </Field>
      </Card>

      <div className="flex flex-col gap-3">
        {dias.map((d, i) => (
          <Card key={d.id}>
            <div className="flex items-center gap-2">
              <input autoComplete="off" type="date" className={`${inputCls} flex-1`} value={d.data} onChange={(e) => atualizarDia(d.id, { data: e.target.value })} />
              <button onClick={() => moverDia(d.id, -1)} disabled={i === 0} className="text-[16px] font-bold text-muted disabled:opacity-30">↑</button>
              <button onClick={() => moverDia(d.id, 1)} disabled={i === dias.length - 1} className="text-[16px] font-bold text-muted disabled:opacity-30">↓</button>
              <button onClick={() => removerDia(d.id)} className="text-[11.5px] font-bold text-red">Remover dia</button>
            </div>

            <div className="mt-2.5 flex flex-col gap-2.5">
              {d.aulas.map((a, j) => (
                <div key={a.id} className="flex flex-col gap-2.5 rounded-lg border border-line p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wide text-faint">Aula {j + 1}</span>
                    {d.aulas.length > 1 && (
                      <button onClick={() => removerAula(d.id, a.id)} className="text-[11.5px] font-bold text-red">Remover aula</button>
                    )}
                  </div>
                  <Field label="Aula (matéria/área)">
                    <input autoComplete="off" className={inputCls} value={a.aula} onChange={(e) => atualizarAula(d.id, a.id, { aula: e.target.value })} placeholder="Ex: Matemática" />
                  </Field>
                  <Field label="Conteúdo">
                    <textarea autoComplete="off" className={inputCls} rows={2} value={a.conteudo} onChange={(e) => atualizarAula(d.id, a.id, { conteudo: e.target.value })} />
                  </Field>
                  <Field label="Metodologia">
                    <textarea autoComplete="off" className={inputCls} rows={2} value={a.metodologia} onChange={(e) => atualizarAula(d.id, a.id, { metodologia: e.target.value })} />
                  </Field>
                  <Field label="Atividades de casa (opcional)">
                    <textarea autoComplete="off" className={inputCls} rows={2} value={a.atividadesDeCasa ?? ''} onChange={(e) => atualizarAula(d.id, a.id, { atividadesDeCasa: e.target.value || null })} />
                  </Field>
                </div>
              ))}
              <button onClick={() => adicionarAula(d.id)} className="self-start text-[12px] font-bold text-blue">
                + Adicionar aula
              </button>

              <Field label="Recursos do dia (opcional)">
                <textarea autoComplete="off" className={inputCls} rows={2} value={d.recursos ?? ''} onChange={(e) => atualizarDia(d.id, { recursos: e.target.value || null })} />
              </Field>
            </div>
          </Card>
        ))}
      </div>

      <button onClick={() => setDias((prev) => [...prev, novoDia()])} className="text-[12.5px] font-bold text-blue">
        + Adicionar dia
      </button>
      <Button variant="secondary" disabled={salvando} onClick={salvarRascunho}>{salvando && !enviando ? 'Salvando...' : 'Salvar rascunho'}</Button>
      <Button disabled={salvando || !dias.length} onClick={enviarParaAprovacao}>{enviando ? 'Enviando...' : 'Enviar para aprovação'}</Button>
      <button onClick={excluir} className="text-[11.5px] font-bold text-red">Excluir semanário</button>
    </div>
  )
}

function SemanarioVisualizacao({ semanario, turmaId, turmaNome }: {
  semanario: Semanario
  turmaId: string
  turmaNome: string
}) {
  const { data: relatorios } = usePolling<Relatorio[]>(async () => api.get(`/relatorios${qs({ turmaId })}`), 15000, [turmaId])
  const { data: licoes } = usePolling<Licao[]>(async () => api.get(`/licoes${qs({ turmaId })}`), 15000, [turmaId])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])

  function detectado(dia: SemanarioDia) {
    const nomesDoDia = dia.aulas.map((a) => a.aula.trim().toLowerCase()).filter(Boolean)
    const temRelatorio = (relatorios ?? []).some((r) =>
      r.criadoEm.slice(0, 10) === dia.data &&
      (!nomesDoDia.length || r.aulas.some((a) => nomesDoDia.includes(a.trim().toLowerCase()))),
    )
    const temLicao = (licoes ?? []).some((l) => {
      if (l.criadaEm.slice(0, 10) !== dia.data) return false
      if (!nomesDoDia.length) return true
      const materiaNome = materias?.find((m) => m.id === l.materiaId)?.nome.trim().toLowerCase()
      return !!materiaNome && nomesDoDia.includes(materiaNome)
    })
    return temRelatorio || temLicao
  }

  const info = ESTADO_INFO[semanario.estado]

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Pill tone={info.tone}>{info.label}</Pill>
        <button onClick={() => imprimirSemanario(turmaNome, [semanario])} className="text-[11.5px] font-bold text-blue">
          Imprimir
        </button>
      </div>

      {semanario.estado === 'aguardando_aprovacao' && <EmptyState>Aguardando aprovação da coordenação.</EmptyState>}

      {!!semanario.objetivos && (
        <Card>
          <SectionLabel>Objetivos da semana</SectionLabel>
          <p className="mt-1.5 text-[12.5px]">{semanario.objetivos}</p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {semanario.dias.map((d) => (
          <Card key={d.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-bold">{formatDateBR(d.data)}</span>
              {semanario.estado === 'aprovado' && detectado(d) && (
                <Pill tone="green">Feito (relatório/lição do dia)</Pill>
              )}
            </div>
            <div className="mt-1.5 flex flex-col gap-2">
              {d.aulas.map((a) => (
                <div key={a.id} className="border-t border-line pt-2 first:border-t-0 first:pt-0">
                  {a.aula && <p className="text-[12.5px] font-bold">{a.aula}</p>}
                  <p className="text-[12.5px]"><b>Conteúdo:</b> {a.conteudo || '—'}</p>
                  <p className="text-[12.5px]"><b>Metodologia:</b> {a.metodologia || '—'}</p>
                  {a.atividadesDeCasa && <p className="text-[12.5px]"><b>Atividades de casa:</b> {a.atividadesDeCasa}</p>}
                </div>
              ))}
            </div>
            {d.recursos && <p className="mt-1.5 text-[12.5px]"><b>Recursos:</b> {d.recursos}</p>}
          </Card>
        ))}
      </div>
    </div>
  )
}
