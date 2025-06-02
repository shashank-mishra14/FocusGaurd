"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Shield, Clock, BarChart3, CheckCircle, Star, Users, Download, Zap, Target, TrendingUp } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

// Animated Counter Component
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      setCount(Math.floor(progress * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [end, duration])

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

// Floating Animation Component
function FloatingElement({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <div
      className="animate-float"
      style={{
        animationDelay: `${delay}s`,
        animationDuration: "6s",
        animationIterationCount: "infinite",
      }}
    >
      {children}
    </div>
  )
}

export default function LandingPage() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(true)
  }, [])

  return (
    <div className="flex flex-col min-h-screen bg-white overflow-hidden">
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(50px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.8s ease-out forwards;
        }
        .animate-slideInLeft {
          animation: slideInLeft 0.8s ease-out forwards;
        }
        .animate-slideInRight {
          animation: slideInRight 0.8s ease-out forwards;
        }
        .animate-pulse-slow {
          animation: pulse 3s ease-in-out infinite;
        }
        .shimmer {
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
          background-size: 200% 100%;
          animation: shimmer 2s infinite;
        }
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
        }
        .gradient-text {
          background: linear-gradient(135deg, #3B82F6, #8B5CF6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
      `}</style>

      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-white/80 backdrop-blur-md sticky top-0 z-50 transition-all duration-300">
        <Link href="/" className="flex items-center justify-center group">
          <div className="relative">
            <Shield className="h-8 w-8 text-blue-600 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" />
            <div className="absolute inset-0 bg-blue-600 rounded-full opacity-20 scale-0 group-hover:scale-150 transition-transform duration-300"></div>
          </div>
          <span className="ml-2 text-xl font-bold text-gray-900 transition-colors duration-300 group-hover:text-blue-600">
            FocusGuard
          </span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          {["Features", "Benefits", "Dashboard Demo", "Extension Demo"].map((item, index) => (
            <Link
              key={item}
              href={
                item === "Features"
                  ? "#features"
                  : item === "Benefits"
                    ? "#benefits"
                    : item === "Dashboard Demo"
                      ? "/dashboard"
                      : "/extension-popup"
              }
              className="text-sm font-medium hover:text-blue-600 transition-all duration-300 relative group"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {item}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-blue-600 transition-all duration-300 group-hover:w-full"></span>
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
          {/* Animated Background Elements */}
          <div className="absolute inset-0 overflow-hidden">
            <FloatingElement delay={0}>
              <div className="absolute top-20 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20"></div>
            </FloatingElement>
            <FloatingElement delay={2}>
              <div className="absolute top-40 right-20 w-16 h-16 bg-purple-200 rounded-full opacity-20"></div>
            </FloatingElement>
            <FloatingElement delay={4}>
              <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-green-200 rounded-full opacity-20"></div>
            </FloatingElement>
          </div>

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div
                className={`flex flex-col justify-center space-y-4 ${isVisible ? "animate-slideInLeft" : "opacity-0"}`}
              >
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800 animate-pulse-slow w-fit">
                    ✨ New: Advanced Analytics
                  </Badge>
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-gray-900">
                    Take Control of Your <span className="gradient-text">Time Online</span>
                  </h1>
                  <p className="max-w-[600px] text-gray-600 md:text-xl leading-relaxed">
                    Password-protect distracting websites, set time limits, and track your browsing habits with our
                    powerful browser extension.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transform transition-all duration-300 hover:scale-105 hover:shadow-lg group"
                  >
                    <Download className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                    Get the Extension
                    <div className="absolute inset-0 shimmer rounded-md"></div>
                  </Button>
                  <Button variant="outline" size="lg" asChild className="hover-lift border-2 hover:border-blue-300">
                    <Link href="/dashboard">View Dashboard Demo</Link>
                  </Button>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-6 pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      <AnimatedCounter end={10000} suffix="+" />
                    </div>
                    <div className="text-sm text-gray-500">Active Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">
                      <AnimatedCounter end={98} suffix="%" />
                    </div>
                    <div className="text-sm text-gray-500">Satisfaction</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">
                      <AnimatedCounter end={40} suffix="%" />
                    </div>
                    <div className="text-sm text-gray-500">Productivity Boost</div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center justify-center ${isVisible ? "animate-slideInRight" : "opacity-0"}`}>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <Image
                    src="/placeholder.svg?height=400&width=600"
                    width={600}
                    height={400}
                    alt="FocusGuard Extension Interface"
                    className="relative mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-2xl transition-transform duration-500 group-hover:scale-105"
                  />

                  {/* Floating UI Elements */}
                  <FloatingElement delay={1}>
                    <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium">Protected</span>
                      </div>
                    </div>
                  </FloatingElement>

                  <FloatingElement delay={3}>
                    <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-3 border">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">+40% Focus</span>
                      </div>
                    </div>
                  </FloatingElement>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center animate-fadeInUp">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Core Features
                </Badge>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
                  Everything You Need to Stay <span className="gradient-text">Focused</span>
                </h2>
                <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our extension provides three powerful tools to help you regain control over your digital habits.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              {[
                {
                  icon: Shield,
                  title: "Password Protection",
                  description:
                    "Lock distracting websites behind a password. Perfect for blocking social media during work hours.",
                  color: "text-blue-600",
                  delay: "0s",
                },
                {
                  icon: Clock,
                  title: "Time Limits",
                  description:
                    "Set daily time limits for specific websites. Get notified when you're approaching your limit.",
                  color: "text-green-600",
                  delay: "0.2s",
                },
                {
                  icon: BarChart3,
                  title: "Usage Analytics",
                  description:
                    "Track your browsing time with detailed analytics. See where your time goes and identify patterns.",
                  color: "text-purple-600",
                  delay: "0.4s",
                },
              ].map((feature, index) => (
                <Card
                  key={index}
                  className="border-2 hover-lift group cursor-pointer animate-fadeInUp"
                  style={{ animationDelay: feature.delay }}
                >
                  <CardHeader className="text-center">
                    <div className="relative mx-auto mb-4">
                      <feature.icon
                        className={`h-12 w-12 ${feature.color} mx-auto transition-all duration-300 group-hover:scale-110`}
                      />
                      <div
                        className={`absolute inset-0 ${feature.color.replace("text-", "bg-")} rounded-full opacity-0 scale-0 group-hover:opacity-20 group-hover:scale-150 transition-all duration-300`}
                      ></div>
                    </div>
                    <CardTitle className="text-xl group-hover:text-blue-600 transition-colors duration-300">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-center group-hover:text-gray-700 transition-colors duration-300">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section
          id="benefits"
          className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden"
        >
          <div className="absolute inset-0 overflow-hidden">
            <FloatingElement delay={1}>
              <Zap className="absolute top-20 right-20 h-8 w-8 text-yellow-400 opacity-30" />
            </FloatingElement>
            <FloatingElement delay={3}>
              <Target className="absolute bottom-20 left-20 h-6 w-6 text-green-400 opacity-30" />
            </FloatingElement>
          </div>

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_550px]">
              <div className="flex flex-col justify-center space-y-4 animate-slideInLeft">
                <div className="space-y-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    Benefits
                  </Badge>
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">
                    Why Choose <span className="gradient-text">FocusGuard</span>?
                  </h2>
                  <p className="max-w-[600px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Join thousands of users who have transformed their digital habits and boosted their productivity.
                  </p>
                </div>
                <ul className="grid gap-4">
                  {[
                    "Increase productivity by up to 40%",
                    "Reduce time spent on distracting websites",
                    "Build healthier digital habits",
                    "Gain insights into your browsing patterns",
                  ].map((benefit, index) => (
                    <li
                      key={index}
                      className="flex items-center gap-3 animate-fadeInUp group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <CheckCircle className="h-5 w-5 text-green-600 transition-transform duration-300 group-hover:scale-110" />
                      <span className="text-gray-700 group-hover:text-gray-900 transition-colors duration-300">
                        {benefit}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover-lift"
                    asChild
                  >
                    <Link href="/extension-popup">Try Extension Demo</Link>
                  </Button>
                  <Button variant="outline" asChild className="hover-lift">
                    <Link href="/dashboard">View Analytics Demo</Link>
                  </Button>
                </div>
              </div>
              <div className="animate-slideInRight">
                <div className="relative group">
                  <Image
                    src="/placeholder.svg?height=400&width=550"
                    width={550}
                    height={400}
                    alt="Productivity Benefits"
                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover shadow-2xl lg:order-last transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-600/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center animate-fadeInUp">
              <div className="space-y-2">
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Testimonials
                </Badge>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-gray-900">What Our Users Say</h2>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              {[
                {
                  text: "FocusGuard has completely transformed my work-from-home productivity. I no longer get distracted by social media during important tasks.",
                  author: "Sarah Chen",
                  role: "Software Developer",
                  delay: "0s",
                },
                {
                  text: "The analytics feature opened my eyes to how much time I was wasting online. Now I'm much more mindful of my browsing habits.",
                  author: "Marcus Johnson",
                  role: "Marketing Manager",
                  delay: "0.2s",
                },
                {
                  text: "Simple, effective, and exactly what I needed. The password protection feature is a game-changer for staying focused.",
                  author: "Emily Rodriguez",
                  role: "Student",
                  delay: "0.4s",
                },
              ].map((testimonial, index) => (
                <Card
                  key={index}
                  className="hover-lift animate-fadeInUp group"
                  style={{ animationDelay: testimonial.delay }}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className="h-4 w-4 fill-yellow-400 text-yellow-400 transition-transform duration-300 group-hover:scale-110"
                            style={{ transitionDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="group-hover:text-gray-700 transition-colors duration-300">
                      &quot;{testimonial.text}&quot;
                    </CardDescription>
                    <div className="mt-4">
                      <p className="font-semibold text-gray-900">{testimonial.author}</p>
                      <p className="text-sm text-gray-600">{testimonial.role}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIyIi8+PC9nPjwvZz48L3N2Zz4=')] animate-pulse"></div>

          <div className="container px-4 md:px-6 mx-auto relative z-10">
            <div className="flex flex-col items-center justify-center space-y-4 text-center animate-fadeInUp">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl text-white">Ready to Take Control?</h2>
                <p className="max-w-[600px] text-blue-100 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Join thousands of users who have already improved their productivity with FocusGuard.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  className="bg-white text-blue-600 hover:bg-gray-100 hover-lift group"
                >
                  <Download className="mr-2 h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  Install Extension
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-blue-600 hover-lift"
                  asChild
                >
                  <Link href="/dashboard">Try Dashboard Demo</Link>
                </Button>
              </div>
              <div
                className="flex items-center gap-4 text-blue-100 text-sm animate-fadeInUp"
                style={{ animationDelay: "0.5s" }}
              >
                <div className="flex items-center gap-1 group">
                  <Users className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>
                    <AnimatedCounter end={10000} />+ active users
                  </span>
                </div>
                <div className="flex items-center gap-1 group">
                  <Star className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
                  <span>4.8/5 rating</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-gray-50">
        <p className="text-xs text-gray-500">© 2024 FocusGuard. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          {["Privacy Policy", "Terms of Service", "Contact"].map((item) => (
            <Link
              key={item}
              href="#"
              className="text-xs hover:underline underline-offset-4 text-gray-500 hover:text-gray-700 transition-colors duration-300"
            >
              {item}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  )
}
