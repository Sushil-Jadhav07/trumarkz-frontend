import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  Check, ChevronDown, Clock, DollarSign, Filter, Link, Mail, MoreVertical,
  Pencil, Plus, RefreshCw, ShieldCheck, Trash2, X, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { verificationAPI, getApiError } from '@/services/api';
import { VERIFIER_DIRECTORY } from './BatchMonitor';

export { VERIFIER_DIRECTORY };

const CATEGORY_TABS = [
  { value: '',        label: 'All' },
  { value: 'human',   label: 'Human' },
  { value: 'product', label: 'Product' },
];

const LABEL_TABS = [
  { value: 'automatic', label: 'Automatic' },
  { value: 'manual',    label: 'Manual' },
];

const EMPTY_FORM = {
  name: '', label: 'manual', category: 'human',
  email_address: '', api_link: '',
  price: '', timeline: '', industry_type: '',
};

const inputCls  = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 bg-white';
const labelCls  = 'block text-sm font-medium text-brand-dark font-inter mb-1.5';

const CustomSelect = ({ value, onChange, options }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
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
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => { onChange(option.value); setOpen(false); }}
              className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-inter transition-colors ${
                value === option.value
                  ? 'bg-blue-50 text-brand-blue font-medium'
                  : 'text-brand-dark hover:bg-gray-50'
              }`}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={13} className="text-brand-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const Verifiers = () => {
  const [allTypes,       setAllTypes]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [refreshing,     setRefreshing]     = useState(false);
  const [categoryTab,    setCategoryTab]    = useState('');
  const [labelFilter,    setLabelFilter]    = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [modalOpen,      setModalOpen]      = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [submitting,     setSubmitting]     = useState(false);
  const [deletingId,       setDeletingId]       = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [actionMenuId,     setActionMenuId]     = useState(null);
  const [editModalOpen,    setEditModalOpen]    = useState(false);
  const [editTarget,       setEditTarget]       = useState(null);
  const [editForm,         setEditForm]         = useState(EMPTY_FORM);
  const [saving,           setSaving]           = useState(false);
  const [industryInput,    setIndustryInput]    = useState('');
  const [editIndustryInput, setEditIndustryInput] = useState('');
  const [menuPos,          setMenuPos]          = useState(null);

  const fetchTypes = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // Fetch with category filter from tab; industry filtering is done client-side
      const filters = {};
      if (categoryTab) filters.category = categoryTab;
      const { data } = await verificationAPI.getVerificationTypes(filters);
      // API may return array directly or wrapped
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

  useEffect(() => {
    if (!actionMenuId) return;
    const close = () => { setActionMenuId(null); setMenuPos(null); };
    const onMouseDown = (e) => {
      if (!e.target.closest('[data-action-menu]') && !e.target.closest('[data-action-btn]')) close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('mousedown', onMouseDown);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [actionMenuId]);

  // Client-side filters applied on top of the category-filtered API results
  const types = allTypes.filter((t) => {
    if (labelFilter && t.label !== labelFilter) return false;
    if (industryFilter.trim() &&
      !(t.industry_type || []).some((ind) =>
        ind.toLowerCase().includes(industryFilter.trim().toLowerCase())
      )
    ) return false;
    return true;
  });

  const total     = allTypes.length;
  const automatic = allTypes.filter((t) => t.label === 'automatic').length;
  const manual    = allTypes.filter((t) => t.label === 'manual').length;

  const updateForm  = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));
  const resetForm   = () => setForm(EMPTY_FORM);
  const handleClose = () => { setModalOpen(false); resetForm(); setIndustryInput(''); };

  // ── Tag helpers: create form ──────────────────────────────────────────────
  const formTags = form.industry_type
    ? form.industry_type.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const addFormTag = (val) => {
    const tag = val.trim();
    if (!tag) return;
    if (!formTags.includes(tag)) updateForm('industry_type', [...formTags, tag].join(', '));
    setIndustryInput('');
  };
  const removeFormTag = (tag) =>
    updateForm('industry_type', formTags.filter((t) => t !== tag).join(', '));

  // ── Tag helpers: edit form ────────────────────────────────────────────────
  const editTags = editForm.industry_type
    ? editForm.industry_type.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const addEditTag = (val) => {
    const tag = val.trim();
    if (!tag) return;
    if (!editTags.includes(tag))
      setEditForm((p) => ({ ...p, industry_type: [...editTags, tag].join(', ') }));
    setEditIndustryInput('');
  };
  const removeEditTag = (tag) =>
    setEditForm((p) => ({
      ...p,
      industry_type: editTags.filter((t) => t !== tag).join(', '),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (form.label === 'manual' && !form.email_address.trim()) {
      toast.error('Email Address is required for manual verification');
      return;
    }
    if (form.label === 'automatic' && !form.api_link.trim()) {
      toast.error('API Link is required for automatic verification');
      return;
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
      industry_type: form.industry_type
        ? form.industry_type.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
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
    setEditIndustryInput('');
    setEditModalOpen(true);
    setActionMenuId(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) { toast.error('Name is required'); return; }
    if (editForm.label === 'manual'    && !editForm.email_address.trim()) { toast.error('Email Address is required for manual'); return; }
    if (editForm.label === 'automatic' && !editForm.api_link.trim())      { toast.error('API Link is required for automatic'); return; }
    setSaving(true);
    const payload = {
      name:          editForm.name.trim(),
      label:         editForm.label,
      category:      editForm.category,
      email_address: editForm.label === 'manual'    ? editForm.email_address.trim() : null,
      api_link:      editForm.label === 'automatic' ? editForm.api_link.trim()      : null,
      price:         editForm.price !== '' ? Number(editForm.price) : 0,
      timeline:      editForm.timeline.trim() || undefined,
      industry_type: editForm.industry_type
        ? editForm.industry_type.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
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
    <AuthLayout title="Verifiers">
      <PageHeader
        title="Verification Types"
        subtitle="Manage automated and manual verification types used across the platform"
        action={
          <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
            Add Verification Type
          </Button>
        }
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Types', value: total,     icon: ShieldCheck, color: 'text-brand-blue', bg: 'bg-blue-50',   accent: 'bg-brand-blue' },
          { label: 'Automatic',   value: automatic, icon: Zap,         color: 'text-green-600',  bg: 'bg-green-50',  accent: 'bg-green-500' },
          { label: 'Manual',      value: manual,    icon: Mail,        color: 'text-orange-600', bg: 'bg-orange-50', accent: 'bg-orange-400' },
        ].map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-4 overflow-hidden relative">
              <div className={`absolute inset-x-0 top-0 h-1 ${stat.accent}`} />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-500 font-inter">{stat.label}</p>
                  <p className="font-sora font-bold text-2xl text-brand-dark mt-1">{stat.value}</p>
                </div>
                <div className={`w-11 h-11 rounded-xl ${stat.bg} flex items-center justify-center`}>
                  <Icon size={20} className={stat.color} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Category + Label tabs */}
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <div className="flex gap-2">
              {CATEGORY_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setCategoryTab(tab.value)}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold font-inter transition-all ${
                    categoryTab === tab.value
                      ? 'bg-brand-blue text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="w-px h-5 bg-gray-200" />
            <div className="flex gap-2">
              {LABEL_TABS.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setLabelFilter((prev) => (prev === tab.value ? '' : tab.value))}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold font-inter transition-all ${
                    labelFilter === tab.value
                      ? tab.value === 'automatic'
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-orange-500 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Industry filter + refresh */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                placeholder="Filter by industry..."
                className="rounded-xl border border-gray-200 px-3 py-2 pr-8 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 w-52"
              />
              {industryFilter && (
                <button
                  onClick={() => setIndustryFilter('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <button
              onClick={() => fetchTypes(true)}
              className={`flex items-center gap-1.5 text-xs text-gray-500 font-inter hover:text-brand-blue transition-colors px-2 py-2 ${refreshing ? 'pointer-events-none' : ''}`}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </Card>

      {/* Table / States */}
      {loading ? (
        <Card className="p-10 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading verification types...</p>
        </Card>
      ) : types.length === 0 ? (
        <Card className="p-10 text-center">
          <ShieldCheck size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400 font-inter">No verification types found</p>
          <p className="text-xs text-gray-400 font-inter mt-1">Try changing the category tab or clearing the industry filter.</p>
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-sora font-semibold text-brand-dark text-lg">Verification Type Directory</h3>
                <p className="text-sm text-gray-500 font-inter mt-1">
                  {types.length} type{types.length !== 1 ? 's' : ''} shown
                  {industryFilter ? ` · filtered by "${industryFilter}"` : ''}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Name</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Label</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Category</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Contact / Link</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Price / Timeline</th>
                    <th className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Industries</th>
                    <th className="px-5 py-3 text-center text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {types.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      {/* Name */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                            <ShieldCheck size={15} />
                          </div>
                          <p className="text-sm font-semibold text-brand-dark font-inter">{item.name}</p>
                        </div>
                      </td>

                      {/* Label badge */}
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold font-inter border ${
                          item.label === 'automatic'
                            ? 'bg-green-50 text-green-700 border-green-100'
                            : 'bg-orange-50 text-orange-700 border-orange-100'
                        }`}>
                          {item.label === 'automatic' ? <Zap size={11} /> : <Mail size={11} />}
                          {item.label === 'automatic' ? 'Automatic' : 'Manual'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-600 font-inter capitalize border border-gray-200">
                          {item.category || '—'}
                        </span>
                      </td>

                      {/* Contact — show email for manual, api_link for automatic */}
                      <td className="px-5 py-4 max-w-[200px]">
                        {item.label === 'manual' ? (
                          item.email_address ? (
                            <p className="text-xs text-gray-600 font-inter flex items-center gap-1.5 truncate">
                              <Mail size={12} className="shrink-0 text-orange-400" />
                              {item.email_address}
                            </p>
                          ) : (
                            <span className="text-xs text-gray-300 font-inter">—</span>
                          )
                        ) : (
                          item.api_link ? (
                            <p className="text-xs text-brand-blue font-inter flex items-center gap-1.5 truncate" title={item.api_link}>
                              <Link size={12} className="shrink-0" />
                              <span className="truncate">{item.api_link}</span>
                            </p>
                          ) : (
                            <span className="text-xs text-gray-300 font-inter">—</span>
                          )
                        )}
                      </td>

                      {/* Price + Timeline */}
                      <td className="px-5 py-4">
                        {item.price != null && (
                          <p className="text-sm font-bold text-brand-dark font-sora">
                            ₹{item.price}
                          </p>
                        )}
                        {item.timeline && (
                          <p className="text-xs text-gray-400 font-inter flex items-center gap-1 mt-1">
                            <Clock size={11} />
                            {item.timeline}
                          </p>
                        )}
                      </td>

                      {/* Industries */}
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(item.industry_type || []).slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="px-2 py-0.5 rounded-md bg-blue-50 text-xs text-brand-blue font-inter border border-blue-100"
                            >
                              {s}
                            </span>
                          ))}
                          {(item.industry_type || []).length > 3 && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-500 font-inter">
                              +{item.industry_type.length - 3}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Actions — 3-dot menu */}
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex justify-center">
                          <button
                            type="button"
                            data-action-btn="true"
                            onClick={(e) => {
                              if (actionMenuId === item.id) {
                                setActionMenuId(null);
                                setMenuPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                setActionMenuId(item.id);
                              }
                            }}
                            className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-dark hover:bg-gray-50 shadow-sm"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </motion.div>
      )}

      {/* ── Fixed action dropdown (escapes overflow-x-auto) ──────────────── */}
      {actionMenuId && menuPos && (
        <div
          data-action-menu="true"
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-36 rounded-xl border border-gray-200 bg-white shadow-lg p-1"
        >
          {(() => {
            const item = types.find((t) => t.id === actionMenuId);
            if (!item) return null;
            return (
              <>
                <button
                  type="button"
                  onClick={() => { setMenuPos(null); openEdit(item); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter text-gray-700 hover:bg-gray-50"
                >
                  <Pencil size={13} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => { setActionMenuId(null); setMenuPos(null); setDeleteConfirmItem(item); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* ── Add Verification Type Modal ─────────────────────────────────────── */}
      <Modal isOpen={modalOpen} onClose={handleClose} title="Add Verification Type" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name + Label */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                value={form.name}
                onChange={(e) => updateForm('name', e.target.value)}
                className={inputCls}
                placeholder="e.g. Aadhaar Verification"
              />
            </div>
            <div>
              <label className={labelCls}>Label *</label>
              <CustomSelect
                value={form.label}
                onChange={(val) => updateForm('label', val)}
                options={[
                  { value: 'manual', label: 'Manual' },
                  { value: 'automatic', label: 'Automatic' },
                ]}
              />
              <p className="text-xs text-gray-400 font-inter mt-1">
                {form.label === 'manual'
                  ? 'Manual — human verifier contacted via email.'
                  : 'Automatic — verification triggered via API.'}
              </p>
            </div>
          </div>

          {/* Category + conditional Email / API Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <CustomSelect
                value={form.category}
                onChange={(val) => updateForm('category', val)}
                options={[
                  { value: 'human', label: 'Human' },
                  { value: 'product', label: 'Product' },
                ]}
              />
            </div>

            {form.label === 'manual' ? (
              <div>
                <label className={labelCls}>Email Address *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={form.email_address}
                    onChange={(e) => updateForm('email_address', e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="verifier@agency.com"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>API Link *</label>
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.api_link}
                    onChange={(e) => updateForm('api_link', e.target.value)}
                    className={`${inputCls} pl-9`}
                    placeholder="https://api.verifier.com/check"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Price + Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (₹)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number" min="0"
                  value={form.price}
                  onChange={(e) => updateForm('price', e.target.value)}
                  className={`${inputCls} pl-9`}
                  placeholder="499"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={form.timeline}
                  onChange={(e) => updateForm('timeline', e.target.value)}
                  className={`${inputCls} pl-9`}
                  placeholder="e.g. 2-3 business days"
                />
              </div>
            </div>
          </div>

          {/* Industry Types */}
          <div>
            <label className={labelCls}>Industry Types</label>
            <div className="rounded-xl border border-gray-200 px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-brand-blue/30 bg-white">
              {formTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs text-brand-blue border border-blue-100 font-inter">
                  {tag}
                  <button type="button" onClick={() => removeFormTag(tag)} className="hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                value={industryInput}
                onChange={(e) => setIndustryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addFormTag(industryInput); }
                  if (e.key === 'Backspace' && !industryInput && formTags.length) removeFormTag(formTags[formTags.length - 1]);
                }}
                onBlur={() => { if (industryInput.trim()) addFormTag(industryInput); }}
                placeholder={formTags.length ? '' : 'Type and press Enter to add...'}
                className="flex-1 min-w-[160px] text-sm font-inter outline-none bg-transparent py-0.5"
              />
            </div>
            <p className="text-xs text-gray-400 font-inter mt-1">Press Enter or comma to add. Backspace removes the last tag.</p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Plus} disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Verification Type'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Verification Type Modal ─────────────────────────────────────── */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditTarget(null); }} title="Edit Verification Type" size="lg">
        <form onSubmit={handleSaveEdit} className="space-y-4">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Name *</label>
              <input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className={inputCls}
                placeholder="e.g. Aadhaar Verification"
              />
            </div>
            <div>
              <label className={labelCls}>Label *</label>
              <CustomSelect
                value={editForm.label}
                onChange={(val) => setEditForm((p) => ({ ...p, label: val }))}
                options={[
                  { value: 'manual', label: 'Manual' },
                  { value: 'automatic', label: 'Automatic' },
                ]}
              />
              <p className="text-xs text-gray-400 font-inter mt-1">
                {editForm.label === 'manual'
                  ? 'Manual — human verifier contacted via email.'
                  : 'Automatic — verification triggered via API.'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <CustomSelect
                value={editForm.category}
                onChange={(val) => setEditForm((p) => ({ ...p, category: val }))}
                options={[
                  { value: 'human', label: 'Human' },
                  { value: 'product', label: 'Product' },
                ]}
              />
            </div>

            {editForm.label === 'manual' ? (
              <div>
                <label className={labelCls}>Email Address *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={editForm.email_address}
                    onChange={(e) => setEditForm((p) => ({ ...p, email_address: e.target.value }))}
                    className={`${inputCls} pl-9`}
                    placeholder="verifier@agency.com"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className={labelCls}>API Link *</label>
                <div className="relative">
                  <Link size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={editForm.api_link}
                    onChange={(e) => setEditForm((p) => ({ ...p, api_link: e.target.value }))}
                    className={`${inputCls} pl-9`}
                    placeholder="https://api.verifier.com/check"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Price (₹)</label>
              <div className="relative">
                <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="number" min="0"
                  value={editForm.price}
                  onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                  className={`${inputCls} pl-9`}
                  placeholder="499"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Timeline</label>
              <div className="relative">
                <Clock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={editForm.timeline}
                  onChange={(e) => setEditForm((p) => ({ ...p, timeline: e.target.value }))}
                  className={`${inputCls} pl-9`}
                  placeholder="e.g. 2-3 business days"
                />
              </div>
            </div>
          </div>

          <div>
            <label className={labelCls}>Industry Types</label>
            <div className="rounded-xl border border-gray-200 px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-brand-blue/30 bg-white">
              {editTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs text-brand-blue border border-blue-100 font-inter">
                  {tag}
                  <button type="button" onClick={() => removeEditTag(tag)} className="hover:text-red-500 transition-colors">
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                value={editIndustryInput}
                onChange={(e) => setEditIndustryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addEditTag(editIndustryInput); }
                  if (e.key === 'Backspace' && !editIndustryInput && editTags.length) removeEditTag(editTags[editTags.length - 1]);
                }}
                onBlur={() => { if (editIndustryInput.trim()) addEditTag(editIndustryInput); }}
                placeholder={editTags.length ? '' : 'Type and press Enter to add...'}
                className="flex-1 min-w-[160px] text-sm font-inter outline-none bg-transparent py-0.5"
              />
            </div>
            <p className="text-xs text-gray-400 font-inter mt-1">Press Enter or comma to add. Backspace removes the last tag.</p>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setEditModalOpen(false); setEditTarget(null); }} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={saving ? RefreshCw : Pencil} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>
      {/* ── Delete Confirmation Modal ─────────────────────────────────────── */}
      <Modal
        isOpen={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        title="Delete Verification Type"
        size="sm"
      >
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
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              type="button"
              onClick={() => setDeleteConfirmItem(null)}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              type="button"
              icon={deletingId ? RefreshCw : Trash2}
              disabled={!!deletingId}
              onClick={handleDelete}
            >
              {deletingId ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </AuthLayout>
  );
};

export default Verifiers;
