import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, extensionSessions } from '@/lib/db'
import { eq, and, gt } from 'drizzle-orm'
import crypto from 'crypto'

// Generate extension session token for authenticated user
export async function POST() {
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

    // Generate session token
    const sessionToken = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Deactivate existing sessions
    await db.update(extensionSessions)
      .set({ isActive: false })
      .where(eq(extensionSessions.userId, user[0].id))

    // Create new session
    await db.insert(extensionSessions).values({
      userId: user[0].id,
      sessionToken,
      expiresAt,
    })

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.json({ 
      sessionToken,
      expiresAt,
      dashboardUrl: `${baseUrl}/dashboard?token=${sessionToken}`
    }, { status: 200 })
  } catch (error) {
    console.error('Error creating extension session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Validate extension session token
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 })
    }

    // Validate session
    const session = await db.select({
      userId: extensionSessions.userId,
      clerkId: users.clerkId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(extensionSessions)
    .innerJoin(users, eq(extensionSessions.userId, users.id))
    .where(
      and(
        eq(extensionSessions.sessionToken, token),
        eq(extensionSessions.isActive, true),
        gt(extensionSessions.expiresAt, new Date())
      )
    )
    .limit(1)

    if (session.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    return NextResponse.json({ 
      valid: true,
      user: session[0]
    }, { status: 200 })
  } catch (error) {
    console.error('Error validating extension session:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 