'use client'

import Link from "next/link";
import { useSession } from "next-auth/react";
import { Suspense } from "react";
import AdminNavLink from "./AdminNavLink";

export default function Navigation() {
  const { data: session } = useSession();

  return (
    <nav className="relative z-50 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-gray-900">
              PhotoEnhance
            </Link>
          </div>
          <div className="flex items-center space-x-4">
            {session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Dashboard
                </Link>
                <Link
                  href="/gallery"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Gallery
                </Link>
                <Link
                  href="/pricing"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Pricing
                </Link>
                <Link
                  href="/support"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Support
                </Link>
                <Suspense fallback={null}>
                  <AdminNavLink />
                </Suspense>
                <Link
                  href="/api/auth/signout"
                  className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Sign Out
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/support"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Support
                </Link>
                <Link
                  href="/api/auth/signin"
                  className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/api/auth/signin"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}