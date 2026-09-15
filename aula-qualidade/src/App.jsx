import { useMemo, useState } from 'react';
import { technologies } from './data.js';
import { filterTechnologies } from './search.js';

export default function App() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTechnologies = useMemo(
    () => filterTechnologies(technologies, searchTerm),
    [searchTerm],
  );

  return (
    <main className="container">
      <header className="hero">
        <span className="eyebrow">Integração Contínua • Projeto-base</span>
        <h1>Catálogo de Tecnologias</h1>
        <p>
          Pesquise tecnologias por nome, categoria ou descrição. A lista possui
          30 elementos e será evoluída nas práticas de qualidade do pipeline.
        </p>
      </header>

      <section className="search-panel" aria-label="Pesquisa">
        <label htmlFor="search">Search term</label>
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
          <div className="empty-state">
            Nenhuma tecnologia encontrada para “{searchTerm}”.
          </div>
        )}
      </section>
    </main>
  );
}
