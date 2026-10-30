# Catálogo de Tecnologias — Segurança em CI/CD

Continuação da aula de qualidade, alinhada ao material `IC05 - SEGURANCA_CICD.pptx.pdf`. O catálogo React/Vite mantém as 30 tecnologias, a busca, o ESLint e os testes. A evolução integra segurança ao desenvolvimento e ao pipeline: **DevSecOps** e **shift left**, detectando problemas antes do build.

## O que mudou da aula anterior

| Camada | Aplicação no projeto | Efeito |
| --- | --- | --- |
| Código | Interpolação JSX e teste contra interpretação de HTML | Proteção do ponto em que a busca volta à tela |
| Qualidade | ESLint, Vitest e cobertura V8 | Mantém as verificações anteriores |
| SAST | Semgrep com regras locais em `.semgrep.yml` | Bloqueia padrões inseguros em JS/JSX |
| SCA | `npm audit --audit-level=high` | Bloqueia vulnerabilidades altas e críticas |
| Segredos | Gitleaks com regras padrão e marcador didático | Busca credenciais no histórico |
| Supply chain | Versões exatas, lockfile, `npm ci`, Actions por SHA e token restrito | Reduz mudanças inesperadas e privilégios |
| Inventário | SBOM CycloneDX produzida pelo npm | Registra os componentes da instalação |
| Security Gate | `needs` no job `build` | Só constrói após aprovação dos controles |
| SonarQube | Etapa e propriedades comentadas | Preserva a referência sem exigir servidor ou secrets |

A versão anterior permanece independente. Não é necessário copiar configurações dela para executar esta pasta.

## Estrutura e responsabilidades

```text
src/
  App.jsx                       interface e estado da busca
  SearchEmptyState.jsx          saída da busca como texto
  SearchEmptyState.test.jsx     regressão de escape de HTML
  search.js                     filtro sem executar a entrada
  search.test.js                testes da busca
  data.js                       dados estáticos do catálogo
  main.jsx / styles.css         montagem e apresentação
.semgrep.yml                    regras SAST versionadas
.gitleaks.toml                  regras de secret scanning
.gitignore                      exclusão de gerados e arquivos .env
eslint.config.js                regras de qualidade e reconhecimento de JSX
vite.config.js                  React e relatórios de cobertura
package.json / package-lock.json dependências, scripts e árvore fixada
sonar-project.properties        configuração comentada
.github/workflows/ci.yml         workflow para repositório independente
ATIVIDADE-PRATICA.md             proposta de trabalho para os alunos
```

## Execução local

Recomendação: Node.js 22, npm 11.21.1. As dependências também suportam Node 20 a partir de 20.19. O pipeline usa Node 22 e fixa npm 11.21.1. O npm também é padronizado para manter consistentes a instalação, a auditoria e a geração da SBOM entre a máquina dos alunos e o CI.

```bash
cd aula-seguranca
npm install --global npm@11.21.1
npm ci
npm run dev
```

Abra a URL exibida pelo Vite. `npm run build` cria `dist/` e `npm run preview` permite inspecionar esse build localmente.

`npm ci` exige o lockfile e falha quando ele diverge de `package.json`. Ao atualizar uma biblioteca, use `npm install --save-exact pacote@versao`, revise o diff e versione os dois arquivos. Não apague o lockfile para fazer o CI passar.

### Qualidade e cobertura

```bash
npm run lint
npm test
npm run coverage
```

`src/search.js` normaliza espaços e caixa e usa `includes` para comparar texto. Os testes verificam nome, categoria, descrição, busca vazia, conteúdo semelhante a código e preservação dos dados.

`eslint.config.js` mantém `no-unused-vars`, `no-console` e `eqeqeq`. As regras de React reconhecem componentes usados em JSX. Isso evita tratar imports de componentes como variáveis sem uso.

A cobertura gera resumo no terminal, HTML e `coverage/lcov.info`. A configuração em `vite.config.js` inclui código de aplicação e exclui os dados estáticos e o ponto de montagem. Cobertura mede execução de código, não ausência de vulnerabilidades. Não há um percentual mínimo configurado; o bloqueio de qualidade ocorre por erro no lint ou nos testes. O job usa `npm run coverage`, que já executa os testes, sem duplicar a execução.

## Segurança no código: entrada como texto

A busca é entrada não confiável. Em `App.jsx`, ela filtra dados e, quando não há resultado, é passada ao componente `SearchEmptyState.jsx`:

```jsx
<div className="empty-state">
  Nenhuma tecnologia encontrada para “{searchTerm}”.
</div>
```

A interpolação JSX escapa o valor nesse contexto de texto. Uma entrada como `<img src=x onerror="alert(1)">` deve aparecer literalmente, sem criar uma imagem. O teste usa `renderToStaticMarkup` para verificar o HTML produzido pelo componente real: a abertura da tag vira `&lt;img` e não existe uma tag `<img` na saída.

Essa proteção se aplica a esse ponto de renderização; não torna qualquer URL ou uso futuro de HTML seguro. Por isso, evitamos `innerHTML`, `dangerouslySetInnerHTML` e execução de strings como código.

## SAST — Semgrep

SAST analisa o código sem executar a aplicação. ESLint e SAST são complementares: as regras de qualidade da aula anterior não cobrem os mesmos padrões de segurança.

Instale o Semgrep em um ambiente Python 3.12 separado:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install semgrep==1.182.0
npm run security:sast
```

No Windows, ative o ambiente conforme seu terminal, por exemplo `.venv\Scripts\Activate.ps1` no PowerShell.

O script usa `semgrep scan --config .semgrep.yml --error --strict src`. As três regras locais procuram atribuição a `innerHTML`/`outerHTML` e chamadas a `insertAdjacentHTML`, uso de `dangerouslySetInnerHTML` e execução com `eval`/`new Function`.

`--error` retorna falha quando há um achado; `--strict` também trata problemas de análise como falhas. No CI, o resultado fica em `reports/semgrep.json`, com métricas e verificação de versão desativadas. As regras estão no Git, sem necessidade de conta, token ou download de um ruleset remoto a cada execução.

São regras conservadoras para demonstração: podem apontar usos com conteúdo constante e não fazem uma análise completa de fluxo de dados. Um resultado limpo significa apenas que essas regras não encontraram os padrões analisados. A versão da ferramenta e as regras devem ser revisadas ao evoluir o projeto.

## SCA — dependências diretas e transitivas

```bash
npm run security:sca
```

O comando consulta a base de advisories do registro npm para a árvore instalada, incluindo ferramentas de desenvolvimento. Uma dependência transitiva também pode causar bloqueio. O relatório pode citar CVEs ou outros identificadores de advisories; a severidade orienta a política de bloqueio.

A política é bloquear severidades **high** e **critical**. Riscos baixos e moderados continuam aparecendo no relatório, mas não provocam falha por essa política. O parâmetro `--audit-level=high` altera o código de saída, não oculta resultados inferiores.

No CI, o JSON fica em `reports/npm-audit.json`. Indisponibilidade do registro também faz o comando falhar: não é tratada como aprovação. O resultado pode mudar sem alterações no código quando uma vulnerabilidade passa a ser conhecida.

Não aplique `npm audit fix --force` automaticamente. Identifique a dependência, avalie uso e impacto, escolha a atualização e execute os testes. Lockfile e versão exata ajudam na reprodução; não garantem que o pacote seja seguro.

## Secret scanning — Gitleaks

Instale o [Gitleaks](https://github.com/gitleaks/gitleaks#installing), versão **8.30.1**, no `PATH`. Não é necessária a action comercial nem uma chave de licença: o workflow executa a CLI.

```bash
npm run security:secrets
# Inclui arquivos locais ainda não commitados; use antes do commit:
npm run security:secrets:dir
```

O primeiro comando examina o histórico do repositório Git; o segundo examina arquivos da pasta atual. A configuração `.gitleaks.toml` estende as regras padrão e acrescenta um marcador artificial para a demonstração. No CI, a configuração é passada explicitamente e `fetch-depth: 0` traz o histórico completo. Neste repositório com várias aulas, o histórico analisado é o do repositório inteiro.

`--redact` mascara os valores encontrados. O relatório do pipeline fica em `reports/gitleaks.json`. No job de segredos não instalamos as dependências da aplicação; só precisamos do checkout e do scanner. O binário Linux é baixado de uma release fixa e comparado com um SHA-256 registrado no workflow antes de ser executado.

Um `.env` ignorado pelo Git não é armazenamento seguro de credenciais. Nenhum segredo deve ir para o código do navegador: variáveis `VITE_*` podem ser incorporadas ao bundle. Um vazamento real exige revogar/rotacionar a credencial, remover a exposição e investigar seu uso. Apagar a linha em um commit posterior não a remove do histórico nem elimina o alerta.

## Do workflow ao Security Gate

Há duas versões equivalentes para os dois usos do material:

- **Neste repositório:** `../.github/workflows/aula-seguranca.yml` está na raiz e executa comandos em `aula-seguranca`. Paths de cache e artefatos também levam esse prefixo, pois `defaults.run.working-directory` só afeta passos `run`.
- **No repositório do aluno:** copie o conteúdo desta pasta, incluindo arquivos ocultos, para a raiz do novo repositório. `.github/workflows/ci.yml` já usa os caminhos relativos dessa estrutura. Não ative simultaneamente as duas versões.

O GitHub não descobre workflows em `.github` de subpastas. Em ambas as versões, os eventos são push para `main`, pull request para `main` e execução manual.

```text
Checkout + instalação → Qualidade (lint + testes/cobertura) ─┐
Checkout + Semgrep    → SAST                               │
Checkout + npm ci     → SCA                                ├→ Gate → Build + SBOM
Checkout completo    → Gitleaks (histórico)                 │
                                                          ┘
```

Os quatro jobs executam independentemente, permitindo observar todos os resultados mesmo que um controle falhe. O gate é a dependência explícita do build:

```yaml
needs: [qualidade, sast, sca, segredos]
```

Não há `continue-on-error`, `|| true` ou `if: always()` no build para contornar falhas. `if: always()` é usado somente no upload dos relatórios, permitindo consultar evidências de uma execução reprovada. Arquivos gerados ficam ignorados pelo Git; no Actions são artefatos retidos por sete dias.

| Verificação | Quando bloqueia |
| --- | --- |
| Qualidade | Erro de lint, teste ou geração da cobertura |
| SAST | Achado das regras configuradas ou erro do scanner |
| SCA | Vulnerabilidade alta/crítica ou erro de execução |
| Segredos | Credencial detectada ou erro do scanner |
| Build | Só é iniciado se os quatro jobs passarem |

O workflow bloqueia a geração do artefato, mas não configura a política de merge do GitHub. Para impedir merge, configure proteção/ruleset da branch exigindo os quatro checks. Não marque somente `build` como evidência de segurança: ele pode ficar ignorado quando uma dependência falha.

### Supply chain aplicada ao próprio CI

- `permissions: contents: read` aplica privilégio mínimo ao token do workflow.
- `persist-credentials: false` evita manter a credencial do checkout na configuração Git.
- Actions ativas são fixadas em SHA completo, com comentários indicando a versão de referência; tags podem mudar. Revise e atualize esses SHAs periodicamente.
- Semgrep e Gitleaks têm versões fixadas; o download do Gitleaks também tem verificação de checksum. As dependências Python transitivas não têm um lockfile próprio nesta aula.
- `npm ci` usa o lockfile e valida integridades registradas. Scripts de instalação de dependências ainda podem executar código: essa medida não isola pacotes maliciosos.
- `timeout-minutes` limita jobs travados. O workflow não recebe credenciais de deploy e não publica a aplicação.

## SBOM e proveniência

Após o build, `npm sbom --sbom-format cyclonedx` gera `reports/sbom.cdx.json`. O artefato `catalogo-e-sbom` contém `dist/` e esse inventário. A SBOM inclui a árvore instalada, inclusive ferramentas de desenvolvimento; nem todos esses pacotes são incorporados ao JavaScript entregue ao navegador.

Para gerar localmente:

```bash
mkdir -p reports
npm sbom --sbom-format cyclonedx > reports/sbom.cdx.json
```

O comando via npm também está disponível como `npm run sbom`; ao redirecionar para JSON, prefira o comando direto acima ou `npm run --silent sbom` para evitar cabeçalhos do npm.

SBOM é um inventário. Proveniência registra como, onde e a partir de qual revisão o artefato foi construído. Os logs do Actions ajudam na rastreabilidade, mas esta versão não produz atestação criptográfica de proveniência nem assinatura do build. Essa é uma possível extensão da aula.

## SonarQube comentado

A etapa aparece comentada no workflow e todas as propriedades de `sonar-project.properties` estão comentadas. Nenhum secret Sonar é necessário nesta aula. Para reativar posteriormente, descomente a configuração, ajuste a chave do projeto, configure `SONAR_HOST_URL` e `SONAR_TOKEN` em Actions secrets e fixe a action em um SHA verificado. No workflow da raiz, configure também o diretório-base da análise para `aula-seguranca`. O scan isolado não implementa espera pelo Quality Gate do SonarQube.

## Roteiro de demonstração e limites

Primeiro execute a versão sem alterações e abra os relatórios. Depois, use a [atividade prática](ATIVIDADE-PRATICA.md) para introduzir um padrão inseguro, mostrar o bloqueio e corrigir. A prática inclui uma simulação de segredo sem usar credenciais reais e uma análise de dependência em ambiente descartável.

Passar nos testes ou scanners não prova ausência de vulnerabilidades. Estes controles demonstram detecção antecipada e consequências no CI; não incluem DAST, autenticação, backend, deploy, monitoramento ou resposta automatizada a incidentes.

## Referências oficiais

- [Semgrep: estrutura e sintaxe de regras](https://semgrep.dev/docs/writing-rules/rule-syntax).
- [npm audit: severidades e códigos de saída](https://docs.npmjs.com/cli/v11/commands/npm-audit/).
- [Gitleaks: CLI, configuração e instalação](https://github.com/gitleaks/gitleaks).
- [GitHub Actions: uso seguro e privilégio mínimo](https://docs.github.com/en/actions/reference/security/secure-use).
