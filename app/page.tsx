import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Shield, BarChart3, Clock, Zap, CheckCircle2, ArrowRight, Globe, Lock, TrendingUp } from 'lucide-react'
import { auth } from '@clerk/nextjs/server'
import { UserButton } from '@clerk/nextjs'

export default async function HomePage() {
  const { userId } = await auth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Navigation */}
      <nav className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <span className="text-2xl font-bold text-gray-900">Protekt</span>
          </div>
          <div className="flex items-center gap-4">
            {userId ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button variant="outline">Dashboard</Button>
                </Link>
                <UserButton afterSignOutUrl="/" />
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/sign-in">
                  <Button variant="outline">Sign In</Button>
                </Link>
                <Link href="/sign-up">
                  <Button>Get Started</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-4xl mx-auto">
          <Badge variant="secondary" className="mb-4">
            <Zap className="h-3 w-3 mr-1" />
            Browser Extension + Analytics Dashboard
          </Badge>
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Take Control of Your
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"> Digital Life</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Protekt helps you build healthy browsing habits with site blocking, time tracking, and insightful analytics. 
            Your productivity starts here.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {userId ? (
              <Link href="/dashboard">
                <Button size="lg" className="gap-2">
                  <BarChart3 className="h-5 w-5" />
                  View Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/sign-up">
                <Button size="lg" className="gap-2">
                  Get Started Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            )}
            <Link href="/extension-popup">
              <Button variant="outline" size="lg" className="gap-2">
                <Globe className="h-5 w-5" />
                Try Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Everything you need to stay focused
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Powerful features designed to help you build better digital habits and boost productivity.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-blue-600" />
              </div>
              <CardTitle>Site Protection</CardTitle>
              <CardDescription>
                Block distracting websites with password protection and time limits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Password-protected blocking
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Daily time limits
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Custom block lists
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader>
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>Time Tracking</CardTitle>
              <CardDescription>
                Automatic time tracking across all your browsing activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Real-time monitoring
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Daily & weekly reports
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Site categorization
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
            <CardHeader>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Beautiful insights and trends to understand your digital habits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Interactive charts
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Productivity scores
                </li>
                <li className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Goal tracking
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How it Works */}
      <section className="container mx-auto px-4 py-20 bg-white/50 rounded-3xl my-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            How it works
          </h2>
          <p className="text-xl text-gray-600">
            Get started in just 3 simple steps
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="h-16 w-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Sign Up & Install</h3>
            <p className="text-gray-600">
              Create your account and install the browser extension
            </p>
          </div>
          <div className="text-center">
            <div className="h-16 w-16 bg-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Configure Protection</h3>
            <p className="text-gray-600">
              Set up site blocking and time limits for distracting websites
            </p>
          </div>
          <div className="text-center">
            <div className="h-16 w-16 bg-green-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Track & Improve</h3>
            <p className="text-gray-600">
              Monitor your progress and build better digital habits
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Ready to take control?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who have improved their digital well-being with Protekt.
          </p>
          {!userId && (
            <Link href="/sign-up">
              <Button size="lg" className="gap-2">
                Start Your Journey
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-200 mt-20">
        <div className="text-center text-gray-600">
          <p>&copy; 2024 Protekt. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
} 