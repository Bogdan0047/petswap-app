import { ReactNode, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Mail, Instagram, Twitter, Facebook, Heart } from "lucide-react";
import petswapIcon from "@/assets/petswap-icon.png";
import CookieNotice from "./CookieNotice";

interface PublicLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
}

const navItems = [
  { to: "/", label: "Home", end: true },
  { to: "/#how-it-works", label: "How it Works", hash: true },
  { to: "/#trust", label: "Trust", hash: true },
  { to: "/#cities", label: "Cities", hash: true },
  { to: "/#pricing", label: "Pricing", hash: true },
  { to: "/support", label: "Support" },
];

const PublicLayout = ({ children, title, description }: PublicLayoutProps) => {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attr: string, key: string, value: string, content: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, value);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta(`meta[name="description"]`, "name", "description", "description", description);
    setMeta(`meta[property="og:title"]`, "property", "og:title", "og:title", title);
    setMeta(`meta[name="twitter:title"]`, "name", "twitter:title", "twitter:title", title);
    setMeta(`meta[property="og:description"]`, "property", "og:description", "og:description", description);
    setMeta(`meta[name="twitter:description"]`, "name", "twitter:description", "twitter:description", description);
    setMeta(`meta[property="og:url"]`, "property", "og:url", "og:url", pathname);

    // Canonical (relative — resolves at request time)
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", pathname);
  }, [title, description, pathname]);

  // Smooth anchor scroll on the public site only.
  useEffect(() => {
    const prev = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col antialiased">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <img src={petswapIcon} alt="PetSwap" className="w-8 h-8 rounded-[8px]" />
            <span className="text-[17px] font-semibold tracking-tight text-slate-900">PetSwap</span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) =>
              item.hash ? (
                <a
                  key={item.to}
                  href={item.to}
                  className="px-3 py-2 text-[14px] font-medium rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `px-3 py-2 text-[14px] font-medium rounded-lg transition-colors ${
                      isActive
                        ? "text-slate-900 bg-slate-100"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ),
            )}
          </nav>
          <Link
            to="/welcome"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-900 text-white text-[13.5px] font-medium hover:bg-slate-800 transition-all active:scale-[0.98] flex-shrink-0"
          >
            Join Free
          </Link>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-slate-50/60 mt-16">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 sm:gap-10">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-2.5">
                <img src={petswapIcon} alt="PetSwap" className="w-7 h-7 rounded-[7px]" />
                <span className="text-[15px] font-semibold tracking-tight text-slate-900">PetSwap</span>
              </div>
              <p className="mt-3 text-[13.5px] text-slate-600 leading-relaxed max-w-xs">
                The UK pet owner community for trusted dog sitter swaps and pet care.
              </p>
              <a
                href="mailto:support@petswap.co.uk"
                className="mt-4 inline-flex items-center gap-2 text-[13.5px] text-slate-700 hover:text-slate-900"
              >
                <Mail size={14} />
                support@petswap.co.uk
              </a>
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-wider uppercase text-slate-500 mb-3">Company</p>
              <ul className="space-y-2 text-[13.5px]">
                <li><Link to="/privacy" className="text-slate-600 hover:text-slate-900">Privacy Policy</Link></li>
                <li><Link to="/terms" className="text-slate-600 hover:text-slate-900">Terms of Use</Link></li>
                <li><Link to="/support" className="text-slate-600 hover:text-slate-900">Support</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[12px] font-semibold tracking-wider uppercase text-slate-500 mb-3">Follow</p>
              <div className="flex items-center gap-2.5">
                <a href="https://instagram.com/petswapuk" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors">
                  <Instagram size={15} />
                </a>
                <a href="https://twitter.com/petswapuk" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors">
                  <Twitter size={15} />
                </a>
                <a href="https://facebook.com/petswapuk" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-9 h-9 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:border-slate-300 transition-colors">
                  <Facebook size={15} />
                </a>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[12.5px] text-slate-500">© 2026 PetSwap. All rights reserved.</p>
            <p className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500">
              Made with <Heart size={12} className="text-rose-400" fill="currentColor" /> for UK pet lovers
            </p>
          </div>
        </div>
      </footer>

      <CookieNotice />
    </div>
  );
};

export default PublicLayout;
