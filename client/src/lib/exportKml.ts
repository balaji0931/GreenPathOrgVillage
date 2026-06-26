// client/src/lib/exportKml.ts

import { Boundary, Road } from '@/components/manager/MapVisualization';

export interface ExportHousehold {
  uid: string;
  headName: string;
  latitude: string | null;
  longitude: string | null;
  collected?: boolean;
  collectionTime?: string | null;
}

// Helper to escape XML special characters
const escapeXml = (unsafe: string) => {
  return (unsafe || '').replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
};

interface ExportKmlParams {
  villageName: string;
  boundaries: Boundary[];
  roads: Road[];
  households?: ExportHousehold[];
  showRoads: boolean;
  showHouseholds: boolean;
}

export function generateKML({
  villageName,
  boundaries,
  roads,
  households = [],
  showRoads,
  showHouseholds,
}: ExportKmlParams): string {
  // We use an array buffer approach for fast string concatenation
  // This prevents the UI from freezing when dealing with thousands of nodes
  const xmlNodes: string[] = [];

  // Standard KML Header
  xmlNodes.push(`<?xml version="1.0" encoding="UTF-8"?>`);
  xmlNodes.push(`<kml xmlns="http://www.opengis.net/kml/2.2">`);
  xmlNodes.push(`<Document>`);
  xmlNodes.push(`  <name>${escapeXml(villageName)} - Map Export</name>`);
  xmlNodes.push(`  <description>Exported from GreenPath</description>`);

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
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
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
      
      // Leaflet stores [lat, lng], KML needs "lng,lat,0"
      const coordStrings = b.coordinates.map(coord => {
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
    // Rough estimation: 1 degree diff ~ 111km. We want altitude in meters.
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    // Base altitude calculation so the whole village fits in view
    const range = Math.max(maxDiff * 111000 * 2, 2000); // minimum 2km range

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
    
    // Insert LookAt right after Document tag
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
      
      const coordStrings = r.coordinates.map(coord => `${coord[1]},${coord[0]},0`);
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
      
      const lat = parseFloat(h.latitude);
      const lng = parseFloat(h.longitude);
      if (isNaN(lat) || isNaN(lng)) continue;

      const style = h.collected ? '#householdCollected' : '#householdPending';
      const statusText = h.collected ? `Collected at ${h.collectionTime}` : 'Pending';

      xmlNodes.push(`    <Placemark>`);
      xmlNodes.push(`      <name>${escapeXml(h.uid)}</name>`);
      xmlNodes.push(`      <description>Head: ${escapeXml(h.headName)} | Status: ${statusText}</description>`);
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

export function downloadKmlFile(kmlContent: string, filename: string) {
  const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  
  document.body.appendChild(a);
  a.click();
  
  // Cleanup
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}
