import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const techpack = await prisma.techPack.findUnique({
      where: { id },
      include: { product: true }
    });
    
    if (!techpack) {
      return NextResponse.json({ error: 'TechPack not found' }, { status: 404 });
    }
    
    return NextResponse.json(techpack);
  } catch (error: any) {
    console.error('Error fetching techpack:', error);
    return NextResponse.json({ error: 'Failed to fetch techpack' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { productId, version, pdfUrl, pptxUrl, notes, createdBy, jsonData } = body;

    const techpack = await prisma.techPack.update({
      where: { id },
      data: {
        ...(productId !== undefined && { productId: productId || null }),
        ...(version !== undefined && { version }),
        ...(pdfUrl !== undefined && { pdfUrl }),
        ...(pptxUrl !== undefined && { pptxUrl }),
        ...(notes !== undefined && { notes }),
        ...(createdBy !== undefined && { createdBy }),
        ...(jsonData !== undefined && { jsonData }),
      },
      include: { product: true }
    });

    return NextResponse.json(techpack);
  } catch (error: any) {
    console.error('Error updating techpack:', error);
    return NextResponse.json({ error: 'Failed to update techpack', details: error.message }, { status: 500 });
  }
}
