export function NotFoundPage() {
  return (
    <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-100 text-center px-3">
      <h1 className="display-1 fw-bold text-300">404</h1>
      <h5 className="fw-bold mb-3">Page Not Found</h5>
      <p className="text-500 mb-4">The page you are looking for doesn't exist or has been moved.</p>
      <a className="btn btn-primary" href="/">
        <span className="fas fa-home me-2"></span>Go to Dashboard
      </a>
    </div>
  );
}
