import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/**
 * Accessible Password Input with Show/Hide toggle
 * Preserves focus, cursor state, value, and supports keyboard navigation.
 */
export const PasswordInput = forwardRef(function PasswordInput(
  {
    id,
    name,
    value,
    onChange,
    placeholder = '••••••••••••',
    autoComplete = 'current-password',
    required = false,
    disabled = false,
    className = '',
    ariaLabel = 'Password',
    ariaDescribedBy,
    hasError = false,
    ...rest
  },
  ref
) {
  const [showPassword, setShowPassword] = useState(false);
  const internalInputRef = useRef(null);

  useImperativeHandle(ref, () => internalInputRef.current);

  const toggleVisibility = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const input = internalInputRef.current;
    if (input) {
      const start = input.selectionStart;
      const end = input.selectionEnd;

      setShowPassword((prev) => !prev);

      // Reapply cursor position after the state update
      requestAnimationFrame(() => {
        if (input) {
          input.focus();
          try {
            input.setSelectionRange(start, end);
          } catch {
            // Some input types may not support setSelectionRange
          }
        }
      });
    } else {
      setShowPassword((prev) => !prev);
    }
  };

  return (
    <div className={`password-input-wrapper ${hasError ? 'has-error' : ''} ${className}`.trim()}>
      <input
        ref={internalInputRef}
        id={id}
        name={name}
        type={showPassword ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={hasError ? 'true' : undefined}
        className="password-input-field"
        {...rest}
      />
      <button
        type="button"
        tabIndex={0}
        onClick={toggleVisibility}
        disabled={disabled}
        className="password-toggle-btn"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff size={16} aria-hidden="true" className="password-icon" />
        ) : (
          <Eye size={16} aria-hidden="true" className="password-icon" />
        )}
      </button>
    </div>
  );
});

export default PasswordInput;
