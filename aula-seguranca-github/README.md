# Segurança com recursos do GitHub

Esta versão continua `aula-seguranca`: mantém o catálogo React/Vite, os testes contra interpretação de HTML, ESLint, Semgrep, npm audit, Gitleaks e SBOM. A aula ensina recursos avançados de segurança do GitHub: Secrets, Variables, environments, Dependabot, revisão de dependências, CodeQL e proteção de contribuições. Também discute a combinação com OpenBao ou outro vault para reduzir credenciais permanentes e concentradas no CI.

O comportamento da interface permanece o mesmo; a evolução está na manutenção e no processo de contribuição. Comece pelo [laboratório de Secrets, Variables e OpenBao](SEGREDOS-E-OPENBAO.md) e use o [roteiro de atividades](ATIVIDADE-PRATICA.md) para organizar a aula.

Para executar a integração, siga [OpenBao com Docker e runner self-hosted](OPENBAO-DOCKER-SELF-HOSTED.md). O guia inclui arquivos de infraestrutura, TLS, inicialização, role OIDC e um pipeline manual com cliente Python. O template só é ativado após a preparação do ambiente.

## Executar

Use Node.js 22 e npm 11.21.1, como na aula anterior:

```bash
cd ic-seguranca-github
npm install --global npm@11.21.1
npm ci
npm run dev
```

Valide com `npm run lint`, `npm run coverage`, `npm run security:sca` e `npm run build`. As instruções de instalação e os limites de Semgrep e Gitleaks estão no [material anterior](../aula-seguranca/README.md). Os scripts e as configurações desses scanners também estão nesta pasta.

## O que foi acrescentado

| Recurso | Configuração | Resultado |
| --- | --- | --- |
| Dependabot para npm | `.github/dependabot.yml` | Propõe atualização de manifest e lockfile |
| Dependabot para Actions | Mesmo arquivo, ecossistema `github-actions` | Propõe atualização das Actions, inclusive referências por SHA |
| Dependency Review | `.github/workflows/dependency-review.yml` | Reprova PR com vulnerabilidade alta ou crítica introduzida nas dependências |
| CI | `.github/workflows/ci.yml` | Qualidade, SAST, SCA e segredos aprovam antes do build e da SBOM |
| Secrets e Variables | `.github/workflows/laboratorio-secrets.yml` | Laboratório manual com environment e segredo artificial |
| OpenBao e OIDC | [Guia de segredos](SEGREDOS-E-OPENBAO.md) | Arquitetura, política mínima, expiração e limites do vault |
| OpenBao em Docker e runner self-hosted | [Passo a passo operacional](OPENBAO-DOCKER-SELF-HOSTED.md) e `openbao/` | Instância persistente e consumo de segredo via OIDC |
| CodeQL, alertas e push protection | Settings do repositório | Ativação guiada abaixo |

### Onde colocar os arquivos

Neste repositório com várias aulas, os arquivos **ativos** ficam na `.github` da raiz:

- `dependabot.yml` monitora npm em `/ic-seguranca-github` e Actions em `/`.
- `workflows/ic-seguranca-github.yml` executa a nova aplicação.
- `workflows/dependency-review.yml` revisa alterações de dependências nos PRs do repositório inteiro.
- `workflows/laboratorio-secrets.yml` demonstra Secrets e Variables por execução manual, após configurar o environment `laboratorio`.

Os arquivos `.github` dentro desta pasta são modelos para uso independente. Para um novo repositório, copie **todo o conteúdo desta pasta, incluindo arquivos ocultos**, para a raiz. Nesse caso, o Dependabot já aponta npm para `/` e o CI usa caminhos sem prefixo. O GitHub não descobre configurações em `.github` de subpastas automaticamente.

Os workflows pressupõem branch `main`; ajuste os filtros se usar outro nome. O Dependabot usa a branch padrão, onde seu arquivo de configuração precisa estar publicado. Não copie os dois conjuntos de workflows para o mesmo repositório.

## Dependabot: alertar e propor correções

A configuração consulta atualizações às segundas-feiras, às 09h de São Paulo, com até cinco PRs de versão abertos por ecossistema. React e React DOM são agrupados para atualizar juntos; Vitest e seus pacotes também. As demais dependências podem gerar PRs separados. Não há merge automático.

Há três funções distintas:

1. **Dependabot alerts:** sinaliza vulnerabilidades conhecidas no grafo de dependências.
2. **Dependabot security updates:** tenta abrir PRs de correção para alertas elegíveis, sem depender da agenda semanal de versões.
3. **Dependabot version updates:** usa o YAML para propor versões mais recentes, mesmo sem alerta de segurança.

O YAML configura version updates; não ativa sozinho os alertas e security updates. Os grupos deste exemplo são para atualizações de versão. Revise mudanças incompatíveis, changelog, manifest e lockfile; aguarde o CI antes do merge. Atualizações de segurança nem sempre têm correção automática disponível.

Dependabot não atualiza os comandos de instalação de Semgrep, Gitleaks e npm escritos em `run`, nem o checksum do Gitleaks. Esses itens continuam exigindo revisão manual.

PRs do Dependabot normalmente recebem token somente de leitura e não recebem os Actions secrets comuns. Dependabot possui armazenamento próprio de secrets para necessidades como registros privados; configure somente os acessos necessários, com escopo de leitura. Não forneça credenciais de produção para fazer um teste de PR passar e não use `pull_request_target` como atalho. [Restrições do Dependabot em Actions](https://docs.github.com/en/code-security/dependabot/troubleshooting-dependabot/troubleshooting-dependabot-on-github-actions).

## Ativações no GitHub

Depois de publicar os arquivos, um administrador deve abrir **Settings → Security**, nas seções de segurança de código e de proteção de segredos disponíveis no repositório:

1. Habilitar **Dependency graph**, **Dependabot alerts** e **Dependabot security updates**.
2. Em **Code scanning**, configurar **CodeQL com Default setup**, selecionando JavaScript/TypeScript. Este material não inclui workflow avançado de CodeQL; o GitHub administra a análise padrão. No monorepo, essa análise pode abranger as outras aulas também.
3. Habilitar **Secret scanning** e **Push protection**, quando disponíveis. O primeiro gera alertas; o segundo pode impedir o envio de credenciais reconhecidas. Eles complementam o Gitleaks e não detectam necessariamente seu marcador didático.
4. Criar uma regra de branch/ruleset para `main`, exigir PR e selecionar os checks `github-qualidade`, `github-sast`, `github-sca`, `github-segredos` e `github-dependency-review`. Selecione também o check do CodeQL após a primeira execução.

Dependency Review e CodeQL estão disponíveis em repositórios públicos; repositórios privados podem exigir plano/licença de GitHub Code Security. Secret scanning e push protection também dependem da visibilidade e dos recursos contratados. Verifique a disponibilidade antes de exigir esses checks. O workflow de revisão falha se a API necessária não estiver disponível; não transforma essa situação em aprovação.

O build depende dos quatro controles locais do CI. Dependency Review roda em workflow separado, somente em PR, e CodeQL é gerenciado pelo GitHub: o bloqueio de merge desses controles depende do ruleset. Publicar YAML não configura automaticamente regras de branch nem ativa recursos administrativos.

## Revisão de dependências no PR

O workflow compara as dependências entre a base e o conteúdo do PR, usando o grafo de dependências do GitHub. `fail-on-severity: high` bloqueia vulnerabilidades altas e críticas introduzidas; `npm audit` continua verificando a árvore instalada, incluindo problemas preexistentes.

A revisão usa token com `contents: read`, não publica comentários e não recebe secrets. O evento é `pull_request`, compatível com o fluxo de PRs do Dependabot; não usamos `pull_request_target` para executar o código proposto. As Actions estão fixadas por SHA e o próprio Dependabot propõe sua manutenção.

## Atividade prática

O [roteiro completo](ATIVIDADE-PRATICA.md) inclui classificação de dados, Secrets e Variables, environments, Dependabot, controles de PR e análise de OpenBao. A sequência abaixo cobre a parte de dependências:

1. Execute lint, cobertura e build como linha de base.
2. Publique o material em um repositório de aula e conclua as ativações acima.
3. Em **Insights → Dependency graph → Dependabot**, consulte a última verificação e solicite uma nova busca de atualizações, se disponível.
4. Inspecione um PR do bot: alterações em `package.json` e `package-lock.json`, motivação, compatibilidade e checks. Se não houver atualização, registre esse resultado; não é necessário introduzir uma dependência vulnerável.
5. Abra um PR alterando uma dependência e observe Dependency Review. Uma atualização sem vulnerabilidade conhecida deve passar; problemas preexistentes ainda podem reprovar o npm audit.
6. Configure o ruleset e demonstre que uma falha de lint impede merge. Corrija e confira a nova execução.
7. Consulte a aba **Security** e diferencie alertas de dependências, código e segredos. Registre evidências sem expor credenciais reais.

## Outros controles para discutir e aplicar

| Controle | Aplicação na aula | Limite a observar |
| --- | --- | --- |
| Rulesets e revisão obrigatória | Exigir PR, checks e resolução de conversas; restringir bypass e force push | Não se configuram apenas com o YAML do CI |
| CODEOWNERS | Definir responsáveis por `.github/`, manifests e lockfiles; exigir aprovação dos responsáveis no ruleset | Arquivo isolado não torna revisão obrigatória; use usuários/equipes reais |
| Environments | Separar homologação e produção, limitar branches e exigir aprovação quando disponível | Referenciar um environment no job não cria suas proteções |
| Token mínimo e Actions por SHA | Manter `contents: read` onde necessário e revisar cada atualização | SHA fixa conteúdo, mas não prova que ele é seguro |
| Política de Actions permitidas | Restringir fornecedores e workflows reutilizáveis nas configurações de Actions | Avaliar também dependências transitivas das Actions |
| Runners | Priorizar ambientes efêmeros e evitar PR não confiável em runner persistente com acesso interno | Limpeza parcial não garante isolamento |
| SBOM e atestações | Comparar inventário com evidência de origem do artefato | SBOM não é assinatura; esta aula não gera atestação |
| Identidade e auditoria | Exigir MFA conforme a política da organização, revisar acessos e monitorar alterações em workflows | Recursos e retenção variam conforme o plano |

Não centralize todos os segredos de produção no GitHub: combine os controles acima com um vault e identidades temporárias quando disponíveis. O [guia de segredos](SEGREDOS-E-OPENBAO.md) documenta um incidente real de Action comprometida e explica por que um vault também precisa de políticas restritas e auditoria.

## Referências oficiais

- [Opções do Dependabot](https://docs.github.com/en/code-security/reference/supply-chain-security/dependabot-options-reference).
- [Ativação dos recursos de segurança](https://docs.github.com/en/code-security/getting-started/quickstart-for-securing-your-repository).
- [Dependency Review Action e requisitos](https://github.com/actions/dependency-review-action).

As configurações locais preparam a integração. PRs do bot, resultados de CodeQL e regras de merge precisam ser verificados no GitHub após a publicação.
