import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const artworks = await prisma.artwork.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
    return NextResponse.json(artworks);
  } catch (error: any) {
    console.error('Error fetching artworks:', error);
    return NextResponse.json({ error: 'Failed to fetch artworks' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, category, fileUrl, designer } = body;

    if (!name || !category || !fileUrl) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const artwork = await prisma.artwork.create({
      data: {
        name,
        category,
        fileUrl,
        designer: designer || 'Admin',
        version: '1.0',
      },
    });

    return NextResponse.json(artwork);
  } catch (error: any) {
    console.error('Error creating artwork:', error);
    return NextResponse.json({ error: 'Failed to create artwork' }, { status: 500 });
  }
}
