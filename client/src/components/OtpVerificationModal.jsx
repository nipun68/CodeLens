import React, { useState, useEffect, useRef } from 'react';
import { Mail, ArrowRight, RotateCcw, AlertCircle, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Modal, Button } from '../components.jsx';
import { api } from '../api.js';

export default function OtpVerificationModal({
  email,
  maskedEmail,
  onClose,
  onSuccess,
  onChangeEmail,
  notify
}) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(60);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const inputRefs = useRef([]);

  // Auto-focus first digit on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown(c => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleDigitChange = (index, value) => {
    // Handle paste of 6-digit code
    if (value.length > 1) {
      const clean = value.replace(/\D/g, '').slice(0, 6);
      if (clean.length > 0) {
        const nextDigits = [...digits];
        for (let i = 0; i < 6; i++) {
          nextDigits[i] = clean[i] || '';
        }
        setDigits(nextDigits);
        const focusIdx = Math.min(clean.length, 5);
        if (inputRefs.current[focusIdx]) {
          inputRefs.current[focusIdx].focus();
        }
        return;
      }
    }

    const single = value.slice(-1).replace(/\D/g, '');
    const nextDigits = [...digits];
    nextDigits[index] = single;
    setDigits(nextDigits);

    // Auto-advance to next input
    if (single && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowLeft' && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    } else if (e.key === 'ArrowRight' && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const fullOtp = digits.join('');

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (fullOtp.length !== 6) {
      setError('Please enter all 6 digits of the verification code.');
      return;
    }

    setBusy(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api('/auth/verify-otp', {
        method: 'POST',
        body: { email, otp: fullOtp }
      });

      setSuccessMsg('Email verified successfully! Opening your workspace…');
      if (notify) notify('Email verified. Welcome to CodeLens!', 'success');
      setTimeout(() => {
        if (onSuccess) onSuccess(res.account);
        onClose();
      }, 700);
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await api('/auth/resend-otp', {
        method: 'POST',
        body: { email }
      });
      setCooldown(res.resendCooldown || 60);
      setDigits(['', '', '', '', '', '']);
      if (inputRefs.current[0]) inputRefs.current[0].focus();
      setSuccessMsg('A new 6-digit verification code has been dispatched.');
      if (notify) notify('New verification code sent to your email.', 'info');
    } catch (err) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal
      title="Verify your email address"
      subtitle="Enter the 6-digit verification code sent to your inbox."
      onClose={onClose}
    >
      <div className="otp-modal-container">
        <div className="otp-email-banner">
          <Mail size={18} className="text-mint" />
          <div className="otp-email-info">
            <span className="otp-sent-to">Code sent to:</span>
            <strong className="otp-target-email">{maskedEmail || email}</strong>
          </div>
          {onChangeEmail && (
            <button
              type="button"
              className="otp-change-email-btn"
              onClick={onChangeEmail}
              title="Correct email address"
            >
              Change
            </button>
          )}
        </div>

        <form onSubmit={handleVerify} className="otp-form">
          <div className="otp-inputs-row" role="group" aria-label="6-digit verification code">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={el => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={2}
                value={digit}
                onChange={e => handleDigitChange(idx, e.target.value)}
                onKeyDown={e => handleKeyDown(idx, e)}
                className={`otp-digit-input ${digit ? 'filled' : ''}`}
                aria-label={`Digit ${idx + 1}`}
              />
            ))}
          </div>

          {error && (
            <div className="form-error" role="alert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="form-success" role="status">
              <CheckCircle2 size={15} />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="otp-resend-row">
            <span>Didn't receive the email?</span>
            {cooldown > 0 ? (
              <span className="otp-cooldown-text">
                Resend code in <strong>{cooldown}s</strong>
              </span>
            ) : (
              <button
                type="button"
                className="otp-resend-btn"
                onClick={handleResend}
                disabled={resending}
              >
                <RotateCcw size={13} />
                <span>{resending ? 'Sending…' : 'Resend Code'}</span>
              </button>
            )}
          </div>

          <div className="modal-actions" style={{ marginTop: '20px' }}>
            {onChangeEmail && (
              <Button
                variant="ghost"
                type="button"
                icon={ArrowLeft}
                onClick={onChangeEmail}
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              type="submit"
              busy={busy}
              disabled={fullOtp.length !== 6 || busy}
              icon={ArrowRight}
            >
              Verify Email
            </Button>
          </div>

          <p className="fine-print" style={{ textAlign: 'center', marginTop: '14px' }}>
            Codes expire after 10 minutes. Check your spam folder if you don't see it within a minute.
          </p>
        </form>
      </div>
    </Modal>
  );
}
