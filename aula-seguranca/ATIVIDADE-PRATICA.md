# Atividade prática — provar que o Security Gate funciona

## Proposta ao professor

Duração sugerida: 90 a 120 minutos, em duplas. Os alunos recebem esta versão funcional e investigam seus controles por meio de experimentos: execução aprovada, falha controlada, diagnóstico e correção. O foco é explicar por que cada ferramenta bloqueou, sem apenas reproduzir YAML.

Se a turma já construiu a aula de qualidade, uma alternativa é fornecer somente o enunciado e pedir que implementem os controles nela, usando esta pasta como referência do professor. Nesse caso, acrescente tempo para instalar ferramentas e montar os jobs.

## Objetivos e preparação

Ao concluir, a dupla deve distinguir qualidade, SAST, SCA e secret scanning; demonstrar o gate; explicar mínimo privilégio, lockfile e SBOM; e reconhecer os limites das ferramentas.

Use Node.js 22, npm 11.21.1, Python 3.12, Semgrep 1.182.0, Gitleaks 8.30.1 e um repositório GitHub com Actions habilitado. Sigam as instruções de instalação do README.

Copiem o conteúdo de `aula-seguranca`, incluindo `.github`, `.semgrep.yml` e `.gitleaks.toml`, para a raiz de um repositório da dupla. Incluam o lockfile; não incluam `node_modules`, relatórios, `.venv` ou credenciais. O workflow `.github/workflows/ci.yml` já corresponde a essa estrutura. Se trabalharem no repositório original com as três pastas, usem o workflow da raiz e executem comandos npm dentro de `aula-seguranca`.

Criem uma branch de atividade e abram um PR para `main`. Não façam merge dos cenários com falha. Usem apenas dados artificiais e não publiquem credenciais reais.

## 1. Obter e explicar a execução inicial — 15 min

Executem `npm ci`, lint, cobertura, SAST e SCA localmente. Enviem a versão inicial e observem os jobs no Actions.

Registrem a execução aprovada e respondam:

1. Por que o job de qualidade usa cobertura sem executar `npm test` separadamente?
2. Por que `npm ci` depende do lockfile? Qual a diferença em relação a instalar `latest` a cada build?
3. Em qual trecho do YAML está o gate? O que acontece com `build` quando `sast` falha?
4. O workflow por si só impede merge? O que falta configurar no GitHub?

Se houver um advisory novo bloqueando a versão inicial, documentem o pacote e a atualização necessária antes de prosseguir. Não reduzam a severidade da política para obter aprovação.

## 2. SAST: criar uma falha que os testes não detectam — 20 min

Adicionem temporariamente `src/exemplo-inseguro.js`:

```js
// Apenas para análise estática: não importar nem executar na aplicação.
export function atualizarDescricao(elemento, texto) {
  elemento.innerHTML = texto;
}
```

Executem lint e testes; depois executem `npm run security:sast`. Enviem essa alteração ao PR. Abram `semgrep.json`, identifiquem a regra e confirmem que o build ficou bloqueado, mesmo que a qualidade tenha passado.

Corrijam a implementação para `elemento.textContent = texto`, repitam as verificações e enviem a correção. Expliquem por que a mudança é adequada para exibir texto e por que não é necessário sanitizar HTML quando o requisito não exige interpretar HTML.

Experimentem também pesquisar `<img src=x onerror="alert(1)">` na interface normal. Expliquem o resultado e relacionem-no ao teste de `SearchEmptyState`. Esse teste verifica o escape naquele componente; não cobre todos os possíveis pontos de XSS da aplicação.

## 3. SCA: investigar uma dependência vulnerável — 20 min

Na mesma branch, em um commit separado, adicionem uma dependência com vulnerabilidades conhecidas, sem executar código dela:

```bash
npm install --save-exact --ignore-scripts lodash@4.17.20
npm run security:sca
```

O pacote serve apenas ao experimento e não deve ser importado na aplicação. Consultem o relatório e registrem nome, versão, identificador do advisory/CVE quando disponível, severidade e versão de correção indicada. Enviem `package.json` e `package-lock.json` ao PR para demonstrar a reprovação de SCA.

Como a aplicação não usa essa biblioteca, removam-na com `npm uninstall lodash`, repitam `npm ci`, qualidade e SCA e enviem a correção. Se optarem por estudar uma atualização, usem a versão corrigida indicada pelo relatório e justifiquem sua escolha. Não usem `npm audit fix --force` como resposta automática.

Respondam: a biblioteca era direta ou transitiva? Uma ferramenta de build vulnerável também pode importar? Por que uma alteração na base de advisories pode mudar o resultado do mesmo lockfile?

## 4. Segredos: entender por que apagar não basta — 20 min

Façam este experimento **em um repositório local descartável**, separado do repositório entregue. Assim, não será necessário reescrever o histórico do trabalho para remover o marcador. Os comandos abaixo assumem Bash e execução a partir da raiz da versão de segurança:

```bash
pasta_demo=$(mktemp -d)
cp .gitleaks.toml "$pasta_demo/.gitleaks.toml"
git -C "$pasta_demo" init
# O valor é construído com partes para não registrar um marcador completo no enunciado.
node -e 'process.stdout.write("AULA_" + "TOKEN_" + "ABCDEFGHIJKLMNOP" + "\n")' > "$pasta_demo/credencial.txt"
gitleaks dir --config "$pasta_demo/.gitleaks.toml" --redact --exit-code 1 "$pasta_demo"
```

A última linha deve retornar falha, com a regra `credencial-didatica`. O marcador não dá acesso a nenhum serviço. Para demonstrar o histórico:

```bash
git -C "$pasta_demo" add .
git -C "$pasta_demo" -c user.name=Aluno -c user.email=aluno@example.invalid commit -m "Experimento com marcador artificial"
git -C "$pasta_demo" rm credencial.txt
git -C "$pasta_demo" -c user.name=Aluno -c user.email=aluno@example.invalid commit -m "Remove marcador da árvore atual"
gitleaks dir --config "$pasta_demo/.gitleaks.toml" --redact --exit-code 1 "$pasta_demo"
gitleaks git --config "$pasta_demo/.gitleaks.toml" --redact --exit-code 1 "$pasta_demo"
```

Comparem os dois últimos resultados: a árvore atual está limpa, mas o histórico ainda contém o marcador. O repositório descartável pode ser mantido para apresentação e removido depois conforme as orientações do professor; não o enviem como parte do projeto.

Entreguem as saídas mascaradas e respondam: o que seria necessário se a credencial fosse real? Por que `.gitignore` e apagar um arquivo não resolvem um vazamento já commitado? Por que o CI usa `fetch-depth: 0`?

Para observar esse bloqueio também no Actions, o professor pode fornecer um repositório descartável dedicado ao experimento. A falha é esperada até que seu histórico seja tratado; não adicionem uma exceção ampla nem desabilitem o scanner para obter aprovação.

## 5. Inspecionar a cadeia de suprimentos — 15 min

Na execução final aprovada, baixem `catalogo-e-sbom` e abram a SBOM. Identifiquem React, Vite e uma dependência transitiva. Expliquem a diferença entre uma biblioteca usada pela aplicação e uma ferramenta de build presente no inventário.

No YAML, indiquem uma action fixada por SHA, a permissão do token e a validação de checksum do Gitleaks. Expliquem o risco reduzido por cada controle. Por fim, diferenciem SBOM e proveniência: esta implementação gera inventário, mas não uma atestação assinada da origem do build.

## Entrega e avaliação

Entreguem o link do PR e um `RELATORIO-SEGURANCA.md` com links das execuções e evidências mascaradas. O relatório deve conter execução inicial e final aprovadas, falhas de SAST e SCA, o experimento local com Gitleaks, a explicação do gate e uma conclusão sobre os limites das verificações. A versão final não deve manter a dependência vulnerável ou o marcador artificial.

| Critério | Peso |
| --- | --- |
| Mantém qualidade e execução funcional do catálogo | 15% |
| Demonstra e explica falha/correção de SAST | 20% |
| Investiga e corrige a dependência vulnerável | 20% |
| Demonstra scanning da árvore e do histórico sem credencial real | 20% |
| Explica o gate e apresenta evidências de bloqueio e aprovação | 15% |
| Interpreta SBOM e controles do workflow | 10% |

Desabilitar um controle, ignorar seu código de saída ou baixar o nível de proteção para forçar aprovação não conta como correção. Uma justificativa deve explicar o risco e a solução adotada, vinculada ao achado.

Extensão opcional: configurar checks obrigatórios na proteção de `main` ou implementar proveniência assinada do artefato, justificando as permissões adicionais e a forma de verificação.
