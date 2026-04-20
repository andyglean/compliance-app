import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSession } from '@/lib/auth';

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const totalComplaints = await prisma.complaint.count();
    const totalProperties = await prisma.property.count();
    const totalReporters = await prisma.reporter.count();

    const urgentItems = await prisma.complianceItem.count({
      where: { status: 'urgent' },
    });
    const monitoringItems = await prisma.complianceItem.count({
      where: { status: 'monitoring' },
    });
    const resolvedItems = await prisma.complianceItem.count({
      where: { status: 'resolved' },
    });
    const inProgressItems = await prisma.complianceItem.count({
      where: { status: 'in_progress' },
    });

    const categoryBreakdown = await prisma.complaint.groupBy({
      by: ['category'],
      _count: true,
    });

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentComplaints = await prisma.complaint.count({
      where: { createdAt: { gte: thirtyDaysAgo } },
    });

    const resolvedWithDates = await prisma.complianceItem.findMany({
      where: {
        status: 'resolved',
        resolvedAt: { not: null },
        escalatedAt: { not: null },
      },
    });

    let avgResolutionDays = 0;
    if (resolvedWithDates.length > 0) {
      const totalDays = resolvedWithDates.reduce((sum, item) => {
        const diff = item.resolvedAt!.getTime() - item.escalatedAt!.getTime();
        return sum + diff / (1000 * 60 * 60 * 24);
      }, 0);
      avgResolutionDays = Math.round(totalDays / resolvedWithDates.length);
    }

    const notificationCount = await prisma.notificationLog.count();

    return NextResponse.json({
      summary: {
        totalComplaints,
        totalProperties,
        totalReporters,
        recentComplaints,
        notificationCount,
      },
      queue: {
        urgent: urgentItems,
        monitoring: monitoringItems,
        inProgress: inProgressItems,
        resolved: resolvedItems,
      },
      categoryBreakdown: categoryBreakdown.map((c) => ({
        category: c.category,
        count: c._count,
      })),
      performance: {
        avgResolutionDays,
        totalResolved: resolvedItems,
      },
    });
  } catch (error) {
    console.error('Reports error:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}
