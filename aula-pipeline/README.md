# SPA React — Projeto Base para CI

Projeto mínimo em React + Vite para as atividades da disciplina de Integração Contínua.

## Executar localmente

```bash
npm install
npm run dev
```

## Gerar o build

```bash
npm run build
```

O resultado será criado em `dist/`.

## Pipeline

O workflow está em `.github/workflows/ci.yml`.

Ao realizar um `push` para a branch `main`, o GitHub Actions executa:

`Push → Checkout → Setup Node.js → npm install → npm run build`

Acompanhe a execução na aba **Actions** do repositório.
