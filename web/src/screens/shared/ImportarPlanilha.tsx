import { useState } from 'react'
import { api } from '../../api'
import { usePolling } from '../../usePolling'
import type { Aluno, ConfiguracaoMatricula, Pai, Periodo, Turma } from '../../types'
import { Button, Card, SectionLabel } from '../../components/ui'
import { inputCls } from './formHelpers'
import { avisoIdadeTurma } from './idadeMatricula'

const COLUNAS = [
  'Nome do aluno', 'Turma', 'Período', 'Nome do responsável', 'Telefone do responsável',
  'Tipo do responsável', 'Responsável financeiro', 'CPF', 'RG', 'Órgão emissor do RG',
  'Data de emissão do RG', 'E-mail', 'Certidão de nascimento', 'Data de nascimento do responsável',
  'Naturalidade', 'UF', 'Nacionalidade', 'Profissão', 'Logradouro', 'Número', 'Complemento',
  'Bairro', 'Cidade', 'CEP', 'Observações',
]
const CAMPOS_EXTRAS_RESP = COLUNAS.slice(5) // Tipo do responsável em diante

// Colunas do aluno — mesmo valor repetido em toda linha desse aluno (o import usa só a 1ª ocorrência)
const COLUNAS_ALUNO = [
  'RA', 'Matrícula', 'CPF do aluno', 'RG do aluno', 'Data de nascimento do aluno',
  'Sexo do aluno', 'Escolas anteriores', 'Início na escola', 'Irmãos na escola',
  'Telefone do aluno 1', 'Etiqueta do telefone 1', 'Telefone do aluno 2', 'Etiqueta do telefone 2',
]

const EXEMPLO = [
  'João Pedro Silva', '5º Ano A', 'Integral', 'Maria Silva', '11999998888', 'Mãe', 'Sim',
  '12345678900', '123456789', 'SSP', '1990-05-10', 'maria@email.com', '1234567', '1990-05-10',
  'São Paulo', 'SP', 'Brasileira', 'Professora', 'Rua das Flores', '100', 'Apto 2', 'Centro',
  'São Paulo', '01000000', 'Nenhuma',
  '000123456789', '20260001', '11122233344', '987654321', '2015-03-20', 'M',
  'Escola Municipal Tal', '2026-02-02', '1', '11988887777', 'mãe maria silva', '11977776666', 'pai josé',
]

function paraCsv(linhas: string[][]): string {
  return linhas
    .map((linha) => linha.map((campo) => (/[",\n]/.test(campo) ? `"${campo.replace(/"/g, '""')}"` : campo)).join(','))
    .join('\r\n')
}

// Excel em português costuma salvar CSV com ; em vez de , (porque a vírgula já é o separador
// decimal nesse idioma) — olha a primeira linha e usa quem aparecer mais.
function detectarDelimitador(texto: string): ',' | ';' {
  const primeiraLinha = texto.split(/\r?\n/)[0] ?? ''
  const nPontoVirgula = (primeiraLinha.match(/;/g) ?? []).length
  const nVirgula = (primeiraLinha.match(/,/g) ?? []).length
  return nPontoVirgula > nVirgula ? ';' : ','
}

function parseCsv(texto: string, delimitador: ',' | ';' = ','): string[][] {
  const linhas: string[][] = []
  let linha: string[] = []
  let campo = ''
  let dentroAspas = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (dentroAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++ } else dentroAspas = false
      } else campo += c
    } else if (c === '"') dentroAspas = true
    else if (c === delimitador) { linha.push(campo); campo = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i++
      linha.push(campo)
      if (linha.some((v) => v !== '')) linhas.push(linha)
      linha = []
      campo = ''
    } else campo += c
  }
  if (campo !== '' || linha.length) {
    linha.push(campo)
    if (linha.some((v) => v !== '')) linhas.push(linha)
  }
  return linhas
}

function baixarModelo() {
  const conteudo = paraCsv([[...COLUNAS, ...COLUNAS_ALUNO], EXEMPLO])
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-importacao-alunos.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// Pega a primeira sequência de 8 a 11 dígitos numa célula bagunçada (ex: "951258177Celular953742724")
function extrairTelefone(texto: string): string {
  return texto.match(/\d{8,11}/)?.[0] ?? ''
}

const PALAVRAS_CABECALHO = /(aluno|turma|s[ée]rie|pai|m[ãa]e|respons[áa]vel)/

// O Excel brasileiro tem duas opções de "Salvar como CSV" — uma delas (a comum, não a "CSV UTF-8")
// grava em ANSI/Windows-1252, o que quebra todo acento se a gente sempre ler como UTF-8.
// Tenta UTF-8 primeiro; se o cabeçalho não bater com nada reconhecível, tenta Windows-1252.
function decodificarArquivo(buffer: ArrayBuffer): string {
  for (const codificacao of ['utf-8', 'windows-1252']) {
    const texto = new TextDecoder(codificacao, { fatal: false }).decode(buffer).replace(/^﻿/, '')
    const primeiraLinha = texto.split(/\r?\n/)[0]?.toLowerCase() ?? ''
    if (PALAVRAS_CABECALHO.test(primeiraLinha)) return texto
  }
  return new TextDecoder('utf-8', { fatal: false }).decode(buffer).replace(/^﻿/, '')
}

function idxExato(cabecalho: string[], nome: string): number {
  return cabecalho.indexOf(nome.toLowerCase())
}

function idxContendo(cabecalho: string[], ...gruposDeTermos: string[][]): number {
  for (const termos of gruposDeTermos) {
    const i = cabecalho.findIndex((h) => termos.every((t) => h.includes(t)))
    if (i >= 0) return i
  }
  return -1
}

type Responsavel = { nome: string; telefone: string; tipo?: string; extras: Record<string, string> }

type AlunoImportado = {
  ok: boolean
  motivo?: string
  avisos: string[]
  alunoNome: string
  turmaId: string
  periodo: Periodo
  responsaveis: Responsavel[]
  alunoExtras: Record<string, string>
  jaExiste: boolean
}

export function ImportarPlanilha({ turmas, pais, alunos, onDone }: {
  turmas: Turma[] | null | undefined
  pais: Pai[] | null | undefined
  alunos: Aluno[] | null | undefined
  onDone: () => void
}) {
  const { data: configMatricula } = usePolling<ConfiguracaoMatricula>(async () => api.get('/configuracao'), 60000, [])
  const [turmaSelecionadaId, setTurmaSelecionadaId] = useState('')
  const [alunosProcessados, setAlunosProcessados] = useState<AlunoImportado[] | null>(null)
  const [importando, setImportando] = useState(false)
  const [resultado, setResultado] = useState<string | null>(null)
  const [erroArquivo, setErroArquivo] = useState<string | null>(null)

  function processarArquivo(file: File) {
    setErroArquivo(null)
    setAlunosProcessados(null)
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setErroArquivo(`"${file.name}" não é um arquivo CSV. Abra no Excel e use "Salvar como" → CSV antes de subir aqui.`)
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const textoArquivo = decodificarArquivo(reader.result as ArrayBuffer)
      const tabela = parseCsv(textoArquivo, detectarDelimitador(textoArquivo))
      const [cabecalhoBruto, ...linhasDados] = tabela
      const cabecalho = (cabecalhoBruto ?? []).map((c) => c.trim().toLowerCase())

      if (!cabecalho.some((c) => PALAVRAS_CABECALHO.test(c))) {
        setErroArquivo('Não reconheci nenhuma coluna esperada (Aluno, Turma, Pai, Mãe, Responsável...) no cabeçalho desse arquivo. Confira se é o arquivo certo e se a primeira linha tem os nomes das colunas.')
        return
      }

      const iAluno = idxExato(cabecalho, 'Nome do aluno') >= 0 ? idxExato(cabecalho, 'Nome do aluno') : idxExato(cabecalho, 'Aluno')
      const iTurmaCol = idxExato(cabecalho, 'Turma') >= 0 ? idxExato(cabecalho, 'Turma') : idxExato(cabecalho, 'Série')
      const iPeriodo = idxExato(cabecalho, 'Período')
      const iPaiNome = idxExato(cabecalho, 'Pai')
      const iMaeNome = idxExato(cabecalho, 'Mãe') >= 0 ? idxExato(cabecalho, 'Mãe') : idxExato(cabecalho, 'Mae')
      const iPaiTel = idxContendo(cabecalho, ['pai', 'celular'], ['pai', 'telefone'], ['pai', 'fone'])
      const iMaeTel = idxContendo(cabecalho, ['mãe', 'celular'], ['mae', 'celular'], ['mãe', 'telefone'], ['mae', 'telefone'], ['mãe', 'fone'], ['mae', 'fone'])
      const iRespNome = idxExato(cabecalho, 'Nome do responsável')
      const iRespTel = idxExato(cabecalho, 'Telefone do responsável')
      const modoFamilia = iPaiNome >= 0 || iMaeNome >= 0

      const turmaFixa = turmaSelecionadaId ? turmas?.find((t) => t.id === turmaSelecionadaId) : undefined

      const mapaAlunos = new Map<string, AlunoImportado>()

      for (const linha of linhasDados) {
        const alunoNome = (linha[iAluno] ?? '').trim()
        if (!alunoNome) continue

        let turma: Turma | undefined = turmaFixa
        if (!turma && iTurmaCol >= 0) {
          const turmaTexto = (linha[iTurmaCol] ?? '').trim()
          turma = turmas?.find((t) => t.nome.toLowerCase() === turmaTexto.toLowerCase())
        }

        const textoPeriodo = ((iPeriodo >= 0 ? linha[iPeriodo] : iTurmaCol >= 0 ? linha[iTurmaCol] : '') ?? '').toLowerCase()
        const periodo: Periodo = textoPeriodo.includes('meio') ? 'meio_periodo' : 'integral'

        const responsaveisDaLinha: Responsavel[] = []
        const avisos: string[] = []

        if (modoFamilia) {
          if (iPaiNome >= 0) {
            const nome = (linha[iPaiNome] ?? '').trim()
            if (nome) {
              const tel = extrairTelefone(linha[iPaiTel] ?? '')
              if (tel) responsaveisDaLinha.push({ nome, telefone: tel, tipo: 'Pai', extras: {} })
              else avisos.push(`Pai (${nome}) sem telefone válido — não foi vinculado`)
            }
          }
          if (iMaeNome >= 0) {
            const nome = (linha[iMaeNome] ?? '').trim()
            if (nome) {
              const tel = extrairTelefone(linha[iMaeTel] ?? '')
              if (tel) responsaveisDaLinha.push({ nome, telefone: tel, tipo: 'Mãe', extras: {} })
              else avisos.push(`Mãe (${nome}) sem telefone válido — não foi vinculada`)
            }
          }
        } else {
          const respNome = (linha[iRespNome] ?? '').trim()
          const respTelefone = (linha[iRespTel] ?? '').replace(/\D/g, '')
          if (respNome && respTelefone) {
            const resp: Record<string, string> = {}
            for (const campo of CAMPOS_EXTRAS_RESP) {
              const i = idxExato(cabecalho, campo)
              if (i >= 0) resp[campo] = (linha[i] ?? '').trim()
            }
            responsaveisDaLinha.push({ nome: respNome, telefone: respTelefone, tipo: resp['Tipo do responsável'], extras: resp })
          }
        }

        const alunoExtras: Record<string, string> = {}
        for (const campo of COLUNAS_ALUNO) {
          const i = idxExato(cabecalho, campo)
          if (i >= 0) alunoExtras[campo] = (linha[i] ?? '').trim()
        }

        const chave = `${alunoNome}::${turma?.id ?? '?'}`
        let entrada = mapaAlunos.get(chave)
        if (!entrada) {
          const jaExiste = !!turma && !!alunos?.some((a) => a.turmaId === turma!.id && a.nome.trim().toLowerCase() === alunoNome.toLowerCase())
          entrada = {
            ok: !!turma,
            motivo: turma ? undefined : (turmaSelecionadaId ? 'Turma selecionada não encontrada' : 'Turma não informada nem reconhecida (escolha uma turma acima ou inclua a coluna Turma)'),
            avisos: [],
            alunoNome, turmaId: turma?.id ?? '', periodo,
            responsaveis: [], alunoExtras, jaExiste,
          }
          mapaAlunos.set(chave, entrada)
        }
        entrada.responsaveis.push(...responsaveisDaLinha)
        entrada.avisos.push(...avisos)
      }

      for (const a of mapaAlunos.values()) {
        if (a.ok && !a.responsaveis.length) {
          a.avisos.push('Nenhum responsável com telefone válido — aluno criado sem vínculo, adicione depois pela tela')
        }
        if (a.ok && configMatricula) {
          const aviso = avisoIdadeTurma(a.alunoExtras['Data de nascimento do aluno'], a.turmaId, turmas ?? [], configMatricula)
          if (aviso) a.avisos.push(aviso)
        }
      }

      setAlunosProcessados(Array.from(mapaAlunos.values()))
      setResultado(null)
    }
    reader.readAsArrayBuffer(file)
  }

  const validos = (alunosProcessados ?? []).filter((a) => a.ok)
  const invalidos = (alunosProcessados ?? []).filter((a) => !a.ok)
  const alunosNovos = validos.filter((a) => !a.jaExiste)
  const alunosJaExistentes = validos.filter((a) => a.jaExiste)
  const avisos = validos.flatMap((a) => a.avisos.map((av) => `${a.alunoNome}: ${av}`))

  const responsaveisUnicos = new Map<string, Responsavel>()
  for (const a of alunosNovos) for (const r of a.responsaveis) if (!responsaveisUnicos.has(r.telefone)) responsaveisUnicos.set(r.telefone, r)

  async function confirmarImportacao() {
    setImportando(true)
    try {
      const telefoneParaPaiId = new Map<string, string>()
      for (const [telefone, r] of responsaveisUnicos) {
        const existente = pais?.find((p) => p.telefone === telefone)
        if (existente) {
          telefoneParaPaiId.set(telefone, existente.id)
          continue
        }
        const criado = await api.post<Pai>('/pais', {
          nome: r.nome,
          telefone,
          tipo: r.tipo || undefined,
          responsavelFinanceiro: (r.extras['Responsável financeiro'] || '').toLowerCase().startsWith('s'),
          cpf: r.extras['CPF'] || undefined,
          rg: r.extras['RG'] || undefined,
          orgaoEmissorRg: r.extras['Órgão emissor do RG'] || undefined,
          dataEmissaoRg: r.extras['Data de emissão do RG'] || undefined,
          email: r.extras['E-mail'] || undefined,
          certidaoNascimento: r.extras['Certidão de nascimento'] || undefined,
          dataNascimento: r.extras['Data de nascimento do responsável'] || undefined,
          naturalidade: r.extras['Naturalidade'] || undefined,
          uf: r.extras['UF'] || undefined,
          nacionalidade: r.extras['Nacionalidade'] || undefined,
          profissao: r.extras['Profissão'] || undefined,
          observacoes: r.extras['Observações'] || undefined,
          endereco: {
            logradouro: r.extras['Logradouro'] || '',
            numero: r.extras['Número'] || '',
            complemento: r.extras['Complemento'] || '',
            bairro: r.extras['Bairro'] || '',
            cidade: r.extras['Cidade'] || '',
            estado: r.extras['UF'] || '',
            cep: r.extras['CEP'] || '',
          },
        })
        telefoneParaPaiId.set(telefone, criado.id)
      }

      let criados = 0
      for (const { alunoNome, turmaId, periodo, responsaveis, alunoExtras: e } of alunosNovos) {
        const iniciais = alunoNome.trim().split(/\s+/).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('')
        const responsavelIds = responsaveis.map((r) => telefoneParaPaiId.get(r.telefone)).filter(Boolean) as string[]
        const telefonesAluno = [
          { numero: e['Telefone do aluno 1'] || '', etiqueta: e['Etiqueta do telefone 1'] || '' },
          { numero: e['Telefone do aluno 2'] || '', etiqueta: e['Etiqueta do telefone 2'] || '' },
        ].filter((t) => t.numero || t.etiqueta)
        await api.post('/alunos', {
          nome: alunoNome, turmaId, iniciais, periodo, responsavelIds,
          ra: e['RA'] || undefined,
          numeroMatricula: e['Matrícula'] || undefined,
          cpf: e['CPF do aluno'] || undefined,
          rg: e['RG do aluno'] || undefined,
          dataNascimento: e['Data de nascimento do aluno'] || undefined,
          sexo: (e['Sexo do aluno']?.toUpperCase().startsWith('M') ? 'M' : e['Sexo do aluno']?.toUpperCase().startsWith('F') ? 'F' : e['Sexo do aluno'] ? 'outro' : undefined),
          escolasAnteriores: e['Escolas anteriores'] || undefined,
          inicioNaEscola: e['Início na escola'] || undefined,
          irmaosNaEscola: e['Irmãos na escola'] ? Number(e['Irmãos na escola']) : undefined,
          telefones: telefonesAluno,
        })
        criados++
      }

      const puladosTexto = alunosJaExistentes.length ? ` ${alunosJaExistentes.length} já existiam e foram ignorados.` : ''
      setResultado(`${criados} aluno(s) e ${telefoneParaPaiId.size} responsável(is) processados.${puladosTexto}`)
      setAlunosProcessados(null)
      onDone()
    } finally {
      setImportando(false)
    }
  }

  return (
    <Card>
      <SectionLabel>Importar planilha (CSV)</SectionLabel>
      <div className="mt-2.5 flex flex-col gap-2.5">
        <button type="button" onClick={baixarModelo} className="self-start text-[12.5px] font-bold text-blue">
          Baixar modelo (CSV)
        </button>
        <p className="text-[11.5px] text-faint">
          Aceita o modelo detalhado (uma linha por responsável) ou uma planilha mais simples, com colunas Aluno,
          Pai, Mãe e os telefones deles — nesse segundo caso, escolha a turma abaixo antes de subir o arquivo.
        </p>

        <select className={inputCls} value={turmaSelecionadaId} onChange={(e) => setTurmaSelecionadaId(e.target.value)}>
          <option value="">Turma para esta importação (opcional — detecta da planilha se vazio)</option>
          {turmas?.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>

        <input
          autoComplete="off"
          type="file"
          accept=".csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) processarArquivo(file)
            e.target.value = ''
          }}
          className="text-[13px]"
        />

        {erroArquivo && <p className="text-[12px] font-semibold text-red">{erroArquivo}</p>}

        {alunosProcessados && (
          <>
            <p className="text-[13px] font-semibold">
              {validos.length
                ? `${alunosNovos.length} aluno(s) novo(s) e ${responsaveisUnicos.size} responsável(is) prontos pra importar.`
                : 'Nenhuma linha válida encontrada.'}
            </p>
            {!!alunosJaExistentes.length && (
              <div className="rounded-lg bg-paper-sunken p-2.5">
                <p className="text-[11.5px] font-bold text-muted">{alunosJaExistentes.length} aluno(s) já cadastrado(s) — não serão duplicados:</p>
                {alunosJaExistentes.map((a, i) => <p key={i} className="text-[11px] text-muted">{a.alunoNome}</p>)}
              </div>
            )}
            {!!avisos.length && (
              <div className="rounded-lg bg-amber-light p-2.5">
                <p className="text-[11.5px] font-bold text-amber">{avisos.length} aviso(s) — o aluno é importado mesmo assim:</p>
                {avisos.map((av, i) => <p key={i} className="text-[11px] text-amber">{av}</p>)}
              </div>
            )}
            {!!invalidos.length && (
              <div className="rounded-lg bg-red-light p-2.5">
                <p className="text-[11.5px] font-bold text-red">{invalidos.length} linha(s) não serão importadas:</p>
                {invalidos.map((a, i) => (
                  <p key={i} className="text-[11px] text-red">{a.alunoNome || '(sem nome)'} — {a.motivo}</p>
                ))}
              </div>
            )}
            {!!alunosNovos.length && (
              <Button disabled={importando} onClick={confirmarImportacao}>
                {importando ? 'Importando...' : 'Confirmar importação'}
              </Button>
            )}
          </>
        )}

        {resultado && <p className="text-[12.5px] font-semibold text-green-dark">{resultado}</p>}

        <p className="mt-1 text-[10.5px] text-faint">
          Aluno com mesmo nome + turma de um já cadastrado não é duplicado — a importação avisa e ignora essa
          linha. Responsáveis também não duplicam, pelo telefone.
        </p>
      </div>
    </Card>
  )
}
