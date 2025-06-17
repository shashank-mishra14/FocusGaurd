"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Switch } from "@/components/ui/switch"
import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,  
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Legend,
} from "recharts"
import {
  Shield,
  Clock,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Zap,
  Target,
  Eye,
  Brain,
  Moon,
  Sun,
  Download,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Activity,
  Award,
  Flame,
} from "lucide-react"
import Link from "next/link"

// Animated Counter Component
function AnimatedCounter({
  end,
  duration = 2000,
  suffix = "",
  prefix = "",
}: {
  end: number
  duration?: number
  suffix?: string
  prefix?: string
}) {
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
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  )
}

// Floating Element Component
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

interface AnalyticsDashboardProps {
  sessionToken?: string
}

export default function AnalyticsDashboard({ sessionToken }: AnalyticsDashboardProps) {
  const [timePeriod, setTimePeriod] = useState("7days")
  const [isVisible, setIsVisible] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setIsVisible(true)
    loadAnalyticsData()
  }, [sessionToken])

  const loadAnalyticsData = async () => {
    try {
      setLoading(true)
      const url = sessionToken 
        ? `/api/analytics?token=${sessionToken}&days=${timePeriod === '7days' ? 7 : timePeriod === '30days' ? 30 : 7}`
        : `/api/analytics?days=${timePeriod === '7days' ? 7 : timePeriod === '30days' ? 30 : 7}`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }
      
      const data = await response.json()
      setAnalyticsData(data)
    } catch (error) {
      console.error('Error loading analytics:', error)
      setError('Failed to load analytics data')
    } finally {
      setLoading(false)
    }
  }

  // Enhanced Data Sets
  const dailyUsageData = [
    { day: "Mon", minutes: 180, productive: 120, distracted: 60, focus: 67 },
    { day: "Tue", minutes: 220, productive: 140, distracted: 80, focus: 64 },
    { day: "Wed", minutes: 150, productive: 110, distracted: 40, focus: 73 },
    { day: "Thu", minutes: 280, productive: 160, distracted: 120, focus: 57 },
    { day: "Fri", minutes: 190, productive: 130, distracted: 60, focus: 68 },
    { day: "Sat", minutes: 320, productive: 180, distracted: 140, focus: 56 },
    { day: "Sun", minutes: 240, productive: 160, distracted: 80, focus: 67 },
  ]

  const hourlyData = [
    { hour: "6AM", usage: 5, focus: 90 },
    { hour: "7AM", usage: 15, focus: 85 },
    { hour: "8AM", usage: 45, focus: 75 },
    { hour: "9AM", usage: 80, focus: 70 },
    { hour: "10AM", usage: 95, focus: 65 },
    { hour: "11AM", usage: 110, focus: 60 },
    { hour: "12PM", usage: 85, focus: 55 },
    { hour: "1PM", usage: 70, focus: 60 },
    { hour: "2PM", usage: 90, focus: 65 },
    { hour: "3PM", usage: 120, focus: 50 },
    { hour: "4PM", usage: 100, focus: 55 },
    { hour: "5PM", usage: 80, focus: 60 },
    { hour: "6PM", usage: 60, focus: 70 },
    { hour: "7PM", usage: 40, focus: 80 },
    { hour: "8PM", usage: 30, focus: 85 },
    { hour: "9PM", usage: 25, focus: 90 },
  ]

  // const siteDistributionData = [
  //   { name: "YouTube", minutes: 480, color: "#FF6B6B", category: "Entertainment" },
  //   { name: "Facebook", minutes: 320, color: "#4ECDC4", category: "Social" },
  //   { name: "Twitter", minutes: 180, color: "#45B7D1", category: "Social" },
  //   { name: "Reddit", minutes: 150, color: "#96CEB4", category: "News" },
  //   { name: "Instagram", minutes: 120, color: "#FFEAA7", category: "Social" },
  //   { name: "LinkedIn", minutes: 90, color: "#DDA0DD", category: "Professional" },
  //   { name: "GitHub", minutes: 200, color: "#74B9FF", category: "Work" },
  //   { name: "Others", minutes: 160, color: "#A29BFE", category: "Various" },
  // ]

  const weeklyTrendData = [
    { week: "Week 1", totalTime: 1680, focusScore: 65, productivity: 72 },
    { week: "Week 2", totalTime: 1520, focusScore: 68, productivity: 75 },
    { week: "Week 3", totalTime: 1380, focusScore: 72, productivity: 78 },
    { week: "Week 4", totalTime: 1200, focusScore: 76, productivity: 82 },
  ]

  const categoryData = [
    { category: "Work", time: 420, percentage: 35, color: "#10B981" },
    { category: "Social Media", time: 360, percentage: 30, color: "#F59E0B" },
    { category: "Entertainment", time: 240, percentage: 20, color: "#EF4444" },
    { category: "News", time: 120, percentage: 10, color: "#8B5CF6" },
    { category: "Other", time: 60, percentage: 5, color: "#6B7280" },
  ]

  const detailedSiteData = [
    {
      site: "youtube.com",
      timeSpent: "8h 12m",
      visits: 45,
      avgSession: "11m",
      status: "Over Limit",
      trend: "up",
      category: "Entertainment",
      productivity: 25,
      blocked: 12,
    },
    {
      site: "github.com",
      timeSpent: "6h 20m",
      visits: 28,
      avgSession: "14m",
      status: "Productive",
      trend: "up",
      category: "Work",
      productivity: 95,
      blocked: 0,
    },
    {
      site: "facebook.com",
      timeSpent: "5h 20m",
      visits: 32,
      avgSession: "10m",
      status: "Within Limit",
      trend: "down",
      category: "Social",
      productivity: 30,
      blocked: 8,
    },
    {
      site: "twitter.com",
      timeSpent: "3h 8m",
      visits: 28,
      avgSession: "7m",
      status: "Within Limit",
      trend: "up",
      category: "Social",
      productivity: 35,
      blocked: 5,
    },
    {
      site: "linkedin.com",
      timeSpent: "2h 45m",
      visits: 15,
      avgSession: "11m",
      status: "Productive",
      trend: "up",
      category: "Professional",
      productivity: 85,
      blocked: 0,
    },
    {
      site: "reddit.com",
      timeSpent: "2h 30m",
      visits: 15,
      avgSession: "10m",
      status: "Within Limit",
      trend: "down",
      category: "News",
      productivity: 40,
      blocked: 3,
    },
  ]

  const overviewStats = [
    {
      title: "Total Screen Time",
      value: "22h 55m",
      change: "-12%",
      changeType: "positive",
      icon: Clock,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      description: "This week",
    },
    {
      title: "Focus Score",
      value: "78%",
      change: "+5%",
      changeType: "positive",
      icon: Brain,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      description: "Productivity index",
    },
    {
      title: "Sites Blocked",
      value: "28",
      change: "+12",
      changeType: "positive",
      icon: Shield,
      color: "text-green-600",
      bgColor: "bg-green-50",
      description: "This week",
    },
    {
      title: "Streak Days",
      value: "12",
      change: "+3",
      changeType: "positive",
      icon: Flame,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      description: "Current streak",
    },
  ]

  const achievements = [
    { title: "Focus Master", description: "Maintained 80%+ focus for 7 days", icon: Award, unlocked: true },
    { title: "Digital Minimalist", description: "Reduced screen time by 30%", icon: Target, unlocked: true },
    { title: "Productivity Guru", description: "Blocked 100+ distracting visits", icon: Shield, unlocked: false },
    { title: "Consistency King", description: "30-day focus streak", icon: Flame, unlocked: false },
  ]

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-gray-900" : "bg-gradient-to-br from-gray-50 to-blue-50"}`}
    >
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-slideInDown { animation: slideInDown 0.6s ease-out forwards; }
        .animate-fadeInUp { animation: fadeInUp 0.8s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.5s ease-out forwards; }
        .animate-pulse-gentle { animation: pulse 3s ease-in-out infinite; }
        .hover-lift {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .hover-lift:hover {
          transform: translateY(-4px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        }
        .glass-effect {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* Floating Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <FloatingElement delay={0}>
          <div className="absolute top-20 left-10 w-32 h-32 bg-blue-200 rounded-full opacity-10"></div>
        </FloatingElement>
        <FloatingElement delay={2}>
          <div className="absolute top-1/3 right-20 w-24 h-24 bg-purple-200 rounded-full opacity-10"></div>
        </FloatingElement>
        <FloatingElement delay={4}>
          <div className="absolute bottom-1/4 left-1/4 w-20 h-20 bg-green-200 rounded-full opacity-10"></div>
        </FloatingElement>
      </div>

      {/* Header */}
      <header
        className={`${isDarkMode ? "bg-gray-800/80" : "bg-white/80"} backdrop-blur-md border-b sticky top-0 z-50 transition-all duration-300 ${isVisible ? "animate-slideInDown" : "opacity-0"}`}
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild className="hover:bg-blue-100 transition-colors duration-300">
                <Link href="/">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Link>
              </Button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Shield className="h-7 w-7 text-blue-600 animate-pulse-gentle" />
                  <Zap className="h-3 w-3 text-yellow-500 absolute -top-1 -right-1 animate-bounce" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    FocusGuard Analytics
                  </h1>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                    Your productivity dashboard
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                <Switch checked={isDarkMode} onCheckedChange={setIsDarkMode} />
                <Moon className="h-4 w-4" />
              </div>
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-32 transition-all duration-300 hover:border-blue-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Last 24h</SelectItem>
                  <SelectItem value="7days">Last 7 days</SelectItem>
                  <SelectItem value="30days">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" className="hover-lift">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="hover-lift">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Quick Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {overviewStats.map((stat, index) => (
            <Card
              key={index}
              className={`hover-lift ${isVisible ? "animate-fadeInUp" : "opacity-0"} border-0 shadow-lg ${stat.bgColor} relative overflow-hidden group`}
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                <div>
                  <CardTitle className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-700"}`}>
                    {stat.title}
                  </CardTitle>
                  <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{stat.description}</p>
                </div>
                <div className={`p-2 rounded-lg ${stat.color.replace("text-", "bg-").replace("600", "100")}`}>
                  <stat.icon
                    className={`h-5 w-5 ${stat.color} transition-transform duration-300 group-hover:scale-110`}
                  />
                </div>
              </CardHeader>
              <CardContent className="relative z-10">
                <div className="text-2xl font-bold mb-1">
                  {stat.title === "Total Screen Time" ? (
                    <AnimatedCounter end={22} suffix="h 55m" />
                  ) : stat.title === "Focus Score" ? (
                    <AnimatedCounter end={78} suffix="%" />
                  ) : stat.title === "Sites Blocked" ? (
                    <AnimatedCounter end={28} />
                  ) : (
                    <AnimatedCounter end={12} />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {stat.changeType === "positive" ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={`text-xs font-medium ${stat.changeType === "positive" ? "text-green-600" : "text-red-600"}`}
                  >
                    {stat.change}
                  </span>
                  <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>vs last week</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-fit lg:grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="detailed" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Detailed
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Goals
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Daily Usage Trend */}
              <Card
                className={`hover-lift ${isVisible ? "animate-scaleIn" : "opacity-0"} border-0 shadow-lg`}
                style={{ animationDelay: "0.2s" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Daily Usage Trend
                  </CardTitle>
                  <CardDescription>Screen time and productivity over the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={dailyUsageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="day" stroke="#666" />
                      <YAxis stroke="#666" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1f2937" : "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                      <Legend />
                      <Bar dataKey="productive" stackId="a" fill="#10B981" name="Productive Time" />
                      <Bar dataKey="distracted" stackId="a" fill="#EF4444" name="Distracted Time" />
                      <Line type="monotone" dataKey="focus" stroke="#8B5CF6" strokeWidth={3} name="Focus Score" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Site Distribution */}
              <Card
                className={`hover-lift ${isVisible ? "animate-scaleIn" : "opacity-0"} border-0 shadow-lg`}
                style={{ animationDelay: "0.4s" }}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-purple-600" />
                    Site Categories
                  </CardTitle>
                  <CardDescription>Time distribution across different categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        dataKey="time"
                        label={({ category, percentage }) => `${category} ${percentage}%`}
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value} minutes`, "Time Spent"]}
                        contentStyle={{
                          backgroundColor: isDarkMode ? "#1f2937" : "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Hourly Activity Heatmap */}
            <Card
              className={`hover-lift ${isVisible ? "animate-fadeInUp" : "opacity-0"} border-0 shadow-lg`}
              style={{ animationDelay: "0.6s" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" />
                  Hourly Activity Pattern
                </CardTitle>
                <CardDescription>Your browsing patterns throughout the day</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Area type="monotone" dataKey="usage" stroke="#3B82F6" fill="url(#colorUsage)" strokeWidth={2} />
                    <defs>
                      <linearGradient id="colorUsage" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Weekly Progress */}
            <Card
              className={`hover-lift ${isVisible ? "animate-fadeInUp" : "opacity-0"} border-0 shadow-lg`}
              style={{ animationDelay: "0.8s" }}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-orange-600" />
                  Weekly Progress
                </CardTitle>
                <CardDescription>Your improvement over the last 4 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={weeklyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="week" stroke="#666" />
                    <YAxis stroke="#666" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDarkMode ? "#1f2937" : "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="focusScore" stroke="#8B5CF6" strokeWidth={3} name="Focus Score" />
                    <Line type="monotone" dataKey="productivity" stroke="#10B981" strokeWidth={3} name="Productivity" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Detailed Tab */}
          <TabsContent value="detailed" className="space-y-6">
            <Card className={`hover-lift ${isVisible ? "animate-fadeInUp" : "opacity-0"} border-0 shadow-lg`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-600" />
                  Detailed Site Analytics
                </CardTitle>
                <CardDescription>Comprehensive breakdown of your browsing activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Website</TableHead>
                      <TableHead>Time Spent</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Productivity</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Blocked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedSiteData.map((site, index) => (
                      <TableRow key={index} className="transition-all duration-300 hover:bg-blue-50">
                        <TableCell className="font-medium">{site.site}</TableCell>
                        <TableCell>{site.timeSpent}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {site.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress value={site.productivity} className="w-16 h-2" />
                            <span className="text-xs">{site.productivity}%</span>
                          </div>
                        </TableCell>
                        <TableCell>{site.visits}</TableCell>
                        <TableCell>
                          <Badge variant={site.blocked > 0 ? "destructive" : "secondary"} className="text-xs">
                            {site.blocked}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              site.status === "Over Limit"
                                ? "destructive"
                                : site.status === "Productive"
                                  ? "default"
                                  : "secondary"
                            }
                            className="transition-all duration-300 hover:scale-105"
                          >
                            {site.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {site.trend === "up" ? (
                            <TrendingUp className="h-4 w-4 text-red-500 transition-transform duration-300 hover:scale-110" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-green-500 transition-transform duration-300 hover:scale-110" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Insights Tab */}
          <TabsContent value="insights" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="hover-lift border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                    <div className="flex items-start gap-3">
                      <Eye className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-900">Peak Productivity Hours</h4>
                        <p className="text-sm text-blue-700">
                          You&apos;re most focused between 9-11 AM. Schedule important tasks during this time.
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-500">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-green-900">Great Progress!</h4>
                        <p className="text-sm text-green-700">
                          You&apos;ve reduced social media time by 23% this week. Keep it up!
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg border-l-4 border-orange-500">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-900">Attention Needed</h4>
                        <p className="text-sm text-orange-700">
                          YouTube usage spiked on weekends. Consider setting stricter limits.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-lift border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-yellow-600" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {achievements.map((achievement, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border transition-all duration-300 ${
                        achievement.unlocked
                          ? "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                          : "bg-gray-50 border-gray-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <achievement.icon
                          className={`h-5 w-5 ${achievement.unlocked ? "text-yellow-600" : "text-gray-400"}`}
                        />
                        <div>
                          <h4 className={`font-medium ${achievement.unlocked ? "text-yellow-900" : "text-gray-600"}`}>
                            {achievement.title}
                          </h4>
                          <p className={`text-sm ${achievement.unlocked ? "text-yellow-700" : "text-gray-500"}`}>
                            {achievement.description}
                          </p>
                        </div>
                        {achievement.unlocked && <CheckCircle2 className="h-5 w-5 text-yellow-600 ml-auto" />}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="hover-lift border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-600" />
                    Weekly Goals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Reduce screen time to 20h/week</span>
                      <span className="font-medium">22h / 20h</span>
                    </div>
                    <Progress value={90} className="h-2" />
                    <p className="text-xs text-gray-500">2 hours over target</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Maintain 75%+ focus score</span>
                      <span className="font-medium">78% / 75%</span>
                    </div>
                    <Progress value={104} className="h-2" />
                    <p className="text-xs text-green-600">Goal achieved! 🎉</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Block 25+ distracting visits</span>
                      <span className="font-medium">28 / 25</span>
                    </div>
                    <Progress value={112} className="h-2" />
                    <p className="text-xs text-green-600">Exceeded target! 🚀</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-lift border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-orange-600" />
                    Focus Streak
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center space-y-4">
                    <div className="text-4xl font-bold text-orange-600">
                      <AnimatedCounter end={12} />
                    </div>
                    <p className="text-lg font-medium">Days in a row!</p>
                    <p className="text-sm text-gray-600">
                      Your longest streak was 18 days. Keep going to beat your record!
                    </p>
                    <div className="flex justify-center gap-1 mt-4">
                      {[...Array(14)].map((_, i) => (
                        <div key={i} className={`w-3 h-3 rounded-full ${i < 12 ? "bg-orange-500" : "bg-gray-200"}`} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
