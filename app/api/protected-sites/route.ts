import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db, users, protectedSites } from '@/lib/db'
import { eq, and } from 'drizzle-orm'

// Get user's protected sites
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

    // Get user's protected sites
    const sites = await db.select().from(protectedSites)
      .where(and(
        eq(protectedSites.userId, user[0].id),
        eq(protectedSites.isActive, true)
      ))

    return NextResponse.json({ sites }, { status: 200 })
  } catch (error) {
    console.error('Error fetching protected sites:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Add new protected site
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { domain, password, timeLimit, passwordProtected } = body

    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 })
    }

    // Get user from database
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Clean domain
    const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/^www\./, '')

    // Check if site already exists
    const existingSite = await db.select().from(protectedSites)
      .where(and(
        eq(protectedSites.userId, user[0].id),
        eq(protectedSites.domain, cleanDomain),
        eq(protectedSites.isActive, true)
      ))

    if (existingSite.length > 0) {
      return NextResponse.json({ error: 'Site already protected' }, { status: 400 })
    }

    // Create new protected site
    const newSite = await db.insert(protectedSites).values({
      userId: user[0].id,
      domain: cleanDomain,
      password: passwordProtected ? password : null,
      timeLimit: timeLimit || null,
      passwordProtected: passwordProtected || false,
    }).returning()

    return NextResponse.json({ site: newSite[0] }, { status: 201 })
  } catch (error) {
    console.error('Error adding protected site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Delete protected site
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const siteId = url.searchParams.get('id')

    if (!siteId) {
      return NextResponse.json({ error: 'Site ID is required' }, { status: 400 })
    }

    // Get user from database
    const user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Soft delete the site
    await db.update(protectedSites)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(
        eq(protectedSites.id, parseInt(siteId)),
        eq(protectedSites.userId, user[0].id)
      ))

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Error deleting protected site:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 