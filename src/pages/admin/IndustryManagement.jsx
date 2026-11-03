import { SlidingTabs } from '@/components/ui/SlidingTabs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BriefcaseMedical, Building2, Bus, ChevronsUpDown, Clapperboard, Cpu, Factory, GraduationCap, HardHat,
  HeartHandshake, Hotel, Info, Landmark, Layers, Monitor, Package, Pencil, Plus, Power, PowerOff,
  RefreshCw, Scale, ShoppingBag, Sparkles, Sprout, Tag, Tags, User, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { PageIntro, OutlineButton, SolidButton, SummaryBanner, SearchField, RowActionMenu } from '@/components/shared/AdminPageParts';
import { industryTypesAPI, getApiError } from '@/services/api';
import { clearIndustryTypesCache } from '@/hooks/useIndustryTypes';
import { INDUSTRY_ENTITY, parseIndustryTypes, validateIndustryName } from '@/utils/industryTypes';

const LISTS = [
  { value: INDUSTRY_ENTITY.HUMAN, label: 'Human', icon: User, blurb: 'Industries available for human verification.', usedIn: 'Used in human verification batches and verification types.' },
  { value: INDUSTRY_ENTITY.PRODUCT, label: 'Product', icon: Package, blurb: 'Industries available for product and warranty verification.', usedIn: 'Used in product and warranty batches and their verification types.' },
  { value: INDUSTRY_ENTITY.ORGANIZATION, label: 'Organization', icon: Building2, blurb: 'Industries organizations can register with.', usedIn: 'Used for organization onboarding and profiles.' },
];

// Icon for a row, picked from words in the industry's name.
const ICON_RULES = [
  [/health|medic|pharma/, BriefcaseMedical], [/transport|logistic.*transport/, Bus], [/logistic|supply|warehouse/, Package],
  [/\bit\b|tech|software/, Monitor], [/real estate|property|construction/, Building2], [/electronic|appliance/, Cpu],
  [/beauty|cosmetic/, Sparkles], [/educat|school/, GraduationCap], [/financ|bank|government/, Landmark],
  [/manufactur/, Factory], [/retail|commerce/, ShoppingBag], [/build/, HardHat], [/hospitality|hotel/, Hotel],
  [/agri/, Sprout], [/energy|utilit/, Zap], [/media|entertain/, Clapperboard], [/legal|compliance/, Scale],
  [/non-?profit|charity/, HeartHandshake],
];
const industryIcon = (name) => ICON_RULES.find(([pattern]) => pattern.test(String(name).toLowerCase()))?.[1] || Tag;

const formatDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';
};

const SortHead = ({ label, active, dir, onSort }) => (
  <button
    type="button"
    onClick={onSort}
    aria-label={`Sort by ${label}`}
    className="inline-flex items-center gap-1.5 font-semibold text-brand-dark transition-colors hover:text-brand-blue"
  >
    {label}
    <ChevronsUpDown size={13} className={active ? 'text-brand-blue' : 'text-gray-500'} aria-hidden="true" />
    {active && <span className="sr-only">{dir === 'asc' ? 'ascending' : 'descending'}</span>}
  </button>
);

export const IndustryManagement = () => {
  const [entityType, setEntityType] = useState(INDUSTRY_ENTITY.HUMAN);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [problem, setProblem] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState({ key: '', dir: 'asc' });
  const [editor, setEditor] = useState(null); // { mode: 'create' | 'rename', item? }
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null); // item to deactivate
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setProblem('');
    try {
      const { data } = await industryTypesAPI.list(entityType, { includeInactive: true });
      const parsed = parseIndustryTypes(data, entityType, { includeInactive: true });
      if (parsed === null) {
        setItems([]);
        setProblem('Industry management is not available on this server yet.');
      } else {
        setItems(parsed);
      }
    } catch (err) {
      setItems([]);
      setProblem(err?.response?.status === 403
        ? 'SuperAdmin access is required to manage industries.'
        : getApiError(err, 'Failed to load industries'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [entityType]);

  useEffect(() => { load(); setSearch(''); setSort({ key: '', dir: 'asc' }); }, [load]);

  const changed = () => { clearIndustryTypesCache(); return load(true); };

  const activeCount = items.filter((item) => item.isActive).length;
  const query = search.trim().toLowerCase();
  const rows = useMemo(() => {
    const filtered = items.filter((item) => !query || item.name.toLowerCase().includes(query));
    if (!sort.key) return filtered;
    const sign = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => sign * (sort.key === 'name'
      ? a.name.localeCompare(b.name)
      : (new Date(a.updatedAt).getTime() || 0) - (new Date(b.updatedAt).getTime() || 0)));
  }, [items, query, sort]);
  const list = LISTS.find((entry) => entry.value === entityType);
  const toggleSort = (key) => setSort((prev) => (prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }));

  // A name that already exists in this list (active or not) can't be created again; an inactive
  // one can be brought back instead.
  const clash = editor
    ? items.find((item) => item.name.toLowerCase() === name.trim().toLowerCase() && item.backendId !== editor.item?.backendId)
    : null;

  const openCreate = () => { setEditor({ mode: 'create' }); setName(''); setNameError(''); };
  const openRename = (item) => { setEditor({ mode: 'rename', item }); setName(item.name); setNameError(''); };
  const closeEditor = () => { if (!saving) setEditor(null); };

  const reactivate = async (item) => {
    setBusyId(item.backendId);
    try {
      await industryTypesAPI.update(item.backendId, { is_active: true });
      toast.success(`"${item.name}" is active again`);
      setEditor(null);
      await changed();
    } catch (err) {
      toast.error(getApiError(err, 'Could not reactivate the industry'));
    } finally {
      setBusyId(null);
    }
  };

  const submit = async (event) => {
    event?.preventDefault();
    if (saving) return;
    const message = validateIndustryName(name);
    if (message) { setNameError(message); return; }
    if (clash) { setNameError(clash.isActive ? 'This industry already exists in the list' : 'This industry exists but is inactive'); return; }
    setSaving(true);
    try {
      if (editor.mode === 'create') {
        await industryTypesAPI.create({ name: name.trim(), entityType });
        toast.success(`"${name.trim()}" added`);
      } else {
        await industryTypesAPI.update(editor.item.backendId, { name: name.trim() });
        toast.success('Industry renamed. Existing records keep the old name.');
      }
      setEditor(null);
      await changed();
    } catch (err) {
      const text = getApiError(err, 'Could not save the industry');
      setNameError(text);
      if (err?.response?.status !== 409) toast.error(text);
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async () => {
    if (!confirm) return;
    setBusyId(confirm.backendId);
    try {
      await industryTypesAPI.deactivate(confirm.backendId);
      toast.success(`"${confirm.name}" deactivated`);
      setConfirm(null);
      await changed();
    } catch (err) {
      toast.error(getApiError(err, 'Could not deactivate the industry'));
    } finally {
      setBusyId(null);
    }
  };

  const showCount = !loading && !problem;

  return (
    <AuthLayout title="Industries">
      <div className="w-full mx-auto lg:max-w-none">
        <PageIntro
          eyebrow="Platform settings"
          title="Industries"
          subtitle="Manage industries across onboarding and verification."
          actions={(
            <>
              <OutlineButton icon={RefreshCw} onClick={() => changed()} disabled={refreshing || loading}>Refresh</OutlineButton>
              <SolidButton icon={Plus} onClick={openCreate} disabled={Boolean(problem)}>Add industry</SolidButton>
            </>
          )}
        />

        <SummaryBanner
          icon={Tag}
          label={`Total ${list.label.toLowerCase()} industries`}
          value={showCount ? items.length : '—'}
          segments={[
            list.blurb,
            showCount ? `${activeCount} active · ${items.length - activeCount} inactive` : 'Loading…',
          ]}
        />

        <section aria-label="Industry list" className="overflow-hidden rounded-xl border border-gray-100 bg-white">
          <div className="flex flex-col gap-3 px-5 pb-3 pt-4 lg:flex-row lg:items-center lg:justify-between">
            <SlidingTabs variant="pills" toggle ariaLabel="Industry list" value={entityType} onChange={setEntityType} tabs={LISTS.map(({ value, label, icon }) => ({ value, label, icon }))} />
            <SearchField search={search} onSearch={setSearch} placeholder="Search industries" className="w-full lg:w-72" />
          </div>

          <div className="px-5 pb-3">
            <h2 className="flex items-center gap-2.5 font-sora text-base font-semibold text-brand-dark">
              Industry directory
              {showCount && (
                <span className="rounded-full bg-[#e3ebf8] px-2.5 py-0.5 text-xs font-semibold text-brand-blue font-inter">
                  {items.length} {items.length === 1 ? 'industry' : 'industries'}
                </span>
              )}
            </h2>
            <p className="mt-1 text-xs text-gray-500 font-inter">{list.usedIn}</p>
          </div>

          {loading ? (
            <div className="px-5 pb-5"><LoadingSkeleton variant="table" label="Loading industries" columns={4} /></div>
          ) : problem ? (
            <div role="alert" className="border-t border-gray-100 py-14 text-center">
              <Tags size={26} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-600 font-inter">{problem}</p>
            </div>
          ) : rows.length === 0 ? (
            <div className="border-t border-gray-100 py-14 text-center">
              <Layers size={26} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-medium text-gray-500 font-inter">{items.length === 0 ? 'No industries in this list yet' : 'No industries match your search'}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto scrollbar-hidden">
                <table className="w-full min-w-[720px] border-collapse text-left text-xs font-inter">
                  <thead>
                    <tr>
                      <th className="px-5 py-3" aria-sort={sort.key === 'name' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <SortHead label="Industry" active={sort.key === 'name'} dir={sort.dir} onSort={() => toggleSort('name')} />
                      </th>
                      <th className="px-4 py-3">Status</th>
                      {entityType === INDUSTRY_ENTITY.PRODUCT && <th className="px-4 py-3">Warranty support</th>}
                      <th className="px-4 py-3" aria-sort={sort.key === 'updated' ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                        <SortHead label="Last updated" active={sort.key === 'updated'} dir={sort.dir} onSort={() => toggleSort('updated')} />
                      </th>
                      <th className="px-5 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {rows.map((item) => {
                      const Icon = industryIcon(item.name);
                      return (
                        <tr key={item.backendId || item.id} className="transition-colors hover:bg-blue-50/30">
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-3.5">
                              <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#e8f0fe] text-brand-blue"><Icon size={19} strokeWidth={1.6} /></span>
                              <span className={`text-sm ${item.isActive ? 'font-medium text-brand-dark' : 'text-gray-400'}`}>{item.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              <span className={`h-2 w-2 rounded-full ${item.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                              {item.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          {entityType === INDUSTRY_ENTITY.PRODUCT && (
                            <td className="px-4 py-2.5 text-gray-600">{item.warrantySupport == null ? '—' : item.warrantySupport ? 'Yes' : 'No'}</td>
                          )}
                          <td className="px-4 py-2.5 text-[13px] text-[#2f3b52]">{formatDate(item.updatedAt)}</td>
                          <td className="px-5 py-2.5">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => openRename(item)}
                                aria-label={`Edit ${item.name}`}
                                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand-blue hover:underline"
                              >
                                <Pencil size={14} strokeWidth={1.75} /> Edit
                              </button>
                              <RowActionMenu
                                horizontal
                                label={`Actions for ${item.name}`}
                                items={[
                                  { label: 'Rename', icon: Pencil, onClick: () => openRename(item) },
                                  item.isActive
                                    ? { label: 'Deactivate', icon: PowerOff, tone: 'danger', onClick: () => setConfirm(item) }
                                    : { label: 'Reactivate', icon: Power, onClick: () => reactivate(item) },
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
              <div className="flex flex-col justify-between gap-1 border-t border-gray-100 px-5 py-3 text-xs text-gray-600 font-inter sm:flex-row sm:items-center">
                <p>Showing {rows.length} of {items.length} {items.length === 1 ? 'industry' : 'industries'}</p>
                <p>All records displayed</p>
              </div>
            </>
          )}
        </section>

        <p className="mt-4 flex items-center gap-2 text-[13px] text-gray-500 font-inter">
          <Info size={16} strokeWidth={1.5} /> Industry changes are reflected across the platform.
        </p>
      </div>

      <Modal
        isOpen={Boolean(editor)}
        onClose={closeEditor}
        title={editor?.mode === 'rename' ? 'Rename industry' : `Add ${list.label.toLowerCase()} industry`}
        size="md"
        onSubmit={submit}
      >
        <div className="space-y-3">
          <Input
            label="Industry name"
            placeholder="e.g. Aviation"
            value={name}
            maxLength={100}
            autoFocus
            onChange={(e) => { setName(e.target.value); setNameError(''); }}
            error={nameError}
          />
          {editor?.mode === 'rename' && (
            <p className="text-xs text-gray-500 font-inter">
              Renaming does not change existing batches or organizations. They keep, and keep showing, the old name.
            </p>
          )}
          {editor?.mode === 'create' && clash && !clash.isActive && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800 font-inter">
              <span>“{clash.name}” already exists but is inactive.</span>
              <Button size="sm" variant="outline" type="button" loading={busyId === clash.backendId} onClick={() => reactivate(clash)}>Reactivate</Button>
            </div>
          )}
          <Modal.Footer className="flex flex-col sm:flex-row justify-end gap-2">
            <Button variant="ghost" type="button" onClick={closeEditor} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" loading={saving} disabled={saving}>
              {editor?.mode === 'rename' ? 'Save name' : 'Add industry'}
            </Button>
          </Modal.Footer>
        </div>
      </Modal>

      <Modal isOpen={Boolean(confirm)} onClose={() => !busyId && setConfirm(null)} title="Deactivate industry" size="sm">
        <p className="text-sm text-gray-600 font-inter">
          “{confirm?.name}” will no longer be offered for new records. Batches and organizations that already use it keep it. You can reactivate it any time.
        </p>
        <Modal.Footer className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirm(null)} disabled={Boolean(busyId)}>Cancel</Button>
          <Button variant="primary" onClick={deactivate} loading={Boolean(busyId)} disabled={Boolean(busyId)}>Deactivate</Button>
        </Modal.Footer>
      </Modal>
    </AuthLayout>
  );
};

export default IndustryManagement;
