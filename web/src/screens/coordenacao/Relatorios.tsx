import { useMemo, useState } from 'react'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type {
  Aluno, CardapioDia, Evento, EventoResposta, Licao, LicaoStatus, Materia,
  Ocorrencia, Presenca, Relatorio, Rotina, Semanario, SemanarioDia, Turma,
} from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { inputCls } from '../shared/formHelpers'

type Sub = 'licoes' | 'presenca' | 'alimentacao' | 'passeios' | 'saude' | 'semanario'

export interface Periodo {
  inicio: string
  fim: string
}

const SEM_PERIODO: Periodo = { inicio: '', fim: '' }

function dentroPeriodo(dataIso: string, periodo: Periodo) {
  const d = dataIso.slice(0, 10)
  if (periodo.inicio && d < periodo.inicio) return false
  if (periodo.fim && d > periodo.fim) return false
  return true
}

function useAlunosDaTurma(turmaId: string) {
  const { data: alunosTodos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  return useMemo(() => {
    const alunos = turmaId ? (alunosTodos ?? []).filter((a) => a.turmaId === turmaId) : alunosTodos ?? []
    return { alunos, idsPermitidos: new Set(alunos.map((a) => a.id)) }
  }, [alunosTodos, turmaId])
}

export function PeriodoPicker({ periodo, onChange }: { periodo: Periodo; onChange: (p: Periodo) => void }) {
  const ativo = !!(periodo.inicio || periodo.fim)
  return (
    <Card>
      <div className="flex items-center justify-between">
        <SectionLabel>Período</SectionLabel>
        {ativo && (
          <button onClick={() => onChange(SEM_PERIODO)} className="text-[11.5px] font-bold text-blue">
            Ver tudo
          </button>
        )}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="flex-1 text-[11px] text-muted">
          De
          <input autoComplete="off"
            type="date"
            value={periodo.inicio}
            onChange={(e) => onChange({ ...periodo, inicio: e.target.value })}
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
        <label className="flex-1 text-[11px] text-muted">
          Até
          <input autoComplete="off"
            type="date"
            value={periodo.fim}
            onChange={(e) => onChange({ ...periodo, fim: e.target.value })}
            className={`mt-1 w-full ${inputCls}`}
          />
        </label>
      </div>
      {!ativo && <p className="mt-2 text-[11px] text-faint">Sem período escolhido — mostrando todos os registros.</p>}
    </Card>
  )
}

function TurmaPicker({ turmaId, onChange }: { turmaId: string; onChange: (t: string) => void }) {
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  return (
    <select
      className={`w-full font-semibold ${inputCls}`}
      value={turmaId}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Todas as turmas</option>
      {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
    </select>
  )
}

export default function Relatorios() {
  const [sub, setSub] = useState<Sub>('licoes')
  const [periodo, setPeriodo] = useState<Periodo>(SEM_PERIODO)
  const [turmaId, setTurmaId] = useState('')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['licoes', 'Lições'],
            ['presenca', 'Presença'],
            ['alimentacao', 'Alimentação'],
            ['passeios', 'Passeios'],
            ['saude', 'Saúde'],
            ['semanario', 'Semanário'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 whitespace-nowrap rounded-lg px-2.5 py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>

      <TurmaPicker turmaId={turmaId} onChange={setTurmaId} />
      <PeriodoPicker periodo={periodo} onChange={setPeriodo} />

      {sub === 'licoes' && <RelatorioLicoes periodo={periodo} turmaId={turmaId} />}
      {sub === 'presenca' && <RelatorioPresenca periodo={periodo} turmaId={turmaId} />}
      {sub === 'alimentacao' && <RelatorioAlimentacao periodo={periodo} turmaId={turmaId} />}
      {sub === 'passeios' && <RelatorioPasseios periodo={periodo} turmaId={turmaId} />}
      {sub === 'saude' && <RelatorioSaude periodo={periodo} turmaId={turmaId} />}
      {sub === 'semanario' && <RelatorioSemanario periodo={periodo} turmaId={turmaId} />}
    </div>
  )
}

function calcEntregas(statusList: LicaoStatus[]) {
  const esperadas = statusList.length
  const corretas = statusList.filter((s) => s.estado === 'certo').length
  const foraPadrao = statusList.filter((s) => s.estado === 'fora_padrao').length
  const faltou = statusList.filter((s) => s.estado === 'faltou').length
  const pendentes = statusList.filter((s) => s.estado === 'pendente').length
  const feitaIntegral = statusList.filter((s) => !!s.observacaoIntegral).length
  const vaiParaCasa = statusList.filter((s) => s.estado === 'vai_para_casa').length
  const conferidas = esperadas - pendentes
  const pctEntrega = esperadas ? Math.round(((corretas + foraPadrao + feitaIntegral) / esperadas) * 100) : null
  return { esperadas, conferidas, corretas, foraPadrao, faltou, feitaIntegral, vaiParaCasa, pendentes, pctEntrega }
}

function calcResumo(licoesEscopo: Licao[], statusList: LicaoStatus[]) {
  return { lancadas: licoesEscopo.length, ...calcEntregas(statusList) }
}

function linhaResumoHtml(r: ReturnType<typeof calcResumo>) {
  return `
    <div class="resumo-grid">
      <div><b>${r.lancadas}</b><span>Lições lançadas</span></div>
      <div><b>${r.esperadas}</b><span>Entregas esperadas</span></div>
      <div><b>${r.conferidas}</b><span>Entregas conferidas</span></div>
      <div><b>${r.corretas}</b><span>Corretas</span></div>
      <div><b>${r.foraPadrao}</b><span>Fora do padrão</span></div>
      <div><b>${r.faltou}</b><span>Faltou</span></div>
      <div><b>${r.feitaIntegral}</b><span>Feita no integral</span></div>
      <div><b>${r.vaiParaCasa}</b><span>Vai fazer em casa</span></div>
      <div><b>${r.pendentes}</b><span>Pendentes</span></div>
      <div><b>${r.pctEntrega === null ? '—' : r.pctEntrega + '%'}</b><span>% de entrega</span></div>
    </div>`
}

function boxesHtml(itens: { valor: string | number; label: string }[]) {
  return `<div class="resumo-grid">${itens.map((i) => `<div><b>${i.valor}</b><span>${i.label}</span></div>`).join('')}</div>`
}

function labelTurmaPeriodo(turmaId: string, periodo: Periodo, turmas: Turma[]) {
  const turmaLabel = turmaId ? turmas.find((t) => t.id === turmaId)?.nome ?? '' : 'Todas as turmas'
  const periodoLabel = periodo.inicio || periodo.fim
    ? `${periodo.inicio ? formatDateBR(periodo.inicio) : '...'} a ${periodo.fim ? formatDateBR(periodo.fim) : '...'}`
    : 'Todos os registros'
  return { turmaLabel, periodoLabel }
}

function abrirRelatorio(titulo: string, turmaLabel: string, periodoLabel: string, corpo: string, legenda: string) {
  const janela = window.open('', '_blank')
  if (!janela) return
  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${titulo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 32px; }
  .cabecalho { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1B7A68; padding-bottom: 16px; margin-bottom: 24px; }
  .cabecalho img { height: 52px; width: auto; }
  h1 { font-size: 20px; margin: 0; }
  .meta { color: #667; font-size: 12.5px; margin-top: 4px; }
  .secao { margin-bottom: 30px; }
  h2 { font-size: 16px; border-bottom: 1.5px solid #d8ddda; padding-bottom: 6px; margin: 0 0 10px; }
  h3 { font-size: 12.5px; text-transform: uppercase; letter-spacing: .04em; color: #5c655f; margin: 16px 0 6px; }
  .resumo-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 4px; }
  .resumo-grid > div { border: 1px solid #e4e7e5; border-radius: 8px; padding: 8px 10px; }
  .resumo-grid b { display: block; font-size: 16px; }
  .resumo-grid span { font-size: 10.5px; color: #767f7a; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 4px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #e4e7e5; font-size: 12px; }
  th { text-transform: uppercase; font-size: 10px; letter-spacing: .05em; color: #8a938f; font-weight: 700; }
  tr:nth-child(even) td { background: #f7f9f8; }
  .tabela-alerta th, .tabela-alerta td { color: #9a3b2e; }
  .tabela-alerta tr:nth-child(even) td { background: #fbeeec; }
  .ok { font-size: 12px; color: #1B7A68; font-weight: 600; }
  .aviso { font-size: 12px; color: #9a3b2e; font-weight: 600; }
  .pendencia-aluno { font-size: 12px; margin: 0 0 8px; break-inside: avoid; }
  .pendencia-aluno b { display: block; margin-bottom: 2px; }
  .pendencia-aluno ul { margin: 0; padding-left: 18px; }
  .pendencia-aluno li { line-height: 1.5; }
  .legenda { margin-top: 22px; font-size: 10.5px; color: #8a938f; border-top: 1px solid #e4e7e5; padding-top: 10px; }
  .rodape { margin-top: 20px; font-size: 10.5px; color: #a4aca9; text-align: center; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="${window.location.origin}/logo-escola.png" alt="" />
    <div>
      <h1>${titulo}</h1>
      <div class="meta">${turmaLabel} · ${periodoLabel}</div>
    </div>
  </div>
  ${corpo}
  <div class="legenda">${legenda}</div>
  <div class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

function imprimirRelatorioLicoes(
  periodo: Periodo,
  turmaId: string,
  licoes: Licao[],
  status: LicaoStatus[],
  alunos: Aluno[],
  turmas: Turma[],
  materias: Materia[],
) {
  const nomeMateria = (id: string | null) => (id ? materias.find((m) => m.id === id)?.nome ?? 'Sem matéria' : 'Sem matéria')

  const turmasEnvolvidas = turmas.filter((t) => licoes.some((l) => l.turmaId === t.id))

  const geralHtml = turmasEnvolvidas.length > 1
    ? `<section class="secao"><h2>Resumo geral</h2>${linhaResumoHtml(calcResumo(licoes, status))}</section>`
    : ''

  const secoesTurma = turmasEnvolvidas.map((turma) => {
    const licoesDaTurma = licoes.filter((l) => l.turmaId === turma.id)
    const licoesIds = new Set(licoesDaTurma.map((l) => l.id))
    const statusDaTurma = status.filter((s) => licoesIds.has(s.licaoId))
    const resumo = calcResumo(licoesDaTurma, statusDaTurma)

    const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id).sort((a, b) => a.nome.localeCompare(b.nome))
    const statsPorAluno = alunosDaTurma.map((a) => {
      const doAluno = statusDaTurma.filter((s) => s.alunoId === a.id)
      const pendencias = doAluno
        .filter((s) => s.estado === 'pendente' || s.estado === 'faltou' || s.estado === 'vai_para_casa')
        .map((s) => licoesDaTurma.find((l) => l.id === s.licaoId))
        .filter((l): l is Licao => !!l)
      return { aluno: a, pendencias, ...calcEntregas(doAluno) }
    })

    const baixaEntrega = statsPorAluno
      .filter((p) => p.esperadas > 0 && p.pctEntrega !== null && p.pctEntrega < 70)
      .sort((a, b) => (a.pctEntrega ?? 0) - (b.pctEntrega ?? 0))

    const alertaHtml = baixaEntrega.length
      ? `<table class="tabela-alerta">
          <thead><tr><th>Aluno</th><th>Entregues</th><th>% de entrega</th></tr></thead>
          <tbody>${baixaEntrega.map((p) => `<tr><td>${p.aluno.nome}</td><td>${p.corretas + p.foraPadrao + p.feitaIntegral} de ${p.esperadas}</td><td>${p.pctEntrega}%</td></tr>`).join('')}</tbody>
        </table>`
      : `<p class="ok">Nenhum aluno abaixo de 70% de entrega nesse período.</p>`

    const gruposMateria = new Map<string, Licao[]>()
    for (const l of licoesDaTurma) {
      const chave = l.materiaId ?? '__sem__'
      if (!gruposMateria.has(chave)) gruposMateria.set(chave, [])
      gruposMateria.get(chave)!.push(l)
    }
    const materiaLinhas = [...gruposMateria.entries()]
      .map(([chave, licoesDaMateria]) => {
        const ids = new Set(licoesDaMateria.map((l) => l.id))
        const r = calcResumo(licoesDaMateria, statusDaTurma.filter((s) => ids.has(s.licaoId)))
        return { nome: chave === '__sem__' ? 'Sem matéria' : nomeMateria(chave), semMateria: chave === '__sem__', ...r }
      })
      .sort((a, b) => (a.semMateria === b.semMateria ? a.nome.localeCompare(b.nome) : a.semMateria ? 1 : -1))

    const materiaHtml = `
      <table>
        <thead><tr><th>Matéria</th><th>Lançadas</th><th>Esperadas</th><th>Entregues</th><th>% de entrega</th></tr></thead>
        <tbody>${materiaLinhas.map((m) => `<tr><td>${m.nome}</td><td>${m.lancadas}</td><td>${m.esperadas}</td><td>${m.corretas + m.foraPadrao + m.feitaIntegral}</td><td>${m.pctEntrega === null ? '—' : m.pctEntrega + '%'}</td></tr>`).join('')}</tbody>
      </table>`

    const licoesOrdenadas = [...licoesDaTurma].sort((a, b) => a.entrega.localeCompare(b.entrega))
    const licoesHtml = `
      <table>
        <thead><tr><th>Título</th><th>Matéria</th><th>Entrega</th><th>Autor</th><th>Conferidas</th></tr></thead>
        <tbody>${licoesOrdenadas.map((l) => {
          const statusDaLicao = statusDaTurma.filter((s) => s.licaoId === l.id)
          const conferidas = statusDaLicao.filter((s) => s.estado !== 'pendente').length
          return `<tr><td>${l.titulo}</td><td>${nomeMateria(l.materiaId)}</td><td>${formatDateBR(l.entrega)}</td><td>${l.autor}</td><td>${conferidas} de ${statusDaLicao.length}</td></tr>`
        }).join('')}</tbody>
      </table>`

    const alunoHtml = `
      <table>
        <thead><tr><th>Aluno</th><th>Corretas</th><th>Fora do padrão</th><th>Faltou</th><th>Feita no integral</th><th>Vai fazer em casa</th><th>Pendentes</th><th>% de entrega</th></tr></thead>
        <tbody>${statsPorAluno.map((p) => `<tr><td>${p.aluno.nome}</td><td>${p.corretas}</td><td>${p.foraPadrao}</td><td>${p.faltou}</td><td>${p.feitaIntegral}</td><td>${p.vaiParaCasa}</td><td>${p.pendentes}</td><td>${p.pctEntrega === null ? '—' : p.pctEntrega + '%'}</td></tr>`).join('')}</tbody>
      </table>`

    const comPendencia = statsPorAluno.filter((p) => p.pendencias.length)
    const pendenciasHtml = comPendencia.length
      ? comPendencia.map((p) => `
          <div class="pendencia-aluno">
            <b>${p.aluno.nome}</b>
            <ul>${p.pendencias.map((l) => `<li>${l.titulo} — ${formatDateBR(l.entrega)}</li>`).join('')}</ul>
          </div>`).join('')
      : `<p class="ok">Nenhum aluno com lição pendente ou perdida por falta.</p>`

    return `
      <section class="secao">
        <h2>${turma.nome}</h2>
        ${linhaResumoHtml(resumo)}
        <h3>Alerta de baixa entrega (abaixo de 70%)</h3>
        ${alertaHtml}
        <h3>Por matéria</h3>
        ${materiaHtml}
        <h3>Lições lançadas</h3>
        ${licoesHtml}
        <h3>Por aluno</h3>
        ${alunoHtml}
        <h3>Detalhamento de pendências</h3>
        ${pendenciasHtml}
      </section>`
  }).join('')

  const { turmaLabel, periodoLabel } = labelTurmaPeriodo(turmaId, periodo, turmas)
  abrirRelatorio(
    'Relatório de Lições de Casa',
    turmaLabel,
    periodoLabel,
    geralHtml + secoesTurma,
    '% de entrega = (entregas corretas + fora do padrão + feita no integral) ÷ entregas esperadas. Alerta de baixa entrega considera alunos abaixo de 70%. "Vai fazer em casa" e "Faltou" não entram nesse cálculo — a tarefa ainda não foi cumprida.',
  )
}

function RelatorioLicoes({ periodo, turmaId }: { periodo: Periodo; turmaId: string }) {
  const { data: licoesTodas } = usePolling<Licao[]>(async () => api.get('/licoes'), 10000, [])
  const { data: status } = usePolling<LicaoStatus[]>(async () => api.get('/licao-status'), 10000, [])
  const { alunos } = useAlunosDaTurma(turmaId)
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])

  const licoes = useMemo(
    () => (licoesTodas ?? []).filter((l) => dentroPeriodo(l.entrega, periodo) && (!turmaId || l.turmaId === turmaId)),
    [licoesTodas, periodo, turmaId],
  )
  const licoesIds = useMemo(() => new Set(licoes.map((l) => l.id)), [licoes])
  const statusFiltrado = useMemo(() => (status ?? []).filter((s) => licoesIds.has(s.licaoId)), [status, licoesIds])

  if (!licoes.length) return <EmptyState>Nenhuma lição nesse período{turmaId ? ' para essa turma' : ''}.</EmptyState>

  return (
    <Card>
      <SectionLabel>Emitir relatório</SectionLabel>
      <p className="mt-1.5 text-[11.5px] text-muted">
        Documento com resumo, alerta de baixa entrega, quebra por matéria e detalhamento por aluno — pronto pra imprimir ou salvar em PDF.
      </p>
      <Button
        className="mt-2.5"
        onClick={() => imprimirRelatorioLicoes(periodo, turmaId, licoes, statusFiltrado, alunos, turmas ?? [], materias ?? [])}
      >
        Emitir relatório
      </Button>
    </Card>
  )
}

function calcPresenca(presencasEscopo: Presenca[]) {
  const dias = new Set(presencasEscopo.map((p) => p.data)).size
  const presentes = presencasEscopo.filter((p) => p.presente).length
  const faltas = presencasEscopo.filter((p) => !p.presente).length
  const total = presencasEscopo.length
  const pctPresenca = total ? Math.round((presentes / total) * 100) : null
  return { dias, presentes, faltas, total, pctPresenca }
}

function imprimirRelatorioPresenca(periodo: Periodo, turmaId: string, presencas: Presenca[], alunos: Aluno[], turmas: Turma[], materias: Materia[]) {
  const materiaNome = (id: string | null) => (id ? materias.find((m) => m.id === id)?.nome ?? null : null)
  const turmasComRegistro = new Set(alunos.filter((a) => presencas.some((p) => p.alunoId === a.id)).map((a) => a.turmaId))
  const turmasEnvolvidas = turmas.filter((t) => turmasComRegistro.has(t.id))

  const geralHtml = turmasEnvolvidas.length > 1
    ? (() => {
        const r = calcPresenca(presencas)
        return `<section class="secao"><h2>Resumo geral</h2>${boxesHtml([
          { valor: r.dias, label: 'Dias com presença lançada' },
          { valor: r.presentes, label: 'Presenças' },
          { valor: r.faltas, label: 'Faltas' },
          { valor: r.pctPresenca === null ? '—' : r.pctPresenca + '%', label: '% de presença' },
        ])}</section>`
      })()
    : ''

  const secoesTurma = turmasEnvolvidas.map((turma) => {
    const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id).sort((a, b) => a.nome.localeCompare(b.nome))
    const idsAlunos = new Set(alunosDaTurma.map((a) => a.id))
    const presencasDaTurma = presencas.filter((p) => idsAlunos.has(p.alunoId))
    const resumo = calcPresenca(presencasDaTurma)

    const statsPorAluno = alunosDaTurma.map((a) => {
      const das = presencasDaTurma.filter((p) => p.alunoId === a.id)
      const presentes = das.filter((p) => p.presente).length
      const datasFalta = das
        .filter((p) => !p.presente)
        .map((p) => ({ data: p.data, materia: materiaNome(p.materiaId) }))
        .sort((x, y) => x.data.localeCompare(y.data))
      const total = das.length
      const pct = total ? Math.round((presentes / total) * 100) : null
      return { aluno: a, presentes, faltas: datasFalta.length, datasFalta, total, pct }
    })

    const baixaFrequencia = statsPorAluno
      .filter((p) => p.total > 0 && p.pct !== null && p.pct < 75)
      .sort((a, b) => (a.pct ?? 0) - (b.pct ?? 0))

    const alertaHtml = baixaFrequencia.length
      ? `<table class="tabela-alerta">
          <thead><tr><th>Aluno</th><th>Presenças</th><th>% de presença</th></tr></thead>
          <tbody>${baixaFrequencia.map((p) => `<tr><td>${p.aluno.nome}</td><td>${p.presentes} de ${p.total}</td><td>${p.pct}%</td></tr>`).join('')}</tbody>
        </table>`
      : `<p class="ok">Nenhum aluno abaixo de 75% de presença nesse período.</p>`

    const alunoHtml = `
      <table>
        <thead><tr><th>Aluno</th><th>Presenças</th><th>Faltas</th><th>Total</th><th>% de presença</th></tr></thead>
        <tbody>${statsPorAluno.map((p) => `<tr><td>${p.aluno.nome}</td><td>${p.presentes}</td><td>${p.faltas}</td><td>${p.total}</td><td>${p.pct === null ? '—' : p.pct + '%'}</td></tr>`).join('')}</tbody>
      </table>`

    const comFalta = statsPorAluno.filter((p) => p.datasFalta.length)
    const faltasHtml = comFalta.length
      ? comFalta.map((p) => `
          <div class="pendencia-aluno">
            <b>${p.aluno.nome}</b>
            <ul>${p.datasFalta.map((d) => `<li>${formatDateBR(d.data)}${d.materia ? ` — ${d.materia}` : ''}</li>`).join('')}</ul>
          </div>`).join('')
      : `<p class="ok">Nenhuma falta registrada nessa turma.</p>`

    return `
      <section class="secao">
        <h2>${turma.nome}</h2>
        ${boxesHtml([
          { valor: resumo.dias, label: 'Dias com presença lançada' },
          { valor: resumo.presentes, label: 'Presenças' },
          { valor: resumo.faltas, label: 'Faltas' },
          { valor: resumo.pctPresenca === null ? '—' : resumo.pctPresenca + '%', label: '% de presença' },
        ])}
        <h3>Alerta de baixa frequência (abaixo de 75%)</h3>
        ${alertaHtml}
        <h3>Por aluno</h3>
        ${alunoHtml}
        <h3>Detalhamento de faltas</h3>
        ${faltasHtml}
      </section>`
  }).join('')

  const { turmaLabel, periodoLabel } = labelTurmaPeriodo(turmaId, periodo, turmas)
  abrirRelatorio(
    'Relatório de Presença',
    turmaLabel,
    periodoLabel,
    geralHtml + secoesTurma,
    '% de presença = presenças ÷ total de dias com presença lançada. 75% é o mínimo legal de frequência na educação básica — o alerta considera quem está abaixo disso.',
  )
}

function RelatorioPresenca({ periodo, turmaId }: { periodo: Periodo; turmaId: string }) {
  const { data: presencasTodas } = usePolling<Presenca[]>(async () => api.get('/presencas'), 10000, [])
  const { alunos, idsPermitidos } = useAlunosDaTurma(turmaId)
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])

  const presencas = useMemo(
    () => (presencasTodas ?? []).filter((p) => dentroPeriodo(p.data, periodo) && idsPermitidos.has(p.alunoId)),
    [presencasTodas, periodo, idsPermitidos],
  )

  if (!presencas.length) return <EmptyState>Nenhuma presença lançada nesse período{turmaId ? ' para essa turma' : ''}.</EmptyState>

  return (
    <Card>
      <SectionLabel>Emitir relatório</SectionLabel>
      <p className="mt-1.5 text-[11.5px] text-muted">
        Documento com resumo, alerta de baixa frequência e detalhamento por aluno — pronto pra imprimir ou salvar em PDF.
      </p>
      <Button
        className="mt-2.5"
        onClick={() => imprimirRelatorioPresenca(periodo, turmaId, presencas, alunos, turmas ?? [], materias ?? [])}
      >
        Emitir relatório
      </Button>
    </Card>
  )
}

const STATUS_LABEL: Record<string, string> = {
  comeu_bem: 'Comeu bem',
  comeu_pouco: 'Comeu pouco',
  nao_quis: 'Não quis',
  nao_oferecido: 'Não oferecido',
}

function contarAlmoco(registros: { status: string }[]) {
  const contagem: Record<string, number> = {}
  for (const r of registros) contagem[r.status] = (contagem[r.status] ?? 0) + 1
  return contagem
}

function contarRecusas(rotinasEscopo: Rotina[], cardapioMap: Map<string, string[]>) {
  const contagem = new Map<string, number>()
  for (const r of rotinasEscopo) {
    if (!r.almoco || r.almoco.itensAceitos === null) continue
    const itensDia = cardapioMap.get(r.data)
    if (!itensDia) continue
    const aceitos = new Set(r.almoco.itensAceitos)
    for (const item of itensDia) {
      if (!aceitos.has(item)) contagem.set(item, (contagem.get(item) ?? 0) + 1)
    }
  }
  return [...contagem.entries()].sort((a, b) => b[1] - a[1])
}

function imprimirRelatorioAlimentacao(periodo: Periodo, turmaId: string, rotinas: Rotina[], alunos: Aluno[], turmas: Turma[], cardapios: CardapioDia[]) {
  const turmasComRegistro = new Set(alunos.filter((a) => rotinas.some((r) => r.alunoId === a.id)).map((a) => a.turmaId))
  const turmasEnvolvidas = turmas.filter((t) => turmasComRegistro.has(t.id))
  const cardapioMap = new Map(cardapios.map((c) => [c.data, c.itens]))

  const registrosDe = (rotinasEscopo: Rotina[]) => rotinasEscopo.map((r) => r.almoco).filter((x): x is NonNullable<typeof x> => !!x)

  const geralHtml = turmasEnvolvidas.length > 1
    ? (() => {
        const contagem = contarAlmoco(registrosDe(rotinas))
        return `<section class="secao"><h2>Resumo geral</h2>${boxesHtml(
          Object.entries(STATUS_LABEL).map(([k, label]) => ({ valor: contagem[k] ?? 0, label })),
        )}</section>`
      })()
    : ''

  const secoesTurma = turmasEnvolvidas.map((turma) => {
    const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id).sort((a, b) => a.nome.localeCompare(b.nome))
    const idsAlunos = new Set(alunosDaTurma.map((a) => a.id))
    const rotinasDaTurma = rotinas.filter((r) => idsAlunos.has(r.alunoId))
    const contagemTurma = contarAlmoco(registrosDe(rotinasDaTurma))

    const statsPorAluno = alunosDaTurma.map((a) => {
      const rotinasDoAluno = rotinasDaTurma.filter((r) => r.alunoId === a.id)
      const registros = registrosDe(rotinasDoAluno)
      return { aluno: a, total: registros.length, contagem: contarAlmoco(registros), recusas: contarRecusas(rotinasDoAluno, cardapioMap) }
    })

    const recusasTurma = contarRecusas(rotinasDaTurma, cardapioMap)
    const recusasTurmaHtml = recusasTurma.length
      ? `<table><thead><tr><th>Item</th><th>Vezes recusado</th></tr></thead><tbody>${recusasTurma.map(([item, qtd]) => `<tr><td>${item}</td><td>${qtd}x</td></tr>`).join('')}</tbody></table>`
      : `<p class="ok">Sem cardápio com itens marcados nesse período pra essa turma.</p>`

    const atencaoAlimentar = statsPorAluno
      .filter((p) => (p.contagem.nao_quis ?? 0) >= 3)
      .sort((a, b) => (b.contagem.nao_quis ?? 0) - (a.contagem.nao_quis ?? 0))

    const alertaHtml = atencaoAlimentar.length
      ? `<table class="tabela-alerta">
          <thead><tr><th>Aluno</th><th>Não quis (no período)</th></tr></thead>
          <tbody>${atencaoAlimentar.map((p) => `<tr><td>${p.aluno.nome}</td><td>${p.contagem.nao_quis} de ${p.total}</td></tr>`).join('')}</tbody>
        </table>`
      : `<p class="ok">Nenhum aluno com 3 ou mais registros de "não quis" nesse período.</p>`

    const alunoHtml = `
      <table>
        <thead><tr><th>Aluno</th>${Object.values(STATUS_LABEL).map((l) => `<th>${l}</th>`).join('')}<th>Total</th></tr></thead>
        <tbody>${statsPorAluno.map((p) => `<tr><td>${p.aluno.nome}</td>${Object.keys(STATUS_LABEL).map((k) => `<td>${p.contagem[k] ?? 0}</td>`).join('')}<td>${p.total}</td></tr>`).join('')}</tbody>
      </table>`

    const comRecusa = statsPorAluno.filter((p) => p.recusas.length)
    const recusasPorAlunoHtml = comRecusa.length
      ? comRecusa.map((p) => `
          <div class="pendencia-aluno">
            <b>${p.aluno.nome}</b>
            <ul>${p.recusas.map(([item, qtd]) => `<li>${item} — ${qtd}x</li>`).join('')}</ul>
          </div>`).join('')
      : `<p class="ok">Nenhum item recusado com dados de cardápio registrados.</p>`

    return `
      <section class="secao">
        <h2>${turma.nome}</h2>
        ${boxesHtml(Object.entries(STATUS_LABEL).map(([k, label]) => ({ valor: contagemTurma[k] ?? 0, label })))}
        <h3>Alerta de atenção alimentar (3+ "não quis")</h3>
        ${alertaHtml}
        <h3>Itens mais recusados na turma</h3>
        ${recusasTurmaHtml}
        <h3>Por aluno</h3>
        ${alunoHtml}
        <h3>Itens recusados por aluno</h3>
        ${recusasPorAlunoHtml}
      </section>`
  }).join('')

  const { turmaLabel, periodoLabel } = labelTurmaPeriodo(turmaId, periodo, turmas)
  abrirRelatorio(
    'Relatório de Alimentação',
    turmaLabel,
    periodoLabel,
    geralHtml + secoesTurma,
    'Alerta de atenção alimentar considera alunos com 3 ou mais registros de "não quis" no período. Itens recusados são calculados cruzando o cardápio do dia com o que cada aluno marcou como aceito — só conta dias em que o cardápio foi publicado e os itens foram marcados.',
  )
}

function RelatorioAlimentacao({ periodo, turmaId }: { periodo: Periodo; turmaId: string }) {
  const { data: rotinasTodas } = usePolling<Rotina[]>(async () => api.get('/rotinas'), 10000, [])
  const { alunos, idsPermitidos } = useAlunosDaTurma(turmaId)
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: cardapios } = usePolling<CardapioDia[]>(async () => api.get('/cardapio/semana'), 60000, [])

  const rotinas = useMemo(
    () => (rotinasTodas ?? []).filter((r) => r.almoco && dentroPeriodo(r.data, periodo) && idsPermitidos.has(r.alunoId)),
    [rotinasTodas, periodo, idsPermitidos],
  )

  if (!rotinas.length) return <EmptyState>Nenhum registro de almoço nesse período{turmaId ? ' para essa turma' : ''}.</EmptyState>

  return (
    <Card>
      <SectionLabel>Emitir relatório</SectionLabel>
      <p className="mt-1.5 text-[11.5px] text-muted">
        Documento com resumo do almoço, alerta de atenção alimentar, itens mais recusados e detalhamento por aluno — pronto pra imprimir ou salvar em PDF.
      </p>
      <Button
        className="mt-2.5"
        onClick={() => imprimirRelatorioAlimentacao(periodo, turmaId, rotinas, alunos, turmas ?? [], cardapios ?? [])}
      >
        Emitir relatório
      </Button>
    </Card>
  )
}

function imprimirRelatorioPasseios(periodo: Periodo, turmaId: string, passeios: Evento[], respostasTodas: EventoResposta[], alunos: Aluno[], turmas: Turma[]) {
  const nome = (id: string) => alunos.find((a) => a.id === id)?.nome ?? '...'

  const turmasEnvolvidas = turmas.filter((t) => passeios.some((p) => p.turmaId === t.id))

  const secoesTurma = turmasEnvolvidas.map((turma) => {
    const passeiosDaTurma = passeios.filter((p) => p.turmaId === turma.id).sort((a, b) => a.data.localeCompare(b.data))

    let confirmadosTotal = 0
    let recusadosTotal = 0
    let pendentesTotal = 0
    const eventosHtml = passeiosDaTurma.map((ev) => {
      const respostas = respostasTodas.filter((r) => r.eventoId === ev.id)
      const confirmados = respostas.filter((r) => r.presenca === 'confirmado')
      const recusados = respostas.filter((r) => r.presenca === 'recusado')
      const pendentes = respostas.filter((r) => r.presenca === 'pendente')
      confirmadosTotal += confirmados.length
      recusadosTotal += recusados.length
      pendentesTotal += pendentes.length
      return `
        <h3>${ev.titulo} — ${formatDateBR(ev.data)}</h3>
        ${boxesHtml([
          { valor: confirmados.length, label: 'Confirmados' },
          { valor: recusados.length, label: 'Recusaram' },
          { valor: pendentes.length, label: 'Sem resposta' },
        ])}
        ${confirmados.length ? `<p class="ok"><b>Confirmaram:</b> ${confirmados.map((r) => nome(r.alunoId)).join(', ')}</p>` : ''}
        ${recusados.length ? `<p><b>Recusaram:</b> ${recusados.map((r) => nome(r.alunoId)).join(', ')}</p>` : ''}
        ${pendentes.length ? `<p class="aviso"><b>Sem resposta:</b> ${pendentes.map((r) => nome(r.alunoId)).join(', ')}</p>` : ''}`
    }).join('')

    return `
      <section class="secao">
        <h2>${turma.nome}</h2>
        ${boxesHtml([
          { valor: passeiosDaTurma.length, label: 'Passeios no período' },
          { valor: confirmadosTotal, label: 'Confirmações' },
          { valor: recusadosTotal, label: 'Recusas' },
          { valor: pendentesTotal, label: 'Sem resposta' },
        ])}
        ${eventosHtml}
      </section>`
  }).join('')

  const { turmaLabel, periodoLabel } = labelTurmaPeriodo(turmaId, periodo, turmas)
  abrirRelatorio(
    'Relatório de Passeios',
    turmaLabel,
    periodoLabel,
    secoesTurma,
    'Passeios = eventos pagos no período selecionado.',
  )
}

export function RelatorioPasseios({ periodo, turmaId = '' }: { periodo: Periodo; turmaId?: string }) {
  const { data: eventosTodos } = usePolling<Evento[]>(async () => api.get('/eventos'), 10000, [])
  const passeios = useMemo(
    () => (eventosTodos ?? []).filter((e) => e.tipo === 'pago' && dentroPeriodo(e.data, periodo) && (!turmaId || e.turmaId === turmaId)),
    [eventosTodos, periodo, turmaId],
  )
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const { data: respostasTodas } = usePolling<EventoResposta[]>(async () => api.get('/evento-respostas'), 8000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'

  if (!passeios.length) return <EmptyState>Nenhum passeio (evento pago) nesse período{turmaId ? ' para essa turma' : ''}.</EmptyState>

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionLabel>Emitir relatório</SectionLabel>
        <p className="mt-1.5 text-[11.5px] text-muted">
          Documento com confirmados, recusados e sem resposta de cada passeio — pronto pra imprimir ou salvar em PDF.
        </p>
        <Button
          className="mt-2.5"
          onClick={() => imprimirRelatorioPasseios(periodo, turmaId, passeios, respostasTodas ?? [], alunos ?? [], turmas ?? [])}
        >
          Emitir relatório
        </Button>
      </Card>
      {passeios.map((ev) => <PasseioCard key={ev.id} evento={ev} nome={nome} />)}
    </div>
  )
}

function PasseioCard({ evento, nome }: { evento: Evento; nome: (id: string) => string }) {
  const { data: respostas } = usePolling<EventoResposta[]>(async () => api.get(`/evento-respostas?eventoId=${evento.id}`), 8000, [evento.id])
  const confirmados = respostas?.filter((r) => r.presenca === 'confirmado') ?? []
  const recusados = respostas?.filter((r) => r.presenca === 'recusado') ?? []
  const pendentes = respostas?.filter((r) => r.presenca === 'pendente') ?? []

  return (
    <Card>
      <div className="flex items-center justify-between">
        <span className="text-[13.5px] font-bold">{evento.titulo}</span>
        <span className="text-[11px] text-faint">{formatDateBR(evento.data)}</span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <Pill tone="green">{confirmados.length} confirmados</Pill>
        <Pill tone="muted">{recusados.length} recusaram</Pill>
        <Pill tone="red">{pendentes.length} pendentes</Pill>
      </div>
      {!!confirmados.length && (
        <p className="mt-2 text-[11.5px] text-muted"><b>Confirmaram:</b> {confirmados.map((r) => nome(r.alunoId)).join(', ')}</p>
      )}
      {!!recusados.length && (
        <p className="mt-1 text-[11.5px] text-muted"><b>Recusaram:</b> {recusados.map((r) => nome(r.alunoId)).join(', ')}</p>
      )}
      {!!pendentes.length && (
        <p className="mt-1 text-[11.5px] text-muted"><b>Sem resposta ainda:</b> {pendentes.map((r) => nome(r.alunoId)).join(', ')}</p>
      )}
    </Card>
  )
}

function calcSaude(ocorrenciasEscopo: Ocorrencia[]) {
  return {
    total: ocorrenciasEscopo.length,
    medicado: ocorrenciasEscopo.filter((o) => o.estado === 'medicacao_autorizada').length,
    ciente: ocorrenciasEscopo.filter((o) => o.estado === 'ciente').length,
    buscado: ocorrenciasEscopo.filter((o) => o.estado === 'indo_buscar').length,
    escalonado: ocorrenciasEscopo.filter((o) => o.escalonadoEm).length,
  }
}

function boxesSaude(r: ReturnType<typeof calcSaude>) {
  return boxesHtml([
    { valor: r.total, label: 'Ocorrências' },
    { valor: r.medicado, label: 'Medicado' },
    { valor: r.ciente, label: 'Só ciente' },
    { valor: r.buscado, label: 'Foi buscado' },
    { valor: r.escalonado, label: 'Escalonado' },
  ])
}

function imprimirRelatorioSaude(periodo: Periodo, turmaId: string, ocorrencias: Ocorrencia[], alunos: Aluno[], turmas: Turma[]) {
  const turmasComOcorrencia = new Set(alunos.filter((a) => ocorrencias.some((o) => o.alunoId === a.id)).map((a) => a.turmaId))
  const turmasEnvolvidas = turmas.filter((t) => turmasComOcorrencia.has(t.id))

  const geralHtml = turmasEnvolvidas.length > 1
    ? `<section class="secao"><h2>Resumo geral</h2>${boxesSaude(calcSaude(ocorrencias))}</section>`
    : ''

  const secoesTurma = turmasEnvolvidas.map((turma) => {
    const alunosDaTurma = alunos.filter((a) => a.turmaId === turma.id)
    const idsAlunos = new Set(alunosDaTurma.map((a) => a.id))
    const ocorrenciasDaTurma = ocorrencias.filter((o) => idsAlunos.has(o.alunoId))
    const resumo = calcSaude(ocorrenciasDaTurma)

    const escalonadas = ocorrenciasDaTurma
      .filter((o) => o.escalonadoEm)
      .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
    const alertaHtml = escalonadas.length
      ? `<table class="tabela-alerta">
          <thead><tr><th>Aluno</th><th>Data</th><th>O que aconteceu</th></tr></thead>
          <tbody>${escalonadas.map((o) => `<tr><td>${alunos.find((a) => a.id === o.alunoId)?.nome ?? '...'}</td><td>${formatDateBR(o.registradoEm)}</td><td>${o.descricao}</td></tr>`).join('')}</tbody>
        </table>`
      : `<p class="ok">Nenhuma ocorrência escalonada nessa turma.</p>`

    const statsPorAluno = alunosDaTurma
      .map((a) => ({ aluno: a, ...calcSaude(ocorrenciasDaTurma.filter((o) => o.alunoId === a.id)) }))
      .filter((p) => p.total > 0)
      .sort((a, b) => b.total - a.total)

    const alunoHtml = `
      <table>
        <thead><tr><th>Aluno</th><th>Total</th><th>Medicado</th><th>Só ciente</th><th>Foi buscado</th><th>Escalonado</th></tr></thead>
        <tbody>${statsPorAluno.map((p) => `<tr><td>${p.aluno.nome}</td><td>${p.total}</td><td>${p.medicado}</td><td>${p.ciente}</td><td>${p.buscado}</td><td>${p.escalonado}</td></tr>`).join('')}</tbody>
      </table>`

    const historicoHtml = statsPorAluno.map((p) => {
      const doAluno = ocorrenciasDaTurma
        .filter((o) => o.alunoId === p.aluno.id)
        .sort((a, b) => b.registradoEm.localeCompare(a.registradoEm))
      return `
        <div class="pendencia-aluno">
          <b>${p.aluno.nome}</b>
          <ul>${doAluno.map((o) => `<li>${formatDateBR(o.registradoEm)} — ${o.tipo}: ${o.descricao}</li>`).join('')}</ul>
        </div>`
    }).join('')

    return `
      <section class="secao">
        <h2>${turma.nome}</h2>
        ${boxesSaude(resumo)}
        <h3>Alerta de ocorrências escalonadas</h3>
        ${alertaHtml}
        <h3>Por aluno</h3>
        ${alunoHtml}
        <h3>Histórico de ocorrências por aluno</h3>
        ${historicoHtml}
      </section>`
  }).join('')

  const { turmaLabel, periodoLabel } = labelTurmaPeriodo(turmaId, periodo, turmas)
  abrirRelatorio(
    'Relatório de Saúde',
    turmaLabel,
    periodoLabel,
    geralHtml + secoesTurma,
    'Escalonado = ocorrência que precisou ser encaminhada além do primeiro atendimento.',
  )
}

function RelatorioSaude({ periodo, turmaId }: { periodo: Periodo; turmaId: string }) {
  const { data: ocorrenciasTodas } = usePolling<Ocorrencia[]>(async () => api.get('/ocorrencias'), 10000, [])
  const { alunos, idsPermitidos } = useAlunosDaTurma(turmaId)
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])

  const ocorrencias = useMemo(
    () => (ocorrenciasTodas ?? []).filter((o) => dentroPeriodo(o.registradoEm, periodo) && idsPermitidos.has(o.alunoId)),
    [ocorrenciasTodas, periodo, idsPermitidos],
  )

  if (!ocorrencias.length) return <EmptyState>Nenhuma ocorrência de saúde nesse período{turmaId ? ' para essa turma' : ''}.</EmptyState>

  return (
    <Card>
      <SectionLabel>Emitir relatório</SectionLabel>
      <p className="mt-1.5 text-[11.5px] text-muted">
        Documento com resumo, alerta de ocorrências escalonadas e histórico completo por aluno — pronto pra imprimir ou salvar em PDF.
      </p>
      <Button
        className="mt-2.5"
        onClick={() => imprimirRelatorioSaude(periodo, turmaId, ocorrencias, alunos, turmas ?? [])}
      >
        Emitir relatório
      </Button>
    </Card>
  )
}

const LIMITE_ALERTA_SEMANARIO = 70

function detectadoDia(dia: SemanarioDia, relatoriosDaTurma: Relatorio[], licoesDaTurma: Licao[], materias: Materia[]): boolean {
  const nomesDoDia = dia.aulas.map((a) => a.aula.trim().toLowerCase()).filter(Boolean)
  const temRelatorio = relatoriosDaTurma.some((r) =>
    r.criadoEm.slice(0, 10) === dia.data &&
    (!nomesDoDia.length || r.aulas.some((a) => nomesDoDia.includes(a.trim().toLowerCase()))),
  )
  const temLicao = licoesDaTurma.some((l) => {
    if (l.criadaEm.slice(0, 10) !== dia.data) return false
    if (!nomesDoDia.length) return true
    const materiaNome = materias.find((m) => m.id === l.materiaId)?.nome.trim().toLowerCase()
    return !!materiaNome && nomesDoDia.includes(materiaNome)
  })
  return temRelatorio || temLicao
}

interface StatSemanario {
  professorNome: string
  turmaId: string
  turmaNome: string
  diasPlanejados: number
  diasFeitos: number
  diasPendentes: number
  datasPendentes: string[]
  pct: number | null
}

function calcSemanarios(
  semanarios: Semanario[], relatorios: Relatorio[], licoes: Licao[], materias: Materia[], turmas: Turma[], periodo: Periodo,
): StatSemanario[] {
  const porChave = new Map<string, { professorNome: string; turmaId: string; diasPlanejados: number; diasFeitos: number; datasPendentes: string[] }>()
  for (const s of semanarios.filter((x) => x.estado === 'aprovado')) {
    const relatoriosDaTurma = relatorios.filter((r) => r.turmaId === s.turmaId)
    const licoesDaTurma = licoes.filter((l) => l.turmaId === s.turmaId)
    for (const d of s.dias.filter((dia) => dentroPeriodo(dia.data, periodo))) {
      const chave = `${s.professorNome}::${s.turmaId}`
      const feito = detectadoDia(d, relatoriosDaTurma, licoesDaTurma, materias) || !!d.concluidoEm
      const atual = porChave.get(chave) ?? { professorNome: s.professorNome, turmaId: s.turmaId, diasPlanejados: 0, diasFeitos: 0, datasPendentes: [] }
      atual.diasPlanejados++
      if (feito) atual.diasFeitos++
      else atual.datasPendentes.push(d.data)
      porChave.set(chave, atual)
    }
  }
  return [...porChave.values()]
    .map((v) => ({
      professorNome: v.professorNome,
      turmaId: v.turmaId,
      turmaNome: turmas.find((t) => t.id === v.turmaId)?.nome ?? '...',
      diasPlanejados: v.diasPlanejados,
      diasFeitos: v.diasFeitos,
      diasPendentes: v.diasPlanejados - v.diasFeitos,
      datasPendentes: [...v.datasPendentes].sort(),
      pct: v.diasPlanejados ? Math.round((v.diasFeitos / v.diasPlanejados) * 100) : null,
    }))
    .sort((a, b) => (a.pct ?? 100) - (b.pct ?? 100))
}

function imprimirRelatorioSemanario(periodo: Periodo, turmaId: string, stats: StatSemanario[], turmas: Turma[]) {
  const geralHtml = stats.length > 1
    ? (() => {
        const totalPlanejados = stats.reduce((acc, s) => acc + s.diasPlanejados, 0)
        const totalFeitos = stats.reduce((acc, s) => acc + s.diasFeitos, 0)
        const pctGeral = totalPlanejados ? Math.round((totalFeitos / totalPlanejados) * 100) : null
        return `<section class="secao"><h2>Resumo geral</h2>${boxesHtml([
          { valor: stats.length, label: 'Professora(s)/turma(s)' },
          { valor: totalPlanejados, label: 'Dias planejados' },
          { valor: totalFeitos, label: 'Dias cumpridos' },
          { valor: pctGeral === null ? '—' : pctGeral + '%', label: '% cumprido' },
        ])}</section>`
      })()
    : ''

  const abaixoDoLimite = stats.filter((s) => s.pct !== null && s.pct < LIMITE_ALERTA_SEMANARIO)
  const alertaHtml = abaixoDoLimite.length
    ? `<table class="tabela-alerta">
        <thead><tr><th>Professora</th><th>Turma</th><th>Cumpridos</th><th>% cumprido</th></tr></thead>
        <tbody>${abaixoDoLimite.map((s) => `<tr><td>${s.professorNome}</td><td>${s.turmaNome}</td><td>${s.diasFeitos} de ${s.diasPlanejados}</td><td>${s.pct}%</td></tr>`).join('')}</tbody>
      </table>`
    : `<p class="ok">Ninguém abaixo de ${LIMITE_ALERTA_SEMANARIO}% de cumprimento nesse período.</p>`

  const detalheHtml = stats.map((s) => `
    <div class="secao">
      <h2>${s.professorNome} — ${s.turmaNome}</h2>
      ${boxesHtml([
        { valor: s.diasPlanejados, label: 'Dias planejados' },
        { valor: s.diasFeitos, label: 'Dias cumpridos' },
        { valor: s.diasPendentes, label: 'Dias não cumpridos' },
        { valor: s.pct === null ? '—' : s.pct + '%', label: '% cumprido' },
      ])}
      ${s.datasPendentes.length
        ? `<h3>Datas planejadas e não realizadas</h3><ul>${s.datasPendentes.map((d) => `<li>${formatDateBR(d)}</li>`).join('')}</ul>`
        : `<p class="ok">Todos os dias planejados foram cumpridos.</p>`}
    </div>`).join('')

  const { turmaLabel, periodoLabel } = labelTurmaPeriodo(turmaId, periodo, turmas)
  abrirRelatorio(
    'Relatório de Cumprimento do Semanário',
    turmaLabel,
    periodoLabel,
    `<section class="secao"><h2>Alerta — abaixo de ${LIMITE_ALERTA_SEMANARIO}% de cumprimento</h2>${alertaHtml}</section>${geralHtml}${detalheHtml}`,
    '"Cumprido" = o dia planejado teve relatório ou lição batendo com a aula daquele dia, ou foi marcado manualmente como feito. Considera só semanários já aprovados pela coordenação.',
  )
}

function RelatorioSemanario({ periodo, turmaId }: { periodo: Periodo; turmaId: string }) {
  const { data: semanariosTodos } = usePolling<Semanario[]>(async () => api.get('/semanarios'), 15000, [])
  const { data: relatoriosTodos } = usePolling<Relatorio[]>(async () => api.get('/relatorios'), 15000, [])
  const { data: licoesTodas } = usePolling<Licao[]>(async () => api.get('/licoes'), 15000, [])
  const { data: materias } = usePolling<Materia[]>(async () => api.get('/materias'), 60000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])

  const semanarios = useMemo(
    () => (semanariosTodos ?? []).filter((s) => (turmaId ? s.turmaId === turmaId : true)),
    [semanariosTodos, turmaId],
  )

  const stats = useMemo(
    () => calcSemanarios(semanarios, relatoriosTodos ?? [], licoesTodas ?? [], materias ?? [], turmas ?? [], periodo),
    [semanarios, relatoriosTodos, licoesTodas, materias, turmas, periodo],
  )

  if (!stats.length) return <EmptyState>Nenhum semanário aprovado com dias nesse período{turmaId ? ' para essa turma' : ''}.</EmptyState>

  return (
    <div className="flex flex-col gap-3">
      <Card>
        <SectionLabel>Emitir relatório</SectionLabel>
        <p className="mt-1.5 text-[11.5px] text-muted">
          Mostra quanto do que foi planejado no semanário (aprovado) cada professora realmente aplicou, com base em relatório/lição do dia batendo com a aula planejada, ou marcação manual.
        </p>
        <Button className="mt-2.5" onClick={() => imprimirRelatorioSemanario(periodo, turmaId, stats, turmas ?? [])}>
          Emitir relatório
        </Button>
      </Card>

      <div className="flex flex-col gap-2">
        {stats.map((s) => (
          <Card key={`${s.professorNome}-${s.turmaId}`}>
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[13px] font-bold">{s.professorNome}</div>
                <div className="text-[11.5px] text-muted">{s.turmaNome}</div>
              </div>
              <Pill tone={s.pct !== null && s.pct < LIMITE_ALERTA_SEMANARIO ? 'red' : 'green'}>{s.pct === null ? '—' : `${s.pct}%`}</Pill>
            </div>
            <p className="mt-1.5 text-[11.5px] text-faint">{s.diasFeitos} de {s.diasPlanejados} dias cumpridos</p>
            {!!s.datasPendentes.length && (
              <p className="mt-1 text-[11.5px] text-red">Não cumpridos: {s.datasPendentes.map((d) => formatDateBR(d)).join(', ')}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
