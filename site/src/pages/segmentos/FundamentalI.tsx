import { SiteHeader } from '../../components/SiteHeader.tsx'
import { SiteFooter } from '../../components/SiteFooter.tsx'
import { Container, Button, Eyebrow, PhotoSlot } from '../../components/ui.tsx'
import { whatsappLink } from '../../config.ts'
import { IconPena, IconLivroAberto, IconGlobo, IconRobo, IconProva, IconFala, IconFormas, IconDanca, IconNotaMusical } from '../../components/SegmentoIcons.tsx'
import { IconJudo, IconLupa } from '../../components/HomeIcons.tsx'

const PROJETOS = [
  {
    tone: 'green' as const,
    Icon: IconPena,
    titulo: 'Projeto Pequeno Escritor',
    texto:
      'Continua marcando presença, incentivando a criatividade literária, a expressão escrita e culminando no tradicional evento de autógrafos onde os alunos celebram a conquista de publicar o seu próprio livro.',
    foto: null,
  },
  {
    tone: 'blue' as const,
    Icon: IconLivroAberto,
    titulo: 'Ciranda do Livro',
    texto:
      'Momentos dedicados ao hábito da leitura e à troca de repertório literário, estimulando a imaginação e o prazer pela leitura de forma contínua.',
    foto: null,
  },
  {
    tone: 'mostarda' as const,
    Icon: IconRobo,
    titulo: 'Robótica Educacional',
    texto:
      'Um espaço onde a tecnologia se alia ao raciocínio lógico, à resolução de problemas e ao trabalho em equipe, permitindo que os alunos criem, experimentem e construam soluções práticas desde cedo.',
    foto: '/fotos/fundamental1-robotica.png',
  },
  {
    tone: 'red' as const,
    Icon: IconGlobo,
    titulo: 'Inglês com Cultura Inglesa',
    subtitulo: 'Carga horária estendida',
    texto:
      'Uma imersão diferenciada no idioma, utilizando o renomado material da Cultura Inglesa e uma carga horária ampliada para garantir fluência, naturalidade e confiança na comunicação em inglês.',
    foto: null,
  },
  {
    tone: 'navy' as const,
    Icon: IconProva,
    titulo: 'Simulado SAS',
    texto:
      'Avaliações formativas estruturadas com a qualidade do sistema SAS, que ajudam a desenvolver a cultura de estudo, a gestão do tempo e o monitoramento do desempenho acadêmico de forma gradual e segura.',
    foto: null,
  },
]

const AREAS = [
  { titulo: 'Linguagens', subtitulo: 'Língua Portuguesa e Produção de texto', texto: 'Domínio da leitura, interpretação de textos, produção escrita e oralidade.', Icon: IconFala },
  { titulo: 'Matemática', texto: 'Raciocínio lógico, resolução de situações-problema, operações e conceitos matemáticos aplicados ao cotidiano.', Icon: IconFormas },
  { titulo: 'Ciências da Natureza e Humanas', texto: 'Investigação do mundo físico, biológico, histórico e geográfico, estimulando a curiosidade científica e a cidadania.', Icon: IconLupa },
  { titulo: 'Inglês (Cultura Inglesa)', subtitulo: 'Carga horária estendida', texto: 'Desenvolvimento das habilidades de audição, fala, leitura e escrita na segunda língua.', Icon: IconGlobo },
  { titulo: 'Robótica', texto: 'Pensamento computacional e tecnologia aplicada à aprendizagem criativa.', Icon: IconRobo },
  { titulo: 'Aula de Música', texto: 'Aprofundamento musical, percepção rítmica e expressão artística coletiva.', Icon: IconNotaMusical },
  { titulo: 'Aula de Judô', subtitulo: 'Exclusivo para o 1º ano', texto: 'Desenvolvimento da disciplina, concentração, autocontrole e coordenação motora na transição para o Fundamental.', Icon: IconJudo },
  { titulo: 'Dança', subtitulo: 'Exclusivo para o 1º ano', texto: 'Consciência corporal, ritmo, expressão e socialização no início desta nova etapa.', Icon: IconDanca },
]

const toneBg: Record<string, string> = {
  green: 'bg-green-light text-green-dark',
  blue: 'bg-blue-light text-blue-dark',
  mostarda: 'bg-amber-light text-amber',
  navy: 'bg-navy/8 text-navy',
  red: 'bg-red-light text-red',
}

const toneBorder = ['border-l-blue', 'border-l-green', 'border-l-mostarda', 'border-l-red', 'border-l-navy']

export default function FundamentalI() {
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
              <Eyebrow tone="blue">1º ao 5º ano</Eyebrow>
            </div>
            <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.1] text-navy sm:text-5xl">
              Ensino Fundamental I
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              No Ensino Fundamental I do Colégio Vital Brazil, o conhecimento se expande e ganha novos significados.
              É o momento em que os alunos consolidam a alfabetização, desenvolvem o pensamento crítico e constroem
              autonomia intelectual e emocional. Unimos uma base acadêmica forte a projetos inovadores e afetivos,
              preparando as crianças para os desafios do futuro sem perder a essência do acolhimento.
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button to="/agende-visita">Agende sua visita</Button>
              <Button href={whatsappLink('Olá! Quero saber mais sobre o Ensino Fundamental I do Vital Brazil.')} variant="secondary">
                Fale no WhatsApp
              </Button>
            </div>
          </div>
          <img
            src="/fotos/projetos-laboratorio.png"
            alt="Alunos do Fundamental I em atividade prática de ciências"
            className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-[0_24px_60px_-25px_rgba(27,51,88,0.45)]"
          />
        </Container>
      </section>

      {/* PROJETOS E DIFERENCIAIS */}
      <section className="py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="mostarda">Projetos e diferenciais</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              O que torna nosso Fundamental I especial
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
            <Eyebrow tone="green">No dia a dia</Eyebrow>
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
            Vem conhecer o Fundamental I de perto
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">
            Agende sua visita e veja de perto as salas, o laboratório e os projetos dos alunos.
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
