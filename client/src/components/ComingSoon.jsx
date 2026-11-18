// Temporary page shown until a feature's owner replaces it with the real page.
export default function ComingSoon({ id, name, owner }) {
  return (
    <div className="container py-5">
      <div className="card shadow-sm">
        <div className="card-body">
          <span className="badge bg-secondary mb-2">{id}</span>
          <h3>{name}</h3>
          <p className="text-muted mb-0">Coming soon. Owner: {owner}</p>
        </div>
      </div>
    </div>
  );
}
