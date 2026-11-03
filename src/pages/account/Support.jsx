import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro } from '@/components/shared/AdminPageParts';
import {
  ArrowRight, ChevronDown, Database, ExternalLink, FileQuestion, Headphones, HelpCircle, Layers, Mail,
  MessageSquare, Send, ShieldCheck, Ticket,
} from 'lucide-react';
import toast from 'react-hot-toast';

const faqs = [
  { id: 1, icon: Layers, question: 'How do I create a verification batch?', answer: 'Go to Dashboard → New Verification → Select Industry → Choose Verifications → Set Permissions → Download Template → Upload Data → Confirm Costing. The batch is created automatically once you confirm the cost — no separate submit step.' },
  { id: 2, icon: Database, question: 'What is the cost per verification?', answer: 'Verification costs vary by type. Identity verification starts at ₹20 per record. You’ll see the full cost breakdown on the Costing step before you confirm and create the batch.' },
  { id: 3, icon: ShieldCheck, question: 'How does blockchain securing work?', answer: 'Once a verification is complete, a cryptographic hash of the record is stored on the Polygon blockchain, creating an immutable, timestamped proof.' },
  { id: 4, icon: ExternalLink, question: 'Can I share credentials externally?', answer: 'Yes, generated credentials can be shared via WhatsApp, Email, direct link, or by downloading the QR code.' },
];

const SUPPORT_EMAIL = 'support@trumarkz.com';

// Chat bubble and shield drawn in code for the banner.
const HelpArt = () => (
  <svg aria-hidden="true" viewBox="0 0 230 130" className="hidden h-[118px] w-auto shrink-0 sm:block">
    <path d="M70 92 L58 116 L90 98 Z" fill="#fff" fillOpacity="0.9" />
    <rect x="12" y="10" width="112" height="84" rx="20" fill="#fff" fillOpacity="0.92" stroke="#bcd3ff" strokeWidth="3" />
    <circle cx="48" cy="52" r="6" fill="#2563eb" /><circle cx="68" cy="52" r="6" fill="#2563eb" /><circle cx="88" cy="52" r="6" fill="#2563eb" />
    <path d="M168 24 C150 38 140 38 126 40 L126 78 C126 100 144 114 168 124 C192 114 210 100 210 78 L210 40 C196 38 186 38 168 24 Z" fill="#4f86f7" stroke="#fff" strokeWidth="5" strokeLinejoin="round" />
    <path d="M148 76 L162 90 L190 60" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Support = () => {
  const [openFaq, setOpenFaq] = useState(null);
  const [ticket, setTicket] = useState({ subject: '', message: '' });
  const [errors, setErrors] = useState({});

  const handleTicket = (event) => {
    event?.preventDefault();
    const next = {};
    if (!ticket.subject.trim()) next.subject = 'Add a subject';
    if (!ticket.message.trim()) next.message = 'Describe your issue';
    setErrors(next);
    if (Object.keys(next).length) return;
    toast.success('Support ticket submitted');
    setTicket({ subject: '', message: '' });
  };

  const field = 'w-full rounded-lg border bg-white text-[13px] text-brand-dark font-inter placeholder:text-[#7b879d] transition-colors focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20';

  return (
    <AuthLayout title="Support" breadcrumb={['Workspace', 'Support']}>
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro title="Support" subtitle="Get help and find answers." />

        {/* Banner */}
        <div className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-6 py-5 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]">
          <svg aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 h-full w-[60%]" viewBox="0 0 600 120" preserveAspectRatio="none" fill="none">
            <path d="M0 118 C 160 108, 340 50, 600 14" stroke="#fff" strokeOpacity="0.16" strokeWidth="1.5" />
            <path d="M120 124 C 280 112, 420 70, 600 40" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.5" />
          </svg>
          <div className="relative flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Headphones size={26} strokeWidth={1.6} /></span>
              <span aria-hidden="true" className="hidden h-12 w-px bg-white/25 sm:block" />
              <div>
                <h2 className="font-sora text-xl font-semibold leading-tight">How can we help you?</h2>
                <p className="mt-1 text-[13px] text-white/90 font-inter">Find answers or get in touch with our support team.</p>
              </div>
            </div>
            <HelpArt />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <section aria-label="Frequently asked questions" className="rounded-xl border border-gray-100 bg-white p-5">
              <h2 className="font-sora text-lg font-semibold text-brand-dark">Frequently asked questions</h2>
              <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Quick answers about using TruMarkZ.</p>
              <ul className="mt-4 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100">
                {faqs.map((faq) => {
                  const open = openFaq === faq.id;
                  return (
                    <li key={faq.id}>
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpenFaq(open ? null : faq.id)}
                        className="flex w-full items-center gap-3.5 px-3.5 py-3 text-left transition-colors hover:bg-gray-50/70"
                      >
                        <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fe] text-brand-blue"><faq.icon size={19} strokeWidth={1.6} /></span>
                        <span className="min-w-0 flex-1 text-sm font-medium text-brand-dark font-inter">{faq.question}</span>
                        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }} className="text-gray-500">
                          <ChevronDown size={18} />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {open && (
                          <motion.div
                            key={`faq-${faq.id}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.24, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <p className="px-3.5 pb-4 pl-[70px] text-[13px] leading-relaxed text-gray-600 font-inter">{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </section>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <a href={`mailto:${SUPPORT_EMAIL}`} className="group flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-4 transition-colors hover:border-[#c7d8f5]">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Mail size={21} strokeWidth={1.6} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-dark font-inter">Email support</span>
                  <span className="block truncate text-xs text-gray-500 font-inter">{SUPPORT_EMAIL}</span>
                </span>
                <ArrowRight size={17} className="shrink-0 text-brand-blue transition-transform group-hover:translate-x-0.5" />
              </a>
              <div className="flex items-center gap-3.5 rounded-xl border border-gray-100 bg-white p-4">
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><MessageSquare size={21} strokeWidth={1.6} /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-brand-dark font-inter">Live chat</span>
                  <span className="block text-xs text-gray-500 font-inter">9 AM – 6 PM IST</span>
                </span>
                <button
                  type="button"
                  onClick={() => toast(`Live chat isn’t connected yet. Please email ${SUPPORT_EMAIL}.`)}
                  className="inline-flex shrink-0 items-center gap-1 text-[13px] font-medium text-brand-blue hover:underline font-inter"
                >
                  Start chat <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>

          <section aria-label="Submit a ticket" className="rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-center gap-3.5 border-b border-gray-100 pb-4">
              <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e8f0fe] text-brand-blue"><Ticket size={22} strokeWidth={1.6} /></span>
              <div>
                <h2 className="font-sora text-lg font-semibold leading-tight text-brand-dark">Submit a ticket</h2>
                <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Tell us what you need help with.</p>
              </div>
            </div>

            <form onSubmit={handleTicket} noValidate className="mt-4 space-y-4">
              <div>
                <label htmlFor="ticket-subject" className="mb-1.5 block text-[13px] font-medium text-brand-dark font-inter">Subject</label>
                <div className="relative">
                  <FileQuestion size={18} strokeWidth={1.5} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5b6a85]" />
                  <input
                    id="ticket-subject"
                    value={ticket.subject}
                    onChange={(e) => { setTicket((prev) => ({ ...prev, subject: e.target.value })); setErrors((prev) => ({ ...prev, subject: '' })); }}
                    placeholder="What is this about?"
                    aria-invalid={Boolean(errors.subject)}
                    className={`${field} h-11 pl-11 pr-4 ${errors.subject ? 'border-red-400' : 'border-[#d9e1ee]'}`}
                  />
                </div>
                {errors.subject && <p className="mt-1 text-xs text-red-500 font-inter">{errors.subject}</p>}
              </div>
              <div>
                <label htmlFor="ticket-message" className="mb-1.5 block text-[13px] font-medium text-brand-dark font-inter">Message</label>
                <textarea
                  id="ticket-message"
                  value={ticket.message}
                  onChange={(e) => { setTicket((prev) => ({ ...prev, message: e.target.value })); setErrors((prev) => ({ ...prev, message: '' })); }}
                  placeholder="Describe your issue..."
                  rows={6}
                  aria-invalid={Boolean(errors.message)}
                  className={`${field} resize-none px-4 py-3 ${errors.message ? 'border-red-400' : 'border-[#d9e1ee]'}`}
                />
                {errors.message && <p className="mt-1 text-xs text-red-500 font-inter">{errors.message}</p>}
              </div>
              <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand-blue text-sm font-semibold text-white font-inter transition-colors hover:bg-brand-blue-hover">
                <Send size={16} /> Submit ticket
              </button>
            </form>

            <div className="mt-4 border-t border-gray-100 pt-4 text-center">
              <button type="button" className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-blue hover:underline font-inter">
                <HelpCircle size={15} /> Raise Policy <ExternalLink size={13} />
              </button>
            </div>
          </section>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Support;
