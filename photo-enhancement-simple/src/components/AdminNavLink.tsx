'use client'

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface AdminNavLinkProps {
  mobile?: boolean;
  onClose?: () => void;
}

/**
 * Client-side admin navigation link component
 * Only renders the admin link if the user has admin role
 */
export default function AdminNavLink({ mobile = false, onClose }: AdminNavLinkProps = {}) {
  const { data: session } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkAdminStatus() {
      if (!session?.user?.email) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const userData = await response.json();
          setIsAdmin(userData.role === 'ADMIN');
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    }

    checkAdminStatus();
  }, [session]);

  // Don't render anything while loading or if not admin
  if (loading || !isAdmin) {
    return null;
  }

  return (
    <Link
      href="/admin"
      className={mobile 
        ? "text-gray-700 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium" 
        : "text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
      }
      onClick={mobile ? onClose : undefined}
    >
      Admin
    </Link>
  );
}