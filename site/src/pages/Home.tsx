import { Link } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader.tsx'
import { SiteFooter } from '../components/SiteFooter.tsx'
import { Container, Button, Eyebrow, PhotoSlot } from '../components/ui.tsx'
import { SCHOOL, whatsappLink } from '../config.ts'
import { IconAbraco, IconLivro, IconLupa, IconGrupo, IconJudo, IconMusica, IconTeatro, IconBola } from '../components/HomeIcons.tsx'

const PILARES = [
  {
    tone: 'green' as const,
    titulo: 'Educação com afetividade',
    texto:
      'Nossa essência é o acolhimento. Trabalhamos com o conceito de grande família: turmas pequenas para que o professor conheça cada criança pelo nome, sua história e seu ritmo de aprender.',
    Icon: IconAbraco,
  },
  {
    tone: 'blue' as const,
    titulo: 'Material de excelência (SAS)',
    texto: 'Utilizamos o material didático do SAS, referência nacional em qualidade de ensino e tecnologia educacional, preparando os alunos para os desafios acadêmicos.',
    Icon: IconLivro,
  },
  {
    tone: 'mostarda' as const,
    titulo: 'Diagnóstico precoce',
    texto: 'Acompanhamento próximo de cada aluno para identificar dificuldades cedo e agir antes que virem defasagem.',
    Icon: IconLupa,
  },
  {
    tone: 'navy' as const,
    titulo: 'Turmas reduzidas',
    texto: 'Grupos pequenos para atenção de verdade — o professor conhece cada aluno, não só a turma.',
    Icon: IconGrupo,
  },
]

const SEGMENTOS = [
  {
    tone: 'mostarda' as const,
    nome: 'Berçário',
    faixa: '4 meses a 1 ano e 11 meses',
    texto: 'Cuidado, rotina e estímulo sensorial num ambiente seguro e acolhedor.',
    foto: null,
    link: null,
  },
  {
    tone: 'red' as const,
    nome: 'Educação Infantil',
    faixa: '2 a 5 anos',
    texto:
      'Um ambiente seguro e estimulante. Além da alfabetização lúdica, realizamos atividades de Mindfulness todas as segundas-feiras, promovendo o foco e a inteligência emocional desde cedo.',
    foto: '/fotos/infantil-rodinha.png',
    link: '/segmentos/educacao-infantil',
  },
  {
    tone: 'blue' as const,
    nome: 'Fundamental I',
    faixa: '1º ao 5º ano',
    texto:
      'A partir do 3º ano, introduzimos o pensamento computacional com aulas de Robótica. A partir do 5º ano, os alunos têm aulas práticas de Laboratório, vivenciando a ciência na prática.',
    foto: '/fotos/fundamental1-robotica.png',
    link: '/segmentos/fundamental-i',
  },
  {
    tone: 'green' as const,
    nome: 'Fundamental II',
    faixa: '6º ao 9º ano',
    texto:
      'Um currículo robusto que prepara para o Ensino Médio. Nossos alunos desenvolvem projetos interdisciplinares como a Feira de Ciências e a Mostra Cultural, aprendendo a investigar, argumentar e criar.',
    foto: '/fotos/fundamental2-lupa.png',
    link: '/segmentos/fundamental-ii',
  },
]

const ATIVIDADES = [
  { nome: 'Judô', beneficio: 'Disciplina, respeito e controle do corpo através da luta.', tone: 'navy' as const, Icon: IconJudo },
  { nome: 'Jazz', beneficio: 'Ritmo, expressão corporal e trabalho em equipe através da dança.', tone: 'red' as const, Icon: IconMusica },
  { nome: 'Teatro', beneficio: 'Confiança, oratória e criatividade em cena.', tone: 'mostarda' as const, Icon: IconTeatro },
  { nome: 'Futsal', beneficio: 'Cooperação, estratégia e espírito de equipe em quadra.', tone: 'green' as const, Icon: IconBola },
]

const FAQ = [
  {
    pergunta: 'Preciso agendar visita antes de matricular?',
    resposta: 'Sim. A matrícula é sempre presencial, então a visita é o primeiro passo — é nela que você conhece a estrutura e conversa com a coordenação.',
  },
  {
    pergunta: 'Quais turnos vocês oferecem?',
    resposta: 'Manhã, tarde e período integral, conforme o segmento. A gente confirma a disponibilidade com você na visita.',
  },
  {
    pergunta: 'A partir de que idade posso matricular meu filho?',
    resposta: 'A partir de 4 meses, no Berçário, até o 9º ano do Fundamental II.',
  },
]

const toneBg: Record<string, string> = {
  green: 'bg-green-light text-green-dark',
  blue: 'bg-blue-light text-blue-dark',
  mostarda: 'bg-amber-light text-amber',
  navy: 'bg-navy/8 text-navy',
  red: 'bg-red-light text-red',
}

export default function Home() {
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      {/* HERO */}
      <section id="topo" className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(#1b3358 0.7px, transparent 0.7px)', backgroundSize: '14px 14px' }}
          aria-hidden="true"
        />
        <Container className="relative grid items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div>
            <Eyebrow>{SCHOOL.anosDeHistoria} anos na {SCHOOL.bairro}</Eyebrow>
            <h1 className="mt-5 text-balance font-display text-[2.15rem] font-semibold leading-[1.18] text-navy sm:text-4xl">
              Mais do que uma escola, um lugar onde cada criança é chamada pelo nome e acolhida como parte da nossa
              família.
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">Venha conhecer nossa rotina de perto.</p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Button to="/agende-visita">Agende sua visita</Button>
              <Button href={whatsappLink('Olá! Vim pelo site e quero saber mais sobre o Vital Brazil.')} variant="secondary">
                Fale no WhatsApp
              </Button>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-md">
            <div className="absolute -left-4 top-6 h-24 w-24 rounded-full bg-mostarda/20 blur-md sm:h-32 sm:w-32" />
            <div className="absolute bottom-8 right-0 h-20 w-20 rounded-full bg-blue/15 blur-md sm:h-28 sm:w-28" />
            <img
              src="/fotos/hero-tunel.png"
              alt="Alunos do Vital Brazil brincando juntos"
              className="relative h-full w-full rounded-[2rem] object-cover shadow-[0_24px_60px_-25px_rgba(27,51,88,0.45)]"
            />
            <div className="absolute -bottom-3 left-1/2 w-44 -translate-x-1/2 rounded-2xl bg-paper-raised px-5 py-3.5 text-center shadow-[0_16px_40px_-18px_rgba(27,51,88,0.4)] sm:left-auto sm:right-4 sm:translate-x-0 sm:rotate-2">
              <span className="font-display text-3xl font-semibold text-navy">{SCHOOL.anosDeHistoria}</span>
              <span className="ml-1.5 text-xs font-medium uppercase tracking-wide text-muted">anos de história</span>
            </div>
          </div>
        </Container>
      </section>

      {/* CONFIANÇA STRIP */}
      <section className="bg-navy py-6 text-white">
        <Container className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center text-sm font-medium sm:justify-between">
          <span>{SCHOOL.anosDeHistoria} anos de história</span>
          <span className="hidden h-4 w-px bg-white/20 sm:block" />
          <span>Berçário ao Fundamental II</span>
          <span className="hidden h-4 w-px bg-white/20 sm:block" />
          <span>Turmas reduzidas</span>
          <span className="hidden h-4 w-px bg-white/20 sm:block" />
          <span>Bairro {SCHOOL.bairro}, São Paulo</span>
        </Container>
      </section>

      {/* NOSSA HISTÓRIA */}
      <section id="sobre" className="relative overflow-hidden py-20 lg:py-28">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'radial-gradient(#1b3358 1px, transparent 1px)', backgroundSize: '20px 20px' }}
          aria-hidden="true"
        />
        <Container className="relative grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <Eyebrow tone="green">Nossa história</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Tradição que se renova todos os dias
            </h2>
            <p className="mt-5 text-[1.05rem] leading-relaxed text-muted">
              Desde 1980 na {SCHOOL.bairro}, o Colégio Vital Brazil acompanha o crescimento de gerações. O que
              começou com o sonho de oferecer um ensino forte, mas humanizado, continua vivo hoje: turmas enxutas,
              professores que conhecem a história de cada aluno e um olhar atento para antecipar qualquer
              dificuldade antes que ela vire um obstáculo.
            </p>
          </div>
          <img
            src="/fotos/fachada.png"
            alt="Fachada do Colégio Vital Brazil, na Bela Vista"
            className="aspect-[4/3] w-full rounded-2xl object-cover"
          />
        </Container>
      </section>

      {/* COMO EDUCAMOS / PILARES */}
      <section className="bg-paper-sunken py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="blue">Como educamos</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Uma escola pensada para conhecer cada aluno de verdade
            </h2>
          </div>
          <div className="mt-12 grid gap-4 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch">
            <img
              src="/fotos/professora-aluna.png"
              alt="Professora acompanhando de perto uma aluna em sua atividade"
              className="aspect-[3/4] w-full rounded-2xl object-cover lg:aspect-auto"
            />
            <div className="grid gap-6 sm:grid-cols-2">
              {PILARES.map((p) => (
                <div key={p.titulo} className="rounded-2xl border border-line bg-paper-raised p-7">
                  <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${toneBg[p.tone]}`}>
                    <p.Icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-5 font-display text-lg font-semibold text-navy">{p.titulo}</h3>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-muted">{p.texto}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* SEGMENTOS */}
      <section id="segmentos" className="py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="mostarda">Segmentos</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Do primeiro colo à véspera do Ensino Médio
            </h2>
            <p className="mt-3 text-[0.95rem] text-muted">
              Do primeiro passinho no Berçário aos desafios e descobertas do Fundamental II: acompanhamos cada etapa
              com a mesma dedicação.
            </p>
            <p className="mt-1.5 text-sm text-faint">
              Turmas de manhã, tarde e período integral, conforme o segmento — a gente confirma com você na visita.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {SEGMENTOS.map((s) => (
              <div key={s.nome} className="flex flex-col overflow-hidden rounded-2xl border-2 border-green/40 bg-paper-raised">
                {s.foto ? (
                  <img src={s.foto} alt={`Alunos do Vital Brazil — ${s.nome}`} className="aspect-[3/4] w-full object-cover" />
                ) : (
                  <PhotoSlot label={`Foto — ${s.nome}`} className="aspect-[3/4] rounded-none border-0 border-b border-dashed border-navy/15 bg-navy/[0.025]" />
                )}
                <div className="flex flex-1 flex-col p-6">
                  <span className={`self-start rounded-full px-2.5 py-1 text-xs font-semibold ${toneBg[s.tone]}`}>{s.faixa}</span>
                  <h3 className="mt-4 font-display text-lg font-semibold text-navy">{s.nome}</h3>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{s.texto}</p>
                  {s.link && (
                    <Link to={s.link} className="mt-4 text-sm font-semibold text-green-dark hover:underline">
                      Saiba mais →
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* PROJETOS INTERDISCIPLINARES */}
      <section className="py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="blue">Aprender fazendo</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Projetos interdisciplinares
            </h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">
              Momentos em que os alunos unem teoria e prática, expondo descobertas e desenvolvendo autonomia.
            </p>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">
              Oferecemos um leque de atividades para o desenvolvimento integral: parceria com a Cultura Inglesa com
              carga horária estendida de inglês, aulas de laboratório e robótica, e projetos interdisciplinares como
              o Pequeno Escritor, a Feira de Ciências e a Mostra Cultural.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <img
              src="/fotos/atividades-feira-cultural.png"
              alt="Aluna apresentando projeto na Mostra Cultural do Vital Brazil"
              className="aspect-square w-full rounded-2xl object-cover object-top"
            />
            <img
              src="/fotos/projetos-laboratorio.png"
              alt="Alunos em experimento de ciências no Vital Brazil"
              className="aspect-square w-full rounded-2xl object-cover"
            />
            <img
              src="/fotos/projetos-descoberta.png"
              alt="Aluna com projeto de robótica no Vital Brazil"
              className="aspect-square w-full rounded-2xl object-cover object-top"
            />
          </div>
        </Container>
      </section>

      {/* ATIVIDADES */}
      <section id="atividades" className="bg-paper-sunken py-20 lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="red">Além da sala de aula</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Atividades extracurriculares
            </h2>
            <p className="mt-4 text-[1.02rem] leading-relaxed text-muted">
              Além da grade curricular, os alunos participam de atividades que estimulam o corpo, a criatividade e o
              trabalho em equipe.
            </p>
          </div>

          <p className="mt-12 text-sm text-faint">Toque numa atividade para tirar dúvidas direto com a secretaria.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ATIVIDADES.map((a) => (
              <a
                key={a.nome}
                href={whatsappLink(`Olá! Gostaria de saber mais sobre a atividade de ${a.nome} no Vital Brazil.`)}
                className="group flex flex-col rounded-2xl border border-line bg-paper-raised p-5 transition-colors hover:border-green"
              >
                <span className={`inline-flex h-11 w-11 items-center justify-center rounded-full ${toneBg[a.tone]}`}>
                  <a.Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-semibold text-navy">{a.nome}</h3>
                <p className="mt-1.5 flex-1 text-[0.83rem] leading-relaxed text-muted">{a.beneficio}</p>
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* DEPOIMENTOS (placeholder honesto) */}
      <section className="bg-navy py-20 text-white lg:py-28">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow tone="mostarda">Famílias Vital Brazil</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold sm:text-4xl">
              O que as famílias dizem
            </h2>
            <p className="mt-3 text-[0.95rem] text-white/70">
              Espaço reservado para depoimentos reais. Assim que vocês tiverem 2 ou 3 frases de pais que topem ser
              citados, eu troco estes cartões pelos depoimentos de verdade.
            </p>
          </div>
          <div className="mt-9 grid gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex h-40 items-center justify-center rounded-2xl border-2 border-dashed border-white/25 p-6 text-center text-sm text-white/50">
                Depoimento em breve
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* FAQ */}
      <section className="py-20 lg:py-28">
        <Container className="grid gap-12 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <Eyebrow tone="mostarda">Dúvidas comuns</Eyebrow>
            <h2 className="mt-4 text-balance font-display text-3xl font-semibold text-navy sm:text-4xl">
              Perguntas frequentes
            </h2>
          </div>
          <div>
            <div className="flex flex-col divide-y divide-line">
              {FAQ.map((f) => (
                <div key={f.pergunta} className="py-5 first:pt-0">
                  <p className="font-display text-base font-semibold text-navy">{f.pergunta}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.resposta}</p>
                </div>
              ))}
            </div>
            <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl bg-green px-6 py-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-display text-lg font-semibold text-white">
                Ficou com alguma dúvida específica? Fale direto com a nossa secretaria pelo WhatsApp!
              </p>
              <Button href={whatsappLink('Olá! Tenho uma dúvida sobre o Vital Brazil.')} variant="onGreen" className="flex-none">
                Fale no WhatsApp
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* CTA FINAL */}
      <section className="relative overflow-hidden py-20 text-center text-white lg:py-28">
        <img src="/fotos/cta-quadra.png" alt="Quadra coberta do Vital Brazil" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/85 to-navy/55" />
        <Container className="relative">
          <h2 className="text-balance font-display text-3xl font-semibold sm:text-4xl">
            Seu filho merece estudar no Vital
          </h2>
          <p className="mx-auto mt-3 max-w-md text-white/85">
            Agende sua visita e conheça pessoalmente nossos diferenciais na {SCHOOL.bairro}!
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
