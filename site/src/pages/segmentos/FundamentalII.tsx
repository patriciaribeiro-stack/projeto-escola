import { SiteHeader } from '../../components/SiteHeader.tsx'
import { SiteFooter } from '../../components/SiteFooter.tsx'
import { Container, Button, Eyebrow, PhotoSlot } from '../../components/ui.tsx'
import { whatsappLink } from '../../config.ts'
import {
  IconGlobo,
  IconRobo,
  IconProva,
  IconFala,
  IconFormas,
  IconFrasco,
  IconBussola,
  IconRelogio,
  IconPaleta,
} from '../../components/SegmentoIcons.tsx'

const PROJETOS = [
  {
    tone: 'green' as const,
    Icon: IconGlobo,
    titulo: 'Inglês com Carga Horária Estendida',
    subtitulo: 'Material Cultura Inglesa',
    texto:
      'Continuidade do programa de imersão no idioma, utilizando o renomado material da Cultura Inglesa com ampliação de carga horária, garantindo um nível avançado de proficiência, leitura e comunicação global.',
    foto: null,
  },
  {
    tone: 'blue' as const,
    Icon: IconRobo,
    titulo: 'Robótica Educacional',
    texto:
      'Aprofundamento tecnológico focado em programação, lógica avançada, resolução de problemas complexos e projetos colaborativos de engenharia e automação.',
    foto: '/fotos/projetos-descoberta.png',
  },
  {
    tone: 'mostarda' as const,
    Icon: IconFrasco,
    titulo: 'Feira de Ciências',
    texto:
      'Um evento marcante de investigação científica onde os alunos aplicam o método experimental, desenvolvem pesquisas aprofundadas e apresentam projetos inovadores à comunidade escolar.',
    foto: null,
  },
  {
    tone: 'red' as const,
    Icon: IconPaleta,
    titulo: 'Mostra Cultural',
    texto:
      'Um espaço multidisciplinar de expressão artística, histórica e social, onde os estudantes expõem trabalhos autorais, reflexões críticas e produções culturais.',
    foto: '/fotos/atividades-feira-cultural.png',
  },
  {
    tone: 'navy' as const,
    Icon: IconBussola,
    titulo: 'Olimpíadas do Conhecimento',
    subtitulo: 'Canguru · OBMEP · ONC',
    texto:
      'Estímulo ao alto desempenho e ao raciocínio lógico através da preparação e participação ativa em competições de destaque nacional: a Olimpíada Canguru de Matemática, a OBMEP (Olimpíada Brasileira de Matemática das Escolas Públicas) e a ONC (Olimpíada Nacional de Ciências).',
    foto: null,
  },
  {
    tone: 'green' as const,
    Icon: IconProva,
    titulo: 'Simulado SAS',
    texto:
      'Avaliações diagnósticas de alto nível estruturadas pelo sistema SAS, fundamentais para treinar a gestão de tempo, o foco sob pressão e o monitoramento do rendimento acadêmico alinhado aos grandes exames.',
    foto: null,
  },
  {
    tone: 'blue' as const,
    Icon: IconRelogio,
    titulo: 'Intervalos com Atividades Dirigidas',
    texto:
      'Momentos de socialização saudável, integração e bem-estar planejados para equilibrar a rotina intensa de estudos.',
    foto: null,
  },
]

const AREAS = [
  { titulo: 'Língua Portuguesa e Literatura', texto: 'Produção textual avançada, análise linguística, argumentação e repertório literário aprofundado.', Icon: IconFala },
  { titulo: 'Matemática', texto: 'Álgebra, geometria, raciocínio lógico complexo e aplicação prática de conceitos matemáticos.', Icon: IconFormas },
  { titulo: 'Ciências, Biologia, Física e Química', subtitulo: 'Aulas de laboratório', texto: 'Aulas práticas frequentes em laboratório equipado, onde a teoria ganha vida por meio de experimentos reais, investigação científica e método analítico.', Icon: IconFrasco },
  { titulo: 'História e Geografia', texto: 'Compreensão crítica das dinâmicas sociais, geopolíticas, históricas e ambientais do Brasil e do mundo.', Icon: IconBussola },
  { titulo: 'Inglês (Cultura Inglesa)', subtitulo: 'Carga horária estendida', texto: 'Consolidação definitiva da fluência e das competências comunicativas na segunda língua.', Icon: IconGlobo },
  { titulo: 'Robótica', texto: 'Desenvolvimento de projetos tecnológicos avançados e pensamento computacional.', Icon: IconRobo },
  { titulo: 'Artes', subtitulo: 'Duas aulas semanais', texto: 'Espaço dedicado à apreciação estética, história da arte, técnicas expressivas aprofundadas e projetos autorais.', Icon: IconPaleta },
]

const toneBg: Record<string, string> = {
  green: 'bg-green-light text-green-dark',
  blue: 'bg-blue-light text-blue-dark',
  mostarda: 'bg-amber-light text-amber',
  navy: 'bg-navy/8 text-navy',
  red: 'bg-red-light text-red',
}

const toneBorder = ['border-l-green', 'border-l-blue', 'border-l-mostarda', 'border-l-navy', 'border-l-red', 'border-l-green', 'border-l-blue', 'border-l-mostarda']

export default function FundamentalII() {
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
              <Eyebrow tone="green">6º ao 9º ano</Eyebrow>
            </div>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.1] text-navy sm:text-5xl">
              Ensino Fundamental II
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              No Ensino Fundamental II, acompanhamos os estudantes em uma fase de profundas transformações. Unimos
              rigor acadêmico, suporte socioemocional e estímulo ao pensamento crítico, preparando nossos alunos
              para assumirem um papel ativo, autônomo e protagonista em sua trajetória de estudos e no mundo.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button to="/agende-visita">Agende sua visita</Button>
              <Button href={whatsappLink('Olá! Quero saber mais sobre o Ensino Fundamental II do Vital Brazil.')} variant="secondary">
                Fale no WhatsApp
              </Button>
            </div>
          </div>
          <img
            src="/fotos/fundamental2-lupa.png"
            alt="Aluna do Fundamental II em atividade de investigação científica"
            className="aspect-[4/5] w-full rounded-[2rem] object-cover object-top shadow-[0_24px_60px_-25px_rgba(27,51,88,0.45)]"
          />
        </Container>
      </section>

      {/* PROJETOS E DIFERENCIAIS */}
      <section className="py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="mostarda">Projetos e diferenciais</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              O que torna nosso Fundamental II especial
            </h2>
          </div>
          <div className="mt-14 flex flex-col gap-14 lg:gap-20">
            {PROJETOS.map((p, i) => (
              <div key={p.titulo} className="grid items-center gap-6 lg:grid-cols-2 lg:gap-14">
                {p.foto ? (
                  <img
                    src={p.foto}
                    alt={p.titulo}
                    className={`aspect-video w-full rounded-2xl bg-paper-sunken object-contain ${i % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}
                  />
                ) : (
                  <PhotoSlot
                    label={`Foto — ${p.titulo}`}
                    className={`aspect-video w-full ${i % 2 === 0 ? 'lg:order-1' : 'lg:order-2'}`}
                  />
                )}
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
            <Eyebrow tone="blue">No dia a dia</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Nossa rotina e áreas de conhecimento
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {AREAS.map((a, i) => (
              <div key={a.titulo} className={`flex gap-3.5 rounded-xl border-l-4 bg-paper-raised p-5 ${toneBorder[i % toneBorder.length]}`}>
                <a.Icon className="h-6 w-6 flex-none text-navy/70" />
                <div>
                  <h3 className="font-display text-base font-semibold text-navy">{a.titulo}</h3>
                  {a.subtitulo && <p className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-wide text-faint">{a.subtitulo}</p>}
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
            Vem conhecer o Fundamental II de perto
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">
            Agende sua visita e veja de perto os laboratórios, projetos e a rotina dos nossos alunos.
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
