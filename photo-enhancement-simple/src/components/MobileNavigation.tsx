'use client'

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Suspense, useState } from "react";
import AdminNavLink from "./AdminNavLink";
import { Menu, X, Camera, User, CreditCard, HelpCircle, LogOut, LogIn } from "lucide-react";

export default function MobileNavigation() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className="relative z-50 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-xl sm:text-2xl font-bold text-gray-900"
              onClick={closeMobileMenu}
            >
              <Camera className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
              <span className="hidden xs:inline">PhotoEnhance</span>
              <span className="xs:hidden">PE</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/gallery"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Gallery
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Pricing
                </Link>
                <Link
                  href="/support"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Support
                </Link>
                <Suspense fallback={null}>
                  <AdminNavLink />
                </Suspense>
                <Link
                  href="/api/auth/signout"
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/support"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Support
                </Link>
                <Link
                  href="/api/auth/signin"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/api/auth/signin"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-gray-900 focus:outline-none focus:text-gray-900 p-2"
              aria-label="Toggle mobile menu"
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 inset-x-0 bg-white shadow-lg border-b border-gray-200 z-40">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {session ? (
              <>
                <MobileNavItem
                  href="/dashboard"
                  icon={<User className="w-5 h-5" />}
                  text="Dashboard"
                  onClick={closeMobileMenu}
                />
                <MobileNavItem
                  href="/gallery"
                  icon={<Camera className="w-5 h-5" />}
                  text="Gallery"
                  onClick={closeMobileMenu}
                />
                <MobileNavItem
                  href="/pricing"
                  icon={<CreditCard className="w-5 h-5" />}
                  text="Pricing"
                  onClick={closeMobileMenu}
                />
                <MobileNavItem
                  href="/support"
                  icon={<HelpCircle className="w-5 h-5" />}
                  text="Support"
                  onClick={closeMobileMenu}
                />
                <Suspense fallback={null}>
                  <AdminNavLink mobile onClose={closeMobileMenu} />
                </Suspense>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <MobileNavItem
                    href="/api/auth/signout"
                    icon={<LogOut className="w-5 h-5" />}
                    text="Sign Out"
                    onClick={closeMobileMenu}
                    variant="danger"
                  />
                </div>
              </>
            ) : (
              <>
                <MobileNavItem
                  href="/support"
                  icon={<HelpCircle className="w-5 h-5" />}
                  text="Support"
                  onClick={closeMobileMenu}
                />
                <MobileNavItem
                  href="/api/auth/signin"
                  icon={<LogIn className="w-5 h-5" />}
                  text="Sign In"
                  onClick={closeMobileMenu}
                />
                <MobileNavItem
                  href="/api/auth/signin"
                  icon={<Camera className="w-5 h-5" />}
                  text="Get Started"
                  onClick={closeMobileMenu}
                  variant="primary"
                />
              </>
            )}
          </div>
          {session && (
            <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
              <div className="text-sm text-gray-600">Signed in as</div>
              <div className="text-sm font-medium text-gray-900 truncate">
                {session.user?.name || session.user?.email}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-25 z-30"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}
    </nav>
  );
}

interface MobileNavItemProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

function MobileNavItem({ href, icon, text, onClick, variant = 'default' }: MobileNavItemProps) {
  const baseClasses = "flex items-center space-x-3 px-3 py-3 rounded-md text-base font-medium transition-colors";
  const variantClasses = {
    default: "text-gray-700 hover:text-gray-900 hover:bg-gray-50",
    primary: "text-blue-600 hover:text-blue-700 hover:bg-blue-50 font-semibold",
    danger: "text-red-600 hover:text-red-700 hover:bg-red-50"
  };

  return (
    <Link
      href={href}
      className={`${baseClasses} ${variantClasses[variant]}`}
      onClick={onClick}
    >
      {icon}
      <span>{text}</span>
    </Link>
  );
}