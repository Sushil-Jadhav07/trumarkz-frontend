import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';

const NAV_LINK = 'text-sm text-gray-500 font-inter hover:text-brand-blue transition-colors focus:outline-none focus-visible:underline';

// Shared chrome for /privacy-policy and /terms-of-service — public, no auth,
// no ProtectedRoute. Both pages pass their own title/lastUpdated/children;
// this only owns the header/footer nav and the readable content column.
export const LegalPageLayout = ({ title, lastUpdated, children }) => {
  useEffect(() => {
    const previous = document.title;
    document.title = `${title} | TruMarkZ`;
    return () => { document.title = previous; };
  }, [title]);

  return (
    <div className="min-h-screen bg-[#f5f6fa]">
      <header className="bg-white border-b border-gray-100 px-5 py-4">
        <div className="max-w-[1000px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <Link to="/login" aria-label="TruMarkZ home">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-5 flex-wrap" aria-label="Legal pages">
            <Link to="/privacy-policy" className={NAV_LINK}>Privacy Policy</Link>
            <Link to="/terms-of-service" className={NAV_LINK}>Terms of Service</Link>
            <Link to="/login" className={NAV_LINK}>Back to Login</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-[880px] mx-auto px-5 py-10 sm:py-14">
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm px-6 py-8 sm:px-10 sm:py-12">
          <h1 className="font-sora font-bold text-3xl text-brand-dark leading-tight">{title}</h1>
          <p className="mt-2 text-sm text-gray-400 font-inter">Last updated: {lastUpdated}</p>

          <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-gray-600 font-inter [&_h2]:font-sora [&_h2]:font-bold [&_h2]:text-lg [&_h2]:text-brand-dark [&_h2]:mb-2.5 [&_h3]:font-sora [&_h3]:font-semibold [&_h3]:text-sm [&_h3]:text-brand-dark [&_h3]:mt-4 [&_h3]:mb-1.5 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_ul]:mb-3 [&_li]:leading-relaxed [&_a]:text-brand-blue [&_a]:hover:underline [&_strong]:text-brand-dark [&_strong]:font-semibold">
            {children}
          </div>
        </div>
      </main>

      <footer className="border-t border-gray-100 px-5 py-8">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-400 font-inter">© {new Date().getFullYear()} TruMarkZ. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/privacy-policy" className={NAV_LINK}>Privacy Policy</Link>
            <Link to="/terms-of-service" className={NAV_LINK}>Terms of Service</Link>
            <Link to="/login" className={NAV_LINK}>Back to Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

// One numbered section — consistent h2 + body spacing across both pages.
export const LegalSection = ({ id, title, children }) => (
  <section id={id} aria-labelledby={id ? `${id}-heading` : undefined} className="border-t border-gray-100 pt-6 first:border-t-0 first:pt-0">
    <h2 id={id ? `${id}-heading` : undefined}>{title}</h2>
    {children}
  </section>
);

export default LegalPageLayout;
