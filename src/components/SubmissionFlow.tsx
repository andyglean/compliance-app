'use client';

import { useState, useRef, useCallback } from 'react';

interface SubmissionFlowProps {
  reporterId: string;
  onComplete: (data: { complaintNumber: number; status: string }) => void;
  onBack: () => void;
}

const CATEGORIES = [
  {
    id: 'overgrown_yard',
    icon: '🌿',
    label: 'Overgrown Yard',
    description: 'Excessively overgrown grass, weeds, or unmaintained vegetation',
  },
  {
    id: 'junk_trash',
    icon: '🗑️',
    label: 'Junk / Bulk Trash',
    description: 'Bulk items, debris, or trash sitting in front of property too long',
  },
  {
    id: 'unauthorized_vehicle',
    icon: '🚛',
    label: 'Unauthorized Vehicle',
    description: 'Construction trailers, 18-wheelers, commercial vehicles, or vehicles with extended flat tires',
  },
];

export default function SubmissionFlow({ reporterId, onComplete, onBack }: SubmissionFlowProps) {
  const [substep, setSubstep] = useState<'category' | 'address' | 'photos' | 'review'>('category');
  const [category, setCategory] = useState('');
  const [address, setAddress] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const searchAddresses = useCallback(async (query: string) => {
    if (query.length < 2) {
      setAddressSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`/api/addresses?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setAddressSuggestions(data.addresses || []);
      setShowSuggestions(true);
    } catch {
      setAddressSuggestions([]);
    }
  }, []);

  function handleAddressChange(value: string) {
    setAddress(value);
    setError('');

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => searchAddresses(value), 300);
  }

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (photos.length + files.length > 3) {
      setError('Maximum 3 photos allowed');
      return;
    }

    const validFiles = files.filter((f) => {
      if (!f.type.startsWith('image/')) {
        setError('Only image files are allowed');
        return false;
      }
      if (f.size > 10 * 1024 * 1024) {
        setError('Each photo must be under 10MB');
        return false;
      }
      return true;
    });

    setPhotos((prev) => [...prev, ...validFiles]);

    validFiles.forEach((file) => {
      const url = URL.createObjectURL(file);
      setPhotoPreviewUrls((prev) => [...prev, url]);
    });

    setError('');
  }

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit() {
    if (!category || !address || photos.length === 0) {
      setError('Please complete all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('reporterId', reporterId);
      formData.append('address', address);
      formData.append('category', category);
      if (description) formData.append('description', description);
      photos.forEach((photo) => formData.append('photos', photo));

      const res = await fetch('/api/complaints', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      onComplete({
        complaintNumber: data.complaintNumber,
        status: data.status,
      });
    } catch {
      setError('Failed to submit report. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const selectedCategory = CATEGORIES.find((c) => c.id === category);

  return (
    <div className="flex-1 flex flex-col">
      <button
        onClick={() => {
          if (substep === 'category') onBack();
          else if (substep === 'address') setSubstep('category');
          else if (substep === 'photos') setSubstep('address');
          else if (substep === 'review') setSubstep('photos');
        }}
        className="flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back
      </button>

      {/* Progress bar */}
      <div className="flex gap-1.5 mb-5">
        {['category', 'address', 'photos', 'review'].map((s, i) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= ['category', 'address', 'photos', 'review'].indexOf(substep)
                ? 'bg-[var(--primary)]'
                : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {substep === 'category' && (
        <div>
          <h2 className="text-lg font-semibold mb-1">What type of concern?</h2>
          <p className="text-sm text-[var(--muted)] mb-5">Select the category that best matches</p>

          <div className="space-y-3">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setSubstep('address');
                }}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                  category === cat.id
                    ? 'border-[var(--primary)] bg-blue-50'
                    : 'border-[var(--border)] bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <div>
                    <p className="font-semibold text-sm">{cat.label}</p>
                    <p className="text-xs text-[var(--muted)] mt-0.5">{cat.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {substep === 'address' && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Property Address</h2>
          <p className="text-sm text-[var(--muted)] mb-5">
            Enter the address of the property with the concern
          </p>

          <div className="relative mb-4">
            <input
              type="text"
              value={address}
              onChange={(e) => handleAddressChange(e.target.value)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              onFocus={() => addressSuggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Start typing an address..."
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-base"
              autoFocus
            />

            {showSuggestions && addressSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border border-[var(--border)] rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto z-10">
                {addressSuggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setAddress(suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <button
            onClick={() => {
              if (!address.trim()) {
                setError('Please enter an address');
                return;
              }
              setSubstep('photos');
            }}
            disabled={!address.trim()}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl text-base transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {substep === 'photos' && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Upload Photos</h2>
          <p className="text-sm text-[var(--muted)] mb-5">
            Take or upload 1-3 photos showing the concern. Clear photos help 
            the compliance team assess the situation.
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            onChange={handlePhotoSelect}
            className="hidden"
          />

          {photoPreviewUrls.length > 0 && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {photoPreviewUrls.map((url, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                  <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(i)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.length < 3 && (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-[var(--border)] rounded-xl py-8 text-center hover:border-[var(--primary)] hover:bg-blue-50 transition-colors mb-4"
            >
              <svg className="w-8 h-8 mx-auto mb-2 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              <p className="text-sm text-[var(--muted)]">
                {photos.length === 0 ? 'Tap to take or upload a photo' : 'Add another photo'}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                {photos.length}/3 photos
              </p>
            </button>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">
              Description <span className="text-[var(--muted)] font-normal">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any additional details about the concern..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent text-sm resize-none"
            />
            <p className="text-xs text-[var(--muted)] text-right mt-1">{description.length}/500</p>
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <button
            onClick={() => {
              if (photos.length === 0) {
                setError('Please upload at least one photo');
                return;
              }
              setSubstep('review');
            }}
            disabled={photos.length === 0}
            className="w-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl text-base transition-colors"
          >
            Review & Submit
          </button>
        </div>
      )}

      {substep === 'review' && (
        <div>
          <h2 className="text-lg font-semibold mb-1">Review Your Report</h2>
          <p className="text-sm text-[var(--muted)] mb-5">
            Please confirm the details below are correct
          </p>

          <div className="bg-white rounded-xl shadow-sm border border-[var(--border)] p-5 space-y-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Category</p>
              <div className="flex items-center gap-2">
                <span className="text-lg">{selectedCategory?.icon}</span>
                <span className="font-medium text-sm">{selectedCategory?.label}</span>
              </div>
            </div>

            <hr className="border-[var(--border)]" />

            <div>
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Property Address</p>
              <p className="font-medium text-sm">{address}</p>
            </div>

            <hr className="border-[var(--border)]" />

            <div>
              <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">
                Photos ({photos.length})
              </p>
              <div className="flex gap-2">
                {photoPreviewUrls.map((url, i) => (
                  <div key={i} className="w-16 h-16 rounded-lg overflow-hidden">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            {description && (
              <>
                <hr className="border-[var(--border)]" />
                <div>
                  <p className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm">{description}</p>
                </div>
              </>
            )}
          </div>

          <div className="bg-amber-50 rounded-lg p-4 mb-5 text-xs text-amber-900 leading-relaxed">
            <strong>By submitting this report</strong>, you confirm this is a good-faith 
            concern about property compliance. Submitting false or malicious reports may 
            result in your access being restricted.
          </div>

          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl text-base transition-colors"
          >
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      )}
    </div>
  );
}
