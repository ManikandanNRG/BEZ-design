// Pantone color matching utility for BETPG

export interface PantoneMatch {
  name: string;
  hex: string;
  distance: number;
}

// Popular Pantone Solid Coated colors for garment production
export const PANTONE_STREETWEAR_PALETTE = [
  { name: 'Pantone Black 6 C', hex: '#111111' },
  { name: 'Pantone Cool Gray 1 C', hex: '#D9D9D6' },
  { name: 'Pantone Cool Gray 8 C', hex: '#888B8D' },
  { name: 'Pantone Cool Gray 11 C', hex: '#53565A' },
  { name: 'Pantone Warm Red C', hex: '#F9423A' },
  { name: 'Pantone 186 C', hex: '#C8102E' }, // Classic red
  { name: 'Pantone 293 C', hex: '#003DA5' }, // Classic royal blue
  { name: 'Pantone 282 C', hex: '#041E42' }, // Navy blue
  { name: 'Pantone 348 C', hex: '#00843D' }, // Green
  { name: 'Pantone 356 C', hex: '#007A33' }, // Forest green
  { name: 'Pantone 116 C', hex: '#FFCD00' }, // Yellow
  { name: 'Pantone 137 C', hex: '#FFA300' }, // Orange
  { name: 'Pantone 266 C', hex: '#7A1FA2' }, // Purple
  { name: 'Pantone 504 C', hex: '#512D3A' }, // Burgundy/Maroon
  { name: 'Pantone 7506 C', hex: '#F0E6D2' }, // Cream/Sand
  { name: 'Pantone 465 C', hex: '#B9975B' }, // Gold/Beige
  { name: 'Pantone 7421 C', hex: '#6C1D2F' }, // Maroon
  { name: 'Pantone White C', hex: '#FFFFFF' },
];

// Calculate Euclidean distance between two RGB colors
function getDistance(hex1: string, hex2: string): number {
  const r1 = parseInt(hex1.substring(1, 3), 16);
  const g1 = parseInt(hex1.substring(3, 5), 16);
  const b1 = parseInt(hex1.substring(5, 7), 16);

  const r2 = parseInt(hex2.substring(1, 3), 16);
  const g2 = parseInt(hex2.substring(3, 5), 16);
  const b2 = parseInt(hex2.substring(5, 7), 16);

  return Math.sqrt(
    Math.pow(r1 - r2, 2) +
    Math.pow(g1 - g2, 2) +
    Math.pow(b1 - b2, 2)
  );
}

// Find nearest Pantone color in the streetwear palette
export function findNearestPantone(hexColor: string): PantoneMatch {
  let nearest = PANTONE_STREETWEAR_PALETTE[0];
  let minDistance = Infinity;

  // Normalize hex input
  let hex = hexColor.trim();
  if (!hex.startsWith('#')) {
    hex = '#' + hex;
  }
  if (hex.length === 4) {
    hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }

  for (const item of PANTONE_STREETWEAR_PALETTE) {
    const d = getDistance(hex, item.hex);
    if (d < minDistance) {
      minDistance = d;
      nearest = item;
    }
  }

  return {
    name: nearest.name,
    hex: nearest.hex,
    distance: minDistance,
  };
}

// Extracts dominant colors from an image using HTML5 Canvas
export function extractDominantColorsFromImage(
  imgElement: HTMLImageElement,
  maxCount = 4
): Promise<PantoneMatch[]> {
  return new Promise((resolve) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve([]);

      // Scale down image to speed up processing
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(imgElement, 0, 0, 50, 50);

      const imgData = ctx.getImageData(0, 0, 50, 50).data;
      const colorCounts: Record<string, number> = {};

      for (let i = 0; i < imgData.length; i += 4) {
        const r = imgData[i];
        const g = imgData[i+1];
        const b = imgData[i+2];
        const a = imgData[i+3];

        // Skip transparent or near-transparent pixels
        if (a < 50) continue;

        // Skip absolute black/white background colors to extract the actual logo/design colors
        // unless it's the only color
        if ((r > 245 && g > 245 && b > 245) || (r < 10 && g < 10 && b < 10)) {
          continue;
        }

        // Quantize colors slightly to group similar colors
        const qr = Math.round(r / 10) * 10;
        const qg = Math.round(g / 10) * 10;
        const qb = Math.round(b / 10) * 10;

        const hex = '#' + 
          qr.toString(16).padStart(2, '0') + 
          qg.toString(16).padStart(2, '0') + 
          qb.toString(16).padStart(2, '0');

        colorCounts[hex] = (colorCounts[hex] || 0) + 1;
      }

      // Sort by count descending
      const sortedHexes = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
      
      const results: PantoneMatch[] = sortedHexes
        .slice(0, maxCount)
        .map(hex => findNearestPantone(hex));

      // If no color extracted (e.g. all black/white or transparent), fallback to default black & white
      if (results.length === 0) {
        results.push(findNearestPantone('#000000'));
      }

      resolve(results);
    } catch (e) {
      console.error('Error extracting colors:', e);
      resolve([findNearestPantone('#000000')]);
    }
  });
}
