import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';

function App() {
  return (
    <main className="container">
      <span className="tag">Integração Contínua</span>
      <h1>SPA React — Projeto Base</h1>
      <p>
        Esta aplicação é uma base simples para praticar pipelines com GitHub Actions.
      </p>
      <section className="card">
        <h2>Primeiro objetivo</h2>
        <p>Faça uma alteração, realize um commit e envie para a branch <code>main</code>.</p>
        <p>Depois, acompanhe o build na aba <strong>Actions</strong> do GitHub.</p>
      </section>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
);
