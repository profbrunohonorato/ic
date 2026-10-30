# Integração Contínua — projetos para as aulas

As quatro pastas mostram a evolução do mesmo catálogo de 30 tecnologias em React/Vite. A busca por nome, categoria ou descrição permite estudar CI sem depender de um backend.

| Aula | Conceitos aplicados | Material |
| --- | --- | --- |
| Pipeline | Checkout, instalação de dependências e build automatizado | [aula-pipeline](aula-pipeline/README.md) |
| Qualidade | ESLint, testes unitários, cobertura e configuração de SonarQube | [aula-qualidade](aula-qualidade/README.md) |
| Segurança | SAST, SCA, secret scanning, Security Gate e cadeia de suprimentos | [aula-seguranca](aula-seguranca/README.md) |
| Segurança no GitHub | Secrets, Variables, Dependabot, environments e arquitetura com OpenBao/OIDC | [ic-seguranca-github](ic-seguranca-github/README.md) |

Cada pasta é uma versão didática independente. A aula de segurança parte do código da aula de qualidade, mantém suas verificações e acrescenta controles antes de permitir o build. O SonarQube fica comentado nessa versão para que a prática não dependa de um servidor e de tokens de análise.

## Do código ao workflow

No código, `src/search.js` concentra a lógica de busca e os testes verificam seus resultados. Na aula de segurança, o componente `SearchEmptyState.jsx` exibe o termo pesquisado usando interpolação JSX; um teste de renderização verifica que uma entrada contendo HTML é escapada. O ESLint continua apontando erros de código, enquanto o Semgrep procura padrões inseguros definidos em `.semgrep.yml`.

Nas dependências, `package-lock.json` registra a árvore instalada, `npm ci` reproduz essa árvore e `npm audit` verifica vulnerabilidades conhecidas. O Gitleaks procura credenciais no histórico Git. No workflow, jobs separados executam qualidade, SAST, SCA e secret scanning; o job `build` depende da aprovação dos quatro. Ao final, o pipeline disponibiliza o build e uma SBOM, inventário dos componentes usados.

O [README da aula de segurança](aula-seguranca/README.md) explica cada arquivo, comando, política de bloqueio e limitação. A [atividade prática](aula-seguranca/ATIVIDADE-PRATICA.md) propõe que os alunos demonstrem falhas controladas e correções.

## Executar a versão de segurança

Use Node.js 22 e npm 11.21.1:

```bash
cd aula-seguranca
npm install --global npm@11.21.1
npm ci
npm run dev
```

Para validar a aplicação:

```bash
npm run lint
npm run coverage
npm run security:sca
npm run build
```

A instalação dos scanners e seus comandos estão no README específico da aula.

## Como o GitHub Actions encontra os workflows

O GitHub só executa workflows em `.github/workflows/` **na raiz do repositório**. Neste repositório com as quatro aulas, [.github/workflows/aula-seguranca.yml](.github/workflows/aula-seguranca.yml) executa a versão de segurança usando `aula-seguranca` como diretório dos comandos.

O arquivo `aula-seguranca/.github/workflows/ci.yml` é a versão para quando o conteúdo dessa pasta for colocado na raiz de um repositório dos alunos. Os workflows dentro de `aula-pipeline` e `aula-qualidade` também são materiais para repositórios independentes; não são descobertos automaticamente neste repositório.

As verificações rodam em push para `main`, pull request destinado a `main` e execução manual. O workflow bloqueia seu próprio build quando um controle falha. Para também impedir merge, configure uma regra de proteção da branch exigindo os checks de qualidade e segurança.

## Evolução com GitHub

A pasta [ic-seguranca-github](ic-seguranca-github/README.md) mantém os controles anteriores e acrescenta Dependabot para npm e Actions. Os arquivos ativos ficam em `.github/` na raiz: `dependabot.yml`, `workflows/ic-seguranca-github.yml` e `workflows/dependency-review.yml`. A revisão de dependências avalia PRs do repositório inteiro e exige suporte do plano/visibilidade. O README da nova aula explica as ativações necessárias em Settings, o CodeQL e as regras de merge.

O [guia de Secrets, Variables e OpenBao](ic-seguranca-github/SEGREDOS-E-OPENBAO.md) ensina a separar configurações de credenciais e a combinar GitHub com um vault por OIDC. O laboratório manual `workflows/laboratorio-secrets.yml` usa apenas um segredo artificial no environment `laboratorio`. O [roteiro de atividades](ic-seguranca-github/ATIVIDADE-PRATICA.md) organiza os exercícios e suas evidências.
