import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { ReactNode } from 'react'
import { SessionProvider, useSession } from './session'
import type { Role } from './types'
import Login from './screens/Login'

import PaisLayout from './screens/pais/PaisLayout'
import Inicio from './screens/pais/Inicio'
import MeuFilho from './screens/pais/MeuFilho'
import Escola from './screens/pais/Escola'
import Perfil from './screens/pais/Perfil'
import Consentimento from './screens/pais/Consentimento'
import RevisaoFicha from './screens/pais/RevisaoFicha'
import { precisaPreencherFicha } from './screens/shared/FichaResponsavel'
import RevisaoFichaMedica from './screens/pais/RevisaoFichaMedica'
import { precisaRevisarFichaMedica } from './screens/shared/FichaMedica'

import ProfessorLayout from './screens/professor/ProfessorLayout'
import Hoje from './screens/professor/Hoje'
import Presenca from './screens/professor/Presenca'
import Postar from './screens/professor/Postar'
import Acompanhar from './screens/professor/Acompanhar'
import Turma from './screens/professor/Turma'
import AlunoDetalhe from './screens/professor/AlunoDetalhe'
import SemanarioProfessor from './screens/professor/Semanario'

import CoordLayout from './screens/coordenacao/CoordLayout'
import Painel from './screens/coordenacao/Painel'
import CoordTurma from './screens/coordenacao/Turma'
import Notificacoes from './screens/coordenacao/Notificacoes'
import Registros from './screens/coordenacao/Registros'
import Eventos from './screens/coordenacao/Eventos'
import CoordPostar from './screens/coordenacao/Postar'

import SecretariaLayout from './screens/secretaria/SecretariaLayout'
import SecretariaCadastros from './screens/secretaria/Cadastros'
import SecretariaEventos from './screens/secretaria/Eventos'
import SecretariaRelatorios from './screens/secretaria/Relatorios'

import RecepcaoLayout from './screens/recepcao/RecepcaoLayout'
import RecepcaoVisitas from './screens/recepcao/Visitas'
import RecepcaoCardapio from './screens/recepcao/Cardapio'
import RecepcaoMedicacao from './screens/recepcao/Medicacao'
import RecepcaoImpressao from './screens/recepcao/Impressao'

import IntegralLayout from './screens/integral/IntegralLayout'
import IntegralAlmoco from './screens/integral/Almoco'
import IntegralLicoes from './screens/integral/Licoes'

import SubstitutoLayout from './screens/substituto/SubstitutoLayout'

import AlunoLayout from './screens/aluno/AlunoLayout'
import AlunoLicoes from './screens/aluno/Licoes'
import AlunoConteudoDia from './screens/aluno/ConteudoDia'

function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useSession()
  if (!session) return <Navigate to="/" replace />
  if (session.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireConsentimento({ children }: { children: ReactNode }) {
  const { pai, loadingDetail } = useSession()
  if (loadingDetail) return null
  if (pai && !pai.consentimentoEm) return <Consentimento />
  return <>{children}</>
}

function RequireFichaAtualizada({ children }: { children: ReactNode }) {
  const { pai, loadingDetail } = useSession()
  if (loadingDetail) return null
  if (pai && precisaPreencherFicha(pai)) return <RevisaoFicha pai={pai} />
  return <>{children}</>
}

function RequireFichaMedicaAtualizada({ children }: { children: ReactNode }) {
  const { filhos, loadingDetail } = useSession()
  if (loadingDetail) return null
  const pendente = filhos.find(precisaRevisarFichaMedica)
  if (pendente) return <RevisaoFichaMedica aluno={pendente} />
  return <>{children}</>
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />

      <Route
        path="/pais"
        element={
          <RequireRole role="pai">
            <RequireConsentimento>
              <RequireFichaAtualizada>
                <RequireFichaMedicaAtualizada>
                  <PaisLayout />
                </RequireFichaMedicaAtualizada>
              </RequireFichaAtualizada>
            </RequireConsentimento>
          </RequireRole>
        }
      >
        <Route index element={<Inicio />} />
        <Route path="filho" element={<MeuFilho />} />
        <Route path="escola" element={<Escola />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>

      <Route
        path="/professor"
        element={
          <RequireRole role="professor">
            <ProfessorLayout />
          </RequireRole>
        }
      >
        <Route index element={<Hoje />} />
        <Route path="presenca" element={<Presenca />} />
        <Route path="postar" element={<Postar />} />
        <Route path="acompanhar" element={<Acompanhar />} />
        <Route path="turma" element={<Turma />} />
        <Route path="turma/:alunoId" element={<AlunoDetalhe />} />
        <Route path="semanario" element={<SemanarioProfessor />} />
        <Route path="integral" element={<IntegralAlmoco />} />
        <Route path="integral/licoes" element={<IntegralLicoes />} />
      </Route>

      <Route
        path="/coordenacao"
        element={
          <RequireRole role="coordenacao">
            <CoordLayout />
          </RequireRole>
        }
      >
        <Route index element={<Painel />} />
        <Route path="postar" element={<CoordPostar />} />
        <Route path="turma" element={<CoordTurma />} />
        <Route path="notificacoes" element={<Notificacoes />} />
        <Route path="registros" element={<Registros />} />
        <Route path="eventos" element={<Eventos />} />
      </Route>

      <Route
        path="/secretaria"
        element={
          <RequireRole role="secretaria">
            <SecretariaLayout />
          </RequireRole>
        }
      >
        <Route index element={<SecretariaCadastros />} />
        <Route path="cadastros" element={<SecretariaCadastros />} />
        <Route path="eventos" element={<SecretariaEventos />} />
        <Route path="relatorios" element={<SecretariaRelatorios />} />
      </Route>

      <Route
        path="/recepcao"
        element={
          <RequireRole role="recepcao">
            <RecepcaoLayout />
          </RequireRole>
        }
      >
        <Route index element={<RecepcaoVisitas />} />
        <Route path="cardapio" element={<RecepcaoCardapio />} />
        <Route path="medicacao" element={<RecepcaoMedicacao />} />
        <Route path="impressao" element={<RecepcaoImpressao />} />
      </Route>

      <Route
        path="/integral"
        element={
          <RequireRole role="integral">
            <IntegralLayout />
          </RequireRole>
        }
      >
        <Route index element={<IntegralAlmoco />} />
        <Route path="licoes" element={<IntegralLicoes />} />
      </Route>

      <Route
        path="/substituto"
        element={
          <RequireRole role="substituto">
            <SubstitutoLayout />
          </RequireRole>
        }
      >
        <Route index element={<Hoje />} />
        <Route path="presenca" element={<Presenca />} />
        <Route path="postar" element={<Postar />} />
        <Route path="acompanhar" element={<Acompanhar />} />
        <Route path="turma" element={<Turma />} />
        <Route path="turma/:alunoId" element={<AlunoDetalhe />} />
      </Route>

      <Route
        path="/aluno"
        element={
          <RequireRole role="aluno">
            <AlunoLayout />
          </RequireRole>
        }
      >
        <Route index element={<AlunoLicoes />} />
        <Route path="conteudo" element={<AlunoConteudoDia />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter>
        <Router />
      </BrowserRouter>
    </SessionProvider>
  )
}
