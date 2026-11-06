import { AlertTriangle, Info, X } from 'lucide-react';
import { groupSchemaWarnings, outputMapSource } from '@/utils/partialSdc';

// Mapping notes from the server, shown inline and never as pop-ups (handoff C): amber warnings first,
// grey information after. A save with warnings is still a successful save.
export const SchemaWarningsList = ({ details, plain, title, onDismiss, className = '' }) => {
  const { warning, info } = groupSchemaWarnings(details, plain);
  if (!warning.length && !info.length) return null;
  const Row = ({ row }) => (
    <li className={`flex items-start gap-2 rounded-lg px-3 py-2 text-xs font-inter ${row.severity === 'warning' ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-700'}`}>
      {row.severity === 'warning' ? <AlertTriangle size={13} className="mt-0.5 shrink-0" /> : <Info size={13} className="mt-0.5 shrink-0 text-gray-500" />}
      <span className="min-w-0">
        <span className="font-semibold">{row.title}</span>
        {row.message ? ` — ${row.message}` : ''}
        {row.fields.length > 0 && <span className="mt-0.5 block font-mono text-[11px] opacity-90">{row.fields.join(', ')}</span>}
      </span>
    </li>
  );
  return (
    <div role="status" className={`rounded-xl border border-gray-100 bg-white p-3 ${className}`}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-xs font-semibold text-brand-dark font-inter">{title || 'Saved. Notes about this configuration (nothing was blocked):'}</p>
        {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss notes" className="text-gray-400 hover:text-gray-700"><X size={14} /></button>}
      </div>
      <ul className="space-y-1.5">
        {warning.map((row, i) => <Row key={`w${i}`} row={row} />)}
        {info.map((row, i) => <Row key={`i${i}`} row={row} />)}
      </ul>
    </div>
  );
};

// What the stored Dhiway schema means for a configuration: the fields that reach the certificate and each
// output_map entry with an Automatic / Manual badge (config.output_map_sources).
export const SchemaDerivedInfo = ({ config }) => {
  const properties = Array.isArray(config?.dhiway_schema_properties) ? config.dhiway_schema_properties : [];
  const required = new Set(Array.isArray(config?.dhiway_schema_required) ? config.dhiway_schema_required : []);
  const outputs = Object.entries(config?.output_map || {});
  if (!properties.length && !outputs.length) {
    return <p className="text-[11px] text-gray-500 font-inter">No Dhiway schema is stored, so the built-in certificate layout is used.</p>;
  }
  return (
    <div className="grid gap-2 md:grid-cols-2">
      {properties.length > 0 && (
        <div className="rounded-lg border border-gray-100 bg-gray-50/50">
          <p className="border-b border-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Fields on the certificate</p>
          <ul className="flex flex-wrap gap-1.5 p-2.5">
            {properties.map((name) => (
              <li key={name} className="rounded-md bg-white px-2 py-0.5 font-mono text-[11px] text-brand-dark ring-1 ring-gray-200">
                {name}{required.has(name) && <span title="Required by the Dhiway schema" className="ml-1 font-sans font-semibold text-red-500">*</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {outputs.length > 0 && (
        <div className="rounded-lg border border-gray-100 bg-gray-50/50">
          <p className="border-b border-gray-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">Output mapping</p>
          <ul className="divide-y divide-gray-100">
            {outputs.map(([key, column]) => {
              const manual = outputMapSource(config, key) === 'manual';
              return (
                <li key={key} className="flex flex-wrap items-center gap-2 px-2.5 py-1.5 text-[11px] font-inter">
                  <span className="font-semibold text-brand-dark">{key}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono text-brand-dark">{String(column)}</span>
                  <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${manual ? 'bg-blue-50 text-brand-blue' : 'bg-green-50 text-green-700'}`}>{manual ? 'Manual' : 'Automatic'}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};
