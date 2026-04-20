import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || undefined;
  const sortBy = searchParams.get('sortBy') || 'priorityScore';

  try {
    const items = await prisma.complianceItem.findMany({
      where: status ? { status } : undefined,
      include: {
        property: {
          include: {
            complaints: {
              include: { reporter: { select: { id: true, phone: true } } },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: sortBy === 'priorityScore'
        ? { priorityScore: 'desc' }
        : sortBy === 'complaintCount'
          ? { complaintCount: 'desc' }
          : { createdAt: 'desc' },
    });

    const queue = items.map((item) => {
      const complaints = item.property.complaints;
      const firstPhotoUrl = complaints.length > 0
        ? JSON.parse(complaints[0].photoUrls)[0]
        : null;

      const oldestComplaint = complaints.length > 0
        ? complaints.reduce((oldest, c) => c.createdAt < oldest.createdAt ? c : oldest)
        : null;

      const daysActive = oldestComplaint
        ? Math.ceil((Date.now() - oldestComplaint.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: item.id,
        propertyId: item.property.id,
        address: item.property.address,
        status: item.status,
        complaintCount: item.complaintCount,
        priorityScore: item.priorityScore,
        categories: item.categories.split(',').filter(Boolean),
        daysActive,
        thumbnailUrl: firstPhotoUrl,
        escalatedAt: item.escalatedAt,
        resolvedAt: item.resolvedAt,
        totalComplaints: complaints.length,
      };
    });

    return NextResponse.json({ queue });
  } catch (error) {
    console.error('Queue fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch queue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { itemId, status } = await request.json();

    const validStatuses = ['monitoring', 'urgent', 'in_progress', 'resolved', 'dismissed'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const item = await prisma.complianceItem.update({
      where: { id: itemId },
      data: {
        status,
        ...(status === 'resolved' ? { resolvedAt: new Date() } : {}),
      },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    console.error('Queue update error:', error);
    return NextResponse.json(
      { error: 'Failed to update queue item' },
      { status: 500 }
    );
  }
}
