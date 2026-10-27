import React, { useState } from 'react';
import { KeyRound, CheckCircle2, AlertCircle, ArrowRight, Check, X } from 'lucide-react';
import { Modal, Button, Field } from '../components.jsx';
import { api } from '../api.js';
import PasswordInput from './PasswordInput.jsx';
import PasswordStrengthMeter from './PasswordStrengthMeter.jsx';

export default function ResetPasswordModal({
  initialToken = '',
  initialEmail = '',
  onClose,
  onSuccess,
  notify
}) {
  const [token, setToken] = useState(initialToken);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const useToken = Boolean(token);
  const hasMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const isMatched = confirmPassword.length > 0 && password === confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 12) {
      setError('Password must contain at least 12 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify both fields.');
      return;
    }

    setBusy(true);

    try {
      const payload = useToken
        ? { token, newPassword: password, confirmPassword }
        : { email: email.trim().toLowerCase(), code: code.trim(), newPassword: password, confirmPassword };

      const res = await api('/auth/reset-password', {
        method: 'POST',
        body: payload
      });

      if (notify) notify(res.message || 'Password reset successfully! Please sign in.', 'success');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Password reset failed. Please check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Create New Password"
      subtitle="Set a secure password for your CodeLens account."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="form-grid">
        {!useToken && (
          <>
            <Field label="Registered email address" className="full-width">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />
            </Field>

            <Field label="6-digit recovery code" className="full-width">
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="e.g. 584920"
                style={{ fontFamily: 'var(--mono)', letterSpacing: '2px' }}
              />
            </Field>
          </>
        )}

        <Field label="New password (min 12 characters)" className="full-width">
          <PasswordInput
            required
            minLength={12}
            maxLength={128}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="At least 12 characters"
            autoComplete="new-password"
            ariaLabel="New password"
          />
          <PasswordStrengthMeter password={password} />
        </Field>

        <Field label="Confirm new password" className="full-width">
          <PasswordInput
            required
            minLength={12}
            maxLength={128}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            autoComplete="new-password"
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

        {error && (
          <div className="form-error full-width" role="alert">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        <div className="modal-actions full-width" style={{ marginTop: '16px' }}>
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            busy={busy}
            icon={KeyRound}
            disabled={hasMismatch || password.length < 12}
          >
            Update Password
          </Button>
        </div>
      </form>
    </Modal>
  );
}
