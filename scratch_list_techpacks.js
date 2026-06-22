const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tps = await prisma.techPack.findMany({
    include: { product: true }
  });
  console.log("Found", tps.length, "tech packs.");
  for (const tp of tps) {
    console.log("-----------------------------------------");
    console.log("ID:", tp.id);
    console.log("Name:", tp.product ? tp.product.styleName : "No product");
    console.log("Version:", tp.version);
    const data = JSON.parse(tp.jsonData || "{}");
    console.log("Keys in jsonData:", Object.keys(data));
    console.log("Measurements count:", data.measurements?.length || 0);
    if (data.measurements && data.measurements.length > 0) {
      console.log("Sample measurements:", data.measurements.slice(0, 3));
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
