import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
  Code2, Flame, UserRound, Terminal, Target, Crown, Moon, Sun, CircleHelp,
  Menu, ChevronDown, PanelLeftClose, PanelLeftOpen, ArrowUpRight, X,
  CheckCircle2, AlertCircle, LogOut, Search, Mail, Sparkles, ArrowRight,
  Command, ShieldCheck, LayoutGrid, Binary, Settings, KeyRound, Shield, Lock, RotateCcw,
  Upload, Camera, Trash2, Check
} from 'lucide-react';
import { api } from './api.js';
import { Avatar, Brand, Button, Field, Modal, ProgressBar, GoogleIcon, GithubIcon, LinkedinIcon } from './components.jsx';
import Workspace from './pages/Workspace.jsx';
import Templates from './pages/Templates.jsx';
import Algorithms from './pages/Algorithms.jsx';
import Checkin from './pages/Checkin.jsx';
import Progress from './pages/Progress.jsx';
import Snippets from './pages/Snippets.jsx';
import Roadmap from './pages/Roadmap.jsx';
import Subscription from './pages/Subscription.jsx';
import Landing from './pages/Landing.jsx';
import StudioWorkspace from './pages/StudioWorkspace.jsx';
import NotFound from './pages/NotFound.jsx';
import OtpVerificationModal from './components/OtpVerificationModal.jsx';
import ResetPasswordModal from './components/ResetPasswordModal.jsx';
import PasswordInput from './components/PasswordInput.jsx';
import PasswordStrengthMeter from './components/PasswordStrengthMeter.jsx';

const navigation = [
  { id: 'workspace', label: 'Workspace', icon: Code2, group: 'navigate' },
  { id: 'templates', label: 'Templates', icon: LayoutGrid, group: 'navigate' },
  { id: 'algorithms', label: 'Algorithms', icon: Binary, group: 'navigate' },
  { id: 'checkin', label: 'Daily check-in', icon: Flame, group: 'navigate' },
  { id: 'progress', label: 'My progress', icon: UserRound, group: 'navigate' },
  { id: 'snippets', label: 'Saved snippets', icon: Terminal, group: 'workspace' },
  { id: 'roadmap', label: 'Learning roadmap', icon: Target, group: 'workspace' },
];

const route = () => {
  const hash = location.hash.slice(1);
  if (hash === 'studio') return 'studio';
  if (navigation.some(n => n.id === hash)) return hash;
  if (['landing', 'how-it-works'].includes(hash) || !location.hash) return 'landing';
  return '404';
};

export default function App() {
  const [account, setAccount] = useState(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(route);
  const [theme, setTheme] = useState(() => localStorage.getItem('devpulse-theme') || 'dark');
  const [studioAlgorithm, setStudioAlgorithm] = useState('bubble-sort');
  const [studioCode, setStudioCode] = useState(null);
  const [studioLanguage, setStudioLanguage] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [modal, setModal] = useState(null);
  const [authMode, setAuthMode] = useState('register');
  const [userOpen, setUserOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [editorSnippet, setEditorSnippet] = useState(null);
  const [storage, setStorage] = useState('');
  const [otpState, setOtpState] = useState(null); // { email, maskedEmail }
  const [resetState, setResetState] = useState(null); // { token, code, email }

  const closeModal = useCallback(() => setModal(null), []);
  const notify = useCallback((message, type = 'success') => setToast({ message, type, key: Date.now() }), []);
  const refresh = useCallback(async () => {
    const data = await api('/session');
    setAccount(data);
    return data;
  }, []);

  useEffect(() => {
    refresh().catch(e => setError(e.message));
    api('/health').then(d => setStorage(d.storage)).catch(() => {});
  }, [refresh]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('devpulse-theme', theme);
  }, [theme]);

  useEffect(() => {
    const listener = () => {
      setPage(route());
      setMobileOpen(false);
      setUserOpen(false);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    const key = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setModal('search');
      }
      if (e.key === 'Escape') {
        setUserOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, []);

  // Handle URL query parameters (resetToken, oauthError, authSuccess, billing)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const resetToken = params.get('resetToken');
    const oauthError = params.get('oauthError');
    const authSuccess = params.get('authSuccess');
    const billingStatus = params.get('billing');

    if (resetToken) {
      setResetState({ token: resetToken });
      history.replaceState({}, '', location.pathname + (location.hash || '#workspace'));
    }

    if (oauthError) {
      notify(decodeURIComponent(oauthError), 'error');
      history.replaceState({}, '', location.pathname + (location.hash || '#workspace'));
    }

    if (authSuccess === 'oauth') {
      notify('Signed in successfully with your social account!');
      refresh().catch(() => {});
      history.replaceState({}, '', location.pathname + (location.hash || '#workspace'));
    }

    if (billingStatus && account) {
      history.replaceState({}, '', location.pathname + location.hash);
      if (billingStatus === 'cancelled') notify('Checkout cancelled. Your current plan has not changed.', 'info');
      if (billingStatus === 'success') {
        notify('Checkout completed. Confirming your subscription with Stripe…', 'info');
        let tries = 0;
        const timer = setInterval(async () => {
          tries++;
          try {
            const data = await refresh();
            if (data.subscription?.plan === 'pro') {
              clearInterval(timer);
              notify('You’re on Pro. Let’s build something good.');
            } else if (tries >= 15) {
              clearInterval(timer);
              notify('Payment is still being confirmed. Refresh Plans & billing in a moment.', 'info');
            }
          } catch {
            if (tries >= 15) clearInterval(timer);
          }
        }, 2000);
        return () => clearInterval(timer);
      }
    }
  }, [!!account, notify, refresh]);

  const navigate = id => {
    setMobileOpen(false);
    setUserOpen(false);
    if (page !== id) {
      location.hash = id;
      setPage(id);
    }
  };

  const handleLogout = async () => {
    try {
      if (!account?.isGuest) {
        await api('/auth/logout', { method: 'POST' });
      }
      setUserOpen(false);
      await refresh();
      navigate('landing');
      notify('Signed out. Your account data is safely saved.');
    } catch (e) {
      notify(e.message, 'error');
    }
  };

  const mutate = async (path, body, method = 'POST', message) => {
    const data = await api(path, { method, body });
    setAccount(data);
    if (message) notify(message);
    return data;
  };

  const common = { account, setAccount, notify, mutate, navigate, setModal };

  if (!account) {
    return (
      <div className="boot-screen">
        <Brand />
        <div className="boot-orbit"><Code2 size={28} /></div>
        <h2>{error ? 'Let’s reconnect.' : 'Making room for your next idea.'}</h2>
        <p>{error || 'Opening your workspace…'}</p>
        {error && <Button onClick={() => { setError(''); refresh().catch(e => setError(e.message)); }}>Try again</Button>}
      </div>
    );
  }

  // Render 404 page for any invalid route
  if (page === '404') {
    return (
      <>
        <NotFound
          account={account}
          theme={theme}
          setTheme={setTheme}
          onNavigate={navigate}
        />
        {toast && (
          <div key={toast.key} className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
          </div>
        )}
      </>
    );
  }

  // Landing page
  if (page === 'landing') {
    return (
      <>
        <Landing
          theme={theme}
          setTheme={setTheme}
          onAuth={mode => { setAuthMode(mode); setModal('auth'); }}
        />
        {modal === 'auth' && (
          <AuthModal
            setAccount={setAccount}
            onClose={closeModal}
            notify={notify}
            initialMode={authMode}
            onSuccess={() => { closeModal(); navigate('workspace'); }}
            onOpenOtp={setOtpState}
            onOpenReset={setResetState}
          />
        )}
        {otpState && (
          <OtpVerificationModal
            email={otpState.email}
            maskedEmail={otpState.maskedEmail}
            onClose={() => setOtpState(null)}
            onSuccess={acc => {
              setOtpState(null);
              setAccount(acc);
              notify('Email verified successfully! Welcome to CodeLens.');
              navigate('workspace');
            }}
            onChangeEmail={() => {
              setOtpState(null);
              setAuthMode('register');
              setModal('auth');
            }}
            notify={notify}
          />
        )}
        {resetState && (
          <ResetPasswordModal
            initialToken={resetState.token || ''}
            initialEmail={resetState.email || ''}
            onClose={() => setResetState(null)}
            onSuccess={() => {
              setResetState(null);
              setAuthMode('login');
              setModal('auth');
            }}
            notify={notify}
          />
        )}
        {toast && (
          <div key={toast.key} className={`toast toast-${toast.type}`} role="status">
            <CheckCircle2 size={20} />
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
          </div>
        )}
      </>
    );
  }

  // Studio page
  if (page === 'studio') {
    return (
      <>
        <StudioWorkspace
          onBack={() => navigate('workspace')}
          theme={theme}
          setTheme={setTheme}
          notify={notify}
          account={account}
          mutate={mutate}
          initialAlgorithm={studioAlgorithm}
          initialCode={studioCode}
          initialLanguage={studioLanguage}
        />
        {modal === 'auth' && (
          <AuthModal
            setAccount={setAccount}
            onClose={closeModal}
            notify={notify}
            initialMode={authMode}
            onOpenOtp={setOtpState}
            onOpenReset={setResetState}
          />
        )}
        {otpState && (
          <OtpVerificationModal
            email={otpState.email}
            maskedEmail={otpState.maskedEmail}
            onClose={() => setOtpState(null)}
            onSuccess={acc => {
              setOtpState(null);
              setAccount(acc);
              notify('Email verified successfully!');
            }}
            onChangeEmail={() => {
              setOtpState(null);
              setAuthMode('register');
              setModal('auth');
            }}
            notify={notify}
          />
        )}
        {resetState && (
          <ResetPasswordModal
            initialToken={resetState.token || ''}
            initialEmail={resetState.email || ''}
            onClose={() => setResetState(null)}
            onSuccess={() => {
              setResetState(null);
              setAuthMode('login');
              setModal('auth');
            }}
            notify={notify}
          />
        )}
        {toast && (
          <div key={toast.key} className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
            {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span>{toast.message}</span>
            <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
          </div>
        )}
      </>
    );
  }

  // Main application shell
  return (
    <div className={`app-shell ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <a className="skip-link" href="#main-content" onClick={e => { e.preventDefault(); document.getElementById('main-content').focus(); }}>
        Skip to content
      </a>

      <header className="topbar">
        <div className="topbar-brand">
          <button className="icon-btn mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}>
            <Menu size={22} />
          </button>
          <button className="brand-button" onClick={() => navigate('workspace')} aria-label="CodeLens workspace">
            <Brand />
          </button>
        </div>

        <div className="topbar-actions">
          <button className="search-trigger" onClick={() => setModal('search')} aria-label="Search workspace">
            <Search size={16} />
            <span>Find your next move</span>
            <kbd>⌘ K</kbd>
          </button>

          <span className="sync-pill" title={`Stored with ${storage || 'your backend'}`}>
            <span className="status-dot" />
            <span>Workspace synced</span>
          </span>

          <button
            className="icon-btn"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon size={21} /> : <Sun size={21} />}
          </button>

          <button className="icon-btn help-button" aria-label="Help and keyboard shortcuts" onClick={() => setModal('help')}>
            <CircleHelp size={21} />
          </button>

          <div className="header-divider" />

          <div className="user-area">
            <button className="user-trigger" onClick={() => setUserOpen(v => !v)} aria-expanded={userOpen} aria-label="Account menu">
              <Avatar profile={account.profile} />
              <ChevronDown size={15} />
            </button>
            {userOpen && (
              <>
                <div className="dropdown-dismiss" onClick={() => setUserOpen(false)} />
                <div className="user-dropdown">
                  <strong>{account.profile?.name || 'CodeLens User'}</strong>
                  <span>{account.email || 'Your personal demo workspace'}</span>
                  {!account.isGuest && account.email && (
                    <div style={{ marginTop: '4px', marginBottom: '6px' }}>
                      {account.emailVerified ? (
                        <span className="verification-badge verified"><CheckCircle2 size={11} /> Verified</span>
                      ) : (
                        <span className="verification-badge unverified"><AlertCircle size={11} /> Unverified</span>
                      )}
                    </div>
                  )}
                  <div className="dropdown-rule" />
                  <button onClick={() => { setModal('profile'); setUserOpen(false); }}>
                    <UserRound size={16} />Edit profile
                  </button>
                  <button onClick={() => { setModal('settings'); setUserOpen(false); }}>
                    <Settings size={16} />Settings & Security
                  </button>
                  {account.isGuest ? (
                    <>
                      <button onClick={() => { setModal('auth'); setUserOpen(false); }}>
                        <Mail size={16} />Save with an account
                      </button>
                      <button onClick={handleLogout}>
                        <LogOut size={16} />Sign out
                      </button>
                    </>
                  ) : (
                    <button onClick={handleLogout}>
                      <LogOut size={16} />Sign out
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {mobileOpen && <button className="sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-top">
          <span className="section-label">NAVIGATE</span>
          <button className="icon-btn collapse-btn" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(v => !v)}>
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
          <button className="icon-btn mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav aria-label="Main navigation">
          {navigation.map((item, i) => (
            <React.Fragment key={item.id}>
              {item.group === 'workspace' && (i === 0 || navigation[i - 1].group !== 'workspace') && (
                <div className="section-label workspace-label">WORKSPACE</div>
              )}
              <a
                className={`nav-item ${page === item.id ? 'active' : ''}`}
                href={`#${item.id}`}
                onClick={() => { setMobileOpen(false); setUserOpen(false); }}
                title={collapsed ? item.label : undefined}
                aria-current={page === item.id ? 'page' : undefined}
              >
                <item.icon size={21} />
                <span>{item.label}</span>
                {item.id === 'checkin' && <span className="nav-badge">+10</span>}
              </a>
            </React.Fragment>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-actions-stack">
            <button className="sidebar-bottom-btn" onClick={() => setModal('profile')} title={collapsed ? "User profile" : undefined}>
              <UserRound size={18} />
              <span>User profile</span>
            </button>
            <button className="sidebar-bottom-btn" onClick={() => setModal('settings')} title={collapsed ? "Settings" : undefined}>
              <Settings size={18} />
              <span>Settings</span>
            </button>
          </div>
          <div className="sidebar-footer">
            <span className="status-dot" />
            A good day to build.
            <span>v1.0</span>
          </div>
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="main-content">
        <div className="page-container" key={page}>
          {page === 'workspace' && (
            <Workspace
              {...common}
              onOpenStudio={(algo, code, lang) => {
                setStudioAlgorithm(algo || 'bubble-sort');
                setStudioCode(code || null);
                setStudioLanguage(lang || 'javascript');
                navigate('studio');
              }}
            />
          )}
          {page === 'templates' && (
            <Templates
              {...common}
              onOpenStudio={(algo, code, lang) => {
                setStudioAlgorithm(algo || 'bubble-sort');
                setStudioCode(code || null);
                setStudioLanguage(lang || 'javascript');
                navigate('studio');
              }}
            />
          )}
          {page === 'algorithms' && <Algorithms {...common} />}
          {page === 'checkin' && <Checkin {...common} />}
          {page === 'progress' && <Progress {...common} />}
          {page === 'snippets' && (
            <Snippets
              {...common}
              openSnippet={snippet => {
                setStudioAlgorithm(snippet.title || 'snippet');
                setStudioCode(snippet.code);
                setStudioLanguage(snippet.language || 'javascript');
                navigate('studio');
              }}
            />
          )}
          {page === 'roadmap' && <Roadmap {...common} />}
          {page === 'subscription' && <Subscription {...common} refresh={refresh} />}

          <footer className="page-footer">
            <span>Made for the process. Not just the progress.</span>
            <span>
              <span className="status-dot" />
              {storage?.includes('Mongo') ? 'MongoDB connected' : 'Local development storage'}
              <span className="footer-separator">/</span>
              CodeLens © {new Date().getFullYear()}
            </span>
          </footer>
        </div>
      </main>

      {modal === 'profile' && <ProfileModal account={account} mutate={mutate} onClose={closeModal} notify={notify} />}
      {modal === 'settings' && (
        <SettingsModal
          account={account}
          setAccount={setAccount}
          theme={theme}
          setTheme={setTheme}
          storage={storage}
          onClose={closeModal}
          notify={notify}
          onOpenOtp={setOtpState}
          onOpenReset={setResetState}
        />
      )}
      {modal === 'auth' && (
        <AuthModal
          setAccount={setAccount}
          onClose={closeModal}
          notify={notify}
          initialMode={authMode}
          onOpenOtp={setOtpState}
          onOpenReset={setResetState}
        />
      )}
      {otpState && (
        <OtpVerificationModal
          email={otpState.email}
          maskedEmail={otpState.maskedEmail}
          onClose={() => setOtpState(null)}
          onSuccess={acc => {
            setOtpState(null);
            setAccount(acc);
            notify('Email verified successfully! Welcome to CodeLens.');
          }}
          onChangeEmail={() => {
            setOtpState(null);
            setAuthMode('register');
            setModal('auth');
          }}
          notify={notify}
        />
      )}
      {resetState && (
        <ResetPasswordModal
          initialToken={resetState.token || ''}
          initialEmail={resetState.email || ''}
          onClose={() => setResetState(null)}
          onSuccess={() => {
            setResetState(null);
            setAuthMode('login');
            setModal('auth');
          }}
          notify={notify}
        />
      )}
      {modal === 'help' && (
        <Modal title="A little help, a lot of momentum." subtitle="Your workspace, in a nutshell." onClose={closeModal}>
          <div className="help-list">
            <div>
              <Code2 />
              <section>
                <h3>Debug with intention</h3>
                <p>Paste JavaScript, Python, Java, C++, HTML, or CSS and inspect AST complexity and runtime execution steps without synthetic partial execution.</p>
              </section>
            </div>
            <div>
              <Flame />
              <section>
                <h3>Show up. Get +10 XP.</h3>
                <p>Save one reflection each day. Days and streaks use UTC, so your data stays consistent across devices.</p>
              </section>
            </div>
            <div>
              <Target />
              <section>
                <h3>Build your next layer</h3>
                <p>Explore a lesson, practice it, then mark it complete for +25 XP. Your learning map grows with you.</p>
              </section>
            </div>
            <div>
              <ShieldCheck />
              <section>
                <h3>Your data stays yours</h3>
                <p>Your guest workspace is saved on the server and linked to this browser. Create an account to access it across devices with email OTP protection.</p>
              </section>
            </div>
          </div>
          <div className="shortcut-row">
            <span>Jump anywhere</span>
            <kbd>⌘ / Ctrl + K</kbd>
          </div>
          <div className="modal-actions">
            <Button onClick={closeModal} icon={ArrowRight}>Got it. Let’s build.</Button>
          </div>
        </Modal>
      )}
      {modal === 'search' && (
        <SearchModal
          account={account}
          onClose={closeModal}
          navigate={navigate}
          openSnippet={s => {
            setStudioAlgorithm(s.title || 'snippet');
            setStudioCode(s.code);
            setStudioLanguage(s.language || 'javascript');
            navigate('studio');
            closeModal();
          }}
        />
      )}
      {toast && (
        <div key={toast.key} className={`toast toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16} /></button>
        </div>
      )}
    </div>
  );
}

function ProfileModal({ account, mutate, onClose, notify }) {
  const [form, setForm] = useState(structuredClone(account.profile || {}));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(form.avatar || '');
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError('');
    setError('');

    // Client-side file size validation (5 MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`Image is ${(file.size / (1024 * 1024)).toFixed(1)} MB. Maximum allowed size is 5 MB.`);
      return;
    }

    // Client-side format validation
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowed.includes(file.type.toLowerCase())) {
      setUploadError('Unsupported format. Please select a PNG, JPEG, or WebP image.');
      return;
    }

    setPendingFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setForm(f => ({ ...f, avatar: objectUrl }));
  };

  const handleRemovePhoto = async () => {
    setPendingFile(null);
    setPreviewUrl('');
    setForm(f => ({ ...f, avatar: '' }));
    setUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    try {
      await fetch('/api/profile/avatar', { method: 'DELETE' });
    } catch {
      // Ignored
    }
  };

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    setUploadError('');

    try {
      let finalAvatarUrl = form.avatar;

      if (pendingFile) {
        const uploadRes = await fetch('/api/profile/avatar', {
          method: 'POST',
          headers: { 'Content-Type': pendingFile.type },
          body: pendingFile
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || 'Failed to upload photo.');
        }
        finalAvatarUrl = uploadData.avatar;
      }

      await mutate('/profile', { ...form, avatar: finalAvatarUrl }, 'PATCH', 'Profile updated. Your next-layer era looks good.');
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Edit your profile" subtitle="Tune your learner identity. Make it feel like you." onClose={onClose}>
      <form onSubmit={submit}>
        {/* Direct Photo Upload Card */}
        <div className="avatar-upload-card">
          <div className="avatar-preview-wrap">
            <Avatar profile={{ ...form, avatar: previewUrl }} size="large" />
          </div>
          <div className="avatar-upload-info">
            <div className="avatar-upload-title">Profile Photo</div>
            <div className="avatar-upload-hint">Upload a picture from your device (PNG, JPEG, WebP up to 5 MB).</div>
            <div className="avatar-upload-actions">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
                id="profile-photo-file-input"
                aria-label="Upload profile photo from device"
              />
              <button
                type="button"
                className="avatar-upload-btn"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
              >
                <Upload size={14} />
                <span>{previewUrl ? 'Change photo' : 'Upload photo'}</span>
              </button>
              {previewUrl && (
                <button
                  type="button"
                  className="avatar-remove-btn"
                  onClick={handleRemovePhoto}
                  disabled={busy}
                >
                  <Trash2 size={13} />
                  <span>Remove photo</span>
                </button>
              )}
            </div>
            {uploadError && (
              <p className="form-error" role="alert" style={{ marginTop: '8px', padding: '6px 10px', fontSize: '11px' }}>
                {uploadError}
              </p>
            )}
          </div>
        </div>

        <div className="form-grid">
          <Field label="Display name">
            <input autoComplete="name" value={form.name || ''} onChange={e => change('name', e.target.value)} required maxLength={60} />
          </Field>
          <Field label="Handle">
            <input value={form.handle || ''} onChange={e => change('handle', e.target.value)} required maxLength={30} />
          </Field>
          <Field label="One-line bio" className="full-width">
            <input value={form.bio || ''} onChange={e => change('bio', e.target.value)} maxLength={180} />
          </Field>
          {[0, 1].map(i => (
            <Field label={`Goal ${i + 1}`} className="full-width" key={i}>
              <input
                value={(form.goals && form.goals[i]) || ''}
                onChange={e => setForm(f => ({ ...f, goals: [0, 1].map(j => j === i ? e.target.value : (f.goals && f.goals[j]) || '') }))}
                maxLength={120}
              />
            </Field>
          ))}
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="modal-actions">
          <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
          <Button icon={CheckCircle2} type="submit" busy={busy}>Save changes</Button>
        </div>
      </form>
    </Modal>
  );
}

function AuthModal({ setAccount, onClose, notify, initialMode = 'register', onSuccess, onOpenOtp, onOpenReset }) {
  const [mode, setMode] = useState(initialMode);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [recovery, setRecovery] = useState(false);
  const [recoveryTarget, setRecoveryTarget] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const hasMismatch = mode === 'register' && form.confirmPassword.length > 0 && form.password !== form.confirmPassword;
  const isMatched = mode === 'register' && form.confirmPassword.length > 0 && form.password === form.confirmPassword;

  const submit = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');

    if (mode === 'register') {
      if (form.password.length < 12) {
        setError('Password must contain at least 12 characters.');
        setBusy(false);
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError('Passwords do not match. Please verify both fields.');
        setBusy(false);
        return;
      }
    }

    try {
      if (mode === 'register') {
        const res = await api('/auth/register', { method: 'POST', body: form });
        if (res.pendingVerification) {
          if (onOpenOtp) {
            onOpenOtp({ email: form.email.trim().toLowerCase(), maskedEmail: res.maskedEmail || form.email });
          }
          onClose();
          notify(res.message || 'Verification code sent to your email.');
          return;
        }
        setAccount(res);
        if (onSuccess) onSuccess(); else onClose();
        notify('Account created. Your workspace came along with you.');
      } else {
        const res = await api('/auth/login', {
          method: 'POST',
          body: { email: form.email, password: form.password }
        });
        if (res.requiresEmailVerification || res.pendingVerification) {
          if (onOpenOtp) {
            onOpenOtp({ email: form.email.trim().toLowerCase(), maskedEmail: res.maskedEmail || form.email });
          }
          onClose();
          notify('Please verify your email address to continue.', 'info');
          return;
        }
        setAccount(res);
        if (onSuccess) onSuccess(); else onClose();
        notify('Welcome back. Your workspace is ready.');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const recover = async e => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: recoveryTarget.trim().toLowerCase() }
      });
      setRecoverySent(true);
      notify(res.message || 'If an account matches that email, reset instructions have been sent.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={recovery ? 'Get back into your account.' : mode === 'register' ? 'Make your progress a keeper.' : 'Good to have you back.'}
      subtitle={recovery ? 'We will send a one-time verification code and reset link.' : mode === 'register' ? 'Create an account. Keep this workspace. Build from anywhere.' : 'Sign in to your personal learning space.'}
      onClose={onClose}
    >
      {recovery ? (
        <div>
          {recoverySent ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--mint-bg)', color: 'var(--green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '14px' }}>
                <Mail size={24} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Check your inbox</h3>
              <p style={{ color: 'var(--muted)', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px' }}>
                If <strong>{recoveryTarget}</strong> matches a registered account, you will receive a 6-digit recovery code and a direct reset link.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <Button
                  icon={KeyRound}
                  onClick={() => {
                    onClose();
                    if (onOpenReset) onOpenReset({ email: recoveryTarget });
                  }}
                >
                  Enter recovery code
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setRecovery(false);
                    setRecoverySent(false);
                    setError('');
                  }}
                >
                  Back to sign in
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={recover}>
              <Field label="Registered email address">
                <input
                  autoFocus
                  required
                  type="email"
                  value={recoveryTarget}
                  onChange={e => setRecoveryTarget(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              {error && <p className="form-error" role="status">{error}</p>}
              <div className="modal-actions" style={{ marginTop: '16px' }}>
                <Button variant="ghost" type="button" onClick={() => { setRecovery(false); setError(''); }}>
                  Back to sign in
                </Button>
                <Button type="submit" busy={busy} icon={ArrowRight}>
                  Send recovery instructions
                </Button>
              </div>
              <div style={{ marginTop: '16px', textAlign: 'center' }}>
                <button
                  type="button"
                  className="text-link"
                  style={{ fontSize: '12px' }}
                  onClick={() => {
                    onClose();
                    if (onOpenReset) onOpenReset({ email: recoveryTarget });
                  }}
                >
                  Already have a reset code or token? Enter it here
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <>
          <div className="segmented auth-tabs">
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={mode === 'register' ? 'selected' : ''}
              type="button"
            >
              Create account
            </button>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={mode === 'login' ? 'selected' : ''}
              type="button"
            >
              Sign in
            </button>
          </div>

          <form onSubmit={submit}>
            <div className="form-grid">
              {mode === 'register' && (
                <Field label="Your name" className="full-width">
                  <input
                    autoComplete="name"
                    required
                    maxLength={60}
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Alex Rivera"
                  />
                </Field>
              )}
              <Field label="Email address" className="full-width">
                <input
                  type="email"
                  autoComplete="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                />
              </Field>
              {mode === 'register' ? (
                <>
                  <Field label="Password (min 12 characters)" className="full-width">
                    <PasswordInput
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="At least 12 characters"
                      ariaLabel="Password"
                    />
                    <PasswordStrengthMeter password={form.password} />
                  </Field>
                  <Field label="Confirm password" className="full-width">
                    <PasswordInput
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={form.confirmPassword}
                      onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                      placeholder="Repeat your password"
                      ariaLabel="Confirm password"
                      hasError={hasMismatch}
                    />
                    {hasMismatch && (
                      <div className="password-mismatch-msg" role="alert">
                        <X size={13} />
                        <span>Passwords do not match. Please verify both fields.</span>
                      </div>
                    )}
                    {isMatched && (
                      <div className="password-match-msg">
                        <Check size={13} />
                        <span>Passwords match</span>
                      </div>
                    )}
                  </Field>
                </>
              ) : (
                <Field label="Password" className="full-width">
                  <PasswordInput
                    autoComplete="current-password"
                    required
                    maxLength={128}
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    placeholder="Your password"
                    ariaLabel="Password"
                  />
                </Field>
              )}
            </div>

            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                <button className="text-link" type="button" onClick={() => { setRecovery(true); setError(''); }}>
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="form-error" role="alert">{error}</p>}

            <div className="modal-actions">
              <Button
                type="submit"
                busy={busy}
                icon={ArrowRight}
                disabled={busy || (mode === 'register' && (hasMismatch || form.password.length < 12))}
              >
                {mode === 'register' ? 'Create my account' : 'Sign in'}
              </Button>
            </div>
          </form>

          {/* Compact 3-Column Social OAuth Providers Grid */}
          <div className="social-auth-section">
            <div className="auth-divider">
              <span>OR CONTINUE WITH</span>
            </div>
            <div className="social-buttons-grid">
              <a href="/api/auth/google" className="social-auth-btn-compact" title="Continue with Google">
                <GoogleIcon size={17} />
                <span>Google</span>
              </a>
              <a href="/api/auth/github" className="social-auth-btn-compact" title="Continue with GitHub">
                <GithubIcon size={17} />
                <span>GitHub</span>
              </a>
              <a href="/api/auth/linkedin" className="social-auth-btn-compact" title="Continue with LinkedIn">
                <LinkedinIcon size={17} />
                <span>LinkedIn</span>
              </a>
            </div>
          </div>
        </>
      )}
    </Modal>
  );
}

function SearchModal({ account, onClose, navigate, openSnippet }) {
  const [query, setQuery] = useState('');
  const pages = navigation.filter(n => n.label.toLowerCase().includes(query.toLowerCase()));
  const snippets = (account.snippets || []).filter(s => s.title.toLowerCase().includes(query.toLowerCase())).slice(0, 4);

  return (
    <Modal title="Find your next move." onClose={onClose}>
      <div className="search-input">
        <Search size={20} />
        <input aria-label="Search pages and snippets" placeholder="Search pages, snippets…" value={query} onChange={e => setQuery(e.target.value)} />
      </div>
      <div className="search-results">
        <span className="section-label">PAGES</span>
        {pages.map(n => (
          <button key={n.id} onClick={() => { navigate(n.id); onClose(); }}>
            <n.icon size={20} />
            <span>{n.label}</span>
            <ArrowUpRight size={17} />
          </button>
        ))}
        {!!snippets.length && <span className="section-label">YOUR SNIPPETS</span>}
        {snippets.map(s => (
          <button key={s.id} onClick={() => openSnippet(s)}>
            <Terminal size={20} />
            <span>{s.title}</span>
            <ArrowUpRight size={17} />
          </button>
        ))}
        {!pages.length && !snippets.length && <p className="muted">No matches yet. Try another word.</p>}
      </div>
    </Modal>
  );
}

function SettingsModal({ account, setAccount, theme, setTheme, storage, onClose, notify, onOpenOtp, onOpenReset }) {
  const [activeTab, setActiveTab] = useState('general');
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('codelens-font-size') || '13px');
  const [tabSize, setTabSize] = useState(() => localStorage.getItem('codelens-tab-size') || '2');
  const [autoSave, setAutoSave] = useState(() => localStorage.getItem('codelens-autosave') !== 'false');

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Resend OTP / Verify email state
  const [otpBusy, setOtpBusy] = useState(false);

  const handleSaveGeneral = () => {
    localStorage.setItem('codelens-font-size', fontSize);
    localStorage.setItem('codelens-tab-size', tabSize);
    localStorage.setItem('codelens-autosave', autoSave.toString());
    notify('Settings updated successfully.');
    onClose();
  };

  const hasMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const isMatched = confirmPassword.length > 0 && newPassword === confirmPassword;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword.length < 12) {
      setPasswordError('New password must contain at least 12 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify both fields.');
      return;
    }

    setPasswordBusy(true);
    try {
      const res = await api('/auth/change-password', {
        method: 'POST',
        body: { currentPassword, newPassword, confirmPassword }
      });
      setPasswordSuccess(res.message || 'Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify('Password changed successfully.');
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordBusy(false);
    }
  };

  const handleTriggerOtp = async () => {
    if (!account?.email) return;
    setOtpBusy(true);
    try {
      await api('/auth/resend-otp', {
        method: 'POST',
        body: { email: account.email }
      });
      notify('Verification code sent to ' + account.email);
      onClose();
      if (onOpenOtp) {
        onOpenOtp({ email: account.email, maskedEmail: account.email });
      }
    } catch (err) {
      notify(err.message || 'Failed to send verification email', 'error');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleTriggerForgot = async () => {
    if (!account?.email) return;
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: { email: account.email }
      });
      notify('Recovery instructions sent to ' + account.email);
      onClose();
      if (onOpenReset) {
        onOpenReset({ email: account.email });
      }
    } catch (err) {
      notify(err.message || 'Failed to send recovery email', 'error');
    }
  };

  return (
    <Modal title="Workspace Settings" subtitle="Configure preferences, theme, and account security." onClose={onClose}>
      <div className="segmented auth-tabs" style={{ marginBottom: '18px' }}>
        <button
          className={activeTab === 'general' ? 'selected' : ''}
          onClick={() => setActiveTab('general')}
          type="button"
        >
          General Preferences
        </button>
        <button
          className={activeTab === 'security' ? 'selected' : ''}
          onClick={() => setActiveTab('security')}
          type="button"
        >
          <Shield size={14} style={{ marginRight: '6px', display: 'inline-block', verticalAlign: 'middle' }} />
          Security & Password
        </button>
      </div>

      {activeTab === 'general' ? (
        <>
          <div className="form-grid">
            <Field label="Theme appearance" className="full-width">
              <div className="segmented auth-tabs" style={{ marginTop: '4px' }}>
                <button
                  className={theme === 'dark' ? 'selected' : ''}
                  onClick={() => setTheme('dark')}
                  type="button"
                >
                  🌙 Dark mode
                </button>
                <button
                  className={theme === 'light' ? 'selected' : ''}
                  onClick={() => setTheme('light')}
                  type="button"
                >
                  ☀️ Light mode
                </button>
              </div>
            </Field>

            <Field label="Editor font size">
              <select value={fontSize} onChange={e => setFontSize(e.target.value)}>
                <option value="12px">12px (Compact)</option>
                <option value="13px">13px (Default)</option>
                <option value="14px">14px (Comfortable)</option>
                <option value="16px">16px (Large)</option>
              </select>
            </Field>

            <Field label="Tab indentation">
              <select value={tabSize} onChange={e => setTabSize(e.target.value)}>
                <option value="2">2 spaces</option>
                <option value="4">4 spaces</option>
              </select>
            </Field>

            <Field label="Auto-save reflections" className="full-width">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', marginTop: '6px' }}>
                <input
                  type="checkbox"
                  checked={autoSave}
                  onChange={e => setAutoSave(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--green)' }}
                />
                <span>Automatically persist daily reflections and code snippets</span>
              </label>
            </Field>

            <Field label="Workspace Storage" className="full-width">
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'var(--surface-soft)', border: '1px solid var(--line)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="status-dot" />
                  <span>{storage?.includes('Mongo') ? 'MongoDB Cloud Persistence' : 'Local Storage Connected'}</span>
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: '10px', color: 'var(--green)', background: 'var(--mint-bg)', padding: '3px 8px', borderRadius: '5px' }}>SYNCED</span>
              </div>
            </Field>
          </div>

          <div className="modal-actions" style={{ marginTop: '22px' }}>
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button icon={CheckCircle2} onClick={handleSaveGeneral} type="button">Save settings</Button>
          </div>
        </>
      ) : (
        /* Security & Account Tab */
        <div className="security-tab-content">
          <div className="security-section">
            <div className="security-header">
              <div>
                <h3>Account & Email Status</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  {account?.isGuest ? 'Temporary guest session' : account?.email}
                </p>
              </div>
              <div>
                {account?.isGuest ? (
                  <span className="verification-badge unverified">GUEST</span>
                ) : account?.emailVerified ? (
                  <span className="verification-badge verified"><CheckCircle2 size={12} /> Verified</span>
                ) : (
                  <span className="verification-badge unverified"><AlertCircle size={12} /> Unverified</span>
                )}
              </div>
            </div>

            {!account?.isGuest && !account?.emailVerified && (
              <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber)', padding: '10px 12px', borderRadius: '7px', fontSize: '12px', marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Your email is not verified yet. Complete verification to secure your workspace.</span>
                <button
                  type="button"
                  className="otp-resend-btn"
                  onClick={handleTriggerOtp}
                  disabled={otpBusy}
                  style={{ whiteSpace: 'nowrap', marginLeft: '8px' }}
                >
                  {otpBusy ? 'Sending…' : 'Verify now'}
                </button>
              </div>
            )}

            {account?.oauthProviders && account.oauthProviders.length > 0 && (
              <div style={{ marginTop: '10px', fontSize: '12px', color: 'var(--muted)' }}>
                <span>Connected social providers: </span>
                <strong style={{ color: 'var(--ink)' }}>{account.oauthProviders.join(', ')}</strong>
              </div>
            )}
          </div>

          {account?.isGuest ? (
            <div style={{ textAlign: 'center', padding: '24px 16px', background: 'var(--surface-soft)', borderRadius: '10px', border: '1px solid var(--line)', marginTop: '16px' }}>
              <Lock size={28} style={{ color: 'var(--green)', marginBottom: '8px' }} />
              <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '6px' }}>Set up an Account to Enable Password Security</h4>
              <p style={{ fontSize: '12.5px', color: 'var(--muted)', maxWidth: '340px', margin: '0 auto 16px' }}>
                Create a full CodeLens account with an email and password or social login to protect your workspace across devices.
              </p>
              <Button
                icon={ArrowRight}
                onClick={() => {
                  onClose();
                  // open auth modal in register mode
                }}
              >
                Register / Sign In
              </Button>
            </div>
          ) : (
            <>
              {/* Change Password Form */}
              <form onSubmit={handleChangePassword} style={{ marginTop: '16px' }}>
                <h4 style={{ fontSize: '13.5px', fontWeight: 750, color: 'var(--ink)', marginBottom: '10px' }}>
                  Change Password
                </h4>
                <div className="form-grid">
                  <Field label="Current password" className="full-width">
                    <PasswordInput
                      autoComplete="current-password"
                      required
                      value={currentPassword}
                      onChange={e => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      ariaLabel="Current password"
                    />
                  </Field>
                  <Field label="New password (min 12 characters)" className="full-width">
                    <PasswordInput
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="Enter new strong password"
                      ariaLabel="New password"
                    />
                    <PasswordStrengthMeter password={newPassword} />
                  </Field>
                  <Field label="Confirm new password" className="full-width">
                    <PasswordInput
                      autoComplete="new-password"
                      required
                      minLength={12}
                      maxLength={128}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      ariaLabel="Confirm new password"
                      hasError={hasMismatch}
                    />
                    {hasMismatch && (
                      <div className="password-mismatch-msg" role="alert">
                        <X size={13} />
                        <span>Passwords do not match. Please verify both fields.</span>
                      </div>
                    )}
                    {isMatched && (
                      <div className="password-match-msg">
                        <Check size={13} />
                        <span>Passwords match</span>
                      </div>
                    )}
                  </Field>
                </div>

                {passwordError && <p className="form-error" role="alert" style={{ marginTop: '10px' }}>{passwordError}</p>}
                {passwordSuccess && (
                  <div className="form-success">
                    <CheckCircle2 size={16} />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="security-actions-row">
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: '12px' }}
                    onClick={handleTriggerForgot}
                  >
                    Forgot current password?
                  </button>

                  <Button
                    type="submit"
                    busy={passwordBusy}
                    icon={CheckCircle2}
                    disabled={passwordBusy || hasMismatch || newPassword.length < 12}
                  >
                    Update password
                  </Button>
                </div>
              </form>
            </>
          )}

          <div className="modal-actions" style={{ marginTop: '22px' }}>
            <Button variant="ghost" onClick={onClose} type="button">Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
