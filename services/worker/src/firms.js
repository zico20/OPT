function slugifyDistrictName(name) {
  return String(name || "")
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearestDistrict(lat, lon, districts) {
  let best = null;
  let bestKm = Infinity;
  for (const d of districts) {
    const km = haversineKm(lat, lon, d.lat, d.lon);
    if (km < bestKm) {
      bestKm = km;
      best = d;
    }
  }
  return best;
}

function parseCsv(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    return [];
  }
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      const values = line.split(",");
      const row = {};
      for (let i = 0; i < headers.length; i++) {
        row[headers[i]] = (values[i] || "").trim();
      }
      return row;
    });
}

export async function fetchFirmsHotspots({ config, runDate, districts }) {
  const { firmsMapKey, firmsBbox, firmsDays, firmsSatellite } = config;

  if (!firmsMapKey) {
    throw new Error("FIRMS_MAP_KEY is not set.");
  }

  const url =
    `https://firms.modaps.eosdis.nasa.gov/api/area/csv` +
    `/${firmsMapKey}/${firmsSatellite}/${firmsBbox}/${firmsDays}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });

  if (!response.ok) {
    throw new Error(`FIRMS API responded with ${response.status}: ${response.statusText}`);
  }

  const text = await response.text();

  if (!text.trim() || text.trim().toLowerCase().startsWith("errors")) {
    return [];
  }

  const rows = parseCsv(text);

  return rows
    .filter((row) => row.latitude && row.longitude)
    .map((row, index) => {
      const lat = parseFloat(row.latitude);
      const lon = parseFloat(row.longitude);
      const district = nearestDistrict(lat, lon, districts);

      const acqDate = row.acq_date || runDate;
      const acqTime = (row.acq_time || "0000").padStart(4, "0");
      const detectedAt = `${acqDate}T${acqTime.slice(0, 2)}:${acqTime.slice(2, 4)}:00`;

      const districtName = district?.district_name || "Unknown";
      const districtId = district
        ? (district.district_id || slugifyDistrictName(districtName))
        : "unknown";

      return {
        fire_id: `firms_${runDate.replaceAll("-", "")}_${String(index + 1).padStart(3, "0")}`,
        district_id: districtId,
        district_name: districtName,
        lat,
        lon,
        source: `FIRMS_${firmsSatellite}`,
        confidence: row.confidence || "nominal",
        detected_at: detectedAt
      };
    });
}
