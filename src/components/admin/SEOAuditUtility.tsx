import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Sparkles, 
  Search, 
  FileCheck2, 
  Download, 
  Edit3, 
  Save, 
  Zap, 
  Info,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { SERVICES } from '../../data/services';
import type { Service } from '../../types';
import { useToast } from '../../contexts/ToastContext';

export interface SEOAuditItem {
  id: string;
  name: string;
  nameAr: string;
  nameFr: string;
  descriptionAr: string;
  descriptionFr: string;
  imageUrl: string;
  status: string;
  category: string;
  score: number; // 0 to 100
  issues: SEOIssue[];
  isDbDoc: boolean;
}

export interface SEOIssue {
  type: 'critical' | 'warning';
  field: 'nameAr' | 'descriptionAr' | 'nameFr' | 'descriptionFr' | 'image';
  message: string;
  messageFr: string;
}

export function SEOAuditUtility() {
  const { showToast } = useToast();
  const [auditItems, setAuditItems] = useState<SEOAuditItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'optimal'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState<SEOAuditItem | null>(null);
  const [editForm, setEditForm] = useState({
    nameAr: '',
    nameFr: '',
    descriptionAr: '',
    descriptionFr: ''
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  // Run automated audit on load
  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    try {
      let dbServices: Service[] = [];
      try {
        const snapshot = await getDocs(collection(db, "services"));
        dbServices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Service));
      } catch (err) {
        console.warn("Firestore fetch for SEO audit skipped or offline, using static catalog:", err);
      }

      // Merge static catalog with DB services
      const allMap = new Map<string, SEOAuditItem>();

      // 1. Process static services
      SERVICES.forEach(s => {
        const item = analyzeServiceSEO(s, false);
        allMap.set(s.id, item);
      });

      // 2. Override / Add DB services
      dbServices.forEach(s => {
        const item = analyzeServiceSEO(s, true);
        allMap.set(s.id, item);
      });

      const items = Array.from(allMap.values());
      setAuditItems(items);
    } catch (error) {
      console.error("SEO Audit Error:", error);
      showToast("حدث خطأ أثناء فحص البيانات", "error");
    } finally {
      setLoading(false);
    }
  };

  const analyzeServiceSEO = (service: Service, isDbDoc: boolean): SEOAuditItem => {
    const issues: SEOIssue[] = [];
    let score = 100;

    const nameAr = service.nameAr || service.name || '';
    const nameFr = service.nameFr || '';
    const descriptionAr = service.descriptionAr || service.description || '';
    const descriptionFr = service.descriptionFr || '';
    const imageUrl = service.imageUrl || service.image || '';

    // Check Arabic Name/Title
    if (!nameAr || nameAr.trim().length < 4) {
      issues.push({
        type: 'critical',
        field: 'nameAr',
        message: 'عنوان الخدمة العربي مفقود أو قصير جداً',
        messageFr: 'Titre arabe manquant ou trop court'
      });
      score -= 35;
    }

    // Check Arabic Meta Description
    if (!descriptionAr || descriptionAr.trim().length < 15) {
      issues.push({
        type: 'critical',
        field: 'descriptionAr',
        message: 'وصف السيو العربي مفقود تماماً أو غير مكتمل',
        messageFr: 'Description SEO arabe manquante'
      });
      score -= 35;
    } else if (descriptionAr.trim().length < 45) {
      issues.push({
        type: 'warning',
        field: 'descriptionAr',
        message: 'وصف السيو العربي قصير نسبياً (يفضل أكثر من 50 حرفاً)',
        messageFr: 'Description arabe un peu courte'
      });
      score -= 15;
    }

    // Check French Title
    if (!nameFr || nameFr.trim().length < 3) {
      issues.push({
        type: 'warning',
        field: 'nameFr',
        message: 'العنوان باللغة الفرنسية غير محدد (مهم للسيو ثنائي اللغة)',
        messageFr: 'Titre en français manquant'
      });
      score -= 10;
    }

    // Check French Description
    if (!descriptionFr || descriptionFr.trim().length < 15) {
      issues.push({
        type: 'warning',
        field: 'descriptionFr',
        message: 'وصف السيو باللغة الفرنسية مفقود',
        messageFr: 'Description SEO en français manquante'
      });
      score -= 10;
    }

    // Check Service Image
    if (!imageUrl || imageUrl.trim().length < 5) {
      issues.push({
        type: 'warning',
        field: 'image',
        message: 'صورة الخدمة مفقودة (مهمة لوسوم OpenGraph وGoogle Images)',
        messageFr: 'Image du service manquante'
      });
      score -= 10;
    }

    return {
      id: service.id,
      name: service.name || nameAr,
      nameAr,
      nameFr,
      descriptionAr,
      descriptionFr,
      imageUrl,
      status: service.status || 'active',
      category: service.category || 'general',
      score: Math.max(0, score),
      issues,
      isDbDoc
    };
  };

  // Auto-generate optimal metadata for a service
  const handleAutoGenerateMeta = (item: SEOAuditItem) => {
    const sName = item.nameAr || item.name;
    const generatedNameAr = item.nameAr && item.nameAr.includes('شحن') ? item.nameAr : `شحن ${sName} في موريتانيا`;
    const generatedNameFr = item.nameFr || `Recharge ${item.name} en Mauritanie`;
    
    const generatedDescAr = `شحن فوري وآمن لخدمة ${sName} في موريتانيا بأفضل الأسعار عبر بنكيلي (Bankily)، مصرفي (Masrvi)، والسداد برصيد الأوقية MRU مع تسليم تلقائي بدعم فني 24/7 عبر موري توب.`;
    const generatedDescFr = `Recharge rapide et sécurisée de ${item.name} en Mauritanie au meilleur prix via Bankily, Masrvi et Sedad en Ouguiya (MRU) sur MauriTop.`;

    setEditForm({
      nameAr: generatedNameAr,
      nameFr: generatedNameFr,
      descriptionAr: generatedDescAr,
      descriptionFr: generatedDescFr
    });

    setEditingItem(item);
    showToast('تم إعداد ميتاداتا محسّنة محرك البحث تلقائياً', 'success');
  };

  const handleSaveSEO = async (itemId: string) => {
    setSavingId(itemId);
    try {
      const docRef = doc(db, "services", itemId);
      await updateDoc(docRef, {
        nameAr: editForm.nameAr,
        nameFr: editForm.nameFr,
        descriptionAr: editForm.descriptionAr,
        descriptionFr: editForm.descriptionFr,
        updatedAt: new Date().toISOString()
      });

      showToast('تم حفظ وتحديث بيانات السيو بنجاح في داتابيز', 'success');
      setEditingItem(null);
      runAudit(); // re-scan
    } catch (error: any) {
      console.error("Save SEO Error:", error);
      showToast('تعذر حفظ البيانات في داتابيز، جاري الحفظ المحلي للتقرير', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const exportAuditReport = () => {
    const reportData = {
      generatedAt: new Date().toISOString(),
      totalServicesScanned: auditItems.length,
      averageScore: Math.round(auditItems.reduce((acc, curr) => acc + curr.score, 0) / (auditItems.length || 1)),
      criticalIssuesCount: auditItems.filter(i => i.issues.some(iss => iss.type === 'critical')).length,
      warningsCount: auditItems.filter(i => i.issues.some(iss => iss.type === 'warning')).length,
      services: auditItems.map(i => ({
        id: i.id,
        name: i.nameAr || i.name,
        score: `${i.score}%`,
        status: i.score >= 90 ? 'ممتاز' : i.score >= 60 ? 'يحتاج تحسين' : 'حرج / مفقود',
        issues: i.issues.map(iss => iss.message),
        titleAr: i.nameAr,
        descriptionAr: i.descriptionAr
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mauritop-seo-audit-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('تم تحميل تقرير فحص السيو بنجاح', 'success');
  };

  // Stats
  const totalScanned = auditItems.length;
  const criticalCount = auditItems.filter(i => i.issues.some(iss => iss.type === 'critical')).length;
  const warningCount = auditItems.filter(i => i.issues.some(iss => iss.type === 'warning') && !i.issues.some(iss => iss.type === 'critical')).length;
  const optimalCount = auditItems.filter(i => i.issues.length === 0).length;
  const overallScore = Math.round(auditItems.reduce((acc, curr) => acc + curr.score, 0) / (totalScanned || 1));

  // Filter items
  const filteredItems = auditItems.filter(item => {
    const matchesSearch = (item.nameAr + item.name + item.id).toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;

    if (filter === 'critical') return item.issues.some(iss => iss.type === 'critical');
    if (filter === 'warning') return item.issues.some(iss => iss.type === 'warning') && !item.issues.some(iss => iss.type === 'critical');
    if (filter === 'optimal') return item.issues.length === 0;
    return true;
  });

  return (
    <div className="space-y-6 text-right font-sans" dir="rtl">
      {/* Header & Overview Card */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-950 border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>أداة التدقيق التلقائي لعناوين وأوصاف السيو (SEO Audit Utility)</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2">
              <FileCheck2 className="w-7 h-7 text-indigo-400 shrink-0" />
              فحص جودة واكتمال ميتاداتا الخدمات
            </h2>
            <p className="text-slate-300 text-sm max-w-2xl leading-relaxed">
              تقوم هذه الأداة التلقائية بفحص جميع الخدمات المنشورة في المنصة للتحقق من وجود عناوين السيو المحسّنة، الأوصاف الدقيقة، والترجمة الثنائية، وتنبيه الفريق الإداري عن أي نقص لتسريع الفهرسة في جوجل وBing.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={runAudit}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-cyan-400 ${loading ? 'animate-spin' : ''}`} />
              <span>إعادة الفحص الآن</span>
            </button>

            <button
              onClick={exportAuditReport}
              className="px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-bold text-indigo-300 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>تصدير التقرير (JSON)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Summary KPI Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Overall Score */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">معدل جودة السيو</p>
          <p className={`text-2xl font-black ${
            overallScore >= 85 ? 'text-emerald-400' : overallScore >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {overallScore}%
          </p>
        </div>

        {/* Total Scanned */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">إجمالي الخدمات المفحوصة</p>
          <p className="text-2xl font-black text-white">{totalScanned}</p>
        </div>

        {/* Critical Issues */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-red-500/20 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">عناوين/أوصاف مفقودة (حرج)</p>
          <p className="text-2xl font-black text-red-400">{criticalCount}</p>
        </div>

        {/* Warnings */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 text-center space-y-1">
          <p className="text-xs text-slate-400 font-medium">تحذيرات تحسين الميتاداتا</p>
          <p className="text-2xl font-black text-amber-400">{warningCount}</p>
        </div>

        {/* Optimal */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 text-center space-y-1 col-span-2 md:col-span-1">
          <p className="text-xs text-slate-400 font-medium">خدمات مكتملة مع الأوصاف</p>
          <p className="text-2xl font-black text-emerald-400">{optimalCount}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Header */}
      <div className="p-6 rounded-3xl bg-slate-900 border border-white/10 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filter === 'all' ? 'bg-indigo-500 text-slate-950 shadow-md' : 'bg-slate-950 text-slate-400 hover:text-white'
              }`}
            >
              الكل ({totalScanned})
            </button>

            <button
              onClick={() => setFilter('critical')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'critical' ? 'bg-red-500 text-white shadow-md' : 'bg-slate-950 text-red-400 hover:bg-red-500/10'
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>نواقص حرجة ({criticalCount})</span>
            </button>

            <button
              onClick={() => setFilter('warning')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'warning' ? 'bg-amber-500 text-slate-950 shadow-md' : 'bg-slate-950 text-amber-400 hover:bg-amber-500/10'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تحذيرات سيو ({warningCount})</span>
            </button>

            <button
              onClick={() => setFilter('optimal')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                filter === 'optimal' ? 'bg-emerald-500 text-slate-950 shadow-md' : 'bg-slate-950 text-emerald-400 hover:bg-emerald-500/10'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>مكتملة ومثالية ({optimalCount})</span>
            </button>
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث باسم الخدمة..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl pr-9 pl-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Audit Table / List */}
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
            <span>جاري إجراء الفحص الآلي لميتاداتا ألعاب وخدمات موري توب...</span>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            لا توجد خدمات تطابق التصفية الحالية.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl bg-slate-950 border border-white/10 hover:border-white/20 transition-all flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Info & Score */}
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Image / Avatar */}
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-slate-500">{item.id.substring(0, 3)}</span>
                    )}
                  </div>

                  {/* Title & Issues */}
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-white truncate">{item.nameAr || item.name}</h4>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-white/10 text-slate-400">
                        /services/{item.id}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-1">
                      {item.descriptionAr || <span className="text-red-400 italic font-semibold">⚠️ لا يوجد وصف سيو عربي!</span>}
                    </p>

                    {/* Detected Issues Badges */}
                    {item.issues.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        {item.issues.map((iss, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              iss.type === 'critical'
                                ? 'bg-red-500/10 border-red-500/30 text-red-300'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                            }`}
                          >
                            {iss.type === 'critical' ? <XCircle className="w-3 h-3 text-red-400" /> : <AlertTriangle className="w-3 h-3 text-amber-400" />}
                            <span>{iss.message}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Score & Actions */}
                <div className="flex items-center gap-3 shrink-0 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 border-white/10 pt-3 lg:pt-0">
                  <div className="text-left space-y-0.5">
                    <div className="text-xs font-bold text-slate-400">تقييم السيو</div>
                    <div className={`text-sm font-black ${
                      item.score >= 85 ? 'text-emerald-400' : item.score >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {item.score}%
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAutoGenerateMeta(item)}
                      className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      title="توليد ميتاداتا تلقائية محسّنة محرك البحث"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>توليد السيو تلقائياً</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingItem(item);
                        setEditForm({
                          nameAr: item.nameAr,
                          nameFr: item.nameFr,
                          descriptionAr: item.descriptionAr,
                          descriptionFr: item.descriptionFr
                        });
                      }}
                      className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-slate-400" />
                      <span>تعديل</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 sm:p-8 w-full max-w-2xl space-y-6 shadow-2xl relative text-right" dir="rtl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">تحديث ميتاداتا السيو للخدمة</h3>
                  <p className="text-xs text-slate-400">الخدمة: {editingItem.nameAr || editingItem.name}</p>
                </div>
              </div>

              <button
                onClick={() => setEditingItem(null)}
                className="p-2 text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Name AR */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الخدمة بالسيو (عربي)</label>
                <input
                  type="text"
                  value={editForm.nameAr}
                  onChange={(e) => setEditForm({ ...editForm, nameAr: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Name FR */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">عنوان الخدمة بالسيو (فرنسي)</label>
                <input
                  type="text"
                  value={editForm.nameFr}
                  onChange={(e) => setEditForm({ ...editForm, nameFr: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description AR */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف ميتاداتا السيو (عربي) - ينصح بين 50 إلى 150 حرفاً</label>
                <textarea
                  rows={3}
                  value={editForm.descriptionAr}
                  onChange={(e) => setEditForm({ ...editForm, descriptionAr: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">عدد الحروف الحالي: {editForm.descriptionAr.length} حرف</p>
              </div>

              {/* Description FR */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">وصف ميتاداتا السيو (فرنسي)</label>
                <textarea
                  rows={2}
                  value={editForm.descriptionFr}
                  onChange={(e) => setEditForm({ ...editForm, descriptionFr: e.target.value })}
                  className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold text-slate-300 cursor-pointer"
              >
                إلغاء
              </button>

              <button
                onClick={() => handleSaveSEO(editingItem.id)}
                disabled={savingId === editingItem.id}
                className="px-6 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-slate-950 text-xs font-black transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {savingId === editingItem.id ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>حفظ التحديث في داتابيز</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
