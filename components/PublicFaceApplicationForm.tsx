'use client';

import { useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Instagram,
  Mail,
  ShieldCheck,
  Star,
  Trophy,
  Twitter,
  Upload,
  X,
  Youtube,
  Zap,
} from 'lucide-react';
import type { PublicFaceCategory } from '@/types/document';

/* ─── Category data ──────────────────────────────────────────────────── */
const CATEGORIES: { value: PublicFaceCategory; label: string; icon: string; desc: string }[] = [
  { value: 'actor_actress',           label: 'Actor / Actress',           icon: '🎭', desc: 'Films, TV series, theatre' },
  { value: 'singer_musician',         label: 'Singer / Musician',         icon: '🎵', desc: 'Music artist, band member' },
  { value: 'athlete_sportsperson',    label: 'Athlete / Sportsperson',    icon: '🏆', desc: 'Professional or national level' },
  { value: 'model',                   label: 'Model',                     icon: '✨', desc: 'Fashion, commercial, runway' },
  { value: 'content_creator',         label: 'Content Creator',           icon: '🎬', desc: 'YouTube, podcasts, blogs' },
  { value: 'influencer',              label: 'Influencer',                icon: '📱', desc: 'Social media influencer' },
  { value: 'politician',              label: 'Politician',                icon: '🏛️', desc: 'Elected or public office' },
  { value: 'entrepreneur_ceo',        label: 'Entrepreneur / CEO',        icon: '💼', desc: 'Founder, exec, business leader' },
  { value: 'author_writer',           label: 'Author / Writer',           icon: '📖', desc: 'Published books, journalism' },
  { value: 'academic_scientist',      label: 'Academic / Scientist',      icon: '🔬', desc: 'Researcher, professor, expert' },
  { value: 'tv_personality',          label: 'TV Personality',            icon: '📺', desc: 'Host, presenter, anchor' },
  { value: 'comedian',                label: 'Comedian',                  icon: '😄', desc: 'Stand-up, sketches, shows' },
  { value: 'social_activist',         label: 'Social Activist',           icon: '✊', desc: 'Advocacy, movements, NGO' },
  { value: 'chef_culinary',           label: 'Chef / Culinary Expert',    icon: '👨‍🍳', desc: 'Restaurants, food media' },
  { value: 'fashion_designer',        label: 'Fashion Designer',          icon: '👗', desc: 'Clothing, accessories, brands' },
  { value: 'photographer_videographer', label: 'Photographer / Videographer', icon: '📷', desc: 'Published photography, films' },
  { value: 'game_streamer',           label: 'Game Streamer',             icon: '🎮', desc: 'Twitch, YouTube Gaming, esports' },
  { value: 'journalist',              label: 'Journalist',                icon: '📰', desc: 'Reporter, editor, media' },
  { value: 'other',                   label: 'Other Public Figure',       icon: '⭐', desc: 'Other form of public recognition' },
];

/* ─── Step indicators ───────────────────────────────────────────────── */
const STEPS = [
  { label: 'Category',  icon: Star },
  { label: 'Presence',  icon: Zap },
  { label: 'Fame Proof',icon: Trophy },
  { label: 'Identity',  icon: ShieldCheck },
  { label: 'Verify',    icon: Mail },
];

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

export default function PublicFaceApplicationForm({ onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /* form state */
  const [category, setCategory] = useState<PublicFaceCategory | ''>('');
  const [instagramHandle, setInstagramHandle] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [youtubeChannel, setYoutubeChannel] = useState('');
  const [facebookPage, setFacebookPage] = useState('');
  const [tiktokHandle, setTiktokHandle] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [totalFollowers, setTotalFollowers] = useState('');
  const [monthlyReach, setMonthlyReach] = useState('');
  const [mediaFeatures, setMediaFeatures] = useState('');
  const [awardsRecognitions, setAwardsRecognitions] = useState('');
  const [notableProjects, setNotableProjects] = useState('');
  const [publicStatement, setPublicStatement] = useState('');
  const [identityProofDataUrl, setIdentityProofDataUrl] = useState('');
  const [identityProofFileName, setIdentityProofFileName] = useState('');
  const [identityProofMimeType, setIdentityProofMimeType] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);

  /* ── validation per step ── */
  const canNext = useCallback(() => {
    if (step === 0) return !!category;
    if (step === 1) return !!(instagramHandle || twitterHandle || youtubeChannel || facebookPage || tiktokHandle || websiteUrl);
    if (step === 2) return publicStatement.trim().length >= 50;
    if (step === 3) return !!identityProofDataUrl;
    if (step === 4) return otp.length === 6;
    return false;
  }, [step, category, instagramHandle, twitterHandle, youtubeChannel, facebookPage, tiktokHandle, websiteUrl, publicStatement, identityProofDataUrl, otp]);

  /* ── file upload ── */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be under 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setIdentityProofDataUrl(reader.result as string);
      setIdentityProofFileName(file.name);
      setIdentityProofMimeType(file.type);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  /* ── send OTP ── */
  const sendOtp = async () => {
    setOtpLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public-face/send-otp', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
      setOtpSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/public-face/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          otp,
          category,
          instagramHandle,
          twitterHandle,
          youtubeChannel,
          facebookPage,
          tiktokHandle,
          websiteUrl,
          totalFollowers,
          monthlyReach,
          mediaFeatures,
          awardsRecognitions,
          notableProjects,
          publicStatement,
          identityProofDataUrl,
          identityProofFileName,
          identityProofMimeType,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit.');
      setSubmitted(true);
      setTimeout(() => onSuccess(), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────── */

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full"
          style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(217,70,239,0.25))', border: '2px solid rgba(168,85,247,0.4)' }}>
          <CheckCircle2 className="h-10 w-10 text-violet-400" />
        </div>
        <h3 className="text-[22px] font-black text-white mb-3" style={{ letterSpacing: '-0.02em' }}>Application Submitted!</h3>
        <p className="text-[14px] text-white/50 leading-relaxed max-w-sm">
          We&apos;ve received your Public Face application. Check your email for confirmation. Our team will review it within 3–5 business days.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ maxHeight: '85vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[12px]"
            style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(217,70,239,0.3))', border: '1px solid rgba(168,85,247,0.35)' }}>
            <Star className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <p className="text-[14px] font-black text-white/90" style={{ letterSpacing: '-0.01em' }}>Apply for Public Face</p>
            <p className="text-[11px] text-white/35">Step {step + 1} of {STEPS.length}</p>
          </div>
        </div>
        <button type="button" onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full transition hover:bg-white/[0.08]">
          <X className="h-4 w-4 text-white/40" />
        </button>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-0 px-6 py-3 border-b border-white/[0.05] shrink-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={i} className="flex items-center flex-1 min-w-0">
              <div className="flex flex-col items-center min-w-0">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                  done ? 'bg-violet-500 text-white' : active ? 'text-violet-300' : 'text-white/20'
                }`}
                style={active ? { background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(217,70,239,0.3))', border: '1.5px solid rgba(168,85,247,0.6)' }
                  : done ? {} : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                </div>
                <span className={`text-[9px] font-semibold mt-1 truncate max-w-full ${active ? 'text-violet-300' : done ? 'text-white/40' : 'text-white/20'}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-[1px] mx-1 mb-4"
                  style={{ background: i < step ? 'rgba(139,92,246,0.5)' : 'rgba(255,255,255,0.07)' }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.1)_transparent]">

        {/* ═══ STEP 0 — Category ═══ */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-[13px] text-white/50 mb-4">Select the category that best describes your public identity.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={`flex items-center gap-3 rounded-[14px] px-4 py-3 text-left transition-all ${
                    category === cat.value ? 'ring-1' : 'hover:bg-white/[0.04]'
                  }`}
                  style={category === cat.value ? {
                    background: 'linear-gradient(135deg,rgba(124,58,237,0.18),rgba(217,70,239,0.12))',
                    border: '1px solid rgba(168,85,247,0.5)',
                    boxShadow: '0 0 20px rgba(124,58,237,0.15)',
                  } : {
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                  <span className="text-[22px] shrink-0">{cat.icon}</span>
                  <div className="min-w-0">
                    <p className={`text-[12.5px] font-bold ${category === cat.value ? 'text-violet-200' : 'text-white/75'}`}>
                      {cat.label}
                    </p>
                    <p className="text-[10.5px] text-white/30 mt-0.5 truncate">{cat.desc}</p>
                  </div>
                  {category === cat.value && (
                    <CheckCircle2 className="h-4 w-4 text-violet-400 ml-auto shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 1 — Social Presence ═══ */}
        {step === 1 && (
          <div className="space-y-4">
            <p className="text-[13px] text-white/50">Provide at least one social media handle or website to prove your online presence.</p>

            {[
              { icon: Instagram, label: 'Instagram Handle', placeholder: '@yourhandle', value: instagramHandle, onChange: setInstagramHandle, color: '#e1306c' },
              { icon: Twitter, label: 'Twitter / X Handle', placeholder: '@yourhandle', value: twitterHandle, onChange: setTwitterHandle, color: '#1da1f2' },
              { icon: Youtube, label: 'YouTube Channel URL', placeholder: 'https://youtube.com/@channel', value: youtubeChannel, onChange: setYoutubeChannel, color: '#ff0000' },
            ].map(({ icon: Icon, label, placeholder, value, onChange, color }) => (
              <div key={label}>
                <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">{label}</label>
                <div className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <Icon className="h-4 w-4 shrink-0" style={{ color }} />
                  <input
                    className="flex-1 bg-transparent text-[13px] text-white/80 placeholder-white/20 outline-none"
                    placeholder={placeholder}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                  />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Facebook Page URL</label>
              <input
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none"
                placeholder="https://facebook.com/yourpage"
                value={facebookPage}
                onChange={e => setFacebookPage(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">TikTok Handle</label>
              <input
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none"
                placeholder="@yourhandle"
                value={tiktokHandle}
                onChange={e => setTiktokHandle(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Website / Portfolio URL</label>
              <input
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none"
                placeholder="https://yourwebsite.com"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* ═══ STEP 2 — Fame Proof ═══ */}
        {step === 2 && (
          <div className="space-y-4">
            <p className="text-[13px] text-white/50">Help us understand the scale of your public presence.</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Total Followers (approx.)</label>
                <input
                  className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none"
                  placeholder="e.g. 500K"
                  value={totalFollowers}
                  onChange={e => setTotalFollowers(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Monthly Reach (approx.)</label>
                <input
                  className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none"
                  placeholder="e.g. 2M views/month"
                  value={monthlyReach}
                  onChange={e => setMonthlyReach(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Media Features</label>
              <textarea
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none resize-none"
                placeholder="List press coverage, interviews, news articles, TV appearances (links preferred)…"
                rows={3}
                value={mediaFeatures}
                onChange={e => setMediaFeatures(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Awards & Recognitions</label>
              <textarea
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none resize-none"
                placeholder="List awards, honours, certifications, or notable recognitions you've received…"
                rows={3}
                value={awardsRecognitions}
                onChange={e => setAwardsRecognitions(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Notable Projects / Work</label>
              <textarea
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none resize-none"
                placeholder="List films, albums, books, campaigns, startups, or major works you're known for…"
                rows={3}
                value={notableProjects}
                onChange={e => setNotableProjects(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">
                Public Statement <span className="text-violet-400">*</span>
                <span className="ml-2 text-white/20 font-normal">({publicStatement.trim().length}/50 min)</span>
              </label>
              <textarea
                className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-2.5 text-[13px] text-white/80 placeholder-white/20 outline-none resize-none"
                placeholder="Describe who you are, what you do, and why you are a recognised public figure. Be specific and authentic…"
                rows={5}
                value={publicStatement}
                onChange={e => setPublicStatement(e.target.value)}
              />
              {publicStatement.trim().length > 0 && publicStatement.trim().length < 50 && (
                <p className="mt-1 text-[11px] text-amber-400">Please write at least 50 characters.</p>
              )}
            </div>
          </div>
        )}

        {/* ═══ STEP 3 — Identity Proof ═══ */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-[14px] border border-amber-500/20 bg-amber-500/[0.05] p-4">
              <p className="text-[12.5px] font-bold text-amber-300 mb-1.5">Identity Verification Required</p>
              <p className="text-[12px] text-white/45 leading-relaxed">
                Upload a government-issued photo ID (passport, Aadhaar, driving licence, or national ID) to confirm
                you are the same person as your public profile. This will only be viewed by our team and never shared publicly.
              </p>
            </div>

            {!identityProofDataUrl ? (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-3 rounded-[16px] py-10 transition-all hover:bg-white/[0.04]"
                style={{ border: '1.5px dashed rgba(168,85,247,0.35)', background: 'rgba(124,58,237,0.04)' }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(168,85,247,0.25)' }}>
                  <Upload className="h-5 w-5 text-violet-400" />
                </div>
                <div className="text-center">
                  <p className="text-[13px] font-bold text-white/70">Upload Identity Proof</p>
                  <p className="text-[11px] text-white/30 mt-1">JPG, PNG, or PDF — max 5 MB</p>
                </div>
              </button>
            ) : (
              <div className="rounded-[14px] border border-emerald-500/25 bg-emerald-500/[0.05] p-4 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-emerald-300">Identity proof uploaded</p>
                  <p className="text-[11px] text-white/35 mt-0.5 truncate">{identityProofFileName}</p>
                </div>
                <button type="button" onClick={() => { setIdentityProofDataUrl(''); setIdentityProofFileName(''); setIdentityProofMimeType(''); }}
                  className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-white/[0.08]">
                  <X className="h-3.5 w-3.5 text-white/40" />
                </button>
              </div>
            )}

            <input ref={fileRef} type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileChange} />

            <div className="rounded-[12px] bg-white/[0.02] border border-white/[0.06] p-3.5 space-y-2">
              <p className="text-[11.5px] font-semibold text-white/50">Accepted documents</p>
              {['Passport', 'Aadhaar Card', "Driver's Licence", 'National ID Card', 'Voter ID'].map(doc => (
                <div key={doc} className="flex items-center gap-2">
                  <div className="h-1 w-1 rounded-full bg-violet-400/60" />
                  <span className="text-[12px] text-white/35">{doc}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ STEP 4 — Email Verify ═══ */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-[16px] border border-violet-500/25 bg-violet-500/[0.06] p-5 text-center">
              <Mail className="h-8 w-8 text-violet-400 mx-auto mb-3" />
              <p className="text-[14px] font-bold text-white/85 mb-2">Verify your email</p>
              <p className="text-[12.5px] text-white/45 leading-relaxed">
                We need to verify your email address before submitting your application.
                Click below to receive a 6-digit OTP at your registered email.
              </p>
            </div>

            {!otpSent ? (
              <button
                type="button"
                onClick={sendOtp}
                disabled={otpLoading}
                className="w-full flex items-center justify-center gap-2 rounded-[14px] py-3 text-[13.5px] font-bold transition-all disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#d946ef)', color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,0.35)' }}
              >
                {otpLoading ? 'Sending…' : 'Send OTP to my email'}
                {!otpLoading && <ArrowRight className="h-4 w-4" />}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-[12px] text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5" /> OTP sent! Check your inbox.
                </p>
                <label className="block text-[11.5px] font-semibold text-white/45 mb-1.5">Enter OTP</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  className="w-full rounded-[12px] bg-white/[0.03] border border-white/[0.07] px-3 py-3 text-[22px] font-black text-white/90 placeholder-white/15 outline-none tracking-[0.3em] text-center"
                  placeholder="······"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
                <button type="button" onClick={sendOtp} disabled={otpLoading}
                  className="text-[11px] text-violet-400 hover:text-violet-300 transition disabled:opacity-50">
                  {otpLoading ? 'Resending…' : 'Resend OTP'}
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-[12px] border border-red-500/25 bg-red-500/[0.07] px-4 py-3">
            <p className="text-[12.5px] text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-white/[0.06]">
        <button
          type="button"
          onClick={() => step === 0 ? onClose() : setStep(s => s - 1)}
          className="flex items-center gap-1.5 rounded-[11px] px-4 py-2.5 text-[13px] font-semibold text-white/50 transition hover:text-white/80 hover:bg-white/[0.05]"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {step === 0 ? 'Cancel' : 'Back'}
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => { setError(''); setStep(s => s + 1); if (step === 3) sendOtp(); }}
            disabled={!canNext()}
            className="flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[13.5px] font-bold transition-all disabled:opacity-40"
            style={{ background: canNext() ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(255,255,255,0.06)', color: canNext() ? '#fff' : 'rgba(255,255,255,0.3)', boxShadow: canNext() ? '0 4px 14px rgba(124,58,237,0.35)' : 'none' }}
          >
            Next <ArrowRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canNext() || loading}
            className="flex items-center gap-1.5 rounded-[12px] px-5 py-2.5 text-[13.5px] font-bold transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7,#d946ef)', color: '#fff', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}
          >
            {loading ? 'Submitting…' : 'Submit Application'} {!loading && <Star className="h-3.5 w-3.5" />}
          </button>
        )}
      </div>
    </div>
  );
}
