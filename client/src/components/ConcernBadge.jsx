export default function ConcernBadge({ severity }) {
  const cls = severity === 'high' ? 'badge-high' : severity === 'medium' ? 'badge-medium' : 'badge-low';
  return <span className={`badge ${cls}`}>{severity.toUpperCase()}</span>;
}
