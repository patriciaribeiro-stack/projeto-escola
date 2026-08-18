import { useState } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { DiaNaoLetivo, TipoDiaNaoLetivo } from '../../types'
import { Button, Card, EmptyState, SectionLabel } from '../../components/ui'
import { inputCls } from './formHelpers'


const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function formatarDataBR(data: string) {
  const [y, m, d] = data.split('-')
  return `${d}/${m}/${y}`
}

function diaInfo(ano: number, mes: number, dia: number, diasNaoLetivos: DiaNaoLetivo[]) {
  const dataStr = `${ano}-${pad2(mes + 1)}-${pad2(dia)}`
  const excecao = diasNaoLetivos.find((d) => d.data === dataStr)
  const diaSemana = new Date(ano, mes, dia).getDay()
  if (excecao) return { letra: excecao.tipo === 'feriado' ? 'F' : 'R', classe: excecao.tipo, letivo: false }
  if (diaSemana === 0) return { letra: 'D', classe: 'fimdesemana', letivo: false }
  if (diaSemana === 6) return { letra: 'S', classe: 'fimdesemana', letivo: false }
  return { letra: '', classe: '', letivo: true }
}

function imprimirCalendarioAnual(ano: number, diasNaoLetivos: DiaNaoLetivo[]) {
  const janela = window.open('', '_blank')
  if (!janela) return

  let totalAno = 0
  const totalPorSemestre = [0, 0]
  const linhas = MESES.map((nomeMes, mes) => {
    const diasNoMes = new Date(ano, mes + 1, 0).getDate()
    let diasLetivosMes = 0
    const celulas: string[] = []
    for (let dia = 1; dia <= 31; dia++) {
      if (dia > diasNoMes) {
        celulas.push('<td class="vazio"></td>')
        continue
      }
      const info = diaInfo(ano, mes, dia, diasNaoLetivos)
      if (info.letivo) diasLetivosMes++
      celulas.push(`<td class="${info.classe}">${info.letra}</td>`)
    }
    totalAno += diasLetivosMes
    totalPorSemestre[mes < 6 ? 0 : 1] += diasLetivosMes
    return `<tr><td class="mes">${nomeMes}</td>${celulas.join('')}<td class="total">${diasLetivosMes}</td></tr>`
  }).join('')

  const cabecalhoDias = Array.from({ length: 31 }, (_, i) => `<th>${i + 1}</th>`).join('')

  janela.document.write(`<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Calendário escolar ${ano}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, sans-serif; color: #1c2b26; padding: 24px; }
  .cabecalho { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid #1B7A68; padding-bottom: 14px; margin-bottom: 20px; }
  .cabecalho img { height: 48px; width: auto; }
  h1 { font-size: 18px; margin: 0; }
  table { border-collapse: collapse; width: 100%; font-size: 10.5px; }
  th, td { border: 1px solid #ccc; text-align: center; padding: 3px 2px; }
  th { background: #f0efe9; font-weight: 700; }
  td.mes { text-align: left; font-weight: 700; white-space: nowrap; padding-left: 6px; }
  td.total { font-weight: 700; background: #f0efe9; }
  td.feriado { background: #f4c7c3; }
  td.recesso { background: #d9c7f0; }
  td.fimdesemana { background: #e3e3e3; }
  td.vazio { background: #fafafa; }
  .legenda { display: flex; gap: 18px; margin-top: 14px; font-size: 11.5px; }
  .legenda span { display: inline-flex; align-items: center; gap: 5px; }
  .legenda i { display: inline-block; width: 12px; height: 12px; border: 1px solid #ccc; }
  .resumo { margin-top: 14px; font-size: 12.5px; display: flex; gap: 24px; font-weight: 700; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>
  <div class="cabecalho">
    <img src="${window.location.origin}/logo-escola.png" alt="" />
    <h1>Calendário Escolar Anual ${ano}</h1>
  </div>
  <table>
    <thead><tr><th>Mês</th>${cabecalhoDias}<th>Dias letivos</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <div class="legenda">
    <span><i style="background:#f4c7c3"></i> F = Feriado</span>
    <span><i style="background:#d9c7f0"></i> R = Recesso</span>
    <span><i style="background:#e3e3e3"></i> S/D = Sábado/Domingo</span>
  </div>
  <div class="resumo">
    <span>1º semestre: ${totalPorSemestre[0]} dias letivos</span>
    <span>2º semestre: ${totalPorSemestre[1]} dias letivos</span>
    <span>Total do ano: ${totalAno} dias letivos</span>
  </div>
</body>
</html>`)
  janela.document.close()
  janela.focus()
  janela.print()
}

export function CalendarioCadastro() {
  const { data: dias, reload } = usePolling<DiaNaoLetivo[]>(async () => api.get('/dias-nao-letivos'), 30000, [])
  const [data, setData] = useState('')
  const [tipo, setTipo] = useState<TipoDiaNaoLetivo>('feriado')
  const [descricao, setDescricao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [ano, setAno] = useState(String(new Date().getFullYear()))

  async function salvar() {
    setSalvando(true)
    try {
      await api.post('/dias-nao-letivos', { data, tipo, descricao })
      setData('')
      setDescricao('')
      reload()
    } finally {
      setSalvando(false)
    }
  }

  async function excluir(id: string) {
    if (!confirm('Excluir esse dia do calendário?')) return
    await api.delete(`/dias-nao-letivos/${id}`)
    reload()
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SectionLabel>Novo dia não letivo</SectionLabel>
        <div className="mt-2.5 flex flex-col gap-2.5">
          <input autoComplete="off" type="date" className={inputCls} value={data} onChange={(e) => setData(e.target.value)} />
          <div className="flex gap-1.5">
            {(['feriado', 'recesso'] as TipoDiaNaoLetivo[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTipo(t)}
                className={`flex-1 rounded-full border-[1.5px] px-3 py-1.5 text-[12px] font-semibold capitalize ${tipo === t ? 'border-green bg-green text-white' : 'border-line text-muted'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input autoComplete="off" className={inputCls} placeholder="Descrição (ex: Independência, Recesso de julho)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
          <Button disabled={!data || salvando} onClick={salvar}>{salvando ? 'Salvando...' : 'Adicionar ao calendário'}</Button>
        </div>
      </Card>

      <Card>
        <SectionLabel>Emitir calendário anual</SectionLabel>
        <div className="mt-2.5 flex items-center gap-2">
          <input autoComplete="off" inputMode="numeric" className={`${inputCls} w-24`} value={ano} onChange={(e) => setAno(e.target.value.replace(/\D/g, ''))} />
          <Button className="w-auto flex-1" disabled={!ano} onClick={() => imprimirCalendarioAnual(Number(ano), dias ?? [])}>
            Emitir calendário anual
          </Button>
        </div>
      </Card>

      <div>
        <SectionLabel>Dias cadastrados ({dias?.length ?? 0})</SectionLabel>
        {!dias?.length && <EmptyState>Nenhum feriado ou recesso cadastrado ainda.</EmptyState>}
        <div className="mt-2 flex flex-col gap-2">
          {dias?.map((d) => (
            <Card key={d.id} className="flex items-center justify-between">
              <div>
                <span className="text-[13px] font-bold">{formatarDataBR(d.data)}</span>
                <span className="ml-2 text-[11px] font-bold uppercase text-muted">{d.tipo}</span>
                {d.descricao && <p className="mt-0.5 text-[11.5px] text-muted">{d.descricao}</p>}
              </div>
              <button onClick={() => excluir(d.id)} className="text-[11.5px] font-bold text-red">Excluir</button>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
