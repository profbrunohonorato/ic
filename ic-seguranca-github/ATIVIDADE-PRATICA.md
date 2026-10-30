# Atividade: segurança avançada no GitHub

Ao final, o aluno deve conseguir escolher entre Variable, Secret e vault; limitar acesso no Actions; interpretar um PR do Dependabot; e explicar os limites de OIDC e de um vault.

Use um repositório de aula, credenciais artificiais e um colega revisor. Configure primeiro os recursos disponíveis no plano do repositório. Não há necessidade de cadastrar uma credencial real nem de disponibilizar um servidor de produção.

## 1. Classificar configurações

Classifique: nome do ambiente, região, URL pública da API, senha de banco de produção, token de publicação de pacote e chave administrativa do vault. Justifique escopo, consumidor e duração de cada acesso. Explique por que nem toda configuração é Secret e por que uma chave administrativa não deve ser entregue ao CI.

## 2. Executar o laboratório de Secrets e Variables

Siga [SEGREDOS-E-OPENBAO.md](SEGREDOS-E-OPENBAO.md). Crie o environment, configure Variable e Secret artificial e execute o workflow manual. Mostre a falha por valor ausente e a execução corrigida. Quando disponível, demonstre uma aprovação por outro usuário.

Entregue evidências de nomes, escopos, aprovação e resultado; oculte os valores. Explique por que mascarar o log não impediria uma Action maliciosa de enviar o segredo para outro servidor.

## 3. Observar Dependabot e Dependency Review

Publique o YAML na branch padrão, habilite grafo, alertas e security updates e verifique os registros de execução do Dependabot. Compare version updates com security updates. Revise um PR do bot, caso haja atualização disponível, e descreva as mudanças no manifest, lockfile ou SHA de Action.

Abra um PR alterando uma dependência e analise o Dependency Review e o npm audit. Se não houver vulnerabilidade conhecida, esse é um resultado válido; não é necessário degradar pacotes para simular um problema. Explique por que PRs do Dependabot não devem receber credenciais de deploy.

## 4. Proteger as contribuições

Habilite CodeQL e configure um ruleset com revisão e checks obrigatórios. Se usar CODEOWNERS, registre responsáveis reais e exija sua aprovação na regra. Provoque uma falha simples de lint em um PR, confirme o bloqueio e corrija.

Discuta o efeito de permitir bypass e quem consegue alterar workflows, environments ou políticas. Se o plano não oferecer um controle, registre a limitação e a configuração proposta; não apresente o controle como ativo.

## 5. Projetar integração com OpenBao

Desenhe o fluxo GitHub OIDC → OpenBao → serviço. Defina issuer, audience, repositório, proprietário, branch, environment, policy e TTL. Explique como impedir que outro repositório ou uma branch não autorizada leia o segredo.

O exercício obrigatório é de arquitetura. Como extensão, um administrador pode preparar um OpenBao isolado, com TLS, auditoria e somente dados artificiais, seguindo o guia. Implemente o cliente do roteiro apenas após essa preparação. Verifique uma leitura permitida e negações para caminho e identidade não autorizados. Não publique JWT, token do vault ou respostas contendo segredos.

Explique por que expirar a sessão do vault não revoga uma senha estática já copiada. Compare KV com secrets engines dinâmicos e descreva rotação, revogação e o que acontece se o job for cancelado.

## 6. Analisar um incidente

Leia o incidente de `tj-actions/changed-files` referenciado no guia. Identifique o componente comprometido, como os segredos ficaram expostos e quais controles reduziriam o impacto. Diferencie ataque a uma Action de comprometimento do armazenamento de Secrets da plataforma.

Proponha uma sequência de resposta: invalidar a credencial no emissor, conter a execução, investigar os acessos, tratar logs e histórico e corrigir as permissões. Explique por que apenas apagar o Secret do GitHub não basta.

## Critérios de avaliação

| Evidência | O que deve demonstrar |
| --- | --- |
| Classificação das configurações | Escolha do mecanismo e escopo com justificativa |
| Laboratório manual | Variable usada, Secret validado sem exposição e falha controlada |
| Dependabot e revisão de PR | Distinção entre alertas, atualizações e verificação das alterações |
| Ruleset e CodeQL | Controle demonstrado ou limitação de disponibilidade documentada |
| Projeto do vault | Confiança restrita, menor privilégio, TTL e limites de credenciais estáticas |
| Análise de incidente | Evidência, impacto e resposta sem generalizações sobre a plataforma |

Não inclua credenciais em nenhuma entrega. Um desenho de arquitetura não comprova integração executada; identifique claramente o que foi configurado, testado ou somente proposto.
