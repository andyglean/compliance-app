'use client';

import { useState, useRef } from 'react';

interface PhoneVerificationProps {
  onVerified: (reporterId: string) => void;
  onBack: () => void;
}

export default function PhoneVerification({ onVerified, onBack }: PhoneVerificationProps) {
  const [phone, setPhone] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function formatPhoneDisplay(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      setPhone(digits);
      setError('');
    }
  }

  async function sendCode() {
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+1${phone}` }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setCodeSent(true);
      if (data.demoCode) {
        setDemoCode(data.demoCode);
      }
    } catch {
      setError('Failed to send code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleCodeInput(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newCode.every((d) => d !== '') && newCode.join('').length === 6) {
      verifyCode(newCode.join(''));
    }
  }

  function handleCodeKeyDown(index: number, key: string) {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleCodePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const newCode = pasted.split('');
      setCode(newCode);
      verifyCode(pasted);
    }
  }

  async function verifyCode(fullCode: string) {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: `+1${phone}`, code: fullCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        return;
      }

      onVerified(data.reporterId);
    } catch {
      setError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-5">
        <h2 className="text-lg font-semibold mb-1">
          {codeSent ? 'Enter Verification Code' : 'Verify Your Phone Number'}
        </h2>
        <p className="text-sm text-[var(--muted)] mb-5">
          {codeSent
            ? `We sent a 6-digit code to (${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
            : 'We need to verify your phone number to prevent abuse. Your number will not be shared with property owners.'
          }
        </p>

        {!codeSent ? (
          <div>
            <label className="block text-sm font-medium mb-1.5">Mobile Phone Number</label>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-[var(--muted)] font-medium">+1</span>
              <input
                type="tel"
                value={formatPhoneDisplay(phone)}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="(214) 555-1234"
                className="flex-1 px-4 py-3 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-3">{error}</p>
            )}

            <button
              onClick={sendCode}
              disabled={loading || phone.length !== 10}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl text-base transition-colors"
            >
              {loading ? 'Sending...' : 'Send Verification Code'}
            </button>
          </div>
        ) : (
          <div>
            {demoCode && (
              <div className="bg-amber-50 rounded-lg p-3 mb-4 text-sm text-amber-800">
                <strong>Demo Mode:</strong> Your verification code is <strong>{demoCode}</strong>
              </div>
            )}

            <div className="flex justify-center gap-2 mb-4" onPaste={handleCodePaste}>
              {code.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeInput(i, e.target.value)}
                  onKeyDown={(e) => handleCodeKeyDown(i, e.key)}
                  className="w-12 h-14 text-center text-xl font-bold rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                  autoFocus={i === 0}
                />
              ))}
            </div>

            {error && (
              <p className="text-red-600 text-sm mb-3 text-center">{error}</p>
            )}

            {loading && (
              <p className="text-[var(--muted)] text-sm text-center mb-3">Verifying...</p>
            )}

            <button
              onClick={() => {
                setCodeSent(false);
                setCode(['', '', '', '', '', '']);
                setDemoCode(null);
                setError('');
              }}
              className="w-full text-sm text-[var(--primary)] hover:underline mt-2"
            >
              Didn&apos;t receive a code? Send again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
