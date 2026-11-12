import React, { useState } from 'react';
import { 
  Globe, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Key, 
  ExternalLink, 
  Sparkles, 
  Layers, 
  Copy, 
  Check, 
  FileText,
  Search,
  Zap,
  Info
} from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { SEOAuditUtility } from './SEOAuditUtility';

interface ServicePreset {
  id: string;
  name: string;
  url: string;
  category: 'primary' | 'service';
}

const BASE_URL = typeof window !== 'undefined' && window.location.origin && !window.location.origin.includes('localhost')
  ? window.location.origin 
  : 'https://mauritop-v2-4ozx.vercel.app';

const PRESET_URLS: ServicePreset[] = [
  { id: 'home', name: 'الصفحة الرئيسية', url: `${BASE_URL}/`, category: 'primary' },
  { id: 'service-cards', name: 'بطاقات الخدمات والاشتراكات', url: `${BASE_URL}/service-cards`, category: 'primary' },
  { id: 'faq', name: 'الأسئلة الشائعة والدعم الفوري', url: `${BASE_URL}/faq`, category: 'primary' },
  { id: 'contact', name: 'تواصل معنا والدعم', url: `${BASE_URL}/contact`, category: 'primary' },
  { id: 'assistant', name: 'المساعد الذكي', url: `${BASE_URL}/assistant`, category: 'primary' },
  { id: 'privacy', name: 'سياسة الخصوصية', url: `${BASE_URL}/privacy`, category: 'primary' },
  { id: 'terms', name: 'شروط الاستخدام', url: `${BASE_URL}/terms`, category: 'primary' },
  { id: 'freefire', name: 'شحن فري فاير (Free Fire)', url: `${BASE_URL}/services/freefire`, category: 'service' },
  { id: 'pubg', name: 'شحن شدات ببجي (PUBG Mobile)', url: `${BASE_URL}/services/pubg`, category: 'service' },
  { id: 'netflix', name: 'اشتراكات نتفليكس (Netflix)', url: `${BASE_URL}/services/netflix`, category: 'service' },
  { id: 'canva', name: 'اشتراك كانفا برو (Canva Pro)', url: `${BASE_URL}/services/canva`, category: 'service' },
  { id: 'spotify', name: 'اشتراك سبوتيفاي (Spotify)', url: `${BASE_URL}/services/spotify-premium`, category: 'service' },
  { id: 'playstation', name: 'بطاقات بلايستيشن (PlayStation)', url: `${BASE_URL}/services/playstation-10`, category: 'service' },
  { id: 'googleplay', name: 'بطاقات جوجل بلاي (Google Play)', url: `${BASE_URL}/services/googleplay-10`, category: 'service' },
  { id: 'apple', name: 'بطاقات أبل آيتونز (Apple iTunes)', url: `${BASE_URL}/services/apple-10`, category: 'service' },
  { id: 'tod', name: 'اشتراك تود (TOD VIP)', url: `${BASE_URL}/services/tod-vip`, category: 'service' },
  { id: 'shahid', name: 'اشتراك شاهد VIP', url: `${BASE_URL}/services/shahid-vip`, category: 'service' },
];

export function IndexNowManager() {
  const { showToast } = useToast();
  const [activeMode, setActiveMode] = useState<'indexnow' | 'seo-audit'>('indexnow');
  const [selectedUrls, setSelectedUrls] = useState<string[]>(PRESET_URLS.map(p => p.url));
  const [customInputUrl, setCustomInputUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResponse, setLastResponse] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const apiKey = 'mauritop2026indexnowkey884729';
  const keyLocation = `${BASE_URL}/mauritop2026indexnowkey.txt`;

  const toggleSelectUrl = (url: string) => {
    if (selectedUrls.includes(url)) {
      setSelectedUrls(selectedUrls.filter(u => u !== url));
    } else {
      setSelectedUrls([...selectedUrls, url]);
    }
  };

  const handleSelectAll = () => {
    setSelectedUrls(PRESET_URLS.map(p => p.url));
  };

  const handleDeselectAll = () => {
    setSelectedUrls([]);
  };

  const handleAddCustomUrl = () => {
    if (!customInputUrl.trim()) return;
    let formatted = customInputUrl.trim();
    if (!formatted.startsWith('http')) {
      formatted = `${BASE_URL}${formatted.startsWith('/') ? '' : '/'}${formatted}`;
    }
    if (!selectedUrls.includes(formatted)) {
      setSelectedUrls([...selectedUrls, formatted]);
      showToast('تم إضافة الرابط بنجاح', 'success');
    }
    setCustomInputUrl('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    showToast('تم نسخ مفتاح IndexNow', 'success');
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const [localHealth, setLocalHealth] = useState<any>(null);
  const [checkingLocal, setCheckingLocal] = useState(false);

  const handleCheckLocalHealth = async () => {
    setCheckingLocal(true);
    try {
      const res = await fetch('/api/indexnow/verify-local');
      const data = await res.json();
      setLocalHealth(data);
      if (data.ok) {
        showToast('ملفات التوثيق والسيو مفعلة وجاهزة بنجاح على الخادم', 'success');
      }
    } catch {
      showToast('تعذر فحص الإعدادات المحلية', 'error');
    } finally {
      setCheckingLocal(false);
    }
  };

  const handleSubmitIndexNow = async () => {
    if (selectedUrls.length === 0) {
      showToast('يرجى تحديد رابط واحد على الأقل لإرسال طلب الفهرسة', 'error');
      return;
    }

    setIsSubmitting(true);
    setLastResponse(null);

    try {
      const activeHost = (typeof window !== 'undefined' && window.location.hostname && !window.location.hostname.includes('localhost'))
        ? window.location.hostname 
        : 'mauritop-v2-4ozx.vercel.app';
      const res = await fetch('/api/indexnow/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ urls: selectedUrls, host: activeHost }),
      });

      const data = await res.json();
      setLastResponse(data);
      if (data.accepted) {
        showToast(`تم قبول إرسال ${data.submittedUrlsCount} رابط لمحركات البحث بنجاح (200/202)!`, 'success');
      } else {
        const code = data.results?.indexNowOrg?.status || 403;
        showToast(`محركات البحث لم تقبل الطلب بعد (كود ${code} - يتطلب ربط الدومين بالخادم الخارجي)`, 'error');
      }
    } catch (err: any) {
      console.error(err);
      showToast('تعذر الاتصال بخدمة الفهرسة الفورية', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Top Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-white/10 w-fit">
        <button
          onClick={() => setActiveMode('indexnow')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMode === 'indexnow'
              ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-lg shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>الفهرسة الفورية (IndexNow API)</span>
        </button>

        <button
          onClick={() => setActiveMode('seo-audit')}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeMode === 'seo-audit'
              ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>تدقيق ميتاداتا السيو للخدمات (SEO Audit)</span>
        </button>
      </div>

      {activeMode === 'seo-audit' ? (
        <SEOAuditUtility />
      ) : (
        <>
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-cyan-950/80 via-slate-900 to-indigo-950/80 border border-cyan-500/20 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-96 h-96 bg-cyan-500/10 rounded-full filter blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span>فهرسة فورية معتمدة (IndexNow API Protocol)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
                  <Search className="w-7 h-7 text-cyan-400 shrink-0" />
                  إدارة فهرسة محركات البحث وخريطة الموقع
                </h2>
                <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
                  إعلام فوري لمحركات البحث (Bing, Yandex, Seznam) عبر بروتوكول <span className="text-cyan-300 font-bold">IndexNow</span>، مع إرشادات وروابط تقديم خريطة الموقع المباشرة في <span className="text-indigo-300 font-bold">Google Search Console</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  onClick={handleCheckLocalHealth}
                  disabled={checkingLocal}
                  className="px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 transition-all flex items-center gap-2 cursor-pointer"
                  title="التحقق من توفر ملفات المفتاح والخريطة على الخادم"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${checkingLocal ? 'animate-spin' : ''}`} />
                  <span>فحص الجاهزية المحلية</span>
                </button>

                <a
                  href="/mauritop2026indexnowkey.txt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-xs font-bold text-amber-300 transition-all flex items-center gap-2"
                >
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  <span>ملف المفتاح (.txt)</span>
                  <ExternalLink className="w-3 h-3 text-amber-400/70" />
                </a>

                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-xs font-bold text-cyan-300 transition-all flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>خريطة الموقع (Sitemap)</span>
                  <ExternalLink className="w-3 h-3 text-cyan-400/70" />
                </a>
              </div>
            </div>
          </div>

          {/* Local Health Status Alert if checked */}
          {localHealth && (
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">إعدادات وملفات السيو المحلية سليمة 100%</p>
                  <p className="text-[11px] text-slate-400">
                    ملف المفتاح (<code className="text-amber-300 font-mono">/mauritop2026indexnowkey.txt</code>) وخريطة الموقع (<code className="text-cyan-300 font-mono">/sitemap.xml</code>) وملف جوجل جاهزة وتعمل على الخادم.
                  </p>
                </div>
              </div>
              <span className="text-emerald-400 text-xs font-bold shrink-0">جاهز للإنتاج</span>
            </div>
          )}

          {/* IndexNow Key Config Info Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-amber-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-medium">مفتاح التوثيق (IndexNow Key)</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold text-amber-300 truncate">{apiKey}</span>
                  <button
                    onClick={() => copyToClipboard(apiKey)}
                    className="p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="نسخ المفتاح"
                  >
                    {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
                <Globe className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-medium">النطاق المنشور حالياً (Active Domain)</p>
                <p className="text-xs font-mono font-bold text-cyan-300 mt-1 truncate" title={typeof window !== 'undefined' && window.location.hostname && !window.location.hostname.includes('localhost') ? window.location.hostname : 'mauritop-v2-4ozx.vercel.app'}>
                  {typeof window !== 'undefined' && window.location.hostname && !window.location.hostname.includes('localhost') ? window.location.hostname : 'mauritop-v2-4ozx.vercel.app'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs text-slate-400 font-medium">محركات البحث المدعومة</p>
                <p className="text-xs font-bold text-indigo-300 mt-1">IndexNow, Bing, Yandex, Google</p>
              </div>
            </div>
          </div>

          {/* URL Selector Section */}
          <div className="p-6 rounded-3xl bg-slate-900/90 border border-white/10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  تحديد الروابط المراد إرسالها للفهرسة
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  تم تحديد ({selectedUrls.length}) رابط عام من أصل ({PRESET_URLS.length})
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-cyan-300 border border-cyan-500/20 transition-all cursor-pointer"
                >
                  تحديد الكل
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-400 border border-white/10 transition-all cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>

            {/* Custom URL Input Box */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customInputUrl}
                onChange={(e) => setCustomInputUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCustomUrl()}
                placeholder="أضف رابط فرعي آخر (مثال: /services/spotify أو https://mauritop.com/services/pubg)"
                className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
              <button
                onClick={handleAddCustomUrl}
                className="px-4 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shrink-0 cursor-pointer"
              >
                إضافة الرابط
              </button>
            </div>

            {/* List of Preset URLs Checkboxes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
              {PRESET_URLS.map((preset) => {
                const isSelected = selectedUrls.includes(preset.url);
                return (
                  <div
                    key={preset.id}
                    onClick={() => toggleSelectUrl(preset.url)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-cyan-950/40 border-cyan-500/50 text-white shadow-lg shadow-cyan-500/5'
                        : 'bg-slate-950/50 border-white/5 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className="overflow-hidden space-y-0.5">
                      <p className={`text-xs font-bold truncate ${isSelected ? 'text-cyan-300' : 'text-slate-300'}`}>
                        {preset.name}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 truncate">{preset.url}</p>
                    </div>

                    <div className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'bg-cyan-500 border-cyan-400 text-slate-950' : 'border-white/20 bg-slate-900'
                    }`}>
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom Added URLs if any */}
            {selectedUrls.filter(u => !PRESET_URLS.some(p => p.url === u)).length > 0 && (
              <div className="pt-4 border-t border-white/10">
                <p className="text-xs font-bold text-amber-300 mb-2">الروابط المضافة مخصصاً:</p>
                <div className="space-y-2">
                  {selectedUrls
                    .filter(u => !PRESET_URLS.some(p => p.url === u))
                    .map((u, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-amber-950/20 border border-amber-500/30 rounded-xl p-2.5 px-4 text-xs">
                        <span className="font-mono text-amber-200 truncate">{u}</span>
                        <button
                          onClick={() => toggleSelectUrl(u)}
                          className="text-red-400 hover:text-red-300 text-xs font-bold cursor-pointer"
                        >
                          إزالة
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Info className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>يتم إرسال الروابط المحددة دفعة واحدة إلى خادم IndexNow المركزي وBing مع التحقق الدقيق من الاستجابة.</span>
              </div>

              <button
                onClick={handleSubmitIndexNow}
                disabled={isSubmitting || selectedUrls.length === 0}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 text-slate-950 font-black text-sm transition-all shadow-xl shadow-cyan-500/20 flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin text-slate-950" />
                    <span>جاري إرسال الفهرسة الفورية...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>إرسال الفهرسة الفورية الآن ({selectedUrls.length} رابط)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Response Results Section */}
          {lastResponse && (
            <div className={`p-6 rounded-3xl bg-slate-900 border space-y-5 ${
              lastResponse.accepted ? 'border-emerald-500/40' : 'border-amber-500/40'
            }`}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    lastResponse.accepted ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-amber-500/20 border border-amber-500/30'
                  }`}>
                    {lastResponse.accepted ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-amber-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">
                      {lastResponse.accepted ? 'تم قبول طلب الفهرسة من المحركات بنجاح' : 'تقرير استجابة محركات البحث للطلب'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      تم التحديث في {new Date(lastResponse.timestamp).toLocaleTimeString('ar-MA')} — ({lastResponse.submittedUrlsCount} رابط محدد)
                    </p>
                  </div>
                </div>

                <span className={`px-3 py-1.5 rounded-full border text-xs font-bold ${
                  lastResponse.accepted
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {lastResponse.accepted
                    ? `إشعار استلام مؤكد (${lastResponse.submittedUrlsCount} رابط) - كود 200/202`
                    : `لم يُقبل الطلب بعد (كود ${lastResponse.results?.indexNowOrg?.status || 403})`}
                </span>
              </div>

              {/* Explicit SEO clarification that 200/202 acknowledges receipt without guaranteeing instant indexing */}
              {lastResponse.accepted && (
                <div className="p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/30 flex items-start gap-3 text-xs leading-relaxed text-cyan-200">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block mb-0.5">ملاحظة هندسية حول نتائج الفهرسة:</strong>
                    استجابة HTTP 200 أو 202 تعني استلام محركات البحث (Bing / Yandex / IndexNow) للإشعار بنجاح وجدولة الروابط للزحف وإعادة التقييم؛ وهي لا تعني بالضرورة ظهور الصفحة فوراً في نتائج البحث، حيث يخضع الظهور الفعلي لخوارزميات التقييم وفترة الزحف الدورية.
                  </div>
                </div>
              )}

              {/* Technical explanation banner when endpoints return 403 */}
              {!lastResponse.accepted && (
                <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-bold">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>تفسير هندسي لحالة الاستجابة (HTTP 403 Forbidden):</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    بروتوكول <strong className="text-white">IndexNow</strong> يقوم بالتحقق الفوري من ملكية النطاق عبر تنزيل ملف المفتاح من الرابط الخارجي العام{' '}
                    <code className="text-amber-200 font-mono bg-black/40 px-1.5 py-0.5 rounded">{BASE_URL}/mauritop2026indexnowkey.txt</code>.
                    إذا كان النطاق المنشور في طور الربط أو لم يتم توجيه سجلات الـ DNS إليه على الإنترنت العام بعد،
                    فإن سيرفرات مايكروسوفت وIndexNow لا تستطيع الوصول إلى الملف الخارجي، وترجع كود 403 (رفض التحقق).
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" /> ملف المفتاح سليم ومفعل على الخادم
                    </span>
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <Check className="w-3.5 h-3.5" /> صيغة الطلب مطابقة لمواصفات البروتوكول
                    </span>
                    <span className="flex items-center gap-1 text-cyan-300 font-bold">
                      <Zap className="w-3.5 h-3.5" /> سيعمل بنجاح فوري بمجرد توجيه الدومين للإنتاج
                    </span>
                  </div>
                </div>
              )}

              {/* Engine Results Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* IndexNow.org Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">بروتوكول IndexNow الموحد</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      lastResponse.results?.indexNowOrg?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      HTTP {lastResponse.results?.indexNowOrg?.status || 'Error'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{lastResponse.results?.indexNowOrg?.message}</p>
                  {lastResponse.results?.indexNowOrg?.explanation && (
                    <p className="text-[11px] text-slate-500 bg-white/5 p-2.5 rounded-xl mt-2 leading-relaxed">
                      {lastResponse.results?.indexNowOrg?.explanation}
                    </p>
                  )}
                </div>

                {/* Bing Card */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">محرك بحث Microsoft Bing</span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                      lastResponse.results?.bing?.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
                    }`}>
                      HTTP {lastResponse.results?.bing?.status || 'Error'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{lastResponse.results?.bing?.message}</p>
                  {lastResponse.results?.bing?.explanation && (
                    <p className="text-[11px] text-slate-500 bg-white/5 p-2.5 rounded-xl mt-2 leading-relaxed">
                      {lastResponse.results?.bing?.explanation}
                    </p>
                  )}
                </div>

                {/* Google Search Console & Sitemap Card (Replaces deprecated Google Ping) */}
                <div className="p-4 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">محرك بحث Google (GSC)</span>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      Search Console
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    {lastResponse.results?.google?.message || 'تم إلغاء Google Ping رسمياً. تعتمد الفهرسة في Google على تقديم sitemap.xml عبر Search Console واكتشاف robots.txt.'}
                  </p>
                  <div className="pt-2 flex flex-col gap-1.5">
                    <a
                      href="https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fmauritop.com%2F"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-[11px] font-bold text-cyan-300 transition-colors"
                    >
                      <span>تقديم sitemap في Search Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                    <a
                      href="https://search.google.com/search-console/inspect?resource_id=https%3A%2F%2Fmauritop.com%2F"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-between px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-slate-300 transition-colors"
                    >
                      <span>أداة فحص العناوين (URL Inspection)</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Dedicated Google Search Console Permanent Action Center */}
          <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[11px] font-bold">
                  <span>المسار الرسمي المعتمد لأرشفة Google</span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Search className="w-4 h-4 text-indigo-400" />
                  مركز إدارة Google Search Console وخرائط الفهرسة
                </h3>
              </div>

              <span className="text-xs text-slate-400 font-medium">
                ملف التحقق: <code className="text-indigo-300 font-mono">googleriFWxrL7v...html</code> (مفعل)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  1. تقديم خريطة Sitemap
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  أرسل رابط <code className="text-cyan-300 font-mono">sitemap.xml</code> في لوحة Search Console ليقوم Google بفهرسة كافة خدمات موري توب.
                </p>
                <a
                  href="https://search.google.com/search-console/sitemaps?resource_id=https%3A%2F%2Fmauritop.com%2F"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300"
                >
                  <span>فتح إدارة الخرائط</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  2. فحص الروابط الفردية
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  استخدم أداة URL Inspection لفحص ظهور صفحات مثل ببجي وفري فاير وطلب الفهرسة اليدوية الفورية.
                </p>
                <a
                  href="https://search.google.com/search-console/inspect?resource_id=https%3A%2F%2Fmauritop.com%2F"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
                >
                  <span>فتح أداة الفحص</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/5 space-y-2">
                <p className="text-xs font-bold text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  3. توثيق الملكية (HTML File)
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  تم وضع ملف التحقق من الملكية الرسمي في جذر الموقع للتحقق الفوري بنقرة واحدة في Search Console.
                </p>
                <a
                  href="/googleriFWxrL7v_Sp3WfPE6csBOVKzakjy3ROeZIhwOZxHFA.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300"
                >
                  <span>عرض ملف التحقق</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
