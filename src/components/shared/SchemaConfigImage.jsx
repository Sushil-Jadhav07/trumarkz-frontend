import { useEffect, useRef, useState } from 'react';
import { ImagePlus, Image as ImageIcon, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { adminAPI, getApiError } from '@/services/api';
import { schemaImageProblem } from '@/utils/partialSdc';

// The image on a schema configuration (the design of its label, e.g. a Driving Licence card).
// image_url needs the bearer token, so the image is fetched as a blob and shown through an object URL
// (a plain <img src> would 401). `config.image_url` carries ?v=<timestamp>, used here as a cache key.
export const useSchemaConfigImage = (orgId, config) => {
  const [url, setUrl] = useState('');
  const key = `${config?.id}|${config?.image_updated_at || config?.image_url || ''}`;
  const hasImage = !!(config?.image_url || config?.image_updated_at);

  useEffect(() => {
    if (!orgId || !config?.id || !hasImage) { setUrl(''); return undefined; }
    let active = true;
    let objectUrl = '';
    adminAPI.getSchemaConfigImage(orgId, config.id)
      .then(({ data }) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(data);
        setUrl(objectUrl);
      })
      .catch(() => { if (active) setUrl(''); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId, key, hasImage]);

  return url;
};

// Thumbnail only (organization and SuperAdmin view). Renders nothing when the config has no image.
export const SchemaConfigThumb = ({ orgId, config, className = 'h-14 w-20' }) => {
  const url = useSchemaConfigImage(orgId, config);
  if (!url) return null;
  return <img src={url} alt={`${config.label} design`} className={`shrink-0 rounded-lg border border-gray-100 object-cover ${className}`} />;
};

// Picker for SuperAdmin and the owning organization: choose a PNG / JPEG / WebP (5 MB), preview it, then upload. Only active configurations.
export const SchemaConfigImagePicker = ({ orgId, config, onUploaded }) => {
  const current = useSchemaConfigImage(orgId, config);
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [problem, setProblem] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const pick = (event) => {
    const next = event.target.files?.[0] || null;
    event.target.value = '';
    if (!next) return;
    const message = schemaImageProblem(next);
    setProblem(message);
    if (message) { setFile(null); setPreview(''); return; }
    setFile(next);
    setPreview(URL.createObjectURL(next));
  };

  const cancel = () => { setFile(null); setPreview(''); setProblem(''); };

  const upload = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setProblem('');
    try {
      const { data } = await adminAPI.uploadSchemaConfigImage(orgId, config.id, file);
      toast.success(`Image saved for "${config.label}"`);
      cancel();
      onUploaded?.(data);
    } catch (err) {
      // The backend checks the real file content; show its own message (SVG, GIF, renamed files...).
      setProblem(getApiError(err, 'The image could not be uploaded.'));
    } finally {
      setUploading(false);
    }
  };

  const shown = preview || current;
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-gray-200 bg-gray-50">
        {shown ? <img src={shown} alt={preview ? 'Selected image preview' : `${config.label} design`} className="h-full w-full object-cover" /> : <ImageIcon size={20} className="text-gray-300" />}
      </div>
      <div className="min-w-0 flex-1">
        <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={pick} className="sr-only" aria-label={`Choose an image for ${config.label}`} />
        {file ? (
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={upload} disabled={uploading} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand-blue px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60 font-inter">
              {uploading ? <RefreshCw size={13} className="animate-spin" /> : <ImagePlus size={13} />} {problem ? 'Retry upload' : 'Save image'}
            </button>
            <button type="button" onClick={cancel} disabled={uploading} className="text-xs font-medium text-gray-500 hover:text-brand-dark font-inter">Cancel</button>
            <span className="truncate text-[11px] text-gray-500 font-inter">{file.name}</span>
          </div>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-brand-blue hover:bg-blue-50 font-inter">
            <ImagePlus size={13} /> {current ? 'Replace image' : 'Add image'}
          </button>
        )}
        <p className="mt-1 text-[11px] text-gray-500 font-inter">PNG, JPEG or WebP, up to 5 MB. It shows the design of this schema’s label.</p>
        {problem && <p role="alert" className="mt-1 text-[11px] text-red-600 font-inter">{problem}</p>}
      </div>
    </div>
  );
};
