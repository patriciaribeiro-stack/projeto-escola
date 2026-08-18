export function proximosDiasUteis(quantidade: number, apartirDe = new Date()) {
  const dias: Date[] = []
  const cursor = new Date(apartirDe)
  cursor.setHours(0, 0, 0, 0)
  while (dias.length < quantidade) {
    const diaSemana = cursor.getDay()
    if (diaSemana !== 0 && diaSemana !== 6) {
      dias.push(new Date(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

export function formatarDiaChip(data: Date) {
  const diaSemana = data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')
  const dia = data.getDate()
  const mes = data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return { diaSemana, dia, mes }
}

export function toISODate(data: Date) {
  const y = data.getFullYear()
  const m = String(data.getMonth() + 1).padStart(2, '0')
  const d = String(data.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatarDataCompleta(data: Date) {
  return data.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function mesmoDia(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

export const HORARIOS = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

export function horariosDisponiveis(data: Date) {
  const hoje = new Date()
  if (!mesmoDia(data, hoje)) return HORARIOS
  const agora = hoje.getHours() * 60 + hoje.getMinutes()
  return HORARIOS.filter((h) => {
    const [hh, mm] = h.split(':').map(Number)
    return hh * 60 + mm > agora + 60
  })
}
