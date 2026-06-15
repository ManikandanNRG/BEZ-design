import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const labels = await prisma.label.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(labels);
  } catch (error: any) {
    console.error('Error fetching labels:', error);
    return NextResponse.json({ error: 'Failed to fetch labels' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, type, fileUrl } = body;

    if (!name || !type || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const label = await prisma.label.create({
      data: {
        name,
        type,
        fileUrl,
        version: '1.0',
        status: 'ACTIVE',
      },
    });

    return NextResponse.json(label);
  } catch (error: any) {
    console.error('Error creating label:', error);
    return NextResponse.json({ error: 'Failed to create label' }, { status: 500 });
  }
}
