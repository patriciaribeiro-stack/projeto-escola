import { useState } from 'react'
import { usePolling } from '../../usePolling'
import { api } from '../../api'
import type { Aluno, Evento, EventoResposta, Turma } from '../../types'
import { Button, Card, EmptyState, Pill, SectionLabel, formatDateBR, formatBRL } from '../../components/ui'
import { inputCls as cls } from '../shared/formHelpers'

function parseValorBR(raw: string) {
  const n = Number(raw.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function imprimirLista(evento: Evento, confirmados: { nome: string; termoAssinado: boolean; termoAssinaturaDataUrl: string | null }[], turmaNome: string) {
  const janela = window.open('', '_blank')
  if (!janela) return
  const colunaTermo = evento.exigeTermo
  const linhas = confirmados
    .map(({ nome, termoAssinado, termoAssinaturaDataUrl }, i) => {
      const celulaAssinatura = colunaTermo
        ? termoAssinaturaDataUrl
          ? `<img src="${termoAssinaturaDataUrl}" class="assinatura-img" alt="assinatura" />`
          : termoAssinado
            ? '<span class="pendente">assinado (sem imagem)</span>'
            : '<span class="pendente">termo pendente</span>'
        : ''
      return `<tr><td class="num">${i + 1}</td><td>${nome}</td><td class="assinatura">${celulaAssinatura}</td></tr>`
    })
    .join('')
  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Lista — ${evento.titulo}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 48px; }
  .cabecalho { display: flex; align-items: center; gap: 18px; border-bottom: 3px solid #1B7A68; padding-bottom: 18px; margin-bottom: 28px; }
  .cabecalho img.logo { height: 60px; width: auto; }
  h1 { font-size: 24px; margin: 0; }
  .meta { color: #667; font-size: 13.5px; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 11px 10px; border-bottom: 1px solid #e4e7e5; font-size: 14px; }
  th { text-transform: uppercase; font-size: 10.5px; letter-spacing: .06em; color: #8a938f; font-weight: 700; }
  .num { width: 32px; color: #8a938f; }
  .assinatura { width: 220px; }
  .assinatura-img { height: 44px; max-width: 200px; object-fit: contain; }
  .pendente { color: #a4aca9; font-style: italic; font-size: 12px; }
  tr:nth-child(even) td { background: #f7f9f8; }
  .rodape { margin-top: 36px; font-size: 11px; color: #a4aca9; text-align: center; }
  @media print { body { padding: 18px; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img class="logo" src="${window.location.origin}/logo-escola.png" alt="" />
    <div>
      <h1>${evento.titulo}</h1>
      <div class="meta">${formatDateBR(evento.data)} · Turma ${turmaNome} · ${confirmados.length} aluno${confirmados.length === 1 ? '' : 's'} confirmado${confirmados.length === 1 ? '' : 's'}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>#</th><th>Aluno</th><th>${colunaTermo ? 'Assinatura do termo' : 'Assinatura de recebimento'}</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="rodape">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

export default function Eventos() {
  const { data: eventos, reload } = usePolling<Evento[]>(async () => api.get('/eventos'), 6000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const [novo, setNovo] = useState(false)

  return (
    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:items-start lg:gap-5">
      <div className="flex flex-col gap-4">
        <Button onClick={() => setNovo((v) => !v)} variant={novo ? 'ghost' : 'primary'}>
          {novo ? 'Cancelar' : 'Novo evento'}
        </Button>

        {novo && turmas && (
          <NovoEvento turmas={turmas} onDone={() => { setNovo(false); reload() }} />
        )}
      </div>

      <div className="flex flex-col gap-3">
        {!eventos?.length && <EmptyState>Nenhum evento criado ainda.</EmptyState>}
        {eventos?.map((ev) => <EventoLinha key={ev.id} evento={ev} />)}
      </div>
    </div>
  )
}

function NovoEvento({ turmas, onDone }: { turmas: Turma[]; onDone: () => void }) {
  const [titulo, setTitulo] = useState('')
  const [descricao, setDescricao] = useState('')
  const [data, setData] = useState('')
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? '')
  const [tipo, setTipo] = useState<'gratuito' | 'pago'>('gratuito')
  const [valor, setValor] = useState('')
  const [exigeTermo, setExigeTermo] = useState(false)
  const [termoTexto, setTermoTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function criar() {
    setEnviando(true)
    try {
      await api.post('/eventos', {
        titulo,
        descricao,
        data,
        turmaId,
        tipo,
        valor: tipo === 'pago' ? parseValorBR(valor) : 0,
        exigeTermo,
        termoTexto: exigeTermo ? termoTexto : null,
      })
      onDone()
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Card>
      <div className="flex flex-col gap-2.5">
        <input autoComplete="off" className={cls} placeholder="Título" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        <textarea autoComplete="off" className={cls} rows={2} placeholder="Descrição" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        <div className="flex gap-2">
          <input autoComplete="off" type="date" className={`${cls} flex-1`} value={data} onChange={(e) => setData(e.target.value)} />
          <select className={`${cls} flex-1`} value={turmaId} onChange={(e) => setTurmaId(e.target.value)}>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTipo('gratuito')} className={`flex-1 rounded-lg py-2 text-[12px] font-bold ${tipo === 'gratuito' ? 'bg-blue text-white' : 'bg-paper-sunken text-muted'}`}>Gratuito</button>
          <button onClick={() => setTipo('pago')} className={`flex-1 rounded-lg py-2 text-[12px] font-bold ${tipo === 'pago' ? 'bg-blue text-white' : 'bg-paper-sunken text-muted'}`}>Pago</button>
        </div>
        {tipo === 'pago' && <input autoComplete="off" className={cls} placeholder="Valor em R$ (ex: 45,00)" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" />}
        <label className="flex items-center gap-2 text-[12.5px] font-semibold">
          <input autoComplete="off" type="checkbox" checked={exigeTermo} onChange={(e) => setExigeTermo(e.target.checked)} />
          Exige termo de autorização (ex: passeio)
        </label>
        {exigeTermo && (
          <textarea autoComplete="off"
            className={cls}
            rows={3}
            placeholder='Texto que o pai vai ler e assinar. Ex: "Autorizo meu(minha) filho(a) a participar do passeio ao Zoológico em 02/08, sob responsabilidade da equipe da escola durante trajeto e permanência."'
            value={termoTexto}
            onChange={(e) => setTermoTexto(e.target.value)}
          />
        )}
        <Button disabled={!titulo || !data || enviando} onClick={criar}>Criar e notificar os pais</Button>
      </div>
    </Card>
  )
}

export function EventoLinha({ evento }: { evento: Evento }) {
  const [aberto, setAberto] = useState(false)
  const { data: respostas, reload } = usePolling<EventoResposta[]>(async () => api.get(`/evento-respostas?eventoId=${evento.id}`), 5000, [evento.id])
  const { data: alunos } = usePolling<Aluno[]>(async () => api.get('/alunos'), 60000, [])
  const { data: turmas } = usePolling<Turma[]>(async () => api.get('/turmas'), 60000, [])
  const nome = (id: string) => alunos?.find((a) => a.id === id)?.nome ?? '...'
  const turmaNome = turmas?.find((t) => t.id === evento.turmaId)?.nome

  const confirmados = respostas?.filter((r) => r.presenca === 'confirmado').length ?? 0
  const recusados = respostas?.filter((r) => r.presenca === 'recusado').length ?? 0
  const pendentes = respostas?.filter((r) => r.presenca === 'pendente').length ?? 0

  async function darBaixa(id: string) {
    await api.patch(`/evento-respostas/${id}/pagamento`)
    reload()
  }

  return (
    <Card accent="eventos">
      <button onClick={() => setAberto((v) => !v)} className="flex w-full items-start justify-between text-left">
        <span>
          <div className="text-[13.5px] font-bold">{evento.titulo}</div>
          <div className="text-[11.5px] text-muted">
            {formatDateBR(evento.data)} · {turmaNome ?? '...'} · <span className="font-mono">{evento.tipo === 'pago' ? `R$ ${formatBRL(evento.valor)}` : 'gratuito'}</span>{evento.exigeTermo ? ' · com termo' : ''}
          </div>
        </span>
        <span className="flex gap-1">
          <Pill tone="green">{confirmados}</Pill>
          <Pill tone="red">{pendentes}</Pill>
        </span>
      </button>

      {aberto && (
        <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
          <div className="flex items-center justify-between gap-2">
            <SectionLabel>Confirmados {confirmados} · Pendentes {pendentes} · Recusados {recusados}</SectionLabel>
            <button
              disabled={!confirmados}
              onClick={() => imprimirLista(
                evento,
                (respostas ?? [])
                  .filter((r) => r.presenca === 'confirmado')
                  .map((r) => ({ nome: nome(r.alunoId), termoAssinado: r.termoAssinado, termoAssinaturaDataUrl: r.termoAssinaturaDataUrl })),
                turmaNome ?? '...',
              )}
              className="flex-shrink-0 text-[11.5px] font-bold text-blue disabled:opacity-40"
            >
              Imprimir lista
            </button>
          </div>
          {respostas?.map((r) => {
            const liberadoParaPasseio = r.presenca === 'confirmado' && (evento.tipo !== 'pago' || r.pagamento === 'realizado')
            return (
              <div key={r.id} className="flex items-center justify-between rounded-lg bg-paper-sunken px-3 py-2">
                <div>
                  <div className="text-[12.5px] font-semibold">{nome(r.alunoId)}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <Pill tone={r.presenca === 'confirmado' ? 'green' : r.presenca === 'recusado' ? 'muted' : 'red'}>
                      {r.presenca === 'confirmado' ? 'OK' : r.presenca === 'recusado' ? 'Recusado' : 'Pendente'}
                    </Pill>
                    {evento.exigeTermo && (
                      <span className="text-[11px] text-muted">{r.termoAssinado ? 'termo assinado' : 'termo pendente'}</span>
                    )}
                    {liberadoParaPasseio && <Pill tone="green">Liberado para o passeio</Pill>}
                  </div>
                </div>
                {evento.tipo === 'pago' && r.presenca === 'confirmado' && (
                  r.pagamento === 'realizado' ? (
                    <Pill tone="green">Pagamento realizado</Pill>
                  ) : (
                    <button onClick={() => darBaixa(r.id)} className="text-[11px] font-bold text-blue">Marcar pagamento como realizado</button>
                  )
                )}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
