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
      // Update existing record - only increment visits if this is a new session
      const record = existingRecord[0]
      const lastUpdate = record.updatedAt
      const now = new Date()
      const timeSinceLastUpdate = lastUpdate ? now.getTime() - lastUpdate.getTime() : 0
      
      // Only count as a new visit if more than 30 minutes since last update
      const isNewVisit = timeSinceLastUpdate > 30 * 60 * 1000 // 30 minutes
      
      const result = await db.update(timeTracking)
        .set({
          timeSpent: (record.timeSpent || 0) + Math.round(timeSpent),
          visits: isNewVisit ? (record.visits || 0) + 1 : (record.visits || 0),
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
    let dbUserId: number

    // Check if this is an extension request with Bearer token
    const authHeader = request.headers.get('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      
      // Validate extension session
      const session = await db.select({
        userId: extensionSessions.userId,
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
        return NextResponse.json({ error: 'Invalid or expired extension session token' }, { status: 401 })
      }

      dbUserId = session[0].userId
    } else {
      // Use Clerk authentication for dashboard
      const { userId } = await auth()
      
      if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Get user from database
      const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
      
      if (user.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      dbUserId = user[0].id
    }

    // Get query parameters
    const url = new URL(request.url)
    const period = parseInt(url.searchParams.get('period') || url.searchParams.get('days') || '7')
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

    // Aggregate daily totals
    interface DailyTotal {
      date: string
      totalTime: number
      totalVisits: number
    }
    
    const dailyTotals = dailyData.reduce((acc: DailyTotal[], day) => {
      const existingDay = acc.find(d => d.date === day.date)
      if (existingDay) {
        existingDay.totalTime += day.totalTime || 0
        existingDay.totalVisits += day.visits || 0
      } else {
        acc.push({
          date: day.date,
          totalTime: day.totalTime || 0,
          totalVisits: day.visits || 0
        })
      }
      return acc
    }, [] as DailyTotal[]).sort((a, b) => a.date.localeCompare(b.date))

    // Generate hourly data (placeholder for now, could be enhanced)
    const hourlyTotals = []
    for (let hour = 0; hour < 24; hour++) {
      hourlyTotals.push({
        hour,
        totalTime: 0 // This could be calculated from more detailed time tracking
      })
    }

    // Structure the response to match dashboard expectations
    const response = {
      siteTotals: analyticsData.map(site => ({
        domain: site.domain,
        totalTime: site.totalTime,
        totalVisits: site.totalVisits
      })),
      dailyTotals,
      hourlyTotals,
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