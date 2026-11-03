import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro } from '@/components/shared/AdminPageParts';
import { useAuth } from '@/context/AuthContext';
import {
  Award, Briefcase, Check, Copy, Download, ExternalLink, FileText, Link2, Mail, MessageCircle, Share2, User,
} from 'lucide-react';
import toast from 'react-hot-toast';

const PROFILE_URL = 'https://trumarkz.com/verify/individual/IND-2026-00823';

const STEPS = [
  { title: 'Copy your profile link', text: 'Get your unique profile link in one click.' },
  { title: 'Send it to the right person', text: 'Share the link with recruiters, hospitals or employers.' },
  { title: 'Let them open your skill tree', text: 'They can view your skills and credentials instantly.' },
];

// Profile card linked to a document and a credential, drawn in code for the banner.
const ShareArt = () => (
  <div aria-hidden="true" className="relative hidden h-[130px] w-[330px] shrink-0 lg:block">
    <svg viewBox="0 0 330 130" className="absolute inset-0 h-full w-full" fill="none">
      <path d="M176 66 C 198 66, 200 36, 238 36" stroke="#fff" strokeWidth="2" strokeOpacity="0.9" />
      <path d="M176 66 C 198 66, 200 98, 238 98" stroke="#fff" strokeWidth="2" strokeOpacity="0.9" />
      <circle cx="246" cy="36" r="4" fill="#fff" /><circle cx="246" cy="98" r="4" fill="#fff" />
    </svg>
    <div className="absolute left-0 top-[22px] h-[86px] w-[176px] rounded-xl bg-white/95 p-3 shadow-lg">
      <div className="mb-2 flex gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#c9d8f6]" /><span className="h-1.5 w-1.5 rounded-full bg-[#c9d8f6]" /><span className="h-1.5 w-1.5 rounded-full bg-[#c9d8f6]" /></div>
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#dbe7fd] text-brand-blue"><User size={22} strokeWidth={1.6} /></span>
        <div className="flex-1 space-y-1.5"><span className="block h-2 rounded-full bg-[#7ea6f4]" /><span className="block h-2 w-4/5 rounded-full bg-[#c9d8f6]" /><span className="block h-2 w-3/5 rounded-full bg-[#c9d8f6]" /></div>
      </div>
    </div>
    <span className="absolute right-[40px] top-0 flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white text-brand-blue shadow-lg"><FileText size={24} strokeWidth={1.6} /></span>
    <span className="absolute bottom-0 right-[40px] flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-white text-brand-blue shadow-lg"><Award size={24} strokeWidth={1.6} /></span>
  </div>
);

export const ShareProfile = () => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const name = user?.name || 'You';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE_URL);
      setCopied(true);
      toast.success('Link copied!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Could not copy. Select the link and copy it manually.');
    }
  };

  const openWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`My TruMarkZ verified profile: ${PROFILE_URL}`)}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <AuthLayout title="Share Profile">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro title="Share My Skill Tree" subtitle="Share your profile with recruiters, hospitals and employers." />

        {/* Banner */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-7 py-7 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute right-10 top-4 hidden h-8 w-24 sm:block" viewBox="0 0 96 32" fill="#fff" fillOpacity="0.45">
            {Array.from({ length: 2 }).flatMap((_, row) => Array.from({ length: 5 }).map((__, col) => <circle key={`${row}-${col}`} cx={4 + col * 22} cy={4 + row * 16} r="1.6" />))}
          </svg>
          <div className="relative flex items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <span className="flex h-[68px] w-[68px] shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Share2 size={30} strokeWidth={1.5} /></span>
              <span aria-hidden="true" className="hidden h-14 w-px bg-white/30 sm:block" />
              <div>
                <h2 className="font-sora text-2xl font-semibold leading-tight">Your profile, ready to share</h2>
                <p className="mt-1 text-[15px] text-white/90 font-inter">One link to your skills and credentials.</p>
              </div>
            </div>
            <ShareArt />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            {/* Link */}
            <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} aria-label="Your profile link" className="rounded-xl border border-gray-100 bg-white p-5">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Link2 size={22} strokeWidth={1.6} /></span>
                <div>
                  <h2 className="font-sora text-lg font-semibold text-brand-dark">Your profile link</h2>
                  <p className="text-[13px] text-gray-500 font-inter">Copy this link and share it wherever you need.</p>
                </div>
              </div>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <input
                  readOnly
                  aria-label="Your profile link"
                  value={PROFILE_URL}
                  onFocus={(e) => e.target.select()}
                  className="h-12 min-w-0 flex-1 rounded-lg border border-[#d9e1ee] bg-white px-4 text-[15px] text-brand-dark font-inter focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-lg bg-brand-blue px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-blue-hover font-inter"
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}{copied ? 'Copied' : 'Copy link'}
                </button>
              </div>
              <div className="mt-5 flex items-center gap-4 border-t border-gray-100 pt-4 text-[13px] text-gray-600 font-inter">
                <span className="flex items-center divide-x divide-gray-200" aria-hidden="true">
                  <Mail size={22} strokeWidth={1.5} className="pr-0 text-brand-blue" />
                  <span className="mx-4 h-5 w-px bg-gray-200" />
                  <span className="text-xl font-bold leading-none text-brand-blue">in</span>
                  <span className="mx-4 h-5 w-px bg-gray-200" />
                  <Briefcase size={22} strokeWidth={1.5} className="text-brand-blue" />
                </span>
                <span className="h-5 w-px bg-gray-200" aria-hidden="true" />
                Use in emails, LinkedIn or job applications.
              </div>
            </motion.section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} aria-label="Share via WhatsApp" className="flex flex-col rounded-xl border border-gray-100 bg-white p-5">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 text-green-600"><MessageCircle size={24} strokeWidth={1.6} /></span>
                <h2 className="mt-4 font-sora text-lg font-semibold text-brand-dark">Share via WhatsApp</h2>
                <p className="mt-1 text-[13px] text-gray-600 font-inter">Open WhatsApp with your profile link.</p>
                <button
                  type="button"
                  onClick={openWhatsApp}
                  className="mt-auto inline-flex h-11 w-fit items-center gap-2 self-start rounded-lg border-2 border-brand-blue/80 bg-white px-5 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 font-inter"
                  style={{ marginTop: 24 }}
                >
                  Open WhatsApp <ExternalLink size={16} />
                </button>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} aria-label="Download as PDF" className="flex flex-col rounded-xl border border-gray-100 bg-white p-5">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Download size={24} strokeWidth={1.6} /></span>
                <h2 className="mt-4 font-sora text-lg font-semibold text-brand-dark">Download as PDF</h2>
                <p className="mt-1 text-[13px] text-gray-600 font-inter">A PDF with linked QR codes on credential nodes.</p>
                <button
                  type="button"
                  onClick={() => toast('PDF download isn’t available yet.')}
                  className="mt-auto inline-flex h-11 w-fit items-center gap-2 self-start rounded-lg bg-brand-blue px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-hover font-inter"
                  style={{ marginTop: 24 }}
                >
                  <Download size={17} /> Download PDF
                </button>
              </motion.section>
            </div>
          </div>

          {/* How it works */}
          <motion.section initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} aria-label="How sharing works" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="font-sora text-lg font-semibold text-brand-dark">How sharing works</h2>
            <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Make your profile easy to access.</p>
            <ol className="mt-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < STEPS.length - 1 && <span aria-hidden="true" className="absolute left-[18px] top-10 bottom-1 w-px bg-[#c9d8f3]" />}
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e3ebf8] font-sora text-sm font-semibold text-brand-blue">{i + 1}</span>
                  <div>
                    <p className="text-[15px] font-semibold text-brand-dark font-inter">{step.title}</p>
                    <p className="mt-0.5 text-[13px] text-gray-600 font-inter">{step.text}</p>
                  </div>
                </li>
              ))}
            </ol>

            <div aria-hidden="true" className="mt-6 flex items-center gap-4 rounded-xl bg-[#e9f0fb] px-5 py-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-blue font-sora text-lg font-bold text-white">{name.charAt(0).toLowerCase()}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-brand-dark font-inter">{name}</p>
                <p className="text-xs text-gray-600 font-inter">Individual</p>
              </div>
              <span className="h-12 w-px bg-[#b9c9e6]" />
              <div className="relative ml-auto flex flex-1 flex-col gap-2">
                <span className="flex items-center gap-2 rounded-lg border border-[#c7d8f5] bg-white px-3 py-2"><Share2 size={16} className="text-brand-blue" /><span className="h-1.5 flex-1 rounded-full bg-[#c9d8f6]" /></span>
                <span className="flex items-center gap-2 rounded-lg border border-[#c7d8f5] bg-white px-3 py-2"><Award size={16} className="text-brand-blue" /><span className="h-1.5 flex-1 rounded-full bg-[#c9d8f6]" /></span>
              </div>
            </div>
          </motion.section>
        </div>
      </div>
    </AuthLayout>
  );
};

export default ShareProfile;
