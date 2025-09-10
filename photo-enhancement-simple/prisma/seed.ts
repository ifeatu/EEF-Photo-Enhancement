import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@photoenhance.com'

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail }
  })

  if (!existingAdmin) {
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        role: 'ADMIN',
        credits: 1000, // Give admin plenty of credits
        emailVerified: new Date(),
      }
    })
    console.log(`✅ Created admin user: ${adminUser.email}`)
  } else {
    // Update existing user to admin if not already
    if (existingAdmin.role !== 'ADMIN') {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { role: 'ADMIN' }
      })
      console.log(`✅ Updated ${existingAdmin.email} to admin role`)
    } else {
      console.log(`ℹ️  Admin user already exists: ${existingAdmin.email}`)
    }
  }

  // Create some sample data for testing
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
      role: 'USER',
      credits: 5,
      emailVerified: new Date(),
    }
  })
  console.log(`✅ Created/updated test user: ${testUser.email}`)

  console.log('🎉 Seeding completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })