import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';

// Frame for the no-account certificate-access pages (visitor request, holder approval):
// same header treatment as the public consent page.
export const PublicAccessShell = ({ badge = 'Secure certificate access', children }) => (
  <div className="min-h-dvh bg-brand-bg font-inter text-brand-dark">
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-5">
        <Logo size="md" />
        <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
          <ShieldCheck size={15} className="shrink-0" /> <span>{badge}</span>
        </span>
      </div>
    </header>
    <main className="mx-auto max-w-xl px-4 py-8 sm:py-14">{children}</main>
  </div>
);

export const AccessCard = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-gray-100 bg-white p-5 sm:p-7 ${className}`}>{children}</section>
);

// Icon + title + text block used for every terminal state (success, expired, denied…).
export const AccessState = ({ icon: Icon, tone = 'bg-blue-50 text-brand-blue', title, children, action }) => (
  <div className="text-center">
    <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${tone}`}><Icon size={22} strokeWidth={1.75} /></span>
    <h1 className="mt-4 font-sora text-xl font-bold text-brand-dark">{title}</h1>
    <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-600">{children}</div>
    {action && <div className="mt-6 flex justify-center">{action}</div>}
  </div>
);

export const PrimaryButton = ({ loading, children, className = '', ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    aria-busy={loading || undefined}
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

export const SecondaryButton = ({ children, className = '', ...props }) => (
  <button
    type="button"
    {...props}
    className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
  >
    {children}
  </button>
);

export default PublicAccessShell;
