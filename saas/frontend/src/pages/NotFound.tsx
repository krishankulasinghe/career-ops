import { Link } from 'react-router-dom';
import { IconArrowLeft } from '@tabler/icons-react';

export function NotFoundPage() {
  return (
    <div className="page page-center">
      <div className="container-tight py-4">
        <div className="empty">
          <div className="empty-header">404</div>
          <p className="empty-title">Oops… You just found an error page</p>
          <p className="empty-subtitle text-secondary">
            We are sorry but the page you are looking for was not found.
          </p>
          <div className="empty-action">
            <Link to="/" className="btn btn-primary">
              <IconArrowLeft size={16} className="me-2" />
              Take me home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
