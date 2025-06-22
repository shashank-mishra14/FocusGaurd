'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ExtensionAuth() {
  const [isGeneratingToken, setIsGeneratingToken] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

    const generateExtensionToken = async () => {
    setIsGeneratingToken(true)
    setError(null)
    
    try {
      console.log('Generating extension token...')
      const response = await fetch('/api/extension/session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)
      
      if (response.ok) {
        setToken(data.sessionToken)
        
        // Store token in localStorage for extension to pick up
        if (typeof window !== 'undefined') {
          try {
            console.log('Storing token for extension pickup...')
            localStorage.setItem('protekt_extension_token', data.sessionToken)
            localStorage.setItem('protekt_extension_token_timestamp', Date.now().toString())
            
            // Try to send message to extension if available
            if (window.chrome?.runtime) {
              chrome.runtime.sendMessage({
                action: 'setExtensionToken',
                token: data.sessionToken
              }, (response) => {
                console.log('Extension response:', response)
                if (chrome.runtime.lastError) {
                  console.log('Extension not reachable:', chrome.runtime.lastError)
                }
              })
            }
            
            // Redirect to dashboard after short delay
            setTimeout(() => {
              router.push('/dashboard')
            }, 2000)
            
          } catch (error) {
            console.log('Error storing token:', error)
          }
        }
      } else {
        console.error('API error:', data)
        setError(data.error || 'Failed to generate token')
      }
    } catch (error) {
      console.error('Error generating token:', error)
      setError(`Failed to connect to extension: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsGeneratingToken(false)
    }
  }

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token)
      // You could show a toast here
    }
  }

  const goToDashboard = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 text-4xl">🔗</div>
          <CardTitle>Connect Extension</CardTitle>
          <CardDescription>
            Connect your Protekt browser extension to sync your protected sites and analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!token ? (
            <>
              <div className="text-sm text-gray-600 space-y-2">
                <p>This will:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Sync your protected sites to the extension</li>
                  <li>Enable real-time blocking and time tracking</li>
                  <li>Connect your extension to this dashboard</li>
                </ul>
              </div>
              
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <Button 
                onClick={generateExtensionToken}
                disabled={isGeneratingToken}
                className="w-full"
              >
                {isGeneratingToken ? 'Connecting...' : 'Connect Extension'}
              </Button>
            </>
          ) : (
            <>
              <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center space-x-2 text-green-700">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="font-medium">Successfully Connected!</span>
                </div>
                <p className="text-green-600 text-sm mt-1">
                  Your extension is now connected to your account. You can close this tab and use your extension.
                </p>
              </div>
              
              <div className="space-y-2">
                <Button onClick={goToDashboard} className="w-full">
                  View Dashboard
                </Button>
                <Button variant="outline" onClick={copyToken} className="w-full">
                  Copy Session Token
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 text-center">
                Session expires in 24 hours
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 