"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Shield, Clock, BarChart3, Plus, Settings, ExternalLink, Trash2, Zap, Globe, AlertCircle } from "lucide-react"

interface ProtectedSite {
  id: string;
  domain: string;
  password?: string;
  passwordProtected?: boolean;
  timeLimit?: number;
  lastAccess?: number;
  createdAt: number;
}

interface TimeTrackingData {
  [domain: string]: {
    [date: string]: number;
  };
}

export default function ExtensionPopup() {
  const [newSiteUrl, setNewSiteUrl] = useState("")
  const [newSitePassword, setNewSitePassword] = useState("")
  const [timeLimit, setTimeLimit] = useState([60])
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [progressValue, setProgressValue] = useState(0)
  const [protectedSites, setProtectedSites] = useState<ProtectedSite[]>([])
  const [currentDomain, setCurrentDomain] = useState("")
  const [dailyUsage, setDailyUsage] = useState({
    totalTime: 0,
    dailyLimit: 240,
    sitesVisited: 0,
    todayTime: 0
  })
  const [isExtensionContext, setIsExtensionContext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    setIsVisible(true)
    checkExtensionContext()
    loadData()
  }, [])

  const checkExtensionContext = () => {
    // Check if we're running in a Chrome extension context
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
      setIsExtensionContext(true)
    } else {
      setIsExtensionContext(false)
      // Use mock data for development/preview
      setProtectedSites([
        { id: '1', domain: 'facebook.com', timeLimit: 30, passwordProtected: true, createdAt: Date.now() },
        { id: '2', domain: 'twitter.com', timeLimit: 45, createdAt: Date.now() },
        { id: '3', domain: 'youtube.com', timeLimit: 60, passwordProtected: true, createdAt: Date.now() },
      ])
      setCurrentDomain('example.com')
      setLoading(false)
    }
  }

  const loadData = async () => {
    if (!isExtensionContext) return

    try {
      setLoading(true)
      
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
      const tab = tabs[0]
      if (tab && tab.url && !tab.url.startsWith('chrome://')) {
        const domain = new URL(tab.url).hostname
        setCurrentDomain(domain)
        
        // Get today's analytics for current domain
        const analytics = await chrome.runtime.sendMessage({
          action: 'getAnalytics',
          period: 1
        })
        
        if (analytics?.success && analytics.data[domain]) {
          const todayTime = Object.values(analytics.data[domain].dailyData)[0] as number || 0
          setDailyUsage(prev => ({ ...prev, todayTime }))
        }
      }
      
      // Load protected sites
      const { protectedSites: sites } = await chrome.storage.local.get(['protectedSites'])
      setProtectedSites(sites || [])
      
      // Load time tracking data for overall stats
      const { timeTrackingData } = await chrome.storage.local.get(['timeTrackingData'])
      if (timeTrackingData) {
        calculateOverallStats(timeTrackingData)
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const calculateOverallStats = (timeTrackingData: TimeTrackingData) => {
    const today = new Date().toDateString()
    let totalTimeToday = 0
    let sitesVisitedToday = 0

    Object.values(timeTrackingData).forEach(siteData => {
      const dayTime = siteData[today] || 0
      totalTimeToday += dayTime
      if (dayTime > 0) sitesVisitedToday++
    })

    setDailyUsage(prev => ({
      ...prev,
      totalTime: Math.floor(totalTimeToday / 60000), // Convert to minutes
      sitesVisited: sitesVisitedToday
    }))

    setProgressValue((totalTimeToday / 60000 / dailyUsage.dailyLimit) * 100)
  }

  const handleAddSite = async () => {
    if (!newSiteUrl.trim()) {
      setError('Please enter a website URL')
      return
    }

    try {
      setError('')
      const siteData = {
        domain: newSiteUrl.replace(/^https?:\/\//, '').replace(/^www\./, ''),
        password: passwordProtected ? newSitePassword : undefined,
        timeLimit: timeLimit[0]
      }

      if (isExtensionContext) {
        const response = await chrome.runtime.sendMessage({
          action: 'addProtectedSite',
          data: siteData
        })

        if (response?.success) {
          await loadData() // Reload the sites
          setNewSiteUrl('')
          setNewSitePassword('')
          setPasswordProtected(false)
          setTimeLimit([60])
        } else {
          setError('Failed to add site: ' + (response?.error || 'Unknown error'))
        }
      } else {
        // Mock functionality for development
        const newSite: ProtectedSite = {
          id: Date.now().toString(),
          domain: siteData.domain,
          timeLimit: siteData.timeLimit,
          passwordProtected: !!siteData.password,
          createdAt: Date.now()
        }
        setProtectedSites(prev => [...prev, newSite])
        setNewSiteUrl('')
        setNewSitePassword('')
        setPasswordProtected(false)
        setTimeLimit([60])
      }
    } catch (error) {
      console.error('Error adding site:', error)
      setError('Failed to add site')
    }
  }

  const handleRemoveSite = async (domain: string) => {
    if (!confirm(`Remove ${domain} from protected sites?`)) return

    try {
      if (isExtensionContext) {
        const response = await chrome.runtime.sendMessage({
          action: 'removeProtectedSite',
          domain
        })

        if (response?.success) {
          await loadData()
        } else {
          setError('Failed to remove site')
        }
      } else {
        setProtectedSites(prev => prev.filter(site => site.domain !== domain))
      }
    } catch (error) {
      console.error('Error removing site:', error)
      setError('Failed to remove site')
    }
  }

  const openAnalytics = async () => {
    try {
      if (isExtensionContext) {
        // Generate session token for extension access
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/extension/session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          chrome.tabs.create({ url: data.dashboardUrl })
        } else {
          // User needs to sign in first
          chrome.tabs.create({ url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in?redirect_url=/dashboard` })
        }
      } else {
        window.open('/dashboard', '_blank')
      }
    } catch (error) {
      console.error('Error opening analytics:', error)
      // Fallback to sign-in page
      if (isExtensionContext) {
        chrome.tabs.create({ url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/sign-in?redirect_url=/dashboard` })
      } else {
        window.open('/sign-in?redirect_url=/dashboard', '_blank')
      }
    }
  }

  const openSettings = () => {
    if (isExtensionContext) {
      chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })
    } else {
      window.open('/settings', '_blank')
    }
  }

  const addCurrentSite = () => {
    if (currentDomain) {
      setNewSiteUrl(currentDomain)
    }
  }

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    if (hours > 0) {
      return `${hours}h ${mins}m`
    }
    return `${mins}m`
  }

  const getSiteStatus = (site: ProtectedSite) => {
    if (site.timeLimit) {
      const todayTime = Math.floor(dailyUsage.todayTime / 60000) // Convert to minutes
      if (todayTime >= site.timeLimit) {
        return { status: 'blocked', color: 'destructive' as const }
      }
    }
    return { status: 'active', color: 'secondary' as const }
  }

  if (loading) {
    return (
      <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden transform transition-all duration-500 hover:shadow-3xl">
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        .animate-slideDown {
          animation: slideDown 0.5s ease-out forwards;
        }
        .animate-fadeIn {
          animation: fadeIn 0.8s ease-out forwards;
        }
        .animate-pulse-gentle {
          animation: pulse 2s ease-in-out infinite;
        }
      `}</style>

      {/* Header */}
      <div
        className={`flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50 ${isVisible ? "animate-slideDown" : "opacity-0"}`}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Shield className="h-5 w-5 text-blue-600 animate-pulse-gentle" />
            <div className="absolute inset-0 bg-blue-600 rounded-full opacity-20 scale-0 animate-ping"></div>
          </div>
          <span className="font-semibold text-gray-900">FocusGuard</span>
          <Zap className="h-3 w-3 text-yellow-500 animate-bounce" />
          {!isExtensionContext && (
            <Badge variant="outline" className="text-xs">Demo</Badge>
          )}
        </div>
        <Button variant="ghost" size="sm" className="hover:bg-blue-100 transition-colors duration-300" onClick={openSettings}>
          <Settings className="h-4 w-4" />
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-3 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        </div>
      )}

      {/* Current Site Info */}
      {currentDomain && (
        <div className="p-4 bg-gray-50 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-gray-500" />
              <span className="font-medium text-sm">{currentDomain}</span>
            </div>
            <Button size="sm" variant="outline" onClick={addCurrentSite}>
              <Plus className="h-3 w-3 mr-1" />
              Protect
            </Button>
          </div>
          {dailyUsage.todayTime > 0 && (
            <p className="text-xs text-gray-600 mt-1">
              Today: {formatTime(Math.floor(dailyUsage.todayTime / 60000))}
            </p>
          )}
        </div>
      )}

      {/* Daily Usage Summary */}
      <div
        className={`p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b ${isVisible ? "animate-fadeIn" : "opacity-0"}`}
        style={{ animationDelay: "0.2s" }}
      >
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Today's Usage</span>
            <span className="font-medium">
              {dailyUsage.totalTime}m / {dailyUsage.dailyLimit}m
            </span>
          </div>
          <Progress value={progressValue} className="h-2 transition-all duration-1000 ease-out" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>{dailyUsage.sitesVisited} sites visited</span>
            <span>{dailyUsage.dailyLimit - dailyUsage.totalTime}m remaining</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sites" className="w-full">
        <TabsList className="grid w-full grid-cols-3 m-2">
          <TabsTrigger value="sites" className="text-xs transition-all duration-300 hover:bg-blue-100">
            Protected Sites
          </TabsTrigger>
          <TabsTrigger value="add" className="text-xs transition-all duration-300 hover:bg-green-100">
            Add Site
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs transition-all duration-300 hover:bg-purple-100">
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sites" className="p-4 space-y-3">
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {protectedSites.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No protected sites yet</p>
                <p className="text-xs">Add your first site to get started!</p>
              </div>
            ) : (
              protectedSites.map((site, index) => {
                const siteStatus = getSiteStatus(site)
                return (
                  <Card
                    key={site.id}
                    className={`p-3 transition-all duration-300 hover:shadow-md hover:scale-105 border-l-4 ${
                      siteStatus.status === "blocked" ? "border-l-red-500 bg-red-50" : "border-l-green-500 bg-green-50"
                    } ${isVisible ? "animate-fadeIn" : "opacity-0"}`}
                    style={{ animationDelay: `${0.3 + index * 0.1}s` }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{site.domain}</span>
                          {site.password && <Shield className="h-3 w-3 text-blue-600 animate-pulse" />}
                          <Badge
                            variant={siteStatus.color}
                            className="text-xs animate-pulse-gentle"
                          >
                            {siteStatus.status}
                          </Badge>
                        </div>
                        {site.timeLimit && (
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-600">
                              Limit: {site.timeLimit}m
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-red-100 transition-colors duration-300"
                          onClick={() => handleRemoveSite(site.domain)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="add" className="p-4 space-y-4">
          <div className={`space-y-3 ${isVisible ? "animate-fadeIn" : "opacity-0"}`} style={{ animationDelay: "0.3s" }}>
            <div>
              <Label htmlFor="url" className="text-sm font-medium">
                Website URL
              </Label>
              <Input
                id="url"
                placeholder="e.g., facebook.com"
                value={newSiteUrl}
                onChange={(e) => setNewSiteUrl(e.target.value)}
                className="mt-1 transition-all duration-300 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <Label className="text-sm font-medium">Daily Time Limit</Label>
              <div className="mt-2 space-y-2">
                <Slider
                  value={timeLimit}
                  onValueChange={setTimeLimit}
                  max={240}
                  min={5}
                  step={5}
                  className="transition-all duration-300"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5 min</span>
                  <span className="font-medium text-blue-600">{timeLimit[0]} minutes</span>
                  <span>4 hours</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="password-toggle" className="text-sm font-medium">
                Password Protection
              </Label>
              <Switch
                id="password-toggle"
                checked={passwordProtected}
                onCheckedChange={setPasswordProtected}
                className="transition-all duration-300"
              />
            </div>

            {passwordProtected && (
              <div className="animate-fadeIn">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter a secure password"
                  value={newSitePassword}
                  onChange={(e) => setNewSitePassword(e.target.value)}
                  className="mt-1 transition-all duration-300 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            <Button 
              className="w-full transition-all duration-300 hover:scale-105" 
              onClick={handleAddSite}
              disabled={!newSiteUrl.trim() || (passwordProtected && !newSitePassword)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Protected Site
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="p-4 space-y-4">
          <div className={`space-y-3 ${isVisible ? "animate-fadeIn" : "opacity-0"}`} style={{ animationDelay: "0.3s" }}>
            <Button
              className="w-full transition-all duration-300 hover:scale-105"
              onClick={openAnalytics}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Open Full Analytics
              <ExternalLink className="h-3 w-3 ml-2" />
            </Button>
            
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-3 text-center">
                <div className="text-lg font-bold text-blue-600">{protectedSites.length}</div>
                <div className="text-xs text-gray-500">Protected Sites</div>
              </Card>
              <Card className="p-3 text-center">
                <div className="text-lg font-bold text-green-600">{formatTime(dailyUsage.totalTime)}</div>
                <div className="text-xs text-gray-500">Today's Usage</div>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
} 