import { useState } from 'react'
import { CadastrosPessoas } from '../shared/CadastrosPessoas'
import { CadastrosEscola } from '../shared/CadastrosEscola'
import { CadastrosEquipe } from '../shared/CadastrosEquipe'
import { CardapioCadastro } from '../shared/CadastroCardapio'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Sub = 'pessoas' | 'escola' | 'cardapio' | 'equipe'

const TABS: TabOption<Sub>[] = [
  { key: 'pessoas', label: 'Alunos e responsáveis' },
  { key: 'escola', label: 'Turmas' },
  { key: 'cardapio', label: 'Cardápio' },
  { key: 'equipe', label: 'Acessos' },
]

export default function Cadastros() {
  const [sub, setSub] = useState<Sub>('pessoas')
  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={TABS} value={sub} onChange={setSub} />
      {sub === 'pessoas' && <CadastrosPessoas />}
      {sub === 'escola' && <CadastrosEscola />}
      {sub === 'cardapio' && <CardapioCadastro />}
      {sub === 'equipe' && <CadastrosEquipe />}
    </div>
  )
}
