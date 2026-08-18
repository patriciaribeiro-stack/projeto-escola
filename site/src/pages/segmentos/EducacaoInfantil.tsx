import { SiteHeader } from '../../components/SiteHeader.tsx'
import { SiteFooter } from '../../components/SiteFooter.tsx'
import { Container, Button, Eyebrow } from '../../components/ui.tsx'
import { whatsappLink } from '../../config.ts'
import {
  IconPena,
  IconLivroAberto,
  IconPaleta,
  IconRespirar,
  IconCheck,
  IconFala,
  IconFormas,
  IconFolha,
  IconDanca,
  IconGlobo,
  IconNotaMusical,
} from '../../components/SegmentoIcons.tsx'
import { IconCorrida, IconJudo } from '../../components/HomeIcons.tsx'

const PROPOSTA = [
  'Desenvolvimento socioemocional',
  'Estímulo à curiosidade e ao pensamento crítico',
  'Parceria constante com as famílias',
]

const PROJETOS = [
  {
    tone: 'green' as const,
    Icon: IconPena,
    titulo: 'Projeto Pequeno Escritor',
    texto:
      'Um dos momentos mais marcantes da nossa proposta pedagógica. Nele, as crianças vivenciam o processo de criação literária, desenvolvem a imaginação e se tornam autoras de seus próprios livros, culminando em um emocionante evento de autógrafos com as famílias.',
    foto: '/fotos/infantil-pequeno-escritor.jpg',
    fotoClasse: 'aspect-[4/3] object-contain bg-paper-sunken',
  },
  {
    tone: 'blue' as const,
    Icon: IconLivroAberto,
    titulo: 'Ciranda do Livro',
    subtitulo: 'Todas as sextas-feiras',
    texto:
      'Um momento especial dedicado ao incentivo à leitura e à imaginação. As crianças levam livros para casa para compartilhar a leitura com a família, estreitando o vínculo entre o lar, a escola e o universo literário desde cedo.',
    foto: '/fotos/infantil-ciranda-livro.jpg',
    fotoClasse: 'aspect-[4/3] object-contain bg-paper-sunken',
  },
  {
    tone: 'mostarda' as const,
    Icon: IconPaleta,
    titulo: 'Ateliê de Artes',
    texto:
      'Um espaço dedicado à livre expressão, onde os pequenos experimentam diferentes texturas, materiais e técnicas, estimulando a criatividade, a coordenação motora e a sensibilidade estética.',
    foto: '/fotos/infantil-atelie.jpg',
    fotoClasse: 'aspect-[4/3] object-contain bg-paper-sunken',
  },
  {
    tone: 'red' as const,
    Icon: IconRespirar,
    titulo: 'Segunda-feira do Mindfulness',
    texto:
      'Práticas de atenção plena adaptadas para a infância, que ajudam as crianças a reconhecerem suas emoções, desenvolverem a concentração e começarem a semana com mais calma, equilíbrio e bem-estar.',
    foto: '/fotos/infantil-mindfulness.jpg',
    fotoClasse: 'aspect-[4/3] object-contain bg-paper-sunken',
  },
]

const AREAS = [
  { titulo: 'Linguagem Oral e Escrita', texto: 'Ampliação do vocabulário, contação de histórias e estímulo ao letramento de forma lúdica e natural.', Icon: IconFala },
  { titulo: 'Matemática', texto: 'Introdução aos conceitos matemáticos através de jogos, contagens, exploração de espaço e raciocínio lógico no cotidiano.', Icon: IconFormas },
  { titulo: 'Natureza e Sociedade', texto: 'Descobertas sobre o mundo ao redor, ciência, meio ambiente, hábitos de higiene e convivência social.', Icon: IconFolha },
  { titulo: 'Corpo e Movimento', texto: 'Atividades que favorecem a consciência corporal, o equilíbrio, a autonomia e a coordenação motora ampla.', Icon: IconCorrida },
  { titulo: 'Artes e Ateliê', texto: 'Expressão criativa por meio de diferentes linguagens artísticas.', Icon: IconPaleta },
  { titulo: 'Aula de Música', texto: 'Sensibilização sonora, ritmo, percepção auditiva e muita alegria coletiva.', Icon: IconNotaMusical },
  { titulo: 'Dança', texto: 'Expressão corporal, ritmo, lateralidade e socialização através do movimento.', Icon: IconDanca },
  { titulo: 'Judô', texto: 'Desenvolvimento da disciplina, do respeito mútuo, da concentração e da coordenação motora.', Icon: IconJudo },
  { titulo: 'Inglês', texto: 'Contato lúdico e natural com a segunda língua por meio de brincadeiras, músicas e interações do dia a dia.', Icon: IconGlobo },
]

const toneBg: Record<string, string> = {
  green: 'bg-green-light text-green-dark',
  blue: 'bg-blue-light text-blue-dark',
  mostarda: 'bg-amber-light text-amber',
  navy: 'bg-navy/8 text-navy',
  red: 'bg-red-light text-red',
}

const toneBorder = ['border-l-green', 'border-l-blue', 'border-l-mostarda', 'border-l-red', 'border-l-navy']

export default function EducacaoInfantil() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      {/* INTRO */}
      <section className="relative overflow-hidden">
        <Container className="grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <a href="/#segmentos" className="text-sm font-medium text-muted hover:text-navy">
              ← Segmentos
            </a>
            <div className="mt-5">
              <Eyebrow tone="red">2 a 5 anos</Eyebrow>
            </div>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.1] text-navy sm:text-5xl">
              Educação Infantil
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              Na Educação Infantil do Colégio Vital Brazil, acreditamos que a infância é o tempo de explorar, criar
              e construir vínculos. Nosso ambiente foi pensado para acolher cada criança em sua singularidade,
              unindo afeto, segurança e estímulos pedagógicos que despertam o gosto pelo aprendizado desde os
              primeiros anos.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button to="/agende-visita">Agende sua visita</Button>
              <Button href={whatsappLink('Olá! Quero saber mais sobre a Educação Infantil do Vital Brazil.')} variant="secondary">
                Fale no WhatsApp
              </Button>
            </div>
          </div>
          <img
            src="/fotos/infantil-rodinha.png"
            alt="Crianças da Educação Infantil do Vital Brazil em roda"
            className="aspect-[4/5] w-full rounded-[2rem] object-cover object-top shadow-[0_24px_60px_-25px_rgba(27,51,88,0.45)]"
          />
        </Container>
      </section>

      {/* PROPOSTA PEDAGÓGICA */}
      <section className="bg-paper-sunken py-16 lg:py-20">
        <Container>
          <Eyebrow tone="blue">Nossa proposta pedagógica</Eyebrow>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {PROPOSTA.map((p) => (
              <div key={p} className="flex flex-col items-center justify-center gap-2.5 rounded-2xl bg-paper-raised px-5 py-6 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-green-light">
                  <IconCheck className="h-4 w-4 text-green-dark" />
                </span>
                <p className="text-sm font-medium leading-snug text-navy">{p}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PROJETOS E DIFERENCIAIS */}
      <section className="py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="mostarda">Projetos e diferenciais</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              O que torna nossa Educação Infantil especial
            </h2>
          </div>
          <div className="mt-14 flex flex-col gap-14 lg:gap-20">
            {PROJETOS.map((p, i) => (
              <div key={p.titulo} className="grid items-center gap-6 lg:grid-cols-2 lg:gap-14">
                <img
                  src={p.foto}
                  alt={p.titulo}
                  className={`w-full rounded-2xl ${p.fotoClasse} ${i % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}
                />
                <div className={i % 2 === 0 ? 'lg:order-2' : 'lg:order-1'}>
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${toneBg[p.tone]}`}>
                    <p.Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-navy">{p.titulo}</h3>
                  {p.subtitulo && <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-faint">{p.subtitulo}</p>}
                  <p className="mt-3 text-[0.98rem] leading-relaxed text-muted">{p.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ROTINA E ÁREAS DE CONHECIMENTO */}
      <section className="bg-paper-sunken py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="green">No dia a dia</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Nossa rotina e áreas de conhecimento
            </h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">
              Na Educação Infantil do Colégio Vital Brazil, o dia a dia é planejado para unir afeto, segurança e
              estímulos adequados a cada faixa etária. Nossa rotina integra momentos de descobertas, brincadeiras e
              aprendizados essenciais para o desenvolvimento integral.
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((a, i) => (
              <div key={a.titulo} className={`flex gap-3.5 rounded-xl border-l-4 bg-paper-raised p-5 ${toneBorder[i % toneBorder.length]}`}>
                <a.Icon className="h-6 w-6 flex-none text-navy/70" />
                <div>
                  <h3 className="font-display text-base font-semibold text-navy">{a.titulo}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{a.texto}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* CTA FINAL */}
      <section className="bg-green py-16 text-center text-white lg:py-20">
        <Container>
          <h2 className="text-balance font-display text-3xl font-semibold sm:text-4xl">
            Vem conhecer a Educação Infantil de perto
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">
            Agende sua visita e veja de perto a rotina, o ateliê e a sala de aula dos pequenos.
          </p>
          <div className="mt-8">
            <Button to="/agende-visita" variant="onGreen">
              Agende sua visita
            </Button>
          </div>
        </Container>
      </section>

      <SiteFooter />
    </div>
  )
}
