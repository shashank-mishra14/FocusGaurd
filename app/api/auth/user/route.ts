import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { db, users, userSettings } from '@/lib/db'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create user in database
    let user = await db.select().from(users).where(eq(users.clerkId, userId)).limit(1)
    
    if (user.length === 0) {
      const clerkUser = await currentUser()
      
      if (!clerkUser) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Create new user
      const newUser = await db.insert(users).values({
        clerkId: userId,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      }).returning()

      // Create default user settings
      await db.insert(userSettings).values({
        userId: newUser[0].id,
      })

      user = newUser
    }

    return NextResponse.json({ user: user[0] }, { status: 200 })
  } catch (error) {
    console.error('Error in user API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { firstName, lastName } = body

    const updatedUser = await db.update(users)
      .set({ 
        firstName, 
        lastName, 
        updatedAt: new Date() 
      })
      .where(eq(users.clerkId, userId))
      .returning()

    return NextResponse.json({ user: updatedUser[0] }, { status: 200 })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 