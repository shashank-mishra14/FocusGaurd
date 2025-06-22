import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, timeTracking } from '@/lib/db'
import { eq } from 'drizzle-orm'

// Reset/clear all analytics data for the current user
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')

    let user;

    if (token) {
      // Token-based authentication (extension access)
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      const sessionResponse = await fetch(`${baseUrl}/api/extension/session?token=${token}`)
      const sessionData = await sessionResponse.json()
      
      if (!sessionData.valid) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }

      // Get user from database using clerkId from session
      const userResult = await db.select().from(users).where(eq(users.clerkId, sessionData.user.clerkId)).limit(1)
      
      if (userResult.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      user = userResult[0];
    } else {
      // Regular Clerk authentication
      const { userId } = await auth()
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get user from database
      const userResult = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
      
      if (userResult.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      user = userResult[0];
    }

    // Delete all time tracking data for this user
    await db.delete(timeTracking)
      .where(eq(timeTracking.userId, user.id))

    console.log(`Cleared analytics data for user ${user.id}`)

    return NextResponse.json({ 
      success: true, 
      message: 'All analytics data has been cleared',
      userId: user.id
    }, { status: 200 })
  } catch (error) {
    console.error('Error clearing analytics data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 