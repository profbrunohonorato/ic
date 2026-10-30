// A entrada do usuário permanece texto. Não usar innerHTML ou dangerouslySetInnerHTML.
export default function SearchEmptyState({ searchTerm }) {
  return (
    <div className="empty-state">
      Nenhuma tecnologia encontrada para “{searchTerm}”.
    </div>
  );
}
