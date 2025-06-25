import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, timeTracking } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const dbUserId = user[0].id

    // Get all analytics data for this user
    const allData = await db.select()
      .from(timeTracking)
      .where(eq(timeTracking.userId, dbUserId))
      .orderBy(timeTracking.date)

    return NextResponse.json({
      userId: dbUserId,
      clerkId: userId,
      totalRecords: allData.length,
      data: allData,
      domains: [...new Set(allData.map(d => d.domain))],
      dateRange: {
        earliest: allData[0]?.date,
        latest: allData[allData.length - 1]?.date
      }
    })

  } catch (error) {
    console.error('Error fetching debug data:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 