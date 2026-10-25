import { useState } from 'react';
import { X } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { OCR_GENDERS, OCR_NATIONALITY_SUGGESTIONS } from '@/utils/ocrAssignments';

export const nationalityEntry = (value) => value && !value.includes(',') && value.toLowerCase() !== 'all' ? value : '';
export const OcrNationalitySelect = ({ value, onChange, disabled, ariaLabel = 'Nationality', emptyLabel = 'Not assigned' }) => <CustomSelect
  value={value || ''} onChange={onChange} disabled={disabled} ariaLabel={ariaLabel}
  searchable searchPlaceholder="Search or enter a demonym…" allowCustomValue={nationalityEntry}
  options={[{ value: '', label: emptyLabel }, ...OCR_NATIONALITY_SUGGESTIONS.map((item) => ({ value: item, label: item }))]}
  placeholder="Choose nationality"
/>;

// Lives beside Single/Bulk. Applying freezes the checked local file IDs and
// clears the selection; final upload indices are still built from draft order.
export const OcrAssignmentGroups = ({ entries, groups, onChange, selectedIds = [], onClearSelection, disabled = false }) => {
  const [gender, setGender] = useState('');
  const [nationality, setNationality] = useState('');
  if (!entries.length) return null;

  const validSelection = selectedIds.filter((id) => entries.some((entry) => entry.id === id));
  const selectedCount = validSelection.length;
  const canApply = !disabled && selectedCount > 0 && (gender || nationality);

  const handleApply = () => {
    if (!canApply) return;
    onChange([...groups, { id: crypto.randomUUID(), entryIds: [...validSelection], gender, nationality }]);
    setGender('');
    setNationality('');
    onClearSelection?.();
  };

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:shrink-0" role="group" aria-label="Assign selected users">
          <div className="w-24">
            <CustomSelect
              value={gender} onChange={setGender} disabled={disabled || !selectedCount} ariaLabel="Gender for selected users"
              options={[{ value: '', label: 'Gender' }, ...OCR_GENDERS.map((value) => ({ value, label: value }))]}
              placeholder="Gender"
            />
          </div>
          <div className="w-32">
            <OcrNationalitySelect value={nationality} onChange={setNationality} disabled={disabled || !selectedCount} ariaLabel="Nationality for selected users" emptyLabel="Nationality" />
          </div>
          <button
            type="button" disabled={disabled || !canApply} onClick={handleApply}
            title={selectedCount ? `Apply to ${selectedCount} selected users` : 'Select users using their checkboxes first'}
            className="min-h-8 rounded-lg bg-brand-blue px-2 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-blue disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply{selectedCount ? ` (${selectedCount})` : ''}
          </button>
          {selectedCount > 0 && <button
            type="button" disabled={disabled} onClick={onClearSelection}
            aria-label="Clear user selection" title="Clear user selection"
            className="rounded p-1.5 text-gray-500 hover:bg-gray-100 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50"
          >
            <X size={14} />
          </button>}
    </div>
  );
};

export const OcrAppliedAssignments = ({ groups, onChange, disabled }) => groups.length > 0 ? (
        <div className="flex w-full flex-wrap gap-1.5" aria-label="Applied assignments">
          {groups.map((group, index) => (
            <div key={group.id} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-700">
              <span className="min-w-0 break-words">{[group.gender, group.nationality].filter(Boolean).join(' · ')} · {group.entryIds.length} {group.entryIds.length === 1 ? 'user' : 'users'}</span>
              <button
                type="button" disabled={disabled} aria-label={`Remove assignment group ${index + 1}`}
                onClick={() => onChange(groups.filter((item) => item.id !== group.id))}
                title="Remove this assignment" className="shrink-0 rounded p-0.5 text-blue-500 transition-colors hover:text-red-600 focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      ) : null;
