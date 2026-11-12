import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { TrendingUp, Users, Shield, Target, Award, ArrowUpRight } from 'lucide-react';
import { formatMRU } from '../lib/utils';

const mockDailyVol = [
  { name: 'السبت', volume: 45000, profit: 3400 },
  { name: 'الأحد', volume: 62000, profit: 4100 },
  { name: 'الاثنين', volume: 51000, profit: 3900 },
  { name: 'الثلاثاء', volume: 84000, profit: 6200 },
  { name: 'الأربعاء', volume: 73000, profit: 5100 },
  { name: 'الخميس', volume: 95000, profit: 7900 },
  { name: 'الجمعة', volume: 110000, profit: 9200 },
];

const mockAgents = [
  { id: 'A01', name: 'محمد الأمين ولد أحمد', region: 'تفرغ زينة', transactions: 142, volume: 284000, rating: 4.9, active: true },
  { id: 'A02', name: 'فاطمة الزهراء', region: 'لكصر', transactions: 98, volume: 196000, rating: 4.8, active: true },
  { id: 'A03', name: 'سيدي محمد البشير', region: 'عرفات', transactions: 115, volume: 172500, rating: 4.7, active: true },
  { id: 'A04', name: 'أحمد محمود بونة', region: 'دار النعيم', transactions: 74, volume: 111000, rating: 4.6, active: false },
  { id: 'A05', name: 'زينب بنت سيدي', region: 'السبخة', transactions: 51, volume: 64000, rating: 4.5, active: true },
];

const AgentsAnalytics: React.FC = () => {
  return (
    <div className="space-y-8 animate-fade-in text-right" dir="rtl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 italic flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-cyan-500" />
            تحليلات الوكلاء والسيولة
          </h2>
          <p className="text-sm text-gray-500 font-bold mt-1">مراقبة أداء الوكلاء، تداول الأموال، وصافي أرباح المنصة بالدول الصارم.</p>
        </div>
        <div className="flex items-center gap-2 bg-cyan-500/10 text-cyan-700 px-4 py-2 rounded-2xl border border-cyan-500/20 font-black text-xs">
          <Award className="w-5 h-5 text-cyan-600" /> تحديث مباشر من محرك السيولة
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 bg-cyan-100 rounded-2xl text-cyan-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-black">الوكلاء المسجلين</p>
            <p className="text-2xl font-black text-gray-900 mt-1">24 وكيل مالي</p>
            <span className="text-[10px] text-green-500 font-bold">+3 وكلاء هذا الأسبوع</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 bg-green-100 rounded-2xl text-green-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-black">إجمالي حجم التداول</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatMRU(827500)}</p>
            <span className="text-[10px] text-green-500 font-bold">+18.5% نمو التداول</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-black">صافي الهامش الربحي (الرسوم)</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{formatMRU(39800)}</p>
            <span className="text-[10px] text-indigo-500 font-bold">معدل اقتطاع 4.8%</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-gray-900 mb-2">منحنى السيولة اليومية والعمليات</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockDailyVol} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} fontStyle="bold" />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(value: any) => [formatMRU(value), '']} />
                <Area type="monotone" dataKey="volume" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorVolume)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
          <h3 className="text-lg font-black text-gray-900 mb-2">توزيع الأرباح العائدة للمنصة</h3>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mockDailyVol}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} />
                <Tooltip formatter={(value: any) => [formatMRU(value), 'الربح']} />
                <Legend />
                <Bar dataKey="profit" fill="#6366f1" radius={[8, 8, 0, 0]} name="عمولات التحصيل المباشرة" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Agents */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 className="font-black text-gray-900 text-lg">ترتيب أفضل الوكلاء ومعدلات التنفيذ</h3>
          <button className="text-xs text-cyan-600 font-bold hover:underline flex items-center gap-1">عرض جميع الوكلاء <ArrowUpRight className="w-4 h-4" /></button>
        </div>
        <div className="overflow-x-auto text-right">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50/60 text-gray-400 font-black border-b border-gray-100 uppercase text-[10px] tracking-widest">
                <th className="py-4 px-6">المعرف</th>
                <th className="py-4 px-6">الوكيل</th>
                <th className="py-4 px-6">المنطقة الجغرافية</th>
                <th className="py-4 px-6">العمليات</th>
                <th className="py-4 px-6">حجم التداول</th>
                <th className="py-4 px-6">التقييم</th>
                <th className="py-4 px-6">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-105">
              {mockAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="py-4 px-6 font-mono text-xs text-gray-500">{agent.id}</td>
                  <td className="py-4 px-6 font-black text-gray-900">{agent.name}</td>
                  <td className="py-4 px-6 font-bold text-gray-500">{agent.region}</td>
                  <td className="py-4 px-6 font-bold text-[#0a192f]">{agent.transactions} عملية</td>
                  <td className="py-4 px-6 font-black text-cyan-600">{formatMRU(agent.volume)}</td>
                  <td className="py-4 px-6 font-bold text-amber-500">⭐ {agent.rating}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black ${agent.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {agent.active ? 'نشط الآن' : 'غير متصل'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AgentsAnalytics;
