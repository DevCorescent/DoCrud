'use client';

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  Eraser, PenLine, MousePointer2, Type, Square, Circle, Minus,
  ArrowRight, StickyNote, Highlighter, ZoomIn, ZoomOut, Undo2, Redo2,
  Download, Share2, Copy, Trash2, Plus, Hand, Link2, Users, X,
  Check, Pen, ChevronDown, Maximize2, Minimize2, Layers, Lock, QrCode,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

// ─── Supabase realtime (graceful if env vars missing) ────────────────────────
let supabaseClient: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null;
function getSupabase() {
  if (supabaseClient) return supabaseClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  if (!url || !key) return null;
  // dynamic import avoided — use the browser client from utils instead
  try {
    const { createBrowserClient } = require('@supabase/ssr') as typeof import('@supabase/ssr');
    supabaseClient = createBrowserClient(url, key);
    return supabaseClient;
  } catch { return null; }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type Tool =
  | 'select' | 'pan'
  | 'pen' | 'marker' | 'highlighter' | 'eraser'
  | 'line' | 'arrow' | 'rect' | 'circle' | 'triangle'
  | 'text' | 'sticky';

type BgType = 'white' | 'dark' | 'grid' | 'dots' | 'lines';
type Pt = { x: number; y: number; p: number };

type DrawElement = {
  id: string;
  ownerId?: string;        // userId who drew it — used for collab awareness
  tool: Tool;
  color: string;
  width: number;
  opacity: number;
  pts?: Pt[];
  x1?: number; y1?: number; x2?: number; y2?: number;
  text?: string; fontSize?: number;
  x?: number; y?: number;
  noteColor?: string;
  filled?: boolean;
};

type Board = {
  id: string;
  name: string;
  elements: DrawElement[];
  bg: BgType;
  createdAt: number;
  updatedAt: number;
};

type CollabUser = {
  userId: string;
  name: string;
  color: string;
  cursor: { x: number; y: number } | null;
  online: boolean;
};

type RealtimeEvent =
  | { event: 'stroke_add';   payload: { element: DrawElement } }
  | { event: 'stroke_undo';  payload: { userId: string } }
  | { event: 'board_clear';  payload: { userId: string } }
  | { event: 'board_sync';   payload: { elements: DrawElement[]; from: string; seq: number } }
  | { event: 'cursor_move';  payload: { userId: string; x: number; y: number } }
  | { event: 'cursor_leave'; payload: { userId: string } };

// ─── Constants ────────────────────────────────────────────────────────────────

const COLLAB_COLORS = [
  '#ef4444','#f97316','#eab308','#22c55e',
  '#3b82f6','#8b5cf6','#ec4899','#14b8a6',
];

const COLOURS = [
  '#1a1a1a','#ffffff','#ef4444','#f97316','#eab308',
  '#22c55e','#3b82f6','#8b5cf6','#ec4899','#14b8a6',
  '#f59e0b','#6366f1',
];

const STICKY_COLOURS = ['#fef08a','#bbf7d0','#bae6fd','#fecaca','#e9d5ff','#fed7aa'];

const TOOL_GROUPS: { label: string; tools: { id: Tool; icon: React.ReactNode; tip: string }[] }[] = [
  {
    label: 'Select',
    tools: [
      { id: 'select', icon: <MousePointer2 size={16} />, tip: 'Select (V)' },
      { id: 'pan',    icon: <Hand size={16} />,           tip: 'Pan (H)' },
    ],
  },
  {
    label: 'Draw',
    tools: [
      { id: 'pen',         icon: <Pen size={16} />,         tip: 'Pen (P)' },
      { id: 'marker',      icon: <PenLine size={16} />,     tip: 'Marker (M)' },
      { id: 'highlighter', icon: <Highlighter size={16} />, tip: 'Highlighter (L)' },
      { id: 'eraser',      icon: <Eraser size={16} />,      tip: 'Eraser (E)' },
    ],
  },
  {
    label: 'Shapes',
    tools: [
      { id: 'line',     icon: <Minus size={16} />,      tip: 'Line (1)' },
      { id: 'arrow',    icon: <ArrowRight size={16} />, tip: 'Arrow (2)' },
      { id: 'rect',     icon: <Square size={16} />,     tip: 'Rect (3)' },
      { id: 'circle',   icon: <Circle size={16} />,     tip: 'Ellipse (4)' },
      {
        id: 'triangle',
        icon: (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
            <path d="M8 2 L14 13 H2 Z" />
          </svg>
        ),
        tip: 'Triangle (5)',
      },
    ],
  },
  {
    label: 'Content',
    tools: [
      { id: 'text',   icon: <Type size={16} />,       tip: 'Text (T)' },
      { id: 'sticky', icon: <StickyNote size={16} />, tip: 'Sticky (N)' },
    ],
  },
];

const KEY_MAP: Record<string, Tool> = {
  v:'select', h:'pan', p:'pen', m:'marker', l:'highlighter', e:'eraser',
  '1':'line','2':'arrow','3':'rect','4':'circle','5':'triangle',
  t:'text', n:'sticky',
};

// ─── Canvas helpers ───────────────────────────────────────────────────────────

function uid() { return Math.random().toString(36).slice(2, 10); }

function makeBoard(name: string): Board {
  return { id: uid(), name, elements: [], bg: 'white', createdAt: Date.now(), updatedAt: Date.now() };
}

function screenToCanvas(x: number, y: number, pan: { x: number; y: number }, zoom: number) {
  return { x: (x - pan.x) / zoom, y: (y - pan.y) / zoom };
}

function canvasToScreen(x: number, y: number, pan: { x: number; y: number }, zoom: number) {
  return { x: x * zoom + pan.x, y: y * zoom + pan.y };
}

function drawFreehand(ctx: CanvasRenderingContext2D, pts: Pt[]) {
  if (!pts.length) return;
  if (pts.length === 1) {
    ctx.beginPath();
    ctx.arc(pts[0].x, pts[0].y, ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.stroke();
}

function drawArrowHead(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number) {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const hLen = Math.max(w * 4, 16);
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - hLen * Math.cos(angle - Math.PI / 6), y2 - hLen * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(x2 - hLen * Math.cos(angle + Math.PI / 6), y2 - hLen * Math.sin(angle + Math.PI / 6));
  ctx.closePath(); ctx.fill();
}

function renderElement(ctx: CanvasRenderingContext2D, el: DrawElement) {
  ctx.save();
  const isEraser = el.tool === 'eraser';
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
  ctx.globalAlpha = isEraser ? 1 : (el.tool === 'highlighter' ? Math.min(el.opacity, 0.38) : el.opacity);
  const col = isEraser ? 'rgba(0,0,0,1)' : el.color;
  ctx.strokeStyle = col; ctx.fillStyle = col;
  ctx.lineWidth = el.width;
  ctx.lineCap = el.tool === 'marker' ? 'butt' : 'round';
  ctx.lineJoin = el.tool === 'marker' ? 'miter' : 'round';

  switch (el.tool) {
    case 'pen': case 'marker': case 'highlighter': case 'eraser':
      drawFreehand(ctx, el.pts || []); break;
    case 'line':
      if (el.x1 !== undefined) { ctx.beginPath(); ctx.moveTo(el.x1, el.y1!); ctx.lineTo(el.x2!, el.y2!); ctx.stroke(); } break;
    case 'arrow':
      if (el.x1 !== undefined) drawArrowHead(ctx, el.x1, el.y1!, el.x2!, el.y2!, el.width); break;
    case 'rect':
      if (el.x1 !== undefined) {
        const rx = Math.min(el.x1, el.x2!), ry = Math.min(el.y1!, el.y2!);
        const rw = Math.abs(el.x2! - el.x1), rh = Math.abs(el.y2! - el.y1!);
        ctx.beginPath(); ctx.roundRect(rx, ry, rw, rh, 4);
        if (el.filled) { ctx.globalAlpha *= 0.15; ctx.fill(); ctx.globalAlpha /= 0.15; }
        ctx.stroke();
      } break;
    case 'circle':
      if (el.x1 !== undefined) {
        const cx = (el.x1 + el.x2!) / 2, cy = (el.y1! + el.y2!) / 2;
        const rx2 = Math.abs(el.x2! - el.x1) / 2, ry2 = Math.abs(el.y2! - el.y1!) / 2;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx2, ry2, 0, 0, Math.PI * 2);
        if (el.filled) { ctx.globalAlpha *= 0.15; ctx.fill(); ctx.globalAlpha /= 0.15; }
        ctx.stroke();
      } break;
    case 'triangle':
      if (el.x1 !== undefined) {
        ctx.beginPath();
        ctx.moveTo((el.x1 + el.x2!) / 2, el.y1!);
        ctx.lineTo(el.x2!, el.y2!); ctx.lineTo(el.x1, el.y2!);
        ctx.closePath();
        if (el.filled) { ctx.globalAlpha *= 0.15; ctx.fill(); ctx.globalAlpha /= 0.15; }
        ctx.stroke();
      } break;
    case 'text':
      if (el.text && el.x !== undefined) {
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = el.opacity;
        ctx.font = `${el.fontSize || 18}px -apple-system, BlinkMacSystemFont, sans-serif`;
        ctx.fillStyle = el.color;
        ctx.fillText(el.text, el.x, el.y!);
      } break;
    case 'sticky': {
      if (el.x === undefined) break;
      const sw = 200, sh = 160;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = el.opacity;
      ctx.shadowColor = 'rgba(0,0,0,0.15)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
      ctx.fillStyle = el.noteColor || '#fef08a';
      ctx.beginPath(); ctx.roundRect(el.x, el.y!, sw, sh, 4); ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.beginPath(); ctx.moveTo(el.x + sw - 24, el.y!); ctx.lineTo(el.x + sw, el.y! + 24); ctx.lineTo(el.x + sw - 24, el.y! + 24); ctx.closePath(); ctx.fill();
      if (el.text) {
        ctx.fillStyle = '#1a1a1a';
        ctx.font = `13px -apple-system, BlinkMacSystemFont, sans-serif`;
        el.text.split('\n').forEach((line, i) => ctx.fillText(line, el.x! + 12, el.y! + 28 + i * 18));
      }
      break;
    }
  }
  ctx.restore();
}

function renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number, bg: BgType, zoom: number, pan: { x: number; y: number }) {
  ctx.clearRect(0, 0, w, h);
  const dark = bg === 'dark';
  ctx.fillStyle = dark ? '#1a1b1e' : '#ffffff';
  ctx.fillRect(0, 0, w, h);
  const gs = 28 * zoom;
  const ox = ((pan.x % gs) + gs) % gs, oy = ((pan.y % gs) + gs) % gs;
  if (bg === 'grid') {
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'; ctx.lineWidth = 0.5;
    for (let x = ox - gs; x < w + gs; x += gs) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = oy - gs; y < h + gs; y += gs) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  } else if (bg === 'dots') {
    ctx.fillStyle = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.18)';
    for (let x = ox - gs; x < w + gs; x += gs)
      for (let y = oy - gs; y < h + gs; y += gs) { ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI * 2); ctx.fill(); }
  } else if (bg === 'lines') {
    const lg = 32 * zoom, lo = ((pan.y % lg) + lg) % lg;
    ctx.strokeStyle = dark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)'; ctx.lineWidth = 0.5;
    for (let y = lo - lg; y < h + lg; y += lg) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScratchpadCenter() {
  // boards
  const [boards, setBoards] = useState<Board[]>(() => {
    try { const s = localStorage.getItem('scratchpad:boards'); if (s) return JSON.parse(s); } catch { /**/ }
    return [makeBoard('Board 1')];
  });
  const [activeBoardId, setActiveBoardId] = useState<string>(() => boards[0]?.id || '');
  const [undoStack, setUndoStack] = useState<DrawElement[][]>([]);
  const [redoStack, setRedoStack] = useState<DrawElement[][]>([]);

  // tools
  const [tool, setTool]             = useState<Tool>('pen');
  const [color, setColor]           = useState('#1a1a1a');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [opacity, setOpacity]       = useState(1);
  const [filled, setFilled]         = useState(false);
  const [fontSize, setFontSize]     = useState(18);
  const [stickyColor, setStickyColor] = useState('#fef08a');

  // viewport
  const [zoom, setZoom] = useState(1);
  const [pan, setPan]   = useState({ x: 0, y: 0 });

  // interaction
  const [isDrawing, setIsDrawing] = useState(false);
  const currentElRef   = useRef<DrawElement | null>(null);
  const spaceRef       = useRef(false);
  const panStartRef    = useRef({ x: 0, y: 0, ox: 0, oy: 0 });
  const isPanningRef   = useRef(false);

  // text / sticky overlays
  const [textInput, setTextInput] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [textValue, setTextValue] = useState('');
  const [stickyInput, setStickyInput] = useState<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const [stickyValue, setStickyValue] = useState('');

  // collab
  const myUserId  = useRef(uid());
  const myColor   = useRef(COLLAB_COLORS[Math.floor(Math.random() * COLLAB_COLORS.length)]);
  const channelRef = useRef<any>(null);
  const [collabRoomId, setCollabRoomId] = useState<string | null>(null);
  const [collabActive, setCollabActive] = useState(false);
  const [collabUsers, setCollabUsers] = useState<CollabUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { x: number; y: number; name: string; color: string }>>({});
  const [collabStatus, setCollabStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const cursorThrottleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncSeqRef    = useRef(0);

  // ui
  const [shareOpen, setShareOpen]     = useState(false);
  const [collabOpen, setCollabOpen]   = useState(false);
  const [fullscreen, setFullscreen]   = useState(false);
  const [editingBoardName, setEditingBoardName] = useState<string | null>(null);
  const [boardNameDraft, setBoardNameDraft]     = useState('');
  const [showBoardPanel, setShowBoardPanel]     = useState(false);
  const [copied, setCopied] = useState(false);
  const [joinRoomInput, setJoinRoomInput] = useState('');
  const [collabEmail, setCollabEmail]   = useState('');
  const [collabEmails, setCollabEmails] = useState<string[]>([]);

  const bgCanvasRef   = useRef<HTMLCanvasElement>(null);
  const fgCanvasRef   = useRef<HTMLCanvasElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const rafRef        = useRef<number>(0);
  const dirtyRef      = useRef(true);

  const activeBoard = useMemo(
    () => boards.find((b) => b.id === activeBoardId) || boards[0],
    [boards, activeBoardId],
  );

  // ── Persistence ─────────────────────────────────────────────────────────────

  useEffect(() => {
    try { localStorage.setItem('scratchpad:boards', JSON.stringify(boards)); } catch { /**/ }
  }, [boards]);

  // ── Board helpers ────────────────────────────────────────────────────────────

  const updateBoard = useCallback((id: string, patch: Partial<Board>) => {
    setBoards((prev) => prev.map((b) => b.id === id ? { ...b, ...patch, updatedAt: Date.now() } : b));
    dirtyRef.current = true;
  }, []);

  const pushElements = useCallback((elements: DrawElement[], skipCollab = false) => {
    setUndoStack((prev) => [...prev.slice(-49), activeBoard.elements]);
    setRedoStack([]);
    updateBoard(activeBoard.id, { elements });
  }, [activeBoard, updateBoard]);

  const undo = useCallback(() => {
    if (!undoStack.length) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, activeBoard.elements]);
    setUndoStack((u) => u.slice(0, -1));
    updateBoard(activeBoard.id, { elements: prev });
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_undo', payload: { userId: myUserId.current } });
  }, [undoStack, activeBoard, updateBoard]);

  const redo = useCallback(() => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, activeBoard.elements]);
    setRedoStack((r) => r.slice(0, -1));
    updateBoard(activeBoard.id, { elements: next });
  }, [redoStack, activeBoard, updateBoard]);

  const clearBoard = useCallback(() => {
    pushElements([]);
    channelRef.current?.send({ type: 'broadcast', event: 'board_clear', payload: { userId: myUserId.current } });
  }, [pushElements]);

  // ── Canvas resize ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      [bgCanvasRef, fgCanvasRef].forEach((ref) => {
        const c = ref.current;
        if (!c) return;
        c.width = el.offsetWidth;
        c.height = el.offsetHeight;
      });
      dirtyRef.current = true;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Render loop ───────────────────────────────────────────────────────────────

  const renderAll = useCallback(() => {
    const bgC = bgCanvasRef.current, fgC = fgCanvasRef.current;
    if (!bgC || !fgC) return;
    const bgCtx = bgC.getContext('2d')!;
    const fgCtx = fgC.getContext('2d')!;
    const w = bgC.width, h = bgC.height;
    renderBackground(bgCtx, w, h, activeBoard.bg, zoom, pan);
    fgCtx.clearRect(0, 0, w, h);
    fgCtx.save();
    fgCtx.translate(pan.x, pan.y);
    fgCtx.scale(zoom, zoom);
    for (const el of activeBoard.elements) renderElement(fgCtx, el);
    if (currentElRef.current) renderElement(fgCtx, currentElRef.current);
    fgCtx.restore();
    dirtyRef.current = false;
  }, [activeBoard, zoom, pan]);

  useEffect(() => { dirtyRef.current = true; }, [activeBoard, zoom, pan]);

  useEffect(() => {
    const loop = () => { if (dirtyRef.current) renderAll(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [renderAll]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') { e.preventDefault(); spaceRef.current = true; return; }
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); return; }
      const t = KEY_MAP[e.key.toLowerCase()];
      if (t) setTool(t);
    };
    const up = (e: KeyboardEvent) => { if (e.code === 'Space') spaceRef.current = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, [undo, redo]);

  // ── Pointer helpers ───────────────────────────────────────────────────────────

  const getCoords = (e: React.PointerEvent) => {
    const rect = fgCanvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    return { screen: { x: sx, y: sy }, canvas: screenToCanvas(sx, sy, pan, zoom), pressure: e.pressure || 0.5 };
  };

  const isFreehand = (t: Tool) => ['pen','marker','highlighter','eraser'].includes(t);
  const isShape    = (t: Tool) => ['line','arrow','rect','circle','triangle'].includes(t);

  // throttled cursor broadcast
  const broadcastCursor = useCallback((cx: number, cy: number) => {
    if (!channelRef.current || !collabActive) return;
    if (cursorThrottleRef.current) return;
    cursorThrottleRef.current = setTimeout(() => {
      cursorThrottleRef.current = null;
      channelRef.current?.send({ type: 'broadcast', event: 'cursor_move', payload: { userId: myUserId.current, x: cx, y: cy } });
    }, 40);
  }, [collabActive]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    fgCanvasRef.current?.setPointerCapture(e.pointerId);
    if (spaceRef.current || tool === 'pan' || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX, y: e.clientY, ox: pan.x, oy: pan.y };
      return;
    }
    if (tool === 'text') {
      const { screen, canvas } = getCoords(e);
      setTextInput({ x: canvas.x, y: canvas.y, cx: screen.x, cy: screen.y });
      setTextValue('');
      return;
    }
    if (tool === 'sticky') {
      const { screen, canvas } = getCoords(e);
      setStickyInput({ x: canvas.x, y: canvas.y, cx: screen.x, cy: screen.y });
      setStickyValue('');
      return;
    }
    const { canvas, pressure } = getCoords(e);
    const newEl: DrawElement = {
      id: uid(), ownerId: myUserId.current, tool, color, width: strokeWidth, opacity, filled,
      ...(isFreehand(tool) ? { pts: [{ x: canvas.x, y: canvas.y, p: pressure }] } : {}),
      ...(isShape(tool)    ? { x1: canvas.x, y1: canvas.y, x2: canvas.x, y2: canvas.y } : {}),
    };
    currentElRef.current = newEl;
    setIsDrawing(true);
    dirtyRef.current = true;
  }, [tool, color, strokeWidth, opacity, filled, pan]);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const { screen, canvas, pressure } = getCoords(e);
    broadcastCursor(canvas.x, canvas.y);
    if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x, dy = e.clientY - panStartRef.current.y;
      setPan({ x: panStartRef.current.ox + dx, y: panStartRef.current.oy + dy });
      dirtyRef.current = true;
      return;
    }
    if (!isDrawing || !currentElRef.current) return;
    const el = currentElRef.current;
    if (isFreehand(el.tool)) {
      currentElRef.current = { ...el, pts: [...(el.pts || []), { x: canvas.x, y: canvas.y, p: pressure }] };
    } else if (isShape(el.tool)) {
      currentElRef.current = { ...el, x2: canvas.x, y2: canvas.y };
    }
    dirtyRef.current = true;
  }, [isDrawing, broadcastCursor]);

  const onPointerUp = useCallback(() => {
    isPanningRef.current = false;
    if (!isDrawing || !currentElRef.current) return;
    setIsDrawing(false);
    const el = currentElRef.current;
    const next = [...activeBoard.elements, el];
    pushElements(next);
    // broadcast to collaborators
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_add', payload: { element: el } });
    currentElRef.current = null;
    dirtyRef.current = true;
  }, [isDrawing, activeBoard.elements, pushElements]);

  const onWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = fgCanvasRef.current!.getBoundingClientRect();
      const mx = e.clientX - rect.left, my = e.clientY - rect.top;
      setZoom((z) => {
        const nz = Math.min(Math.max(z * factor, 0.1), 8);
        setPan((p) => ({ x: mx - (mx - p.x) * (nz / z), y: my - (my - p.y) * (nz / z) }));
        return nz;
      });
    } else {
      setPan((p) => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
    }
    dirtyRef.current = true;
  }, []);

  // ── Text / Sticky commit ──────────────────────────────────────────────────────

  const commitText = useCallback(() => {
    if (!textInput || !textValue.trim()) { setTextInput(null); return; }
    const el: DrawElement = {
      id: uid(), ownerId: myUserId.current, tool: 'text', color, width: 1, opacity,
      text: textValue, x: textInput.x, y: textInput.y, fontSize,
    };
    pushElements([...activeBoard.elements, el]);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_add', payload: { element: el } });
    setTextInput(null); setTextValue('');
  }, [textInput, textValue, color, opacity, fontSize, activeBoard.elements, pushElements]);

  const commitSticky = useCallback(() => {
    if (!stickyInput) { setStickyInput(null); return; }
    const el: DrawElement = {
      id: uid(), ownerId: myUserId.current, tool: 'sticky', color: '#1a1a1a', width: 1, opacity,
      text: stickyValue || 'Write something…', x: stickyInput.x, y: stickyInput.y, noteColor: stickyColor,
    };
    pushElements([...activeBoard.elements, el]);
    channelRef.current?.send({ type: 'broadcast', event: 'stroke_add', payload: { element: el } });
    setStickyInput(null); setStickyValue('');
  }, [stickyInput, stickyValue, stickyColor, opacity, activeBoard.elements, pushElements]);

  // ── Real-time Collaboration (Supabase Realtime) ──────────────────────────────

  const startCollaboration = useCallback(async (roomId: string, myName: string) => {
    const sb = getSupabase();
    if (!sb) { setCollabStatus('error'); return; }

    // tear down old channel
    if (channelRef.current) { await sb.removeChannel(channelRef.current); channelRef.current = null; }

    setCollabStatus('connecting');
    setCollabRoomId(roomId);

    const channel = sb.channel(`scratchpad-room:${roomId}`, {
      config: {
        broadcast: { self: false, ack: false },
        presence:  { key: myUserId.current },
      },
    });

    // ── Presence: track who is in the room ──
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState<{ name: string; color: string }>();
      const users: CollabUser[] = Object.entries(state).map(([userId, presences]) => {
        const p = (presences as any[])[0] || {};
        return { userId, name: p.name || 'User', color: p.color || '#6366f1', cursor: null, online: true };
      });
      setCollabUsers(users);
    });

    channel.on('presence', { event: 'join' }, ({ newPresences }: any) => {
      // Send full board to newly joined users so they sync up
      const seq = ++lastSyncSeqRef.current;
      channel.send({
        type: 'broadcast', event: 'board_sync',
        payload: { elements: activeBoard.elements, from: myUserId.current, seq },
      });
    });

    channel.on('presence', { event: 'leave' }, ({ leftPresences }: any) => {
      const leftIds = new Set((leftPresences as any[]).map((p: any) => p.key || p.userId));
      setRemoteCursors((prev) => {
        const next = { ...prev };
        leftIds.forEach((id: string) => delete next[id]);
        return next;
      });
    });

    // ── Broadcast: stroke events ──
    channel.on('broadcast', { event: 'stroke_add' }, ({ payload }: any) => {
      const el: DrawElement = payload.element;
      setBoards((prev) => prev.map((b) =>
        b.id === activeBoardId
          ? { ...b, elements: [...b.elements, el], updatedAt: Date.now() }
          : b
      ));
      dirtyRef.current = true;
    });

    channel.on('broadcast', { event: 'stroke_undo' }, ({ payload }: any) => {
      // Remote undo: remove last element from that user
      setBoards((prev) => prev.map((b) => {
        if (b.id !== activeBoardId) return b;
        const idx = [...b.elements].reverse().findIndex((el) => el.ownerId === payload.userId);
        if (idx === -1) return b;
        const realIdx = b.elements.length - 1 - idx;
        return { ...b, elements: b.elements.filter((_, i) => i !== realIdx), updatedAt: Date.now() };
      }));
      dirtyRef.current = true;
    });

    channel.on('broadcast', { event: 'board_clear' }, () => {
      setBoards((prev) => prev.map((b) => b.id === activeBoardId ? { ...b, elements: [], updatedAt: Date.now() } : b));
      dirtyRef.current = true;
    });

    channel.on('broadcast', { event: 'board_sync' }, ({ payload }: any) => {
      // Only accept if incoming seq is newer and we have fewer elements
      if (payload.from === myUserId.current) return;
      if (payload.seq <= lastSyncSeqRef.current) return;
      lastSyncSeqRef.current = payload.seq;
      setBoards((prev) => prev.map((b) =>
        b.id === activeBoardId && b.elements.length < payload.elements.length
          ? { ...b, elements: payload.elements, updatedAt: Date.now() }
          : b
      ));
      dirtyRef.current = true;
    });

    // ── Broadcast: cursor movement ──
    channel.on('broadcast', { event: 'cursor_move' }, ({ payload }: any) => {
      setRemoteCursors((prev) => ({
        ...prev,
        [payload.userId]: { x: payload.x, y: payload.y, name: prev[payload.userId]?.name || 'User', color: prev[payload.userId]?.color || '#6366f1' },
      }));
    });

    channel.on('broadcast', { event: 'cursor_leave' }, ({ payload }: any) => {
      setRemoteCursors((prev) => { const n = { ...prev }; delete n[payload.userId]; return n; });
    });

    // ── Subscribe ──
    await channel.subscribe(async (status: string) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ name: myName, color: myColor.current });
        setCollabStatus('connected');
        setCollabActive(true);
        // merge cursor name from presence
        setRemoteCursors((prev) => {
          const updated = { ...prev };
          Object.keys(updated).forEach((id) => {
            const user = collabUsers.find((u) => u.userId === id);
            if (user) { updated[id] = { ...updated[id], name: user.name, color: user.color }; }
          });
          return updated;
        });
      } else if (status === 'CHANNEL_ERROR') {
        setCollabStatus('error');
      }
    });

    channelRef.current = channel;
  }, [activeBoard.elements, activeBoardId, collabUsers]);

  const stopCollaboration = useCallback(async () => {
    const sb = getSupabase();
    if (channelRef.current && sb) {
      channelRef.current.send({ type: 'broadcast', event: 'cursor_leave', payload: { userId: myUserId.current } });
      await sb.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    setCollabActive(false);
    setCollabRoomId(null);
    setCollabUsers([]);
    setRemoteCursors({});
    setCollabStatus('idle');
  }, []);

  // sync cursor names from presenceState whenever collabUsers changes
  useEffect(() => {
    if (!collabUsers.length) return;
    setRemoteCursors((prev) => {
      const updated = { ...prev };
      collabUsers.forEach((u) => {
        if (updated[u.userId]) {
          updated[u.userId] = { ...updated[u.userId], name: u.name, color: u.color };
        }
      });
      return updated;
    });
  }, [collabUsers]);

  // cleanup on unmount
  useEffect(() => () => { stopCollaboration(); }, []);

  // ── Export ─────────────────────────────────────────────────────────────────

  const exportPng = useCallback(() => {
    const bgC = bgCanvasRef.current, fgC = fgCanvasRef.current;
    if (!bgC || !fgC) return;
    const m = document.createElement('canvas');
    m.width = bgC.width; m.height = bgC.height;
    const ctx = m.getContext('2d')!;
    ctx.drawImage(bgC, 0, 0); ctx.drawImage(fgC, 0, 0);
    const a = document.createElement('a');
    a.href = m.toDataURL('image/png');
    a.download = `${activeBoard.name}.png`;
    a.click();
  }, [activeBoard.name]);

  const copyImage = useCallback(async () => {
    const bgC = bgCanvasRef.current, fgC = fgCanvasRef.current;
    if (!bgC || !fgC) return;
    const m = document.createElement('canvas');
    m.width = bgC.width; m.height = bgC.height;
    const ctx = m.getContext('2d')!;
    ctx.drawImage(bgC, 0, 0); ctx.drawImage(fgC, 0, 0);
    m.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      } catch { /**/ }
    });
  }, []);

  const shareLink = useMemo(() => {
    try {
      const data = JSON.stringify({ elements: activeBoard.elements, bg: activeBoard.bg });
      return `${typeof window !== 'undefined' ? window.location.origin : ''}/workspace?tab=scratchpad&pad=${btoa(encodeURIComponent(data))}`;
    } catch { return ''; }
  }, [activeBoard.elements, activeBoard.bg]);

  const collabLink = useMemo(() =>
    collabRoomId ? `${typeof window !== 'undefined' ? window.location.origin : ''}/workspace?tab=scratchpad&collab=${collabRoomId}` : '',
    [collabRoomId]);

  // ── Board management ──────────────────────────────────────────────────────────

  const addBoard = () => {
    const b = makeBoard(`Board ${boards.length + 1}`);
    setBoards((prev) => [...prev, b]);
    setActiveBoardId(b.id);
    setUndoStack([]); setRedoStack([]);
  };

  const deleteBoard = (id: string) => {
    if (boards.length === 1) return;
    const idx = boards.findIndex((b) => b.id === id);
    const next = boards[idx === 0 ? 1 : idx - 1];
    setBoards((prev) => prev.filter((b) => b.id !== id));
    if (activeBoardId === id) setActiveBoardId(next.id);
  };

  const renameBoardCommit = (id: string) => {
    if (boardNameDraft.trim()) updateBoard(id, { name: boardNameDraft.trim() });
    setEditingBoardName(null);
  };

  // ── Zoom helpers ──────────────────────────────────────────────────────────────

  const zoomTo = (factor: number) => {
    const bgC = bgCanvasRef.current;
    if (!bgC) return;
    const cx = bgC.width / 2, cy = bgC.height / 2;
    setZoom((z) => {
      const nz = Math.min(Math.max(z * factor, 0.1), 8);
      setPan((p) => ({ x: cx - (cx - p.x) * (nz / z), y: cy - (cy - p.y) * (nz / z) }));
      return nz;
    });
    dirtyRef.current = true;
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); dirtyRef.current = true; };

  const BG_OPTIONS: { value: BgType; label: string }[] = [
    { value: 'white', label: 'White' }, { value: 'dark', label: 'Dark' },
    { value: 'grid', label: 'Grid' },   { value: 'dots', label: 'Dots' },
    { value: 'lines', label: 'Lines' },
  ];

  const isDark   = activeBoard.bg === 'dark';
  const cursor   = spaceRef.current || tool === 'pan' ? 'grab' : tool === 'eraser' ? 'cell' : tool === 'text' ? 'text' : tool === 'select' ? 'default' : 'crosshair';
  const myName   = typeof window !== 'undefined' ? (document.cookie.match(/next-auth\.session-token/) ? 'You' : 'You') : 'You';

  // ─── UI ───────────────────────────────────────────────────────────────────

  return (
    <div className={`flex flex-col ${fullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[calc(100vh-120px)] min-h-[540px]'} rounded-2xl border border-slate-200 overflow-hidden shadow-sm`}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 bg-white shrink-0 flex-wrap">
        {/* Board name */}
        {editingBoardName === activeBoard.id ? (
          <input autoFocus className="text-sm font-semibold border border-slate-300 rounded-lg px-2 py-1 w-36 focus:outline-none focus:ring-2 focus:ring-slate-400"
            value={boardNameDraft} onChange={(e) => setBoardNameDraft(e.target.value)}
            onBlur={() => renameBoardCommit(activeBoard.id)}
            onKeyDown={(e) => { if (e.key === 'Enter') renameBoardCommit(activeBoard.id); if (e.key === 'Escape') setEditingBoardName(null); }} />
        ) : (
          <button className="text-sm font-semibold text-slate-800 hover:bg-slate-100 rounded-lg px-2 py-1 transition-colors max-w-[140px] truncate"
            onDoubleClick={() => { setEditingBoardName(activeBoard.id); setBoardNameDraft(activeBoard.name); }} title="Double-click to rename">
            {activeBoard.name}
          </button>
        )}

        <div className="w-px h-5 bg-slate-200" />

        <button onClick={undo} disabled={!undoStack.length} title="Undo (Ctrl+Z)" className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"><Undo2 size={15} /></button>
        <button onClick={redo} disabled={!redoStack.length} title="Redo (Ctrl+Y)" className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-30 transition-colors"><Redo2 size={15} /></button>

        <div className="w-px h-5 bg-slate-200" />

        <button onClick={() => zoomTo(0.8)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ZoomOut size={15} /></button>
        <button onClick={resetView} className="text-xs font-mono text-slate-600 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors min-w-[46px] text-center">{Math.round(zoom * 100)}%</button>
        <button onClick={() => zoomTo(1.25)} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><ZoomIn size={15} /></button>

        <div className="w-px h-5 bg-slate-200" />

        {/* Background */}
        <div className="relative group">
          <button className="flex items-center gap-1 text-xs text-slate-600 hover:bg-slate-100 px-2 py-1.5 rounded-lg transition-colors">
            <Layers size={14} /> BG <ChevronDown size={12} />
          </button>
          <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 hidden group-hover:flex flex-col gap-0.5 min-w-[110px]">
            {BG_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => updateBoard(activeBoard.id, { bg: opt.value })}
                className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg transition-colors ${activeBoard.bg === opt.value ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'}`}>
                {activeBoard.bg === opt.value && <Check size={11} className="text-slate-700" />}
                {activeBoard.bg !== opt.value && <span className="w-3" />}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {isShape(tool) && (
          <button onClick={() => setFilled((f) => !f)}
            className={`text-xs px-2.5 py-1.5 rounded-lg transition-colors border ${filled ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            Fill
          </button>
        )}

        <div className="flex-1" />

        {/* Collab status badge */}
        {collabActive && (
          <div className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-violet-50 border border-violet-200 text-violet-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            {collabUsers.length} live · Room {collabRoomId?.slice(0, 6)}
          </div>
        )}

        {/* Remote user avatars */}
        {collabUsers.length > 0 && (
          <div className="flex -space-x-1.5">
            {collabUsers.slice(0, 5).map((u) => (
              <div key={u.userId} title={u.name}
                className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-white text-[9px] font-bold shadow-sm"
                style={{ background: u.color }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
            ))}
            {collabUsers.length > 5 && <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-300 flex items-center justify-center text-slate-600 text-[9px] font-bold">+{collabUsers.length - 5}</div>}
          </div>
        )}

        <button onClick={() => setShowBoardPanel((v) => !v)}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors border ${showBoardPanel ? 'bg-slate-900 text-white border-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
          <Layers size={13} /> {boards.length}
        </button>

        <button onClick={clearBoard} title="Clear board" className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-500 transition-colors"><Trash2 size={15} /></button>

        {/* Export */}
        <div className="relative group">
          <button className="flex items-center gap-1 text-xs text-slate-600 hover:bg-slate-100 px-2.5 py-1.5 rounded-lg transition-colors border border-slate-200">
            <Download size={14} /> Export
          </button>
          <div className="absolute top-full right-0 mt-1 bg-white rounded-xl shadow-lg border border-slate-200 p-1.5 z-30 hidden group-hover:flex flex-col gap-0.5 min-w-[160px]">
            <button onClick={exportPng} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"><Download size={13} /> Download PNG</button>
            <button onClick={copyImage} className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"><Copy size={13} /> {copied ? 'Copied!' : 'Copy image'}</button>
          </div>
        </div>

        <button onClick={() => setShareOpen(true)} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition-colors">
          <Share2 size={13} /> Share
        </button>

        <button onClick={() => setCollabOpen(true)}
          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-colors ${collabActive ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
          <Users size={13} /> {collabActive ? 'Live' : 'Collaborate'}
        </button>

        <button onClick={() => setFullscreen((f) => !f)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* ── Left toolbar ──────────────────────────────────────────────────── */}
        <div className="w-12 shrink-0 flex flex-col items-center gap-0.5 py-3 border-r border-slate-200 bg-white overflow-y-auto">
          {TOOL_GROUPS.map((group, gi) => (
            <div key={gi} className="flex flex-col items-center gap-0.5 w-full">
              {gi > 0 && <div className="w-6 h-px bg-slate-200 my-1" />}
              {group.tools.map(({ id, icon, tip }) => (
                <button key={id} title={tip} onClick={() => { setTool(id); setTextInput(null); setStickyInput(null); }}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${tool === id ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}>
                  {icon}
                </button>
              ))}
            </div>
          ))}
        </div>

        {/* ── Canvas area ──────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          <div ref={containerRef} className="flex-1 relative overflow-hidden" style={{ background: isDark ? '#1a1b1e' : '#f8f9fa' }}>
            <canvas ref={bgCanvasRef} className="absolute inset-0" />
            <canvas ref={fgCanvasRef} className="absolute inset-0"
              style={{ cursor, touchAction: 'none' }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={() => {
                onPointerUp();
                channelRef.current?.send({ type: 'broadcast', event: 'cursor_leave', payload: { userId: myUserId.current } });
              }}
              onWheel={onWheel}
            />

            {/* Remote cursors overlay */}
            {Object.entries(remoteCursors).map(([userId, cur]) => {
              const screen = canvasToScreen(cur.x, cur.y, pan, zoom);
              return (
                <div key={userId} className="pointer-events-none absolute z-20 flex flex-col items-start" style={{ left: screen.x, top: screen.y, transform: 'translate(4px,-4px)' }}>
                  {/* cursor arrow */}
                  <svg width="16" height="16" viewBox="0 0 16 16" className="-mb-0.5">
                    <path d="M0 0 L0 12 L3.5 9 L6.5 15 L8 14.5 L5 8.5 L9 8.5 Z" fill={cur.color} stroke="white" strokeWidth="1" />
                  </svg>
                  {/* name tag */}
                  <div className="px-1.5 py-0.5 rounded text-white text-[10px] font-semibold whitespace-nowrap shadow-sm" style={{ background: cur.color }}>
                    {cur.name}
                  </div>
                </div>
              );
            })}

            {/* Text input overlay */}
            {textInput && (
              <div className="absolute z-20" style={{ left: textInput.cx, top: textInput.cy - fontSize }}>
                <input autoFocus value={textValue} onChange={(e) => setTextValue(e.target.value)}
                  onBlur={commitText}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) commitText(); if (e.key === 'Escape') setTextInput(null); }}
                  className="outline-none bg-transparent border-b-2 border-blue-500 min-w-[120px]"
                  style={{ fontSize: `${fontSize * zoom}px`, color, fontFamily: 'sans-serif', lineHeight: 1 }}
                  placeholder="Type here…" />
              </div>
            )}

            {/* Sticky note input overlay */}
            {stickyInput && (
              <div className="absolute z-20 rounded-xl shadow-lg border border-slate-200 overflow-hidden" style={{ left: stickyInput.cx, top: stickyInput.cy, width: 200 }}>
                <div className="flex items-center justify-between px-3 py-1.5 text-xs font-medium" style={{ background: stickyColor }}>
                  <span>Sticky Note</span>
                  <div className="flex gap-1">
                    {STICKY_COLOURS.map((c) => (
                      <button key={c} onClick={() => setStickyColor(c)} className={`w-3.5 h-3.5 rounded-full border ${stickyColor === c ? 'border-slate-700 scale-110' : 'border-transparent'}`} style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <textarea autoFocus value={stickyValue} onChange={(e) => setStickyValue(e.target.value)}
                  onBlur={commitSticky}
                  onKeyDown={(e) => { if (e.key === 'Escape') setStickyInput(null); }}
                  className="w-full p-2.5 text-sm resize-none outline-none bg-white" rows={4} placeholder="Write a note…" />
                <div className="flex justify-end px-2 pb-2">
                  <button onClick={commitSticky} className="text-xs bg-slate-900 text-white px-3 py-1 rounded-lg">Add</button>
                </div>
              </div>
            )}

            {/* Empty hint */}
            {!activeBoard.elements.length && !isDrawing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <div className="text-4xl mb-3">✏️</div>
                  <p className="text-sm font-medium text-slate-400">Start drawing on the canvas</p>
                  <p className="text-xs text-slate-300 mt-1">Ctrl+scroll to zoom · Space+drag to pan</p>
                </div>
              </div>
            )}
          </div>

          {/* ── Bottom toolbar ──────────────────────────────────────────────── */}
          <div className={`flex items-center gap-3 px-4 py-2.5 border-t border-slate-200 shrink-0 flex-wrap ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white'}`}>
            <div className="flex items-center gap-1.5 flex-wrap">
              {COLOURS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  className={`w-5 h-5 rounded-full transition-transform border ${color === c ? 'scale-125 border-slate-500' : 'border-transparent hover:scale-110'}`}
                  style={{ background: c, boxShadow: c === '#ffffff' ? 'inset 0 0 0 1px #cbd5e1' : undefined }} />
              ))}
              <label className="w-5 h-5 rounded-full overflow-hidden cursor-pointer border border-slate-300 hover:scale-110 transition-transform relative" title="Custom colour">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" />
                <div className="absolute inset-0 rounded-full" style={{ background: 'conic-gradient(red,yellow,lime,cyan,blue,magenta,red)' }} />
              </label>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Size</span>
              <input type="range" min={1} max={tool === 'highlighter' ? 60 : tool === 'eraser' ? 80 : 40}
                value={strokeWidth} onChange={(e) => setStrokeWidth(Number(e.target.value))} className="w-24 accent-slate-800" />
              <span className={`text-xs font-mono w-5 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{strokeWidth}</span>
            </div>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Opacity</span>
              <input type="range" min={5} max={100} value={Math.round(opacity * 100)} onChange={(e) => setOpacity(Number(e.target.value) / 100)} className="w-20 accent-slate-800" />
              <span className={`text-xs font-mono w-7 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{Math.round(opacity * 100)}%</span>
            </div>
            {tool === 'text' && (
              <>
                <div className="w-px h-5 bg-slate-200" />
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Font</span>
                  <input type="range" min={10} max={96} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="w-20 accent-slate-800" />
                  <span className={`text-xs font-mono w-6 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{fontSize}</span>
                </div>
              </>
            )}
            {tool === 'sticky' && (
              <>
                <div className="w-px h-5 bg-slate-200" />
                <div className="flex items-center gap-1.5">
                  <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>Note</span>
                  {STICKY_COLOURS.map((c) => (
                    <button key={c} onClick={() => setStickyColor(c)} className={`w-5 h-5 rounded border ${stickyColor === c ? 'border-slate-600 scale-125' : 'border-transparent hover:scale-110'}`} style={{ background: c }} />
                  ))}
                </div>
              </>
            )}
            <div className="flex-1" />
            <span className={`text-xs hidden md:block ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Ctrl+Z undo · Ctrl+Y redo · Space+drag pan</span>
          </div>
        </div>

        {/* ── Board panel ────────────────────────────────────────────────────── */}
        {showBoardPanel && (
          <div className="w-52 shrink-0 border-l border-slate-200 bg-white flex flex-col">
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Boards</span>
              <button onClick={addBoard} className="flex items-center gap-1 text-xs text-slate-600 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors"><Plus size={12} /> New</button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
              {boards.map((b) => (
                <div key={b.id}
                  className={`group flex items-center gap-2 px-2.5 py-2 rounded-xl cursor-pointer transition-colors ${b.id === activeBoardId ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 text-slate-700'}`}
                  onClick={() => { setActiveBoardId(b.id); setUndoStack([]); setRedoStack([]); }}>
                  <div className={`w-5 h-5 rounded border shrink-0 ${b.id === activeBoardId ? 'border-slate-600 bg-slate-700' : 'border-slate-200 bg-slate-50'}`} />
                  {editingBoardName === b.id ? (
                    <input autoFocus className="flex-1 text-xs bg-transparent border-b border-slate-400 outline-none text-slate-800"
                      value={boardNameDraft} onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setBoardNameDraft(e.target.value)}
                      onBlur={() => renameBoardCommit(b.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter') renameBoardCommit(b.id); if (e.key === 'Escape') setEditingBoardName(null); }} />
                  ) : (
                    <span className="flex-1 text-xs truncate">{b.name}</span>
                  )}
                  <div className={`flex gap-0.5 ${b.id === activeBoardId ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <button onClick={(e) => { e.stopPropagation(); setEditingBoardName(b.id); setBoardNameDraft(b.name); }} className="p-0.5 rounded hover:bg-white/20"><Type size={10} /></button>
                    {boards.length > 1 && <button onClick={(e) => { e.stopPropagation(); deleteBoard(b.id); }} className="p-0.5 rounded hover:bg-white/20"><X size={10} /></button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Share modal ──────────────────────────────────────────────────────── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Share2 size={18} /> Share Scratchpad</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Share Link</label>
              <div className="flex gap-2">
                <input readOnly value={shareLink} className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-mono truncate" />
                <button onClick={() => { navigator.clipboard.writeText(shareLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                  className="flex items-center gap-1.5 text-xs px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors shrink-0">
                  {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-slate-600">Export</p>
              <div className="flex gap-2">
                <button onClick={exportPng} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"><Download size={13} /> Download PNG</button>
                <button onClick={copyImage} className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"><Copy size={13} /> Copy Image</button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Collaborate modal ────────────────────────────────────────────────── */}
      <Dialog open={collabOpen} onOpenChange={setCollabOpen}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users size={18} className="text-violet-600" />
              {collabActive ? 'Live Collaboration' : 'Start Collaborating'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">

            {collabActive ? (
              <>
                {/* Active room */}
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Room active — {collabUsers.length} user{collabUsers.length !== 1 ? 's' : ''} connected</p>
                    <p className="text-xs text-slate-500">Room ID: <span className="font-mono font-semibold">{collabRoomId}</span></p>
                  </div>
                </div>

                {/* Room link */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Invite Link</label>
                  <div className="flex gap-2">
                    <input readOnly value={collabLink} className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 font-mono truncate" />
                    <button onClick={() => { navigator.clipboard.writeText(collabLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                      className="flex items-center gap-1.5 text-xs px-3 py-2 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors shrink-0">
                      {copied ? <Check size={13} /> : <Link2 size={13} />}{copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>

                {/* Connected users */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="px-3 py-2.5 flex items-center justify-between border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-600">Connected users</p>
                    <span className="text-xs text-slate-400">{collabUsers.length} online</span>
                  </div>
                  {collabUsers.map((u) => (
                    <div key={u.userId} className="flex items-center gap-3 px-3 py-2.5 border-b border-slate-50 last:border-0">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: u.color }}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-800">{u.userId === myUserId.current ? `${u.name} (you)` : u.name}</p>
                        <p className="text-xs text-slate-400">Drawing</p>
                      </div>
                      <div className="ml-auto flex items-center gap-1 text-xs text-green-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Live
                      </div>
                    </div>
                  ))}
                </div>

                <button onClick={() => { stopCollaboration(); setCollabOpen(false); }}
                  className="w-full text-xs py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                  End session
                </button>
              </>
            ) : (
              <>
                {/* Status */}
                {collabStatus === 'connecting' && (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-200 rounded-xl p-3">
                    <span className="w-2 h-2 rounded-full bg-violet-500 animate-pulse shrink-0" />
                    <span className="text-sm text-violet-700">Connecting to collaboration room…</span>
                  </div>
                )}
                {collabStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
                    Could not connect. Make sure Supabase is configured and try again.
                  </div>
                )}

                {/* Start new room */}
                <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center shrink-0">
                      <Users size={16} className="text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Create a room</p>
                      <p className="text-xs text-slate-500">Anyone with the link draws on the same canvas in real time</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const roomId = uid() + uid();
                      startCollaboration(roomId, 'You');
                    }}
                    disabled={collabStatus === 'connecting'}
                    className="w-full text-sm py-2.5 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:opacity-50">
                    Start collaboration room
                  </button>
                </div>

                {/* Join existing */}
                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">Join a room</p>
                  <div className="flex gap-2">
                    <input
                      placeholder="Paste room ID or link…"
                      value={joinRoomInput}
                      onChange={(e) => setJoinRoomInput(e.target.value)}
                      className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-violet-400"
                    />
                    <button
                      onClick={() => {
                        const raw = joinRoomInput.trim();
                        const match = raw.match(/collab=([a-z0-9]+)/);
                        const roomId = match ? match[1] : raw;
                        if (roomId) { startCollaboration(roomId, 'You'); setJoinRoomInput(''); }
                      }}
                      disabled={!joinRoomInput.trim() || collabStatus === 'connecting'}
                      className="text-xs px-3 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-40">
                      Join
                    </button>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: <Users size={16} />, title: 'Multiple cursors', desc: 'See everyone drawing live' },
                    { icon: <PenLine size={16} />, title: 'Non-destructive', desc: "Others can't erase your work" },
                    { icon: <Lock size={16} />, title: 'Private room', desc: 'Only link holders can join' },
                    { icon: <QrCode size={16} />, title: 'Instant share', desc: 'Copy link, join instantly' },
                  ].map((f) => (
                    <div key={f.title} className="rounded-xl border border-slate-200 p-3">
                      <div className="text-violet-500 mb-1">{f.icon}</div>
                      <p className="text-xs font-semibold text-slate-700">{f.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
