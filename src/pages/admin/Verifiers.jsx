import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { CustomSelect as PageSizeSelect } from '@/components/ui/CustomSelect';
import { KpiCard } from '@/components/shared/KpiCard';
import {
  PageIntro, OutlineButton, SolidButton, DirectoryBar, SearchField, Avatar, RowActionMenu, NumberedPager,
} from '@/components/shared/AdminPageParts';
import { IndustryTagPicker } from '@/components/shared/IndustryTagPicker';
import { industryEntityForCategory, splitIndustryTags } from '@/utils/industryTypes';
import { pageRange } from '@/utils/pagination';
import {
  AlignLeft, BookOpen, Building2, Check, ChevronDown, Clock, DollarSign, ExternalLink, FileText, Layers,
  Link, Mail, MapPin, MoreVertical, Pencil, Phone,
  Plus, RefreshCw, ShieldCheck, Trash2, User, Users, X, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { verificationAPI, verifiersAPI, getApiError } from '@/services/api';

// ── Shared styles ─────────────────────────────────────────────────────────────
const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white';
const labelCls = 'block text-sm font-medium text-brand-dark font-inter mb-1.5';

// `specialization` is an array on the backend — normalise older/legacy string
// values too, so existing records don't break the multi-select or the table.
const normaliseSpecialization = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
};

// ── Shared: CustomSelect ──────────────────────────────────────────────────────
const CustomSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white flex items-center justify-between gap-2"
      >
        <span className="text-brand-dark">{selected?.label}</span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-inter transition-colors ${
                value === o.value ? 'bg-blue-50 text-brand-blue font-medium' : 'text-brand-dark hover:bg-gray-50'
              }`}
            >
              <span>{o.label}</span>
              {value === o.value && <Check size={13} className="text-brand-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Verifier Type multi-select — a styled chip combobox instead of the native
// <datalist> (whose popup styling/positioning can't be controlled and renders
// inconsistently across browsers). The backend stores `specialization` as an
// array, so a verifier can carry more than one verification type.
const VerifierTypeMultiSelect = ({ value, onChange, options }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const selected = Array.isArray(value) ? value : [];
  const q = query.trim().toLowerCase();
  const available = options.filter((o) => !selected.includes(o));
  const filtered = (q ? available.filter((o) => o.toLowerCase().includes(q)) : available).slice(0, 30);

  const addType = (name) => {
    onChange([...selected, name]);
    setQuery('');
  };
  const removeType = (name) => onChange(selected.filter((s) => s !== name));

  return (
    <div className="relative" ref={ref}>
      <div
        onClick={() => setOpen(true)}
        className={`${inputCls} h-auto min-h-[42px] py-2 flex flex-wrap items-center gap-1.5 cursor-text`}
      >
        <BookOpen size={14} className="text-gray-400 shrink-0" />
        {selected.map((name) => (
          <span
            key={name}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-xs font-medium text-brand-blue"
          >
            {name}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeType(name); }}
              className="text-brand-blue/60 hover:text-brand-blue"
            >
              <X size={11} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="flex-1 min-w-[120px] border-none outline-none bg-transparent text-sm font-inter"
          placeholder={selected.length ? '' : 'e.g. Aadhaar Verification'}
          autoComplete="off"
        />
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => addType(name)}
              className="w-full px-4 py-2.5 text-left text-sm font-inter text-brand-dark transition-colors hover:bg-blue-50 hover:text-brand-blue"
            >
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Verifier Directory ────────────────────────────────────────────────────────
const EMPTY_VF = {
  name: '', email: '', phone: '', organization: '', specialization: [], address: '', notes: '',
};

const VerifierFields = ({ values, onChange, typeNames = [] }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Name *</label>
        <div className="relative">
          <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
            className={`${inputCls} pl-9`}
            placeholder="Dr. Sharma"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Email *</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="email"
            value={values.email}
            onChange={(e) => onChange('email', e.target.value)}
            className={`${inputCls} pl-9`}
            placeholder="sharma@iitd.ac.in"
          />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Phone</label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={values.phone}
            onChange={(e) => onChange('phone', e.target.value)}
            className={`${inputCls} pl-9`}
            placeholder="+919876543210"
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Organization</label>
        <div className="relative">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={values.organization}
            onChange={(e) => onChange('organization', e.target.value)}
            className={`${inputCls} pl-9`}
            placeholder="IIT Delhi"
          />
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelCls}>Verifier Type</label>
        <VerifierTypeMultiSelect
          value={values.specialization}
          onChange={(v) => onChange('specialization', v)}
          options={typeNames}
        />
      </div>
      <div>
        <label className={labelCls}>Address</label>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={values.address}
            onChange={(e) => onChange('address', e.target.value)}
            className={`${inputCls} pl-9`}
            placeholder="Hauz Khas, New Delhi"
          />
        </div>
      </div>
    </div>

    <div>
      <label className={labelCls}>Notes</label>
      <div className="relative">
        <AlignLeft size={14} className="absolute left-3 top-3 text-gray-400" />
        <textarea
          value={values.notes}
          onChange={(e) => onChange('notes', e.target.value)}
          className={`${inputCls} pl-9 min-h-[80px] resize-none`}
          placeholder="Department HOD, available Mon-Fri"
          rows={3}
        />
      </div>
    </div>
  </div>
);

const VerifierDirectory = forwardRef((props, ref) => {
  const [verifiers,  setVerifiers]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search,     setSearch]     = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [form,       setForm]       = useState(EMPTY_VF);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen,   setEditOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editForm,   setEditForm]   = useState(EMPTY_VF);
  const [saving,     setSaving]     = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [page,       setPage]       = useState(1);
  const [pageSize,   setPageSize]   = useState(10);
  const [typeNames,  setTypeNames]  = useState([]); // verification type names, for the Verifier Type autofill

  const fetchAll = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    try {
      const { data } = await verifiersAPI.getAll();
      setVerifiers(Array.isArray(data) ? data : (data?.verifiers || data?.items || []));
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verifiers'));
      setVerifiers([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useImperativeHandle(ref, () => ({
    refresh: () => fetchAll(true),
    openAdd: () => setAddOpen(true),
  }), [fetchAll]);

  useEffect(() => {
    verificationAPI.getVerificationTypes()
      .then(({ data }) => {
        const list = Array.isArray(data) ? data : (data?.verification_types || data?.types || data?.items || []);
        // Human verifiers only ever handle manual verification types —
        // automatic ones run without a person in the loop, so they'd never
        // apply to a verifier record.
        const manualNames = list.filter((t) => t.label === 'manual').map((t) => t.name);
        setTypeNames([...new Set(manualNames.filter(Boolean))].sort());
      })
      .catch(() => setTypeNames([]));
  }, []);

  const filtered = verifiers.filter((v) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      v.name?.toLowerCase().includes(q) ||
      v.email?.toLowerCase().includes(q) ||
      v.organization?.toLowerCase().includes(q) ||
      normaliseSpecialization(v.specialization).some((s) => s.toLowerCase().includes(q))
    );
  });

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.email.trim()) { toast.error('Email is required'); return; }
    setSubmitting(true);
    try {
      const { data: created } = await verifiersAPI.create({
        name:           form.name.trim(),
        email:          form.email.trim(),
        phone:          form.phone.trim()         || undefined,
        organization:   form.organization.trim()  || undefined,
        specialization: form.specialization.length ? form.specialization : undefined,
        address:        form.address.trim()       || undefined,
        notes:          form.notes.trim()         || undefined,
      });
      setVerifiers((p) => [created, ...p]);
      toast.success(`"${created.name}" added successfully`);
      setAddOpen(false);
      setForm(EMPTY_VF);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to add verifier'));
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      name:           item.name           || '',
      email:          item.email          || '',
      phone:          item.phone          || '',
      organization:   item.organization   || '',
      specialization: normaliseSpecialization(item.specialization),
      address:        item.address        || '',
      notes:          item.notes          || '',
    });
    setEditOpen(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    if (!editForm.email.trim()) { toast.error('Email is required'); return; }
    setSaving(true);
    try {
      const { data: updated } = await verifiersAPI.update(editTarget.id, {
        name:           editForm.name.trim(),
        email:          editForm.email.trim(),
        phone:          editForm.phone.trim()         || undefined,
        organization:   editForm.organization.trim()  || undefined,
        specialization: editForm.specialization.length ? editForm.specialization : undefined,
        address:        editForm.address.trim()       || undefined,
        notes:          editForm.notes.trim()         || undefined,
      });
      setVerifiers((p) => p.map((v) => (v.id === editTarget.id ? { ...v, ...updated } : v)));
      toast.success(`"${updated.name}" updated successfully`);
      setEditOpen(false);
      setEditTarget(null);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update verifier'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeletingId(deleteItem.id);
    try {
      await verifiersAPI.delete(deleteItem.id);
      setVerifiers((p) => p.filter((v) => v.id !== deleteItem.id));
      toast.success(`"${deleteItem.name}" deleted successfully`);
      setDeleteItem(null);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete verifier'));
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);
  const { from: startIdx, to: endIdx } = pageRange(safePage, pageSize, filtered.length);
  const uniqueOrgs = [...new Set(verifiers.map((v) => v.organization).filter(Boolean))].length;
  const withSpec   = verifiers.filter((v) => normaliseSpecialization(v.specialization).length > 0).length;

  return (
    <div>
      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total verifiers" value={loading ? '—' : verifiers.length} icon={Users} />
        <KpiCard label="Organizations" value={loading ? '—' : uniqueOrgs} icon={Building2} delay={0.05} />
        <KpiCard label="With verifier type" value={loading ? '—' : withSpec} icon={BookOpen} delay={0.1} />
      </div>

      {props.tabs}

      <section aria-label="Registered verifiers" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <DirectoryBar
          title="Registered verifiers"
          count={loading ? null : verifiers.length}
          search={search}
          onSearch={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search name, email or organization"
        />

        {loading ? (
          <div className="px-5 pb-5"><LoadingSkeleton variant="table" label="Loading verifiers" columns={6} /></div>
        ) : filtered.length === 0 ? (
          <div className="border-t border-gray-100 py-14 text-center">
            <Users size={26} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-500 font-inter">
              {verifiers.length === 0 ? 'No verifiers added yet' : 'No verifiers match your search'}
            </p>
            {verifiers.length === 0 && (
              <div className="mt-3 flex justify-center"><SolidButton icon={Plus} onClick={() => setAddOpen(true)}>Add first verifier</SolidButton></div>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[960px] border-collapse text-left text-xs font-inter">
                <thead>
                  <tr>
                    {['Name / address', 'Email', 'Phone', 'Organization', 'Verification types'].map((h) => <th key={h} className="px-4 py-2.5">{h}</th>)}
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paged.map((item) => {
                    const specs = normaliseSpecialization(item.specialization);
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-4 py-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar name={item.name} />
                            <div className="min-w-0">
                              <p className="truncate text-[13px] font-medium text-brand-dark">{item.name}</p>
                              {item.address && (
                                <p className="flex items-center gap-1 truncate text-[11px] text-[#7d8aa5]"><MapPin size={10} className="shrink-0" /> {item.address}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2 text-[#7d8aa5]">{item.email || '—'}</td>
                        <td className="whitespace-nowrap px-4 py-2 text-[#7d8aa5]">{item.phone || '—'}</td>
                        <td className="px-4 py-2">
                          {item.organization
                            ? <span className="inline-flex rounded-md bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-medium text-brand-blue">{item.organization}</span>
                            : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          {specs.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {specs.slice(0, 2).map((spec) => (
                                <span key={spec} className="inline-flex rounded-md bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-medium text-brand-blue">{spec}</span>
                              ))}
                              {specs.length > 2 && <span title={specs.slice(2).join(', ')} className="text-[11px] font-medium text-brand-blue">+ {specs.length - 2} more</span>}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => openEdit(item)} aria-label={`Edit ${item.name}`} className="rounded px-1 text-xs font-semibold text-brand-blue hover:underline">Edit</button>
                            <RowActionMenu
                              label={`Actions for ${item.name}`}
                              items={[
                                { label: 'Edit verifier', icon: Pencil, onClick: () => openEdit(item) },
                                { label: 'Delete verifier', icon: Trash2, tone: 'danger', onClick: () => setDeleteItem(item) },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center">
              <p className="text-xs text-gray-600 font-inter">Showing {startIdx}–{endIdx} of {filtered.length} verifier{filtered.length === 1 ? '' : 's'}</p>
              <div className="flex flex-wrap items-center gap-3">
                <PageSizeSelect
                  value={pageSize}
                  onChange={(n) => { setPageSize(n); setPage(1); }}
                  ariaLabel="Rows per page"
                  className="w-28"
                  options={[10, 25, 50].map((n) => ({ value: n, label: `${n} / page` }))}
                />
                <NumberedPager page={safePage} totalPages={totalPages} onPage={setPage} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setForm(EMPTY_VF); }} title="Add Verifier" size="lg" onSubmit={handleAdd}>
        <div className="space-y-4">
          <VerifierFields values={form} onChange={(f, v) => setForm((p) => ({ ...p, [f]: v }))} typeNames={typeNames} />
          <Modal.Footer className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => { setAddOpen(false); setForm(EMPTY_VF); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Plus} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Verifier'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); setEditTarget(null); }} title="Edit Verifier" size="lg" onSubmit={handleEdit}>
        <div className="space-y-4">
          <VerifierFields values={editForm} onChange={(f, v) => setEditForm((p) => ({ ...p, [f]: v }))} typeNames={typeNames} />
          <Modal.Footer className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => { setEditOpen(false); setEditTarget(null); }} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={saving ? RefreshCw : Pencil} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={!!deleteItem} onClose={() => setDeleteItem(null)} title="Delete Verifier" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <Trash2 size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 font-inter">
                Delete &quot;{deleteItem?.name}&quot;?
              </p>
              <p className="text-xs text-red-500 font-inter mt-1">This action cannot be undone.</p>
            </div>
          </div>
          <Modal.Footer className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setDeleteItem(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button variant="danger" type="button" icon={deletingId ? RefreshCw : Trash2} disabled={!!deletingId} onClick={handleDelete}>
              {deletingId ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
});

// ── Verification Types Tab ────────────────────────────────────────────────────
const VT_CATEGORY_TABS = [
  { value: '',        label: 'All' },
  { value: 'human',   label: 'Human' },
  { value: 'product', label: 'Product' },
];
const VT_LABEL_TABS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual',    label: 'Manual' },
];
const EMPTY_VT = {
  name: '', label: 'manual', category: 'human',
  email_address: '', api_link: '', price: '', timeline: '', industry_type: '',
};

const VerificationTypes = forwardRef((props, ref) => {
  const [allTypes,        setAllTypes]        = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [refreshing,      setRefreshing]      = useState(false);
  const [categoryTab,     setCategoryTab]     = useState('');
  const [labelFilter,     setLabelFilter]     = useState('');
  const [industryFilter,  setIndustryFilter]  = useState('');
  const [modalOpen,       setModalOpen]       = useState(false);
  const [form,            setForm]            = useState(EMPTY_VT);
  const [submitting,      setSubmitting]      = useState(false);
  const [deletingId,      setDeletingId]      = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [search,          setSearch]          = useState('');
  const [page,            setPage]            = useState(1);
  const [pageSize,        setPageSize]        = useState(10);
  const [editModalOpen,   setEditModalOpen]   = useState(false);
  const [editTarget,      setEditTarget]      = useState(null);
  const [editForm,        setEditForm]        = useState(EMPTY_VT);
  const [saving,          setSaving]          = useState(false);

  const fetchTypes = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    try {
      const filters = {};
      if (categoryTab) filters.category = categoryTab;
      const { data } = await verificationAPI.getVerificationTypes(filters);
      const list = Array.isArray(data)
        ? data
        : (data?.verification_types || data?.types || data?.items || []);
      setAllTypes(list);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to load verification types'));
      setAllTypes([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [categoryTab]);

  useEffect(() => { fetchTypes(); }, [fetchTypes]);

  useImperativeHandle(ref, () => ({
    refresh: () => fetchTypes(true),
    openAdd: () => setModalOpen(true),
  }), [fetchTypes]);

  const typeQuery = search.trim().toLowerCase();
  const types = allTypes.filter((t) => {
    if (typeQuery && !String(t.name || '').toLowerCase().includes(typeQuery)) return false;
    if (labelFilter && t.label !== labelFilter) return false;
    if (industryFilter.trim() &&
      !(t.industry_type || []).some((ind) =>
        ind.toLowerCase().includes(industryFilter.trim().toLowerCase())
      )
    ) return false;
    return true;
  });

  useEffect(() => { setPage(1); }, [search, categoryTab, labelFilter, industryFilter]);
  const totalPages = Math.max(1, Math.ceil(types.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedTypes = types.slice((safePage - 1) * pageSize, safePage * pageSize);
  const { from: startIdx, to: endIdx } = pageRange(safePage, pageSize, types.length);

  const total     = allTypes.length;
  const automatic = allTypes.filter((t) => t.label === 'automatic').length;
  const manual    = allTypes.filter((t) => t.label === 'manual').length;

  const industryOptions = Array.from(
    new Set(allTypes.flatMap((t) => t.industry_type || []))
  ).sort((a, b) => a.localeCompare(b));

  const updateForm  = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const resetForm   = () => setForm(EMPTY_VT);
  const handleClose = () => { setModalOpen(false); resetForm(); };

  const formTags = splitIndustryTags(form.industry_type);
  const editTags = splitIndustryTags(editForm.industry_type);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.label === 'manual' && !form.email_address.trim()) {
      toast.error('Email Address is required for manual verification'); return;
    }
    setSubmitting(true);
    const payload = {
      name:          form.name.trim(),
      label:         form.label,
      category:      form.category,
      email_address: form.label === 'manual'    ? form.email_address.trim() : null,
      api_link:      form.label === 'automatic' ? form.api_link.trim()      : null,
      price:         form.price !== '' ? Number(form.price) : 0,
      timeline:      form.timeline.trim() || undefined,
      industry_type: formTags,
    };
    try {
      const { data: created } = await verificationAPI.createVerificationType(payload);
      setAllTypes((prev) => [created, ...prev]);
      toast.success(`"${payload.name}" created successfully`);
      handleClose();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to create verification type'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmItem) return;
    setDeletingId(deleteConfirmItem.id);
    try {
      await verificationAPI.deleteVerificationType(deleteConfirmItem.id);
      setAllTypes((prev) => prev.filter((t) => t.id !== deleteConfirmItem.id));
      toast.success(`"${deleteConfirmItem.name}" deleted`);
      setDeleteConfirmItem(null);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to delete'));
    } finally {
      setDeletingId(null);
    }
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setEditForm({
      name:          item.name          || '',
      label:         item.label         || 'manual',
      category:      item.category      || 'human',
      email_address: item.email_address || '',
      api_link:      item.api_link      || '',
      price:         item.price != null ? String(item.price) : '',
      timeline:      item.timeline      || '',
      industry_type: (item.industry_type || []).join(', '),
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    if (editForm.label === 'manual'    && !editForm.email_address.trim()) { toast.error('Email Address is required for manual'); return; }
    setSaving(true);
    const payload = {
      name:          editForm.name.trim(),
      label:         editForm.label,
      category:      editForm.category,
      email_address: editForm.label === 'manual'    ? editForm.email_address.trim() : null,
      api_link:      editForm.label === 'automatic' ? editForm.api_link.trim()      : null,
      price:         editForm.price !== '' ? Number(editForm.price) : 0,
      timeline:      editForm.timeline.trim() || undefined,
      industry_type: editTags,
    };
    try {
      const { data: updated } = await verificationAPI.patchVerificationType(editTarget.id, payload);
      setAllTypes((prev) => prev.map((t) => (t.id === editTarget.id ? { ...t, ...updated } : t)));
      toast.success(`"${payload.name}" updated`);
      setEditModalOpen(false);
      setEditTarget(null);
    } catch (err) {
      toast.error(getApiError(err, 'Failed to update'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Stats */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total types" value={loading ? '—' : total} icon={Layers} />
        <KpiCard label="Automatic" value={loading ? '—' : automatic} icon={Zap} delay={0.05} />
        <KpiCard label="Manual" value={loading ? '—' : manual} icon={FileText} delay={0.1} />
      </div>

      {props.tabs}

      <section aria-label="Verification type directory" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
        <div className="flex flex-col gap-3 px-5 pb-3 pt-4">
          <h2 className="flex items-center gap-2.5 font-sora text-base font-semibold text-brand-dark">
            Verification type directory
            {!loading && <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-semibold text-brand-blue font-inter">{total}</span>}
          </h2>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <SlidingTabs variant="solid" toggle ariaLabel="Verification type category" value={categoryTab} onChange={setCategoryTab} tabs={VT_CATEGORY_TABS} />
              {VT_LABEL_TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  aria-pressed={labelFilter === tab.value}
                  onClick={() => setLabelFilter((prev) => (prev === tab.value ? '' : tab.value))}
                  className={`h-8 rounded-lg px-4 text-xs font-medium font-inter transition-colors ${labelFilter === tab.value ? 'bg-brand-blue text-white' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'}`}
                >{tab.label}</button>
              ))}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="sm:w-56">
                <p className="mb-1 text-[11px] text-gray-600 font-inter">Industry</p>
                <PageSizeSelect
                  value={industryFilter}
                  onChange={setIndustryFilter}
                  ariaLabel="Filter by industry"
                  searchable
                  options={[{ value: '', label: 'All industries' }, ...industryOptions.map((ind) => ({ value: ind, label: ind }))]}
                />
              </div>
              <SearchField search={search} onSearch={setSearch} placeholder="Search verification types" className="w-full sm:w-64" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="px-5 pb-5"><LoadingSkeleton variant="table" label="Loading verification types" columns={7} /></div>
        ) : types.length === 0 ? (
          <div className="border-t border-gray-100 py-14 text-center">
            <ShieldCheck size={26} className="mx-auto mb-2 text-gray-300" />
            <p className="text-sm font-medium text-gray-500 font-inter">No verification types found</p>
            <p className="mt-1 text-xs text-gray-500 font-inter">Try another category, clear the industry filter or change the search.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[1040px] border-collapse text-left text-xs font-inter">
                <thead>
                  <tr>
                    <th className="px-4 py-2.5">Name</th>
                    <th className="px-4 py-2.5">Mode</th>
                    <th className="px-4 py-2.5">Category</th>
                    <th className="px-4 py-2.5">Contact / API</th>
                    <th className="px-4 py-2.5">Rate / turnaround<span className="block text-[11px] font-normal text-[#7d8aa5]">Per record</span></th>
                    <th className="px-4 py-2.5">Industries</th>
                    <th className="px-4 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedTypes.map((item) => {
                    const industries = item.industry_type || [];
                    const isAuto = item.label === 'automatic';
                    const apiHref = /^https?:\/\//i.test(item.api_link || '') ? item.api_link : null;
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-blue-50/30">
                        <td className="px-4 py-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <Avatar name={item.name} />
                            <span className="text-[13px] text-brand-dark">{item.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium ${isAuto ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {isAuto ? <Zap size={12} /> : <FileText size={12} />}{isAuto ? 'Automatic' : 'Manual'}
                          </span>
                        </td>
                        <td className="px-4 py-2">
                          <span className="inline-flex rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] capitalize text-gray-600">{item.category || '—'}</span>
                        </td>
                        <td className="px-4 py-2">
                          {isAuto ? (
                            apiHref
                              ? <a href={apiHref} target="_blank" rel="noopener noreferrer" title={item.api_link} className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline">API endpoint <ExternalLink size={12} /></a>
                              : <span className="text-gray-400">—</span>
                          ) : (
                            item.email_address
                              ? <a href={`mailto:${item.email_address}`} title={item.email_address} className="inline-flex items-center gap-1 font-medium text-brand-blue hover:underline">Email verifier <ExternalLink size={12} /></a>
                              : <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          {item.price != null && <p className="text-[13px] font-semibold text-brand-dark">₹{item.price}</p>}
                          {item.timeline && <p className="flex items-center gap-1 text-[11px] text-[#7d8aa5]"><Clock size={11} /> {item.timeline}</p>}
                        </td>
                        <td className="px-4 py-2">
                          {industries.length > 0 ? (
                            <div className="flex flex-wrap items-center gap-1.5">
                              {industries.slice(0, 2).map((ind) => (
                                <span key={ind} className="inline-flex rounded-md bg-[#e8f0fe] px-2 py-0.5 text-[11px] font-medium text-brand-blue">{ind}</span>
                              ))}
                              {industries.length > 2 && <span title={industries.slice(2).join(', ')} className="text-[11px] font-medium text-brand-blue">+ {industries.length - 2} more</span>}
                            </div>
                          ) : <span className="text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex justify-end">
                            <RowActionMenu
                              label={`Actions for ${item.name}`}
                              items={[
                                { label: 'Edit type', icon: Pencil, onClick: () => openEdit(item) },
                                { label: 'Delete type', icon: Trash2, tone: 'danger', onClick: () => setDeleteConfirmItem(item) },
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col justify-between gap-3 border-t border-gray-100 px-5 py-3 sm:flex-row sm:items-center">
              <p className="text-xs text-gray-600 font-inter">Showing {startIdx}–{endIdx} of {types.length} type{types.length === 1 ? '' : 's'}</p>
              <div className="flex flex-wrap items-center gap-3">
                <PageSizeSelect
                  value={pageSize}
                  onChange={(n) => { setPageSize(n); setPage(1); }}
                  ariaLabel="Rows per page"
                  className="w-28"
                  options={[10, 25, 50].map((n) => ({ value: n, label: `${n} / page` }))}
                />
                <NumberedPager page={safePage} totalPages={totalPages} onPage={setPage} />
              </div>
            </div>
          </>
        )}
      </section>

      {/* Add Verification Type Modal */}
      <Modal isOpen={modalOpen} onClose={handleClose} title="Add Verification Type" size="lg" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={form.name} onChange={(e) => updateForm('name', e.target.value)} className={inputCls} placeholder="e.g. Aadhaar Verification" />
            </div>
            <div>
              <label className={labelCls}>Label *</label>
              <CustomSelect value={form.label} onChange={(val) => updateForm('label', val)}
                options={[{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }]} />
              <p className="text-xs text-gray-400 font-inter mt-1">
                {form.label === 'manual' ? 'Manual — human verifier contacted via email.' : 'Automatic — verification triggered via API.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <CustomSelect value={form.category} onChange={(val) => updateForm('category', val)}
                options={[{ value: 'human', label: 'Human' }, { value: 'product', label: 'Product' }]} />
            </div>
            {form.label === 'manual' ? (
              <div>
                <label className={labelCls}>Email Address *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={form.email_address} onChange={(e) => updateForm('email_address', e.target.value)}
                    className={`${inputCls} pl-9`} placeholder="verifier@agency.com" />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>API Link</label>
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={form.api_link} onChange={(e) => updateForm('api_link', e.target.value)}
                    className={`${inputCls} pl-9`} placeholder="https://api.verifier.com/check" />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (₹)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="number" min="0" value={form.price} onChange={(e) => updateForm('price', e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="499" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={form.timeline} onChange={(e) => updateForm('timeline', e.target.value)}
                  className={`${inputCls} pl-9`} placeholder="e.g. 2-3 business days" />
              </div>
            </div>
          </div>
          <IndustryTagPicker
            entityType={industryEntityForCategory(form.category)}
            tags={formTags}
            onChange={(tags) => updateForm('industry_type', tags.join(', '))}
            disabled={submitting}
            labelClassName={labelCls}
          />
          <Modal.Footer className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Plus} disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Verification Type'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Edit Verification Type Modal */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditTarget(null); }} title="Edit Verification Type" size="lg" onSubmit={handleSaveEdit}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input value={editForm.name} onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className={inputCls} placeholder="e.g. Aadhaar Verification" />
            </div>
            <div>
              <label className={labelCls}>Label *</label>
              <CustomSelect value={editForm.label} onChange={(val) => setEditForm((p) => ({ ...p, label: val }))}
                options={[{ value: 'manual', label: 'Manual' }, { value: 'automatic', label: 'Automatic' }]} />
              <p className="text-xs text-gray-400 font-inter mt-1">
                {editForm.label === 'manual' ? 'Manual — human verifier contacted via email.' : 'Automatic — verification triggered via API.'}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <CustomSelect value={editForm.category} onChange={(val) => setEditForm((p) => ({ ...p, category: val }))}
                options={[{ value: 'human', label: 'Human' }, { value: 'product', label: 'Product' }]} />
            </div>
            {editForm.label === 'manual' ? (
              <div>
                <label className={labelCls}>Email Address *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="email" value={editForm.email_address}
                    onChange={(e) => setEditForm((p) => ({ ...p, email_address: e.target.value }))}
                    className={`${inputCls} pl-9`} placeholder="verifier@agency.com" />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>API Link</label>
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input value={editForm.api_link}
                    onChange={(e) => setEditForm((p) => ({ ...p, api_link: e.target.value }))}
                    className={`${inputCls} pl-9`} placeholder="https://api.verifier.com/check" />
                </div>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (₹)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="number" min="0" value={editForm.price}
                  onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                  className={`${inputCls} pl-9`} placeholder="499" />
              </div>
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={editForm.timeline}
                  onChange={(e) => setEditForm((p) => ({ ...p, timeline: e.target.value }))}
                  className={`${inputCls} pl-9`} placeholder="e.g. 2-3 business days" />
              </div>
            </div>
          </div>
          <IndustryTagPicker
            entityType={industryEntityForCategory(editForm.category)}
            tags={editTags}
            onChange={(tags) => setEditForm((p) => ({ ...p, industry_type: tags.join(', ') }))}
            disabled={saving}
            labelClassName={labelCls}
          />
          <Modal.Footer className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => { setEditModalOpen(false); setEditTarget(null); }} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" icon={saving ? RefreshCw : Pencil} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteConfirmItem} onClose={() => setDeleteConfirmItem(null)} title="Delete Verification Type" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-100">
            <Trash2 size={18} className="text-red-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-red-700 font-inter">
                Delete &quot;{deleteConfirmItem?.name}&quot;?
              </p>
              <p className="text-xs text-red-500 font-inter mt-1">
                This action cannot be undone. Any features currently using this verification type may be affected.
              </p>
            </div>
          </div>
          <Modal.Footer className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setDeleteConfirmItem(null)} disabled={!!deletingId}>Cancel</Button>
            <Button variant="danger" type="button" icon={deletingId ? RefreshCw : Trash2} disabled={!!deletingId} onClick={handleDelete}>
              {deletingId ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>
    </div>
  );
});

// ── Page tabs ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'directory', label: 'Verifier directory' },
  { id: 'types',     label: 'Verification types' },
];

const TAB_META = {
  directory: {
    eyebrow: 'Verifier management',
    title: 'Verifier directory',
    subtitle: 'Manage verifier contacts and supported verification types.',
    addLabel: 'Add verifier',
  },
  types: {
    eyebrow: 'Verifier management',
    title: 'Verification types',
    subtitle: 'Manage verification types used across the platform.',
    addLabel: 'Add type',
  },
};

export const Verifiers = () => {
  const [activeTab, setActiveTab] = useState('directory');
  const directoryRef = useRef(null);
  const typesRef = useRef(null);
  const activeRef = activeTab === 'directory' ? directoryRef : typesRef;
  const meta = TAB_META[activeTab];

  const tabBar = (
    <SlidingTabs
      variant="underline"
      ariaLabel="Verifier sections"
      className="mb-4"
      value={activeTab}
      onChange={setActiveTab}
      tabs={TABS.map((tab) => ({ value: tab.id, label: tab.label }))}
    />

  );

  return (
    <AuthLayout title="Verifiers" breadcrumb={['Administration', 'Verifiers']}>
      <PageIntro
        eyebrow={meta.eyebrow}
        title={meta.title}
        subtitle={meta.subtitle}
        actions={(
          <>
            <OutlineButton icon={RefreshCw} onClick={() => activeRef.current?.refresh()}>Refresh</OutlineButton>
            <SolidButton icon={Plus} onClick={() => activeRef.current?.openAdd()}>{meta.addLabel}</SolidButton>
          </>
        )}
      />

      {activeTab === 'directory'
        ? <VerifierDirectory ref={directoryRef} tabs={tabBar} />
        : <VerificationTypes ref={typesRef} tabs={tabBar} />}
    </AuthLayout>
  );
};

export default Verifiers;
