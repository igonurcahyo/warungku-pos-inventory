import postgres from 'postgres'
import { verify } from '@node-rs/argon2'

const sql = postgres('postgres://warungku:warungku_dev@localhost:5432/warungku')

const email = 'igonur322@gmail.com'
const password = 'Igo123'

const [user] = await sql`
  SELECT password_hash
  FROM users
  WHERE email = ${email}
`

if (!user) {
    console.log('EMAIL TIDAK DITEMUKAN')
} else {
    const valid = await verify(user.password_hash, password)
    console.log(valid ? 'PASSWORD COCOK' : 'PASSWORD TIDAK COCOK')
}

await sql.end()