import loginBg from '../assets/login-bg.png';
import logo from '../assets/cidg-logo.svg';

export default function LoginPage({
  username,
  setUsername,
  loginPassword,
  setLoginPassword,
  handleLogin,
  isLoading,
  apiError,
}) {
  return (
    <section className="login" aria-label="Login">
      <div className="login__image" aria-hidden="true">
        <img src={loginBg} alt="" />
      </div>
      <div className="login__panel">
        <div className="login__card">
          <div className="seal-wrap">
            <img className="login__seal" src={logo} alt="CIDG RFU 4A Seal" />
          </div>
          <h1>CIDG RFU 4A</h1>
          <p className="login__subtitle">Document Management System</p>
          <form className="login__form">
            {apiError && <div className="form-panel__error">{apiError}</div>}
            <label>
              Username
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
                placeholder="Enter your username"
                autoComplete="username"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLogin(); }}
              />
            </label>
            <button type="button" onClick={handleLogin} disabled={isLoading}>
              {isLoading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
