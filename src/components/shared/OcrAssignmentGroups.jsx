import { Plus, Trash2 } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { OCR_GENDERS, OCR_NATIONALITY_SUGGESTIONS } from '@/utils/ocrAssignments';

export const nationalityEntry = (value) => value && !value.includes(',') && value.toLowerCase() !== 'all' ? value : '';
export const OcrNationalitySelect = ({ value, onChange, disabled, ariaLabel = 'Nationality' }) => <CustomSelect
  value={value || ''} onChange={onChange} disabled={disabled} ariaLabel={ariaLabel}
  searchable searchPlaceholder="Search or enter a demonym…" allowCustomValue={nationalityEntry}
  options={[{ value: '', label: 'Not assigned' }, ...OCR_NATIONALITY_SUGGESTIONS.map((item) => ({ value: item, label: item }))]}
  placeholder="Choose nationality"
/>;

export const OcrAssignmentGroups = ({ entries, groups, onChange, disabled = false }) => {
  if (!entries.length) return null;
  const update = (id, patch) => onChange(groups.map((group) => group.id === id ? { ...group, ...patch } : group));
  return <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/30 p-4">
    <div><h3 className="text-sm font-semibold text-brand-dark">Assign Gender &amp; Nationality</h3><p className="mt-1 text-xs leading-5 text-gray-500">Choose documents for each group before submitting. Later groups replace earlier values for the same field. Unselected documents keep their extracted values.</p></div>
    {groups.map((group, index) => <div key={group.id} className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between"><h4 className="text-xs font-semibold">Group {index + 1}</h4><button type="button" disabled={disabled} aria-label={`Remove assignment group ${index + 1}`} onClick={() => onChange(groups.filter((item) => item.id !== group.id))} className="rounded p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button></div>
      <div className="max-h-40 space-y-2 overflow-y-auto">{entries.map((entry, fileIndex) => <label key={entry.id} className="flex min-w-0 items-center gap-2 text-xs text-gray-600"><input type="checkbox" disabled={disabled} checked={group.entryIds.includes(entry.id)} onChange={(event) => update(group.id, { entryIds: event.target.checked ? [...group.entryIds, entry.id] : group.entryIds.filter((id) => id !== entry.id) })} className="shrink-0 accent-blue-600" /><span className="min-w-0 break-words">User {fileIndex + 1} · {entry.file.name}</span></label>)}</div>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        <div><p className="mb-1 text-xs font-medium text-gray-600">Gender</p><CustomSelect value={group.gender} onChange={(gender) => update(group.id, { gender })} disabled={disabled} ariaLabel={`Group ${index + 1} gender`} searchable options={[{ value: '', label: 'Not assigned' }, ...OCR_GENDERS.map((value) => ({ value, label: value }))]} placeholder="Choose gender" /></div>
        <div><p className="mb-1 text-xs font-medium text-gray-600">Nationality</p><OcrNationalitySelect value={group.nationality} onChange={(nationality) => update(group.id, { nationality })} disabled={disabled} ariaLabel={`Group ${index + 1} nationality`} /></div>
      </div>
      <p className="text-[11px] leading-5 text-gray-500">Select at least one document and one field. Use a demonym such as Indian, not India; supported nationalities are confirmed on upload.</p>
    </div>)}
    <button type="button" disabled={disabled} onClick={() => onChange([...groups, { id: crypto.randomUUID(), entryIds: [], gender: '', nationality: '' }])} className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-brand-blue disabled:opacity-50"><Plus size={14} /> Add assignment group</button>
  </div>;
};
