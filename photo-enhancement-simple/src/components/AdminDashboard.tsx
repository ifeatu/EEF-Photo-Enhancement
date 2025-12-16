'use client'

import { useState } from 'react'
import { ChevronDownIcon, ChevronRightIcon, TrashIcon, PencilIcon, EyeIcon } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  credits: number
  createdAt: Date
  _count: {
    photos: number
    transactions: number
  }
}

interface Photo {
  id: string
  originalUrl: string
  enhancedUrl: string | null
  status: string
  title: string | null
  createdAt: Date
  user: {
    name: string | null
    email: string
  }
}

interface Transaction {
  id: string
  creditsPurchased: number
  amountPaid: number
  status: string
  createdAt: Date
  user: {
    name: string | null
    email: string
  }
}

interface Stats {
  totalUsers: number
  totalPhotos: number
  totalTransactions: number
  completedPhotos: number
  failedPhotos: number
  totalRevenue: number
}

interface AdminDashboardProps {
  users: User[]
  photos: Photo[]
  transactions: Transaction[]
  stats: Stats
}

export default function AdminDashboard({ users, photos, transactions, stats }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('all')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showUserDetails, setShowUserDetails] = useState<string | null>(null)

  // Filter and sort functions
  const filteredUsers = users
    .filter(user => {
      const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      const matchesRole = selectedRole === 'all' || user.role === selectedRole
      return matchesSearch && matchesRole
    })
    .sort((a, b) => {
      const aValue = sortBy === 'createdAt' ? new Date(a.createdAt).getTime() : 
                    sortBy === 'credits' ? a.credits :
                    sortBy === 'photos' ? a._count.photos : 0
      const bValue = sortBy === 'createdAt' ? new Date(b.createdAt).getTime() : 
                    sortBy === 'credits' ? b.credits :
                    sortBy === 'photos' ? b._count.photos : 0
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    })

  const filteredPhotos = photos.filter(photo => 
    photo.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (photo.title?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  )

  const filteredTransactions = transactions.filter(transaction =>
    transaction.user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Analytics calculations
  const totalCreditsPurchased = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.creditsPurchased, 0)
  const averageCreditsPurchasedPerUser = users.length > 0 ? (totalCreditsPurchased / users.length).toFixed(1) : '0.0'
  const monthlyRevenue = transactions
    .filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amountPaid, 0)

  const handleUserAction = async (action: string, userId: string) => {
    // This would typically make API calls to perform user actions
    console.log(`${action} user:`, userId)
    // TODO: Implement actual API calls for user management
  }

  const StatCard = ({ title, value, subtitle }: { title: string; value: string | number; subtitle?: string }) => (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="text-lg font-medium text-gray-900">{title}</div>
          </div>
        </div>
        <div className="mt-1">
          <div className="text-3xl font-semibold text-gray-900">{value}</div>
          {subtitle && <div className="text-sm text-gray-500">{subtitle}</div>}
        </div>
      </div>
    </div>
  )

  const TabButton = ({ id, label, active }: { id: string; label: string; active: boolean }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`px-4 py-2 text-sm font-medium rounded-md ${
        active
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div className="space-y-6">
      {/* Enhanced Stats Overview */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-6">
        <StatCard title="Total Users" value={stats.totalUsers} subtitle="Registered accounts" />
        <StatCard title="Total Photos" value={stats.totalPhotos} subtitle="All uploads" />
        <StatCard 
          title="Success Rate" 
          value={`${stats.totalPhotos > 0 ? Math.round((stats.completedPhotos / stats.totalPhotos) * 100) : 0}%`}
          subtitle={`${stats.completedPhotos}/${stats.totalPhotos} completed`}
        />
        <StatCard 
          title="Monthly Revenue" 
          value={`$${monthlyRevenue.toFixed(2)}`}
          subtitle="This month"
        />
        <StatCard 
          title="Total Revenue" 
          value={`$${Number(stats.totalRevenue).toFixed(2)}`}
          subtitle={`${stats.totalTransactions} transactions`}
        />
        <StatCard 
          title="Avg Purchased/User" 
          value={averageCreditsPurchasedPerUser}
          subtitle="Credits purchased per user"
        />
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search users, photos, transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="USER">Users</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="createdAt">Sort by Date</option>
              <option value="credits">Sort by Credits</option>
              <option value="photos">Sort by Photos</option>
            </select>
          </div>
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            <TabButton id="overview" label="Overview" active={activeTab === 'overview'} />
            <TabButton id="users" label={`Users (${filteredUsers.length})`} active={activeTab === 'users'} />
            <TabButton id="photos" label={`Photos (${filteredPhotos.length})`} active={activeTab === 'photos'} />
            <TabButton id="transactions" label={`Transactions (${filteredTransactions.length})`} active={activeTab === 'transactions'} />
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900">System Overview</h3>
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h4>
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">• {stats.totalUsers} total users registered</div>
                    <div className="text-sm text-gray-600">• {stats.totalPhotos} photos uploaded</div>
                    <div className="text-sm text-gray-600">• {stats.completedPhotos} photos successfully enhanced</div>
                    <div className="text-sm text-gray-600">• ${Number(stats.totalRevenue).toFixed(2)} in total revenue</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">System Health</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Enhancement Success Rate</span>
                      <span className="text-sm font-medium">
                        {stats.totalPhotos > 0 ? Math.round((stats.completedPhotos / stats.totalPhotos) * 100) : 0}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Failed Enhancements</span>
                      <span className="text-sm font-medium">{stats.failedPhotos}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">User Management</h3>
                <div className="text-sm text-gray-500">
                  {filteredUsers.length} of {users.length} users
                </div>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUsers.map((user) => (
                      <>
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                                  <span className="text-sm font-medium text-gray-700">
                                    {(user.name || user.email).charAt(0).toUpperCase()}
                                  </span>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{user.name || 'No name'}</div>
                                <div className="text-sm text-gray-500">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                            }`}>
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {user.credits >= 999999 ? (
                                <span className="text-purple-600 font-semibold">Unlimited</span>
                              ) : (
                                <span className={user.credits <= 0 ? 'text-red-600' : 'text-gray-900'}>
                                  {user.credits}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <div className="text-gray-900">{user._count.photos} photos</div>
                            <div className="text-gray-500">{user._count.transactions} purchases</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => setShowUserDetails(showUserDetails === user.id ? null : user.id)}
                                className="text-indigo-600 hover:text-indigo-900"
                                title="View Details"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleUserAction('edit', user.id)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit User"
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {user.role !== 'ADMIN' && (
                                <button
                                  onClick={() => handleUserAction('delete', user.id)}
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete User"
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        {showUserDetails === user.id && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Account Details</h4>
                                  <p><span className="font-medium">ID:</span> {user.id}</p>
                                  <p><span className="font-medium">Email:</span> {user.email}</p>
                                  <p><span className="font-medium">Name:</span> {user.name || 'Not set'}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Statistics</h4>
                                  <p><span className="font-medium">Photos Uploaded:</span> {user._count.photos}</p>
                                  <p><span className="font-medium">Purchases Made:</span> {user._count.transactions}</p>
                                  <p><span className="font-medium">Credits Remaining:</span> {user.credits >= 999999 ? 'Unlimited' : user.credits}</p>
                                </div>
                                <div>
                                  <h4 className="font-medium text-gray-900 mb-2">Timeline</h4>
                                  <p><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleString()}</p>
                                  <p><span className="font-medium">Role:</span> {user.role}</p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'photos' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Photo Management</h3>
                <div className="text-sm text-gray-500">
                  {filteredPhotos.length} of {photos.length} photos
                </div>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Photo</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URLs</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredPhotos.map((photo) => (
                      <tr key={photo.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <img
                                className="h-10 w-10 rounded-md object-cover"
                                src={photo.originalUrl}
                                alt={photo.title || 'Photo'}
                                onError={(e) => {
                                  e.currentTarget.src = '/placeholder-image.png'
                                }}
                              />
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{photo.title || 'Untitled'}</div>
                              <div className="text-sm text-gray-500 truncate max-w-32" title={photo.id}>
                                ID: {photo.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{photo.user.name || photo.user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            photo.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            photo.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            photo.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {photo.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className="space-y-1">
                            <div>
                              <a href={photo.originalUrl} target="_blank" rel="noopener noreferrer" 
                                 className="text-blue-600 hover:text-blue-800 text-xs">
                                Original ↗
                              </a>
                            </div>
                            {photo.enhancedUrl && (
                              <div>
                                <a href={photo.enhancedUrl} target="_blank" rel="noopener noreferrer" 
                                   className="text-green-600 hover:text-green-800 text-xs">
                                  Enhanced ↗
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(photo.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
                <div className="flex items-center space-x-4">
                  <div className="text-sm text-gray-500">
                    {filteredTransactions.length} of {transactions.length} transactions
                  </div>
                  <div className="text-sm font-medium text-gray-900">
                    Total: ${filteredTransactions.reduce((sum, t) => sum + t.amountPaid, 0).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Credits</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredTransactions.map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-32" title={transaction.id}>
                            {transaction.id.substring(0, 8)}...
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6">
                              <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-700">
                                  {(transaction.user.name || transaction.user.email).charAt(0).toUpperCase()}
                                </span>
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm text-gray-900">{transaction.user.name || transaction.user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            +{transaction.creditsPurchased}
                          </div>
                          <div className="text-xs text-gray-500">
                            ${(transaction.amountPaid / transaction.creditsPurchased).toFixed(2)} per credit
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-bold text-green-600">
                            ${Number(transaction.amountPaid).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                            transaction.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(transaction.createdAt).toLocaleTimeString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}