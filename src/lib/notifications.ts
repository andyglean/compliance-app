import { prisma } from './prisma';
import { sendSMS } from './twilio';
import { lookupPropertyOwner } from './snap-hoa';

const PM_PHONE = process.env.PROPERTY_MANAGER_PHONE || '';
const COMPLIANCE_PHONE = process.env.COMPLIANCE_DIRECTOR_PHONE || '';

const categoryLabels: Record<string, string> = {
  overgrown_yard: 'Overgrown Yard',
  junk_trash: 'Junk / Bulk Trash',
  unauthorized_vehicle: 'Unauthorized Vehicle',
};

export async function notifyManagement(
  address: string,
  category: string,
  complaintNumber: number,
  propertyId: string
) {
  const label = categoryLabels[category] || category;
  const message = `[Travis Ranch Compliance] New report: ${label} at ${address}. This is complaint #${complaintNumber} against this property.`;

  const recipients = [
    { phone: PM_PHONE, role: 'property_manager' },
    { phone: COMPLIANCE_PHONE, role: 'compliance_director' },
  ];

  for (const recipient of recipients) {
    if (recipient.phone) {
      await sendSMS(recipient.phone, message);
      await prisma.notificationLog.create({
        data: {
          recipientPhone: recipient.phone,
          recipientRole: recipient.role,
          type: 'new_complaint',
          message,
          propertyId,
        },
      });
    }
  }
}

export async function notifyPropertyOwner(
  address: string,
  category: string,
  propertyId: string
) {
  const owner = await lookupPropertyOwner(address);
  if (!owner?.phone) {
    console.log(`No phone number available for property owner at ${address}`);
    return;
  }

  const message = `[Travis Ranch HOA] A neighbor has reported a possible compliance concern (${categoryLabels[category] || category}) at ${address}. This is a courtesy notice — not an official violation. Please review your property. If you've already addressed this, no further action is needed.`;

  await sendSMS(owner.phone, message);
  await prisma.notificationLog.create({
    data: {
      recipientPhone: owner.phone,
      recipientRole: 'property_owner',
      type: 'courtesy_notice',
      message,
      propertyId,
    },
  });
}

export async function notifyEscalation(address: string, propertyId: string) {
  const message = `[Travis Ranch Compliance - URGENT] ${address} has reached 3+ reports from separate residents and has been added to the priority compliance queue. Please review.`;

  const recipients = [
    { phone: PM_PHONE, role: 'property_manager' },
    { phone: COMPLIANCE_PHONE, role: 'compliance_director' },
  ];

  for (const recipient of recipients) {
    if (recipient.phone) {
      await sendSMS(recipient.phone, message);
      await prisma.notificationLog.create({
        data: {
          recipientPhone: recipient.phone,
          recipientRole: recipient.role,
          type: 'escalation',
          message,
          propertyId,
        },
      });
    }
  }
}
