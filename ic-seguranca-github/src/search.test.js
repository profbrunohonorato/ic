import { describe, expect, it } from 'vitest';
import { filterTechnologies } from './search.js';

const items = [
  { id: 1, name: 'React', category: 'Frontend', description: 'Biblioteca de UI' },
  { id: 2, name: 'Docker', category: 'DevOps', description: 'Containers' },
  { id: 3, name: 'Vitest', category: 'Testes', description: 'Test runner' },
];

describe('filterTechnologies', () => {
  it('filtra tecnologias pelo termo pesquisado', () => {
    const result = filterTechnologies(items, 'react');

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('React');
  });

  it('pesquisa por categoria e ignora espaços e diferenças de caixa', () => {
    expect(filterTechnologies(items, '  DEVOPS  ')).toEqual([items[1]]);
  });

  it('pesquisa pela descrição', () => {
    expect(filterTechnologies(items, 'biblioteca')).toEqual([items[0]]);
  });

  it('trata conteúdo semelhante a código como um termo literal', () => {
    expect(filterTechnologies(items, '<script>alert(1)</script>')).toEqual([]);
  });

  it('não modifica os dados ao pesquisar', () => {
    const original = structuredClone(items);
    filterTechnologies(items, 'react');
    expect(items).toEqual(original);
  });

  it('retorna todos os itens quando a busca está vazia', () => {
    expect(filterTechnologies(items, '')).toEqual(items);
  });
});
