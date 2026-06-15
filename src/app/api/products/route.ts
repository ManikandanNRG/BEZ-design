import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        template: {
          include: {
            measurements: true,
          },
        },
        artwork: true,
        printSpecs: true,
        mockups: true,
        techPacks: true,
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id, // If provided, update
      styleNo,
      styleName,
      color,
      templateId,
      artworkId,
      printType,
      status,
      season,
      printSpecs,
      mockups,
    } = body;

    if (!styleNo || !styleName || !color || !templateId || !printType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (id) {
      // Update product
      // Delete existing print specs & mockups to overwrite, or update them. Overwriting is simpler for this flow.
      await prisma.$transaction([
        prisma.printSpec.deleteMany({ where: { productId: id } }),
        prisma.mockup.deleteMany({ where: { productId: id } }),
      ]);

      const product = await prisma.product.update({
        where: { id },
        data: {
          styleNo,
          styleName,
          color,
          templateId,
          artworkId: artworkId || null,
          printType,
          status: status || 'DRAFT',
          season,
          printSpecs: {
            create: printSpecs || [],
          },
          mockups: {
            create: mockups || [],
          },
        },
        include: {
          template: {
            include: {
              measurements: true,
            },
          },
          artwork: true,
          printSpecs: true,
          mockups: true,
          techPacks: true,
        },
      });

      return NextResponse.json(product);
    } else {
      // Create product
      const product = await prisma.product.create({
        data: {
          styleNo,
          styleName,
          color,
          templateId,
          artworkId: artworkId || null,
          printType,
          status: status || 'DRAFT',
          season,
          printSpecs: {
            create: printSpecs || [],
          },
          mockups: {
            create: mockups || [],
          },
        },
        include: {
          template: {
            include: {
              measurements: true,
            },
          },
          artwork: true,
          printSpecs: true,
          mockups: true,
          techPacks: true,
        },
      });

      return NextResponse.json(product);
    }
  } catch (error: any) {
    console.error('Error saving product:', error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Style Number already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to save product' }, { status: 500 });
  }
}
