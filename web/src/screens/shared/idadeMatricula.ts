import type { ConfiguracaoMatricula, Turma } from '../../types'

function idadeCompletaEm(dataNascimento: string, dataReferencia: Date): number {
  const nasc = new Date(dataNascimento)
  let idade = dataReferencia.getFullYear() - nasc.getFullYear()
  const aindaNaoFezAniversario =
    dataReferencia.getMonth() < nasc.getMonth() ||
    (dataReferencia.getMonth() === nasc.getMonth() && dataReferencia.getDate() < nasc.getDate())
  if (aindaNaoFezAniversario) idade--
  return idade
}

function dataDeCorteDoAno(config: ConfiguracaoMatricula, ano: number): Date {
  return new Date(ano, config.dataCorteMes - 1, config.dataCorteDia)
}

function formatarCorte(config: ConfiguracaoMatricula): string {
  return `${String(config.dataCorteDia).padStart(2, '0')}/${String(config.dataCorteMes).padStart(2, '0')}`
}

// Aviso não-bloqueante: confere se a idade do aluno bate com a idade mínima configurada
// pra turma escolhida, e se não existe uma turma mais avançada (mesmo segmento) que o
// aluno já atingiria pela idade — cobre as duas direções do erro com um só número por turma.
export function avisoIdadeTurma(
  dataNascimento: string | undefined | null,
  turmaId: string | undefined | null,
  turmas: Turma[],
  config: ConfiguracaoMatricula,
): string | null {
  if (!dataNascimento || !turmaId) return null
  const turma = turmas.find((t) => t.id === turmaId)
  if (!turma || turma.idadeMinima == null) return null

  const corte = dataDeCorteDoAno(config, new Date().getFullYear())
  const idade = idadeCompletaEm(dataNascimento, corte)
  const corteTexto = formatarCorte(config)

  if (idade < turma.idadeMinima) {
    return `Pela data de nascimento, o aluno terá ${idade} ano(s) completo(s) até ${corteTexto} — abaixo da idade mínima configurada para ${turma.nome} (${turma.idadeMinima} anos).`
  }

  const turmaMaisAdequada = turmas
    .filter((t) => t.segmento === turma.segmento && t.id !== turma.id && t.idadeMinima != null && t.idadeMinima > turma.idadeMinima! && t.idadeMinima <= idade)
    .sort((a, b) => b.idadeMinima! - a.idadeMinima!)[0]

  if (turmaMaisAdequada) {
    return `Pela idade (${idade} ano(s) completo(s) até ${corteTexto}), o aluno já atinge a idade mínima de ${turmaMaisAdequada.nome} (${turmaMaisAdequada.idadeMinima} anos) — confira se não deveria estar lá.`
  }

  return null
}
