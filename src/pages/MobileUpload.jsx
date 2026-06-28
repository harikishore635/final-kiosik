import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Camera, Image as ImageIcon, FileText, XCircle, Upload, ShieldCheck } from 'lucide-react';
import { uploadPublicAPI } from '../utils/apiService';
import { validateUploadSecurity } from '../utils/security';
import { useDelayedLoader } from '../hooks/useDelayedLoader';
import { ButtonSpinner } from '../components/loading';

const MAX_FILES = 5;

const formatSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MobileUpload = () => {
  const { sessionId } = useParams();
  const [pin, setPin] = useState('');
  const [pinVerified, setPinVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const isDisabled = useMemo(() => !pinVerified || uploading, [pinVerified, uploading]);
  const showUploadSpinner = useDelayedLoader(uploading);

  const handleVerifyPin = async () => {
    setVerifyError('');
    setIsVerifying(true);
    try {
      await uploadPublicAPI.verifyPin(sessionId, pin.trim());
      setPinVerified(true);
    } catch (error) {
      setVerifyError(error?.error || 'Invalid PIN. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const addFiles = (selectedFiles) => {
    setUploadError('');
    const incoming = Array.from(selectedFiles || []);
    if (incoming.length === 0) return;
    const availableSlots = MAX_FILES - files.length;
    if (availableSlots <= 0) {
      setUploadError(`Maximum ${MAX_FILES} files allowed.`);
      return;
    }
    const next = [];
    for (const file of incoming.slice(0, availableSlots)) {
      const validation = validateUploadSecurity(file);
      if (!validation.isValid) {
        setUploadError(validation.errors[0] || 'Invalid file.');
        continue;
      }
      next.push(file);
    }
    if (next.length > 0) setFiles((prev) => [...prev, ...next]);
  };

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index));

  const handleUpload = async () => {
    if (files.length === 0) { setUploadError('Select at least one file to upload.'); return; }
    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      formData.append('pin', pin.trim());
      const response = await uploadPublicAPI.uploadFiles(sessionId, formData);
      setUploadedFiles(response.files || []);
      setFiles([]);
    } catch (error) {
      setUploadError(error?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (!sessionId) {
    return (
      <div style={s.page}>
        <div style={s.header}><HeaderContent /></div>
        <div style={s.card}>
          <p style={{ color: '#dc2626', fontWeight: 600 }}>Invalid upload link.</p>
          <p style={{ color: '#6b7280', fontSize: 14, marginTop: 8 }}>Please rescan the QR code from the kiosk.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.header}>
        <HeaderContent />
      </div>

      <div style={s.body}>
        {uploadedFiles.length > 0 ? (
          <div style={{ ...s.card, borderColor: '#16a34a', background: '#f0fdf4' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <CheckCircle size={24} color="#16a34a" />
              <span style={{ fontWeight: 700, color: '#15803d', fontSize: 18 }}>Upload Complete!</span>
            </div>
            <p style={{ color: '#166534', fontSize: 14, marginBottom: 12 }}>
              Your files have been sent to the kiosk. You may close this page.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {uploadedFiles.map((file, i) => (
                <div key={i} style={s.fileRow}>
                  <FileText size={16} color="#16a34a" />
                  <span style={{ fontSize: 13, color: '#166534', flex: 1 }}>{file.name}</span>
                  <span style={{ fontSize: 12, color: '#4ade80' }}>{file.size}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Step 1 — PIN */}
            <div style={{ ...s.card, opacity: pinVerified ? 0.5 : 1 }}>
              <div style={s.stepLabel}>
                <span style={s.stepBadge}>{pinVerified ? '✓' : '1'}</span>
                <span style={s.stepTitle}>Enter Kiosk PIN</span>
              </div>
              {!pinVerified ? (
                <>
                  <p style={s.hint}>Enter the 6-digit PIN shown on the kiosk screen.</p>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={6}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    style={s.pinInput}
                    placeholder="• • • • • •"
                    autoFocus
                  />
                  {verifyError && <p style={s.error}>{verifyError}</p>}
                  <button
                    type="button"
                    onClick={handleVerifyPin}
                    disabled={isVerifying || pin.trim().length !== 6}
                    style={{ ...s.btnPrimary, opacity: (isVerifying || pin.trim().length !== 6) ? 0.5 : 1 }}
                  >
                    {isVerifying ? 'Verifying…' : 'Verify PIN'}
                  </button>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#16a34a' }}>
                  <CheckCircle size={18} />
                  <span style={{ fontSize: 14, fontWeight: 600 }}>PIN verified</span>
                </div>
              )}
            </div>

            {/* Step 2 — Select files */}
            {pinVerified && (
              <div style={s.card}>
                <div style={s.stepLabel}>
                  <span style={s.stepBadge}>2</span>
                  <span style={s.stepTitle}>Select Files to Upload</span>
                </div>
                <p style={s.hint}>PDF · JPG · PNG only · Max 5 MB per file · Up to {MAX_FILES} files</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                  <FilePickerBtn
                    icon={<Camera size={20} color="#1d4ed8" />}
                    label="Take a Photo"
                    accept="image/jpeg,image/png"
                    capture="environment"
                    disabled={isDisabled}
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <FilePickerBtn
                    icon={<ImageIcon size={20} color="#1d4ed8" />}
                    label="Choose from Gallery (JPG / PNG)"
                    accept="image/jpeg,image/png"
                    multiple
                    disabled={isDisabled}
                    onChange={(e) => addFiles(e.target.files)}
                  />
                  <FilePickerBtn
                    icon={<FileText size={20} color="#1d4ed8" />}
                    label="Upload PDF Document"
                    accept="application/pdf"
                    multiple
                    disabled={isDisabled}
                    onChange={(e) => addFiles(e.target.files)}
                  />
                </div>

                {uploadError && <p style={s.error}>{uploadError}</p>}

                {files.length > 0 && (
                  <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {files.map((file, index) => (
                      <div key={`${file.name}-${index}`} style={s.fileRow}>
                        <FileText size={15} color="#6b7280" />
                        <span style={{ fontSize: 13, color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {file.name}
                        </span>
                        <span style={{ fontSize: 12, color: '#9ca3af', marginRight: 8 }}>{formatSize(file.size)}</span>
                        <button type="button" onClick={() => removeFile(index)} style={s.removeBtn}>
                          <XCircle size={18} color="#ef4444" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={isDisabled || files.length === 0}
                  style={{ ...s.btnPrimary, marginTop: 16, opacity: (isDisabled || files.length === 0) ? 0.45 : 1 }}
                >
                  {showUploadSpinner
                    ? <><ButtonSpinner variant="primary" /> Uploading…</>
                    : <><Upload size={18} /> Upload to Kiosk ({files.length} file{files.length !== 1 ? 's' : ''})</>
                  }
                </button>
              </div>
            )}
          </>
        )}

        <div style={s.securityNote}>
          <ShieldCheck size={14} color="#6b7280" />
          <span style={{ fontSize: 12, color: '#6b7280' }}>Secured by SUVIDHA · Files encrypted in transit</span>
        </div>
      </div>
    </div>
  );
};

function HeaderContent() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
          🇮🇳
        </div>
        <span style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: 2 }}>SUVIDHA</span>
      </div>
      <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>Government of Assam · Secure Document Upload</span>
    </div>
  );
}

function FilePickerBtn({ icon, label, accept, capture, multiple, disabled, onChange }) {
  return (
    <label style={{ ...s.filePickerBtn, opacity: disabled ? 0.5 : 1, cursor: disabled ? 'not-allowed' : 'pointer' }}>
      {icon}
      <span style={{ fontSize: 14, fontWeight: 500, color: '#1e3a5f' }}>{label}</span>
      <input
        type="file"
        accept={accept}
        capture={capture}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        style={{ display: 'none' }}
        onChange={onChange}
      />
    </label>
  );
}

const s = {
  page: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 60%, #2563eb 100%)',
    boxShadow: '0 4px 16px rgba(30,58,138,0.3)',
  },
  body: {
    flex: 1,
    padding: '20px 16px 32px',
    maxWidth: 480,
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  card: {
    background: 'white',
    borderRadius: 16,
    border: '1.5px solid #e2e8f0',
    padding: '20px 16px',
    marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
  },
  stepLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: '#1e3a8a',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 700,
    flexShrink: 0,
  },
  stepTitle: {
    fontWeight: 700,
    fontSize: 16,
    color: '#1e293b',
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
    lineHeight: 1.5,
  },
  pinInput: {
    width: '100%',
    border: '2px solid #cbd5e1',
    borderRadius: 12,
    padding: '14px 0',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 14,
    textAlign: 'center',
    outline: 'none',
    boxSizing: 'border-box',
    color: '#1e3a8a',
  },
  btnPrimary: {
    width: '100%',
    background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
    color: 'white',
    border: 'none',
    borderRadius: 12,
    padding: '14px 0',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    boxShadow: '0 4px 12px rgba(37,99,235,0.3)',
  },
  filePickerBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    border: '1.5px solid #dbeafe',
    borderRadius: 12,
    padding: '14px 16px',
    background: '#eff6ff',
    transition: 'background 0.15s',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid #e2e8f0',
    borderRadius: 10,
    padding: '10px 12px',
    background: '#f8fafc',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 8,
    fontWeight: 500,
  },
  securityNote: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
};

export default MobileUpload;
