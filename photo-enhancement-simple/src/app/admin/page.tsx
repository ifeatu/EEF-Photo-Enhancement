import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'
import AdminDashboard from '@/components/AdminDashboard'

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch (error) {
    redirect('/api/auth/signin')
  }

  // Fetch dashboard data
  const [users, photos, transactions, stats] = await Promise.all([
    // Recent users
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        credits: true,
        createdAt: true,
        _count: {
          select: {
            photos: true,
            transactions: true,
          }
        }
      }
    }),
    
    // Recent photos
    prisma.photo.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    }),
    
    // Recent transactions
    prisma.transaction.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          }
        }
      }
    }),
    
    // System statistics
    Promise.all([
      prisma.user.count(),
      prisma.photo.count(),
      prisma.transaction.count(),
      prisma.photo.count({ where: { status: 'COMPLETED' } }),
      prisma.photo.count({ where: { status: 'FAILED' } }),
      prisma.transaction.aggregate({
        _sum: { amountPaid: true },
        where: { status: 'COMPLETED' }
      }),
    ]).then(([totalUsers, totalPhotos, totalTransactions, completedPhotos, failedPhotos, revenue]) => ({
      totalUsers,
      totalPhotos,
      totalTransactions,
      completedPhotos,
      failedPhotos,
      totalRevenue: revenue._sum.amountPaid || 0,
    }))
  ])

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="mt-2 text-gray-600">Manage users, photos, and system settings</p>
          </div>
          
          <AdminDashboard 
            users={users}
            photos={photos}
            transactions={transactions}
            stats={stats}
          />
        </div>
      </div>
    </div>
  )
}