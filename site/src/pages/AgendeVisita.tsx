import { useEffect, useMemo, useState } from 'react'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { Container, Button, Eyebrow } from '../components/ui.tsx'
import { SCHOOL, whatsappLink } from '../config.ts'
import {
  proximosDiasUteis,
  formatarDiaChip,
  formatarDataCompleta,
  mesmoDia,
  horariosDisponiveis,
  toISODate,
} from '../lib/dates.ts'
import { api, ApiError } from '../lib/api.ts'

const SEGMENTOS = ['Berçário', 'Educação Infantil', 'Fundamental I', 'Fundamental II', 'Ainda não sei']

function formatarTelefone(valor: string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 2) return digitos
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`
}

type Confirmacao = { data: Date; horario: string; responsavel: string }

export default function AgendeVisita() {
  const dias = useMemo(() => proximosDiasUteis(15), [])
  const [dataSelecionada, setDataSelecionada] = useState<Date | null>(null)
  const [horaSelecionada, setHoraSelecionada] = useState<string | null>(null)
  const [horariosOcupados, setHorariosOcupados] = useState<string[]>([])
  const [carregandoHorarios, setCarregandoHorarios] = useState(false)

  const [responsavel, setResponsavel] = useState('')
  const [telefone, setTelefone] = useState('')
  const [crianca, setCrianca] = useState('')
  const [segmento, setSegmento] = useState(SEGMENTOS[0])
  const [observacoes, setObservacoes] = useState('')

  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)

  useEffect(() => {
    if (!dataSelecionada) return
    let cancelado = false
    setCarregandoHorarios(true)
    setHoraSelecionada(null)
    api
      .get<{ horariosOcupados: string[] }>(`/visitas/disponibilidade?data=${toISODate(dataSelecionada)}`)
      .then((res) => {
        if (!cancelado) setHorariosOcupados(res.horariosOcupados)
      })
      .catch(() => {
        if (!cancelado) setHorariosOcupados([])
      })
      .finally(() => {
        if (!cancelado) setCarregandoHorarios(false)
      })
    return () => {
      cancelado = true
    }
  }, [dataSelecionada])

  const horarios = dataSelecionada
    ? horariosDisponiveis(dataSelecionada).filter((h) => !horariosOcupados.includes(h))
    : []
  const prontoParaEnviar = Boolean(dataSelecionada && horaSelecionada && responsavel.trim() && telefone.replace(/\D/g, '').length >= 10)

  function selecionarData(d: Date) {
    setDataSelecionada(d)
  }

  async function enviar() {
    if (!prontoParaEnviar || !dataSelecionada || !horaSelecionada) return
    setEnviando(true)
    setErro(null)
    try {
      await api.post('/visitas', {
        data: toISODate(dataSelecionada),
        horario: horaSelecionada,
        responsavel: responsavel.trim(),
        telefone,
        crianca: crianca.trim() || undefined,
        segmento,
        observacoes: observacoes.trim() || undefined,
      })
      setConfirmacao({ data: dataSelecionada, horario: horaSelecionada, responsavel: responsavel.trim() })
      window.scrollTo({ top: 0 })
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErro('Esse horário acabou de ser reservado por outra família. Escolha outro horário.')
        setHorariosOcupados((prev) => [...prev, horaSelecionada])
        setHoraSelecionada(null)
      } else {
        setErro('Não deu pra enviar agora. Tenta de novo em instantes, ou fala direto no WhatsApp.')
      }
    } finally {
      setEnviando(false)
    }
  }

  if (confirmacao) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader />
        <section className="py-20 lg:py-28">
          <Container className="mx-auto max-w-lg text-center">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-light">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-dark">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </span>
            <h1 className="mt-6 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Visita agendada, {confirmacao.responsavel.split(' ')[0]}!
            </h1>
            <p className="mt-4 text-lg text-muted">
              {formatarDataCompleta(confirmacao.data)}, às {confirmacao.horario}
            </p>
            <div className="mt-8 rounded-2xl border border-line bg-paper-raised p-6 text-left text-sm leading-relaxed text-muted">
              A secretaria já recebeu sua solicitação e vai confirmar com você em breve. Chegando no dia, é só se
              anunciar na portaria — {SCHOOL.endereco}.
            </div>
            <p className="mt-6 text-sm text-faint">
              Precisa mudar o horário?{' '}
              <a href={whatsappLink('Olá! Preciso remarcar a visita que agendei pelo site.')} className="font-medium text-green-dark underline underline-offset-2">
                Fale com a secretaria no WhatsApp
              </a>
              .
            </p>
            <Button to="/" variant="secondary" className="mt-8">
              Voltar para o início
            </Button>
          </Container>
        </section>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      <section className="py-14 lg:py-20">
        <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <Eyebrow tone="green">Agende sua visita</Eyebrow>
            <h1 className="mt-4 text-balance font-display text-3xl font-semibold leading-tight text-navy sm:text-4xl">
              Vem conhecer o Vital Brazil de perto
            </h1>
            <p className="mt-4 text-[0.98rem] leading-relaxed text-muted">
              Escolha o melhor dia e horário. Sua visita fica reservada na hora e a secretaria confirma com você em
              seguida.
            </p>

            <ul className="mt-8 space-y-4">
              {[
                ['Sem compromisso', 'A visita é só para conhecer a estrutura e tirar dúvidas — a matrícula é sempre presencial, depois.'],
                ['Cerca de 30 minutos', 'Você conhece as salas, o pátio e conversa com a coordenação.'],
                [`Segunda a sexta`, SCHOOL.horario],
              ].map(([titulo, texto]) => (
                <li key={titulo} className="flex gap-3">
                  <span className="mt-1 h-2 w-2 flex-none rounded-full bg-green" />
                  <div>
                    <p className="font-display text-sm font-semibold text-navy">{titulo}</p>
                    <p className="text-sm text-muted">{texto}</p>
                  </div>
                </li>
              ))}
            </ul>

            <p className="mt-8 text-sm text-faint">
              Prefere combinar direto?{' '}
              <a href={whatsappLink('Olá! Quero agendar uma visita ao Vital Brazil.')} className="font-medium text-green-dark underline underline-offset-2">
                Fale agora no WhatsApp
              </a>
              .
            </p>
          </div>

          <div className="rounded-3xl border border-line bg-paper-raised p-6 sm:p-8">
            {/* Passo 1 — data */}
            <div>
              <p className="font-display text-sm font-semibold text-navy">1. Escolha o dia</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {dias.map((d) => {
                  const { diaSemana, dia, mes } = formatarDiaChip(d)
                  const ativo = dataSelecionada && mesmoDia(dataSelecionada, d)
                  return (
                    <button
                      key={d.toISOString()}
                      type="button"
                      onClick={() => selecionarData(d)}
                      className={`flex w-16 flex-col items-center rounded-xl border px-2 py-2.5 text-center transition-colors ${
                        ativo ? 'border-green bg-green-light text-green-dark' : 'border-line text-ink/80 hover:border-navy/30'
                      }`}
                    >
                      <span className="text-[0.68rem] uppercase text-faint">{diaSemana}</span>
                      <span className="mt-0.5 font-display text-lg font-semibold leading-none">{dia}</span>
                      <span className="mt-0.5 text-[0.68rem] uppercase text-faint">{mes}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Passo 2 — horário */}
            <div className="mt-7">
              <p className="font-display text-sm font-semibold text-navy">2. Escolha o horário</p>
              {!dataSelecionada && <p className="mt-3 text-sm text-faint">Selecione uma data primeiro.</p>}
              {dataSelecionada && carregandoHorarios && <p className="mt-3 text-sm text-faint">Verificando horários livres…</p>}
              {dataSelecionada && !carregandoHorarios && horarios.length === 0 && (
                <p className="mt-3 text-sm text-faint">Sem horários livres nesse dia — escolha outra data.</p>
              )}
              {dataSelecionada && !carregandoHorarios && horarios.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setHoraSelecionada(h)}
                      className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${
                        horaSelecionada === h ? 'border-green bg-green-light text-green-dark' : 'border-line text-ink/80 hover:border-navy/30'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Passo 3 — dados */}
            <div className="mt-7 grid gap-4">
              <p className="font-display text-sm font-semibold text-navy">3. Seus dados</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-sm">
                  <span className="text-ink/70">Seu nome</span>
                  <input
                    value={responsavel}
                    onChange={(e) => setResponsavel(e.target.value)}
                    placeholder="Nome do responsável"
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-green"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-ink/70">WhatsApp para contato</span>
                  <input
                    value={telefone}
                    onChange={(e) => setTelefone(formatarTelefone(e.target.value))}
                    placeholder="(11) 90000-0000"
                    inputMode="tel"
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-green"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-ink/70">Nome da criança (opcional)</span>
                  <input
                    value={crianca}
                    onChange={(e) => setCrianca(e.target.value)}
                    placeholder="Nome do aluno ou aluna"
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-green"
                  />
                </label>
                <label className="text-sm">
                  <span className="text-ink/70">Segmento de interesse</span>
                  <select
                    value={segmento}
                    onChange={(e) => setSegmento(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-green"
                  >
                    {SEGMENTOS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="text-sm">
                <span className="text-ink/70">Observações (opcional)</span>
                <textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  rows={2}
                  placeholder="Alguma dúvida ou preferência para a visita?"
                  className="mt-1.5 w-full resize-none rounded-xl border border-line bg-paper px-3.5 py-2.5 text-sm outline-none focus:border-green"
                />
              </label>
            </div>

            {erro && <p className="mt-4 rounded-xl bg-red-light px-4 py-2.5 text-sm text-red">{erro}</p>}

            <Button onClick={enviar} disabled={!prontoParaEnviar || enviando} className="mt-7 w-full disabled:cursor-not-allowed disabled:opacity-40">
              {enviando ? 'Agendando…' : 'Confirmar agendamento'}
            </Button>
            <p className="mt-3 text-center text-xs text-faint">A secretaria confirma com você por WhatsApp em seguida.</p>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </div>
  )
}
