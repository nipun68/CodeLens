import React from 'react';
import { Check, Circle } from 'lucide-react';
import { evaluatePasswordStrength } from '../utils/passwordStrength.js';

/**
 * Visual & Accessible Password Strength Meter
 */
export function PasswordStrengthMeter({ password = '', showRequirements = true }) {
  if (!password) return null;

  const { score, label, color, percent, requirements } = evaluatePasswordStrength(password);

  return (
    <div className="password-strength-container" role="status" aria-live="polite">
      <div className="password-strength-header">
        <span className="strength-caption">Password strength:</span>
        <span className="strength-label" style={{ color }}>
          {label}
        </span>
      </div>

      <div
        className="password-meter-bar"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin="0"
        aria-valuemax="100"
        aria-label={`Password strength is ${label}`}
      >
        <div
          className="password-meter-fill"
          style={{
            width: `${percent}%`,
            backgroundColor: color
          }}
        />
      </div>

      {showRequirements && (
        <ul className="password-requirements-list" aria-label="Password requirements">
          {requirements.map((req) => (
            <li
              key={req.id}
              className={`requirement-item ${req.met ? 'met' : 'unmet'}`}
            >
              {req.met ? (
                <Check size={13} className="req-icon req-check" aria-hidden="true" />
              ) : (
                <Circle size={10} className="req-icon req-circle" aria-hidden="true" />
              )}
              <span className="req-text">{req.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
