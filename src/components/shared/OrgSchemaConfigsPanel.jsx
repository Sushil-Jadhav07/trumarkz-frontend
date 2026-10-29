import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Star, RefreshCw, Lock, Pencil, EyeOff, ChevronDown, ChevronUp, Braces } from 'lucide-react';
import toast from 'react-hot-toast';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { adminAPI, getApiError } from '@/services/api';
import {
  SCHEMA_SPACE_TYPE_OPTIONS, SCHEMA_SEMANTIC_FIELDS,
  emptySchemaConfigForm, configToForm,
  rowsToMap, HUMAN_SCHEMA_VARIANT, schemaConfigJsonToForm,
  schemaConfigBlockingErrors, schemaConfigMappingWarnings, RECOMMENDED_INPUT_FIELDS, duplicateLabelError,
  classifyJsonBox, exampleRecordJson, buildSchemaConfigPayload, setInputMapping,
} from '@/utils/schemaConfig';

// Dynamic organization-specific schema registry (org_schema_configs) — see
// "Dynamic Schema change.md". A separate, additive system from the legacy
// Dhiway Spaces editor (dhiways_details/setDhiwayDefault) shown elsewhere on
// this same page — the two coexist and are never merged.
//
// `isSuperAdminViewer` controls the one permission rule this UI needs to
// enforce itself (the backend enforces it too, this is just so a disabled
// action isn't a surprise 403): an organization viewer cannot edit/version/
// set-default/deactivate a config whose created_by_role is "super_admin".
export const OrgSchemaConfigsPanel = ({ orgId, isSuperAdminViewer = false }) => {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const [formOpen, setFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null); // null = create new; else "new version of this"
  const [form, setForm] = useState(emptySchemaConfigForm());
  const [submitting, setSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState([]);

  const [labelServerError, setLabelServerError] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState([]);

  const resetJson = (text = '') => { setJsonText(text); setJsonErrors([]); setLabelServerError(''); };

  const [actingId, setActingId] = useState(null); // config id currently being set-default/deactivated

  const load = () => {
    if (!orgId) return;
    setLoading(true);
    adminAPI.getSchemaConfigs(orgId, { activeOnly: !showInactive })
      .then(({ data }) => setConfigs(Array.isArray(data?.configs) ? data.configs : []))
      .catch((err) => toast.error(getApiError(err, 'Failed to load schema configurations')))
      .finally(() => setLoading(false));
  };

  useEffect(load, [orgId, showInactive]);

  const grouped = useMemo(() => {
    const groups = { human: [], product: [], warranty: [] };
    configs.forEach((c) => { if (groups[c.space_type]) groups[c.space_type].push(c); });
    return groups;
  }, [configs]);

  const canManage = (config) => isSuperAdminViewer || config?.created_by_role !== 'super_admin';

  const openCreate = (spaceType) => {
    setEditingConfig(null);
    setForm(emptySchemaConfigForm(spaceType));
    setFormErrors([]);
    resetJson();
    setFormOpen(true);
  };

  const openVersion = (config) => {
    setEditingConfig(config);
    setForm(configToForm(config));
    setFormErrors([]);
    // Its current mappings show in the mapping list; the box starts empty for a fresh sample record.
    resetJson('');
    setFormOpen(true);
  };

  const handleSetDefault = async (config) => {
    if (actingId) return;
    setActingId(config.id);
    try {
      await adminAPI.setSchemaConfigDefault(orgId, config.id);
      toast.success(`"${config.label}" is now the default ${config.space_type} schema`);
      load();
    } catch (err) {
      const status = err?.response?.status;
      toast.error(status === 409 ? getApiError(err, 'That configuration is deactivated and cannot be set as default') : getApiError(err, 'Failed to set default'));
    } finally {
      setActingId(null);
    }
  };

  const handleDeactivate = async (config) => {
    if (actingId) return;
    if (!window.confirm(`Deactivate "${config.label}"? It will no longer be selectable for new batches — existing batches that already used it are unaffected.`)) return;
    setActingId(config.id);
    try {
      await adminAPI.deactivateSchemaConfig(orgId, config.id);
      toast.success(`"${config.label}" deactivated`);
      load();
    } catch (err) {
      toast.error(getApiError(err, 'Failed to deactivate'));
    } finally {
      setActingId(null);
    }
  };

  const updateForm = (patch) => setForm((f) => ({ ...f, ...patch }));

  // The box takes a sample record (any shape — only read here to list its fields) or, as before,
  // a configuration JSON. Re-read on every keystroke so the field list and mapping options stay live.
  const box = classifyJsonBox(jsonText);
  const discovery = box.kind === 'sample' ? box.discovery : null;

  const applyConfigJson = () => {
    const result = schemaConfigJsonToForm(jsonText, form, { lockSpaceType: !!editingConfig });
    if (result.errors) {
      setJsonErrors(result.errors);
      return;
    }
    setForm(result.form);
    setFormErrors([]);
    resetJson('');
    toast.success('Configuration JSON applied');
  };

  const insertExample = () => {
    if (jsonText.trim() && !window.confirm('Replace what is in the JSON box with an example record?')) return;
    resetJson(exampleRecordJson(form.space_type));
  };

  const setMapping = (semantic, source) =>
    setForm((f) => ({ ...f, input_map: setInputMapping(f.input_map, semantic, source) }));

  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const labelClash = duplicateLabelError(form.label, form.space_type, configs, editingConfig?.id);
  const labelError = labelServerError || labelClash;
  const currentInputs = rowsToMap(form.input_map);
  const semanticFields = SCHEMA_SEMANTIC_FIELDS[form.space_type] || [];
  const recommended = RECOMMENDED_INPUT_FIELDS[form.space_type] || [];
  const blockingErrors = schemaConfigBlockingErrors(form);
  const mappingWarnings = schemaConfigMappingWarnings(form);
  const keptLocalFields = form.local_fields.filter((f) => f.name?.trim()).length;
  const keptOutputs = Object.keys(rowsToMap(form.output_map)).length;

  const mappingOptions = (semantic) => {
    const current = currentInputs[semantic];
    const sourceKeys = discovery ? discovery.mappableKeys : [];
    const options = [{ value: '', label: 'Not mapped' }, ...sourceKeys.map((k) => ({ value: k, label: k }))];
    if (current && !sourceKeys.includes(current)) {
      options.push({ value: current, label: discovery ? `${current} (current — not in this sample)` : `${current} (current)` });
    }
    return options;
  };

  const showWarnings = (warnings) => {
    if (!warnings?.length) return;
    toast(
      <div className="space-y-1">
        <p className="text-xs font-semibold text-brand-dark">Saved with {warnings.length === 1 ? 'a warning' : `${warnings.length} warnings`}</p>
        <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-gray-600">
          {warnings.map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      </div>,
      { icon: '⚠️', duration: 8000 },
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Only genuinely invalid input stops the save. A sample record is never sent — the API has no
    // field for it — so it can't block anything once it parses.
    if (box.kind === 'invalid') {
      setJsonErrors([`${box.error} — fix it, or clear the box`]);
      return;
    }
    let current = form;
    if (box.kind === 'config') {
      const result = schemaConfigJsonToForm(jsonText, form, { lockSpaceType: !!editingConfig });
      if (result.errors) {
        setJsonErrors(result.errors);
        return;
      }
      current = result.form;
      setForm(current);
      resetJson('');
    }

    if (!current.schema_id.trim() || !current.space_id.trim() || !current.label.trim()) {
      setFormErrors(['Schema ID, Space ID, and Label are all required']);
      return;
    }
    if (duplicateLabelError(current.label, current.space_type, configs, editingConfig?.id)) {
      setFormErrors([]);
      return; // already shown under the Label field
    }
    const blocking = schemaConfigBlockingErrors(current);
    if (blocking.length) {
      setFormErrors(blocking);
      return;
    }

    const payload = buildSchemaConfigPayload(current);

    setSubmitting(true);
    setFormErrors([]);
    try {
      if (editingConfig) {
        const { data } = await adminAPI.createSchemaConfigVersion(orgId, editingConfig.id, payload);
        showWarnings(data?.warnings);
        toast.success(`New version saved for "${payload.label}"`);
      } else {
        const { data } = await adminAPI.createSchemaConfig(orgId, payload);
        showWarnings(data?.warnings);
        toast.success(`"${payload.label}" registered`);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      const status = err?.response?.status;
      if (status === 400) {
        const errors = err?.response?.data?.errors || [getApiError(err, 'Invalid schema configuration')];
        // Duplicate-label rejections belong on the Label field, verbatim; everything else stays in the list.
        const labelErrors = errors.filter((m) => /schema named/i.test(m));
        setLabelServerError(labelErrors[0] || '');
        setFormErrors(errors.filter((m) => !labelErrors.includes(m)));
      } else if (status === 409) {
        // Two races land here: a concurrent default-set, or a concurrent save with the same label.
        // Reloading lets the live label check see whatever just won; retrying once is safe.
        toast.error(getApiError(err, 'Another save just happened for this organization — try again'));
        load();
      } else {
        toast.error(getApiError(err, 'Failed to save schema configuration'));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-brand-dark font-inter">Schema Configurations</p>
          <p className="mt-0.5 text-xs text-gray-400 font-inter">
            Use the organization's own Dhiway schema(s) and field names instead of the default layout. Optional — leave empty to keep using the default layout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowInactive((s) => !s)}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold font-inter text-gray-500 hover:bg-gray-50"
        >
          <EyeOff size={12} /> {showInactive ? 'Hide deactivated' : 'Show deactivated'}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8"><RefreshCw size={18} className="animate-spin text-brand-blue" /></div>
      ) : (
        SCHEMA_SPACE_TYPE_OPTIONS.map(({ value: spaceType, label: spaceLabel }) => {
          const list = grouped[spaceType] || [];
          const isCollapsed = !!collapsed[spaceType];
          return (
            <div key={spaceType} className="rounded-xl border border-gray-200 overflow-hidden">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [spaceType]: !c[spaceType] }))}
                className="flex w-full items-center justify-between gap-2 bg-gray-50/70 px-3.5 py-2.5"
              >
                <span className="flex items-center gap-2 text-xs font-semibold font-inter text-brand-dark">
                  {spaceLabel}
                  <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-600">{list.length}</span>
                </span>
                {isCollapsed ? <ChevronDown size={14} className="text-gray-400" /> : <ChevronUp size={14} className="text-gray-400" />}
              </button>
              {!isCollapsed && (
                <div className="divide-y divide-gray-100 bg-white">
                  {list.length === 0 ? (
                    <p className="px-3.5 py-3 text-xs text-gray-400 font-inter">No {spaceLabel.toLowerCase()} schema configured — using the default layout.</p>
                  ) : (
                    list.map((config) => {
                      const locked = !canManage(config);
                      return (
                        <div key={config.id} className="flex flex-wrap items-center gap-2 px-3.5 py-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="truncate text-sm font-semibold text-brand-dark font-inter">{config.label}</span>
                              <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">v{config.version}</span>
                              {config.is_default && <Badge status="info">Default</Badge>}
                              {!config.is_active && <Badge status="default">Deactivated</Badge>}
                              {locked && (
                                <span title="Managed by SuperAdmin — the organization cannot edit this" className="flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600">
                                  <Lock size={10} /> SuperAdmin-managed
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 truncate text-[11px] text-gray-400 font-inter">
                              schema_id: {config.schema_id} · space_id: {config.space_id}
                              {config.schema_variant ? ` · ${config.schema_variant}` : ''}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            {config.is_active && !config.is_default && (
                              <button
                                type="button" disabled={locked || actingId === config.id}
                                onClick={() => handleSetDefault(config)}
                                title="Set as default"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-amber-200 hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                              >
                                {actingId === config.id ? <RefreshCw size={13} className="animate-spin" /> : <Star size={13} />}
                              </button>
                            )}
                            <button
                              type="button" disabled={locked}
                              onClick={() => openVersion(config)}
                              title="Edit (creates a new version)"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-brand-blue hover:bg-blue-50 hover:text-brand-blue disabled:opacity-40"
                            >
                              <Pencil size={13} />
                            </button>
                            {config.is_active && (
                              <button
                                type="button" disabled={locked || actingId === config.id}
                                onClick={() => handleDeactivate(config)}
                                title="Deactivate"
                                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div className="px-3.5 py-2.5">
                    <button
                      type="button"
                      onClick={() => openCreate(spaceType)}
                      className="flex items-center gap-1.5 text-xs font-semibold font-inter text-brand-blue hover:underline"
                    >
                      <Plus size={13} /> Register a {spaceLabel.toLowerCase()} schema
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => !submitting && setFormOpen(false)}
        title={editingConfig ? `Edit "${editingConfig.label}" (new version)` : 'Register Schema Configuration'}
        description="The schema_id and space_id must already exist on Dhiway — this only registers them here, it never creates anything on Dhiway itself."
        size="2xl"
        onSubmit={handleSubmit}
        formId="schema-config-form"
      >
        <div className="space-y-4">
          {formErrors.length > 0 && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3">
              {formErrors.map((e, i) => <p key={i} className="text-xs text-red-600 font-inter">{e}</p>)}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-brand-dark font-inter mb-1.5">Entity Type</label>
              <CustomSelect
                value={form.space_type}
                onChange={(v) => updateForm({ space_type: v, schema_variant: v === 'human' ? HUMAN_SCHEMA_VARIANT : '', input_map: [], output_map: [] })}
                options={SCHEMA_SPACE_TYPE_OPTIONS}
                disabled={!!editingConfig}
                ariaLabel="Entity type"
              />
            </div>
            {form.space_type === 'human' && (
              <div>
                <label className="block text-xs font-medium text-brand-dark font-inter mb-1.5">Schema Variant</label>
                <CustomSelect
                  value={HUMAN_SCHEMA_VARIANT}
                  onChange={() => {}}
                  options={[{ value: HUMAN_SCHEMA_VARIANT, label: 'Human 5-QR' }]}
                  ariaLabel="Human schema variant"
                />
              </div>
            )}
          </div>

          <Input
            label="Label"
            placeholder="e.g. Acme Corp Default Human Schema"
            value={form.label}
            error={labelError}
            onChange={(e) => { setLabelServerError(''); updateForm({ label: e.target.value }); }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Dhiway Schema ID" value={form.schema_id} onChange={(e) => updateForm({ schema_id: e.target.value })} />
            <Input label="Dhiway Space ID" value={form.space_id} onChange={(e) => updateForm({ space_id: e.target.value })} />
          </div>

          <div>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <label htmlFor="schema-config-json" className="flex items-center gap-1.5 text-xs font-medium text-brand-dark font-inter">
                  <Braces size={13} className="text-brand-blue" /> Sample record JSON
                </label>
                <p className="mt-0.5 text-[11px] text-gray-400 font-inter">
                  Paste one record (or an array of records) exactly as your organization sends it — any field names, nesting
                  or types. It is only read here to list its fields; it is not saved.
                </p>
              </div>
              <button
                type="button"
                onClick={insertExample}
                className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-blue font-inter hover:bg-blue-50"
              >
                Insert example
              </button>
            </div>
            <textarea
              id="schema-config-json"
              value={jsonText}
              onChange={(e) => { setJsonText(e.target.value); if (jsonErrors.length) setJsonErrors([]); }}
              placeholder="Paste a sample record here"
              rows={8}
              spellCheck={false}
              className="mt-2 w-full resize-y rounded-xl border border-gray-200 bg-gray-50/60 p-3 font-mono text-[11px] leading-relaxed text-brand-dark outline-none placeholder:font-inter placeholder:text-gray-400 focus:border-brand-blue focus:bg-white"
            />

            {(jsonErrors.length > 0 || box.kind === 'invalid') && (
              <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2">
                {(jsonErrors.length ? jsonErrors : [box.error]).map((e, i) => (
                  <p key={i} className="text-[11px] text-red-600 font-inter">{e}</p>
                ))}
              </div>
            )}

            {box.kind === 'config' && (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50/60 px-2.5 py-2">
                <p className="text-[11px] text-brand-dark font-inter">
                  This looks like a configuration JSON (local_fields / input_map / output_map), not a sample record.
                </p>
                <button type="button" onClick={applyConfigJson} className="rounded-lg bg-brand-blue px-3 py-1.5 text-[11px] font-semibold text-white font-inter hover:bg-blue-700">
                  Apply configuration
                </button>
              </div>
            )}

            {discovery && (
              <div className="mt-2 rounded-lg border border-gray-100 bg-white">
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-2.5 py-1.5">
                  <p className="text-[11px] font-semibold text-brand-dark font-inter">
                    {plural(discovery.fields.length, 'field')} found in {plural(discovery.records, 'record')}
                  </p>
                  {jsonText && (
                    <button type="button" onClick={() => resetJson('')} className="text-[11px] font-semibold text-gray-500 font-inter hover:text-brand-dark">
                      Clear
                    </button>
                  )}
                </div>
                {discovery.duplicates.length > 0 && (
                  <p className="border-b border-amber-100 bg-amber-50 px-2.5 py-1.5 text-[11px] text-amber-700 font-inter">
                    Repeated key{discovery.duplicates.length === 1 ? '' : 's'} in the sample: {discovery.duplicates.join(', ')} — each is listed once.
                  </p>
                )}
                <ul className="max-h-44 divide-y divide-gray-50 overflow-y-auto">
                  {discovery.fields.map((f) => (
                    <li key={f.path} className="flex items-center gap-2 px-2.5 py-1 text-[11px] font-inter" style={{ paddingLeft: 10 + (f.depth - 1) * 12 }}>
                      <span className="min-w-0 flex-1 truncate font-mono text-brand-dark" title={f.path}>{f.path}</span>
                      <span className="shrink-0 text-gray-400">{f.types.join(' | ')}</span>
                      {f.mappable
                        ? <span className="shrink-0 rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">mappable</span>
                        : <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">{f.note}</span>}
                    </li>
                  ))}
                </ul>
                <p className="border-t border-gray-100 px-2.5 py-1.5 text-[11px] text-gray-400 font-inter">
                  Only top-level fields holding a plain value can be mapped — the configuration API stores one source field
                  name per mapping and has no nested-path format.
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-medium text-brand-dark font-inter">Input mapping</p>
            <p className="mt-0.5 mb-2 text-[11px] text-gray-400 font-inter">
              Which of your fields feeds each {form.space_type} field at upload time.
              {discovery ? ' Choose from the fields found in your sample.' : ' Paste a sample record above to choose from its fields.'}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {semanticFields.map((semantic) => (
                <div key={semantic} className="flex items-center gap-2">
                  <span className="w-[120px] shrink-0 truncate text-[11px] font-medium text-brand-dark font-inter" title={semantic}>
                    {semantic}
                    {recommended.includes(semantic) && <span className="ml-1 text-amber-500" title="Recommended">•</span>}
                  </span>
                  <CustomSelect
                    value={currentInputs[semantic] || ''}
                    onChange={(v) => setMapping(semantic, v)}
                    options={mappingOptions(semantic)}
                    searchable={mappingOptions(semantic).length > 8}
                    searchPlaceholder="Search your fields…"
                    ariaLabel={`Source field for ${semantic}`}
                    className="min-w-0 flex-1 [&>button]:h-9 [&>button]:text-xs"
                  />
                </div>
              ))}
            </div>

            {blockingErrors.length > 0 && (
              <div className="mt-2 rounded-lg border border-red-100 bg-red-50 px-2.5 py-2">
                {blockingErrors.map((e, i) => <p key={i} className="text-[11px] text-red-600 font-inter">{e}</p>)}
              </div>
            )}
            {mappingWarnings.length > 0 && (
              <div className="mt-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-2">
                <p className="text-[11px] font-semibold text-amber-700 font-inter">You can still save — these are warnings, not errors:</p>
                {mappingWarnings.map((w, i) => <p key={i} className="text-[11px] text-amber-700 font-inter">{w}</p>)}
              </div>
            )}

            <p className="mt-2 text-[11px] text-gray-500 font-inter">
              Output mapping: {keptOutputs ? `${plural(keptOutputs, 'field')} kept` : 'none — records use the default Dhiway field names'}
              {' · '}Local fields: {keptLocalFields ? `${keptLocalFields} kept` : 'none'}.
              {' '}These are never guessed from a sample; set them by pasting a configuration JSON.
            </p>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-brand-dark font-inter">
            <input type="checkbox" checked={form.is_default} onChange={(e) => updateForm({ is_default: e.target.checked })} className="h-4 w-4 accent-blue-600" />
            Make this the default {form.space_type} schema for this organization
          </label>
        </div>

        <Modal.Footer className="flex justify-end gap-2">
          <button type="button" onClick={() => setFormOpen(false)} disabled={submitting} className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 font-inter hover:bg-gray-50 disabled:opacity-50">Cancel</button>
          <button type="submit" form="schema-config-form" disabled={submitting} className="rounded-xl bg-brand-blue px-4 py-2.5 text-sm font-medium text-white font-inter hover:bg-blue-700 disabled:opacity-60">
            {submitting ? 'Saving…' : editingConfig ? 'Save New Version' : 'Register'}
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default OrgSchemaConfigsPanel;
