import { Container, Button } from './ui.tsx'
import { SCHOOL, whatsappLink } from '../config.ts'

// Embed oficial gerado pelo painel "Compartilhar > Incorporar um mapa" da ficha
// real do colégio no Google Maps (não usar o atalho "?q=...&output=embed" — o
// Google bloqueia esse formato com X-Frame-Options e o mapa fica em branco).
const mapaSrc =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3657.3168041151!2d-46.650056199999995!3d-23.557062799999997!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94ce59b5bfca8e29%3A0x3ef05d5fe4e62fe2!2sCol%C3%A9gio%20Vital%20Brazil!5e0!3m2!1spt-BR!2sbr!4v1785552658325!5m2!1spt-BR!2sbr'

export function SiteFooter() {
  return (
    <footer className="bg-navy text-white">
      <Container className="flex flex-col items-center py-14 text-center">
        <img src="/logo-escola.png" alt={SCHOOL.nome} className="h-14 w-14 rounded-full object-cover" />
        <span className="mt-3 font-display text-lg font-semibold">{SCHOOL.nome}</span>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
          Há {SCHOOL.anosDeHistoria} anos no bairro {SCHOOL.bairro}, educando com afeto do Berçário ao Fundamental
          II.
        </p>
        <Button href={whatsappLink('Olá! Vim pelo site e quero saber mais sobre o Vital Brazil.')} variant="onDark" className="mt-6">
          Fale no WhatsApp
        </Button>

        <div className="mt-12 grid w-full max-w-2xl gap-8 sm:grid-cols-2">
          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white/50">Contato</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/80">
              <li>{SCHOOL.telefones[0]}</li>
              <li>{SCHOOL.telefones[1]}</li>
              <li className="break-all">{SCHOOL.email}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-white/50">Endereço</h3>
            <p className="mt-4 text-sm leading-relaxed text-white/80">{SCHOOL.endereco}</p>
            <p className="mt-3 text-sm text-white/60">{SCHOOL.horario}</p>
          </div>
        </div>

        <iframe
          src={mapaSrc}
          title={`Localização do ${SCHOOL.nome}`}
          className="mt-10 h-56 w-full max-w-2xl rounded-2xl border-0 grayscale invert"
          loading="lazy"
        />
      </Container>

      <div className="border-t border-white/10 py-5">
        <Container className="flex flex-col items-center gap-2 text-center text-xs text-white/50">
          <span>© {new Date().getFullYear()} {SCHOOL.nome}. Todos os direitos reservados.</span>
          <span>{SCHOOL.anosDeHistoria} anos formando alunos na {SCHOOL.bairro}.</span>
        </Container>
      </div>
    </footer>
  )
}
