import React from 'react';
import { SkeletonLoader as Bone } from '@/components/ui/SkeletonLoader';

const Lines = () => <div className="min-w-0 flex-1 space-y-2.5"><Bone width="65%" height="14px" /><Bone width="40%" height="11px" /></div>;

const List = ({ rows }) => <div className="divide-y divide-slate-100">{Array.from({ length: rows }, (_, i) => <div key={i} className="flex items-center gap-3 py-4"><Bone width="40px" height="40px" circle /><Lines /><Bone width="56px" height="12px" /></div>)}</div>;

const Cards = ({ rows }) => <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: rows }, (_, i) => <div key={i} className="space-y-4 rounded-xl border border-slate-100 bg-white p-5"><Bone width="40px" height="40px" /><Lines /><Bone height="12px" /><Bone width="75%" height="12px" /><Bone width="96px" height="32px" /></div>)}</div>;

const Choices = ({ rows }) => <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">{Array.from({ length: rows }, (_, i) => <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-3"><Bone width="32px" height="32px" /><Bone height="12px" /><Bone width="65%" height="10px" /><Bone width="50%" height="10px" /></div>)}</div>;

const Consent = () => <div className="space-y-5"><Bone width="48px" height="48px" /><Bone width="70%" height="24px" /><Lines /><div className="divide-y divide-slate-100 rounded-xl border border-slate-100 px-4">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="space-y-2 py-3"><Bone width="30%" height="10px" /><Bone width="60%" height="14px" /></div>)}</div><div className="grid grid-cols-2 gap-3"><Bone height="44px" /><Bone height="44px" /></div></div>;

const Table = ({ rows, columns }) => <div className="overflow-hidden rounded-xl border border-slate-100 bg-white"><div className="overflow-x-auto"><div className="min-w-[36rem]" style={{ minWidth: `${Math.max(36, columns * 7)}rem` }}><div className="grid gap-4 border-b border-slate-100 bg-slate-50 px-5 py-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, i) => <Bone key={i} width="65%" height="10px" />)}</div>{Array.from({ length: rows }, (_, i) => <div key={i} className="grid items-center gap-4 border-b border-slate-100 px-5 py-5 last:border-0" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>{Array.from({ length: columns }, (_, j) => j === 0 ? <div key={j} className="flex min-w-0 items-center gap-2"><Bone width="30px" height="30px" circle /><Lines /></div> : <Bone key={j} width={j % 2 ? '70%' : '50%'} height="13px" />)}</div>)}</div></div></div>;

const Detail = ({ form = false }) => <div className="space-y-6"><div className="flex items-center gap-3 rounded-xl bg-slate-50 p-4"><Bone width="48px" height="48px" circle /><Lines /><Bone width="72px" height="24px" /></div><div className="grid gap-5 sm:grid-cols-2">{Array.from({ length: form ? 6 : 4 }, (_, i) => <div key={i} className="space-y-3"><Bone width="35%" height="11px" /><Bone width={form ? '100%' : '75%'} height={form ? '44px' : '16px'} /></div>)}</div><Bone width="35%" height="12px" /><Bone height={form ? '80px' : '160px'} /></div>;

const Dashboard = () => <div className="space-y-6"><Bone width="45%" height="24px" /><div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="space-y-4 rounded-xl border border-slate-100 bg-white p-5"><Bone width="36px" height="36px" /><Bone width="45%" height="26px" /><Bone width="70%" height="12px" /></div>)}</div><div className="grid gap-5 lg:grid-cols-2"><div className="space-y-5 rounded-xl bg-white p-5"><Bone width="50%" height="18px" /><Bone height="180px" /></div><div className="rounded-xl bg-white px-5"><List rows={3} /></div></div><Table rows={4} columns={5} /></div>;

/** Content placeholders only: action buttons retain their existing progress feedback. */
export const LoadingSkeleton = ({ variant = 'list', rows = 4, columns = 5, label = 'Loading content', className = '' }) => {
  let content;
  switch (variant) {
    case 'table': content = <Table rows={rows} columns={columns} />; break;
    case 'cards': content = <Cards rows={rows} />; break;
    case 'choices': content = <Choices rows={rows} />; break;
    case 'consent': content = <Consent />; break;
    case 'detail': content = <Detail />; break;
    case 'form': content = <Detail form />; break;
    case 'dashboard': content = <Dashboard />; break;
    case 'workspace': content = <div className="min-h-dvh bg-brand-bg"><div className="flex h-16 items-center justify-between border-b border-slate-100 bg-white px-6"><Bone width="140px" height="28px" /><Bone width="36px" height="36px" circle /></div><div className="mx-auto max-w-7xl p-5 sm:p-8"><Dashboard /></div></div>; break;
    case 'document': content = <div className="space-y-3"><Bone height="144px" /><Bone width="55%" height="14px" /><Bone width="35%" height="11px" /></div>; break;
    default: content = <List rows={rows} />;
  }
  return <div role="status" aria-live="polite" aria-busy="true" className={`min-w-0 w-full ${className}`}><span className="sr-only">{label}</span><div aria-hidden="true">{content}</div></div>;
};

/** Use directly inside tbody so loading never creates invalid table markup. */
export const SkeletonTableRows = ({ rows = 5, columns = 5, label = 'Loading records' }) => <>{Array.from({ length: rows }, (_, i) => <tr key={i}>{Array.from({ length: columns }, (_, j) => <td key={j} className="px-4 py-5">{i === 0 && j === 0 && <span role="status" className="sr-only">{label}</span>}<Bone width={j === 0 ? '85%' : '65%'} height="14px" /></td>)}</tr>)}</>;

export default LoadingSkeleton;
