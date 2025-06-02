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
import { Shield, Clock, BarChart3, Plus, Settings, ExternalLink, Trash2, Edit, Zap } from "lucide-react"
import Link from "next/link"

export default function ExtensionPopup() {
  const [newSiteUrl, setNewSiteUrl] = useState("")
  const [timeLimit, setTimeLimit] = useState([60])
  const [passwordProtected, setPasswordProtected] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [progressValue, setProgressValue] = useState(0)

  const protectedSites = [
    { url: "facebook.com", timeLimit: 30, timeUsed: 25, passwordProtected: true, status: "active" },
    { url: "twitter.com", timeLimit: 45, timeUsed: 12, passwordProtected: false, status: "active" },
    { url: "youtube.com", timeLimit: 60, timeUsed: 60, passwordProtected: true, status: "blocked" },
    { url: "reddit.com", timeLimit: 20, timeUsed: 8, passwordProtected: false, status: "active" },
  ]

  const dailyUsage = {
    totalTime: 180,
    dailyLimit: 240,
    sitesVisited: 12,
  }

  useEffect(() => {
    setIsVisible(true)
    // Animate progress bar
    const timer = setTimeout(() => {
      setProgressValue((dailyUsage.totalTime / dailyUsage.dailyLimit) * 100)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

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
        </div>
        <Button variant="ghost" size="sm" className="hover:bg-blue-100 transition-colors duration-300">
          <Settings className="h-4 w-4" />
        </Button>
      </div>

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
          <div className="space-y-2">
            {protectedSites.map((site, index) => (
              <Card
                key={index}
                className={`p-3 transition-all duration-300 hover:shadow-md hover:scale-105 border-l-4 ${
                  site.status === "blocked" ? "border-l-red-500 bg-red-50" : "border-l-green-500 bg-green-50"
                } ${isVisible ? "animate-fadeIn" : "opacity-0"}`}
                style={{ animationDelay: `${0.3 + index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{site.url}</span>
                      {site.passwordProtected && <Shield className="h-3 w-3 text-blue-600 animate-pulse" />}
                      <Badge
                        variant={site.status === "blocked" ? "destructive" : "secondary"}
                        className="text-xs animate-pulse-gentle"
                      >
                        {site.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-600">
                        {site.timeUsed}m / {site.timeLimit}m
                      </span>
                    </div>
                    <Progress
                      value={(site.timeUsed / site.timeLimit) * 100}
                      className="h-1 mt-1 transition-all duration-500"
                    />
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-blue-100 transition-colors duration-300"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-100 transition-colors duration-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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
                  max={180}
                  min={5}
                  step={5}
                  className="w-full transition-all duration-300"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>5 min</span>
                  <span className="font-medium text-blue-600">{timeLimit[0]} minutes</span>
                  <span>3 hours</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg transition-all duration-300 hover:bg-gray-100">
              <div>
                <Label className="text-sm font-medium">Password Protection</Label>
                <p className="text-xs text-gray-500">Require password to access</p>
              </div>
              <Switch
                checked={passwordProtected}
                onCheckedChange={setPasswordProtected}
                className="transition-all duration-300"
              />
            </div>

            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 group">
              <Plus className="h-4 w-4 mr-2 transition-transform duration-300 group-hover:rotate-90" />
              Add Site
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="p-4 space-y-4">
          <div className={`space-y-3 ${isVisible ? "animate-fadeIn" : "opacity-0"}`} style={{ animationDelay: "0.3s" }}>
            <Card className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 transition-all duration-300 hover:shadow-md">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-blue-600 animate-pulse" />
                <span className="font-medium text-sm">Quick Stats</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="transition-all duration-300 hover:scale-105">
                  <div className="text-lg font-bold text-blue-600">3h 12m</div>
                  <div className="text-xs text-gray-500">Today</div>
                </div>
                <div className="transition-all duration-300 hover:scale-105">
                  <div className="text-lg font-bold text-green-600">22h 8m</div>
                  <div className="text-xs text-gray-500">This Week</div>
                </div>
              </div>
            </Card>

            <Card className="p-3 transition-all duration-300 hover:shadow-md">
              <div className="space-y-2">
                <div className="text-sm font-medium">Top Sites Today</div>
                <div className="space-y-1">
                  {[
                    { site: "youtube.com", time: "1h 15m" },
                    { site: "facebook.com", time: "45m" },
                    { site: "twitter.com", time: "32m" },
                  ].map((item, index) => (
                    <div
                      key={index}
                      className="flex justify-between text-xs transition-all duration-300 hover:bg-gray-50 p-1 rounded"
                    >
                      <span>{item.site}</span>
                      <span className="font-medium">{item.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            <Button
              variant="outline"
              className="w-full transition-all duration-300 hover:bg-blue-50 hover:border-blue-300 group"
              asChild
            >
              <Link href="/dashboard">
                View Full Dashboard
                <ExternalLink className="h-3 w-3 ml-2 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
