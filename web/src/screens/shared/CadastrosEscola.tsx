import { useState } from 'react'
import { TurmasCadastro, MateriasCadastro } from './CadastrosPessoas'
import { CalendarioCadastro } from './Calendario'

type Sub = 'turmas' | 'materias' | 'calendario'

export function CadastrosEscola() {
  const [sub, setSub] = useState<Sub>('turmas')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['turmas', 'Turmas'],
            ['materias', 'Matérias'],
            ['calendario', 'Calendário'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'turmas' && <TurmasCadastro />}
      {sub === 'materias' && <MateriasCadastro />}
      {sub === 'calendario' && <CalendarioCadastro />}
    </div>
  )
}
