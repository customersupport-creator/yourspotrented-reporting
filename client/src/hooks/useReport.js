import { useCallback, useEffect, useState } from 'react';
import { getDefaultConfig, previewCsv, generateReport } from '../api/client.js';
import { autoMapHeaders } from '../utils/autoMap.js';

/**
 * State machine for the multi-file upload -> map -> generate flow.
 * status: 'idle' | 'previewing' | 'ready' | 'generating' | 'done' | 'error'
 *
 * `files` is an array — multiple CSVs can be attached in one session and are
 * combined server-side. Re-previews the whole set whenever it changes so the
 * mapping panel reflects the union of all headers.
 */
export function useReport() {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(null); // { headers, rowCount, fileCount, perFile, warnings }
  const [config, setConfig] = useState(null);
  const [sections, setSections] = useState([]);
  const [report, setReport] = useState(null);
  const [remit, setRemit] = useState(null); // manual Net Remit breakdown (6 fields)

  useEffect(() => {
    getDefaultConfig()
      .then(({ config: cfg, sections: secs }) => {
        setConfig(cfg);
        setSections(secs);
      })
      .catch((e) => setError(e.message));
  }, []);

  const dedupe = (list) => {
    const seen = new Set();
    return list.filter((f) => {
      const key = `${f.name}:${f.size}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  // Re-preview an explicit file set and refresh the auto-mapping.
  const refreshPreview = useCallback(async (nextFiles) => {
    setError(null);
    setErrorDetails(null);
    setReport(null);
    if (nextFiles.length === 0) {
      setPreview(null);
      setStatus('idle');
      return;
    }
    setStatus('previewing');
    try {
      const p = await previewCsv(nextFiles);
      setPreview(p);
      // Non-destructive auto-map: only FILL fields that aren't already mapped to
      // a column present in the upload. Never override a working mapping (default
      // or admin-set), so columns like Towing/expense categories stay put.
      setConfig((prev) => {
        const base = prev || {};
        const current = base.columnMap || {};
        const headerSet = new Set(p.headers);
        const auto = autoMapHeaders(p.headers, current).columnMap;
        const merged = { ...current };
        for (const [field, header] of Object.entries(auto)) {
          const cur = merged[field];
          if (cur && headerSet.has(cur)) continue; // keep existing valid mapping
          if (header) merged[field] = header; // otherwise fill the gap
        }
        return { ...base, columnMap: merged };
      });
      setStatus('ready');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  const addFiles = useCallback(
    (incoming) => {
      setFiles((prev) => {
        const next = dedupe([...prev, ...incoming]);
        refreshPreview(next);
        return next;
      });
    },
    [refreshPreview]
  );

  const removeFile = useCallback(
    (name, size) => {
      setFiles((prev) => {
        const next = prev.filter((f) => !(f.name === name && f.size === size));
        refreshPreview(next);
        return next;
      });
    },
    [refreshPreview]
  );

  const generate = useCallback(async () => {
    if (files.length === 0) return;
    setError(null);
    setErrorDetails(null);
    setStatus('generating');
    try {
      const r = await generateReport(files, config);
      setReport(r);
      setStatus('done');
    } catch (e) {
      setError(e.message);
      setErrorDetails(e.details || null);
      setStatus('error');
    }
  }, [files, config]);

  const reset = useCallback(() => {
    setFiles([]);
    setPreview(null);
    setReport(null);
    setRemit(null);
    setError(null);
    setErrorDetails(null);
    setStatus('idle');
  }, []);

  return {
    status,
    error,
    errorDetails,
    files,
    preview,
    config,
    setConfig,
    sections,
    report,
    remit,
    setRemit,
    addFiles,
    removeFile,
    generate,
    reset,
  };
}
