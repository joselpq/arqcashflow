"use client";

import Link from "next/link";
import { useState } from "react";

export default function LandingPage() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const testimonials = [
    {
      name: "Ana Carolina Silva",
      role: "Arquiteta - Estúdio AC Arquitetura",
      text: "Antes eu vivia ansiosa sem saber se teria dinheiro no próximo mês. Agora tenho controle total do meu fluxo de caixa.",
      image: "/testimonial-1.jpg"
    },
    {
      name: "Roberto Mendes",
      role: "Engenheiro Civil - RM Projetos",
      text: "Nunca mais perdi um recebimento. O assistente IA me lembra de tudo e responde qualquer dúvida financeira na hora.",
      image: "/testimonial-2.jpg"
    },
    {
      name: "Carla Oliveira",
      role: "Advogada - Oliveira & Associados",
      text: "Simplesmente joguei minhas planilhas bagunçadas e em 5 minutos estava tudo organizado. Incrível!",
      image: "/testimonial-3.jpg"
    }
  ];

  const features = [
    {
      icon: "🤖",
      title: "Assistente IA Personal",
      description: "Um CFO pessoal disponível 24/7 para responder qualquer pergunta sobre suas finanças"
    },
    {
      icon: "📊",
      title: "Dashboard Inteligente",
      description: "Veja sua saúde financeira, próximos recebimentos e gastos em uma tela limpa e clara"
    },
    {
      icon: "📱",
      title: "Controle por WhatsApp",
      description: "Adicione contratos e despesas enviando uma mensagem ou foto pelo WhatsApp"
    },
    {
      icon: "🔔",
      title: "Alertas Automáticos",
      description: "Nunca mais perca um recebimento ou esqueça de pagar uma conta importante"
    },
    {
      icon: "📄",
      title: "Importação Automática",
      description: "Jogue suas planilhas e documentos bagunçados - organizamos tudo automaticamente"
    },
    {
      icon: "🎯",
      title: "Zero Configuração",
      description: "Sem complicação para configurar. Em 5 minutos você já está controlando suas finanças"
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-neutral-200/60 sticky top-0 z-50 backdrop-blur-sm bg-white/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 bg-neutral-900 rounded flex items-center justify-center">
                  <span className="text-white font-semibold text-xs">A</span>
                </div>
                <h1 className="text-lg font-semibold text-neutral-900 tracking-tight">Arnaldo</h1>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <Link
                href="/login"
                className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/register"
                className="bg-neutral-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
                Começar Grátis
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-900 leading-tight mb-6">
              Pare de viver ansioso com suas{" "}
              <span className="text-blue-600">finanças</span>
            </h1>
            <p className="text-xl sm:text-2xl text-neutral-600 mb-8 leading-relaxed">
              Para arquitetos, advogados, médicos e profissionais que querem controle financeiro
              sem complicação. Organize tudo em 5 minutos.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/register"
                className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
              >
                Começar Grátis Agora
              </Link>
              <button
                onClick={() => {
                  document.getElementById('solucao')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="border border-neutral-300 text-neutral-700 px-8 py-4 rounded-lg text-lg font-medium hover:bg-neutral-50 transition-colors"
              >
                Ver Como Funciona
              </button>
            </div>

            {/* Hero Visual */}
            <div className="relative max-w-5xl mx-auto">
              <div className="bg-gradient-to-br from-blue-50 to-neutral-50 rounded-2xl p-8 shadow-2xl border border-neutral-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-neutral-900">Saúde Financeira</h3>
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    </div>
                    <div className="text-2xl font-bold text-green-600 mb-1">R$ 47.280</div>
                    <div className="text-sm text-neutral-500">Lucro este mês</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-neutral-900">Próximos Recebimentos</h3>
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600 mb-1">R$ 23.500</div>
                    <div className="text-sm text-neutral-500">Próximos 30 dias</div>
                  </div>
                  <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-neutral-900">Alertas</h3>
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    </div>
                    <div className="text-2xl font-bold text-amber-600 mb-1">2</div>
                    <div className="text-sm text-neutral-500">Recebimentos atrasados</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-20 bg-neutral-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-6">
              Você se identifica com isso?
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              A maioria das pequenas empresas e profissionais liberais vivem esses problemas diariamente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">😰</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Ansiedade Financeira
              </h3>
              <p className="text-neutral-600">
                Não sabe se terá dinheiro no próximo mês. Vive preocupado se conseguirá pagar as contas.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Planilhas Bagunçadas
              </h3>
              <p className="text-neutral-600">
                Controla tudo em planilhas desorganizadas ou anotações espalhadas que ninguém entende.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">💸</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Recebimentos Perdidos
              </h3>
              <p className="text-neutral-600">
                Esquece de cobrar parcelas de clientes ou perde prazos de pagamentos importantes.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">❓</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Sem Visibilidade
              </h3>
              <p className="text-neutral-600">
                Não sabe quanto ganha de verdade, quanto gasta e qual é o lucro real do negócio.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">⏰</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Tempo Desperdiçado
              </h3>
              <p className="text-neutral-600">
                Gasta horas procurando informações financeiras que deviam estar na ponta dos dedos.
              </p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                Sobrecarga Mental
              </h3>
              <p className="text-neutral-600">
                A parte financeira consome energia mental que deveria estar focada no seu trabalho.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section id="solucao" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-6">
              A solução mais simples que existe
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Organizamos suas finanças sem complicação. Você foca no que sabe fazer melhor.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="space-y-8">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                      Jogue seus documentos
                    </h3>
                    <p className="text-neutral-600">
                      Envie suas planilhas, anotações ou documentos. Nossa IA organiza tudo automaticamente em segundos.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                      Controle pelo WhatsApp
                    </h3>
                    <p className="text-neutral-600">
                      Adicione novos contratos ou despesas simplesmente enviando uma mensagem ou foto pelo WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-blue-600 font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                      Tenha controle total
                    </h3>
                    <p className="text-neutral-600">
                      Dashboard limpo mostra sua saúde financeira. Alertas automáticos garantem que nunca perca nada.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-gradient-to-br from-blue-50 to-neutral-50 rounded-2xl p-8 shadow-xl border border-neutral-200">
                <div className="bg-white rounded-lg p-6 shadow-sm border border-neutral-100 mb-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">IA</span>
                    </div>
                    <div>
                      <div className="font-semibold text-neutral-900">Assistente IA</div>
                      <div className="text-sm text-neutral-500">Online agora</div>
                    </div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 mb-3">
                    <p className="text-neutral-700 text-sm">
                      &quot;Qual foi meu lucro nos últimos 3 meses?&quot;
                    </p>
                  </div>
                  <div className="bg-neutral-100 rounded-lg p-4">
                    <p className="text-neutral-700 text-sm">
                      Nos últimos 3 meses seu lucro foi de <strong>R$ 127.450</strong>.
                      Cresceu 23% comparado ao trimestre anterior. Seus principais clientes foram...
                    </p>
                  </div>
                </div>
                <div className="text-center text-sm text-neutral-500">
                  Pergunte qualquer coisa sobre suas finanças
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-neutral-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-6">
              Tudo que você precisa em um lugar
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Recursos pensados especificamente para profissionais que querem simplicidade
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-white rounded-xl p-8 shadow-sm border border-neutral-200 hover:shadow-md transition-shadow">
                <div className="text-4xl mb-6">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-4">
                  {feature.title}
                </h3>
                <p className="text-neutral-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 mb-6">
              Quem já usa não vive mais sem
            </h2>
            <p className="text-xl text-neutral-600 max-w-3xl mx-auto">
              Profissionais que transformaram sua relação com as finanças
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-neutral-200">
              <div className="text-center">
                <div className="w-16 h-16 bg-neutral-200 rounded-full mx-auto mb-6"></div>
                <blockquote className="text-xl sm:text-2xl text-neutral-700 mb-6 leading-relaxed">
                  &quot;{testimonials[currentTestimonial].text}&quot;
                </blockquote>
                <div className="font-semibold text-neutral-900 mb-1">
                  {testimonials[currentTestimonial].name}
                </div>
                <div className="text-neutral-500">
                  {testimonials[currentTestimonial].role}
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentTestimonial ? 'bg-blue-600' : 'bg-neutral-300'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-neutral-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Pare de sofrer com suas finanças
          </h2>
          <p className="text-xl text-neutral-300 mb-8 max-w-3xl mx-auto">
            Junte-se a centenas de profissionais que já têm controle total das suas finanças.
            Comece gratuitamente em menos de 5 minutos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-blue-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
            >
              Começar Grátis Agora
            </Link>
            <a
              href="mailto:contato@arnaldo.ai?subject=Quero falar com um especialista"
              className="border border-neutral-600 text-neutral-300 px-8 py-4 rounded-lg text-lg font-medium hover:bg-neutral-800 transition-colors inline-block"
            >
              Falar com Especialista
            </a>
          </div>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">✓</div>
              <div className="text-neutral-300">Grátis para começar</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">✓</div>
              <div className="text-neutral-300">Setup em 5 minutos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">✓</div>
              <div className="text-neutral-300">Suporte em português</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-neutral-200 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-7 h-7 bg-neutral-900 rounded flex items-center justify-center">
                <span className="text-white font-semibold text-xs">A</span>
              </div>
              <span className="text-lg font-semibold text-neutral-900">Arnaldo</span>
            </div>
            <div className="flex space-x-6 text-sm text-neutral-500">
              <Link href="/privacidade" className="hover:text-neutral-700 transition-colors">
                Privacidade
              </Link>
              <Link href="/termos" className="hover:text-neutral-700 transition-colors">
                Termos
              </Link>
              <a href="mailto:contato@arnaldo.ai" className="hover:text-neutral-700 transition-colors">
                Contato
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-200 text-center text-sm text-neutral-500">
            © 2025 Arnaldo. Feito com ❤️ para profissionais brasileiros.
          </div>
        </div>
      </footer>
    </div>
  );
}