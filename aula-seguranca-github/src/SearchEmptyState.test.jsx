import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import SearchEmptyState from './SearchEmptyState.jsx';

describe('SearchEmptyState', () => {
  it('escapa HTML recebido na busca em vez de criar uma tag executável', () => {
    const searchTerm = '<img src=x onerror="alert(1)">';
    const html = renderToStaticMarkup(<SearchEmptyState searchTerm={searchTerm} />);

    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
    expect(html).toContain('Nenhuma tecnologia encontrada');
  });
});
