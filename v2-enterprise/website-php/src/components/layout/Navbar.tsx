"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X, Moon, Sun, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n/context";
import { BRAND } from "@/lib/data/locations";
import { LinkButton } from "@/components/ui/Button";

export default function Navbar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { locale, dict, toggleLocale } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Only the home hero is a full-bleed dark scene — everywhere else the
  // header should read as "scrolled" (opaque, theme-aware) from the start.
  const transparent = isHome && !scrolled;

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = [
    { key: "home", href: "/", label: locale === "ar" ? "الرئيسية" : "Home" },
    { key: "vehicles", href: "/vehicles", label: dict.nav.vehicles },
    { key: "technology", href: "/technology", label: dict.nav.technology },
    { key: "about", href: "/about", label: dict.nav.about },
    { key: "contact", href: "/contact", label: dict.nav.contact },
  ];

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        transparent ? "py-5" : "glass py-2.5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.15)]",
      )}
    >
      <div className="container-premium flex items-center justify-between">
        {/* Language toggle */}
        <button
          onClick={toggleLocale}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition",
            transparent
              ? "border-white/25 text-white hover:bg-white/10"
              : "border-border-strong text-fg-muted hover:text-fg",
          )}
        >
          {locale === "ar" ? "EN" : "AR"}
          <Languages className="h-3.5 w-3.5" />
        </button>

        {/* Centered links (desktop) */}
        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-8 lg:flex">
          {navLinks.map((l) => (
            <Link
              key={l.key}
              href={l.href}
              className={cn(
                "text-sm font-semibold transition",
                transparent ? "text-white/90 hover:text-white" : "text-fg-muted hover:text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        {/* Brand */}
        <Link href="/" className="flex items-center gap-2">
          <span
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full text-lg font-black",
              transparent ? "bg-white/15 text-white backdrop-blur" : "bg-primary text-white",
            )}
          >
            أ
          </span>
          <span className={cn("hidden text-sm font-extrabold tracking-tight sm:inline", transparent ? "text-white" : "text-fg")}>
            {locale === "ar" ? BRAND.nameAr : BRAND.nameEn}
          </span>
        </Link>

        {/* Right utilities */}
        <div className="hidden items-center gap-1 lg:flex">
          <button
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition",
              transparent ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-fg-muted hover:bg-bg-muted hover:text-fg",
            )}
            aria-label="Toggle theme"
          >
            {mounted ? (
              resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
            ) : (
              <span className="block h-4 w-4" />
            )}
          </button>
        </div>

        <button
          onClick={() => setMobileOpen(true)}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full lg:hidden",
            transparent ? "text-white" : "text-fg",
          )}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <motion.div
              initial={{ x: locale === "ar" ? -360 : 360 }}
              animate={{ x: 0 }}
              exit={{ x: locale === "ar" ? -360 : 360 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-y-0 start-0 flex w-[86%] max-w-sm flex-col bg-bg-elevated p-6"
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-extrabold">{locale === "ar" ? BRAND.nameAr : BRAND.nameEn}</span>
                <button onClick={() => setMobileOpen(false)} aria-label="Close menu">
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="mt-8 flex flex-1 flex-col gap-1 overflow-y-auto">
                {navLinks.map((l) => (
                  <Link
                    key={l.key}
                    href={l.href}
                    onClick={() => setMobileOpen(false)}
                    className="rounded-lg px-3 py-3 text-base font-bold text-fg hover:bg-bg-muted"
                  >
                    {l.label}
                  </Link>
                ))}
                <div className="my-2 border-t border-border" />
                <Link href="/finance" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-bg-muted">
                  {dict.nav.finance}
                </Link>
                <Link href="/offers" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-bg-muted">
                  {dict.nav.offers}
                </Link>
                <Link href="/trade-in" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-bg-muted">
                  {dict.nav.tradeIn}
                </Link>
                <button
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                  className="flex items-center gap-2 rounded-lg px-3 py-3 text-sm font-semibold text-fg-muted hover:bg-bg-muted"
                >
                  {mounted ? (
                    resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
                  ) : (
                    <span className="block h-4 w-4" />
                  )}
                  {locale === "ar" ? "تبديل المظهر" : "Toggle theme"}
                </button>
              </div>
              <LinkButton href="/test-drive" className="mt-4 w-full justify-center">
                {dict.cta.bookTestDrive}
              </LinkButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
