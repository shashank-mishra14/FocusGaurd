import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, extensionSessions, timeTracking } from '@/lib/db'
import { eq, and, gte, desc, sum, sql } from 'drizzle-orm'

// Submit analytics data from extension
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization header' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    
    // Validate extension session
    const session = await db.select({
      userId: extensionSessions.userId,
      user: {
        id: users.id,
        clerkId: users.clerkId,
        email: users.email
      }
    })
    .from(extensionSessions)
    .innerJoin(users, eq(extensionSessions.userId, users.id))
    .where(
      and(
        eq(extensionSessions.sessionToken, token),
        eq(extensionSessions.isActive, true),
        gte(extensionSessions.expiresAt, new Date())
      )
    )
    .limit(1)

    if (session.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired session token' }, { status: 401 })
    }

    const userId = session[0].userId

    // Parse analytics data
    const body = await request.json()
    const { domain, timeSpent, date } = body

    if (!domain || typeof timeSpent !== 'number') {
      return NextResponse.json({ error: 'Missing required fields: domain and timeSpent' }, { status: 400 })
    }

    // Convert date to YYYY-MM-DD format for the database
    const dateStr = new Date(date).toISOString().split('T')[0]

    // Check if record exists for this user, domain, and date
    const existingRecord = await db.select().from(timeTracking)
      .where(and(
        eq(timeTracking.userId, userId),
        eq(timeTracking.domain, domain),
        eq(timeTracking.date, dateStr)
      ))
      .limit(1)

    if (existingRecord.length > 0) {
      // Update existing record
      const record = existingRecord[0]
      const result = await db.update(timeTracking)
        .set({
          timeSpent: record.timeSpent + Math.round(timeSpent),
          visits: record.visits + 1,
          updatedAt: new Date(),
        })
        .where(and(
          eq(timeTracking.userId, userId),
          eq(timeTracking.domain, domain),
          eq(timeTracking.date, dateStr)
        ))
        .returning()

      console.log('Analytics data updated:', result[0])

      return NextResponse.json({ 
        success: true, 
        id: result[0].id,
        message: 'Analytics data updated successfully',
        action: 'updated'
      })
    } else {
      // Create new record
      const result = await db.insert(timeTracking).values({
        userId,
        domain,
        date: dateStr,
        timeSpent: Math.round(timeSpent),
        visits: 1,
      }).returning()

      console.log('Analytics data created:', result[0])

      return NextResponse.json({ 
        success: true, 
        id: result[0].id,
        message: 'Analytics data created successfully',
        action: 'created'
      })
    }

  } catch (error) {
    console.error('Error saving analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to save analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get analytics data for dashboard
export async function GET(request: NextRequest) {
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

    // Get query parameters
    const url = new URL(request.url)
    const period = parseInt(url.searchParams.get('period') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)
    const startDateStr = startDate.toISOString().split('T')[0]

    // Get analytics summary
    const analyticsData = await db.select({
      domain: timeTracking.domain,
      totalTime: sum(timeTracking.timeSpent).mapWith(Number),
      totalVisits: sum(timeTracking.visits).mapWith(Number),
      lastUpdate: sql<Date>`MAX(${timeTracking.updatedAt})`,
      avgDailyTime: sql<number>`AVG(${timeTracking.timeSpent})`.mapWith(Number)
    })
    .from(timeTracking)
    .where(
      and(
        eq(timeTracking.userId, dbUserId),
        gte(timeTracking.date, startDateStr)
      )
    )
    .groupBy(timeTracking.domain)
    .orderBy(desc(sum(timeTracking.timeSpent)))

    // Get daily breakdown
    const dailyData = await db.select({
      domain: timeTracking.domain,
      date: timeTracking.date,
      totalTime: timeTracking.timeSpent,
      visits: timeTracking.visits
    })
    .from(timeTracking)
    .where(
      and(
        eq(timeTracking.userId, dbUserId),
        gte(timeTracking.date, startDateStr)
      )
    )
    .orderBy(timeTracking.date)

    // Structure the response
    const response = {
      summary: analyticsData,
      daily: dailyData,
      period,
      startDate: startDateStr,
      endDate: new Date().toISOString().split('T')[0]
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Reset analytics data
export async function DELETE() {
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

    // Delete all analytics for this user
    await db.delete(timeTracking).where(eq(timeTracking.userId, user[0].id))

    return NextResponse.json({ 
      success: true,
      message: 'Analytics data reset successfully' 
    })

  } catch (error) {
    console.error('Error resetting analytics:', error)
    return NextResponse.json({ 
      error: 'Failed to reset analytics data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 