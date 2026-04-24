'use client';

import { useState } from 'react';
import PhoneVerification from '@/components/PhoneVerification';
import SubmissionFlow from '@/components/SubmissionFlow';

export default function Home() {
  const [step, setStep] = useState<'landing' | 'verify' | 'submit' | 'success'>('landing');
  const [reporterId, setReporterId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    complaintNumber: number;
    status: string;
  } | null>(null);

  return (
    <main className="flex-1 flex flex-col">
      <header className="bg-[#acacac] px-4 py-4 text-center shadow-md">
        <img
          src="https://travisranchlife.com/wp-content/uploads/2025/07/travis_ranch_logo_cutout.png"
          alt="Travis Ranch Property Owners Association"
          className="h-16 mx-auto mb-1"
        />
        <p className="text-sm text-white font-medium">Community Compliance Reporter</p>
      </header>

      <div className="flex-1 flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        {step === 'landing' && (
          <div className="flex-1 flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-5 mb-5">
              <h2 className="text-lg font-semibold mb-3">Help Keep Travis Ranch Beautiful</h2>
              <p className="text-[var(--muted)] text-sm leading-relaxed mb-4">
                This courtesy tool helps our compliance team prioritize the most visible 
                issues affecting our community. Report concerns below and give your 
                neighbors a chance to address problems before official action is needed.
              </p>

              <div className="bg-blue-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
                  This tool is ONLY for:
                </p>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2 text-sm text-blue-900">
                    <span className="text-lg leading-5">🌿</span>
                    <span><strong>Overgrown Yards</strong> — Excessively overgrown grass, weeds, or vegetation</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-blue-900">
                    <span className="text-lg leading-5">🗑️</span>
                    <span><strong>Junk / Bulk Trash</strong> — Bulk items, debris, or trash sitting out too long</span>
                  </li>
                  <li className="flex items-start gap-2 text-sm text-blue-900">
                    <span className="text-lg leading-5">🚛</span>
                    <span><strong>Unauthorized Vehicles</strong> — Trailers, 18-wheelers, commercial vehicles, or vehicles with extended flat tires</span>
                  </li>
                </ul>
              </div>

              <div className="bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
                <p className="font-semibold mb-1">Not for smaller issues</p>
                <p className="text-xs leading-relaxed">
                  Trash bin placement, landscaping details, ACC matters, and other minor
                  issues should be reported directly to Action Management. This tool
                  focuses only on the most property-value-impacting concerns.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-5 mb-5">
              <h3 className="font-semibold text-sm mb-3">How it works</h3>
              <ol className="space-y-3 text-sm text-[var(--muted)]">
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">1</span>
                  <span>Verify your phone number (your identity stays private from the property owner)</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">2</span>
                  <span>Select the issue type, enter the property address, and upload a photo</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">3</span>
                  <span>The property owner receives a courtesy heads-up to address the issue</span>
                </li>
                <li className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--primary)] text-white text-xs flex items-center justify-center font-bold">4</span>
                  <span>If 3+ residents report the same property, it moves to the compliance team&apos;s priority queue</span>
                </li>
              </ol>
            </div>

            <div className="bg-green-50 rounded-lg p-4 mb-6 text-sm text-green-900">
              <p className="font-semibold mb-1">Privacy & Safety</p>
              <p className="text-xs leading-relaxed">
                Your phone number is verified to prevent abuse, but your identity is 
                <strong> never shared</strong> with the property owner. Only HOA administration
                can see who submitted a report.
              </p>
            </div>

            <button
              onClick={() => setStep('verify')}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold py-4 px-6 rounded-xl text-base transition-colors shadow-sm active:scale-[0.98]"
            >
              Report a Concern
            </button>

            <p className="text-center text-xs text-[var(--muted)] mt-4">
              This is a courtesy tool — not an official enforcement mechanism.
              <br />Only compliance can issue warnings, violations, or fines.
            </p>
          </div>
        )}

        {step === 'verify' && (
          <PhoneVerification
            onVerified={(id) => {
              setReporterId(id);
              setStep('submit');
            }}
            onBack={() => setStep('landing')}
          />
        )}

        {step === 'submit' && reporterId && (
          <SubmissionFlow
            reporterId={reporterId}
            onComplete={(data) => {
              setResult(data);
              setStep('success');
            }}
            onBack={() => setStep('verify')}
          />
        )}

        {step === 'success' && result && (
          <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>

            <h2 className="text-xl font-bold mb-2">Report Submitted</h2>
            <p className="text-[var(--muted)] text-sm mb-4">
              Thank you for helping keep Travis Ranch beautiful.
            </p>

            <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-5 w-full mb-6">
              <p className="text-sm text-[var(--muted)] mb-1">
                You are reporter <strong>#{result.complaintNumber}</strong> for this property.
              </p>
              {result.complaintNumber < 3 ? (
                <p className="text-sm text-[var(--muted)]">
                  The property owner has been sent a courtesy notice. If {3 - result.complaintNumber} more 
                  resident{3 - result.complaintNumber > 1 ? 's' : ''} report{3 - result.complaintNumber === 1 ? 's' : ''} this 
                  same property, it will be escalated to the compliance team&apos;s priority queue.
                </p>
              ) : (
                <p className="text-sm font-medium text-amber-700">
                  This property has reached the threshold and has been escalated to the compliance team&apos;s priority queue.
                </p>
              )}
            </div>

            <div className="bg-blue-50 rounded-lg p-4 w-full mb-6 text-sm text-blue-900">
              <p className="font-semibold mb-1">What happens next?</p>
              <p className="text-xs leading-relaxed">
                The property owner received a courtesy text to address the concern. The 
                property manager and compliance director have been notified. This is 
                <strong> not</strong> an official violation — only the compliance team 
                can take enforcement action.
              </p>
            </div>

            <button
              onClick={() => {
                setStep('landing');
                setResult(null);
              }}
              className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white font-semibold py-4 px-6 rounded-xl text-base transition-colors shadow-sm"
            >
              Done
            </button>
          </div>
        )}
      </div>

      <footer className="text-center text-xs text-[var(--muted)] py-4 px-4 border-t border-[var(--border)]">
        Travis Ranch HOA — Courtesy Compliance Tool
        <br />
        <a href="/admin" className="text-[var(--primary)] hover:underline mt-1 inline-block">
          Admin Portal
        </a>
      </footer>
    </main>
  );
}
