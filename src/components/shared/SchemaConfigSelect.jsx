import { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { adminAPI } from '@/services/api';
import { SchemaConfigThumb } from '@/components/shared/SchemaConfigImage';

// Optional "which configured schema should this batch use" picker — see
// "Dynamic Schema change.md" §J. Renders nothing at all when the
// organization has no active configuration for this space_type (never an
// empty dropdown), and auto-selects the org's current default the first
// time configs load for a given spaceType, so simply not touching it keeps
// the previous (default/legacy) behavior exactly as before this feature.
// `value`/`onChange` are the plain `label` string — or '' for "use default",
// matching the `schema_name` the batch-creation call expects verbatim.
// `onConfigChange(config | null)` reports the full selected configuration (its input_map/aliases),
// so an upload page can recognise the org's own column names the way the server will.
export const SchemaConfigSelect = ({ orgId, spaceType, value, onChange, onConfigChange, disabled }) => {
  const [configs, setConfigs] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!onConfigChange) return;
    onConfigChange((value && configs.find((c) => c.label === value)) || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configs, value]);

  useEffect(() => {
    if (!orgId || !spaceType) return;
    let active = true;
    setLoaded(false);
    adminAPI.getSchemaConfigs(orgId, { spaceType, activeOnly: true })
      .then(({ data }) => {
        if (!active) return;
        const list = Array.isArray(data?.configs) ? data.configs : [];
        setConfigs(list);
        // A label picked for another space_type (e.g. product -> warranty) would be rejected with a 400,
        // so anything not in this type's active list falls back to its default, or to none.
        const defaultConfig = list.find((c) => c.is_default);
        const stillValid = value && list.some((c) => c.label === value);
        if (!stillValid) onChange(defaultConfig ? defaultConfig.label : '');
      })
      .catch(() => {
        if (!active) return;
        setConfigs([]);
        if (value) onChange('');
      })
      .finally(() => { if (active) setLoaded(true); });
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, spaceType]);

  if (!loaded || configs.length === 0) return null;

  // With at least one schema image the choices are shown as cards (image + label); otherwise the dropdown.
  const withImages = configs.some((c) => c.image_url || c.image_updated_at);

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-brand-dark font-inter">
        <Layers size={12} className="text-gray-400" /> Schema
      </label>
      {withImages ? (
        <div role="radiogroup" aria-label="Schema configuration for this batch" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {configs.map((c) => {
            const on = c.label === value;
            return (
              <button
                key={c.id || c.label}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange(c.label)}
                className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition-colors disabled:opacity-60 ${on ? 'border-brand-blue bg-[#f1f6fe] ring-1 ring-brand-blue/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              >
                <SchemaConfigThumb orgId={orgId} config={c} className="h-14 w-20" />
                {!(c.image_url || c.image_updated_at) && <span className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-gray-50 text-gray-300"><Layers size={18} /></span>}
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-brand-dark font-inter">{c.label}</span>
                  {c.is_default && <span className="text-[11px] font-medium text-brand-blue font-inter">Default</span>}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
      <CustomSelect
        value={value || ''}
        onChange={onChange}
        disabled={disabled}
        ariaLabel="Schema configuration for this batch"
        options={configs.map((c) => ({ value: c.label, label: `${c.label}${c.is_default ? ' (Default)' : ''}` }))}
        // Only shown when nothing is selected, which only happens when there is no default schema:
        // the batch then uses the standard layout, not "the organization default".
        placeholder="None — standard layout"
      />
      )}
    </div>
  );
};

export default SchemaConfigSelect;
