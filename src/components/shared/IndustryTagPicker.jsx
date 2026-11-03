import { X } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { useIndustryTypes } from '@/hooks/useIndustryTypes';

// Industry tags for a verification type, chosen from the backend list that matches the type's
// category (human -> Human list, product / warranty -> Product list). Tags the type already has
// stay and can be removed, even when they are not on the list any more.
export const IndustryTagPicker = ({ entityType, tags, onChange, disabled, label = 'Industry Types', labelClassName = '' }) => {
  const { names, loading } = useIndustryTypes(entityType);
  const known = new Set(names.map((name) => name.toLowerCase()));
  const chosen = new Set(tags.map((tag) => tag.toLowerCase()));
  const available = names.filter((name) => !chosen.has(name.toLowerCase()));

  return (
    <div>
      <label className={labelClassName}>{label}</label>
      <div className="mb-2 flex min-h-[28px] flex-wrap items-center gap-1.5">
        {tags.length === 0 && <span className="text-xs text-gray-400 font-inter">No industries selected</span>}
        {tags.map((tag) => {
          const stale = !loading && !known.has(tag.toLowerCase());
          return (
            <span
              key={tag}
              title={stale ? `Not on the current ${entityType} industry list. It can stay or be removed.` : undefined}
              className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-inter ${
                stale ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-blue-100 bg-blue-50 text-brand-blue'
              }`}
            >
              {tag}
              <button
                type="button"
                aria-label={`Remove ${tag}`}
                disabled={disabled}
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                className="transition-colors hover:text-red-500 disabled:opacity-50"
              ><X size={10} /></button>
            </span>
          );
        })}
      </div>
      <CustomSelect
        value=""
        onChange={(name) => { if (name && !chosen.has(name.toLowerCase())) onChange([...tags, name]); }}
        options={available.map((name) => ({ value: name, label: name }))}
        placeholder={loading ? 'Loading industries…' : available.length ? 'Add an industry…' : 'All industries added'}
        ariaLabel={`Add ${entityType} industry`}
        disabled={disabled || loading || available.length === 0}
        searchable
        searchPlaceholder="Search industries…"
        className="[&>button]:py-2.5 [&>button]:text-sm [&>button]:font-medium"
      />
    </div>
  );
};

export default IndustryTagPicker;
