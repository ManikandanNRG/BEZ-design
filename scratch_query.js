const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tp = await prisma.techPack.findUnique({
    where: { id: "fe89e523-213a-484b-b3e3-9b5a4ee44d41" }
  });
  if (!tp) {
    console.log("No tech pack found with that ID.");
    return;
  }
  const data = JSON.parse(tp.jsonData || "{}");
  console.log("MEASUREMENTS:");
  console.log(JSON.stringify(data.measurements, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
