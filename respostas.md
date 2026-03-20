Q001. O foco estratégico atual é o módulo PGR, embora o roadmap contemple expansão para PCMSO e LTCAT em fases posteriores.

Q002. O produto entrará em produção em 24 horas, exigindo que o estado atual seja tratado como estável e com foco máximo em segurança.

Q003. O sistema é de uso interno para técnicos e consultores, não havendo previsão de acesso direto para as empresas clientes nesta etapa.

Q004. O comportamento de fallback para o primeiro usuário do banco foi uma implementação temporária de desenvolvimento e deve ser removida para produção.

Q005. Todas as ações de negócio, incluindo publicação, alteração de documentos e modificação de riscos, devem possuir trilha de auditoria completa por serem documentos legais sensíveis.

Q006. Não existem SLAs formais de performance definidos no momento, priorizando-se a corretude dos dados e a estabilidade da geração de documentos.

Q007. A arquitetura alvo definida para o projeto é a Hexagonal, visando desacoplamento entre lógica de negócio e adaptadores externos.

Q008. Atualmente não existem registros formais de decisões arquiteturais (ADRs) documentados no repositório.

Q009. A lógica de integração do frontend será consolidada no backend principal para evitar a fragmentação de regras em múltiplos serviços.

Q010. A duplicidade de abordagens entre as pastas de API do Next.js será eliminada, mantendo-se apenas o padrão que está sendo efetivamente consumido.

Q011. O uso de estado persistido no backend é o modelo ideal para produção, sendo a atual coexistência de estados apenas uma etapa de transição.

Q012. Implementaremos uma estratégia formal de versionamento de contratos de API para garantir a compatibilidade entre o frontend e o backend.

Q013. O login com credenciais fixas admin/admin é estritamente provisório e será substituído por um fluxo de autenticação real antes do deploy.

Q014. A confiança no header X-Frontend-Username é uma vulnerabilidade de spoofing (falsificação de identidade) que será corrigida com a implementação de autenticação robusta.

Q015. O bloqueio obrigatório de rotas por usuário autenticado é o requisito padrão para o ambiente de produção.

Q016. A flag de depuração DEBUG será configurada como falsa por padrão em todos os ambientes externos ao desenvolvimento local.

Q017. O uso de chaves secretas (SECRET_KEY) fixas no código é terminantemente proibido em ambientes de homologação e produção.

Q018. Atualmente não existe uma política de rotação de segredos e tokens de integração implementada.

Q019. O sistema evoluirá para um modelo de autorização por papel (RBAC) para segmentar as permissões de uso.

Q020. Implementaremos validações de posse de recurso para impedir que usuários acessem ou baixem anexos que não lhes pertencem.

Q021. Serão estabelecidos limites de tamanho de arquivo, cotas de armazenamento e verificação por antivírus para todos os uploads de PDF.

Q022. Proteções de limite de requisições (rate limit) serão aplicadas aos endpoints de consulta externa e geração de documentos.

Q023. O sistema passará a registrar logs de tentativas de acesso inválidas e falhas de autenticação para fins de segurança e auditoria.

Q024. O tratamento de retornos será corrigido para que falhas funcionais não resultem em códigos de sucesso HTTP 200.

Q025. Estabeleceremos um padrão de resposta de erro que inclua código interno, mensagem legível e contexto técnico para facilitar o suporte.

Q026. Os blocos genéricos de captura de exceção serão substituídos por tratamentos específicos baseados em exceções de domínio tipadas.

Q027. O erro identificado na user_view.py referente à variável inexistente é um bug conhecido que será corrigido na próxima revisão.

Q028. A definição estática de IDs de usuário no processo de criação de rascunhos será removida em favor da identificação dinâmica do usuário logado.

Q029. A semântica do endpoint de clonagem de documentos será revisada para utilizar o método POST, adequando-se aos padrões REST de mutação de estado.

Q030. A divergência entre as funcionalidades no frontend e backend é reconhecida como dívida técnica gerada pela velocidade de desenvolvimento e será harmonizada.

Q031. Padrões de idempotência serão introduzidos nos endpoints de sincronização para evitar a duplicidade de dados em caso de falhas de rede.

Q032. Implementaremos paginação real em todas as listagens de recursos para garantir a escalabilidade do sistema com o aumento do volume de dados.

Q033. O estado do PGR será migrado para uma estrutura tipada e versionada, suportando scripts de geração específicos para diferentes layouts de empresas.

Q034. Atualmente não existe uma política formal de migração de dados para mudanças de esquema no JSON de estado.

Q035. Sugerimos a adoção de estratégias de arquivamento e retenção de dados para lidar com o crescimento de anexos e estados no storage.

Q036. A geração de IDs baseada em timestamp será avaliada tecnicamente para garantir a unicidade em cenários de alta concorrência.

Q037. O comportamento de fallback para o último card no processo de sincronização com o Pipefy será revisado para garantir a precisão dos dados.

Q038. Adicionaremos restrições de integridade no banco de dados para prevenir a existência de registros órfãos ou inconsistentes entre entidades.

Q039. Realizaremos uma análise de performance para implementar índices nos campos de consulta mais frequentes, como identificadores e datas de atualização.

Q040. O armazenamento de anexos será realizado de forma persistente através das capacidades oferecidas pelo provedor de nuvem Render.

Q041. A dependência de APIs externas de endereço sem mecanismos de resiliência é aceitável como funcionalidade auxiliar, não bloqueante para o negócio.

Q042. Avaliaremos o uso de Redis para cache persistente de respostas externas, visando otimizar a velocidade de resposta do frontend.

Q043. O risco de rate limit em APIs públicas não é visto como degradante para a experiência do usuário por ser uma funcionalidade de conveniência.

Q044. O cliente de integração com o Pipefy receberá implementações de timeout e tratamento estruturado de erros.

Q045. Adotaremos estratégias de retentativa (retries) com backoff exponencial para garantir a resiliência na sincronização de dados.

Q046. A geração de PDF permanecerá temporariamente no frontend devido à complexidade técnica do layout, embora a centralização no backend seja o objetivo ideal.

Q047. Implementaremos a validação e assinatura dos payloads de geração de documento para evitar manipulações indevidas por parte do cliente.

Q048. Estabeleceremos limites de tamanho e quantidade de páginas no merge de anexos para prevenir estouro de memória no servidor.

Q049. Rotas e códigos de PDF não utilizados ou duplicados serão identificados e removidos para limpeza do projeto.

Q050. Adicionaremos métricas para monitorar o tempo de cada etapa da geração do documento, persistindo o tempo de ciclo final no banco de dados.

Q051. Atualmente não há um controle formal de versão entre os templates de documentos e o esquema de dados utilizado.

Q052. Otimizaremos a busca de progresso na home através de endpoints agregados para evitar o excesso de requisições simultâneas.

Q053. O hook de persistência do PGR será refatorado para utilizar tipagem forte e reduzir o acoplamento excessivo com o tipo any.

Q054. Não prevemos conflitos de edição concorrente no curto prazo, dado que o acesso aos cards é restrito ao usuário proprietário.

Q055. Avaliaremos o uso de APIs de transporte resilientes, como sendBeacon, para garantir a persistência de dados no encerramento da sessão.

Q056. Todos os logs de depuração do console serão removidos automaticamente nas compilações de produção.

Q057. O roadmap 3D é considerado uma peça de marketing interno e será desvinculado do core da aplicação em um momento futuro.

Q058. A otimização de performance para dispositivos móveis no cenário 3D não é prioridade técnica no momento.

Q059. A integração real com Google OAuth permanecerá desabilitada até a conclusão da etapa de autenticação.

Q060. A persistência será movida integralmente para o banco de dados, mantendo a fluidez da experiência mas garantindo a segurança como fonte única de verdade.

Q061. Adotaremos o framework Playwright para a implementação da suíte de testes automatizados do frontend.

Q062. Estabeleceremos metas de cobertura de testes unitários e de integração para os módulos críticos do backend.

Q063. Implementaremos testes de contrato para garantir que as mudanças no backend não quebrem a integração com o frontend.

Q064. Testes de segurança focados em bypass de autenticação e controle de acesso serão priorizados após o lançamento inicial.

Q065. Padronizaremos logs estruturados com identificadores de correlação para permitir o rastreio completo de requisições.

Q066. A integração com o Sentry é considerada fundamental antes do deploy em produção para monitoramento proativo de erros.

Q067. As configurações de Docker que utilizam volumes absolutos serão revisadas para garantir a portabilidade entre diferentes ambientes de desenvolvimento.

Q068. Criaremos perfis distintos de configuração para desenvolvimento, homologação e produção através de arquivos de ambiente específicos.

Q069. A exposição de portas de banco de dados e cache será restrita para evitar riscos de segurança em redes públicas.

Q070. Estabeleceremos pipelines de integração contínua (CI) obrigatórios para validação de lint e testes antes de cada merge.

Q071. Adotaremos processos automatizados para a execução de migrações de banco de dados durante o fluxo de deploy.

Q072. Definiremos uma política de backup e recuperação de desastres para garantir a integridade do estado da aplicação e de seus anexos.

Q073. Arquivos binários e documentos pesados serão removidos do versionamento do Git e movidos para um armazenamento de artefatos adequado.

Q074. Arquivos de metadados de build do TypeScript serão adicionados ao ignore do repositório para reduzir o ruído no histórico.

Q075. Garantiremos que diretórios de cache e pastas de build local do Next.js sejam devidamente ignorados pelo controle de versão.

Q076. Arquivos com inconsistências de nomenclatura ou espaços indevidos nos nomes serão renomeados ou excluídos.

Q077. Arquivos de workspace deslocados na estrutura de pastas serão organizados ou removidos conforme a necessidade do projeto.

Q078. O idioma padrão para código, variáveis e comentários será o inglês para manter a consistência técnica internacional.

Q079. Padronizaremos os termos de domínio, como o uso de assessment em vez de avaliation, para eliminar ambiguidades no código.

Q080. Após a consolidação destas respostas, gere o plano de refatoração priorizando arquitetura, seguido por contratos e segurança.