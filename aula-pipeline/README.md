# React + GitHub Actions — Projeto-base

Projeto React simples para servir de base às atividades da disciplina de **Integração Contínua**.

O objetivo inicial é compreender o fluxo:

```text
Commit → Push → GitHub Actions → Runner → Build → Resultado
```

## 1. Executar a aplicação localmente

Requisitos:

- Node.js 20 ou superior;
- npm;
- Git.

Na raiz do projeto, execute:

```bash
npm install
npm run dev
```

O Vite exibirá no terminal o endereço local da aplicação, normalmente `http://localhost:5173`.

Para testar o mesmo build executado pelo pipeline:

```bash
npm run build
```

O resultado será gerado no diretório `dist/`.

## 2. Criar o repositório no GitHub

Crie um repositório no GitHub e envie este projeto para a branch `main`.

Exemplo:

```bash
git init
git add .
git commit -m "feat: projeto inicial"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```

Substitua `URL_DO_SEU_REPOSITORIO` pela URL do repositório criado no GitHub.

## 3. Workflow do GitHub Actions

O projeto já contém o arquivo:

```text
.github/workflows/ci.yml
```

> No Linux, `.github` é um diretório oculto. Use `ls -la` no terminal ou `Ctrl+H` no gerenciador de arquivos para visualizá-lo.

O workflow é executado quando ocorre um `push` para a branch `main`.

```yaml
name: CI - React

on:
  push:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm install

      - name: Build
        run: npm run build
```

## 4. Runner: é necessário configurar uma máquina?

**Não.** Neste projeto utilizamos um **runner hospedado pelo próprio GitHub**.

A linha abaixo solicita ao GitHub uma máquina virtual Ubuntu para executar o job:

```yaml
runs-on: ubuntu-latest
```

Quando o workflow é disparado, o GitHub cria temporariamente esse ambiente, executa os `steps` e encerra o runner ao final da execução.

Portanto, para esta atividade, **não é necessário cadastrar um self-hosted runner, instalar o GitHub Actions Runner ou possuir uma VPS**.

## 5. Verificar o GitHub Actions

Depois que o projeto estiver no GitHub:

1. Abra o repositório.
2. Clique na aba **Actions**.
3. Se for a primeira utilização do Actions no repositório e o GitHub apresentar uma tela para habilitá-lo, habilite o GitHub Actions para o repositório.
4. O workflow **CI - React** deverá aparecer na lateral ou na lista de workflows.

Se ainda não houver nenhuma execução, faça uma pequena alteração no projeto e envie um novo commit para a `main`.

```bash
git add .
git commit -m "test: dispara pipeline"
git push origin main
```

O `push` gera o evento que inicia o workflow automaticamente.

## 6. Acompanhar o pipeline executando

Logo após o `push`:

1. Abra **GitHub → Repositório → Actions**.
2. Clique na execução mais recente de **CI - React**.
3. Abra o job **build**.
4. Acompanhe os steps sendo executados.

Você deverá encontrar uma sequência semelhante a:

```text
Set up job
   ↓
Checkout
   ↓
Setup Node.js
   ↓
Install dependencies
   ↓
Build
   ↓
Complete job
```

Durante a execução, o GitHub mostra o status de cada etapa. Ao final, uma execução válida deverá aparecer com indicação de sucesso.

## 7. Visualizar os logs

Dentro do job **build**, clique em qualquer step para expandir seus logs.

Por exemplo, em **Build**, será possível acompanhar a saída do comando:

```bash
npm run build
```

Os logs são importantes para identificar **qual step falhou e qual erro ocorreu**.

## 8. Testar uma falha no pipeline

Para observar o feedback do CI, provoque temporariamente um erro no projeto ou no comando de build, faça commit e envie para a `main`.

Observe na aba **Actions**:

```text
Push
  ↓
Workflow
  ↓
Runner
  ↓
Step com erro ✕
  ↓
Pipeline com falha
```

Abra o step que falhou e analise o log. Depois, corrija o problema, faça outro commit e envie novamente.

O objetivo é chegar novamente a:

```text
Push → Workflow → Runner → Build → ✓ Sucesso
```

## 9. O que observar nesta atividade

Ao finalizar, você deve conseguir identificar no GitHub Actions:

- o **evento** que disparou o workflow (`push`);
- o **workflow** (`CI - React`);
- o **job** (`build`);
- o **runner** (`ubuntu-latest`);
- os **steps** executados;
- os **logs** de cada step;
- o resultado final da execução.

Nesta etapa ainda não são necessários testes automatizados, cobertura, lint, análise estática, SAST, deploy ou monitoramento. Esses recursos serão adicionados progressivamente ao pipeline nas próximas atividades.
