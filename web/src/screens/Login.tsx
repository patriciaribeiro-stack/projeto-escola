import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '../session'
import type { Role } from '../types'
import { Button } from '../components/ui'

// Blobs orgânicos de fundo — só formas geométricas via SVG (sem imagem/foto),
// nas cores da identidade do app (mesmos tokens --color-tab-* do Painel).
function Blob({ className, cor, path }: { className: string; cor: string; path: string }) {
  return (
    <div className={`pointer-events-none absolute ${className}`}>
      <svg viewBox="0 0 200 200" className="h-full w-full">
        <path fill={cor} d={path} transform="translate(100 100)" />
      </svg>
    </div>
  )
}

const BLOB_PATH_1 = 'M45.7,-58.7C58.4,-49.6,67.4,-34.5,71.2,-18.1C75,-1.7,73.7,16,66.1,30.4C58.6,44.8,44.9,55.8,29.6,62.3C14.3,68.8,-2.5,70.8,-19.2,67.7C-35.9,64.6,-52.5,56.4,-62.6,42.9C-72.8,29.4,-76.5,10.6,-73.6,-6.6C-70.7,-23.8,-61.1,-39.4,-47.7,-48.7C-34.3,-58,-17.2,-61,0.5,-61.6C18.1,-62.3,33,-67.8,45.7,-58.7Z'
const BLOB_PATH_2 = 'M39.4,-51.8C50.4,-43.8,58.4,-30.8,62.1,-16.3C65.8,-1.9,65.2,14,58.9,26.9C52.6,39.8,40.6,49.7,27.1,56.2C13.6,62.7,-1.4,65.8,-16.2,63.5C-31,61.2,-45.6,53.5,-55.2,41.4C-64.8,29.3,-69.4,12.8,-68.3,-3.1C-67.2,-19,-60.4,-34.3,-49.2,-42.5C-38,-50.7,-22.4,-51.8,-6.9,-53.8C8.6,-55.8,17.2,-58.7,39.4,-51.8Z'
const BLOB_PATH_3 = 'M42.1,-54.4C53.8,-46.1,61.6,-32.1,64.9,-17.1C68.2,-2.1,67,13.9,60.2,27.4C53.5,40.9,41.2,51.9,27.1,58.1C13,64.3,-2.9,65.7,-18.2,62.2C-33.5,58.7,-48.2,50.3,-57.6,37.6C-67,24.9,-71.1,7.9,-68.9,-8.1C-66.7,-24.1,-58.2,-39.1,-45.9,-47.6C-33.6,-56.1,-16.8,-58.1,-0.4,-57.5C16,-56.9,32,-62.7,42.1,-54.4Z'
const BLOB_PATH_4 = 'M44.7,-58.2C57.4,-49.4,66.4,-34.7,69.9,-18.7C73.4,-2.7,71.4,14.6,63.9,29.1C56.4,43.6,43.4,55.3,28.5,61.7C13.6,68.1,-3.2,69.2,-19.2,65.4C-35.2,61.6,-50.4,52.9,-60.1,40C-69.8,27.1,-74,10,-71.8,-6.1C-69.6,-22.2,-61,-37.3,-48.5,-46.5C-36,-55.7,-19.6,-59,-2.1,-56.1C15.4,-53.2,32,-67,44.7,-58.2Z'
const BLOB_PATH_5 = 'M39.6,-51.1C50.3,-43.5,57,-29.8,60.1,-15.3C63.2,-0.8,62.7,14.5,56.1,26.9C49.5,39.3,36.8,48.8,22.7,54.6C8.6,60.4,-7,62.5,-21.9,58.9C-36.8,55.3,-51,46,-59.4,32.9C-67.8,19.8,-70.4,2.9,-67.1,-12.6C-63.8,-28.1,-54.6,-42.2,-42,-49.8C-29.4,-57.4,-14.7,-58.5,0.3,-59C15.3,-59.5,28.9,-58.7,39.6,-51.1Z'

const roleHome: Record<Role, string> = {
  pai: '/pais',
  professor: '/professor',
  coordenacao: '/coordenacao',
  secretaria: '/secretaria',
  recepcao: '/recepcao',
  integral: '/integral',
  substituto: '/substituto',
  aluno: '/aluno',
}

const inputCls = 'rounded-xl border border-line bg-paper-raised px-3.5 py-3 text-[14px] outline-none focus:border-blue'

type Modo = 'entrar' | 'ativar'

export default function Login() {
  const [modo, setModo] = useState<Modo>('entrar')
  const { login, ativar } = useSession()
  const navigate = useNavigate()

  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [codigoAcesso, setCodigoAcesso] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function entrar() {
    setErro('')
    setEnviando(true)
    try {
      const result = await login(telefone, senha)
      navigate(roleHome[result.role])
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  async function ativarConta() {
    setErro('')
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    if (senha !== confirmarSenha) return setErro('As senhas não coincidem.')
    setEnviando(true)
    try {
      await ativar(telefone, codigoAcesso, senha)
      navigate(roleHome.pai)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="bg-paper-textured flex min-h-dvh flex-col items-center justify-center px-6 py-10">
      <div className="relative w-full max-w-[440px] overflow-hidden">
        <Blob className="-left-[18%] -top-[6%] h-[45vw] max-h-[280px] w-[45vw] max-w-[280px] opacity-90" cor="var(--color-tab-sage)" path={BLOB_PATH_1} />
        <Blob className="-right-[20%] -top-[3%] h-[36vw] max-h-[230px] w-[36vw] max-w-[230px] opacity-55" cor="var(--color-tab-mustard)" path={BLOB_PATH_2} />
        <Blob className="-left-[16%] bottom-[24%] h-[33vw] max-h-[210px] w-[33vw] max-w-[210px] opacity-70" cor="var(--color-tab-terracotta)" path={BLOB_PATH_3} />
        <Blob className="-bottom-[7%] -right-[14%] h-[47vw] max-h-[300px] w-[47vw] max-w-[300px] opacity-85" cor="var(--color-tab-blue)" path={BLOB_PATH_4} />
        <Blob className="-right-[8%] top-[38%] h-[19vw] max-h-[120px] w-[19vw] max-w-[120px] opacity-40" cor="var(--color-tab-sage)" path={BLOB_PATH_5} />

        <div className="relative flex flex-col items-center">
          <div className="mb-2.5 flex items-center gap-3 rounded-[18px] bg-navy py-3 pl-3 pr-5 shadow-[0_10px_24px_-8px_rgba(36,57,91,0.45)]">
            <div className="flex h-[42px] w-[42px] flex-shrink-0 items-center justify-center rounded-xl bg-white">
              <span className="font-heading-painel text-[15px] font-bold text-navy">VB</span>
            </div>
            <span className="font-heading-painel text-[16.5px] font-bold text-white">Colégio Vital Brazil</span>
          </div>

          <div className="my-6 text-center">
            <h2 className="font-heading-painel text-[19px] font-semibold text-navy">Bem-vindo(a) de volta!</h2>
            <p className="mt-1 text-[13.5px] text-muted">Seu filho merece ser Vital</p>
          </div>

          <div className="flex w-full flex-col gap-3 rounded-[22px] border border-line bg-paper-raised px-5 py-6 shadow-[0_20px_40px_-16px_rgba(36,57,91,0.18)]">
            <label className="flex flex-col gap-1.5">
              <span className="pl-0.5 text-[11.5px] font-semibold text-muted">Telefone ou nome de acesso</span>
              <input
                autoComplete="off"
                className={inputCls}
                placeholder="Digite aqui"
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
              />
            </label>

            {modo === 'entrar' && (
              <label className="flex flex-col gap-1.5">
                <span className="pl-0.5 text-[11.5px] font-semibold text-muted">Senha</span>
                <input
                  autoComplete="off"
                  type="password"
                  className={inputCls}
                  placeholder="Digite aqui"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </label>
            )}

            {modo === 'ativar' && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="pl-0.5 text-[11.5px] font-semibold text-muted">Código de matrícula</span>
                  <input
                    autoComplete="off"
                    inputMode="numeric"
                    className={inputCls}
                    placeholder="Digite aqui"
                    value={codigoAcesso}
                    onChange={(e) => setCodigoAcesso(e.target.value.replace(/\D/g, ''))}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="pl-0.5 text-[11.5px] font-semibold text-muted">Escolha uma senha (mín. 6 caracteres)</span>
                  <input
                    autoComplete="off"
                    type="password"
                    className={inputCls}
                    placeholder="Digite aqui"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="pl-0.5 text-[11.5px] font-semibold text-muted">Confirme a senha</span>
                  <input
                    autoComplete="off"
                    type="password"
                    className={inputCls}
                    placeholder="Digite aqui"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
                </label>
              </>
            )}

            {erro && <p className="text-[12.5px] font-semibold text-red">{erro}</p>}

            <Button
              className="bg-tab-blue font-heading-painel shadow-[0_10px_20px_-8px_rgba(78,127,176,0.55)] active:bg-tab-blue"
              disabled={enviando || !telefone || !senha || (modo === 'ativar' && (!codigoAcesso || !confirmarSenha))}
              onClick={modo === 'entrar' ? entrar : ativarConta}
            >
              {enviando ? 'Aguarde...' : modo === 'entrar' ? 'Entrar' : 'Ativar acesso'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setModo(modo === 'entrar' ? 'ativar' : 'entrar')
                setErro('')
                setSenha('')
                setConfirmarSenha('')
              }}
              className="mt-1 text-center text-[13.5px] font-semibold text-tab-blue"
            >
              {modo === 'entrar' ? 'Recebi um código de matrícula da escola' : '← Já tenho senha, voltar ao login'}
            </button>
          </div>

          <p className="mt-6 text-center text-[11.5px] text-muted opacity-70">Ano letivo 2026</p>
        </div>
      </div>
    </div>
  )
}
