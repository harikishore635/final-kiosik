import React, { useEffect, useMemo, useRef, useState } from 'react';
import { QrCode, CheckCircle, Smartphone, Copy, X, RefreshCw } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { supabase } from '../utils/supabaseClient';
import FilePreviewModal from './FilePreviewModal';
import { RadiantLoader, UploadRing } from './loading';
import { sleep } from '../utils/mockDelay';

const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/**
 * QR Code based document upload — replaces traditional file upload on kiosk.
 * Shows a QR code that links to a mobile upload page.
 * User scans from their phone, uploads files, and kiosk receives confirmation.
 */
const QRUpload = ({
  label,
  onUploadComplete,
  uploadId,
  maxFiles = 5,
  disabled = false,
  required = false,
  className = '',
}) => {
  const [showQR, setShowQR] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('idle'); // idle | waiting | complete | error
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [sessionInfo, setSessionInfo] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const urlInputRef = useRef(null);
  const [previewFile, setPreviewFile] = useState(null);
  const [finalizeProgress, setFinalizeProgress] = useState(0);
  const onUploadCompleteRef = useRef(onUploadComplete);

  const sessionId = sessionInfo?.sessionId;
  const uploadUrl = sessionInfo?.uploadUrl;
  const kioskPin = sessionInfo?.pin;

  const handleShowQR = () => {
    setShowQR(true);
    setUploadStatus('waiting');
    setErrorMessage('');
    setFinalizeProgress(0);

    const sid = uploadId || `UP-${Date.now().toString(36).toUpperCase()}`;
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    // PIN is encoded in the QR URL so the phone skips manual entry — same
    // person who can scan the QR already sees the PIN on screen.
    const uploadUrl = `${window.location.origin}/mobile-upload/${sid}?p=${btoa(pin)}`;
    setSessionInfo({ sessionId: sid, pin, uploadUrl });
  };

  const handleRegenerate = () => {
    setSessionInfo(null);
    setUploadStatus('waiting');
    setFinalizeProgress(0);
    handleShowQR();
  };

  const handleCopyUrl = async () => {
    if (!uploadUrl) return;
    try {
      await navigator.clipboard?.writeText(uploadUrl);
    } catch {
      if (urlInputRef.current) {
        urlInputRef.current.select();
        document.execCommand('copy');
      }
    }
  };

  const resolvePreviewUrl = (file) => {
    if (!file) return null;
    if (file.publicUrl) return file.publicUrl;
    if (!file.url) return null;

    const safeRelativePath = file.url
      .split('/')
      .map((part, idx) => (idx === 0 && part === '' ? '' : encodeURIComponent(part)))
      .join('/');

    const baseCandidates = [
      uploadUrl,
      import.meta.env.VITE_API_PUBLIC_BASE_URL,
      window.location.origin,
    ].filter(Boolean);

    for (const base of baseCandidates) {
      try {
        const origin = new URL(base, window.location.origin).origin;
        return new URL(safeRelativePath, origin).toString();
      } catch {
        // Continue trying other base candidates
      }
    }

    return null;
  };

  const handleRemoveFile = (index) => {
    const updated = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updated);
    if (onUploadComplete) {
      onUploadComplete(updated);
    }
    if (updated.length === 0) {
      setUploadStatus('idle');
    }
  };

  useEffect(() => {
    onUploadCompleteRef.current = onUploadComplete;
  }, [onUploadComplete]);

  useEffect(() => {
    if (!showQR || uploadStatus !== 'waiting' || !sessionId) return undefined;
    if (!supabase) {
      setErrorMessage('Supabase not configured — uploads unavailable.');
      return undefined;
    }

    let isActive = true;
    let isFinalizing = false;
    const poll = async () => {
      if (isFinalizing) return;
      try {
        const { data: storageFiles, error } = await supabase.storage
          .from('uploads')
          .list(sessionId);

        if (!isActive) return;
        if (error) { setErrorMessage('Waiting for upload...'); return; }

        const real = (storageFiles || []).filter(f => f.name !== '.emptyFolderPlaceholder');
        if (real.length > 0) {
          const files = real.map(f => ({
            name: f.name,
            size: formatFileSize(f.metadata?.size),
            url: `${sessionId}/${f.name}`,
            publicUrl: supabase.storage.from('uploads').getPublicUrl(`${sessionId}/${f.name}`).data.publicUrl,
          }));
          isFinalizing = true;
          clearInterval(interval);
          setFinalizeProgress(0);
          setUploadStatus('finalizing');
          const steps = 12;
          for (let i = 1; i <= steps; i++) {
            // eslint-disable-next-line no-await-in-loop
            await sleep(60);
            if (!isActive) return;
            setFinalizeProgress(i / steps);
          }
          setUploadedFiles(files);
          setUploadStatus('complete');
          if (onUploadCompleteRef.current) onUploadCompleteRef.current(files);
        }
      } catch {
        if (isActive) setErrorMessage('Waiting for upload...');
      }
    };

    const interval = setInterval(poll, 3000);
    poll();

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [showQR, sessionId]);

  const formattedPin = useMemo(() => {
    if (!kioskPin) return '';
    return kioskPin.toString().replace(/(\d{3})(\d{3})/, '$1 $2');
  }, [kioskPin]);

  return (
    <>
      <div className={`${className}`}>
      {label && (
        <label className="block text-kiosk-base font-semibold text-gray-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Upload Status */}
      {uploadStatus === 'complete' && uploadedFiles.length > 0 ? (
        <div className="border-2 border-green-300 bg-green-50 rounded-xl p-4">
          <div className="flex items-center space-x-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-semibold text-green-700">
              {uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''} uploaded via phone
            </span>
          </div>
          <div className="space-y-2">
            {uploadedFiles.map((file, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-green-200">
                <div className="flex items-center space-x-2">
                  <Smartphone className="w-4 h-4 text-green-600" />
                  {file.url ? (
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewFile({
                          ...file,
                          previewUrl: resolvePreviewUrl(file),
                        });
                      }}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {file.name}
                    </button>
                  ) : (
                    <span className="text-sm text-gray-700">{file.name}</span>
                  )}
                  <span className="text-xs text-gray-400">{file.size}</span>
                </div>
                <button onClick={() => handleRemoveFile(i)} className="text-gray-400 hover:text-red-500">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <button
            onClick={() => { setShowQR(false); setUploadStatus('idle'); setUploadedFiles([]); setSessionInfo(null); }}
            className="mt-3 text-sm text-blue-600 hover:underline"
          >
            Upload different files
          </button>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
          {!showQR ? (
            <>
              <QrCode className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-kiosk-base text-gray-600 mb-2">
                Scan QR code from your phone to upload documents
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Supported: PDF, JPG, PNG only · Max 5 MB each · Up to {maxFiles} files
              </p>
              <button
                onClick={handleShowQR}
                disabled={disabled}
                className="inline-flex items-center space-x-2 px-6 py-3 bg-government-blue text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors disabled:opacity-50"
              >
                <QrCode className="w-5 h-5" />
                <span>Show QR Code</span>
              </button>
            </>
          ) : uploadStatus === 'waiting' ? (
            <div className="space-y-4">
              {uploadUrl && (
                <div className="inline-block p-4 bg-white rounded-xl border-4 border-gray-800">
                  <QRCodeCanvas value={uploadUrl} size={200} includeMargin />
                </div>
              )}

              <p className="text-sm text-gray-500">Scan this QR code with your phone camera</p>

              {kioskPin && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
                  <p className="text-xs text-blue-700">Enter this PIN on your phone</p>
                  <p className="text-2xl font-bold tracking-widest text-blue-900 mt-1">{formattedPin}</p>
                </div>
              )}
              
              {/* Upload URL for manual entry */}
              {uploadUrl && (
                <div className="flex items-center justify-center space-x-2 bg-gray-100 rounded-lg px-3 py-2 max-w-xs mx-auto">
                  <input
                    ref={urlInputRef}
                    readOnly
                    value={uploadUrl}
                    onClick={() => urlInputRef.current?.select()}
                    className="text-xs text-gray-500 bg-transparent outline-none truncate w-44"
                  />
                  <button
                    onClick={handleCopyUrl}
                    className="text-gray-400 hover:text-gray-600"
                    title="Copy link"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                <RadiantLoader variant="sweep" size={32} />
                <span className="text-sm text-blue-600 font-medium">Waiting for upload from phone...</span>
              </div>

              {errorMessage && (
                <div className="text-xs text-gray-500">{errorMessage}</div>
              )}

              <div className="flex items-center justify-center gap-4">
                <button
                  onClick={handleRegenerate}
                  className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  New QR
                </button>
                <button
                  onClick={() => { setShowQR(false); setUploadStatus('idle'); setSessionInfo(null); }}
                  className="text-sm text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : uploadStatus === 'finalizing' ? (
            <div className="flex flex-col items-center py-2">
              <UploadRing progress={finalizeProgress} filename={null} loadedLabel="Finalizing upload…" />
            </div>
          ) : uploadStatus === 'error' ? (
            <div className="space-y-3">
              <div className="text-sm text-red-600">{errorMessage || 'Upload session failed.'}</div>
              <button
                onClick={handleShowQR}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-government-blue text-white rounded-lg"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Try again</span>
              </button>
            </div>
          ) : null}
        </div>
      )}
      </div>
      <FilePreviewModal file={previewFile} isOpen={Boolean(previewFile)} onClose={() => setPreviewFile(null)} />
    </>
  );
};

export default QRUpload;
