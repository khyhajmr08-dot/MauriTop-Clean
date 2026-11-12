import React from "react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import { OFFICIAL_PHONE } from "../constants";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertCircle, Clock, CreditCard, RefreshCw } from "lucide-react";

export default function TermsPage() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#070B14] text-[#F8FAFC] px-4 py-8 md:py-12">
      <SEO 
        title="الشروط والأحكام والخدمة | MAURITOP" 
        description="شروط الاستخدام وأحكام خدمة شحن الألعاب والبطاقات الرقمية في منصة موري توب (MAURITOP) بموريتانيا. تفاصيل الأسعار بعملة MRU، وسائل الدفع المعتمدة، وضمانات التنفيذ."
        keywords="شروط الاستخدام موري توب, أحكام الخدمة, سياسة الشحن, MAURITOP terms, شحن ألعاب موريتانيا, بنكيلي, سداد, غزة باي, MRU"
      />

      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-[#A8B3C5]">
          <Link to="/" className="inline-flex items-center gap-1.5 hover:text-[#10B981] transition-colors">
            <ArrowRight size={16} />
            <span>الرئيسية</span>
          </Link>
          <span className="text-[#334155]">/</span>
          <span className="text-white font-medium">الشروط والأحكام</span>
        </div>

        {/* Header Box */}
        <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-4 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-bold">
            <ShieldCheck size={16} />
            <span>اتفاقية الاستخدام والخدمة</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            الشروط والأحكام — موري توب (MAURITOP)
          </h1>
          <p className="text-[#A8B3C5] text-sm sm:text-base leading-relaxed">
            مرحباً بك في منصة <strong>MAURITOP</strong>. إن وصولك إلى المنصة أو تقديمك لأي طلب شحن يعني موافقتك الصريحة على هذه الشروط والأحكام المُنظمة لخدماتنا داخل الجمهورية الإسلامية الموريتانية.
          </p>
          <div className="pt-2 text-xs text-[#64748B]">
            آخر تحديث معتمد: {new Date().getFullYear()}
          </div>
        </div>

        {/* Main Clauses */}
        <div className="space-y-6">
          {/* Clause 1 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h2 className="text-lg font-bold text-white">طبيعة الخدمات والمنتجات الرقمية</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              منصة <strong>MAURITOP</strong> منصة رقمية موريتانية متخصصة في شحن رصيد الألعاب الإلكترونية (مثل Free Fire، PUBG Mobile)، اشتراكات البث والوسائط، والبطاقات الرقمية. جميع المنتجات رقمية وغير ملموسة، ويتم تسليمها إلكترونياً مباشرة إلى الحساب المحدد أو عبر رموز رقمية.
            </p>
          </div>

          {/* Clause 2 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h2 className="text-lg font-bold text-white">صحة معرّف الحساب (Player ID)</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              يتحمل العميل المسؤولية القانونية والفنية الكاملة عن دقة معرّف الحساب (Player ID أو اسم المستخدم) المدخل عند الطلب. بعد إتمام شحن الرصيد إلى الحساب المسجل بالنظام، لا يمكن سحب الرصيد أو استرداد قيمته في حال كان المعرّف المدخل خاطئاً من قِبل العميل.
            </p>
          </div>

          {/* Clause 3 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h2 className="text-lg font-bold text-white">العملة ووسائل الدفع المعتمدة</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              تُعرض جميع الأسعار وتُدفع بالأوقية الموريتانية الجديدة (MRU). يتم الدفع بالتحويل المباشر عبر المحافظ البنكية الوطنية:
            </p>
            <ul className="text-sm text-[#A8B3C5] space-y-2 pr-11 list-disc list-inside">
              <li><strong className="text-white">بنكيلي (Bankily)</strong> التابع للبنك الشعبي الموريتاني.</li>
              <li><strong className="text-white">سداد (Sedad)</strong> التابع لبنك المعاملات الصحيحة.</li>
              <li><strong className="text-white">غزة باي (GazaPay)</strong> التابع لغزة للحلول المالية.</li>
            </ul>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11 pt-1">
              يلتزم العميل بإرفاق لقطة شاشة واضحة لإشعار التحويل البنكي ورقم المرجع (Reference) لتسريع التدقيق والتنفيذ.
            </p>
          </div>

          {/* Clause 4 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                4
              </div>
              <h2 className="text-lg font-bold text-white">أوقات المعالجة وحالات الطلب</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              تتم معالجة الطلبات عادة خلال دقائق معدودة (5 إلى 20 دقيقة) خلال ساعات العمل الرسمية. يمر كل طلب بحالات محددة يمكن متابعتها عبر صفحة طلباتي:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-11 pt-1 text-xs">
              <div className="bg-[#070B14] p-3 rounded-xl border border-[#1F2C40]">
                <span className="font-bold text-amber-400">قيد المراجعة:</span> تم استلام الطلب والتحقق المالي جارٍ.
              </div>
              <div className="bg-[#070B14] p-3 rounded-xl border border-[#1F2C40]">
                <span className="font-bold text-blue-400">قيد المعالجة:</span> تم تأكيد الدفع وجارٍ شحن الخدمة.
              </div>
              <div className="bg-[#070B14] p-3 rounded-xl border border-[#1F2C40]">
                <span className="font-bold text-[#10B981]">مكتمل:</span> تم شحن الرصيد أو تسليم الرمز بنجاح.
              </div>
              <div className="bg-[#070B14] p-3 rounded-xl border border-[#1F2C40]">
                <span className="font-bold text-red-400">مرفوض:</span> إشعار التحويل غير مطابق أو تعذر التنفيذ.
              </div>
            </div>
          </div>

          {/* Clause 5 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                5
              </div>
              <h2 className="text-lg font-bold text-white">سياسة الاسترجاع والإلغاء</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              نظراً للطبيعة الفورية والنهائية للسلع الرقمية، لا يمكن إلغاء الطلب بعد اعتماده وتنفيذه في الحساب. في حال تعذر تنفيذ الطلب لأسباب تقنية أو عدم توفر الحزمة المطلوبة لدى المزود، يحق للعميل استرداد كامل المبلغ المدفوع بالأوقية (MRU) أو تحويله لخدمة بديلة بناءً على رغبته.
            </p>
          </div>

          {/* Clause 6 */}
          <div className="border border-[#1F2C40] bg-[#0B1120] rounded-2xl p-6 sm:p-8 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#10B981]/15 text-[#10B981] flex items-center justify-center font-bold text-sm">
                6
              </div>
              <h2 className="text-lg font-bold text-white">الدعم الفني الرسمي</h2>
            </div>
            <p className="text-[#A8B3C5] text-sm leading-relaxed pr-11">
              لأي استفسار أو متابعة لطلبك، يرجى التواصل مع فريق الدعم الفني الرسمي عبر واتساب:{" "}
              <a 
                href={`https://wa.me/222${OFFICIAL_PHONE}`}
                target="_blank"
                rel="noopener noreferrer"
                dir="ltr"
                className="text-[#10B981] font-bold hover:underline inline-block mx-1"
              >
                +222 {OFFICIAL_PHONE}
              </a>
              {" "}مع ذكر رقم الطلب الخاص بك.
            </p>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="pt-4 border-t border-[#1F2C40] flex flex-wrap items-center justify-between gap-4 text-sm">
          <Link to="/" className="text-[#10B981] font-semibold hover:underline">
            ← العودة للصفحة الرئيسية
          </Link>
          <Link to="/privacy" className="text-[#A8B3C5] hover:text-white transition-colors">
            سياسة الخصوصية وحماية البيانات
          </Link>
        </div>
      </div>
    </main>
  );
}
