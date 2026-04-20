/**
 * Snap HOA API Integration (Placeholder)
 * 
 * This module will connect to Action Management's Snap HOA software
 * to look up property owner contact information.
 * 
 * TODO: Replace mock functions with actual API calls once
 * API credentials and documentation are available.
 */

interface PropertyOwner {
  name: string;
  phone: string;
  email?: string;
  propertyAddress: string;
  accountId: string;
}

const PLACEHOLDER_ENABLED = true;

export async function lookupPropertyOwner(address: string): Promise<PropertyOwner | null> {
  if (PLACEHOLDER_ENABLED) {
    console.log(`[SNAP HOA PLACEHOLDER] Looking up owner for: ${address}`);
    return {
      name: 'Property Owner',
      phone: '',
      email: '',
      propertyAddress: address,
      accountId: 'SNAP-PLACEHOLDER',
    };
  }

  try {
    const response = await fetch(`${process.env.SNAP_HOA_API_URL}/properties/lookup`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SNAP_HOA_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Snap HOA API error:', error);
    return null;
  }
}

export async function getPropertyDetails(snapHoaId: string): Promise<PropertyOwner | null> {
  if (PLACEHOLDER_ENABLED) {
    return null;
  }

  try {
    const response = await fetch(`${process.env.SNAP_HOA_API_URL}/properties/${snapHoaId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SNAP_HOA_API_KEY}`,
      },
    });

    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('Snap HOA API error:', error);
    return null;
  }
}

export { PLACEHOLDER_ENABLED as isSnapHoaPlaceholder };
