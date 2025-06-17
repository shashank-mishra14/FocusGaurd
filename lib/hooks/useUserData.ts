'use client'

import { useState, useEffect } from 'react'

export interface ProtectedSiteData {
  id: number
  domain: string
  timeLimit?: number
  passwordProtected: boolean
  isActive: boolean
  createdAt: string
}

export interface AnalyticsData {
  analytics: Array<{
    domain: string
    date: string
    timeSpent: number
    visits: number
  }>
  dailyTotals: Array<{
    date: string
    totalTime: number
    totalVisits: number
    uniqueSites: number
  }>
  siteTotals: Array<{
    domain: string
    totalTime: number
    totalVisits: number
  }>
  period: number
}

export interface UserData {
  id: number
  clerkId: string
  email?: string
  firstName?: string
  lastName?: string
}

export function useUserData() {
  const [user, setUser] = useState<UserData | null>(null)
  const [protectedSites, setProtectedSites] = useState<ProtectedSiteData[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // Fetch user data
  const fetchUser = async () => {
    try {
      const response = await fetch('/api/auth/user')
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        throw new Error('Failed to fetch user data')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setError('Failed to load user data')
    }
  }

  // Fetch protected sites
  const fetchProtectedSites = async () => {
    try {
      const response = await fetch('/api/protected-sites')
      if (response.ok) {
        const data = await response.json()
        setProtectedSites(data.sites)
      } else {
        throw new Error('Failed to fetch protected sites')
      }
    } catch (error) {
      console.error('Error fetching protected sites:', error)
      setError('Failed to load protected sites')
    }
  }

  // Fetch analytics data
  const fetchAnalytics = async (days: number = 7) => {
    try {
      const response = await fetch(`/api/analytics?days=${days}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        throw new Error('Failed to fetch analytics')
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setError('Failed to load analytics')
    }
  }

  // Add protected site
  const addProtectedSite = async (siteData: {
    domain: string
    password?: string
    timeLimit?: number
    passwordProtected?: boolean
  }) => {
    try {
      const response = await fetch('/api/protected-sites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(siteData),
      })

      if (response.ok) {
        await fetchProtectedSites() // Refresh the list
        return { success: true }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add site')
      }
    } catch (error) {
      console.error('Error adding protected site:', error)
      setError(error instanceof Error ? error.message : 'Failed to add site')
      return { success: false, error: error instanceof Error ? error.message : 'Failed to add site' }
    }
  }

  // Remove protected site
  const removeProtectedSite = async (siteId: number) => {
    try {
      const response = await fetch(`/api/protected-sites?id=${siteId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchProtectedSites() // Refresh the list
        return { success: true }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to remove site')
      }
    } catch (error) {
      console.error('Error removing protected site:', error)
      setError(error instanceof Error ? error.message : 'Failed to remove site')
      return { success: false, error: error instanceof Error ? error.message : 'Failed to remove site' }
    }
  }

  // Generate extension session token
  const generateExtensionToken = async () => {
    try {
      const response = await fetch('/api/extension/session', {
        method: 'POST',
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, token: data.sessionToken, dashboardUrl: data.dashboardUrl }
      } else {
        throw new Error('Failed to generate extension token')
      }
    } catch (error) {
      console.error('Error generating extension token:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Failed to generate token' }
    }
  }

  // Initialize data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError('')
      
      try {
        await Promise.all([
          fetchUser(),
          fetchProtectedSites(),
          fetchAnalytics(),
        ])
      } catch (error) {
        console.error('Error loading initial data:', error)
        setError('Failed to load data')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [])

  return {
    user,
    protectedSites,
    analytics,
    loading,
    error,
    fetchUser,
    fetchProtectedSites,
    fetchAnalytics,
    addProtectedSite,
    removeProtectedSite,
    generateExtensionToken,
    setError,
  }
} 