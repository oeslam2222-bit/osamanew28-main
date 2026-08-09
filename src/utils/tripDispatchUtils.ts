import { Region } from '../types';

export const getEligibleDrivers = (
  drivers: any[],
  now: number,
  staleThreshold = 60000,
  selectedRegion?: Region | null
) => {
  return drivers.filter(d => {
    if (d.approvalStatus !== 'APPROVED' || !d.isOnline || d.status === 'BUSY') return false;
    if (d.lastSeen) {
      const lastSeenMs = new Date(d.lastSeen).getTime();
      if (now - lastSeenMs > staleThreshold) return false;
    }
    if (selectedRegion && selectedRegion.id && d.serviceAreas?.length > 0) {
      const regionMatch = d.serviceAreas.some((area: string) => {
        const areaLower = area.toLowerCase();
        const regionNameLower = (selectedRegion.nameAr || selectedRegion.nameEn || '').toLowerCase();
        const regionId = String(selectedRegion.id).toLowerCase();
        return (
          areaLower.includes(regionNameLower) ||
          areaLower.includes(regionId) ||
          areaLower === 'all regions' ||
          areaLower === 'جميع المناطق' ||
          areaLower.includes('beni suef') ||
          areaLower.includes('بني سويف')
        );
      });
      if (!regionMatch) return false;
    }
    return true;
  });
};

export const filterDriversByRegion = (drivers: any[], region: Region | null) => {
  if (!region || !region.id || drivers.length === 0) return drivers;
  return drivers.filter(d => {
    if (!d.serviceAreas || d.serviceAreas.length === 0) return true;
    return d.serviceAreas.some((area: string) => {
      const areaLower = area.toLowerCase();
      const regionNameLower = (region.nameAr || region.nameEn || '').toLowerCase();
      const regionId = String(region.id).toLowerCase();
      return (
        areaLower.includes(regionNameLower) ||
        areaLower.includes(regionId) ||
        areaLower === 'all regions' ||
        areaLower === 'جميع المناطق' ||
        areaLower.includes('beni suef') ||
        areaLower.includes('بني سويف')
      );
    });
  });
};

export const mergeChatMessages = (localMessages: any[], remoteMessages: any[]) => {
  const localMsgIds = new Set(localMessages.map(m => m.id));
  const merged = [...localMessages];
  for (const m of remoteMessages) {
    if (!localMsgIds.has(m.id)) {
      merged.push(m);
    }
  }
  return merged.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
};

export const getCoordsFromXY = (x: number, y: number) => {
  const latBase = 29.6197;
  const lngBase = 31.2561;
  const lat = latBase + (y - 50) * 0.0025;
  const lng = lngBase + (x - 50) * 0.0025;
  return { lat, lng };
};
