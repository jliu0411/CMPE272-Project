import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';

export default function PlaceholderPage({ title, description }) {
  return (
    <div className="placeholder-page">
      <Construction size={48} />

      <h1>{title}</h1>
      <p>{description}</p>

      <p className="muted">
        This feature is currently under development.
      </p>

      <Link to="/dashboard" className="back-link">
        Back to Dashboard
      </Link>
    </div>
  );
}