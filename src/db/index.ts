import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'

const databaseUrl = process.env.DATABASE_URL

console.log(
    '[DB] DATABASE_URL:',
    databaseUrl
        ? `${databaseUrl.split('@')[0]}@${databaseUrl.split('@')[1]?.split('/')[0]}`
        : 'MISSING',
)

const client = postgres(databaseUrl!)

export const db = drizzle(client)