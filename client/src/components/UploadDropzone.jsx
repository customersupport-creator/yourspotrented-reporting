import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

/**
 * Drag-and-drop CSV upload supporting MULTIPLE files. Accepted files are passed
 * up via onFiles and accumulated by the parent; rejected files are surfaced
 * inline. Shows a loading state while previews are in flight.
 */
export default function UploadDropzone({ onFiles, status, maxMb = 5 }) {
  const onDrop = useCallback(
    (accepted) => {
      if (accepted?.length) onFiles(accepted);
    },
    [onFiles]
  );

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    multiple: true,
    maxSize: maxMb * 1024 * 1024,
  });

  const busy = status === 'previewing';

  return (
    <div>
      <div
        {...getRootProps()}
        className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition cursor-pointer
          ${isDragActive ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-500'}`}
      >
        <input {...getInputProps()} />
        <svg className="mb-3 h-10 w-10 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 16.5V9m0 0l-3 3m3-3l3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
        </svg>
        {busy ? (
          <p className="text-sm text-slate-500">Reading CSV files…</p>
        ) : isDragActive ? (
          <p className="font-medium text-brand-700">Drop the CSV files here…</p>
        ) : (
          <>
            <p className="font-medium text-slate-700">
              Drag &amp; drop one or more CSVs here, or <span className="text-brand-600 underline">browse</span>
            </p>
            <p className="mt-1 text-xs text-slate-400">.csv only · up to {maxMb} MB each · multiple files combined into one report</p>
          </>
        )}
      </div>

      {fileRejections?.length > 0 && (
        <p className="mt-2 text-sm text-red-600">
          {fileRejections[0].errors[0]?.message || 'File rejected. Use .csv files under the size limit.'}
        </p>
      )}
    </div>
  );
}
