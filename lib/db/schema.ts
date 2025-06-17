import { pgTable, timestamp, integer, boolean, jsonb, serial, varchar } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkId: varchar('clerk_id', { length: 256 }).notNull().unique(),
  email: varchar('email', { length: 256 }),
  firstName: varchar('first_name', { length: 256 }),
  lastName: varchar('last_name', { length: 256 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const protectedSites = pgTable('protected_sites', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  domain: varchar('domain', { length: 256 }).notNull(),
  password: varchar('password', { length: 256 }),
  timeLimit: integer('time_limit'), // in minutes
  passwordProtected: boolean('password_protected').default(false),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const timeTracking = pgTable('time_tracking', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  domain: varchar('domain', { length: 256 }).notNull(),
  date: varchar('date', { length: 20 }).notNull(), // YYYY-MM-DD format
  timeSpent: integer('time_spent').default(0), // in milliseconds
  visits: integer('visits').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const userSettings = pgTable('user_settings', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  dailyLimit: integer('daily_limit').default(240), // in minutes
  enableNotifications: boolean('enable_notifications').default(true),
  darkMode: boolean('dark_mode').default(false),
  extensionEnabled: boolean('extension_enabled').default(true),
  settings: jsonb('settings'), // for additional settings
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const extensionSessions = pgTable('extension_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sessionToken: varchar('session_token', { length: 256 }).notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export type User = typeof users.$inferSelect
export type ProtectedSite = typeof protectedSites.$inferSelect
export type TimeTracking = typeof timeTracking.$inferSelect
export type UserSettings = typeof userSettings.$inferSelect
export type ExtensionSession = typeof extensionSessions.$inferSelect 