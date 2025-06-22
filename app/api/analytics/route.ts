import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, timeTracking } from '@/lib/db'
import { eq, and, sql, gte } from 'drizzle-orm'

// Get analytics data for dashboard
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const days = parseInt(url.searchParams.get('days') || '7')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]

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

    // Get analytics data
    const analytics = await db.select({
      domain: timeTracking.domain,
      date: timeTracking.date,
      timeSpent: timeTracking.timeSpent,
      visits: timeTracking.visits,
    })
    .from(timeTracking)
    .where(and(
      eq(timeTracking.userId, user.id),
      gte(timeTracking.date, startDateStr)
    ))

    // Get daily totals
    const dailyTotals = await db.select({
      date: timeTracking.date,
      totalTime: sql<number>`sum(${timeTracking.timeSpent})`,
      totalVisits: sql<number>`sum(${timeTracking.visits})`,
      uniqueSites: sql<number>`count(distinct ${timeTracking.domain})`,
    })
    .from(timeTracking)
    .where(and(
      eq(timeTracking.userId, user.id),
      gte(timeTracking.date, startDateStr)
    ))
    .groupBy(timeTracking.date)

    // Get site totals
    const siteTotals = await db.select({
      domain: timeTracking.domain,
      totalTime: sql<number>`sum(${timeTracking.timeSpent})`,
      totalVisits: sql<number>`sum(${timeTracking.visits})`,
    })
    .from(timeTracking)
    .where(and(
      eq(timeTracking.userId, user.id),
      gte(timeTracking.date, startDateStr)
    ))
    .groupBy(timeTracking.domain)
    .orderBy(sql`sum(${timeTracking.timeSpent}) desc`)

    return NextResponse.json({ 
      analytics,
      dailyTotals,
      siteTotals,
      period: days
    }, { status: 200 })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Submit analytics data from extension
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Session token required' }, { status: 401 })
    }

    // Validate session token
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const sessionResponse = await fetch(`${baseUrl}/api/extension/session?token=${token}`)
    const sessionData = await sessionResponse.json()
    
    if (!sessionData.valid) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { domain, timeSpent, visits, date } = body

    if (!domain || !date) {
      return NextResponse.json({ error: 'Domain and date are required' }, { status: 400 })
    }

    // Get user from database
    const userResult = await db.select().from(users).where(eq(users.clerkId, sessionData.user.clerkId)).limit(1)
    
    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0];

    // Check if record exists for this user, domain, and date
    const existingRecord = await db.select().from(timeTracking)
      .where(and(
        eq(timeTracking.userId, user.id),
        eq(timeTracking.domain, domain),
        eq(timeTracking.date, date)
      ))
      .limit(1)

    if (existingRecord.length > 0) {
      // Update existing record
      await db.update(timeTracking)
        .set({
          timeSpent: existingRecord[0].timeSpent + (timeSpent || 0),
          visits: existingRecord[0].visits + (visits || 0),
          updatedAt: new Date(),
        })
        .where(and(
          eq(timeTracking.userId, user.id),
          eq(timeTracking.domain, domain),
          eq(timeTracking.date, date)
        ))
    } else {
      // Create new record
      await db.insert(timeTracking).values({
        userId: user.id,
        domain,
        date,
        timeSpent: timeSpent || 0,
        visits: visits || 0,
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error submitting analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 