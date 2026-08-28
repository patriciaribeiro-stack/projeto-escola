import { useState } from 'react'
import { CadastrosPessoas } from '../shared/CadastrosPessoas'
import { CadastrosEscola } from '../shared/CadastrosEscola'
import { CadastrosEquipe } from '../shared/CadastrosEquipe'
import { CardapioCadastro } from '../shared/CadastroCardapio'

type Sub = 'pessoas' | 'escola' | 'cardapio' | 'equipe'

export default function Cadastros() {
  const [sub, setSub] = useState<Sub>('pessoas')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5 rounded-xl bg-paper-sunken p-1">
        {(
          [
            ['pessoas', 'Alunos e responsáveis'],
            ['escola', 'Turmas'],
            ['cardapio', 'Cardápio'],
            ['equipe', 'Acessos'],
          ] as [Sub, string][]
        ).map(([key, label]) => (
          <button key={key} onClick={() => setSub(key)} className={`flex-1 rounded-lg border border-line py-2 text-[12.5px] font-bold ${sub === key ? 'bg-paper-raised text-ink shadow-sm' : 'bg-green-light text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {sub === 'pessoas' && <CadastrosPessoas />}
      {sub === 'escola' && <CadastrosEscola />}
      {sub === 'cardapio' && <CardapioCadastro />}
      {sub === 'equipe' && <CadastrosEquipe />}
    </div>
  )
}
