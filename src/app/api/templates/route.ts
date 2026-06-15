import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const templates = await prisma.garmentTemplate.findMany({
      include: {
        measurements: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return NextResponse.json(templates);
  } catch (error: any) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, fabricType, gsm, fitType, defaultPackaging, defaultLabels, measurements } = body;

    if (!name || !category || !fabricType || !gsm || !fitType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const template = await prisma.garmentTemplate.create({
      data: {
        name,
        category,
        fabricType,
        gsm: parseInt(gsm),
        fitType,
        defaultPackaging,
        defaultLabels,
        status: 'ACTIVE',
        measurements: {
          create: measurements || [],
        },
      },
      include: {
        measurements: true,
      },
    });

    return NextResponse.json(template);
  } catch (error: any) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
