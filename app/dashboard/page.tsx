import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import AnalyticsDashboard from "@/dashboard"

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { token?: string }
}) {
  const { userId } = await auth()
  
  // If accessing with a token (from extension), validate it
  if (searchParams.token && !userId) {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extension/session?token=${searchParams.token}`)
    const data = await response.json()
    
    if (!data.valid) {
      redirect('/sign-in?redirect_url=/dashboard')
    }
    
    // For token-based access, show a special view
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {data.user.firstName || 'User'}!
              </h1>
              <p className="text-gray-600 mt-2">
                Accessing dashboard via extension session
              </p>
            </div>
            <div className="text-sm text-gray-500">
              Session expires in 24 hours
            </div>
          </div>
          <Suspense fallback={<div>Loading analytics...</div>}>
            <AnalyticsDashboard sessionToken={searchParams.token} />
          </Suspense>
        </div>
      </div>
    )
  }
  
  // Regular authenticated access
  if (!userId) {
    redirect('/sign-in?redirect_url=/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">Track your productivity and web usage</p>
          </div>
          <UserButton 
            afterSignOutUrl="/"
            appearance={{
              elements: {
                avatarBox: "h-10 w-10"
              }
            }}
          />
        </div>
        <Suspense fallback={<div>Loading analytics...</div>}>
          <AnalyticsDashboard />
        </Suspense>
      </div>
    </div>
  )
}
