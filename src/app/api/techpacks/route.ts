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
    const { productId, version, pdfUrl, pptxUrl, notes, createdBy, jsonData } = body;

    const techpack = await prisma.techPack.create({
      data: {
        productId: productId || null,
        version: version || '1.0',
        pdfUrl: pdfUrl || '',
        pptxUrl: pptxUrl || '',
        notes: notes || 'Initial Version',
        createdBy: createdBy || 'Admin',
        jsonData: jsonData || null,
      },
      include: {
        product: true,
      },
    });

    return NextResponse.json(techpack);
  } catch (error: any) {
    console.error('Error creating techpack record:', error);
    return NextResponse.json({ error: 'Failed to save techpack record', details: error.message }, { status: 500 });
  }
}
