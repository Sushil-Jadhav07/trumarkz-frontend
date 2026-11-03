import { CustomSelect } from '@/components/ui/CustomSelect';
import { useIndustryTypes } from '@/hooks/useIndustryTypes';
import { industrySelectOptions } from '@/utils/industryTypes';

// A labelled industry picker fed by the backend list for `entityType`. The saved value stays
// selectable even when it is no longer on the list, so a form that resends it still saves.
export const IndustrySelect = ({
  label = 'Industry Type', entityType = 'organization', value, onChange, disabled, error, dense = false, placeholder = 'Select an industry',
}) => {
  const { names, loading } = useIndustryTypes(entityType);
  return (
    <div>
      {label && (
        <label className={`block font-medium text-brand-dark font-inter mb-1.5 ${dense ? 'text-xs' : 'text-sm'}`}>{label}</label>
      )}
      <CustomSelect
        value={value || ''}
        onChange={onChange}
        options={industrySelectOptions(names, value)}
        placeholder={loading ? 'Loading industries…' : placeholder}
        ariaLabel={label || 'Industry'}
        disabled={disabled}
        searchable
        searchPlaceholder="Search industries…"
        className="[&>button]:h-11 [&>button]:bg-[#f3f6fb] [&>button]:border-[#e1e7f0] [&>button]:text-[13px] [&>button]:font-medium"
      />
      {error && <p className="mt-1 text-xs text-red-500 font-inter">{error}</p>}
    </div>
  );
};

export default IndustrySelect;
