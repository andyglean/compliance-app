import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const propertyId = searchParams.get('id');

  if (propertyId) {
    try {
      const property = await prisma.property.findUnique({
        where: { id: propertyId },
        include: {
          complaints: {
            include: {
              reporter: { select: { id: true, phone: true, banned: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
          complianceItem: true,
          notifications: { orderBy: { sentAt: 'desc' } },
        },
      });

      if (!property) {
        return NextResponse.json({ error: 'Property not found' }, { status: 404 });
      }

      const complaints = property.complaints.map((c) => ({
        id: c.id,
        reporterPhone: c.reporter.phone,
        reporterBanned: c.reporter.banned,
        category: c.category,
        description: c.description,
        photoUrls: JSON.parse(c.photoUrls),
        aiAnalysis: c.aiAnalysis ? JSON.parse(c.aiAnalysis) : null,
        aiSeverity: c.aiSeverity,
        flagged: c.flagged,
        flagReason: c.flagReason,
        createdAt: c.createdAt,
      }));

      return NextResponse.json({
        property: {
          id: property.id,
          address: property.address,
          ownerName: property.ownerName,
          ownerPhone: property.ownerPhone,
          complaints,
          complianceItem: property.complianceItem,
          notifications: property.notifications,
        },
      });
    } catch (error) {
      console.error('Property fetch error:', error);
      return NextResponse.json({ error: 'Failed to fetch property' }, { status: 500 });
    }
  }

  try {
    const properties = await prisma.property.findMany({
      include: {
        _count: { select: { complaints: true } },
        complianceItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Properties fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
  }
}
