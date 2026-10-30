import { useMemo, useState } from 'react';
import { technologies } from './data.js';
import { filterTechnologies } from './search.js';
import SearchEmptyState from './SearchEmptyState.jsx';

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTechnologies = useMemo(
    () => filterTechnologies(technologies, searchTerm),
    [searchTerm],
  );

  return (
    <main className="container">
      <header className="hero">
        <span className="eyebrow">Integração Contínua • Segurança no pipeline</span>
        <h1>Catálogo de Tecnologias</h1>
        <p>
          Pesquise tecnologias por nome, categoria ou descrição. A lista possui
          30 elementos e é validada por verificações de qualidade e segurança.
        </p>
      </header>

      <section className="search-panel" aria-label="Pesquisa">
        <label htmlFor="search">Termo de busca</label>
        <input
          id="search"
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Ex.: React, DevOps, testes..."
        />
        <div className="result-count">
          {filteredTechnologies.length} de {technologies.length} tecnologias
        </div>
      </section>

      <section>
        {filteredTechnologies.length > 0 ? (
          <ul className="technology-list">
            {filteredTechnologies.map((technology) => (
              <li key={technology.id} className="technology-card">
                <div className="card-topline">
                  <strong>{technology.name}</strong>
                  <span>{technology.category}</span>
                </div>
                <p>{technology.description}</p>
              </li>
            ))}
          </ul>
        ) : (
          <SearchEmptyState searchTerm={searchTerm} />
        )}
      </section>
    </main>
  );
}
