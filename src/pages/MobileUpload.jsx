import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle, Camera, Image as ImageIcon, FileText, XCircle } from 'lucide-react';
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
  // Real network upload with variable latency — gate the spinner so a fast
  // response (<300ms) never flashes it.
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

    if (next.length > 0) {
      setFiles((prev) => [...prev, ...next]);
    }
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError('Select at least one file to upload.');
      return;
    }

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
      <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 px-5 py-8">
        <div className="max-w-md mx-auto bg-white rounded-xl border p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Invalid upload link</h1>
          <p className="text-sm text-gray-600">Please rescan the QR code from the kiosk.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-blue-50 px-5 py-8">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Secure Upload</h1>
        <p className="text-sm text-gray-600 mb-6">
          Enter the 6-digit PIN shown on the kiosk, then upload your files.
        </p>

        {!pinVerified && (
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Kiosk PIN</label>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              className="w-full border rounded-lg px-4 py-3 text-lg tracking-widest text-center"
              placeholder="------"
            />
            {verifyError && (
              <p className="text-sm text-red-600 mt-2">{verifyError}</p>
            )}
            <button
              type="button"
              onClick={handleVerifyPin}
              disabled={isVerifying || pin.trim().length !== 6}
              className="mt-4 w-full bg-government-blue text-white py-3 rounded-lg font-semibold disabled:opacity-50"
            >
              {isVerifying ? 'Verifying...' : 'Verify PIN'}
            </button>
          </div>
        )}

        {pinVerified && (
          <div className="bg-white rounded-xl shadow-sm border p-4 mb-6">
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <CheckCircle className="w-5 h-5" />
              <span className="text-sm font-semibold">PIN verified</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${isDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                <ImageIcon className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Choose from gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isDisabled}
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>

              <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${isDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                <Camera className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Take a photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  disabled={isDisabled}
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>

              <label className={`flex items-center gap-3 border rounded-lg px-4 py-3 ${isDisabled ? 'opacity-50' : 'cursor-pointer'}`}>
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium">Upload a document (PDF/DOC)</span>
                <input
                  type="file"
                  accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  multiple
                  disabled={isDisabled}
                  className="hidden"
                  onChange={(e) => addFiles(e.target.files)}
                />
              </label>
            </div>

            {uploadError && (
              <p className="text-sm text-red-600 mt-3">{uploadError}</p>
            )}

            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div key={`${file.name}-${index}`} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800 truncate max-w-[220px]">{file.name}</p>
                      <p className="text-xs text-gray-500">{formatSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500"
                    >
                      <XCircle className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={handleUpload}
              disabled={isDisabled || files.length === 0}
              className="mt-4 w-full bg-government-blue text-white py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {showUploadSpinner && <ButtonSpinner variant="primary" />}
              {uploading ? 'Uploading...' : 'Upload to kiosk'}
            </button>
          </div>
        )}

        {uploadedFiles.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-2">
              <CheckCircle className="w-5 h-5" />
              <span className="font-semibold">Upload complete</span>
            </div>
            <p className="text-sm text-green-700">
              Your files have been sent to the kiosk. You can close this page.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-green-800">
              {uploadedFiles.map((file, index) => (
                <li key={`${file.name}-${index}`}>{file.name} ({file.size})</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileUpload;
