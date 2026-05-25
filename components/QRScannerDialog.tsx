'use client';

/**
 * QRScannerDialog — built-in QR code scanner for DocDrive.
 *
 * Modes:
 *  1. Camera  — getUserMedia + BarcodeDetector (Chromium native)
 *  2. Upload  — drop / choose image → BarcodeDetector.detect(img)
 *  3. Manual  — paste / type share URL or token directly
 *
 * On successful scan:
 *  - Parses token from URL  /share/<token>  or bare token
 *  - Loads share record from shareStore
 *  - Shows permission preview card
 *  - "Add to Drive" → markAddedToScan + drives onFileAdded callback
 *  - Edit/Admin permission → "Join Live Session" via useCollabSession
 */

import {
  useCallback, useEffect, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';
import {
  X, Camera, Upload, Link2, CheckCircle2, AlertTriangle,
  FileText, Folder, Users, Zap, ShieldCheck, Eye, MessageSquare,
  QrCode, Loader2, RotateCcw, RefreshCw,
} from 'lucide-react';
import {
  getShare, markAddedToScan, recordAccess,
  type ShareRecord, type SharePermission,
  PERMISSION_LABELS, PERMISSION_DESCRIPTIONS, PERMISSION_COLOR,
} from '@/lib/shareStore';
import { useCollabSession, avatarInitials } from '@/lib/collabSession';

/* ─── Types ──────────────────────────────────────────────────────────────── */

export interface AddedShareFile {
  token:      string;
  name:       string;
  kind:       'file' | 'folder';
  fileKind?:  string;
  permission: SharePermission;
  shareUrl:   string;
}

export interface QRScannerDialogProps {
  open:        boolean;
  onClose:     () => void;
  /** Called when user confirms "Add to Drive" */
  onFileAdded?: (file: AddedShareFile) => void;
  /** Base URL for share links (defaults to window.location.origin) */
  baseUrl?:    string;
  /** Current user's name for collab presence */
  userName?:   string;
  /** Current user's ID for dedup */
  userId?:     string;
}

type ScannerMode = 'camera' | 'upload' | 'manual';
type ScanStage   = 'scanning' | 'preview' | 'added' | 'error';

/* ─── BarcodeDetector shim type ─────────────────────────────────────────── */

interface BarcodeDetectorResult { rawValue: string; format: string; }
interface BarcodeDetectorAPI {
  detect(src: ImageBitmapSource): Promise<BarcodeDetectorResult[]>;
}
declare const BarcodeDetector: {
  new(opts?: { formats: string[] }): BarcodeDetectorAPI;
  getSupportedFormats?(): Promise<string[]>;
};

/* ─── Permission icon map ────────────────────────────────────────────────── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PERM_ICONS: Record<SharePermission, React.ComponentType<any>> = {
  read:    Eye,
  comment: MessageSquare,
  edit:    Zap,
  admin:   ShieldCheck,
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function parseToken(raw: string): string | null {
  raw = raw.trim();
  // /share/<token>  or  http://host/share/<token>
  const m = raw.match(/\/share\/([A-Za-z0-9_-]{6,})/);
  if (m) return m[1];
  // bare token (6-20 url-safe chars)
  if (/^[A-Za-z0-9_-]{6,20}$/.test(raw)) return raw;
  return null;
}

/* ─── Styles ─────────────────────────────────────────────────────────────── */

const QRS_STYLES = `
@keyframes qsc-in {
  from { opacity:0; transform:translateY(20px) scale(.97); }
  to   { opacity:1; transform:translateY(0)    scale(1);   }
}
@keyframes qsc-scan {
  0%   { top: 8%;  }
  50%  { top: 86%; }
  100% { top: 8%;  }
}
@keyframes qsc-spin { to { transform: rotate(360deg); } }
@keyframes qsc-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }

.qsc-dialog {
  animation: qsc-in .22s cubic-bezier(.4,0,.2,1) both;
}
.qsc-scan-line {
  animation: qsc-scan 2s ease-in-out infinite;
}
.qsc-spinner {
  animation: qsc-spin .8s linear infinite;
}
.qsc-pulse {
  animation: qsc-pulse 1.6s ease-in-out infinite;
}
`;

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function QRScannerDialog({
  open, onClose, onFileAdded,
  baseUrl, userName = 'Anonymous', userId = 'guest',
}: QRScannerDialogProps) {
  const [mode,       setMode]       = useState<ScannerMode>('camera');
  const [stage,      setStage]      = useState<ScanStage>('scanning');
  const [token,      setToken]      = useState<string | null>(null);
  const [share,      setShare]      = useState<ShareRecord | null>(null);
  const [errMsg,     setErrMsg]     = useState('');
  const [manualVal,  setManualVal]  = useState('');
  const [camError,   setCamError]   = useState('');
  const [camReady,   setCamReady]   = useState(false);
  const [password,   setPassword]   = useState('');
  const [pwdError,   setPwdError]   = useState('');
  const [adding,     setAdding]     = useState(false);
  const [added,      setAdded]      = useState(false);
  const [joinCollab, setJoinCollab] = useState(false);
  const [dragOver,   setDragOver]   = useState(false);
  const [hasBD,      setHasBD]      = useState(false);
  const [mounted,    setMounted]    = useState(false);

  const videoRef      = useRef<HTMLVideoElement>(null);
  const canvasRef     = useRef<HTMLCanvasElement>(null);
  const streamRef     = useRef<MediaStream | null>(null);
  const rafRef        = useRef<number | null>(null);
  const detectorRef   = useRef<BarcodeDetectorAPI | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  /* collab session — only active when joinCollab=true and token is set */
  const collabToken = joinCollab && token && share?.permission !== 'read' ? token : null;
  const collab = useCollabSession(collabToken, userName);

  /* ── mount / BarcodeDetector support check ── */
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setHasBD('BarcodeDetector' in window);
  }, []);

  /* ── reset on open ── */
  useEffect(() => {
    if (!open) return;
    setMode('camera');
    setStage('scanning');
    setToken(null);
    setShare(null);
    setErrMsg('');
    setManualVal('');
    setCamError('');
    setCamReady(false);
    setPassword('');
    setPwdError('');
    setAdding(false);
    setAdded(false);
    setJoinCollab(false);
  }, [open]);

  /* ── camera lifecycle ── */
  useEffect(() => {
    if (!open || mode !== 'camera') return;

    let cancelled = false;

    async function startCamera() {
      setCamReady(false);
      setCamError('');
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setCamReady(true);

        if (hasBD) {
          try {
            detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] });
          } catch { /* fallback */ }
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : 'Camera unavailable';
        if (msg.includes('Permission') || msg.includes('NotAllowed')) {
          setCamError('Camera permission denied. Switch to Upload or Manual mode.');
        } else {
          setCamError(`Camera unavailable: ${msg}`);
        }
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      stopCamera();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, hasBD]);

  /* ── scan loop ── */
  useEffect(() => {
    if (!camReady || !hasBD || stage !== 'scanning') return;
    let alive = true;

    async function tick() {
      if (!alive || !videoRef.current || !canvasRef.current || !detectorRef.current) return;
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState < 2) { rafRef.current = requestAnimationFrame(tick); return; }
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      try {
        const results = await detectorRef.current.detect(canvas);
        if (!alive) return;
        if (results.length > 0) {
          handleRawScan(results[0].rawValue);
          return;
        }
      } catch { /* keep scanning */ }
      if (alive) rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      alive = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camReady, hasBD, stage]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }

  /* ── handle decoded QR value ── */
  const handleRawScan = useCallback((raw: string) => {
    const tok = parseToken(raw);
    if (!tok) {
      setErrMsg('QR code doesn\'t contain a valid share link.');
      setStage('error');
      return;
    }
    const rec = getShare(tok);
    if (!rec) {
      setErrMsg('Share not found or has expired / been revoked.');
      setStage('error');
      return;
    }
    recordAccess(tok);
    setToken(tok);
    setShare(rec);
    setStage('preview');
    stopCamera();
  }, []);

  /* ── image upload scan ── */
  async function scanImageFile(file: File) {
    if (!hasBD) {
      setErrMsg('QR detection not supported in this browser. Please use Chrome/Edge or paste the link manually.');
      setStage('error');
      return;
    }
    try {
      const bmp = await createImageBitmap(file);
      const results = await detectorRef.current!.detect(bmp);
      if (results.length === 0) {
        setErrMsg('No QR code found in the image.');
        setStage('error');
        return;
      }
      handleRawScan(results[0].rawValue);
    } catch {
      setErrMsg('Could not read the image file.');
      setStage('error');
    }
  }

  function handleUploadChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) void scanImageFile(file);
    e.target.value = '';
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void scanImageFile(file);
  }

  /* ── manual input ── */
  function submitManual() {
    if (!manualVal.trim()) return;
    handleRawScan(manualVal);
  }

  /* ── password check ── */
  function submitPassword() {
    if (!share) return;
    if (share.password && password !== share.password) {
      setPwdError('Incorrect password. Please try again.');
      return;
    }
    setPwdError('');
    setStage('preview'); // already in preview, just unlock
  }

  /* ── add to drive ── */
  async function handleAddToDrive() {
    if (!share || !token) return;

    if (share.password && password !== share.password) {
      setPwdError('Enter the password to access this share.');
      return;
    }

    setAdding(true);
    await new Promise(r => setTimeout(r, 600)); // UX delay

    markAddedToScan(token, userId);

    const origin = typeof window !== 'undefined' ? window.location.origin : (baseUrl ?? '');
    const url    = `${origin}/share/${token}`;

    onFileAdded?.({
      token,
      name:       share.itemName,
      kind:       share.kind,
      fileKind:   share.fileKind,
      permission: share.permission,
      shareUrl:   url,
    });

    setAdding(false);
    setAdded(true);
    setStage('added');
  }

  /* ── close ── */
  function handleClose() {
    stopCamera();
    onClose();
  }

  /* ── reset ── */
  function handleReset() {
    setStage('scanning');
    setToken(null);
    setShare(null);
    setErrMsg('');
    setPassword('');
    setPwdError('');
    setAdded(false);
    setAdding(false);
    if (mode === 'camera') {
      // restart camera
      setMode('upload');
      setTimeout(() => setMode('camera'), 50);
    }
  }

  if (!mounted || !open) return null;

  const origin       = typeof window !== 'undefined' ? window.location.origin : (baseUrl ?? '');
  const permColor    = share ? PERMISSION_COLOR[share.permission] : '#94a3b8';
  const PermIcon     = share ? PERM_ICONS[share.permission] : Eye;
  const needsPassword = !!(share?.password && password !== share.password && stage !== 'added');

  /* ─── Portal render ─────────────────────────────────────────────────────── */

  return createPortal(
    <>
      {/* global styles */}
      <style>{QRS_STYLES}</style>

      {/* backdrop */}
      <div
        onClick={handleClose}
        style={{
          position:'fixed', inset:0, zIndex:99990,
          background:'rgba(0,0,0,.65)', backdropFilter:'blur(6px)',
        }}
      />

      {/* dialog */}
      <div
        className="qsc-dialog"
        style={{
          position:'fixed', zIndex:99991,
          top:'50%', left:'50%',
          transform:'translate(-50%,-50%)',
          width:'min(520px,94vw)',
          maxHeight:'90vh',
          overflowY:'auto',
          background:'#0d0d18',
          border:'1px solid rgba(255,255,255,.09)',
          borderRadius:16,
          boxShadow:'0 24px 80px rgba(0,0,0,.7)',
          fontFamily:'system-ui,sans-serif',
        }}
      >
        {/* ─── Header ─── */}
        <div style={{
          display:'flex', alignItems:'center', gap:10,
          padding:'18px 20px 14px',
          borderBottom:'1px solid rgba(255,255,255,.07)',
        }}>
          <div style={{
            width:36, height:36, borderRadius:10,
            background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
          }}>
            <QrCode size={18} color="#fff" />
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontWeight:700, fontSize:15, color:'#f1f5f9' }}>Scan QR Code</div>
            <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>
              Point at a DocDrive share QR to instantly add it to your drive
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              background:'rgba(255,255,255,.06)', border:'none',
              borderRadius:8, padding:'6px 8px', cursor:'pointer', color:'#94a3b8',
              display:'flex', alignItems:'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ─── Mode tabs (only during scanning) ─── */}
        {stage === 'scanning' && (
          <div style={{
            display:'flex', gap:4, padding:'12px 20px 8px',
          }}>
            {(['camera','upload','manual'] as ScannerMode[]).map(m => {
              const icons = { camera: Camera, upload: Upload, manual: Link2 };
              const labels = { camera: 'Camera', upload: 'Upload Image', manual: 'Paste Link' };
              const Icon = icons[m];
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); setErrMsg(''); }}
                  style={{
                    flex:1, display:'flex', alignItems:'center', justifyContent:'center',
                    gap:5, padding:'7px 0', borderRadius:8, cursor:'pointer',
                    border:'1px solid',
                    borderColor: mode===m ? '#6366f1' : 'rgba(255,255,255,.08)',
                    background:  mode===m ? 'rgba(99,102,241,.18)' : 'transparent',
                    color:       mode===m ? '#a5b4fc' : '#64748b',
                    fontSize:12, fontWeight:600, transition:'all .15s',
                  }}
                >
                  <Icon size={13} />
                  {labels[m]}
                </button>
              );
            })}
          </div>
        )}

        {/* ─── Body ─── */}
        <div style={{ padding:'8px 20px 20px' }}>

          {/* ═══ Camera mode ═══ */}
          {stage === 'scanning' && mode === 'camera' && (
            <div>
              {camError ? (
                <div style={{
                  borderRadius:12, background:'rgba(239,68,68,.1)',
                  border:'1px solid rgba(239,68,68,.25)',
                  padding:16, textAlign:'center', color:'#fca5a5', fontSize:13,
                  marginBottom:12,
                }}>
                  <AlertTriangle size={20} style={{ marginBottom:6 }} />
                  <div>{camError}</div>
                </div>
              ) : (
                <div style={{ position:'relative', borderRadius:12, overflow:'hidden', background:'#000' }}>
                  {/* video */}
                  <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{ display:'block', width:'100%', aspectRatio:'4/3', objectFit:'cover' }}
                  />
                  {/* hidden canvas for decode */}
                  <canvas ref={canvasRef} style={{ display:'none' }} />

                  {/* scan overlay */}
                  <div style={{
                    position:'absolute', inset:0,
                    background:'linear-gradient(rgba(0,0,0,.3) 0%, transparent 20%, transparent 80%, rgba(0,0,0,.3) 100%)',
                    pointerEvents:'none',
                  }}>
                    {/* corner brackets */}
                    {[
                      { top:12, left:12,  borderTop:'3px solid #6366f1', borderLeft:'3px solid #6366f1' },
                      { top:12, right:12, borderTop:'3px solid #6366f1', borderRight:'3px solid #6366f1' },
                      { bottom:12, left:12,  borderBottom:'3px solid #6366f1', borderLeft:'3px solid #6366f1' },
                      { bottom:12, right:12, borderBottom:'3px solid #6366f1', borderRight:'3px solid #6366f1' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        position:'absolute', width:28, height:28, borderRadius:3, ...s,
                      }} />
                    ))}
                    {/* scan line */}
                    {camReady && (
                      <div
                        className="qsc-scan-line"
                        style={{
                          position:'absolute', left:'5%', right:'5%', height:2,
                          background:'linear-gradient(90deg, transparent, #6366f1, #a5b4fc, #6366f1, transparent)',
                          boxShadow:'0 0 8px #6366f1',
                          borderRadius:1,
                        }}
                      />
                    )}
                  </div>

                  {/* loading state */}
                  {!camReady && (
                    <div style={{
                      position:'absolute', inset:0,
                      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                      background:'rgba(0,0,0,.6)', gap:10,
                    }}>
                      <Loader2 size={28} color="#6366f1" className="qsc-spinner" />
                      <span style={{ color:'#94a3b8', fontSize:13 }}>Starting camera…</span>
                    </div>
                  )}
                </div>
              )}

              {!hasBD && camReady && !camError && (
                <div style={{
                  marginTop:10, padding:'8px 12px', borderRadius:8,
                  background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.2)',
                  color:'#fcd34d', fontSize:12,
                }}>
                  <AlertTriangle size={12} style={{ display:'inline', marginRight:5 }} />
                  QR detection requires Chrome or Edge. Camera preview only — use Upload or Paste Link instead.
                </div>
              )}

              <div style={{ textAlign:'center', marginTop:10, color:'#475569', fontSize:12 }}>
                {camReady && hasBD
                  ? 'Scanning automatically — hold a QR code in frame'
                  : 'Position the QR code within the frame'}
              </div>
            </div>
          )}

          {/* ═══ Upload mode ═══ */}
          {stage === 'scanning' && mode === 'upload' && (
            <div>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => uploadInputRef.current?.click()}
                style={{
                  borderRadius:12, border:'2px dashed',
                  borderColor: dragOver ? '#6366f1' : 'rgba(255,255,255,.12)',
                  background:  dragOver ? 'rgba(99,102,241,.08)' : 'rgba(255,255,255,.02)',
                  padding:'40px 24px', textAlign:'center', cursor:'pointer',
                  transition:'all .15s',
                }}
              >
                <div style={{
                  width:52, height:52, borderRadius:14,
                  background:'rgba(99,102,241,.15)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  margin:'0 auto 14px',
                }}>
                  <Upload size={22} color="#818cf8" />
                </div>
                <div style={{ color:'#e2e8f0', fontWeight:600, fontSize:14, marginBottom:5 }}>
                  Drop QR image here
                </div>
                <div style={{ color:'#64748b', fontSize:12 }}>
                  or click to browse — PNG, JPG, WEBP accepted
                </div>
              </div>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                style={{ display:'none' }}
                onChange={handleUploadChange}
              />

              {!hasBD && (
                <div style={{
                  marginTop:10, padding:'8px 12px', borderRadius:8,
                  background:'rgba(251,191,36,.08)', border:'1px solid rgba(251,191,36,.2)',
                  color:'#fcd34d', fontSize:12,
                }}>
                  <AlertTriangle size={12} style={{ display:'inline', marginRight:5 }} />
                  Image QR detection requires Chrome or Edge. Use the Paste Link tab instead.
                </div>
              )}
            </div>
          )}

          {/* ═══ Manual mode ═══ */}
          {stage === 'scanning' && mode === 'manual' && (
            <div>
              <div style={{ color:'#94a3b8', fontSize:12, marginBottom:8 }}>
                Paste a DocDrive share URL or bare token:
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <input
                  value={manualVal}
                  onChange={e => setManualVal(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitManual()}
                  placeholder={`${origin}/share/AbCdEfGhI  or  AbCdEfGhI`}
                  style={{
                    flex:1, background:'rgba(255,255,255,.05)',
                    border:'1px solid rgba(255,255,255,.12)',
                    borderRadius:9, padding:'9px 12px',
                    color:'#f1f5f9', fontSize:13, outline:'none',
                  }}
                  autoFocus
                />
                <button
                  onClick={submitManual}
                  disabled={!manualVal.trim()}
                  style={{
                    padding:'9px 16px', borderRadius:9, border:'none',
                    background: manualVal.trim() ? '#6366f1' : 'rgba(99,102,241,.25)',
                    color: manualVal.trim() ? '#fff' : '#64748b',
                    fontWeight:600, fontSize:13, cursor: manualVal.trim() ? 'pointer' : 'not-allowed',
                    transition:'all .15s',
                  }}
                >
                  Go
                </button>
              </div>
            </div>
          )}

          {/* ═══ Error state ═══ */}
          {stage === 'error' && (
            <div style={{
              borderRadius:12, background:'rgba(239,68,68,.08)',
              border:'1px solid rgba(239,68,68,.2)',
              padding:24, textAlign:'center',
            }}>
              <AlertTriangle size={32} color="#f87171" style={{ marginBottom:10 }} />
              <div style={{ color:'#fca5a5', fontWeight:600, marginBottom:8 }}>{errMsg}</div>
              <button
                onClick={handleReset}
                style={{
                  marginTop:4, padding:'8px 20px', borderRadius:8,
                  background:'rgba(239,68,68,.18)', border:'1px solid rgba(239,68,68,.3)',
                  color:'#fca5a5', fontWeight:600, fontSize:13, cursor:'pointer',
                  display:'inline-flex', alignItems:'center', gap:6,
                }}
              >
                <RotateCcw size={13} /> Try Again
              </button>
            </div>
          )}

          {/* ═══ Preview state ═══ */}
          {(stage === 'preview' || stage === 'added') && share && token && (
            <div>
              {/* share info card */}
              <div style={{
                borderRadius:12, border:'1px solid rgba(255,255,255,.09)',
                background:'rgba(255,255,255,.03)', padding:16, marginBottom:14,
              }}>
                {/* file header */}
                <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                  <div style={{
                    width:44, height:44, borderRadius:11,
                    background:'rgba(99,102,241,.18)',
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>
                    {share.kind === 'folder'
                      ? <Folder size={22} color="#818cf8" />
                      : <FileText size={22} color="#818cf8" />}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{
                      fontWeight:700, fontSize:15, color:'#f1f5f9',
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    }}>
                      {share.itemName}
                    </div>
                    <div style={{ fontSize:12, color:'#64748b', marginTop:2 }}>
                      Shared by {share.ownerName}
                      {share.fileKind && ` · ${share.fileKind.toUpperCase()}`}
                    </div>
                  </div>
                </div>

                {/* permission badge */}
                <div style={{
                  marginTop:14, padding:'10px 14px', borderRadius:9,
                  background:`${permColor}12`, border:`1px solid ${permColor}30`,
                  display:'flex', alignItems:'center', gap:10,
                }}>
                  <PermIcon size={16} color={permColor} />
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:permColor }}>
                      {PERMISSION_LABELS[share.permission]}
                    </div>
                    <div style={{ fontSize:11, color:'#64748b', marginTop:1 }}>
                      {PERMISSION_DESCRIPTIONS[share.permission]}
                    </div>
                  </div>
                </div>

                {/* metadata row */}
                <div style={{
                  display:'flex', gap:16, marginTop:12,
                  color:'#475569', fontSize:12,
                }}>
                  <span>
                    Accessed: {share.accessCount}×
                  </span>
                  {share.expiresAt && (
                    <span>
                      Expires: {new Date(share.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                  {share.addedBy.length > 0 && (
                    <span>
                      <Users size={11} style={{ display:'inline', marginRight:3 }} />
                      {share.addedBy.length} added
                    </span>
                  )}
                </div>
              </div>

              {/* password gate */}
              {share.password && !added && (
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, color:'#94a3b8', marginBottom:6 }}>
                    This share is password-protected:
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <input
                      type="password"
                      value={password}
                      onChange={e => { setPassword(e.target.value); setPwdError(''); }}
                      onKeyDown={e => e.key === 'Enter' && submitPassword()}
                      placeholder="Enter share password…"
                      style={{
                        flex:1, background:'rgba(255,255,255,.05)',
                        border:`1px solid ${pwdError ? '#ef4444' : 'rgba(255,255,255,.12)'}`,
                        borderRadius:9, padding:'9px 12px',
                        color:'#f1f5f9', fontSize:13, outline:'none',
                      }}
                    />
                  </div>
                  {pwdError && (
                    <div style={{ color:'#f87171', fontSize:12, marginTop:5 }}>{pwdError}</div>
                  )}
                </div>
              )}

              {/* collab section for edit/admin */}
              {(share.permission === 'edit' || share.permission === 'admin') && !added && (
                <div style={{
                  marginBottom:14, padding:'12px 14px', borderRadius:10,
                  background:'rgba(52,211,153,.06)', border:'1px solid rgba(52,211,153,.2)',
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
                    <Zap size={14} color="#34d399" />
                    <span style={{ fontWeight:600, fontSize:13, color:'#6ee7b7' }}>Live Collaboration Available</span>
                  </div>

                  {!joinCollab ? (
                    <button
                      onClick={() => setJoinCollab(true)}
                      style={{
                        width:'100%', padding:'8px 0', borderRadius:8, border:'none',
                        background:'rgba(52,211,153,.18)', cursor:'pointer',
                        color:'#6ee7b7', fontWeight:600, fontSize:13,
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      }}
                    >
                      <Users size={13} /> Join Collab Session
                    </button>
                  ) : (
                    <div>
                      {collab.connected ? (
                        <div>
                          <div style={{
                            display:'flex', alignItems:'center', gap:6,
                            color:'#34d399', fontSize:12, marginBottom:8,
                          }}>
                            <span className="qsc-pulse" style={{
                              width:7, height:7, borderRadius:'50%', background:'#34d399', display:'inline-block',
                            }} />
                            Connected · {collab.users.length} online
                          </div>
                          {/* avatars */}
                          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                            {collab.users.slice(0, 6).map(u => (
                              <div key={u.sessionId} title={u.name} style={{
                                width:26, height:26, borderRadius:'50%',
                                background:u.color, display:'flex',
                                alignItems:'center', justifyContent:'center',
                                fontSize:10, fontWeight:700, color:'#fff',
                              }}>
                                {avatarInitials(u.name)}
                              </div>
                            ))}
                            {collab.users.length > 6 && (
                              <div style={{
                                width:26, height:26, borderRadius:'50%',
                                background:'rgba(255,255,255,.1)',
                                display:'flex', alignItems:'center', justifyContent:'center',
                                fontSize:10, color:'#94a3b8',
                              }}>
                                +{collab.users.length - 6}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ display:'flex', alignItems:'center', gap:8, color:'#94a3b8', fontSize:12 }}>
                          <Loader2 size={13} className="qsc-spinner" />
                          Connecting to collab session…
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Added confirmation ── */}
              {stage === 'added' && (
                <div style={{
                  padding:'14px 16px', borderRadius:10,
                  background:'rgba(99,102,241,.1)', border:'1px solid rgba(99,102,241,.25)',
                  display:'flex', alignItems:'center', gap:12, marginBottom:14,
                }}>
                  <CheckCircle2 size={22} color="#818cf8" />
                  <div>
                    <div style={{ fontWeight:600, color:'#a5b4fc', fontSize:14 }}>
                      Added to your Drive!
                    </div>
                    <div style={{ color:'#64748b', fontSize:12, marginTop:2 }}>
                      "{share.itemName}" is now in your Drive
                    </div>
                  </div>
                </div>
              )}

              {/* ── Action buttons ── */}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                {stage === 'preview' && (
                  <>
                    <button
                      onClick={handleReset}
                      style={{
                        flex:1, padding:'10px 0', borderRadius:9,
                        background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                        color:'#94a3b8', fontWeight:600, fontSize:13, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      }}
                    >
                      <RefreshCw size={13} /> Scan Another
                    </button>
                    <button
                      onClick={handleAddToDrive}
                      disabled={adding || (!!share.password && password !== share.password)}
                      style={{
                        flex:2, padding:'10px 0', borderRadius:9, border:'none',
                        background: (adding || (!!share.password && password !== share.password))
                          ? 'rgba(99,102,241,.25)'
                          : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: (adding || (!!share.password && password !== share.password)) ? '#64748b' : '#fff',
                        fontWeight:700, fontSize:13, cursor:
                          (adding || (!!share.password && password !== share.password)) ? 'not-allowed' : 'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                        transition:'all .15s',
                      }}
                    >
                      {adding
                        ? <><Loader2 size={14} className="qsc-spinner" /> Adding…</>
                        : <><CheckCircle2 size={14} /> Add to Drive</>}
                    </button>
                  </>
                )}
                {stage === 'added' && (
                  <>
                    <button
                      onClick={handleReset}
                      style={{
                        flex:1, padding:'10px 0', borderRadius:9,
                        background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)',
                        color:'#94a3b8', fontWeight:600, fontSize:13, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                      }}
                    >
                      <QrCode size={13} /> Scan Another
                    </button>
                    <button
                      onClick={handleClose}
                      style={{
                        flex:2, padding:'10px 0', borderRadius:9, border:'none',
                        background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color:'#fff', fontWeight:700, fontSize:13, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:7,
                      }}
                    >
                      <CheckCircle2 size={14} /> Done
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
}
