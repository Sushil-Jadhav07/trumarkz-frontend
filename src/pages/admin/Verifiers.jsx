import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  AlignLeft, BookOpen, Building2, Check, ChevronDown, Clock, DollarSign,
  Filter, Link, Mail, MapPin, MoreVertical, Pencil, Phone,
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

const VerifierDirectory = () => {
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
  const [menuId,     setMenuId]     = useState(null);
  const [menuPos,    setMenuPos]    = useState(null);
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

  useEffect(() => {
    if (!menuId) return;
    const close = () => { setMenuId(null); setMenuPos(null); };
    const onMD = (e) => {
      if (!e.target.closest('[data-action-menu]') && !e.target.closest('[data-action-btn]')) close();
    };
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    document.addEventListener('mousedown', onMD);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
      document.removeEventListener('mousedown', onMD);
    };
  }, [menuId]);

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
    setMenuId(null);
    setMenuPos(null);
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

  const uniqueOrgs = [...new Set(verifiers.map((v) => v.organization).filter(Boolean))].length;
  const withSpec   = verifiers.filter((v) => normaliseSpecialization(v.specialization).length > 0).length;

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Verifiers',       value: verifiers.length, icon: Users,     color: 'text-brand-blue',  bg: 'bg-blue-50',   accent: 'bg-brand-blue' },
          { label: 'Organizations',          value: uniqueOrgs,       icon: Building2, color: 'text-purple-600', bg: 'bg-purple-50', accent: 'bg-purple-500' },
          { label: 'With Verifier Type',    value: withSpec,         icon: BookOpen,  color: 'text-green-600',  bg: 'bg-green-50',  accent: 'bg-green-500' },
        ].map(({ label, value, icon: Icon, color, bg, accent }) => (
          <Card key={label} className="p-4 overflow-hidden relative">
            <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 font-inter">{label}</p>
                <p className="font-sora font-bold text-2xl text-brand-dark mt-1">{value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <Card className="p-4 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, organization..."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 pr-8 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAll(true)}
              className={`flex items-center gap-1.5 text-xs text-gray-500 font-inter hover:text-brand-blue transition-colors px-2 py-2 ${refreshing ? 'pointer-events-none' : ''}`}
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setAddOpen(true)}>
              Add Verifier
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
      {loading ? (
        <Card className="p-10 flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-brand-blue" />
          <p className="text-sm text-gray-400 font-inter">Loading verifiers...</p>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400 font-inter">
            {verifiers.length === 0 ? 'No verifiers added yet' : 'No verifiers match your search'}
          </p>
          {verifiers.length === 0 && (
            <div className="mt-3">
              <Button variant="primary" size="sm" icon={Plus} onClick={() => setAddOpen(true)}>
                Add First Verifier
              </Button>
            </div>
          )}
        </Card>
      ) : (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
          <Card className="p-0 overflow-hidden border border-gray-200 shadow-sm">
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/70">
              <h3 className="font-sora font-semibold text-brand-dark text-lg">Verifier Directory</h3>
              <p className="text-sm text-gray-500 font-inter mt-1">
                {filtered.length} verifier{filtered.length !== 1 ? 's' : ''}
                {search ? ` matching "${search}"` : ' registered'}
              </p>
            </div>
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[900px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name / Address', 'Email', 'Phone', 'Organization', 'Verifier Type', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filtered.map((item, index) => (
                    <motion.tr
                      key={item.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="hover:bg-blue-50/30 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0 font-sora font-bold text-sm">
                            {item.name?.[0]?.toUpperCase() || 'V'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-brand-dark font-inter">{item.name}</p>
                            {item.address && (
                              <p className="text-xs text-gray-400 font-inter flex items-center gap-1 mt-0.5">
                                <MapPin size={10} className="shrink-0" /> {item.address}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-gray-600 font-inter">{item.email || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-xs text-gray-600 font-inter">{item.phone || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        {item.organization ? (
                          <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-xs text-purple-700 font-inter border border-purple-100">
                            {item.organization}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300 font-inter">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {normaliseSpecialization(item.specialization).length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {normaliseSpecialization(item.specialization).map((s) => (
                              <span key={s} className="rounded-md bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-blue font-inter">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300 font-inter">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex justify-center">
                          <button
                            type="button"
                            data-action-btn="true"
                            onClick={(e) => {
                              if (menuId === item.id) { setMenuId(null); setMenuPos(null); }
                              else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuH = 80;
                                const top = window.innerHeight - rect.bottom < menuH + 8
                                  ? rect.top - menuH - 4
                                  : rect.bottom + 4;
                                setMenuPos({ top, right: window.innerWidth - rect.right });
                                setMenuId(item.id);
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

      {/* Action dropdown */}
      {menuId && menuPos && (
        <div
          data-action-menu="true"
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-36 rounded-xl border border-gray-200 bg-white shadow-lg p-1"
        >
          {(() => {
            const item = filtered.find((v) => v.id === menuId);
            if (!item) return null;
            return (
              <>
                <button type="button" onClick={() => openEdit(item)}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter text-gray-700 hover:bg-gray-50">
                  <Pencil size={13} /> Edit
                </button>
                <button type="button" onClick={() => { setMenuId(null); setMenuPos(null); setDeleteItem(item); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter text-red-600 hover:bg-red-50">
                  <Trash2 size={13} /> Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Add Modal */}
      <Modal isOpen={addOpen} onClose={() => { setAddOpen(false); setForm(EMPTY_VF); }} title="Add Verifier" size="lg">
        <form onSubmit={handleAdd} className="space-y-4">
          <VerifierFields values={form} onChange={(f, v) => setForm((p) => ({ ...p, [f]: v }))} typeNames={typeNames} />
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setAddOpen(false); setForm(EMPTY_VF); }} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={Plus} disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Verifier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} onClose={() => { setEditOpen(false); setEditTarget(null); }} title="Edit Verifier" size="lg">
        <form onSubmit={handleEdit} className="space-y-4">
          <VerifierFields values={editForm} onChange={(f, v) => setEditForm((p) => ({ ...p, [f]: v }))} typeNames={typeNames} />
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setEditOpen(false); setEditTarget(null); }} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" icon={saving ? RefreshCw : Pencil} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
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
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => setDeleteItem(null)} disabled={!!deletingId}>
              Cancel
            </Button>
            <Button variant="danger" type="button" icon={deletingId ? RefreshCw : Trash2} disabled={!!deletingId} onClick={handleDelete}>
              {deletingId ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

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

const VerificationTypes = () => {
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
  const [actionMenuId,    setActionMenuId]    = useState(null);
  const [editModalOpen,   setEditModalOpen]   = useState(false);
  const [editTarget,      setEditTarget]      = useState(null);
  const [editForm,        setEditForm]        = useState(EMPTY_VT);
  const [saving,          setSaving]          = useState(false);
  const [industryInput,   setIndustryInput]   = useState('');
  const [editIndustryInput, setEditIndustryInput] = useState('');
  const [menuPos,         setMenuPos]         = useState(null);

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
  const resetForm   = () => setForm(EMPTY_VT);
  const handleClose = () => { setModalOpen(false); resetForm(); setIndustryInput(''); };

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
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (form.label === 'manual' && !form.email_address.trim()) {
      toast.error('Email Address is required for manual verification'); return;
    }
    if (form.label === 'automatic' && !form.api_link.trim()) {
      toast.error('API Link is required for automatic verification'); return;
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
    <div>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {[
          { label: 'Total Types', value: total,     icon: ShieldCheck, color: 'text-brand-blue', bg: 'bg-blue-50',   accent: 'bg-brand-blue' },
          { label: 'Automatic',   value: automatic, icon: Zap,         color: 'text-green-600',  bg: 'bg-green-50',  accent: 'bg-green-500' },
          { label: 'Manual',      value: manual,    icon: Mail,        color: 'text-orange-600', bg: 'bg-orange-50', accent: 'bg-orange-400' },
        ].map(({ label, value, icon: Icon, color, bg, accent }) => (
          <Card key={label} className="p-4 overflow-hidden relative">
            <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-gray-500 font-inter">{label}</p>
                <p className="font-sora font-bold text-2xl text-brand-dark mt-1">{value}</p>
              </div>
              <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon size={20} className={color} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Filter size={14} className="text-gray-400 shrink-0" />
            <div className="flex gap-2">
              {VT_CATEGORY_TABS.map((tab) => (
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
              {VT_LABEL_TABS.map((tab) => (
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
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                placeholder="Filter by industry..."
                className="rounded-xl border border-gray-200 px-3 py-2 pr-8 text-xs font-inter focus:outline-none focus:ring-2 focus:ring-brand-blue/30 w-52"
              />
              {industryFilter && (
                <button onClick={() => setIndustryFilter('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
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
            <Button variant="primary" size="sm" icon={Plus} onClick={() => setModalOpen(true)}>
              Add Type
            </Button>
          </div>
        </div>
      </Card>

      {/* Table */}
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
            <div className="px-6 py-5 border-b border-gray-100 bg-gradient-to-r from-white to-gray-50/70">
              <h3 className="font-sora font-semibold text-brand-dark text-lg">Verification Type Directory</h3>
              <p className="text-sm text-gray-500 font-inter mt-1">
                {types.length} type{types.length !== 1 ? 's' : ''} shown
                {industryFilter ? ` · filtered by "${industryFilter}"` : ''}
              </p>
            </div>
            <div className="overflow-x-auto scrollbar-hidden">
              <table className="w-full min-w-[960px] border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['Name', 'Label', 'Category', 'Contact / Link', 'Price / Timeline', 'Industries', 'Actions'].map((h) => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500 font-inter">{h}</th>
                    ))}
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
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 text-brand-blue flex items-center justify-center shrink-0">
                            <ShieldCheck size={15} />
                          </div>
                          <p className="text-sm font-semibold text-brand-dark font-inter">{item.name}</p>
                        </div>
                      </td>
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
                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-gray-100 text-xs text-gray-600 font-inter capitalize border border-gray-200">
                          {item.category || '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-[200px]">
                        {item.label === 'manual' ? (
                          item.email_address ? (
                            <p className="text-xs text-gray-600 font-inter flex items-center gap-1.5 truncate">
                              <Mail size={12} className="shrink-0 text-orange-400" />
                              {item.email_address}
                            </p>
                          ) : <span className="text-xs text-gray-300 font-inter">—</span>
                        ) : (
                          item.api_link ? (
                            <p className="text-xs text-brand-blue font-inter flex items-center gap-1.5 truncate" title={item.api_link}>
                              <Link size={12} className="shrink-0" />
                              <span className="truncate">{item.api_link}</span>
                            </p>
                          ) : <span className="text-xs text-gray-300 font-inter">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        {item.price != null && (
                          <p className="text-sm font-bold text-brand-dark font-sora">₹{item.price}</p>
                        )}
                        {item.timeline && (
                          <p className="text-xs text-gray-400 font-inter flex items-center gap-1 mt-1">
                            <Clock size={11} /> {item.timeline}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(item.industry_type || []).slice(0, 3).map((s) => (
                            <span key={s} className="px-2 py-0.5 rounded-md bg-blue-50 text-xs text-brand-blue font-inter border border-blue-100">{s}</span>
                          ))}
                          {(item.industry_type || []).length > 3 && (
                            <span className="px-2 py-0.5 rounded-md bg-gray-100 text-xs text-gray-500 font-inter">
                              +{item.industry_type.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex justify-center">
                          <button
                            type="button"
                            data-action-btn="true"
                            onClick={(e) => {
                              if (actionMenuId === item.id) { setActionMenuId(null); setMenuPos(null); }
                              else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuH = 80;
                                const top = window.innerHeight - rect.bottom < menuH + 8
                                  ? rect.top - menuH - 4
                                  : rect.bottom + 4;
                                setMenuPos({ top, right: window.innerWidth - rect.right });
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

      {/* Action dropdown */}
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
                <button type="button" onClick={() => { setMenuPos(null); openEdit(item); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter text-gray-700 hover:bg-gray-50">
                  <Pencil size={13} /> Edit
                </button>
                <button type="button" onClick={() => { setActionMenuId(null); setMenuPos(null); setDeleteConfirmItem(item); }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-inter text-red-600 hover:bg-red-50">
                  <Trash2 size={13} /> Delete
                </button>
              </>
            );
          })()}
        </div>
      )}

      {/* Add Verification Type Modal */}
      <Modal isOpen={modalOpen} onClose={handleClose} title="Add Verification Type" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
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
                <label className={labelCls}>API Link *</label>
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
          <div>
            <label className={labelCls}>Industry Types</label>
            <div className="rounded-xl border border-gray-200 px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-brand-blue/30 bg-white">
              {formTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs text-brand-blue border border-blue-100 font-inter">
                  {tag}
                  <button type="button" onClick={() => removeFormTag(tag)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
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
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
            <Button variant="ghost" type="button" onClick={handleClose} disabled={submitting}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Plus} disabled={submitting}>
              {submitting ? 'Creating...' : 'Add Verification Type'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Verification Type Modal */}
      <Modal isOpen={editModalOpen} onClose={() => { setEditModalOpen(false); setEditTarget(null); }} title="Edit Verification Type" size="lg">
        <form onSubmit={handleSaveEdit} className="space-y-4">
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
                <label className={labelCls}>API Link *</label>
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
          <div>
            <label className={labelCls}>Industry Types</label>
            <div className="rounded-xl border border-gray-200 px-3 py-2 min-h-[44px] flex flex-wrap gap-1.5 items-center focus-within:ring-2 focus-within:ring-brand-blue/30 bg-white">
              {editTags.map((tag) => (
                <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-xs text-brand-blue border border-blue-100 font-inter">
                  {tag}
                  <button type="button" onClick={() => removeEditTag(tag)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
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
            <Button variant="ghost" type="button" onClick={() => { setEditModalOpen(false); setEditTarget(null); }} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" icon={saving ? RefreshCw : Pencil} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
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
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" type="button" onClick={() => setDeleteConfirmItem(null)} disabled={!!deletingId}>Cancel</Button>
            <Button variant="danger" type="button" icon={deletingId ? RefreshCw : Trash2} disabled={!!deletingId} onClick={handleDelete}>
              {deletingId ? 'Deleting...' : 'Yes, Delete'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// ── Page tabs ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'directory', label: 'Verifier Directory' },
  { id: 'types',     label: 'Verification Types' },
];

// ── Main Export ───────────────────────────────────────────────────────────────
export const Verifiers = () => {
  const [activeTab, setActiveTab] = useState('directory');

  return (
    <AuthLayout title="Verifiers">
      <PageHeader
        title="Verifiers"
        subtitle="Manage verifier entities and verification types used across the platform"
      />

      {/* Tab bar */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2.5 text-sm font-semibold font-inter border-b-2 transition-all -mb-[1px] ${
              activeTab === tab.id
                ? 'border-brand-blue text-brand-blue'
                : 'border-transparent text-gray-500 hover:text-brand-dark'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'directory' ? <VerifierDirectory /> : <VerificationTypes />}
    </AuthLayout>
  );
};

export default Verifiers;
