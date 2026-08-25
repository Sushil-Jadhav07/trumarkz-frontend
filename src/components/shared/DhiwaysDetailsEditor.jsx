import React, { useState } from 'react';
import { Plus, Trash2, Star, RefreshCw } from 'lucide-react';
import { DHIWAY_SPACE_TYPE_OPTIONS, normalizeDhiwaySpaceType } from '@/utils/dhiway';

// Editable list of { space_id, schema_id, space_type, default } rows. The
// backend stores them under `dhiways_details`. `space_type` is optional for
// legacy human rows, but explicit typed rows should be used for human /
// product / warranty isolation.
//
// `onSetDefault`, if provided, is called as `onSetDefault(row)` and is
// expected to hit POST /auth/dhiway/set-default and resolve/reject. This
// component only shows a per-row spinner while that request is pending.
export const DhiwaysDetailsEditor = ({ value = [], onChange, disabled, onSetDefault }) => {
  const [settingIndex, setSettingIndex] = useState(null);

  const updateRow = (index, key, val) => {
    onChange(value.map((row, i) => (i === index ? { ...row, [key]: val } : row)));
  };

  const addRow = () =>
    onChange([
      ...value,
      {
        space_id: '',
        schema_id: '',
        space_type: 'human',
        default: value.length === 0,
      },
    ]);

  const removeRow = (index) => onChange(value.filter((_, i) => i !== index));

  const handleSetDefault = async (index, row) => {
    if (!onSetDefault || row.default || settingIndex !== null) return;
    setSettingIndex(index);
    try {
      await onSetDefault(row);
      onChange(value.map((r, i) => ({ ...r, default: i === index })));
    } finally {
      setSettingIndex(null);
    }
  };

  return (
    <div className="space-y-2">
      {value.map((row, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            value={row.space_id || ''}
            onChange={(e) => updateRow(i, 'space_id', e.target.value)}
            disabled={disabled}
            placeholder="Space ID"
            className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm font-inter text-brand-dark bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
          />
          <input
            value={row.schema_id || ''}
            onChange={(e) => updateRow(i, 'schema_id', e.target.value)}
            disabled={disabled}
            placeholder="Schema ID"
            className="flex-1 h-9 rounded-lg border border-gray-200 px-3 text-sm font-inter text-brand-dark bg-white disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
          />
          <select
            value={normalizeDhiwaySpaceType(row.space_type)}
            onChange={(e) => updateRow(i, 'space_type', e.target.value)}
            disabled={disabled}
            title="Which flow (human / product / warranty) this space is used for"
            className="h-9 shrink-0 rounded-lg border border-gray-200 bg-white px-2 text-sm font-inter text-brand-dark disabled:bg-gray-50 disabled:text-gray-500 focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
          >
            {DHIWAY_SPACE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value || 'legacy'} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {onSetDefault &&
            (row.default ? (
              <span
                title="Default configuration"
                className="shrink-0 flex items-center gap-1 px-2 h-9 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold font-inter"
              >
                <Star size={12} className="fill-current" /> Default
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSetDefault(i, row)}
                disabled={disabled || settingIndex !== null || !row.space_id || !row.schema_id}
                title="Set as default"
                className="shrink-0 flex items-center gap-1 px-2 h-9 rounded-lg border border-gray-200 text-gray-400 text-xs font-semibold font-inter hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50 disabled:opacity-50 transition-colors"
              >
                {settingIndex === i ? <RefreshCw size={12} className="animate-spin" /> : <Star size={12} />}
              </button>
            ))}

          <button
            type="button"
            onClick={() => removeRow(i)}
            disabled={disabled}
            title="Remove"
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addRow}
        disabled={disabled}
        className="flex items-center gap-1.5 text-xs font-semibold font-inter text-brand-blue hover:underline disabled:opacity-50"
      >
        <Plus size={13} /> Add Dhiway Space
      </button>
    </div>
  );
};

export default DhiwaysDetailsEditor;
