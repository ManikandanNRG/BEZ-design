const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: "ccdc50cf-0ec1-4d0a-b75d-284624e0e9c7" }
  });
  if (!tp) {
    console.log("No tech pack found with that ID.");
    return;
  }
  const data = JSON.parse(tp.jsonData || "{}");
  console.log("MEASUREMENTS (all sizes):");
  for (const m of data.measurements || []) {
    console.log(`- ${m.description}: XS=${m.xs || ''}, S=${m.s || ''}, M=${m.m || ''}, L=${m.l || ''}, XL=${m.xl || ''}, XXL=${m.xxl || ''}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
