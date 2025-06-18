import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, protectedSites } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

// Get protected sites for user
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    let userId: string | null = null
    
    // Check if using token-based authentication (from extension)
    if (token) {
      const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extension/session?token=${token}`)
      const sessionData = await sessionResponse.json()
      
      if (!sessionData.valid) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      
      userId = sessionData.user.clerkId
    } else {
      // Regular Clerk authentication
      const authResult = await auth()
      userId = authResult.userId
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user from database
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get protected sites
    const sites = await db.select().from(protectedSites).where(eq(protectedSites.userId, user[0].id))

    return NextResponse.json({ sites }, { status: 200 })
  } catch (error) {
    console.error('Error fetching protected sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add protected site
export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    
    let userId: string | null = null
    
    // Check if using token-based authentication (from extension)
    if (token) {
      const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extension/session?token=${token}`)
      const sessionData = await sessionResponse.json()
      
      if (!sessionData.valid) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      
      userId = sessionData.user.clerkId
    } else {
      // Regular Clerk authentication
      const authResult = await auth()
      userId = authResult.userId
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { domain, timeLimit, passwordProtected } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Get user from database
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if site already exists
    const existingSite = await db.select().from(protectedSites)
      .where(and(
        eq(protectedSites.userId, user[0].id),
        eq(protectedSites.domain, domain)
      ))
      .limit(1)

    if (existingSite.length > 0) {
      // Update existing site
      await db.update(protectedSites)
        .set({
          timeLimit: timeLimit || null,
          passwordProtected: passwordProtected || false,
          updatedAt: new Date(),
        })
        .where(and(
          eq(protectedSites.userId, user[0].id),
          eq(protectedSites.domain, domain)
        ))
    } else {
      // Create new site
      await db.insert(protectedSites).values({
        userId: user[0].id,
        domain,
        timeLimit: timeLimit || null,
        passwordProtected: passwordProtected || false,
        isActive: true,
      })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error adding protected site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Remove protected site
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const token = url.searchParams.get('token')
    const siteId = url.searchParams.get('id')
    const domain = url.searchParams.get('domain')
    
    let userId: string | null = null
    
    // Check if using token-based authentication (from extension)
    if (token) {
      const sessionResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/extension/session?token=${token}`)
      const sessionData = await sessionResponse.json()
      
      if (!sessionData.valid) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
      }
      
      userId = sessionData.user.clerkId
    } else {
      // Regular Clerk authentication
      const authResult = await auth()
      userId = authResult.userId
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!siteId && !domain) {
      return NextResponse.json({ error: 'Site ID or domain is required' }, { status: 400 })
    }

    // Get user from database
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Delete site
    if (siteId) {
      await db.delete(protectedSites)
        .where(and(
          eq(protectedSites.id, parseInt(siteId)),
          eq(protectedSites.userId, user[0].id)
        ))
    } else if (domain) {
      await db.delete(protectedSites)
        .where(and(
          eq(protectedSites.domain, domain),
          eq(protectedSites.userId, user[0].id)
        ))
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error removing protected site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 