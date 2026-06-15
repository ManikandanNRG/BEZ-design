import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const techpacks = await prisma.techPack.findMany({
      include: {
        product: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(techpacks);
  } catch (error: any) {
    console.error('Error fetching techpacks:', error);
    return NextResponse.json({ error: 'Failed to fetch techpacks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, version, pdfUrl, pptxUrl, notes, createdBy } = body;

    if (!productId || !version) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const techpack = await prisma.techPack.create({
      data: {
        productId,
        version,
        pdfUrl: pdfUrl || '',
        pptxUrl: pptxUrl || '',
        notes: notes || 'Initial Version',
        createdBy: createdBy || 'Admin',
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(techpack);
  } catch (error: any) {
    console.error('Error creating techpack record:', error);
    return NextResponse.json({ error: 'Failed to save techpack record' }, { status: 500 });
  }
}
