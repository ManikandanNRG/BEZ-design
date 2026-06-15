const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding garment templates and measurement library...');

  // Clean existing data
  await prisma.measurementLibrary.deleteMany({});
  await prisma.garmentTemplate.deleteMany({});
  await prisma.user.deleteMany({});

  // Seed default admin user
  const admin = await prisma.user.create({
    data: {
      email: 'admin@buddyengineerz.com',
      name: 'Admin User',
      role: 'ADMIN',
    },
  });
  console.log(`Seeded User: ${admin.email}`);

  // 1. Regular Fit T-Shirt Template
  const regularTee = await prisma.garmentTemplate.create({
    data: {
      name: 'Regular Fit T-Shirt',
      category: 'T-Shirt',
      fabricType: '100% Cotton Single Jersey',
      gsm: 180,
      fitType: 'Regular Fit',
      defaultPackaging: 'Single piece in a polybag, 50 pieces per carton.',
      defaultLabels: 'Main Neck Label (Woven), Wash Care Label (Satin left side seam), Size Loop Label.',
      status: 'ACTIVE',
    },
  });

  // Size measurements (in inches) for Regular Tee
  // Sizes: S, M, L, XL, XXL
  const regularMeasurements = [
    { size: 'S', neckWidth: 6.5, chestWidth: 19.0, bodyLength: 27.0, shoulderWidth: 17.5, sleeveLength: 7.5, sleeveOpening: 6.5, bottomWidth: 19.0, tolerance: 0.5 },
    { size: 'M', neckWidth: 6.75, chestWidth: 20.5, bodyLength: 28.0, shoulderWidth: 18.25, sleeveLength: 8.0, sleeveOpening: 7.0, bottomWidth: 20.5, tolerance: 0.5 },
    { size: 'L', neckWidth: 7.0, chestWidth: 22.0, bodyLength: 29.0, shoulderWidth: 19.0, sleeveLength: 8.5, sleeveOpening: 7.5, bottomWidth: 22.0, tolerance: 0.5 },
    { size: 'XL', neckWidth: 7.25, chestWidth: 24.0, bodyLength: 30.0, shoulderWidth: 20.0, sleeveLength: 9.0, sleeveOpening: 8.0, bottomWidth: 24.0, tolerance: 0.5 },
    { size: 'XXL', neckWidth: 7.5, chestWidth: 26.0, bodyLength: 31.0, shoulderWidth: 21.0, sleeveLength: 9.5, sleeveOpening: 8.5, bottomWidth: 26.0, tolerance: 0.5 },
  ];

  for (const sizeData of regularMeasurements) {
    await prisma.measurementLibrary.create({
      data: {
        templateId: regularTee.id,
        ...sizeData,
      },
    });
  }
  console.log('Seeded Regular Fit T-Shirt measurements.');

  // 2. Oversized Heavyweight T-Shirt Template
  const oversizedTee = await prisma.garmentTemplate.create({
    data: {
      name: 'Oversized Heavyweight T-Shirt',
      category: 'T-Shirt',
      fabricType: '100% Cotton Heavy Jersey',
      gsm: 240,
      fitType: 'Oversized',
      defaultPackaging: 'Single piece in a premium polybag, 40 pieces per carton.',
      defaultLabels: 'Main Neck Label (Woven), Wash Care Label (Satin), Size Loop Label.',
      status: 'ACTIVE',
    },
  });

  const oversizedMeasurements = [
    { size: 'S', neckWidth: 7.0, chestWidth: 22.0, bodyLength: 28.0, shoulderWidth: 20.0, sleeveLength: 8.5, sleeveOpening: 7.5, bottomWidth: 22.0, tolerance: 0.5 },
    { size: 'M', neckWidth: 7.25, chestWidth: 24.0, bodyLength: 29.0, shoulderWidth: 21.0, sleeveLength: 9.0, sleeveOpening: 8.0, bottomWidth: 24.0, tolerance: 0.5 },
    { size: 'L', neckWidth: 7.5, chestWidth: 26.0, bodyLength: 30.0, shoulderWidth: 22.0, sleeveLength: 9.5, sleeveOpening: 8.5, bottomWidth: 26.0, tolerance: 0.5 },
    { size: 'XL', neckWidth: 7.75, chestWidth: 28.0, bodyLength: 31.0, shoulderWidth: 23.0, sleeveLength: 10.0, sleeveOpening: 9.0, bottomWidth: 28.0, tolerance: 0.5 },
    { size: 'XXL', neckWidth: 8.0, chestWidth: 30.0, bodyLength: 32.0, shoulderWidth: 24.0, sleeveLength: 10.5, sleeveOpening: 9.5, bottomWidth: 30.0, tolerance: 0.5 },
  ];

  for (const sizeData of oversizedMeasurements) {
    await prisma.measurementLibrary.create({
      data: {
        templateId: oversizedTee.id,
        ...sizeData,
      },
    });
  }
  console.log('Seeded Oversized Heavyweight T-Shirt measurements.');

  // 3. Hoodie Template
  const hoodie = await prisma.garmentTemplate.create({
    data: {
      name: 'Heavyweight Loopback Hoodie',
      category: 'Hoodie',
      fabricType: '100% Cotton French Terry / Loopback',
      gsm: 380,
      fitType: 'Boxy / Oversized',
      defaultPackaging: 'Single piece in a custom zip-lock polybag, 20 pieces per carton.',
      defaultLabels: 'Main Woven Label (Inner Neck), Wash Care Label (Inner left side seam), Size Tag.',
      status: 'ACTIVE',
    },
  });

  const hoodieMeasurements = [
    { size: 'S', neckWidth: 9.0, chestWidth: 23.0, bodyLength: 26.5, shoulderWidth: 21.5, sleeveLength: 22.5, sleeveOpening: 3.75, bottomWidth: 19.5, tolerance: 0.5 },
    { size: 'M', neckWidth: 9.25, chestWidth: 24.5, bodyLength: 27.5, shoulderWidth: 22.5, sleeveLength: 23.0, sleeveOpening: 4.0, bottomWidth: 21.0, tolerance: 0.5 },
    { size: 'L', neckWidth: 9.5, chestWidth: 26.0, bodyLength: 28.5, shoulderWidth: 23.5, sleeveLength: 23.5, sleeveOpening: 4.25, bottomWidth: 22.5, tolerance: 0.5 },
    { size: 'XL', neckWidth: 9.75, chestWidth: 27.5, bodyLength: 29.5, shoulderWidth: 24.5, sleeveLength: 24.0, sleeveOpening: 4.5, bottomWidth: 24.0, tolerance: 0.5 },
    { size: 'XXL', neckWidth: 10.0, chestWidth: 29.0, bodyLength: 30.5, shoulderWidth: 25.5, sleeveLength: 24.5, sleeveOpening: 4.75, bottomWidth: 25.5, tolerance: 0.5 },
  ];

  for (const sizeData of hoodieMeasurements) {
    await prisma.measurementLibrary.create({
      data: {
        templateId: hoodie.id,
        ...sizeData,
      },
    });
  }
  console.log('Seeded Heavyweight Loopback Hoodie measurements.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
