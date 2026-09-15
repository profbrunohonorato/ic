# Catálogo de Tecnologias — Projeto-base

Projeto React usado como ponto de partida para a aula de qualidade de software no pipeline.

## Feature principal

- Lista fixa com 30 tecnologias.
- Campo `searchTerm` para filtrar por nome, categoria ou descrição.
- Contador de resultados.
- Estado vazio quando nenhum item é encontrado.

## Executar

```bash
npm install
npm run dev
```

## CI inicial

O workflow `.github/workflows/ci.yml` corresponde ao estágio da aula anterior e executa apenas:

1. Checkout.
2. Setup Node.js 20.
3. `npm install`.
4. `npm run build`.

Testes, cobertura, lint e análise estática serão adicionados na aula seguinte.
