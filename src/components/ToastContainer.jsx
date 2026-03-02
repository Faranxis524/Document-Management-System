export default function ToastContainer({ toasts, dismissToast }) {
  const renderToastIcon = (type) => {
    if (type === 'success') {
      return (
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M7.7 13.3 4.4 10l1.2-1.2 2.1 2.1 6.7-6.7L15.6 5l-7.9 8.3Z" fill="currentColor" />
        </svg>
      );
    }

    if (type === 'info') {
      return (
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M9 8h2v7H9V8Zm0-3h2v2H9V5Z" fill="currentColor" />
        </svg>
      );
    }

    if (type === 'warning') {
      return (
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
          <path d="M9 6h2v6H9V6Zm0 7h2v2H9v-2Z" fill="currentColor" />
        </svg>
      );
    }

    return (
      <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" focusable="false">
        <path d="M6.4 5 5 6.4 8.6 10 5 13.6 6.4 15l3.6-3.6 3.6 3.6 1.4-1.4-3.6-3.6L15 6.4 13.6 5 10 8.6 6.4 5Z" fill="currentColor" />
      </svg>
    );
  };

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast__icon">{renderToastIcon(toast.type)}</div>
          <div className="toast__content">
            <div className="toast__title">{toast.title}</div>
            <div className="toast__message">{toast.message}</div>
          </div>
          <button className="toast__close" onClick={() => dismissToast(toast.id)} aria-label="Close">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
