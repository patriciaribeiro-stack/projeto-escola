import { useState } from 'react'
import { TurmasCadastro, MateriasCadastro } from './CadastrosPessoas'
import { CalendarioCadastro } from './Calendario'
import { TabGroup, type TabOption } from '../../components/TabGroup'

type Sub = 'turmas' | 'materias' | 'calendario'

const TABS: TabOption<Sub>[] = [
  { key: 'turmas', label: 'Turmas' },
  { key: 'materias', label: 'Matérias' },
  { key: 'calendario', label: 'Calendário' },
]

export function CadastrosEscola() {
  const [sub, setSub] = useState<Sub>('turmas')
  return (
    <div className="flex flex-col gap-4">
      <TabGroup tabs={TABS} value={sub} onChange={setSub} />
      {sub === 'turmas' && <TurmasCadastro />}
      {sub === 'materias' && <MateriasCadastro />}
      {sub === 'calendario' && <CalendarioCadastro />}
    </div>
  )
}
