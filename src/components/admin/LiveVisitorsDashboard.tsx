import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { 
  Users, 
  User, 
  Smartphone, 
  Monitor, 
  Clock, 
  MapPin, 
  Activity, 
  Search, 
  Filter, 
  ShieldCheck, 
  Phone, 
  Mail, 
  Globe, 
  Compass,
  CheckCircle2,
  CircleDot
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils';
import { useLanguage } from '../../contexts/LanguageContext';

interface Visitor {
  sessionId: string;
  userId: string | null;
  email: string | null;
  name: string | null;
  phone: string | null;
  isRegistered: boolean;
  device: string;
  browser?: string;
  timeZone?: string;
  userAgent: string;
  lastActive: Timestamp | any;
  path: string;
}

function formatRelativeTimeAr(date: Date, now: number): string {
  const diffSec = Math.floor((now - date.getTime()) / 1000);
  if (diffSec < 60) return "الآن (قبل لحظات)";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  return `منذ ${diffDays} يوم`;
}

export function LiveVisitorsDashboard() {
  const [allVisitors, setAllVisitors] = useState<Visitor[]>([]);
  const [filterTab, setFilterTab] = useState<'all' | 'online' | 'offline' | 'registered'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [now, setNow] = useState<number>(Date.now());
  const { isRtl } = useLanguage();

  // Tick every 15s to update relative times and online status accurately
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Fetch last 100 active/past sessions
    const q = query(
      collection(db, 'active_visitors'),
      orderBy('lastActive', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs: Visitor[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Visitor;
        docs.push(data);
      });
      setAllVisitors(docs);
    }, (error) => {
      console.warn("Firestore live visitors listener issue:", error);
    });

    return () => unsubscribe();
  }, []);

  // An active visitor is one whose heartbeat occurred within the last 5 minutes
  const isOnline = (visitor: Visitor) => {
    if (!visitor.lastActive) return false;
    let ms = 0;
    if (typeof visitor.lastActive.toMillis === 'function') {
      ms = visitor.lastActive.toMillis();
    } else if (visitor.lastActive.seconds) {
      ms = visitor.lastActive.seconds * 1000;
    } else {
      ms = new Date(visitor.lastActive).getTime();
    }
    const fiveMinutes = 5 * 60 * 1000;
    return now - ms < fiveMinutes;
  };

  const onlineVisitors = useMemo(() => allVisitors.filter(isOnline), [allVisitors, now]);
  const offlineVisitors = useMemo(() => allVisitors.filter(v => !isOnline(v)), [allVisitors, now]);
  const registeredVisitors = useMemo(() => allVisitors.filter(v => v.isRegistered), [allVisitors]);

  const filteredVisitors = useMemo(() => {
    let list = allVisitors;
    if (filterTab === 'online') list = onlineVisitors;
    else if (filterTab === 'offline') list = offlineVisitors;
    else if (filterTab === 'registered') list = registeredVisitors;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(v => 
        (v.name && v.name.toLowerCase().includes(q)) ||
        (v.email && v.email.toLowerCase().includes(q)) ||
        (v.phone && v.phone.includes(q)) ||
        (v.userId && v.userId.toLowerCase().includes(q)) ||
        (v.path && v.path.toLowerCase().includes(q)) ||
        (v.browser && v.browser.toLowerCase().includes(q))
      );
    }

    return list;
  }, [allVisitors, filterTab, searchQuery, onlineVisitors, offlineVisitors, registeredVisitors]);

  return (
    <div className={cn("space-y-6 text-right", isRtl ? "rtl" : "ltr")} dir={isRtl ? "rtl" : "ltr"}>
      
      {/* Header Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Online */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between relative overflow-hidden text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">متصل الآن (آخر 5 دقائق)</span>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-400">{onlineVisitors.length}</span>
            <span className="text-xs text-slate-400">نشط الآن</span>
          </div>
        </div>

        {/* Registered Online */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">أعضاء مسجلين متصلين</span>
            <User size={18} className="text-cyan-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-cyan-400">
              {onlineVisitors.filter(v => v.isRegistered).length}
            </span>
            <span className="text-xs text-slate-400">عضو مسجل</span>
          </div>
        </div>

        {/* Guests Online */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">زوار ضيوف متصلين</span>
            <Users size={18} className="text-amber-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-400">
              {onlineVisitors.filter(v => !v.isRegistered).length}
            </span>
            <span className="text-xs text-slate-400">زائر ضيف</span>
          </div>
        </div>

        {/* Total Tracked Sessions */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">سجل الجلسات المحفوظة</span>
            <Clock size={18} className="text-purple-400" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-purple-400">{allVisitors.length}</span>
            <span className="text-xs text-slate-400">جلسة مسجلة</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4 text-white">
        
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-2xl border border-slate-800 overflow-x-auto w-full md:w-auto">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
              filterTab === 'all' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            الكل ({allVisitors.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('online')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
              filterTab === 'online' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-emerald-400"
            )}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>نشط الآن ({onlineVisitors.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('offline')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
              filterTab === 'offline' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-white"
            )}
          >
            نشط سابقاً ({offlineVisitors.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('registered')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap",
              filterTab === 'registered' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-400 hover:text-cyan-400"
            )}
          >
            مسجلين فقط ({registeredVisitors.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث بالاسم، الهاتف، البريد، الصفحة..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 outline-none transition-all"
          />
        </div>
      </div>

      {/* Visitors List / Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-lg overflow-hidden text-white">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Activity className="w-5 h-5 text-emerald-400" />
            <div>
              <h4 className="text-base font-black text-white">سجل الزوار والمستخدمين النشطين</h4>
              <p className="text-[11px] text-slate-400">
                بيانات آمنة ومحمية للإدارة فقط مع احترام خصوصية العملاء وعدم جمع أي موقع دقيق دون إذن
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-slate-400 uppercase font-black">
              <tr>
                <th className="px-5 py-3.5">الحالة</th>
                <th className="px-5 py-3.5">المستخدم / الهوية</th>
                <th className="px-5 py-3.5">بيانات الاتصال</th>
                <th className="px-5 py-3.5">الصفحة الحالية</th>
                <th className="px-5 py-3.5">الجهاز والمتصفح</th>
                <th className="px-5 py-3.5">آخر نشاط</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVisitors.length > 0 ? (
                filteredVisitors.map((visitor) => {
                  const activeNow = isOnline(visitor);
                  let lastActiveDate: Date | null = null;
                  if (visitor.lastActive) {
                    if (typeof visitor.lastActive.toDate === 'function') {
                      lastActiveDate = visitor.lastActive.toDate();
                    } else if (visitor.lastActive.seconds) {
                      lastActiveDate = new Date(visitor.lastActive.seconds * 1000);
                    } else {
                      lastActiveDate = new Date(visitor.lastActive);
                    }
                  }

                  return (
                    <tr 
                      key={visitor.sessionId}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Status */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        {activeNow ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>نشط الآن</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            <span>غير متصل</span>
                          </span>
                        )}
                      </td>

                      {/* User Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className={cn(
                            "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-black",
                            visitor.isRegistered 
                              ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" 
                              : "bg-slate-800 text-slate-400 border border-slate-700"
                          )}>
                            {visitor.isRegistered ? <User size={15} /> : <Users size={15} />}
                          </div>
                          <div>
                            <p className="font-black text-white">
                              {visitor.name || (visitor.isRegistered ? "عضو مسجل" : "زائر ضيف")}
                            </p>
                            {visitor.userId && (
                              <p className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]" title={visitor.userId}>
                                ID: {visitor.userId.slice(0, 8)}...
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact Info (if provided willingly by user) */}
                      <td className="px-5 py-4">
                        <div className="space-y-0.5 font-mono text-[11px]">
                          {visitor.phone ? (
                            <div className="flex items-center gap-1 text-emerald-400 font-bold" dir="ltr">
                              <Phone size={11} />
                              <span>{visitor.phone}</span>
                            </div>
                          ) : null}
                          {visitor.email ? (
                            <div className="flex items-center gap-1 text-slate-400 truncate max-w-[160px]" dir="ltr">
                              <Mail size={11} />
                              <span className="truncate">{visitor.email}</span>
                            </div>
                          ) : null}
                          {!visitor.phone && !visitor.email && (
                            <span className="text-slate-500 text-[10px]">غير مسجل</span>
                          )}
                        </div>
                      </td>

                      {/* Path */}
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 font-mono text-slate-300 text-[11px]" dir="ltr">
                          <MapPin size={11} className="text-cyan-400 shrink-0" />
                          <span className="truncate max-w-[130px]">{visitor.path || "/"}</span>
                        </div>
                      </td>

                      {/* Device & Browser */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-lg bg-slate-800 text-slate-300">
                            {visitor.device === 'Mobile' ? (
                              <Smartphone size={14} className="text-amber-400" />
                            ) : (
                              <Monitor size={14} className="text-cyan-400" />
                            )}
                          </div>
                          <div>
                            <span className="font-bold text-white block">{visitor.device || "Desktop"}</span>
                            <span className="text-[10px] text-slate-400">
                              {visitor.browser || "Web"} {visitor.timeZone ? `• ${visitor.timeZone.split('/')[1] || visitor.timeZone}` : ''}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Last Active Timestamp */}
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="space-y-0.5">
                          <span className="text-slate-300 font-bold block">
                            {lastActiveDate ? formatRelativeTimeAr(lastActiveDate, now) : "غير محدد"}
                          </span>
                          {lastActiveDate && (
                            <span className="text-[10px] text-slate-500 font-mono" dir="ltr">
                              {lastActiveDate.toLocaleTimeString('ar-MR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-14 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users size={32} className="text-slate-600 mb-1" />
                      <p className="font-bold text-slate-400">لا توجد جلسات تطابق البحث أو الفلتر المحدد</p>
                      <button
                        type="button"
                        onClick={() => { setFilterTab('all'); setSearchQuery(''); }}
                        className="text-xs text-cyan-400 hover:underline mt-1"
                      >
                        إعادة ضبط الفلاتر
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
