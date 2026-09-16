/**
 * GreenPath Village Manager Mobile — Client-Side KML & Map Export Service
 *
 * 100% Client-Side generation with Zero Server Load:
 * - Generates standard OGC KML 2.2 XML directly on device
 * - Writes .kml file to device cache directory via expo-file-system
 * - Presents native Android / iOS share & save dialog via expo-sharing
 * - Also handles client-side PNG map snapshot saving/sharing
 */
import { Paths, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import type { VillageBoundary, VillageRoad, ManagerCollectionHousehold } from '../types/manager';

export interface ExportKmlParams {
  villageName: string;
  dateStr: string;
  boundaries: VillageBoundary[];
  roads: VillageRoad[];
  households: ManagerCollectionHousehold[];
  showRoads: boolean;
  showHouseholds: boolean;
}

// Helper to escape XML special characters
function escapeXml(unsafe: string) {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case "'":
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}

/**
 * Generate standard KML string client-side from village boundaries, roads, and households
 */
export function generateKML({
  villageName,
  boundaries,
  roads,
  households = [],
  showRoads,
  showHouseholds,
}: ExportKmlParams): string {
  const xmlNodes: string[] = [];

  // Standard KML Header
  xmlNodes.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlNodes.push(`<kml xmlns="http://www.opengis.net/kml/2.2">`);
  xmlNodes.push(`<Document>`);
  xmlNodes.push(`  <name>${escapeXml(villageName)} - Map Export</name>`);
  xmlNodes.push(`  <description>Exported from GreenPath Village Mobile</description>`);

  // --- Styles ---
  xmlNodes.push(`
  <Style id="boundaryStyle">
    <LineStyle><color>ff0000ff</color><width>2</width></LineStyle>
    <PolyStyle><color>400000ff</color></PolyStyle>
  </Style>
  <Style id="roadStyle">
    <LineStyle><color>ff333333</color><width>5</width></LineStyle>
  </Style>
  <Style id="householdCollected">
    <IconStyle>
      <scale>0.8</scale>
      <Icon><href>https://earth.google.com/earth/document/icon?color=388e3c&amp;id=2176&amp;scale=4</href></Icon>
      <hotSpot x="64" y="128" xunits="pixels" yunits="insetPixels"/>
    </IconStyle>
    <LabelStyle>
      <scale>0</scale>
    </LabelStyle>
  </Style>
  <Style id="householdPending">
    <IconStyle>
      <scale>0.8</scale>
      <Icon><href>https://earth.google.com/earth/document/icon?color=d32f2f&amp;id=2176&amp;scale=4</href></Icon>
      <hotSpot x="64" y="128" xunits="pixels" yunits="insetPixels"/>
    </IconStyle>
    <LabelStyle>
      <scale>0</scale>
    </LabelStyle>
  </Style>
  `);

  // --- Bounding Box & LookAt Calculation ---
  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  let hasBounds = false;

  const updateBounds = (lat: number, lng: number) => {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    hasBounds = true;
  };

  // --- Boundaries ---
  if (boundaries && boundaries.length > 0) {
    xmlNodes.push(`  <Folder><name>Boundaries</name>`);
    for (const b of boundaries) {
      if (!b.coordinates || b.coordinates.length === 0) continue;

      xmlNodes.push(`    <Placemark>`);
      xmlNodes.push(`      <name>${escapeXml(b.wardName || b.type)}</name>`);
      xmlNodes.push(`      <styleUrl>#boundaryStyle</styleUrl>`);
      xmlNodes.push(`      <Polygon>`);
      xmlNodes.push(`        <outerBoundaryIs><LinearRing><coordinates>`);

      const coordStrings = b.coordinates.map((coord) => {
        updateBounds(coord[0], coord[1]);
        return `${coord[1]},${coord[0]},0`;
      });
      xmlNodes.push(coordStrings.join(' '));

      xmlNodes.push(`        </coordinates></LinearRing></outerBoundaryIs>`);
      xmlNodes.push(`      </Polygon>`);
      xmlNodes.push(`    </Placemark>`);
    }
    xmlNodes.push(`  </Folder>`);
  }

  // Calculate LookAt using bounds
  if (hasBounds) {
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    const range = Math.max(maxDiff * 111000 * 2, 2000);

    const lookAt = `
  <LookAt>
    <longitude>${centerLng}</longitude>
    <latitude>${centerLat}</latitude>
    <altitude>0</altitude>
    <heading>0</heading>
    <tilt>0</tilt>
    <range>${range}</range>
    <altitudeMode>relativeToGround</altitudeMode>
  </LookAt>`;

    xmlNodes.splice(3, 0, lookAt);
  }

  // --- Roads ---
  if (showRoads && roads && roads.length > 0) {
    xmlNodes.push(`  <Folder><name>Roads</name>`);
    for (const r of roads) {
      if (!r.coordinates || r.coordinates.length === 0) continue;

      xmlNodes.push(`    <Placemark>`);
      xmlNodes.push(`      <name>${escapeXml(r.name)}</name>`);
      xmlNodes.push(`      <styleUrl>#roadStyle</styleUrl>`);
      xmlNodes.push(`      <LineString><coordinates>`);

      const coordStrings = r.coordinates.map((coord) => `${coord[1]},${coord[0]},0`);
      xmlNodes.push(coordStrings.join(' '));

      xmlNodes.push(`      </coordinates></LineString>`);
      xmlNodes.push(`    </Placemark>`);
    }
    xmlNodes.push(`  </Folder>`);
  }

  // --- Households ---
  if (showHouseholds && households && households.length > 0) {
    xmlNodes.push(`  <Folder><name>Households</name>`);
    for (const h of households) {
      if (!h.latitude || !h.longitude) continue;

      const lat = typeof h.latitude === 'string' ? parseFloat(h.latitude) : Number(h.latitude);
      const lng = typeof h.longitude === 'string' ? parseFloat(h.longitude) : Number(h.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      const style = h.collected ? '#householdCollected' : '#householdPending';
      const statusText = h.collected ? `Collected` : 'Pending';

      xmlNodes.push(`    <Placemark>`);
      xmlNodes.push(`      <name>${escapeXml(h.uid || `House ${h.houseNumber}`)}</name>`);
      xmlNodes.push(
        `      <description>Head: ${escapeXml(h.headName)} | Ward: ${escapeXml(h.ward)} | Status: ${statusText}</description>`
      );
      xmlNodes.push(`      <styleUrl>${style}</styleUrl>`);
      xmlNodes.push(`      <Point><coordinates>${lng},${lat},0</coordinates></Point>`);
      xmlNodes.push(`    </Placemark>`);
    }
    xmlNodes.push(`  </Folder>`);
  }

  xmlNodes.push(`</Document>`);
  xmlNodes.push(`</kml>`);

  return xmlNodes.join('\n');
}

/**
 * Exports and shares a KML file completely on device with zero server interaction.
 */
export async function exportAndShareKML(params: ExportKmlParams): Promise<boolean> {
  try {
    const kmlContent = generateKML(params);
    const sanitizedVillage = (params.villageName || 'Village').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `GreenPath_${sanitizedVillage}_Map_${params.dateStr}.kml`;

    const targetFile = new File(Paths.cache, filename);
    if (targetFile.exists) {
      targetFile.delete();
    }
    targetFile.create();
    targetFile.write(kmlContent);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(targetFile.uri, {
        mimeType: 'application/vnd.google-earth.kml+xml',
        dialogTitle: `Export ${filename}`,
        UTI: 'com.google.earth.kml',
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[exportAndShareKML] Error exporting KML:', err);
    return false;
  }
}

/**
 * Saves and shares a base64 PNG map snapshot image completely on device.
 */
export async function exportAndShareMapSnapshot(
  base64Png: string,
  villageName: string,
  dateStr: string
): Promise<boolean> {
  try {
    const sanitizedVillage = (villageName || 'Village').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `GreenPath_${sanitizedVillage}_MapSnapshot_${dateStr}.png`;

    const targetFile = new File(Paths.cache, filename);
    if (targetFile.exists) {
      targetFile.delete();
    }
    targetFile.create();
    const cleanBase64 = base64Png.replace(/^data:image\/\w+;base64,/, '');
    targetFile.write(cleanBase64);

    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(targetFile.uri, {
        mimeType: 'image/png',
        dialogTitle: `Export ${filename}`,
        UTI: 'public.png',
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('[exportAndShareMapSnapshot] Error exporting snapshot:', err);
    return false;
  }
}
