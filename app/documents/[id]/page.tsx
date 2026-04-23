'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ProcessProgress } from '@/components/ui/process-progress';
import { Camera, CheckCircle2, Copy, Download, History, Loader2, MessageSquare, PencilLine, Share2 } from 'lucide-react';
import SignaturePad from '@/components/SignaturePad';
import {
  CollaborationComment,
  DataCollectionSubmission,
  DataCollectionStatus,
  DocSheetWorkbook,
  DocumentField,
  FormAppearance,
  RecipientAccessLevel,
  SubmittedDocument,
} from '@/types/document';
import RichTextEditor from '@/components/RichTextEditor';
import { exportDocSheetToCsv, getDocSheetDisplayValue, normalizeDocSheetWorkbook } from '@/lib/docsheet';

interface SharedDocumentPayload {
  id: string;
  shareId?: string;
  templateId?: string;
  documentSourceType?: 'generated' | 'uploaded_pdf';
  templateName: string;
  referenceNumber?: string;
  generatedAt: string;
  requiresPassword?: boolean;
  passwordValidated?: boolean;
  previewHtml?: string;
  uploadedPdfFileName?: string;
  uploadedPdfPreviewUrl?: string;
  templateFields?: DocumentField[];
  formAppearance?: FormAppearance;
  data?: Record<string, string>;
  recipientAccess?: RecipientAccessLevel;
  dataCollectionEnabled?: boolean;
  dataCollectionStatus?: DataCollectionStatus;
  dataCollectionInstructions?: string;
  dataCollectionSubmittedAt?: string;
  dataCollectionSubmittedBy?: string;
  dataCollectionSubmissions?: DataCollectionSubmission[];
  dataCollectionReviewNotes?: string;
  dataCollectionReviewedAt?: string;
  dataCollectionReviewedBy?: string;
  requiredDocumentWorkflowEnabled?: boolean;
  requiredDocuments?: string[];
  submittedDocuments?: SubmittedDocument[];
  documentsVerificationStatus?: 'not_required' | 'pending' | 'verified' | 'rejected';
  documentsVerificationNotes?: string;
  recipientSignatureRequired?: boolean;
  recipientAadhaarVerificationRequired?: boolean;
  aadhaarVerificationConfigured?: boolean;
  aadhaarProviderLabel?: string;
  aadhaarEnvironment?: 'sandbox' | 'production';
  recipientSignerName?: string;
  recipientSignedAt?: string;
  recipientSignedIp?: string;
  recipientPhotoDataUrl?: string;
  recipientPhotoCapturedAt?: string;
  recipientPhotoCapturedIp?: string;
  recipientPhotoCaptureMethod?: 'live_camera';
  recipientAadhaarVerifiedAt?: string;
  recipientAadhaarVerifiedIp?: string;
  recipientAadhaarReferenceId?: string;
  recipientAadhaarMaskedId?: string;
  recipientAadhaarVerificationMode?: 'otp';
  recipientAadhaarProviderLabel?: string;
  recipientSignatureSource?: 'drawn' | 'uploaded';
  recipientSignedLocationLabel?: string;
  recipientSignedLatitude?: number;
  recipientSignedLongitude?: number;
  recipientSignedAccuracyMeters?: number;
  hasRecipientSignature?: boolean;
  collaborationComments?: CollaborationComment[];
  docsheetWorkbook?: DocSheetWorkbook;
  docsheetShareMode?: 'view' | 'edit';
  docsheetSessionStatus?: 'active' | 'expired' | 'revoked';
  docsheetSharedWithEmail?: string;
}

interface CapturedLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  label: string;
  capturedAt: string;
}

interface LivePhotoEvidence {
  photoDataUrl: string;
  capturedAt: string;
  capturedIp?: string;
  evidenceCaptureToken: string;
  captureMethod?: 'live_camera';
}

interface AadhaarVerificationState {
  identityType: 'aadhaar' | 'vid';
  identityValue: string;
  otp: string;
  transactionId: string;
  maskedId?: string;
  verifiedAt?: string;
  verifiedIp?: string;
  referenceId?: string;
  providerLabel?: string;
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
  const [sharedWorkbook, setSharedWorkbook] = useState<DocSheetWorkbook | null>(null);
  const [downloadCopyAfterSubmit, setDownloadCopyAfterSubmit] = useState(false);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isSavingEvidencePhoto, setIsSavingEvidencePhoto] = useState(false);
  const [livePhotoEvidence, setLivePhotoEvidence] = useState<LivePhotoEvidence | null>(null);
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [aadhaarState, setAadhaarState] = useState<AadhaarVerificationState>({
    identityType: 'aadhaar',
    identityValue: '',
    otp: '',
    transactionId: '',
  });
  const [isRequestingAadhaarOtp, setIsRequestingAadhaarOtp] = useState(false);
  const [isVerifyingAadhaarOtp, setIsVerifyingAadhaarOtp] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);

  const handleFormImageUpload = (fieldName: string, file: File | null) => {
    if (!file) {
      setEditableData((prev) => ({ ...prev, [fieldName]: '' }));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setEditableData((prev) => ({ ...prev, [fieldName]: String(reader.result || '') }));
    };
    reader.readAsDataURL(file);
  };

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

      const unlocked = Boolean(payload?.passwordValidated) || payload?.requiresPassword === false;

      setDocumentData(payload);
      setEditableData(payload?.data || {});
      setSharedWorkbook(payload?.docsheetWorkbook ? normalizeDocSheetWorkbook(payload.docsheetWorkbook) : null);
      setIsUnlocked(unlocked);

      if (unlocked) {
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

  useEffect(() => {
    if (!cameraOpen || !videoRef.current || !cameraStreamRef.current) {
      return;
    }
    videoRef.current.srcObject = cameraStreamRef.current;
    void videoRef.current.play().catch(() => undefined);
  }, [cameraOpen]);

  const stopCameraStream = useCallback(() => {
    cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    cameraStreamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => () => stopCameraStream(), [stopCameraStream]);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const sharePassword = documentData?.requiresPassword ? password : '';
  const activeSharedSheet = sharedWorkbook?.sheets?.[0] || null;
  const formAppearance = documentData?.formAppearance;
  const formHeroTitle = formAppearance?.heroTitle || documentData?.templateName || 'Shared Document';
  const formHeroDescription = formAppearance?.heroDescription
    || documentData?.dataCollectionInstructions
    || 'Complete the requested form and submit your response securely.';
  const submitActionLabel = formAppearance?.submitLabel || 'Submit Form Data';
  const formMediaSlides = formAppearance?.mediaSlides?.filter((slide) => slide.imageUrl) || [];
  const mediaLoopSlides = formMediaSlides.length > 3 ? [...formMediaSlides, ...formMediaSlides] : formMediaSlides;
  const formCtas = formAppearance?.ctaButtons || [];
  const formBanners = formAppearance?.banners || [];
  const formSubmissionHistory = documentData?.dataCollectionSubmissions || [];
  const allowSingleEditAfterSubmit = formAppearance?.allowSingleEditAfterSubmit !== false;
  const showSubmissionHistory = formAppearance?.showSubmissionHistory !== false;
  const formHeroAlignment = formAppearance?.heroAlignment === 'center' ? 'center' : 'left';
  const formFieldColumns = formAppearance?.fieldColumns === 1 ? 1 : 2;
  const submitButtonWidth = formAppearance?.submitButtonWidth === 'fit' ? 'fit' : 'full';
  const thankYouRedirectUrl = formAppearance?.thankYouRedirectUrl || '';
  const maxFormSubmissions = allowSingleEditAfterSubmit ? 2 : 1;
  const hasReachedSubmissionLimit = Boolean(documentData?.dataCollectionEnabled && formSubmissionHistory.length >= maxFormSubmissions);
  const remainingFormEdits = Math.max(0, maxFormSubmissions - formSubmissionHistory.length);
  const whatsappLink = formAppearance?.whatsappNumber
    ? `https://wa.me/${formAppearance.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(formAppearance.whatsappMessage || `Hello, I am opening the ${formHeroTitle} form.`)}`
    : '';
  const isMinimalFormPage = Boolean(documentData?.dataCollectionEnabled);
  const isProcessingRequest = isLoading || isSavingEdits || isSigning || isSubmittingDocuments || isDownloadingPdf || isUnlocking;
  const displayedPhotoEvidence = livePhotoEvidence || (documentData?.recipientPhotoDataUrl ? {
    photoDataUrl: documentData.recipientPhotoDataUrl,
    capturedAt: documentData.recipientPhotoCapturedAt || '',
    capturedIp: documentData.recipientPhotoCapturedIp,
    evidenceCaptureToken: '',
    captureMethod: documentData.recipientPhotoCaptureMethod,
  } : null);
  const aadhaarVerified = Boolean(documentData?.recipientAadhaarVerifiedAt);
  const derivedRespondentName = useMemo(() => {
    const candidates = [
      editableData.full_name,
      editableData.fullName,
      editableData.name,
      editableData.applicant_name,
      editableData.applicantName,
      editableData.email_address,
      editableData.email,
    ];
    return candidates.find((value) => value?.trim())?.trim() || reviewerName.trim() || 'Recipient';
  }, [editableData, reviewerName]);

  const updateSharedSheetCell = (rowId: string, columnId: string, value: string) => {
    setSharedWorkbook((current) => current ? {
      ...current,
      updatedAt: new Date().toISOString(),
      sheets: current.sheets.map((sheet, sheetIndex) => sheetIndex === 0 ? {
        ...sheet,
        updatedAt: new Date().toISOString(),
        rows: sheet.rows.map((row) => row.id === rowId ? {
          ...row,
          values: {
            ...row.values,
            [columnId]: value,
          },
        } : row),
      } : sheet),
    } : current);
  };

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
          evidenceCaptureToken: livePhotoEvidence?.evidenceCaptureToken,
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
        documentSourceType: payload.documentSourceType,
        templateName: payload.templateName,
        referenceNumber: payload.referenceNumber,
        generatedAt: payload.generatedAt,
        previewHtml: payload.previewHtml,
        uploadedPdfFileName: payload.uploadedPdfFileName,
        uploadedPdfPreviewUrl: payload.uploadedPdfPreviewUrl,
        templateFields: payload.templateFields || documentData?.templateFields || [],
        formAppearance: payload.formAppearance || documentData?.formAppearance,
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
        recipientPhotoDataUrl: payload.recipientPhotoDataUrl,
        recipientPhotoCapturedAt: payload.recipientPhotoCapturedAt,
        recipientPhotoCapturedIp: payload.recipientPhotoCapturedIp,
        recipientPhotoCaptureMethod: payload.recipientPhotoCaptureMethod,
        recipientAadhaarVerificationRequired: payload.recipientAadhaarVerificationRequired ?? documentData?.recipientAadhaarVerificationRequired,
        aadhaarVerificationConfigured: documentData?.aadhaarVerificationConfigured,
        aadhaarProviderLabel: payload.recipientAadhaarProviderLabel || documentData?.aadhaarProviderLabel,
        aadhaarEnvironment: documentData?.aadhaarEnvironment,
        recipientAadhaarVerifiedAt: payload.recipientAadhaarVerifiedAt,
        recipientAadhaarVerifiedIp: payload.recipientAadhaarVerifiedIp,
        recipientAadhaarReferenceId: payload.recipientAadhaarReferenceId,
        recipientAadhaarMaskedId: payload.recipientAadhaarMaskedId,
        recipientAadhaarVerificationMode: payload.recipientAadhaarVerificationMode,
        recipientAadhaarProviderLabel: payload.recipientAadhaarProviderLabel,
        recipientSignatureSource: payload.recipientSignatureSource,
        recipientSignedLocationLabel: payload.recipientSignedLocationLabel,
        recipientSignedLatitude: payload.recipientSignedLatitude,
        recipientSignedLongitude: payload.recipientSignedLongitude,
        recipientSignedAccuracyMeters: payload.recipientSignedAccuracyMeters,
        hasRecipientSignature: Boolean(payload.recipientSignatureDataUrl),
        collaborationComments: payload.collaborationComments || documentData?.collaborationComments || [],
      });
      setLivePhotoEvidence(payload.recipientPhotoDataUrl ? {
        photoDataUrl: payload.recipientPhotoDataUrl,
        capturedAt: payload.recipientPhotoCapturedAt,
        capturedIp: payload.recipientPhotoCapturedIp,
        evidenceCaptureToken: livePhotoEvidence?.evidenceCaptureToken || '',
        captureMethod: payload.recipientPhotoCaptureMethod,
      } : null);
      setSuccessMessage('Document signed successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to sign document');
      setSuccessMessage('');
      if (error instanceof Error && /IP mismatch/i.test(error.message)) {
        setLivePhotoEvidence(null);
      }
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
          reviewerName: documentData?.dataCollectionEnabled ? derivedRespondentName : reviewerName,
          password,
          docsheetWorkbook: sharedWorkbook,
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
        formAppearance: payload.formAppearance || prev.formAppearance,
        dataCollectionEnabled: payload.dataCollectionEnabled ?? prev.dataCollectionEnabled,
        dataCollectionStatus: payload.dataCollectionStatus || prev.dataCollectionStatus,
        dataCollectionInstructions: payload.dataCollectionInstructions ?? prev.dataCollectionInstructions,
        dataCollectionSubmittedAt: payload.dataCollectionSubmittedAt || prev.dataCollectionSubmittedAt,
        dataCollectionSubmittedBy: payload.dataCollectionSubmittedBy || prev.dataCollectionSubmittedBy,
        dataCollectionSubmissions: payload.dataCollectionSubmissions || prev.dataCollectionSubmissions || [],
        dataCollectionReviewNotes: payload.dataCollectionReviewNotes ?? prev.dataCollectionReviewNotes,
        dataCollectionReviewedAt: payload.dataCollectionReviewedAt || prev.dataCollectionReviewedAt,
        dataCollectionReviewedBy: payload.dataCollectionReviewedBy || prev.dataCollectionReviewedBy,
        collaborationComments: payload.collaborationComments || prev.collaborationComments || [],
        docsheetWorkbook: payload.docsheetWorkbook || prev.docsheetWorkbook,
        docsheetShareMode: payload.docsheetShareMode || prev.docsheetShareMode,
      } : prev);
      if (payload.docsheetWorkbook) {
        setSharedWorkbook(normalizeDocSheetWorkbook(payload.docsheetWorkbook));
      }
      setSuccessMessage(payload.formAppearance?.successMessage || 'Document updates saved successfully.');
      setErrorMessage('');
      if (payload.dataCollectionEnabled && downloadCopyAfterSubmit) {
        window.setTimeout(() => {
          void downloadPdf();
        }, 180);
      }
      if (payload.dataCollectionEnabled && thankYouRedirectUrl) {
        window.setTimeout(() => {
          window.location.href = thankYouRedirectUrl;
        }, downloadCopyAfterSubmit ? 900 : 500);
      }
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
      anchor.download = documentData?.uploadedPdfFileName || `${documentData?.templateName || 'document'}.pdf`;
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

  const downloadSharedCsv = async () => {
    if (!activeSharedSheet) return;
    const csv = exportDocSheetToCsv(activeSharedSheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${(sharedWorkbook?.title || 'shared-sheet').replace(/\s+/g, '-').toLowerCase()}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    window.URL.revokeObjectURL(url);
    setSuccessMessage('CSV downloaded successfully.');
    setErrorMessage('');
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

  const openCameraCapture = async () => {
    if (!password.trim()) {
      setErrorMessage('Enter the signing password first, then open the live camera capture.');
      setSuccessMessage('');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage('Live camera capture is not supported in this browser.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsStartingCamera(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      stopCameraStream();
      cameraStreamRef.current = stream;
      setCameraOpen(true);
      setErrorMessage('');
    } catch (error) {
      setErrorMessage('Live camera permission is mandatory before signing. Please allow camera access and try again.');
      setSuccessMessage('');
    } finally {
      setIsStartingCamera(false);
    }
  };

  const closeCameraCapture = () => {
    setCameraOpen(false);
    stopCameraStream();
  };

  const captureLiveEvidencePhoto = async () => {
    if (!canvasRef.current || !videoRef.current) {
      setErrorMessage('Camera preview is not ready yet. Please try again.');
      setSuccessMessage('');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Enter the signing password before capturing the live signer photo.');
      setSuccessMessage('');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      setErrorMessage('Unable to access the camera canvas. Please retry.');
      setSuccessMessage('');
      return;
    }

    context.drawImage(video, 0, 0, width, height);
    const photoDataUrl = canvas.toDataURL('image/jpeg', 0.92);

    try {
      setIsSavingEvidencePhoto(true);
      const response = await fetch(`/api/public/documents/${params.id}/evidence-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password,
          photoDataUrl,
          capturedAt: new Date().toISOString(),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to capture live signer photo.');
      }
      setLivePhotoEvidence({
        photoDataUrl: payload.photoDataUrl,
        capturedAt: payload.capturedAt,
        capturedIp: payload.capturedIp,
        evidenceCaptureToken: payload.evidenceCaptureToken,
        captureMethod: payload.captureMethod,
      });
      setSuccessMessage('Live signer photo captured and linked to this signing session.');
      setErrorMessage('');
      closeCameraCapture();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to capture live signer photo.');
      setSuccessMessage('');
    } finally {
      setIsSavingEvidencePhoto(false);
    }
  };

  const requestAadhaarOtp = async () => {
    if (!password.trim()) {
      setErrorMessage('Enter the signing password before requesting Aadhaar OTP.');
      setSuccessMessage('');
      return;
    }
    if (!aadhaarState.identityValue.trim()) {
      setErrorMessage(aadhaarState.identityType === 'vid' ? 'Enter your 16-digit VID before requesting OTP.' : 'Enter your 12-digit Aadhaar number before requesting OTP.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsRequestingAadhaarOtp(true);
      const response = await fetch(`/api/public/documents/${params.id}/aadhaar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_otp',
          password,
          signerName,
          identityType: aadhaarState.identityType,
          identityValue: aadhaarState.identityValue,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to request Aadhaar OTP.');
      }
      setAadhaarState((current) => ({
        ...current,
        transactionId: payload.transactionId || '',
        maskedId: payload.maskedId,
        providerLabel: payload.providerLabel,
      }));
      setSuccessMessage(payload?.message || 'Aadhaar OTP sent successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to request Aadhaar OTP.');
      setSuccessMessage('');
    } finally {
      setIsRequestingAadhaarOtp(false);
    }
  };

  const verifyAadhaarOtp = async () => {
    if (!password.trim()) {
      setErrorMessage('Enter the signing password before verifying Aadhaar OTP.');
      setSuccessMessage('');
      return;
    }
    if (!aadhaarState.transactionId) {
      setErrorMessage('Request OTP first before verifying Aadhaar.');
      setSuccessMessage('');
      return;
    }
    if (!aadhaarState.otp.trim()) {
      setErrorMessage('Enter the OTP sent to your Aadhaar-linked mobile number.');
      setSuccessMessage('');
      return;
    }

    try {
      setIsVerifyingAadhaarOtp(true);
      const response = await fetch(`/api/public/documents/${params.id}/aadhaar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_otp',
          password,
          signerName,
          identityType: aadhaarState.identityType,
          identityValue: aadhaarState.identityValue,
          otp: aadhaarState.otp,
          transactionId: aadhaarState.transactionId,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to verify Aadhaar OTP.');
      }
      setDocumentData((prev) => prev ? {
        ...prev,
        recipientAadhaarVerifiedAt: payload.verifiedAt,
        recipientAadhaarVerifiedIp: payload.verifiedIp,
        recipientAadhaarReferenceId: payload.referenceId,
        recipientAadhaarMaskedId: payload.maskedId,
        recipientAadhaarVerificationMode: payload.verificationMode,
        recipientAadhaarProviderLabel: payload.providerLabel,
      } : prev);
      setAadhaarState((current) => ({
        ...current,
        verifiedAt: payload.verifiedAt,
        verifiedIp: payload.verifiedIp,
        referenceId: payload.referenceId,
        maskedId: payload.maskedId,
        providerLabel: payload.providerLabel,
      }));
      setSuccessMessage(payload?.message || 'Aadhaar verified successfully.');
      setErrorMessage('');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Failed to verify Aadhaar OTP.');
      setSuccessMessage('');
    } finally {
      setIsVerifyingAadhaarOtp(false);
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
      <style jsx global>{`
        @keyframes form-marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .form-marquee-track {
          width: max-content;
          animation: form-marquee 28s linear infinite;
        }
      `}</style>
      {isProcessingRequest ? (
        <div className="fixed inset-x-0 top-3 z-50 px-3 md:top-5 md:px-6 xl:px-8">
          <div className="mx-auto max-w-3xl">
            <ProcessProgress
              active={isProcessingRequest}
              profile={isDownloadingPdf ? 'export' : isSigning || isSavingEvidencePhoto ? 'publish' : isUnlocking || isLoading ? 'sync' : 'save'}
              title={
                isSigning
                  ? 'Completing secure signature'
                  : isSavingEvidencePhoto
                    ? 'Saving live signer photo'
                    : isSavingEdits
                      ? 'Saving form changes'
                      : isDownloadingPdf
                        ? 'Preparing signed document download'
                        : isUnlocking
                          ? 'Unlocking secure document'
                          : 'Loading shared document'
              }
              className="border-white/80 bg-white/94 shadow-[0_24px_60px_rgba(15,23,42,0.12)]"
            />
          </div>
        </div>
      ) : null}
      <div className={`mx-auto space-y-4 px-3 sm:px-4 ${isMinimalFormPage ? 'max-w-4xl' : 'max-w-7xl'}`}>
        <Card className="overflow-hidden rounded-[28px] border-0 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          {!isMinimalFormPage ? (
            <CardHeader>
              <div className="inline-flex w-fit items-center rounded-2xl bg-slate-950 px-4 py-2 text-base font-black lowercase tracking-[0.12em] text-white shadow-[0_16px_36px_rgba(15,23,42,0.18)] sm:text-xl">
                docrud
              </div>
              <CardTitle className="max-w-4xl text-xl leading-tight sm:text-2xl md:text-3xl">{documentData?.templateName || 'Shared Document'}</CardTitle>
              {documentData && (
                <>
                  <p className="text-sm text-slate-500">Reference: {documentData.referenceNumber}</p>
                  <p className="text-sm text-slate-500">Generated on {new Date(documentData.generatedAt).toLocaleString()}</p>
                </>
              )}
            </CardHeader>
          ) : null}
          <CardContent className={`space-y-4 ${isMinimalFormPage ? 'p-4 md:p-6' : ''}`}>
            {!isMinimalFormPage ? (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0 rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">{formAppearance?.eyebrow || (documentData?.dataCollectionEnabled ? 'Secure Data Collection' : 'Secure Signing')}</p>
                {documentData?.dataCollectionEnabled ? (
                  <p className="mt-3 text-xl font-semibold text-white">{formHeroTitle}</p>
                ) : null}
                <p className="mt-3 text-sm text-slate-200">
                  {documentData?.dataCollectionEnabled
                    ? formHeroDescription
                    : 'Review the document, verify the password shared with you, and sign directly on this secure docrud page.'}
                </p>
                {documentData?.dataCollectionEnabled && formAppearance?.introNote ? (
                  <div className="mt-3 rounded-2xl bg-white/10 px-3 py-2 text-xs leading-6 text-slate-100">
                    {formAppearance.introNote}
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 rounded-3xl border bg-slate-50 p-5">
                <p className="text-sm font-semibold text-slate-900">Quick Actions</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <Button type="button" variant="outline" onClick={() => void copyLink()} className="w-full justify-center">
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Link
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void shareDocument()} className="w-full justify-center">
                    <Share2 className="mr-2 h-4 w-4" />
                    Share
                  </Button>
                  {isUnlocked && (
                    <Button type="button" variant="outline" onClick={() => void downloadPdf()} disabled={isDownloadingPdf} className="w-full justify-center sm:col-span-2 xl:col-span-1">
                      <Download className="mr-2 h-4 w-4" />
                      {isDownloadingPdf ? 'Downloading...' : 'Download PDF'}
                    </Button>
                  )}
                  {isUnlocked && activeSharedSheet && (
                    <Button type="button" variant="outline" onClick={() => void downloadSharedCsv()} className="w-full justify-center sm:col-span-2 xl:col-span-1">
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                  )}
                </div>
              </div>
            </div>
            ) : null}

            {isUnlocked && documentData?.dataCollectionEnabled && (formCtas.length > 0 || whatsappLink) ? (
              <div className={`rounded-2xl border bg-white p-4 md:p-6 ${isMinimalFormPage ? 'border-0 bg-transparent p-0 shadow-none' : ''}`}>
                <div className="flex flex-wrap gap-3">
                  {formCtas.map((button) => (
                    <a
                      key={button.id}
                      href={button.type === 'whatsapp' ? (button.url || whatsappLink || '#') : (button.url || '#')}
                      target="_blank"
                      rel="noreferrer"
                      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold ${button.type === 'whatsapp' ? 'bg-emerald-600 text-white' : 'bg-slate-950 text-white'}`}
                    >
                      {button.type === 'whatsapp' ? <MessageSquare className="mr-2 h-4 w-4" /> : null}
                      {button.type === 'whatsapp' ? (button.label || 'WhatsApp') : button.label}
                    </a>
                  ))}
                  {whatsappLink ? (
                    <a href={whatsappLink} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      WhatsApp
                    </a>
                  ) : null}
                </div>
              </div>
            ) : null}

            {isUnlocked && documentData?.dataCollectionEnabled && formMediaSlides.length > 0 ? (
              <div className={`overflow-hidden rounded-2xl border bg-white p-4 md:p-6 ${isMinimalFormPage ? 'border-0 bg-transparent p-0 shadow-none' : ''}`}>
                <div className="no-scrollbar flex gap-4 overflow-x-auto">
                  <div className={`flex gap-4 ${formMediaSlides.length > 3 ? 'form-marquee-track' : ''}`}>
                    {mediaLoopSlides.map((slide, index) => (
                      <div key={`${slide.id}-${index}`} className="w-[260px] shrink-0 overflow-hidden rounded-[1.5rem] border border-slate-200 bg-slate-50 shadow-sm">
                        <div className="flex min-h-[196px] items-center justify-center bg-white p-4">
                          <Image src={slide.imageUrl} alt={slide.title || formHeroTitle} width={320} height={176} unoptimized className="max-h-44 w-auto max-w-full object-contain object-center" />
                        </div>
                        {(slide.title || slide.description || slide.ctaLabel) ? (
                          <div className="grid gap-2 p-4">
                            {slide.title ? <p className="text-sm font-semibold text-slate-950">{slide.title}</p> : null}
                            {slide.description ? <p className="text-xs leading-6 text-slate-600">{slide.description}</p> : null}
                            {slide.ctaLabel && slide.ctaUrl ? (
                              <a href={slide.ctaUrl} target="_blank" rel="noreferrer" className="inline-flex w-max rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
                                {slide.ctaLabel}
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {isUnlocked && documentData?.dataCollectionEnabled && formBanners.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {formBanners.map((banner) => (
                  <div key={banner.id} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
                    {banner.imageUrl ? (
                      <div className="flex min-h-[184px] items-center justify-center bg-slate-50 p-4">
                        <Image src={banner.imageUrl} alt={banner.title} width={320} height={160} unoptimized className="max-h-40 w-auto max-w-full object-contain object-center" />
                      </div>
                    ) : null}
                    <div className="grid gap-2 p-4">
                      <p className="text-sm font-semibold text-slate-950">{banner.title}</p>
                      {banner.description ? <p className="text-xs leading-6 text-slate-600">{banner.description}</p> : null}
                      {banner.ctaLabel && banner.ctaUrl ? (
                        <a href={banner.ctaUrl} target="_blank" rel="noreferrer" className="inline-flex w-max rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-900">
                          {banner.ctaLabel}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

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

            {documentData && !isUnlocked && documentData.requiresPassword !== false && (
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

            {isUnlocked && activeSharedSheet && (
              <div className="overflow-hidden rounded-2xl border bg-white p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Shared DocSheet Session</h2>
                    <p className="text-sm text-slate-500">
                      {documentData?.docsheetShareMode === 'edit'
                        ? 'This sheet is editable. Changes are tracked and saved back into the sender workspace.'
                        : 'This sheet is shared in view mode only.'}
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-[0.16em] text-slate-600">
                    {documentData?.docsheetSessionStatus || 'active'}
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-max border-collapse">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="border-b border-r border-slate-200 px-3 py-3 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">Row</th>
                        {activeSharedSheet.columns.map((column) => (
                          <th key={column.id} className="min-w-[180px] border-b border-slate-200 px-3 py-3 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {column.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {activeSharedSheet.rows.map((row, rowIndex) => (
                        <tr key={row.id} className="border-b border-slate-100 last:border-b-0">
                          <td className="border-r border-slate-200 px-3 py-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                            {rowIndex + 1}
                          </td>
                          {activeSharedSheet.columns.map((column) => (
                            <td key={column.id} className="px-3 py-3">
                              {documentData?.docsheetShareMode === 'edit' ? (
                                <Input
                                  value={String(row.values[column.id] || '')}
                                  onChange={(event) => updateSharedSheetCell(row.id, column.id, event.target.value)}
                                  className="bg-white"
                                />
                              ) : (
                                <div className="text-sm text-slate-700">{getDocSheetDisplayValue(activeSharedSheet, row.id, column.id) || '—'}</div>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {documentData?.docsheetShareMode === 'edit' ? (
                  <div className="mt-4 flex justify-end">
                    <Button onClick={() => void saveEdits()} disabled={isSavingEdits || !reviewerName.trim()}>
                      {isSavingEdits ? 'Saving sheet...' : 'Save Sheet Changes'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}

            {isUnlocked && documentData?.previewHtml && !documentData?.dataCollectionEnabled && (
              <div className="overflow-hidden rounded-2xl border bg-white p-4 md:p-6">
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
                  className={`mt-4 w-full max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${documentExpanded ? 'min-h-[78vh] md:min-h-[90vh]' : 'h-[56vh] min-h-[420px] sm:h-[62vh] md:h-[520px]'}`}
                />
              </div>
            )}

            {isUnlocked && documentData?.documentSourceType === 'uploaded_pdf' && documentData.uploadedPdfPreviewUrl && (
              <div className="overflow-hidden rounded-2xl border bg-white p-4 md:p-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Uploaded PDF Preview</h2>
                    <p className="text-sm text-slate-500">Review the shared PDF, download it, and complete recipient signing if requested.</p>
                  </div>
                  {documentData.uploadedPdfFileName ? (
                    <p className="text-sm text-slate-500">{documentData.uploadedPdfFileName}</p>
                  ) : null}
                </div>
                <iframe
                  title={documentData.uploadedPdfFileName || documentData.templateName}
                  src={documentData.uploadedPdfPreviewUrl}
                  className={`mt-4 w-full max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white ${documentExpanded ? 'min-h-[78vh] md:min-h-[90vh]' : 'h-[58vh] min-h-[460px] sm:h-[66vh] md:h-[640px]'}`}
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
                {documentData.recipientAadhaarVerificationRequired ? (
                  <div className="mb-4 rounded-2xl border bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Aadhaar verification</p>
                        <p className="text-sm text-slate-500">
                          Aadhaar OTP verification is mandatory before this document can be signed.
                          {documentData.aadhaarProviderLabel ? ` Provider: ${documentData.aadhaarProviderLabel}.` : ''}
                        </p>
                      </div>
                      {aadhaarVerified ? (
                        <span className="inline-flex w-fit items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
                          Aadhaar verified
                        </span>
                      ) : (
                        <span className="inline-flex w-fit items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                          Verification pending
                        </span>
                      )}
                    </div>
                    {!documentData.aadhaarVerificationConfigured ? (
                      <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        The admin has enabled Aadhaar verification, but the UIDAI gateway is not configured yet. Signing stays locked until the integration is completed.
                      </div>
                    ) : (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium">Identity type</label>
                            <select
                              value={aadhaarState.identityType}
                              onChange={(event) => setAadhaarState((current) => ({ ...current, identityType: event.target.value === 'vid' ? 'vid' : 'aadhaar' }))}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none"
                            >
                              <option value="aadhaar">Aadhaar Number</option>
                              <option value="vid">Virtual ID (VID)</option>
                            </select>
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">{aadhaarState.identityType === 'vid' ? '16-digit VID' : '12-digit Aadhaar number'}</label>
                            <Input
                              value={aadhaarState.identityValue}
                              onChange={(event) => setAadhaarState((current) => ({ ...current, identityValue: event.target.value.replace(/\D/g, '') }))}
                              placeholder={aadhaarState.identityType === 'vid' ? 'Enter 16-digit VID' : 'Enter 12-digit Aadhaar number'}
                              maxLength={aadhaarState.identityType === 'vid' ? 16 : 12}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium">OTP</label>
                            <Input
                              value={aadhaarState.otp}
                              onChange={(event) => setAadhaarState((current) => ({ ...current, otp: event.target.value.replace(/\D/g, '') }))}
                              placeholder="Enter OTP"
                              maxLength={8}
                            />
                          </div>
                          <div className="rounded-2xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                            <p className="font-medium text-slate-900">Verification session</p>
                            <p className="mt-1">Transaction ID: {aadhaarState.transactionId || 'Not started yet'}</p>
                            <p className="mt-1">Masked ID: {documentData.recipientAadhaarMaskedId || aadhaarState.maskedId || 'Pending'}</p>
                            <p className="mt-1">Environment: {documentData.aadhaarEnvironment || 'sandbox'}</p>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 lg:w-[220px]">
                          <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={() => void requestAadhaarOtp()} disabled={isRequestingAadhaarOtp || aadhaarVerified}>
                            {isRequestingAadhaarOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Request OTP
                          </Button>
                          <Button type="button" className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => void verifyAadhaarOtp()} disabled={isVerifyingAadhaarOtp || aadhaarVerified || !aadhaarState.transactionId}>
                            {isVerifyingAadhaarOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Verify Aadhaar
                          </Button>
                        </div>
                      </div>
                    )}
                    {(documentData.recipientAadhaarVerifiedAt || aadhaarState.verifiedAt) ? (
                      <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        Verified {documentData.recipientAadhaarMaskedId || aadhaarState.maskedId || 'identity'} on {new Date(documentData.recipientAadhaarVerifiedAt || aadhaarState.verifiedAt || '').toLocaleString()}
                        {(documentData.recipientAadhaarReferenceId || aadhaarState.referenceId) ? ` • Ref: ${documentData.recipientAadhaarReferenceId || aadhaarState.referenceId}` : ''}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mb-4 rounded-2xl border bg-slate-50 p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Live signing evidence</p>
                      <p className="text-sm text-slate-500">For stronger auditability, docrud requires your current location and an immediate live camera photo before signing.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => void captureLocation()} disabled={isCapturingLocation}>
                        {isCapturingLocation ? 'Capturing Location...' : clientLocation ? 'Refresh Location' : 'Enable Location'}
                      </Button>
                      <Button type="button" variant="outline" onClick={() => void openCameraCapture()} disabled={isStartingCamera || isSavingEvidencePhoto}>
                        <Camera className="mr-2 h-4 w-4" />
                        {isStartingCamera ? 'Opening Camera...' : displayedPhotoEvidence ? 'Retake Live Photo' : 'Open Camera'}
                      </Button>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    {clientLocation ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        <p className="font-semibold">Location captured</p>
                        <p className="mt-1">Captured at {new Date(clientLocation.capturedAt).toLocaleString()}: {clientLocation.label}</p>
                        {clientLocation.accuracyMeters ? <p className="mt-1">Accuracy approx. {Math.round(clientLocation.accuracyMeters)} m</p> : null}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        Allow location access in your browser to continue with signing.
                      </div>
                    )}
                    {displayedPhotoEvidence ? (
                      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                        <p className="font-semibold">Live signer photo captured</p>
                        <div className="mt-3 flex items-start gap-3">
                          <Image src={displayedPhotoEvidence.photoDataUrl} alt="Live signer evidence" width={96} height={96} unoptimized className="h-24 w-24 rounded-2xl object-cover border border-emerald-200 bg-white" />
                          <div className="min-w-0">
                            <p>Captured at {displayedPhotoEvidence.capturedAt ? new Date(displayedPhotoEvidence.capturedAt).toLocaleString() : 'Unknown time'}</p>
                            <p className="mt-1">Capture IP: {displayedPhotoEvidence.capturedIp || 'Captured server-side'}</p>
                            <p className="mt-1">Method: live camera capture</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                        A fresh live camera photo is mandatory. Uploaded images are not accepted for signer evidence.
                      </div>
                    )}
                  </div>
                  {cameraOpen ? (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
                        <div className="flex-1 overflow-hidden rounded-[1.5rem] bg-slate-950">
                          <video ref={videoRef} playsInline muted autoPlay className="h-[280px] w-full object-cover" />
                        </div>
                        <div className="w-full max-w-[280px] space-y-3">
                          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                            Capture a fresh face photo directly from this device. The server records the capture time and IP, then matches it again during final signing.
                          </div>
                          <div className="grid gap-2">
                            <Button type="button" className="h-11 rounded-2xl bg-slate-950 text-white hover:bg-slate-800" onClick={() => void captureLiveEvidencePhoto()} disabled={isSavingEvidencePhoto}>
                              {isSavingEvidencePhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                              Capture live photo
                            </Button>
                            <Button type="button" variant="outline" className="h-11 rounded-2xl" onClick={closeCameraCapture}>
                              Close camera
                            </Button>
                          </div>
                        </div>
                      </div>
                      <canvas ref={canvasRef} className="hidden" />
                    </div>
                  ) : null}
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
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button type="button" variant={signatureSource === 'drawn' ? 'default' : 'outline'} onClick={() => {
                      setSignatureSource('drawn');
                      setSignatureDataUrl('');
                    }} className="w-full justify-center">
                      Draw Signature
                    </Button>
                    <Button type="button" variant={signatureSource === 'uploaded' ? 'default' : 'outline'} onClick={() => {
                      setSignatureSource('uploaded');
                      setSignatureDataUrl('');
                    }} className="w-full justify-center">
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
                <div className="mt-4 rounded-2xl border bg-slate-50 p-4">
                  <label className="flex items-start gap-3 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={attestationAccepted}
                      onChange={(event) => setAttestationAccepted(event.target.checked)}
                      className="mt-1"
                    />
                    <span>
                      I confirm that I am intentionally signing this document, I am authorised to do so, and I understand that docrud will store my signature, live signer photo, timestamp, IP address, device/browser trail, and location metadata as part of the execution record. Some transactions may still require DSC, Aadhaar eSign, stamping, witnessing, notarisation, or registration depending on applicable law.
                    </span>
                  </label>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => void signDocument()} disabled={isSigning || !password.trim() || !signerName.trim() || !signatureDataUrl || !clientLocation || !livePhotoEvidence?.evidenceCaptureToken || !attestationAccepted || Boolean(documentData.recipientAadhaarVerificationRequired && (!documentData.aadhaarVerificationConfigured || !aadhaarVerified))} className="w-full sm:w-auto">
                    {isSigning ? 'Signing...' : 'Sign Document'}
                  </Button>
                </div>
              </div>
            )}

            {isUnlocked && documentData && documentData.documentSourceType !== 'uploaded_pdf' && documentData.templateId !== 'docsheet-workbook' && documentData.recipientAccess !== 'view' && (
              <div className={`grid gap-4 ${documentData.dataCollectionEnabled ? '' : 'xl:grid-cols-[minmax(0,1fr)_360px]'}`}>
                {documentData.recipientAccess === 'edit' && (
                  <div className={`min-w-0 rounded-2xl border bg-white p-4 md:p-6 ${documentData.dataCollectionEnabled ? 'mx-auto w-full max-w-3xl rounded-[2rem] border-slate-200 shadow-[0_20px_60px_rgba(15,23,42,0.08)]' : ''}`}>
                      <div className={`mb-4 space-y-2 ${documentData.dataCollectionEnabled && formHeroAlignment === 'center' ? 'text-center' : ''}`}>
                      {!documentData.dataCollectionEnabled ? <h2 className="text-lg font-semibold text-slate-900">Editable Document Fields</h2> : null}
                      {documentData.dataCollectionEnabled ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white">
                            {hasReachedSubmissionLimit ? 'Locked' : remainingFormEdits === 1 ? 'One final edit left' : 'Ready to submit'}
                          </span>
                          {showSubmissionHistory && formSubmissionHistory.length > 0 ? (
                            <button
                              type="button"
                              onClick={() => setShowEditHistory((prev) => !prev)}
                              className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-600"
                            >
                              <History className="mr-1.5 h-3.5 w-3.5" />
                              {showEditHistory ? 'Hide history' : 'Edit history'}
                            </button>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                    <fieldset disabled={documentData.dataCollectionEnabled && hasReachedSubmissionLimit} className={`grid grid-cols-1 gap-4 ${formFieldColumns === 2 ? 'md:grid-cols-2' : ''} disabled:opacity-70`}>
                      {(documentData.templateFields || []).map((field) => (
                        <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                          <label className="mb-1 block text-sm font-medium">{field.label}</label>
                          {field.type === 'textarea' ? (
                            <RichTextEditor
                              value={editableData[field.name] || ''}
                              onChange={(nextValue) => setEditableData((prev) => ({ ...prev, [field.name]: nextValue }))}
                            />
                          ) : field.type === 'select' ? (
                            <select
                              value={editableData[field.name] || ''}
                              onChange={(event) => setEditableData((prev) => ({ ...prev, [field.name]: event.target.value }))}
                              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                            >
                              <option value="">{field.placeholder || `Select ${field.label.toLowerCase()}`}</option>
                              {(field.options || []).map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : field.type === 'radio' ? (
                            <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              {(field.options || []).map((option) => (
                                <label key={option} className="flex items-center gap-3 text-sm text-slate-700">
                                  <input
                                    type="radio"
                                    name={field.name}
                                    value={option}
                                    checked={(editableData[field.name] || '') === option}
                                    onChange={(event) => setEditableData((prev) => ({ ...prev, [field.name]: event.target.value }))}
                                  />
                                  <span>{option}</span>
                                </label>
                              ))}
                            </div>
                          ) : field.type === 'checkbox' ? (
                            <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                              <input
                                type="checkbox"
                                checked={['true', 'yes', 'checked', '1'].includes((editableData[field.name] || '').toLowerCase())}
                                onChange={(event) => setEditableData((prev) => ({ ...prev, [field.name]: event.target.checked ? 'Yes' : '' }))}
                              />
                              <span>{field.placeholder || 'Checked'}</span>
                            </label>
                          ) : field.type === 'image' ? (
                            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                              <Input type="file" accept="image/*" onChange={(event) => handleFormImageUpload(field.name, event.target.files?.[0] || null)} />
                              {editableData[field.name] ? (
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-2">
                                  <Image src={editableData[field.name]} alt={field.label} width={640} height={320} unoptimized className="max-h-56 w-full rounded-lg object-contain" />
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500">{field.placeholder || 'Upload an image for this response field.'}</p>
                              )}
                            </div>
                          ) : (
                            <Input
                              type={
                                field.type === 'number'
                                  ? 'number'
                                  : field.type === 'email'
                                    ? 'email'
                                    : field.type === 'date'
                                      ? 'date'
                                      : field.type === 'tel'
                                        ? 'tel'
                                        : field.type === 'url'
                                          ? 'url'
                                          : 'text'
                              }
                              value={editableData[field.name] || ''}
                              onChange={(event) => setEditableData((prev) => ({ ...prev, [field.name]: event.target.value }))}
                              placeholder={field.placeholder}
                            />
                          )}
                        </div>
                      ))}
                    </fieldset>
                    {documentData.dataCollectionEnabled ? (
                      <div className="mt-5 space-y-4">
                        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={downloadCopyAfterSubmit}
                            onChange={(event) => setDownloadCopyAfterSubmit(event.target.checked)}
                          />
                          Download my form copy automatically after submit
                        </label>
                        <div className={`flex flex-wrap items-center gap-3 ${submitButtonWidth === 'fit' ? 'justify-between' : 'justify-between'}`}>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <PencilLine className="h-4 w-4" />
                            {allowSingleEditAfterSubmit
                              ? hasReachedSubmissionLimit
                                ? 'Your allowed edit window is complete.'
                                : `You can update this form ${remainingFormEdits} more time${remainingFormEdits === 1 ? '' : 's'} after this state.`
                              : 'This form locks immediately after the first submission.'}
                          </div>
                          <Button onClick={() => void saveEdits()} disabled={isSavingEdits || hasReachedSubmissionLimit} className={submitButtonWidth === 'fit' ? 'w-auto px-6' : 'w-full sm:w-full'}>
                            {isSavingEdits ? 'Saving...' : hasReachedSubmissionLimit ? 'Submission locked' : submitActionLabel}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-4 flex justify-end">
                        <Button onClick={() => void saveEdits()} disabled={isSavingEdits}>
                          {isSavingEdits ? 'Saving...' : 'Save Document Updates'}
                        </Button>
                      </div>
                    )}
                    {documentData.dataCollectionEnabled && showSubmissionHistory && showEditHistory && formSubmissionHistory.length > 0 ? (
                      <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <p className="text-sm font-semibold text-slate-900">Submission history</p>
                        </div>
                        <div className="mt-4 space-y-3">
                          {formSubmissionHistory.map((submission, index) => (
                            <div key={submission.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900">Version {formSubmissionHistory.length - index}</p>
                                  <p className="text-xs text-slate-500">
                                    {submission.submittedBy} • {new Date(submission.submittedAt).toLocaleString()}
                                  </p>
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  {index === 0 ? 'Latest' : 'Saved'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {documentData.dataCollectionEnabled ? (
                      <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[11px] leading-6 text-slate-500">
                        <p>By submitting this form, you confirm the information shared is accurate to the best of your knowledge.</p>
                        <p className="mt-1">
                          Use of this form is governed by{' '}
                          <a href="/terms-and-conditions" className="font-medium text-slate-700 underline underline-offset-4">Terms & Conditions</a>
                          {' '}and{' '}
                          <a href="/privacy-policy" className="font-medium text-slate-700 underline underline-offset-4">Privacy Policy</a>.
                        </p>
                        <p className="mt-1">Copyright (c) Corescent Technologies Private Limited.</p>
                      </div>
                    ) : null}
                  </div>
                )}

                {!documentData.dataCollectionEnabled ? (
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
                ) : null}
              </div>
            )}

            {isUnlocked && documentData?.hasRecipientSignature && (
              <div className="rounded-2xl border bg-emerald-50 p-4 text-sm text-emerald-800">
                <p>
                  Recipient signature captured from {documentData.recipientSignerName} on {documentData.recipientSignedAt ? new Date(documentData.recipientSignedAt).toLocaleString() : 'Unknown time'}{documentData.recipientSignedIp ? ` from ${documentData.recipientSignedIp}` : ''}{documentData.recipientSignedLocationLabel ? ` at ${documentData.recipientSignedLocationLabel}` : ''}{documentData.recipientSignatureSource ? ` using ${documentData.recipientSignatureSource} signature` : ''}.
                </p>
                {documentData.recipientAadhaarVerifiedAt ? (
                  <div className="mt-3 rounded-2xl border border-emerald-200 bg-white/70 p-3">
                    <p className="font-semibold text-emerald-900">Aadhaar verification completed</p>
                    <p className="mt-1">
                      Verified {documentData.recipientAadhaarMaskedId || 'identity'} on {new Date(documentData.recipientAadhaarVerifiedAt).toLocaleString()}
                      {documentData.recipientAadhaarProviderLabel ? ` via ${documentData.recipientAadhaarProviderLabel}` : ''}
                      {documentData.recipientAadhaarReferenceId ? ` • Ref: ${documentData.recipientAadhaarReferenceId}` : ''}
                    </p>
                    {documentData.recipientAadhaarVerifiedIp ? (
                      <p className="mt-1">Verification IP: {documentData.recipientAadhaarVerifiedIp}</p>
                    ) : null}
                  </div>
                ) : null}
                {documentData.recipientPhotoDataUrl ? (
                  <div className="mt-3 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-white/70 p-3">
                    <Image src={documentData.recipientPhotoDataUrl} alt="Signer live evidence" width={96} height={96} unoptimized className="h-24 w-24 rounded-2xl border border-emerald-200 object-cover bg-white" />
                    <div className="min-w-0">
                      <p className="font-semibold text-emerald-900">Live signer photo evidence attached</p>
                      <p className="mt-1">Captured at {documentData.recipientPhotoCapturedAt ? new Date(documentData.recipientPhotoCapturedAt).toLocaleString() : 'Unknown time'}</p>
                      <p className="mt-1">Capture IP: {documentData.recipientPhotoCapturedIp || 'unknown'}</p>
                      <p className="mt-1">Method: {documentData.recipientPhotoCaptureMethod === 'live_camera' ? 'Live camera capture' : 'Recorded evidence'}</p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
