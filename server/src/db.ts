import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { DbSchema } from './types.ts'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const file = path.join(__dirname, '..', 'data', 'db.json')

const defaultData: DbSchema = {
  configuracao: { dataCorteDia: 31, dataCorteMes: 3 },
  diasNaoLetivos: [],
  unidadesLivro: [],
  conteudosDia: [],
  turmas: [],
  materias: [],
  alunos: [],
  pais: [],
  professores: [],
  coordenadores: [],
  secretarios: [],
  recepcionistas: [],
  monitoresIntegral: [],
  substitutos: [],
  semanarios: [],
  avisos: [],
  fotos: [],
  rotinas: [],
  licoes: [],
  licaoStatus: [],
  ocorrencias: [],
  ocorrenciasGerais: [],
  eventos: [],
  eventoRespostas: [],
  achados: [],
  cardapio: [],
  presencas: [],
  relatorios: [],
  acessos: [],
  atividades: [],
  historico: [],
  atestados: [],
  saidasAntecipadas: [],
  sessoesAtivas: [],
  visitas: [],
  atividadesAvaliativas: [],
  vapid: null,
  pushSubscricoes: [],
  medicacoes: [],
}

export const db = new Low<DbSchema>(new JSONFile(file), defaultData)

export async function loadDb() {
  await db.read()
  db.data ||= structuredClone(defaultData)
  // Preenche coleções que ainda não existiam em um db.json salvo antes delas
  // serem adicionadas ao schema, em vez de exigir apagar o arquivo inteiro.
  for (const chave of Object.keys(defaultData) as (keyof DbSchema)[]) {
    if (db.data[chave] === undefined) {
      ;(db.data[chave] as unknown) = structuredClone(defaultData[chave])
    }
  }
  return db
}
