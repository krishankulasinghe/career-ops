export function Footer() {
  return (
    <footer className="footer">
      <div className="row g-0 justify-content-between small mt-4 mb-3">
        <div className="col-12 col-sm-auto text-center">
          <p className="mb-0 text-secondary">
            &copy; {new Date().getFullYear()} Career-Ops
          </p>
        </div>
        <div className="col-12 col-sm-auto text-center">
          <p className="mb-0 text-secondary">v1.7.0</p>
        </div>
      </div>
    </footer>
  );
}
