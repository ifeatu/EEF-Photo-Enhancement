import { getCurrentUser } from '@/lib/auth-utils'
import { redirect } from 'next/navigation'
import PricingPlans from '@/components/PricingPlans'

export default async function PricingPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/auth/signin')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Enhance your photos with our AI-powered tools. Pick the plan that works best for you.
          </p>
        </div>
        
        <div className="mt-12">
          <PricingPlans currentUser={user} />
        </div>
      </div>
    </div>
  )
}