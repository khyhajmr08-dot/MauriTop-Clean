import React from 'react';
import { Link } from 'react-router-dom';
import { Zap, MessageCircle } from 'lucide-react';
import { OFFICIAL_PHONE } from '../constants';
import { formatNumberSpacing } from '../lib/utils';

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();
  const formattedPhone = formatNumberSpacing(OFFICIAL_PHONE);

  return (
    <footer className="bg-[#070B14] border-t border-[#243247] pt-8 pb-10 text-slate-400 text-xs select-none">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        
        {/* Main compact footer row */}
        <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 pb-6 border-b border-white/5 text-center md:text-right">
          
          {/* Brand & Tagline */}
          <div className="space-y-2 max-w-sm">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 font-black shadow-xs">
                <Zap className="w-4 h-4 fill-slate-950" />
              </div>
              <span className="text-lg font-black text-white tracking-wider">
                MAURI<span className="text-emerald-400">TOP</span>
              </span>
            </Link>
            <p className="text-xs text-slate-400 leading-relaxed font-normal">
              شحن الألعاب وشراء الخدمات الرقمية المتاحة في موريتانيا بعملة MRU.
            </p>
          </div>

          {/* Essential Links - 6 exact verified links */}
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2.5 text-xs font-bold text-slate-300">
            <Link to="/" className="hover:text-emerald-400 transition-colors">
              الرئيسية
            </Link>
            <a href="/#services" className="hover:text-emerald-400 transition-colors">
              جميع الخدمات
            </a>
            <Link to="/orders" className="hover:text-emerald-400 transition-colors">
              تتبع الطلب
            </Link>
            <Link to="/contact" className="hover:text-emerald-400 transition-colors">
              تواصل معنا
            </Link>
            <Link to="/privacy" className="hover:text-emerald-400 transition-colors">
              سياسة الخصوصية
            </Link>
            <Link to="/terms" className="hover:text-emerald-400 transition-colors">
              الشروط والأحكام
            </Link>
          </div>

          {/* Customer Support WhatsApp */}
          <div className="shrink-0 flex flex-col items-center md:items-end gap-1.5">
            <a
              href={`https://wa.me/222${OFFICIAL_PHONE}?text=${encodeURIComponent('السلام عليكم MAURITOP')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 font-bold text-xs transition-all active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>واتساب الدعم: {formattedPhone}</span>
            </a>
            <span className="text-[10px] text-slate-500">
              خدمة العملاء المباشرة في موريتانيا 🇲🇷
            </span>
          </div>

        </div>

        {/* Dynamic Copyright bottom bar */}
        <div className="pt-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-[11px] text-slate-500">
          <p>
            جميع الحقوق محفوظة © {currentYear} منصة <strong className="text-white">MAURITOP</strong>.
          </p>
          <p>
            نواكشوط، موريتانيا
          </p>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
