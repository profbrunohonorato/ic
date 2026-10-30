# OpenBao com Docker e GitHub Actions em runner self-hosted

Este passo a passo instancia um OpenBao persistente, configura confiança no GitHub OIDC e executa um job em Linux self-hosted. O “listener” é o processo do runner que aguarda jobs do GitHub. Não é um webhook nem um listener do OpenBao; no arquivo HCL, `listener` significa a porta HTTPS da API do vault.

O laboratório lê um segredo artificial e demonstra a negação de outro caminho. Ele não realiza deploy de produção. Para executar uma operação real de CD, substitua o ponto de consumo no cliente por uma chamada ao serviço autorizado, mantendo a credencial fora do frontend.

## 1. Preparar as duas máquinas

| Máquina | Componentes | Acessos necessários |
| --- | --- | --- |
| VM A: vault | Linux, Docker Engine, Compose v2, OpenSSL, OpenBao | Saída HTTPS para descoberta OIDC/JWKS do GitHub; entrada TCP 8200 somente do runner e da administração |
| VM B: runner | Linux x64 com systemd, Python 3, certificados de sistema e runner Actions | Saída HTTPS para GitHub e seus domínios de Actions; acesso HTTPS privado ao vault em 8200 |

Sincronize os relógios. Use uma rede privada/VPN entre as VMs e configure `bao.lab` para resolver ao IP privado da VM A. É possível usar `/etc/hosts` nas duas máquinas, por exemplo `10.10.0.10 bao.lab`, trocando pelo endereço real.

O GitHub não precisa acessar a porta do vault: o runner inicia as conexões de saída para o GitHub e se conecta ao OpenBao pela rede privada. Não abra portas de entrada no runner para receber jobs. [Comunicação dos runners](https://docs.github.com/en/actions/reference/runners/self-hosted-runners).

Use um repositório privado de laboratório ou um runner cuja utilização esteja estritamente controlada. Este workflow não deve executar código de PRs externos. O usuário do runner não deve ser root, ter sudo irrestrito ou pertencer ao grupo Docker. Quem controla o daemon Docker do vault pode comprometer seus dados; por isso as VMs são separadas.

## 2. Preparar os arquivos na VM A

Copie ou clone o repositório na VM do vault e entre na pasta:

```bash
cd ic-seguranca-github/openbao
docker version
docker compose version
cp .env.example .env
```

Edite `.env` e use o IP **privado da VM A**:

```dotenv
BAO_BIND_IP=10.10.0.10
```

O padrão `127.0.0.1` permite acesso apenas na própria VM; não funciona para a VM B. Não substitua por `0.0.0.0` sem planejar a exposição. Restrinja a publicação também no firewall da infraestrutura e nas regras compatíveis com Docker; portas publicadas pelo Docker podem não seguir as expectativas de um firewall UFW comum. [Portas publicadas no Docker](https://docs.docker.com/engine/network/port-publishing/).

O Compose usa `openbao/openbao:2.7.2`, versão existente na preparação deste material. Revise advisories antes de usar e considere fixar o digest aprovado em ambientes reais. A instância usa armazenamento em arquivo com volume persistente, sem modo dev e sem alta disponibilidade. [Imagem oficial](https://hub.docker.com/r/openbao/openbao), [release usada](https://github.com/openbao/openbao/releases/tag/v2.7.2).

## 3. Gerar TLS e preparar volumes

Na VM A:

```bash
bash generate-lab-tls.sh
docker compose pull
docker compose run --rm --no-deps --user 0 --entrypoint sh \
  -v "$PWD/.local/tls:/orig:ro" openbao -ec '
    cp /orig/ca.crt /orig/server.crt /orig/server.key /openbao/tls/
    chown -R openbao:openbao /openbao/file /openbao/logs /openbao/tls
    chmod 700 /openbao/file /openbao/logs /openbao/tls
    chmod 600 /openbao/tls/server.key
    chmod 644 /openbao/tls/ca.crt /openbao/tls/server.crt
  '
docker compose config --quiet
docker compose up -d
docker compose logs --tail=50 openbao
```

O script gera uma CA e um certificado válido por 30 dias para `bao.lab`, `localhost` e `127.0.0.1`. Ele recusa sobrescrever uma pasta existente. Só `ca.crt`, `server.crt` e `server.key` são copiados para o volume do serviço. A chave privada da CA permanece em `.local/tls/ca.key`: guarde-a em local offline protegido após a emissão; nunca a copie para o runner ou para o Git.

Em produção, use a PKI da organização, renovação e proteção apropriada da chave. Não use `curl -k`, `BAO_SKIP_VERIFY` ou contexto TLS sem validação para contornar erros.

Os volumes guardam dados, auditoria e TLS. O processo do servidor usa o usuário `openbao`; o comando de preparação é administrativo e não deve ser executado pelo runner. `IPC_LOCK` permite o bloqueio de memória configurado no HCL. [Configuração do OpenBao](https://openbao.org/docs/configuration/).

## 4. Inicializar e desbloquear

Execute **uma única vez**, em terminal administrativo sem gravação de tela/log de sessão:

```bash
docker compose exec openbao bao operator init -key-shares=1 -key-threshold=1
docker compose exec openbao bao operator unseal
docker compose exec openbao bao status
```

O primeiro comando mostra uma unseal key e o token root inicial. Guarde-os fora do GitHub e do runner. O segundo solicita a unseal key interativamente, evitando colocá-la no histórico do shell. O resultado final deve indicar `Initialized: true` e `Sealed: false`.

Uma chave com limiar 1 simplifica **somente este laboratório**. Em produção, planeje custódia separada, quórum ou auto-unseal e recuperação. Não inicialize outra vez para tentar resolver uma instância sealed. Após reiniciar este servidor com Shamir, será necessário executar `operator unseal` novamente. [Inicialização e unseal](https://openbao.org/docs/commands/server/).

Para os próximos comandos, no Bash da VM A, leia o token root sem mostrá-lo e defina um helper:

```bash
read -rsp 'Token administrativo do laboratório: ' BAO_TOKEN
printf '\n'
export BAO_TOKEN
bao_admin() { docker compose exec -T -e BAO_TOKEN openbao bao "$@"; }
```

Não use `set -x`. Esse token fica temporariamente no ambiente do terminal administrativo, não no YAML, no `.env` ou nos argumentos do comando. Proteja também o acesso à VM A.

## 5. Habilitar auditoria, KV e política

Ainda na VM A, com o helper da etapa anterior:

```bash
bao_admin audit enable file file_path=/openbao/logs/audit.log
bao_admin secrets enable -path=secret -version=2 kv
bao_admin kv put secret/ci/laboratorio DEMO_TOKEN=valor-artificial-da-aula
docker compose exec -T -e BAO_TOKEN openbao bao policy write ci-read-secret - < ci-read-secret.hcl
bao_admin auth enable -path=github jwt
bao_admin write auth/github/config \
  oidc_discovery_url=https://token.actions.githubusercontent.com \
  bound_issuer=https://token.actions.githubusercontent.com \
  jwt_supported_algs=RS256
```

Esses comandos de habilitação são para a primeira configuração; ao retomar o laboratório, consulte `audit list`, `secrets list` e `auth list` antes de repetir. Uma mensagem “path is already in use” não exige apagar os dados.

A policy permite ler apenas `secret/data/ci/laboratorio` e revogar a própria sessão. `secret/data/...` é o caminho da API KV v2; a CLI `bao kv` usa `secret/ci/...`. Não concedemos listagem nem leitura de todo o vault. A auditoria contém metadados de acesso e deve ser tratada como informação restrita. [KV v2](https://openbao.org/docs/secrets/kv/kv-v2/), [auditoria](https://openbao.org/docs/audit/).

## 6. Vincular a role ao repositório e ao workflow

Obtenha os IDs do repositório e de seu proprietário por uma consulta autenticada na API ou pelo GitHub CLI em sua estação administrativa:

```bash
gh api repos/SEU_USUARIO/SEU_REPOSITORIO --jq '{repository_id: .id, repository_owner_id: .owner.id}'
```

Na VM A:

```bash
cp role.json.example .local/role.json
```

Edite `.local/role.json`, trocando **todos** os placeholders por nomes e IDs reais. Os IDs devem permanecer strings JSON. O `workflow_ref` precisa ser exatamente:

```text
SEU_USUARIO/SEU_REPOSITORIO/.github/workflows/openbao-self-hosted.yml@refs/heads/main
```

Publique a role:

```bash
docker compose exec -T -e BAO_TOKEN openbao bao write auth/github/role/github-laboratorio - < .local/role.json
bao_admin read auth/github/role/github-laboratorio
unset BAO_TOKEN
unset -f bao_admin
```

A role exige audience `openbao-laboratorio`, repositório e proprietário por ID, branch `main`, environment `laboratorio`, evento manual, arquivo de workflow e runner self-hosted. Ela emite uma sessão de no máximo cinco minutos e não inclui a policy `default`. Não precisa vincular `sub`, cujo formato pode variar conforme a configuração da organização; os demais claims são comparados explicitamente. Se mudar o nome do environment, branch ou workflow, atualize ambos os lados. [API JWT do OpenBao](https://openbao.org/docs/api/auth/jwt/), [claims do GitHub](https://docs.github.com/en/actions/reference/security/oidc).

Root é apenas para bootstrap neste laboratório. Em uma implantação real, configure autenticação administrativa e recuperação antes de revogar o root inicial. Nunca cadastre esse root como Secret do GitHub.

## 7. Instalar o listener/runner na VM B

Use uma VM dedicada Linux x64, com uma conta de serviço, por exemplo `gha-runner`, sem sudo e sem acesso ao Docker do vault. O administrador instala dependências de sistema; os jobs não precisam de Docker para este exemplo.

No GitHub, abra **Settings → Actions → Runners → New self-hosted runner**, selecione Linux/x64 e execute na VM B, como `gha-runner`, os comandos atuais de download e verificação de checksum apresentados pelo GitHub. Não fixe no material um token de registro ou URL antiga de download.

No diretório extraído, configure com o token temporário recém-gerado:

```bash
./config.sh --url https://github.com/SEU_USUARIO/SEU_REPOSITORIO \
  --name runner-openbao-lab --labels openbao-lab
```

Informe o token no prompt quando solicitado. Esse token de registro é diferente de `GITHUB_TOKEN`, do JWT OIDC e do token do vault. Instale como serviço com uma conta administrativa da VM B:

```bash
sudo ./svc.sh install gha-runner
sudo ./svc.sh start
sudo ./svc.sh status
```

Para um teste em primeiro plano, é possível usar `./run.sh`, como `gha-runner`, em vez do serviço. Não execute os dois simultaneamente no mesmo diretório. Confira o runner como **Idle** no GitHub, com as labels `self-hosted`, `linux`, `x64` e `openbao-lab`. [Adicionar runner](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/add-runners), [serviço systemd](https://docs.github.com/en/actions/how-tos/manage-runners/self-hosted-runners/configure-the-application).

Se usar runner de organização, restrinja o runner group ao repositório e, quando disponível, aos workflows autorizados. Labels selecionam runners; não são um mecanismo de autorização. Para workloads de produção, prefira runners efêmeros e segregados de PRs não confiáveis.

## 8. Confiar na CA e testar a rede na VM B

Transfira **somente** `.local/tls/ca.crt` da VM A por um canal administrativo autenticado e confira sua origem. O administrador da VM B instala:

```bash
sudo install -d -m 755 /etc/openbao
sudo install -m 644 ca.crt /etc/openbao/ca.crt
```

Como usuário do runner, confira DNS, Python e HTTPS:

```bash
getent hosts bao.lab
python3 --version
curl --cacert /etc/openbao/ca.crt https://bao.lab:8200/v1/sys/health
```

O JSON deve indicar `initialized: true` e `sealed: false`. Um HTTP 503 costuma indicar sealed; HTTP 501, não inicializado. Não entregue a chave do certificado do servidor ou o root token ao runner. Não é necessário instalar o cliente `bao`: o script usa a biblioteca padrão do Python.

## 9. Configurar o environment do GitHub

Crie **Settings → Environments → laboratorio**, limite branches autorizadas a `main` e habilite revisão por outra pessoa quando disponível no plano. No environment, crie estas **Variables**:

| Nome | Valor |
| --- | --- |
| `BAO_ADDR` | `https://bao.lab:8200` |
| `BAO_ROLE` | `github-laboratorio` |

Não crie `BAO_TOKEN`, root ou unseal key como Secrets. `BAO_AUDIENCE` está fixada no workflow e coincide com a role. A CA fica instalada no runner em `/etc/openbao/ca.crt`; não é um segredo, mas sua integridade precisa ser protegida.

O `DEMO_TOKEN` usado neste exercício está no OpenBao. Ele não depende do Secret homônimo do laboratório anterior no GitHub.

## 10. Publicar e executar o pipeline

Na cópia de trabalho do repositório:

```bash
cp ic-seguranca-github/openbao/openbao-self-hosted.yml.example .github/workflows/openbao-self-hosted.yml
```

O template fica inativo até essa cópia; publique a alteração em `main` pelo fluxo de revisão da turma. Se esta aplicação estiver na raiz de um repositório independente, remova `defaults.run.working-directory: ic-seguranca-github`, altere o cache para `package-lock.json` e o comando Python para `python3 openbao/consume-secret.py`.

Abra **Actions → OpenBao - Runner self-hosted → Run workflow**, selecionando `main`. O pipeline faz:

1. `validar-build` em runner hospedado: instalação, lint, testes/cobertura, npm audit e build, sem acesso ao vault.
2. `consumir-segredo`, somente após aprovação do primeiro job e das regras do environment, na VM B.
3. Solicitação de JWT ao GitHub, habilitada por `id-token: write` apenas nesse job.
4. Login em `auth/github/login`, leitura do único caminho permitido e validação de um HTTP 403 em outro caminho.
5. Revogação da própria sessão no bloco `finally` do cliente.

O resultado esperado inclui “Leitura do segredo concluída”, “caminho adicional retornou HTTP 403” e “Sessão do OpenBao revogada”. O código não imprime JWT, token do vault ou segredo, e não os escreve em arquivos, outputs ou artefatos. Redirecionamentos HTTP são rejeitados e os certificados são validados.

O cliente não altera o bundle React. O exemplo termina na validação de consumo; **não publica a aplicação**. Para CD real, faça a operação no ponto indicado de `consume-secret.py`, com uma credencial específica para o destino. Preserve o CI de segurança existente: esse template complementar não substitui Semgrep, Gitleaks, Dependency Review, CodeQL ou regras de merge.

## 11. Verificar os limites e a persistência

Observe na auditoria, como administrador, o login, a leitura autorizada, a negação e a revogação; não publique o log completo. A negação do segundo caminho também é verificada automaticamente no script.

Para demonstrar restrição de identidade, altere temporariamente a audience da **role de laboratório** para outra string, execute novamente e confirme falha no login; restaure em seguida. Não exponha JWT para depurar claims. Para testar outra branch, o `if` atual ignora o job; isso demonstra o filtro do workflow, não uma negação do vault. Um teste de negação no vault precisa de uma identidade de teste que realmente chegue ao endpoint, mantendo os vínculos restritos.

Na VM A, teste um reinício planejado:

```bash
docker compose restart openbao
docker compose exec openbao bao operator unseal
docker compose exec openbao bao status
```

Os dados devem permanecer e a instância deve voltar a `Sealed: false`. Execute o workflow novamente. `docker compose down` para os containers, mas preserva os volumes nomeados; **`docker compose down -v` apaga os volumes deste laboratório**, incluindo dados, auditoria e TLS. Não use essa opção como solução para uma falha de configuração.

O TTL limita a sessão do vault. Como usamos KV estático, uma cópia de `DEMO_TOKEN` não expira junto com a sessão. Em produção, combine rotação no emissor ou engines dinâmicos com TTL/leases. Uma interrupção abrupta pode impedir o `finally`; a expiração limita esse caso, mas não impede roubo durante o job. [Tokens](https://openbao.org/docs/concepts/tokens/), [leases](https://openbao.org/docs/concepts/lease/).

## 12. Diagnosticar problemas comuns

| Sintoma | Verificação |
| --- | --- |
| Workflow permanece queued | Runner online, labels exatas, runner group e acesso do repositório; verificar também aprovação do environment |
| `Connection refused`/timeout | IP publicado no Compose, firewall, VPN, rota e resolução de `bao.lab` |
| Erro de certificado | CA correta em `/etc/openbao/ca.crt`, validade e SAN `bao.lab`; não desabilitar validação |
| Vault sealed após reinício | Executar unseal com custódia administrativa; não inicializar novamente |
| Variável OIDC ausente | `id-token: write` no job que executa o script; execução local comum não fornece identidade GitHub |
| Login negado | Role, audience, issuer, IDs, environment, branch, evento, workflow_ref e relógio |
| Login funciona, leitura falha | KV v2, caminho `secret/data/...`, policy vinculada e campo `DEMO_TOKEN` |
| Revogação retorna 403 | Capability `update` em `auth/token/revoke-self` na policy |
| Container não inicia | Logs, permissões dos volumes/TLS e suporte a `IPC_LOCK`; não resolver com servidor dev |
| Auditoria impede operações | Espaço e permissões do volume de logs; monitorar e planejar retenção/rotação |

Este desenho é uma instância única de ensino. Antes de produção, projete disponibilidade, backup e restauração, custódia de chaves, autenticação administrativa, renovação de certificados, atualização, retenção de auditoria e isolamento dos runners. A separação do vault e a identidade temporária reduzem o impacto potencial; não tornam um job comprometido confiável.
