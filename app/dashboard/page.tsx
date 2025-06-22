import { Suspense } from 'react'
import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import AnalyticsDashboard from "@/dashboard"
import ExtensionAuth from '@/components/ExtensionAuth'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; extension?: string }>
}) {
  const { userId } = await auth()
  const params = await searchParams
  
  // If accessing from extension and user is authenticated, generate token
  if (params.extension === 'true' && userId) {
    return <ExtensionAuth />
  }
  
  // If accessing with a token (from extension), validate it
  if (params.token) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch(`${baseUrl}/api/extension/session?token=${params.token}`)
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
            <AnalyticsDashboard sessionToken={params.token} />
          </Suspense>
        </div>
      </div>
    )
  }
  
  // If accessing from extension but not authenticated, show sign-in page
  if (params.extension === 'true' && !userId) {
    redirect('/sign-in?redirect_url=/dashboard?extension=true')
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
