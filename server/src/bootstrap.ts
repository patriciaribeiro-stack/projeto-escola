import { nanoid } from 'nanoid'
import bcrypt from 'bcryptjs'
import { loadDb } from './db.ts'

// Roda no build de todo deploy (ver render.yaml) — diferente de seed.ts,
// NUNCA sobrescreve dados existentes. Só cria a primeira conta de secretaria
// se o banco estiver completamente vazio, pra alguém conseguir entrar e
// cadastrar o resto (turmas, professores, alunos, pais) pela própria tela.
const TELEFONE_INICIAL = '00000000000'
const SENHA_INICIAL = 'trocar123'

async function main() {
  const db = await loadDb()

  if (db.data.secretarios.length > 0) {
    console.log('Bootstrap: já existe conta de secretaria, nada a fazer.')
    return
  }

  db.data.secretarios.push({
    id: nanoid(10),
    nome: 'Secretaria',
    telefone: TELEFONE_INICIAL,
    senhaHash: await bcrypt.hash(SENHA_INICIAL, 10),
    bloqueadoEm: null,
  })
  await db.write()
  console.log('Bootstrap: criada a primeira conta de secretaria.')
  console.log(`  Telefone: ${TELEFONE_INICIAL}`)
  console.log(`  Senha: ${SENHA_INICIAL}  (troque assim que entrar)`)
}

main()
