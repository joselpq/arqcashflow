export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">Política de Privacidade</h1>
          <p className="text-sm text-neutral-600 mb-8">Última atualização: 17 de setembro de 2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">1. Informações Gerais</h2>
              <p className="text-neutral-700 mb-4">
                A Arnaldo ("nós", "nosso" ou "empresa") está comprometida em proteger e respeitar sua privacidade.
                Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos suas informações pessoais
                em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
              </p>
              <p className="text-neutral-700">
                Esta política se aplica ao uso da plataforma Arnaldo, um sistema de gestão financeira para arquitetos
                e profissionais liberais, acessível através do site https://arnaldo.ai.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">2. Dados Pessoais Coletados</h2>
              <p className="text-neutral-700 mb-4">Coletamos os seguintes tipos de dados pessoais:</p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">2.1 Dados de Cadastro</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Nome completo</li>
                <li>Endereço de e-mail</li>
                <li>Senha (armazenada de forma criptografada)</li>
                <li>Data de criação da conta</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">2.2 Dados de Uso da Plataforma</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Informações de contratos e projetos</li>
                <li>Dados financeiros (receitas, despesas, recebíveis)</li>
                <li>Informações de clientes e fornecedores</li>
                <li>Documentos enviados (PDFs, imagens)</li>
                <li>Histórico de conversas com o assistente de IA</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">2.3 Dados Técnicos</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Endereço IP</li>
                <li>Dados de cookies e sessão</li>
                <li>Informações do navegador e dispositivo</li>
                <li>Logs de acesso e uso</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">3. Finalidades do Tratamento</h2>
              <p className="text-neutral-700 mb-4">Utilizamos seus dados pessoais para as seguintes finalidades:</p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">3.1 Execução do Contrato</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Fornecimento dos serviços de gestão financeira</li>
                <li>Processamento e armazenamento de dados financeiros</li>
                <li>Geração de relatórios e análises</li>
                <li>Funcionalidades de IA para assistência e análise</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">3.2 Legítimo Interesse</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Melhoria e desenvolvimento da plataforma</li>
                <li>Segurança e prevenção de fraudes</li>
                <li>Suporte técnico e atendimento ao cliente</li>
                <li>Análises estatísticas e métricas de uso</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">3.3 Cumprimento de Obrigação Legal</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Atendimento a determinações judiciais</li>
                <li>Cumprimento de obrigações regulatórias</li>
                <li>Cooperação com autoridades competentes</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">4. Compartilhamento de Dados</h2>
              <p className="text-neutral-700 mb-4">
                Não vendemos, alugamos ou comercializamos seus dados pessoais. Podemos compartilhar dados apenas nas seguintes situações:
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">4.1 Prestadores de Serviços</h3>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Vercel (hospedagem da aplicação)</li>
                <li>Neon (banco de dados)</li>
                <li>Anthropic (Claude AI para processamento de documentos)</li>
                <li>Google (para exportação de planilhas, quando autorizado)</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">4.2 Exigências Legais</h3>
              <p className="text-neutral-700">
                Quando exigido por lei, ordem judicial ou autoridades competentes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">5. Segurança dos Dados</h2>
              <p className="text-neutral-700 mb-4">Implementamos medidas técnicas e organizacionais apropriadas para proteger seus dados:</p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Criptografia de dados em trânsito e em repouso</li>
                <li>Autenticação e controle de acesso</li>
                <li>Segregação de dados por equipe (multi-tenant)</li>
                <li>Monitoramento de segurança</li>
                <li>Backups regulares e seguros</li>
                <li>Senhas criptografadas com bcrypt</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">6. Retenção de Dados</h2>
              <p className="text-neutral-700 mb-4">
                Mantemos seus dados pessoais pelo tempo necessário para cumprir as finalidades descritas nesta política,
                respeitando os seguintes prazos:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Dados de cadastro: enquanto a conta estiver ativa</li>
                <li>Dados financeiros: por até 5 anos após o encerramento da conta</li>
                <li>Logs de acesso: por até 6 meses</li>
                <li>Dados para cumprimento legal: conforme exigido pela legislação</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">7. Seus Direitos</h2>
              <p className="text-neutral-700 mb-4">De acordo com a LGPD, você tem os seguintes direitos:</p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Confirmação da existência de tratamento de dados</li>
                <li>Acesso aos dados pessoais</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários</li>
                <li>Portabilidade dos dados</li>
                <li>Eliminação dos dados tratados com seu consentimento</li>
                <li>Revogação do consentimento</li>
                <li>Oposição ao tratamento realizado com base no legítimo interesse</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">8. Cookies e Tecnologias Similares</h2>
              <p className="text-neutral-700 mb-4">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Cookies de sessão para autenticação</li>
                <li>Cookies de funcionalidade para preferências do usuário</li>
                <li>Cookies de segurança para proteção contra fraudes</li>
              </ul>
              <p className="text-neutral-700 mt-4">
                Você pode configurar seu navegador para recusar cookies, mas isso pode afetar algumas funcionalidades da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">9. Transferência Internacional</h2>
              <p className="text-neutral-700">
                Alguns de nossos prestadores de serviços podem estar localizados fora do Brasil.
                Garantimos que essas transferências ocorram em conformidade com a LGPD e com adequado nível de proteção.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">10. Menores de Idade</h2>
              <p className="text-neutral-700">
                Nossos serviços são destinados a pessoas maiores de 18 anos. Não coletamos conscientemente
                dados pessoais de menores de idade sem o consentimento dos pais ou responsáveis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">11. Alterações na Política</h2>
              <p className="text-neutral-700">
                Esta Política de Privacidade pode ser atualizada periodicamente. Notificaremos sobre alterações
                significativas através da plataforma ou por e-mail. O uso continuado dos serviços após as alterações
                constitui aceitação da política atualizada.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">12. Contato e Encarregado de Dados</h2>
              <p className="text-neutral-700 mb-4">
                Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato:
              </p>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-700 mb-2"><strong>E-mail:</strong> privacidade@arqcashflow.com</p>
                <p className="text-neutral-700 mb-2"><strong>Encarregado de Dados (DPO):</strong> Jose Lyra</p>
                <p className="text-neutral-700"><strong>Tempo de resposta:</strong> Até 15 dias úteis</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">13. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
              <p className="text-neutral-700">
                Caso não esteja satisfeito com nosso atendimento, você pode apresentar reclamação à ANPD:
              </p>
              <div className="bg-neutral-50 p-4 rounded-lg mt-4">
                <p className="text-neutral-700 mb-2"><strong>Site:</strong> https://www.gov.br/anpd</p>
                <p className="text-neutral-700"><strong>E-mail:</strong> atendimento@anpd.gov.br</p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-200">
            <p className="text-sm text-neutral-500 text-center">
              Esta Política de Privacidade está em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}