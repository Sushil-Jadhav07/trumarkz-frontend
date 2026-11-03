import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageIntro } from '@/components/shared/AdminPageParts';
import { useAuth } from '@/context/AuthContext';
import { mockUser, mockTransactions } from '@/data/mockData';
import { Wallet as WalletIcon, Plus, ArrowRight, LogIn, Upload, Eye } from 'lucide-react';
import toast from 'react-hot-toast';

const activities = [
  { action: 'Login', date: '08 Apr 2024', icon: LogIn, tile: 'bg-[#e8f0fe] text-brand-blue' },
  { action: 'Batch upload', date: '08 Apr 2024', icon: Upload, tile: 'bg-green-50 text-green-600' },
  { action: 'Report viewed', date: '08 Apr 2024', icon: Eye, tile: 'bg-purple-50 text-purple-600' },
];

// "Identity Verification - TM-TRN-2026-00394" -> title + reference; "08-Apr-2024" -> "08 Apr 2024".
const splitDescription = (description = '') => {
  const [title, ...rest] = String(description).split(' - ');
  return { title: title.charAt(0) + title.slice(1).toLowerCase(), reference: rest.join(' - ') };
};
const readableDate = (value = '') => String(value).replace(/-/g, ' ');
const money = (amount) => `₹${Math.abs(amount).toLocaleString('en-IN')}`;

export const Wallet = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const ownerLabel = `${user?.name || 'Your'} · ${user?.role === 'organization' ? 'Organization' : 'Individual'} wallet`;

  return (
    <AuthLayout title="Wallet" breadcrumb={['Workspace', 'Wallet']}>
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro title="Wallet" subtitle="Manage your verification balance and transactions." />

        {/* Balance banner */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-4 overflow-hidden rounded-xl bg-gradient-to-r from-[#1D5CF2] to-[#2B6BFA] px-7 py-6 text-white shadow-[0_10px_24px_-14px_rgba(29,92,242,0.6)]"
        >
          <div aria-hidden="true" className="pointer-events-none absolute right-6 top-1/2 hidden h-[130px] w-[230px] -translate-y-1/2 sm:block">
            <span className="absolute right-6 top-0 h-[96px] w-[150px] -rotate-6 rounded-2xl bg-white/10 ring-1 ring-white/15" />
            <span className="absolute bottom-0 right-0 h-[96px] w-[150px] rotate-[-4deg] rounded-2xl bg-white/10 ring-1 ring-white/20">
              <span className="absolute inset-x-0 top-6 h-3 bg-white/15" />
              <span className="absolute bottom-4 right-4 h-1.5 w-8 rounded-full bg-white/25" />
            </span>
          </div>
          <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:gap-7">
            <span className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><WalletIcon size={38} strokeWidth={1.5} /></span>
            <span aria-hidden="true" className="hidden h-[84px] w-px bg-white/30 md:block" />
            <div className="min-w-0">
              <p className="text-sm text-white/95 font-inter">Available balance</p>
              <p className="mt-0.5 font-sora text-[40px] font-bold leading-tight tracking-[-0.02em]">₹{mockUser.walletBalance.toLocaleString('en-IN')}</p>
              <p className="mt-0.5 text-sm text-white/90 font-inter">{ownerLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => toast.success('Add funds feature coming soon')}
              className="inline-flex h-12 items-center gap-2 self-start rounded-lg bg-white px-6 text-[15px] font-semibold text-brand-blue transition-colors hover:bg-blue-50 font-inter md:ml-auto md:mr-[240px] md:self-center"
            >
              <Plus size={18} /> Add funds
            </button>
          </div>
        </motion.div>

        <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
          {/* Transactions */}
          <section aria-label="Transaction history" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-sora text-lg font-semibold text-brand-dark">Transaction history</h2>
                <p className="mt-0.5 text-[13px] text-gray-500 font-inter">Your latest wallet credits and debits.</p>
              </div>
              <button type="button" onClick={() => toast('Full transaction history is coming soon.')} className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-brand-blue hover:underline font-inter">
                View all transactions <ArrowRight size={15} />
              </button>
            </div>

            <div className="mt-4 overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[560px] border-collapse text-left text-xs font-inter">
                <thead>
                  <tr>
                    <th className="rounded-l-lg px-4 py-3">Transaction</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="rounded-r-lg px-4 py-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {mockTransactions.map((txn) => {
                    const credit = txn.amount > 0;
                    const { title, reference } = splitDescription(txn.description);
                    return (
                      <tr key={txn.id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3.5">
                            <span aria-hidden="true" className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${credit ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'}`}><WalletIcon size={20} strokeWidth={1.6} /></span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-brand-dark">{title}</p>
                              {reference && <p className="text-xs text-gray-500">{reference}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-[13px] text-[#2f3b52]">{readableDate(txn.date)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${credit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>{credit ? 'Credit' : 'Debit'}</span>
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-sora text-base font-semibold ${credit ? 'text-green-600' : 'text-red-500'}`}>{credit ? '+' : '-'}{money(txn.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="mt-2 border-t border-gray-100 pt-3 text-xs text-gray-600 font-inter">{mockTransactions.length} recent transactions</p>
          </section>

          {/* Recent activity */}
          <section aria-label="Recent activity" className="min-w-0 rounded-xl border border-gray-100 bg-white p-5">
            <h2 className="font-sora text-lg font-semibold text-brand-dark">Recent activity</h2>
            <ol className="mt-5">
              {activities.map((activity, i) => (
                <li key={activity.action} className="relative flex items-center gap-4 pb-5 last:pb-0">
                  {i < activities.length - 1 && <span aria-hidden="true" className="absolute left-[5px] top-6 bottom-[-4px] w-px bg-[#c9d8f3]" />}
                  <span aria-hidden="true" className="relative h-3 w-3 shrink-0 rounded-full border-2 border-brand-blue bg-white" />
                  <span aria-hidden="true" className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${activity.tile}`}><activity.icon size={22} strokeWidth={1.6} /></span>
                  <div>
                    <p className="text-[15px] font-semibold text-brand-dark font-inter">{activity.action}</p>
                    <p className="text-[13px] text-gray-600 font-inter">{activity.date}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        {/* Info strip */}
        <div className="flex items-center gap-4 rounded-xl bg-[#e9f0fb] px-5 py-4 font-inter">
          <WalletIcon size={22} strokeWidth={1.5} className="shrink-0 text-brand-blue" />
          <span aria-hidden="true" className="h-6 w-px bg-[#b9c9e6]" />
          <p className="flex-1 text-sm text-[#2f3b52]">Your wallet balance is used for verification services.</p>
          <button type="button" onClick={() => navigate('/account/support')} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand-blue hover:underline">
            Support <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};

export default Wallet;
