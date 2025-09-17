export default function TermosPage() {
  return (
    <div className="min-h-screen bg-neutral-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-neutral-200 p-8">
          <h1 className="text-3xl font-bold text-neutral-900 mb-8">Termos de Uso e Serviço</h1>
          <p className="text-sm text-neutral-600 mb-8">Última atualização: 17 de setembro de 2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">1. Aceitação dos Termos</h2>
              <p className="text-neutral-700 mb-4">
                Ao acessar e usar a plataforma ArqCashflow ("Plataforma", "Serviço"), você concorda em estar vinculado
                por estes Termos de Uso e Serviço ("Termos"). Se você não concorda com qualquer parte destes termos,
                não deve usar nossos serviços.
              </p>
              <p className="text-neutral-700">
                Estes Termos constituem um acordo legal entre você ("Usuário", "Cliente") e a ArqCashflow
                ("nós", "nosso", "Empresa"), regido pelas leis da República Federativa do Brasil.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">2. Descrição do Serviço</h2>
              <p className="text-neutral-700 mb-4">
                A ArqCashflow é uma plataforma digital de gestão financeira especialmente desenvolvida para arquitetos
                e profissionais liberais, oferecendo:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Gerenciamento de contratos e projetos</li>
                <li>Controle de recebíveis e despesas</li>
                <li>Relatórios financeiros e análises</li>
                <li>Assistente de IA para processamento de documentos</li>
                <li>Exportação de dados para Excel e Google Sheets</li>
                <li>Sistema de alertas e notificações</li>
                <li>Recursos de importação e análise de dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">3. Elegibilidade e Cadastro</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">3.1 Requisitos de Elegibilidade</h3>
              <p className="text-neutral-700 mb-4">Para usar nossos serviços, você deve:</p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Possuir capacidade legal para celebrar contratos</li>
                <li>Fornecer informações verdadeiras e atualizadas</li>
                <li>Não estar impedido de usar o serviço por lei aplicável</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">3.2 Conta de Usuário</h3>
              <p className="text-neutral-700 mb-4">
                Você é responsável por manter a confidencialidade de suas credenciais de acesso e por todas as
                atividades que ocorram em sua conta. Você deve notificar-nos imediatamente sobre qualquer uso
                não autorizado de sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">4. Uso Aceitável</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">4.1 Usos Permitidos</h3>
              <p className="text-neutral-700 mb-4">Você pode usar a Plataforma para:</p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Gerenciar suas atividades financeiras profissionais</li>
                <li>Armazenar e processar dados relacionados aos seus projetos</li>
                <li>Gerar relatórios e análises financeiras</li>
                <li>Utilizar recursos de IA para auxiliar na gestão</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">4.2 Usos Proibidos</h3>
              <p className="text-neutral-700 mb-4">Você não pode:</p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2">
                <li>Usar o serviço para atividades ilegais ou fraudulentas</li>
                <li>Tentar acessar contas de outros usuários</li>
                <li>Interferir no funcionamento da Plataforma</li>
                <li>Fazer engenharia reversa ou copiar o software</li>
                <li>Usar o serviço para spam ou distribuição de malware</li>
                <li>Violar direitos de propriedade intelectual</li>
                <li>Submeter informações falsas ou enganosas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">5. Propriedade Intelectual</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">5.1 Direitos da ArqCashflow</h3>
              <p className="text-neutral-700 mb-4">
                A Plataforma, incluindo seu código, design, funcionalidades e conteúdo, é protegida por direitos
                autorais, marcas registradas e outras leis de propriedade intelectual. Todos os direitos são reservados.
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">5.2 Seus Dados</h3>
              <p className="text-neutral-700">
                Você mantém todos os direitos sobre os dados que insere na Plataforma. Concedemos apenas os direitos
                necessários para fornecer nossos serviços, conforme descrito em nossa Política de Privacidade.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">6. Disponibilidade e Suporte</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">6.1 Disponibilidade</h3>
              <p className="text-neutral-700 mb-4">
                Nos esforçamos para manter a Plataforma disponível 24/7, mas não garantimos disponibilidade
                ininterrupta. Podemos realizar manutenções programadas mediante aviso prévio.
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">6.2 Suporte Técnico</h3>
              <p className="text-neutral-700">
                Oferecemos suporte técnico através de e-mail e documentação online. O tempo de resposta varia
                conforme a complexidade da questão e pode levar até 48 horas úteis.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">7. Privacidade e Proteção de Dados</h2>
              <p className="text-neutral-700 mb-4">
                O tratamento de seus dados pessoais é regido por nossa Política de Privacidade, que faz parte
                integrante destes Termos e está em conformidade com a LGPD (Lei nº 13.709/2018).
              </p>
              <p className="text-neutral-700">
                Implementamos medidas de segurança técnicas e organizacionais para proteger seus dados contra
                acesso não autorizado, perda ou alteração.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">8. Limitação de Responsabilidade</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">8.1 Limitações Gerais</h3>
              <p className="text-neutral-700 mb-4">
                Na máxima extensão permitida por lei, a ArqCashflow não será responsável por:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Danos indiretos, incidentais ou consequenciais</li>
                <li>Perda de lucros, dados ou oportunidades de negócio</li>
                <li>Interrupções temporárias do serviço</li>
                <li>Decisões baseadas em dados ou análises fornecidas</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">8.2 Força Maior</h3>
              <p className="text-neutral-700">
                Não seremos responsáveis por atrasos ou falhas causadas por circunstâncias além do nosso controle
                razoável, incluindo desastres naturais, ataques cibernéticos ou falhas de terceiros.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">9. Indenização</h2>
              <p className="text-neutral-700">
                Você concorda em indenizar e isentar a ArqCashflow de qualquer reclamação, dano ou despesa
                resultante de: (a) seu uso inadequado da Plataforma; (b) violação destes Termos; (c) violação
                de direitos de terceiros; ou (d) qualquer atividade realizada através de sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">10. Rescisão</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">10.1 Rescisão pelo Usuário</h3>
              <p className="text-neutral-700 mb-4">
                Você pode encerrar sua conta a qualquer momento através das configurações da Plataforma ou
                entrando em contato conosco.
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">10.2 Rescisão pela ArqCashflow</h3>
              <p className="text-neutral-700 mb-4">
                Podemos suspender ou encerrar sua conta em caso de:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Violação destes Termos</li>
                <li>Atividade fraudulenta ou ilegal</li>
                <li>Não pagamento (se aplicável)</li>
                <li>Inatividade prolongada</li>
              </ul>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">10.3 Efeitos da Rescisão</h3>
              <p className="text-neutral-700">
                Após a rescisão, você perderá acesso à Plataforma. Seus dados serão mantidos conforme nossa
                Política de Privacidade e podem ser excluídos após período de retenção apropriado.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">11. Modificações dos Termos</h2>
              <p className="text-neutral-700 mb-4">
                Podemos modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas
                através da Plataforma ou por e-mail com pelo menos 30 dias de antecedência.
              </p>
              <p className="text-neutral-700">
                O uso continuado da Plataforma após as modificações constitui aceitação dos novos termos.
                Se não concordar, você deve encerrar sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">12. Lei Aplicável e Jurisdição</h2>
              <p className="text-neutral-700 mb-4">
                Estes Termos são regidos pelas leis da República Federativa do Brasil, incluindo:
              </p>
              <ul className="list-disc pl-6 text-neutral-700 space-y-2 mb-4">
                <li>Código de Defesa do Consumidor (Lei nº 8.078/1990)</li>
                <li>Marco Civil da Internet (Lei nº 12.965/2014)</li>
                <li>Lei Geral de Proteção de Dados (Lei nº 13.709/2018)</li>
                <li>Código Civil Brasileiro</li>
              </ul>
              <p className="text-neutral-700">
                Qualquer disputa será submetida à jurisdição dos tribunais brasileiros, especificamente
                ao foro da comarca onde você reside.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">13. Resolução de Conflitos</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">13.1 Negociação</h3>
              <p className="text-neutral-700 mb-4">
                Encorajamos a resolução amigável de conflitos através de comunicação direta.
                Entre em contato conosco para discutir qualquer questão.
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">13.2 Mediação e Arbitragem</h3>
              <p className="text-neutral-700">
                Caso a negociação não seja bem-sucedida, as partes podem optar por mediação ou arbitragem
                antes de recorrer ao Poder Judiciário, conforme procedimentos da Câmara de Arbitragem competente.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">14. Disposições Gerais</h2>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">14.1 Integridade do Acordo</h3>
              <p className="text-neutral-700 mb-4">
                Estes Termos, juntamente com nossa Política de Privacidade, constituem o acordo completo
                entre as partes e substituem todos os acordos anteriores.
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">14.2 Severabilidade</h3>
              <p className="text-neutral-700 mb-4">
                Se qualquer disposição destes Termos for considerada inválida ou inexequível, as demais
                disposições permanecerão em pleno vigor e efeito.
              </p>

              <h3 className="text-lg font-medium text-neutral-900 mb-3">14.3 Renúncia</h3>
              <p className="text-neutral-700">
                A não aplicação de qualquer disposição destes Termos não constituirá renúncia a essa ou
                outras disposições.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-neutral-900 mb-4">15. Contato</h2>
              <p className="text-neutral-700 mb-4">
                Para questões relacionadas a estes Termos, entre em contato:
              </p>
              <div className="bg-neutral-50 p-4 rounded-lg">
                <p className="text-neutral-700 mb-2"><strong>E-mail:</strong> suporte@arqcashflow.com</p>
                <p className="text-neutral-700 mb-2"><strong>E-mail Jurídico:</strong> juridico@arqcashflow.com</p>
                <p className="text-neutral-700 mb-2"><strong>Responsável:</strong> Jose Lyra</p>
                <p className="text-neutral-700"><strong>Tempo de resposta:</strong> Até 5 dias úteis</p>
              </div>
            </section>
          </div>

          <div className="mt-12 pt-8 border-t border-neutral-200">
            <p className="text-sm text-neutral-500 text-center">
              Estes Termos estão em conformidade com a legislação brasileira, incluindo LGPD, Marco Civil da Internet e Código de Defesa do Consumidor.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}