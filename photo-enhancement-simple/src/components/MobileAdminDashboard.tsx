'use client'

import { useState } from 'react';
import { ChevronDown, ChevronRight, Users, Camera, DollarSign, TrendingUp, Search, Filter, Eye, Edit, Trash2 } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  credits: number;
  createdAt: Date;
  _count: {
    photos: number;
    transactions: number;
  }
}

interface Photo {
  id: string;
  originalUrl: string;
  enhancedUrl: string | null;
  status: string;
  title: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  }
}

interface Transaction {
  id: string;
  creditsPurchased: number;
  amountPaid: number;
  status: string;
  createdAt: Date;
  user: {
    name: string | null;
    email: string;
  }
}

interface Stats {
  totalUsers: number;
  totalPhotos: number;
  totalTransactions: number;
  completedPhotos: number;
  failedPhotos: number;
  totalRevenue: number;
}

interface MobileAdminDashboardProps {
  users: User[];
  photos: Photo[];
  transactions: Transaction[];
  stats: Stats;
}

export default function MobileAdminDashboard({ users, photos, transactions, stats }: MobileAdminDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Calculate mobile-specific metrics
  const totalCreditsPurchased = transactions
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.creditsPurchased, 0);
  const averageCreditsPurchasedPerUser = users.length > 0 ? (totalCreditsPurchased / users.length).toFixed(1) : '0.0';
  const monthlyRevenue = transactions
    .filter(t => new Date(t.createdAt).getMonth() === new Date().getMonth())
    .reduce((sum, t) => sum + t.amountPaid, 0);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  const StatCard = ({ title, value, subtitle, icon: Icon, color }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color: string;
  }) => (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Admin Dashboard</h1>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            {[
              { id: 'overview', label: 'Overview', icon: TrendingUp },
              { id: 'users', label: 'Users', icon: Users },
              { id: 'photos', label: 'Photos', icon: Camera },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                title="Total Users"
                value={stats.totalUsers}
                subtitle="Registered accounts"
                icon={Users}
                color="bg-blue-500"
              />
              <StatCard
                title="Total Photos"
                value={stats.totalPhotos}
                subtitle="All uploads"
                icon={Camera}
                color="bg-green-500"
              />
              <StatCard
                title="Success Rate"
                value={`${stats.totalPhotos > 0 ? Math.round((stats.completedPhotos / stats.totalPhotos) * 100) : 0}%`}
                subtitle={`${stats.completedPhotos}/${stats.totalPhotos}`}
                icon={TrendingUp}
                color="bg-emerald-500"
              />
              <StatCard
                title="Total Revenue"
                value={`$${Number(stats.totalRevenue).toFixed(0)}`}
                subtitle={`${stats.totalTransactions} transactions`}
                icon={DollarSign}
                color="bg-purple-500"
              />
            </div>

            {/* System Health */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Enhancement Success Rate</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${stats.totalPhotos > 0 ? (stats.completedPhotos / stats.totalPhotos) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">
                      {stats.totalPhotos > 0 ? Math.round((stats.completedPhotos / stats.totalPhotos) * 100) : 0}%
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Failed Enhancements</span>
                  <span className="text-sm font-medium text-red-600">{stats.failedPhotos}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Avg Credits/User</span>
                  <span className="text-sm font-medium text-blue-600">{averageCreditsPurchasedPerUser}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Monthly Revenue</span>
                  <span className="text-sm font-medium text-green-600">${monthlyRevenue.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {photos.slice(0, 5).map((photo) => (
                  <div key={photo.id} className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={photo.originalUrl} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {photo.user.name || photo.user.email}
                      </p>
                      <p className="text-xs text-gray-500">
                        {photo.status.toLowerCase()} • {new Date(photo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${
                      photo.status === 'COMPLETED' ? 'bg-green-500' :
                      photo.status === 'FAILED' ? 'bg-red-500' :
                      photo.status === 'PROCESSING' ? 'bg-blue-500' : 'bg-yellow-500'
                    }`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-4">
            {/* Search and Filter */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center space-x-3 mb-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Filter className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex justify-between text-sm text-gray-600">
                <span>{filteredUsers.length} users found</span>
                <span>{users.filter(u => u.role === 'ADMIN').length} admins</span>
              </div>
            </div>

            {/* User Cards */}
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div key={user.id} className="bg-white rounded-xl shadow-sm border border-gray-100">
                  <div 
                    className="p-4 cursor-pointer"
                    onClick={() => setExpandedUser(expandedUser === user.id ? null : user.id)}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-700">
                          {(user.name || user.email).charAt(0).toUpperCase()}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.name || 'No name'}
                          </p>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                            user.role === 'ADMIN' 
                              ? 'bg-purple-100 text-purple-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{user.email}</p>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-gray-500">
                            Credits: {user.credits >= 999999 ? 'Unlimited' : user.credits}
                          </span>
                          <span className="text-xs text-gray-500">
                            Photos: {user._count.photos}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <button className="p-1 text-gray-400 hover:text-blue-600">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-blue-600">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.role !== 'ADMIN' && (
                          <button className="p-1 text-gray-400 hover:text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {expandedUser === user.id ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {expandedUser === user.id && (
                    <div className="border-t border-gray-100 p-4 bg-gray-50">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600 mb-1">Account Details</p>
                          <p><span className="font-medium">ID:</span> {user.id.substring(0, 8)}...</p>
                          <p><span className="font-medium">Joined:</span> {new Date(user.createdAt).toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-gray-600 mb-1">Activity</p>
                          <p><span className="font-medium">Photos:</span> {user._count.photos}</p>
                          <p><span className="font-medium">Purchases:</span> {user._count.transactions}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Recent Photos</h3>
                <span className="text-sm text-gray-500">{photos.length} total</span>
              </div>
              
              <div className="space-y-3">
                {photos.slice(0, 10).map((photo) => (
                  <div key={photo.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                      <img 
                        src={photo.originalUrl} 
                        alt={photo.title || 'Photo'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          photo.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          photo.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                          photo.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {photo.status}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {photo.title || 'Untitled'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {photo.user.name || photo.user.email} • {new Date(photo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    
                    <div className="flex space-x-1">
                      <button className="p-1 text-gray-400 hover:text-blue-600">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}