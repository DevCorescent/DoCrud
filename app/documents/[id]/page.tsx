'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Copy, Download, MessageSquare, Share2 } from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import {
  CollaborationComment,
  DataCollectionStatus,
  DocumentField,
  RecipientAccessLevel,
  SubmittedDocument,
} from '@/types/document';
import RichTextEditor from '@/components/RichTextEditor';

interface SharedDocumentPayload {
  id: string;
  shareId?: string;
  templateName: string;
  referenceNumber?: string;
  generatedAt: string;
  requiresPassword?: boolean;
  passwordValidated?: boolean;
  previewHtml?: string;
  templateFields?: DocumentField[];
  data?: Record<string, string>;
  recipientAccess?: RecipientAccessLevel;
  dataCollectionEnabled?: boolean;
  dataCollectionStatus?: DataCollectionStatus;
  dataCollectionInstructions?: string;
  dataCollectionSubmittedAt?: string;
  dataCollectionSubmittedBy?: string;
  dataCollectionReviewNotes?: string;
  dataCollectionReviewedAt?: string;
  dataCollectionReviewedBy?: string;
  requiredDocumentWorkflowEnabled?: boolean;
  requiredDocuments?: string[];
  submittedDocuments?: SubmittedDocument[];
  documentsVerificationStatus?: 'not_required' | 'pending' | 'verified' | 'rejected';
  documentsVerificationNotes?: string;
  recipientSignatureRequired?: boolean;
  recipientSignerName?: string;
  recipientSignedAt?: string;
  recipientSignedIp?: string;
  recipientSignatureSource?: 'drawn' | 'uploaded';
  recipientSignedLocationLabel?: string;
  recipientSignedLatitude?: number;
  recipientSignedLongitude?: number;
  recipientSignedAccuracyMeters?: number;
  hasRecipientSignature?: boolean;
  collaborationComments?: CollaborationComment[];
}

interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  label: string;
  capturedAt: string;
}

const sanitizeEditorHtml = (value: string) =>
  value
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+="[^"]*"/gi, '')
    .replace(/\son[a-z]+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');

export default function SharedDocumentPage() {
  const params = useParams<{ id: string }>();
  const routeId = Array.isArray(params?.id) ? params.id[0] : params?.id || '';
  const [documentData, setDocumentData] = useState<SharedDocumentPayload | null>(null);
  const [password, setPassword] = useState('');
  const [signerName, setSignerName] = useState('');
  const [signatureDataUrl, setSignatureDataUrl] = useState('');
  const [signatureSource, setSignatureSource] = useState<'drawn' | 'uploaded'>('drawn');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSigning, setIsSigning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [commentType, setCommentType] = useState<'comment' | 'review'>('comment');
  const [commentMessage, setCommentMessage] = useState('');
  const [isSavingComment, setIsSavingComment] = useState(false);
  const [editableData, setEditableData] = useState<Record<string, string>>({});
  const [isSavingEdits, setIsSavingEdits] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [documentExpanded, setDocumentExpanded] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [submitterName, setSubmitterName] = useState('');
  const [documentUploads, setDocumentUploads] = useState<Record<string, SubmittedDocument | null>>({});
  const [isSubmittingDocuments, setIsSubmittingDocuments] = useState(false);
  const [clientLocation, setClientLocation] = useState<CapturedLocation | null>(null);
  const [isCapturingLocation, setIsCapturingLocation] = useState(false);

  const loadDocument = useCallback(async (passwordValue?: string, options?: { showLoading?: boolean; successMessage?: string }) => {
    if (!routeId) {
      setErrorMessage('Invalid document link.');
      setIsUnlocked(false);
      return null;
    }

    const shouldShowLoading = options?.showLoading ?? true;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 12000);

    try {
      if (shouldShowLoading) {
        setIsLoading(true);
      }

      const search = passwordValue ? `?password=${encodeURIComponent(passwordValue.trim().toUpperCase())}` : '';
      const response = await fetch(`/api/public/documents/${routeId}${search}`, {
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to load document');
      }

      setDocumentData(payload);
      setEditableData(payload?.data || {});
      setIsUnlocked(Boolean(payload?.passwordValidated));

      if (payload?.passwordValidated) {
        setErrorMessage('');
        if (options?.successMessage) {
          setSuccessMessage(options.successMessage);
        }
      }

      return payload;
    } catch (error) {
      const message = error instanceof DOMException && error.name === 'AbortError'
        ? 'This document is taking too long to open. Please retry in a moment.'
        : error instanceof Error
          ? error.message
          : 'Failed to load document';
      setErrorMessage(message);
      setSuccessMessage('');
      setIsUnlocked(false);
      return null;
    } finally {
      window.clearTimeout(timeoutId);
      if (shouldShowLoading) {
        setIsLoading(false);
      }
    }
  }, [routeId]);

  useEffect(() => {
    void loadDocument(undefined, { showLoading: false });
  }, [loadDocument]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const sharePassword = documentData?.recipientSignatureRequired ? password : '';

  const copyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setSuccessMessage('Document link copied.');
    setErrorMessage('');
  };

  const shareDocument = async () => {
    if (!shareUrl) return;
    const text = `Review this docrud document${sharePassword ? `\nSigning password: ${sharePassword}` : ''}`;
    if (navigator.share) {
      await navigator.share({
        title: documentData?.templateName || 'docrud Document',
        text,
        url: shareUrl,
      });
      return;
    }
    await copyLink();
  };

  const unlockDocument = async () => {
    try {
      setIsUnlocking(true);
      const payload = await loadDocument(password, {
        showLoading: false,
        successMessage: 'Document unlocked successfully.',
      });
      if (!payload?.passwordValidated) {
        throw new Error('Invalid document password');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to unlock document');
      setSuccessMessage('');
      setIsUnlocked(false);
    } finally {
      setIsUnlocking(false);
    }
  };

  const signDocument = async () => {
    if (!clientLocation) {
      setErrorMessage('Enable live location access before signing the document.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsSigning(true);
      const response = await fetch(`/api/public/documents/${params.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          signerName,
          signatureDataUrl,
          signatureSource,
          location: clientLocation,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to sign document');
      }
      setDocumentData({
        id: payload.id,
        shareId: payload.shareId,
        templateName: payload.templateName,
        referenceNumber: payload.referenceNumber,
        generatedAt: payload.generatedAt,
        previewHtml: payload.previewHtml,
        templateFields: payload.templateFields || documentData?.templateFields || [],
        data: payload.data || editableData,
        recipientAccess: payload.recipientAccess,
        requiredDocumentWorkflowEnabled: payload.requiredDocumentWorkflowEnabled,
        requiredDocuments: payload.requiredDocuments || [],
        submittedDocuments: payload.submittedDocuments || [],
        documentsVerificationStatus: payload.documentsVerificationStatus,
        documentsVerificationNotes: payload.documentsVerificationNotes,
        recipientSignatureRequired: payload.recipientSignatureRequired,
        recipientSignerName: payload.recipientSignerName,
        recipientSignedAt: payload.recipientSignedAt,
        recipientSignedIp: payload.recipientSignedIp,
        recipientSignatureSource: payload.recipientSignatureSource,
        recipientSignedLocationLabel: payload.recipientSignedLocationLabel,
        recipientSignedLatitude: payload.recipientSignedLatitude,
        recipientSignedLongitude: payload.recipientSignedLongitude,
        recipientSignedAccuracyMeters: payload.recipientSignedAccuracyMeters,
        hasRecipientSignature: Boolean(payload.recipientSignatureDataUrl),
        collaborationComments: payload.collaborationComments || documentData?.collaborationComments || [],
      });
      setSuccessMessage('Document signed successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to sign document');
      setSuccessMessage('');
    } finally {
      setIsSigning(false);
    }
  };

  const saveComment = async () => {
    try {
      setIsSavingComment(true);
      const response = await fetch(`/api/public/documents/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: commentType,
          message: commentMessage,
          authorName: reviewerName,
          password,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save feedback');
      }
      setDocumentData((prev) => prev ? { ...prev, collaborationComments: payload.collaborationComments || [] } : prev);
      setCommentMessage('');
      setSuccessMessage(`${commentType === 'review' ? 'Review' : 'Comment'} saved successfully.`);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save feedback');
      setSuccessMessage('');
    } finally {
      setIsSavingComment(false);
    }
  };

  const saveEdits = async () => {
    try {
      setIsSavingEdits(true);
      const response = await fetch(`/api/public/documents/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: editableData,
          reviewerName,
          password,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to save document updates');
      }
      setDocumentData((prev) => prev ? {
        ...prev,
        data: payload.data || editableData,
        previewHtml: payload.previewHtml || prev.previewHtml,
        dataCollectionEnabled: payload.dataCollectionEnabled ?? prev.dataCollectionEnabled,
        dataCollectionStatus: payload.dataCollectionStatus || prev.dataCollectionStatus,
        dataCollectionInstructions: payload.dataCollectionInstructions ?? prev.dataCollectionInstructions,
        dataCollectionSubmittedAt: payload.dataCollectionSubmittedAt || prev.dataCollectionSubmittedAt,
        dataCollectionSubmittedBy: payload.dataCollectionSubmittedBy || prev.dataCollectionSubmittedBy,
        dataCollectionReviewNotes: payload.dataCollectionReviewNotes ?? prev.dataCollectionReviewNotes,
        dataCollectionReviewedAt: payload.dataCollectionReviewedAt || prev.dataCollectionReviewedAt,
        dataCollectionReviewedBy: payload.dataCollectionReviewedBy || prev.dataCollectionReviewedBy,
        collaborationComments: payload.collaborationComments || prev.collaborationComments || [],
      } : prev);
      setSuccessMessage('Document updates saved successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save document updates');
      setSuccessMessage('');
    } finally {
      setIsSavingEdits(false);
    }
  };

  const downloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const response = await fetch(`/api/public/documents/${params.id}/pdf?password=${encodeURIComponent(password.trim().toUpperCase())}`);
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Failed to download PDF');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${documentData?.templateName || 'document'}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('PDF downloaded successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to download PDF');
      setSuccessMessage('');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const handleDocumentUpload = (label: string, file: File | null) => {
    if (!file) {
      setDocumentUploads((prev) => ({ ...prev, [label]: null }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDocumentUploads((prev) => ({
        ...prev,
        [label]: {
          id: `${label}-${Date.now()}`,
          label,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          dataUrl: String(reader.result || ''),
          uploadedAt: new Date().toISOString(),
        },
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSignatureUpload = (file: File | null) => {
    if (!file) {
      setSignatureDataUrl('');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSignatureSource('uploaded');
      setSignatureDataUrl(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
  };

  const captureLocation = async () => {
    if (!navigator.geolocation) {
      setErrorMessage('Location services are not supported in this browser. A live location is required to sign.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsCapturingLocation(true);
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        });
      });

      const nextLocation: CapturedLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyMeters: position.coords.accuracy,
        label: `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`,
        capturedAt: new Date().toISOString(),
      };
      setClientLocation(nextLocation);
      setSuccessMessage('Live location captured. You can now complete the signature step.');
      setErrorMessage('');
    } catch (error) {
      const message = typeof error === 'object' && error && 'code' in error
        ? 'Location access is mandatory. Please allow location permission and try again.'
        : 'Failed to capture live location. Please try again.';
      setErrorMessage(message);
      setSuccessMessage('');
      setClientLocation(null);
    } finally {
      setIsCapturingLocation(false);
    }
  };

  const submitRequiredDocuments = async () => {
    try {
      setIsSubmittingDocuments(true);
      const submittedDocuments = (documentData?.requiredDocuments || [])
        .map((label) => documentUploads[label])
        .filter(Boolean) as SubmittedDocument[];

      const response = await fetch(`/api/public/documents/${params.id}/requirements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          submitterName,
          submittedDocuments,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to submit required documents');
      }
      setDocumentData((prev) => prev ? {
        ...prev,
        submittedDocuments: payload.submittedDocuments || [],
        documentsVerificationStatus: payload.documentsVerificationStatus,
        documentsVerificationNotes: payload.documentsVerificationNotes,
      } : prev);
      setSuccessMessage('Required documents submitted successfully. Admin verification is now pending.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to submit required documents');
      setSuccessMessage('');
    } finally {
      setIsSubmittingDocuments(false);
    }
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100 p-3 md:p-6 xl:p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <Card className="rounded-3xl border-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <CardHeader>
            <div className="inline-flex w-fit items-center rounded-2xl bg-slate-950 px-4 py-2 text-xl font-black lowercase tracking-[0.12em] text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)]">
              docrud
            </div>
            <CardTitle className="text-2xl md:text-3xl">{documentData?.templateName || 'Shared Document'}</CardTitle>
            {documentData && (
              <>
                <p className="text-slate-500">Reference: {documentData.referenceNumber}</p>
                <p className="text-slate-500">Generated on {new Date(documentData.generatedAt).toLocaleString()}</p>
              </>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">{documentData?.dataCollectionEnabled ? 'Secure Data Collection' : 'Secure Signing'}</p>
                <p className="mt-3 text-sm text-slate-200">
                  {documentData?.dataCollectionEnabled
                    ? 'Complete the requested document form, submit your details securely, and the admin team will review and finalize the generated document.'
                    : 'Review the document, verify the password shared with you, and sign directly on this secure docrud page.'}
                </p>
              </div>
              <div className="min-w-0 rounded-3xl border bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Quick Actions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={() => void copyLink()}>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void shareDocument()}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  {isUnlocked && (
                    <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={isDownloadingPdf}>
                      <Download className="mr-2 h-4 w-4" />
                      {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {(errorMessage || successMessage) && (
              <div className="rounded-2xl border bg-slate-50 p-4">
                {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
                {successMessage && <p className="text-sm text-green-700">{successMessage}</p>}
              </div>
            )}

            {isLoading && (
              <div className="rounded-2xl border bg-white p-4 text-sm text-slate-500">
                Opening document...
              </div>
            )}

            {!isUnlocked && (
              <div className="rounded-2xl border bg-white p-4 md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Open Secure Document</h2>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Document Password</label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value.toUpperCase())} placeholder="Enter the autogenerated password" />
                  </div>
                  <Button onClick={() => void unlockDocument()} disabled={isUnlocking || !password.trim()}>
                    {isUnlocking ? 'Unlocking...' : 'Open Document'}
                  </Button>
                </div>
                <p className="mt-3 text-sm text-slate-500">
                  This link is password protected. The autogenerated password is available to your super admin and internal dashboard users.
                </p>
              </div>
            )}

            {isUnlocked && documentData?.previewHtml && (
              <div className="rounded-2xl border bg-white p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Document Preview</h2>
                    <p className="text-sm text-slate-500">Read the document before adding comments, reviews, edits, or signature.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setDocumentExpanded((prev) => !prev)}>
                    {documentExpanded ? 'Read Less' : 'Read More'}
                  </Button>
                </div>
                <iframe
                  title={documentData.templateName}
                  srcDoc={documentData.previewHtml}
                  className={`mt-4 w-full max-w-full rounded-3xl border border-slate-200 bg-white shadow-sm ${documentExpanded ? 'min-h-[90vh]' : 'h-[420px] sm:h-[520px]'}`}
                />
              </div>
            )}

            {isUnlocked && documentData?.requiredDocumentWorkflowEnabled && (
              <div className="rounded-2xl border bg-white p-4 md:p-6">
                <h2 className="mb-4 text-lg font-semibold text-slate-900">Required Document Submission</h2>
                <div className="rounded-2xl border bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-900">Verification status: {documentData.documentsVerificationStatus || 'pending'}</p>
                  {documentData.documentsVerificationNotes && <p className="mt-2 text-sm text-slate-600">Admin note: {documentData.documentsVerificationNotes}</p>}
                  {!!documentData.submittedDocuments?.length && (
                    <div className="mt-3 space-y-2">
                      {documentData.submittedDocuments.map((item) => (
                        <div key={item.id} className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-sm font-medium text-slate-900">{item.label}</p>
                          <p className="text-sm text-slate-500">{item.fileName}</p>
                          <p className="text-xs text-slate-400">Submitted {new Date(item.uploadedAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {(documentData.documentsVerificationStatus === 'pending' || documentData.documentsVerificationStatus === 'rejected' || !documentData.submittedDocuments?.length) && (
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Submitter Name</label>
                      <Input value={submitterName} onChange={(event) => setSubmitterName(event.target.value)} placeholder="Your full name" />
                    </div>
                    {(documentData.requiredDocuments || []).map((label) => (
                      <div key={label}>
                        <label className="mb-1 block text-sm font-medium">{label}</label>
                        <Input type="file" onChange={(event) => handleDocumentUpload(label, event.target.files?.[0] || null)} />
                        {documentUploads[label]?.fileName && <p className="mt-1 text-xs text-slate-500">Selected: {documentUploads[label]?.fileName}</p>}
                      </div>
                    ))}
                    <div className="flex justify-end">
                      <Button
                        onClick={() => void submitRequiredDocuments()}
                        disabled={
                          isSubmittingDocuments ||
                          !submitterName.trim() ||
                          (documentData.requiredDocuments || []).some((label) => !documentUploads[label])
                        }
                      >
                        {isSubmittingDocuments ? 'Submitting...' : 'Submit Documents'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {isUnlocked && documentData?.requiredDocumentWorkflowEnabled && documentData.documentsVerificationStatus !== 'verified' && (
              <div className="rounded-2xl border bg-amber-50 p-4 text-sm text-amber-900">
                Signing will be unlocked only after the admin verifies the submitted required documents.
              </div>
            )}

            {isUnlocked && documentData?.recipientSignatureRequired && !documentData.hasRecipientSignature && (!documentData.requiredDocumentWorkflowEnabled || documentData.documentsVerificationStatus === 'verified') && (
              <div className="rounded-2xl border bg-white p-4 md:p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">Recipient Signature Verification</h2>
                <div className="mb-4 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Live Location Capture</p>
                      <p className="text-sm text-slate-500">Location permission is mandatory. Signing stays locked until your current location is captured.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={isCapturingLocation}>
                      {isCapturingLocation ? 'Capturing Location...' : clientLocation ? 'Refresh Location' : 'Enable Location'}
                    </Button>
                  </div>
                  {clientLocation ? (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      Location captured at {new Date(clientLocation.capturedAt).toLocaleString()}: {clientLocation.label}
                      {clientLocation.accuracyMeters ? ` (accuracy approx. ${Math.round(clientLocation.accuracyMeters)} m)` : ''}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-amber-700">Allow location access in your browser to continue with signing.</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Signing Password</label>
                    <Input value={password} onChange={(e) => setPassword(e.target.value.toUpperCase())} placeholder="Enter password shared with you" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Signer Name</label>
                    <Input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="Your full name" />
                  </div>
                </div>
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant={signatureSource === 'drawn' ? 'default' : 'outline'} onClick={() => {
                      setSignatureSource('drawn');
                      setSignatureDataUrl('');
                    }}>
                      Draw Signature
                    </Button>
                    <Button type="button" variant={signatureSource === 'uploaded' ? 'default' : 'outline'} onClick={() => {
                      setSignatureSource('uploaded');
                      setSignatureDataUrl('');
                    }}>
                      Upload Signature Image
                    </Button>
                  </div>
                  {signatureSource === 'drawn' ? (
                    <div>
                      <label className="block text-sm font-medium mb-2">Draw Your Signature</label>
                      <SignaturePad
                        value={signatureSource === 'drawn' ? signatureDataUrl : ''}
                        onChange={(value) => {
                          setSignatureSource('drawn');
                          setSignatureDataUrl(value);
                        }}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium mb-2">Upload Signature Image</label>
                      <Input type="file" accept="image/*" onChange={(event) => handleSignatureUpload(event.target.files?.[0] || null)} />
                      {signatureDataUrl && <p className="mt-2 text-xs text-slate-500">Uploaded signature image is ready for verification.</p>}
                    </div>
                  )}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => void signDocument()} disabled={isSigning || !password.trim() || !signerName.trim() || !signatureDataUrl || !clientLocation}>
                    {isSigning ? 'Signing...' : 'Sign Document'}
                  </Button>
                </div>
              </div>
            )}

            {isUnlocked && documentData && documentData.recipientAccess !== 'view' && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                {documentData.recipientAccess === 'edit' && (
                  <div className="min-w-0 rounded-2xl border bg-white p-4 md:p-6">
                    <div className="mb-4 space-y-2">
                      <h2 className="text-lg font-semibold text-slate-900">{documentData.dataCollectionEnabled ? 'Complete Requested Form Fields' : 'Editable Document Fields'}</h2>
                      {documentData.dataCollectionEnabled && (
                        <>
                          <p className="text-sm text-slate-600">
                            Status: <span className="font-medium text-slate-900">
                              {documentData.dataCollectionStatus === 'finalized'
                                ? 'Finalized for document preparation'
                                : documentData.dataCollectionStatus === 'reviewed'
                                  ? 'Reviewed by admin'
                                  : documentData.dataCollectionStatus === 'changes_requested'
                                    ? 'Changes requested'
                                    : documentData.dataCollectionStatus === 'submitted'
                                      ? 'Submitted'
                                      : 'Awaiting your submission'}
                            </span>
                          </p>
                          {documentData.dataCollectionReviewNotes && (
                            <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-900">
                              <p className="font-medium">Admin review note</p>
                              <p className="mt-1">{documentData.dataCollectionReviewNotes}</p>
                              {documentData.dataCollectionReviewedAt && (
                                <p className="mt-2 text-xs text-rose-700">
                                  Updated on {new Date(documentData.dataCollectionReviewedAt).toLocaleString()}
                                  {documentData.dataCollectionReviewedBy ? ` by ${documentData.dataCollectionReviewedBy}` : ''}.
                                </p>
                              )}
                            </div>
                          )}
                          {documentData.dataCollectionInstructions && (
                            <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                              {documentData.dataCollectionInstructions}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {(documentData.templateFields || []).map((field) => (
                        <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="mb-1 block text-sm font-medium">{field.label}</label>
                          {field.type === 'textarea' ? (
                            <RichTextEditor
                              value={editableData[field.name] || ''}
                              onChange={(nextValue) => setEditableData((prev) => ({ ...prev, [field.name]: nextValue }))}
                            />
                          ) : (
                            <Input
                              type={field.type === 'number' ? 'number' : field.type === 'email' ? 'email' : field.type === 'date' ? 'date' : 'text'}
                              value={editableData[field.name] || ''}
                              onChange={(event) => setEditableData((prev) => ({ ...prev, [field.name]: event.target.value }))}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex justify-end">
                      <Button onClick={() => void saveEdits()} disabled={isSavingEdits || !reviewerName.trim()}>
                        {isSavingEdits ? 'Saving...' : documentData.dataCollectionEnabled ? 'Submit Form Data' : 'Save Document Updates'}
                      </Button>
                    </div>
                    {documentData.dataCollectionEnabled && documentData.dataCollectionSubmittedAt && (
                      <p className="mt-3 text-xs text-slate-500">
                        Latest submission saved on {new Date(documentData.dataCollectionSubmittedAt).toLocaleString()}
                        {documentData.dataCollectionSubmittedBy ? ` by ${documentData.dataCollectionSubmittedBy}` : ''}.
                      </p>
                    )}
                  </div>
                )}

                <div className="min-w-0 rounded-2xl border bg-white p-4 md:p-6">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-700" />
                    <h2 className="text-lg font-semibold text-slate-900">Comments and Reviews</h2>
                  </div>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Your Name</label>
                      <Input value={reviewerName} onChange={(event) => setReviewerName(event.target.value)} placeholder="Enter your name" />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Feedback Type</label>
                      <div className="flex gap-2">
                        <Button type="button" variant={commentType === 'comment' ? 'default' : 'outline'} onClick={() => setCommentType('comment')}>Comment</Button>
                        <Button type="button" variant={commentType === 'review' ? 'default' : 'outline'} onClick={() => setCommentType('review')}>Review</Button>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Message</label>
                      <RichTextEditor value={commentMessage} onChange={setCommentMessage} placeholder="Add your comments, review notes, or approval observations" />
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => void saveComment()} disabled={isSavingComment || !reviewerName.trim() || !commentMessage.trim()}>
                        {isSavingComment ? 'Saving...' : 'Add Feedback'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    {(documentData.collaborationComments || []).map((item) => (
                      <div key={item.id} className="rounded-2xl border bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-900">{item.authorName}</p>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-500">{item.type}</span>
                        </div>
                        <div className="prose prose-sm mt-2 max-w-none text-sm text-slate-700" dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(item.message) }} />
                        <p className="mt-2 text-xs text-slate-500">
                          {new Date(item.createdAt).toLocaleString()}{item.createdIp ? ` from ${item.createdIp}` : ''}
                        </p>
                        {item.replyMessage && (
                          <div className="mt-3 rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-900">
                            <span dangerouslySetInnerHTML={{ __html: sanitizeEditorHtml(`Reply from ${item.repliedBy || 'Internal team'} on ${item.repliedAt ? new Date(item.repliedAt).toLocaleString() : 'Unknown'}: ${item.replyMessage || ''}`) }} />
                          </div>
                        )}
                      </div>
                    ))}
                    {(documentData.collaborationComments || []).length === 0 && (
                      <p className="text-sm text-slate-500">No comments or reviews have been added yet.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isUnlocked && documentData?.hasRecipientSignature && (
              <div className="rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-800">
                Recipient signature captured from {documentData.recipientSignerName} on {documentData.recipientSignedAt ? new Date(documentData.recipientSignedAt).toLocaleString() : 'Unknown time'}{documentData.recipientSignedIp ? ` from ${documentData.recipientSignedIp}` : ''}{documentData.recipientSignedLocationLabel ? ` at ${documentData.recipientSignedLocationLabel}` : ''}{documentData.recipientSignatureSource ? ` using ${documentData.recipientSignatureSource} signature` : ''}.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
