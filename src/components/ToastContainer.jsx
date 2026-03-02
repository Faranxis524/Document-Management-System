export default function ToastContainer({ toasts, dismissToast }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast--${toast.type}`}>
          <div className="toast__icon">
            {toast.type === 'success' ? '✅' : toast.type === 'info' ? 'ℹ️' : toast.type === 'warning' ? '⚠️' : '❌'}
          </div>
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
