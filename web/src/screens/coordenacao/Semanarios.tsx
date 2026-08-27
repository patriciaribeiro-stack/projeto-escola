import { useState } from 'react'
import { useSession } from '../../session'
import { api, qs } from '../../api'
import { usePolling } from '../../usePolling'
import type { Licao, Materia, Relatorio, Semanario, SemanarioDia, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR } from '../../components/ui'
import { Field, inputCls } from '../shared/formHelpers'

const SEGMENTOS_ELEGIVEIS = ['infantil', 'fundamental_1']
const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const ESTADO_INFO: Record<Semanario['estado'], { label: string; tone: 'muted' | 'green' | 'red' }> = {
  rascunho: { label: 'Rascunho', tone: 'muted' },
  aguardando_aprovacao: { label: 'Aguardando aprovação', tone: 'red' },
  aprovado: { label: 'Aprovado', tone: 'green' },
  alteracao_necessaria: { label: 'Alteração necessária', tone: 'red' },
}

function imprimirSemanarioTurma(turmaNome: string, semanarios: Semanario[]) {
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

function imprimirListaMateriais(
  turmas: { turma: Turma; recursos: { data: string; texto: string }[] }[],
  periodoLabel: string,
) {
  const janela = window.open('', '_blank')
  if (!janela) return
  const secoes = turmas
    .map(
      (t) => `
      <section class="secao">
        <h2>${t.turma.nome}</h2>
        ${t.recursos.map((r) => `<p class="item"><b>${formatDateBR(r.data)}:</b> ${r.texto}</p>`).join('')}
      </section>`,
    )
    .join('')
  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Lista de materiais</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 32px; }
  .cabecalho { display: flex; align-items: center; gap: 16px; border-bottom: 3px solid #1B7A68; padding-bottom: 16px; margin-bottom: 24px; }
  .cabecalho img { height: 52px; width: auto; }
  h1 { font-size: 20px; margin: 0; }
  .meta { color: #667; font-size: 12.5px; margin-top: 4px; }
  .secao { margin-bottom: 22px; break-inside: avoid; }
  h2 { font-size: 16px; border-bottom: 1.5px solid #d8ddda; padding-bottom: 6px; margin: 0 0 10px; }
  .item { font-size: 12.5px; margin: 0 0 8px; white-space: pre-line; line-height: 1.5; }
  .rodape { margin-top: 20px; font-size: 10.5px; color: #a4aca9; text-align: center; }
  @media print { body { padding: 14px; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="${window.location.origin}/logo-escola.png" alt="" />
    <div>
      <h1>Lista de materiais</h1>
      <div class="meta">${periodoLabel}</div>
    </div>
  </div>
  ${secoes}
  <div class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

export default function Semanarios() {
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])

  const anoAtual = new Date().getFullYear()
  const [anoLetivo, setAnoLetivo] = useState(anoAtual)
  const [trimestre, setTrimestre] = useState<1 | 2 | 3>(1)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [semanaDoMes, setSemanaDoMes] = useState<1 | 2 | 3 | 4>(1)

  const { data: semanarios, reload } = usePolling<Semanario[]>(
    async () =>
      api.get(
        `/semanarios${qs({
          anoLetivo: String(anoLetivo),
          trimestre: String(trimestre),
          mes: String(mes),
          semanaDoMes: String(semanaDoMes),
        })}`,
      ),
    15000,
    [anoLetivo, trimestre, mes, semanaDoMes],
  )

  const turmasElegiveis = (turmas ?? []).filter((t) => SEGMENTOS_ELEGIVEIS.includes(t.segmento))

  const turmasComRecursos = turmasElegiveis
    .map((t) => {
      const semanariosDaTurma = (semanarios ?? []).filter((s) => s.turmaId === t.id && s.estado !== 'rascunho')
      const recursos = semanariosDaTurma
        .flatMap((s) => s.dias)
        .filter((d) => d.recursos && d.recursos.trim())
        .map((d) => ({ data: d.data, texto: d.recursos as string }))
        .sort((a, b) => a.data.localeCompare(b.data))
      return { turma: t, recursos }
    })
    .filter((t) => t.recursos.length)

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

      {!!turmasComRecursos.length && (
        <Button
          variant="secondary"
          onClick={() => imprimirListaMateriais(turmasComRecursos, `${trimestre}º trimestre, ${MESES[mes - 1]} (${semanaDoMes}ª semana), ${anoLetivo}`)}
        >
          Imprimir lista de materiais ({turmasComRecursos.length} {turmasComRecursos.length === 1 ? 'turma' : 'turmas'})
        </Button>
      )}

      {!turmasElegiveis.length && <EmptyState>Nenhuma turma Infantil/Fund. I cadastrada.</EmptyState>}

      {turmasElegiveis.map((t) => (
        <TurmaSemanarios
          key={t.id}
          turma={t}
          semanarios={(semanarios ?? [])
            .filter((s) => s.turmaId === t.id && s.estado !== 'rascunho')
            .sort((a, b) => a.professorNome.localeCompare(b.professorNome, 'pt-BR'))}
          onMudou={reload}
        />
      ))}
    </div>
  )
}

function TurmaSemanarios({ turma, semanarios, onMudou }: {
  turma: Turma
  semanarios: Semanario[]
  onMudou: () => void
}) {
  const { session } = useSession()
  const { data: relatorios } = usePolling<Relatorio[]>(async () => api.get(`/relatorios${qs({ turmaId: turma.id })}`), 15000, [turma.id])
  const { data: licoes } = usePolling<Licao[]>(async () => api.get(`/licoes${qs({ turmaId: turma.id })}`), 15000, [turma.id])
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

  async function aprovar(id: string) {
    await api.patch(`/semanarios/${id}/aprovar`, { avaliadoPor: session?.nome })
    onMudou()
  }

  async function solicitarAlteracao(id: string) {
    const comentario = prompt('O que precisa ser ajustado?')
    if (!comentario) return
    await api.patch(`/semanarios/${id}/solicitar-alteracao`, { comentario, avaliadoPor: session?.nome })
    onMudou()
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <SectionLabel>{turma.nome}</SectionLabel>
        {!!semanarios.length && (
          <button onClick={() => imprimirSemanarioTurma(turma.nome, semanarios)} className="text-[11px] font-bold text-blue">
            Imprimir
          </button>
        )}
      </div>
      {!semanarios.length ? (
        <p className="mt-1 text-[12px] text-faint">Nenhum semanário enviado ainda pra essa turma/período.</p>
      ) : (
        <div className="mt-2 flex flex-col gap-2">
          {semanarios.map((s) => {
            const info = ESTADO_INFO[s.estado]
            return (
              <Card key={s.id}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-bold">{s.professorNome}</span>
                  <Pill tone={info.tone}>{info.label}</Pill>
                </div>
                {s.estado === 'alteracao_necessaria' && s.comentarioCoordenacao && (
                  <p className="mt-1 text-[12px] text-red"><b>Comentário:</b> {s.comentarioCoordenacao}</p>
                )}
                {!!s.objetivos && (
                  <p className="mt-2 rounded-lg bg-paper-sunken p-2.5 text-[12px]"><b>Objetivos da semana:</b> {s.objetivos}</p>
                )}
                <div className="mt-2 flex flex-col gap-2">
                  {s.dias.map((d) => (
                    <div key={d.id} className="rounded-lg bg-paper-sunken p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-bold">{formatDateBR(d.data)}</span>
                        {s.estado === 'aprovado' && (
                          <Pill tone={detectado(d) || d.concluidoEm ? 'green' : 'muted'}>
                            {detectado(d) ? 'Feito (relatório/lição do dia)' : d.concluidoEm ? 'Feito (manual)' : 'Pendente'}
                          </Pill>
                        )}
                      </div>
                      <div className="mt-1 flex flex-col gap-1.5">
                        {d.aulas.map((a) => (
                          <div key={a.id} className="border-t border-line pt-1.5 first:border-t-0 first:pt-0">
                            {a.aula && <p className="text-[12px] font-bold">{a.aula}</p>}
                            <p className="text-[12px]"><b>Conteúdo:</b> {a.conteudo || '—'}</p>
                            <p className="text-[12px]"><b>Metodologia:</b> {a.metodologia || '—'}</p>
                            {a.atividadesDeCasa && <p className="text-[12px]"><b>Atividades de casa:</b> {a.atividadesDeCasa}</p>}
                          </div>
                        ))}
                      </div>
                      {d.recursos && <p className="mt-1 text-[12px]"><b>Recursos:</b> {d.recursos}</p>}
                    </div>
                  ))}
                </div>
                {s.estado === 'aguardando_aprovacao' && (
                  <div className="mt-3 flex gap-3">
                    <Button onClick={() => aprovar(s.id)}>Aprovar</Button>
                    <button onClick={() => solicitarAlteracao(s.id)} className="whitespace-nowrap text-[11.5px] font-bold text-amber">
                      Solicitar alteração
                    </button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
