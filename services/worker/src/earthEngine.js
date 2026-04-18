import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { getConfig } from "./config.js";
import { readCollection } from "./dataStore.js";

const require = createRequire(import.meta.url);
const ee = require("@google/earthengine");

let eeInitPromise = null;
const REQUIRED_ASSET_KINDS = ["risk_prob", "risk_class", "risk_binary"];
const FEATURE_BANDS = [
  "LST",
  "NDVI",
  "NDMI",
  "AIR_TEMP",
  "RH",
  "WIND_SPEED",
  "PRECIP_MM",
  "NIGHTLIGHTS",
  "ELEV",
  "SLOPE",
  "ASPECT_SIN",
  "ASPECT_COS",
  "LC_FOREST",
  "LC_SHRUB",
  "LC_CROP",
  "LC_URBAN",
  "DIST_SETTLEMENT",
  "DIST_ROAD",
  "DIST_FIRE_CORRIDOR"
];
const OUTPUT_SOURCE = Object.freeze({
  CLASSIFIER_ASSET: "classifier_asset",
  DYNAMIC_TRAINING: "dynamic_training",
  HEURISTIC_FALLBACK: "heuristic_fallback"
});

function toIsoWithOffset(dateString) {
  return `${dateString}T08:12:54+03:00`;
}

function dateToTag(dateString) {
  return String(dateString || "").replaceAll("-", "");
}

function tagToDate(tag) {
  return `${tag.slice(0, 4)}-${tag.slice(4, 6)}-${tag.slice(6, 8)}`;
}

function daysBetween(fromDateString, toDateString) {
  const oneDayMs = 24 * 60 * 60 * 1000;
  const fromDate = new Date(`${fromDateString}T00:00:00Z`);
  const toDate = new Date(`${toDateString}T00:00:00Z`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / oneDayMs);
}

function escapeRegex(value) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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

function getTodayString() {
  return new Date().toISOString().slice(0, 10);
}

function getFeatureWindowDays(config) {
  if (config.eeWindowMode === "daily") {
    return 1;
  }
  if (config.eeWindowMode === "custom") {
    return Math.max(1, Number(config.eeCustomWindowDays || 30));
  }
  return Math.max(1, Number(config.eeFeatureWindowDays || 7));
}

function buildDownloadUrls(runDate, config) {
  if (!config.eeDownloadBaseUrl) {
    return {
      risk_prob: "#",
      risk_class: "#",
      risk_binary: "#",
      run_report: "#"
    };
  }

  const base = config.eeDownloadBaseUrl.replace(/\/+$/, "");
  return {
    risk_prob: `${base}/${config.eeAssetNamePrefix}_risk_prob_${runDate}.tif`,
    risk_class: `${base}/${config.eeAssetNamePrefix}_risk_class_${runDate}.tif`,
    risk_binary: `${base}/${config.eeAssetNamePrefix}_risk_binary_${runDate}.tif`,
    run_report: `${base}/${config.eeAssetNamePrefix}_run_report_${runDate}.csv`
  };
}

function evaluateObject(computedObject) {
  return new Promise((resolve, reject) => {
    computedObject.evaluate((success, failure) => {
      if (failure) {
        reject(new Error(typeof failure === "string" ? failure : JSON.stringify(failure)));
        return;
      }
      resolve(success);
    });
  });
}

async function initializeEarthEngine(config) {
  if (eeInitPromise) {
    return eeInitPromise;
  }

  if (!config.eeServiceAccountKeyPath) {
    throw new Error("EE_SERVICE_ACCOUNT_KEY_PATH is not set.");
  }

  eeInitPromise = (async () => {
    const privateKey = JSON.parse(
      await fs.readFile(config.eeServiceAccountKeyPath, "utf8")
    );

    await new Promise((resolve, reject) => {
      ee.data.authenticateViaPrivateKey(
        privateKey,
        () => {
          ee.initialize(
            null,
            null,
            () => resolve(),
            (error) => reject(new Error(`Earth Engine initialization failed: ${error}`))
          );
        },
        (error) => reject(new Error(`Earth Engine authentication failed: ${error}`))
      );
    });
  })();

  return eeInitPromise;
}

function buildAssetId(runDate, config, kind) {
  const assetDateTag = dateToTag(runDate);
  return `${config.eeAssetRoot}/${config.eeAssetNamePrefix}_${kind}_${assetDateTag}`;
}

async function getAssetSafe(assetId) {
  try {
    return await ee.data.getAsset(assetId);
  } catch (error) {
    const message = String(error?.message || error || "");
    if (
      message.includes("not found") ||
      message.includes("does not exist") ||
      message.includes("Cannot find asset")
    ) {
      return null;
    }
    throw error;
  }
}

async function ensureAssetRootExists(config) {
  const existing = await getAssetSafe(config.eeAssetRoot);
  if (existing) {
    return;
  }

  try {
    await ee.data.createFolder(config.eeAssetRoot);
  } catch (error) {
    const message = String(error?.message || error || "");
    if (!message.includes("already exists")) {
      throw error;
    }
  }
}

async function resolveAssetDate(runDate, config) {
  const requestedAssetIds = Object.fromEntries(
    REQUIRED_ASSET_KINDS.map((kind) => [kind, buildAssetId(runDate, config, kind)])
  );

  const requestedAssets = await Promise.all(
    REQUIRED_ASSET_KINDS.map((kind) => getAssetSafe(requestedAssetIds[kind]))
  );

  if (requestedAssets.every(Boolean)) {
    return {
      assetDateUsed: runDate,
      assetSelectionMode: "exact"
    };
  }

  if (config.eeAssetDatePolicy !== "latest_available") {
    throw new Error(
      `Required Earth Engine assets for ${runDate} are incomplete. ` +
      `Expected: ${REQUIRED_ASSET_KINDS.map((kind) => requestedAssetIds[kind]).join(", ")}`
    );
  }

  const listedAssetsRaw = await ee.data.listAssets(config.eeAssetRoot, {});
  const listedAssets = Array.isArray(listedAssetsRaw)
    ? listedAssetsRaw
    : Array.isArray(listedAssetsRaw?.assets)
      ? listedAssetsRaw.assets
      : [];

  const requestedTag = dateToTag(runDate);
  const pattern = new RegExp(
    `^${escapeRegex(config.eeAssetRoot)}/` +
    `${escapeRegex(config.eeAssetNamePrefix)}_(risk_prob|risk_class|risk_binary)_(\\d{8})$`
  );

  const availableByDate = new Map();

  for (const asset of listedAssets) {
    const assetId = asset?.id || asset?.name || "";
    const match = assetId.match(pattern);
    if (!match) {
      continue;
    }

    const [, kind, tag] = match;
    if (tag > requestedTag) {
      continue;
    }

    const kinds = availableByDate.get(tag) || new Set();
    kinds.add(kind);
    availableByDate.set(tag, kinds);
  }

  const eligibleTags = [...availableByDate.entries()]
    .filter(([, kinds]) => REQUIRED_ASSET_KINDS.every((kind) => kinds.has(kind)))
    .map(([tag]) => tag)
    .sort()
    .reverse();

  for (const tag of eligibleTags) {
    const assetDate = tagToDate(tag);
    const ageDays = daysBetween(assetDate, runDate);
    if (ageDays <= config.eeMaxAssetAgeDays) {
      return {
        assetDateUsed: assetDate,
        assetSelectionMode: "latest_available"
      };
    }
  }

  throw new Error(
    `No complete Earth Engine asset set found on or before ${runDate} ` +
    `within ${config.eeMaxAssetAgeDays} days under ${config.eeAssetRoot}.`
  );
}

function dictGetNumber(dict, key) {
  dict = ee.Dictionary(dict);
  return ee.Number(ee.Algorithms.If(dict.contains(key), dict.get(key), 0));
}

function buildRiskClassLabel(value) {
  switch (Number(value || 1)) {
    case 5:
      return "Very High";
    case 4:
      return "High";
    case 3:
      return "Medium";
    case 2:
      return "Low";
    default:
      return "Very Low";
  }
}

function reduceBandOrConstant(collection, bandName, reducer, fallbackValue = 0) {
  const selected = ee.ImageCollection(collection.select([bandName]));
  const hasImages = ee.Number(selected.size()).gt(0);

  if (reducer === "sum") {
    return ee.Image(ee.Algorithms.If(
      hasImages,
      selected.sum().rename(bandName),
      ee.Image.constant(fallbackValue).rename(bandName)
    ));
  }

  if (reducer === "median") {
    return ee.Image(ee.Algorithms.If(
      hasImages,
      selected.median().rename(bandName),
      ee.Image.constant(fallbackValue).rename(bandName)
    ));
  }

  return ee.Image(ee.Algorithms.If(
    hasImages,
    selected.mean().rename(bandName),
    ee.Image.constant(fallbackValue).rename(bandName)
  ));
}

function buildOperationalFeatureStack(runDate, config) {
  const runEndDate = ee.Date(runDate);
  const featureWindowDays = getFeatureWindowDays(config);
  const featureStartDate = runEndDate.advance(-featureWindowDays, "day");
  const corridorStartDate = runEndDate.advance(-Number(config.eeCorridorLookbackYears || 5), "year");

  const admin = ee.FeatureCollection("FAO/GAUL/2015/level1");
  const regionFc = ee.FeatureCollection(
    admin
      .filter(ee.Filter.eq("ADM0_NAME", config.eeRegionCountry))
      .filter(ee.Filter.eq("ADM1_NAME", config.eeRegionLevel1))
  );
  const regionFeature = ee.Feature(regionFc.first());
  const regionGeom = regionFeature.geometry();

  let lstCollection = ee.ImageCollection("MODIS/061/MOD11A1")
    .filterDate(featureStartDate, runEndDate);
  lstCollection = ee.ImageCollection(lstCollection.select(["LST_Day_1km"]));

  const lstKelvinRaw = reduceBandOrConstant(lstCollection, "LST_Day_1km", "mean");

  const lstCelsius = lstKelvinRaw
    .multiply(0.02)
    .subtract(273.15)
    .rename("LST")
    .clip(regionGeom);

  const s2Primary = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate(featureStartDate, runEndDate)
    .filterBounds(regionGeom)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", Number(config.eeCloudThreshold || 20)));

  const s2Fallback = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
    .filterDate(runEndDate.advance(-45, "day"), runEndDate)
    .filterBounds(regionGeom)
    .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", Number(config.eeCloudThreshold || 20)));

  const s2Collection = ee.ImageCollection(
    ee.Algorithms.If(ee.Number(s2Primary.size()).gt(0), s2Primary, s2Fallback)
  );

  const s2 = ee.Image(ee.Algorithms.If(
    ee.Number(s2Collection.size()).gt(0),
    ee.ImageCollection(s2Collection).median(),
    ee.Image.constant([0, 0, 0]).rename(["B8", "B4", "B11"])
  )).clip(regionGeom);
  const ndvi = s2.normalizedDifference(["B8", "B4"]).rename("NDVI").unmask(0);
  const ndmi = s2.normalizedDifference(["B8", "B11"]).rename("NDMI").unmask(0);

  const era5 = ee.ImageCollection("ECMWF/ERA5_LAND/HOURLY")
    .filterDate(featureStartDate, runEndDate)
    .filterBounds(regionGeom);

  const airTemp = reduceBandOrConstant(era5, "temperature_2m", "mean")
    .subtract(273.15)
    .rename("AIR_TEMP")
    .clip(regionGeom);

  const dewTemp = reduceBandOrConstant(era5, "dewpoint_temperature_2m", "mean")
    .subtract(273.15)
    .rename("DEW_TEMP")
    .clip(regionGeom);

  const relHumidity = airTemp.expression(
    "100 * exp((17.625 * td) / (243.04 + td) - (17.625 * t) / (243.04 + t))",
    { t: airTemp, td: dewTemp }
  ).clamp(0, 100).rename("RH");

  const u10 = reduceBandOrConstant(era5, "u_component_of_wind_10m", "mean")
    .rename("U10");
  const v10 = reduceBandOrConstant(era5, "v_component_of_wind_10m", "mean")
    .rename("V10");
  const windSpeed = u10.pow(2).add(v10.pow(2)).sqrt().rename("WIND_SPEED").clip(regionGeom);

  const precip = reduceBandOrConstant(era5, "total_precipitation_hourly", "sum")
    .multiply(1000)
    .rename("PRECIP_MM")
    .clip(regionGeom);

  const viirsPrimary = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
    .filterDate(featureStartDate, runEndDate)
    .filterBounds(regionGeom);

  const viirsFallback = ee.ImageCollection("NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG")
    .filterDate(runEndDate.advance(-365, "day"), runEndDate)
    .filterBounds(regionGeom);

  const viirsCollection = ee.ImageCollection(
    ee.Algorithms.If(ee.Number(viirsPrimary.size()).gt(0), viirsPrimary, viirsFallback)
  );

  const nightLights = ee.Image(ee.Algorithms.If(
    ee.Number(viirsCollection.size()).gt(0),
    reduceBandOrConstant(viirsCollection, "avg_rad", "mean"),
    ee.Image.constant(0)
  ))
    .rename("NIGHTLIGHTS")
    .unmask(0)
    .clip(regionGeom);

  const dem = ee.Image("USGS/SRTMGL1_003")
    .select("elevation")
    .clip(regionGeom)
    .rename("ELEV");

  const terrain = ee.Terrain.products(dem);
  const slope = terrain.select("slope").rename("SLOPE");
  const aspect = terrain.select("aspect").rename("ASPECT");
  const aspectRad = aspect.multiply(Math.PI / 180.0);
  const aspectSin = aspectRad.sin().rename("ASPECT_SIN");
  const aspectCos = aspectRad.cos().rename("ASPECT_COS");

  const worldCover = ee.Image(ee.ImageCollection("ESA/WorldCover/v200")
    .first())
    .select("Map")
    .clip(regionGeom);

  const lcForest = worldCover.eq(10).or(worldCover.eq(95)).rename("LC_FOREST");
  const lcShrub = worldCover.eq(20).rename("LC_SHRUB");
  const lcCrop = worldCover.eq(40).rename("LC_CROP");
  const lcUrban = worldCover.eq(50).rename("LC_URBAN");

  const maxDistance = Number(config.eeMaxDistanceMeters || 50000);

  const distSettlement = lcUrban.selfMask()
    .distance(ee.Kernel.euclidean(maxDistance, "meters"))
    .unmask(maxDistance)
    .rename("DIST_SETTLEMENT")
    .clip(regionGeom);

  let distRoad = ee.Image.constant(maxDistance)
    .rename("DIST_ROAD")
    .clip(regionGeom);

  if (config.eeUseRoadDistance && config.eeRoadsAssetPath) {
    const roadsFc = ee.FeatureCollection(config.eeRoadsAssetPath).filterBounds(regionGeom);
    const roadsRaster = ee.Image().byte().paint(roadsFc, 1).selfMask();
    distRoad = roadsRaster
      .distance(ee.Kernel.euclidean(maxDistance, "meters"))
      .unmask(maxDistance)
      .rename("DIST_ROAD")
      .clip(regionGeom);
  }

  const corridorCollection = ee.ImageCollection("MODIS/061/MCD64A1")
    .filterBounds(regionGeom)
    .filterDate(corridorStartDate, runEndDate)
    .select(["BurnDate"]);

  const corridorFireMask = ee.Image(ee.ImageCollection(corridorCollection.map((img) => {
    return ee.Image(img).gt(0);
  })).sum())
    .gte(2)
    .rename("FIRE_CORRIDOR");

  const distFireCorridor = corridorFireMask.selfMask()
    .distance(ee.Kernel.euclidean(maxDistance, "meters"))
    .unmask(maxDistance)
    .rename("DIST_FIRE_CORRIDOR")
    .clip(regionGeom);

  const featureStack = ee.Image.cat([
    lstCelsius,
    ndvi,
    ndmi,
    airTemp,
    relHumidity,
    windSpeed,
    precip,
    nightLights,
    dem,
    slope,
    aspectSin,
    aspectCos,
    lcForest,
    lcShrub,
    lcCrop,
    lcUrban,
    distSettlement,
    distRoad,
    distFireCorridor
  ]).clip(regionGeom);

  const regionMask = ee.Image.constant(1).clip(regionGeom).mask();

  return {
    runEndDate,
    regionGeom,
    regionMask,
    featureWindowDays,
    featureStack
  };
}

function createRiskOutputsFromProbability(fireRiskProb, regionGeom, regionMask, config) {
  const riskBinary = fireRiskProb
    .gte(Number(config.eeSelectedThreshold || 0.5))
    .toByte()
    .rename("RiskBinary")
    .updateMask(regionMask)
    .clip(regionGeom);

  const riskClasses = fireRiskProb.expression(
    "(p < b1) ? 1 : (p < b2) ? 2 : (p < b3) ? 3 : (p < b4) ? 4 : 5",
    {
      p: fireRiskProb,
      b1: Number(config.eeClassBreak1 || 0.2),
      b2: Number(config.eeClassBreak2 || 0.4),
      b3: Number(config.eeClassBreak3 || 0.6),
      b4: Number(config.eeClassBreak4 || 0.8)
    }
  ).toByte().rename("RiskClass")
    .updateMask(regionMask)
    .clip(regionGeom);

  return {
    riskProb: fireRiskProb,
    riskClass: riskClasses,
    riskBinary
  };
}

function createRiskOutputsFromClassifier(featureStack, regionGeom, regionMask, config, classifier) {
  const outputMode = String(config.eeClassifierOutputMode || "CLASSIFICATION").toUpperCase();
  let fireRiskProb;

  if (outputMode === "MULTIPROBABILITY") {
    const probClassifier = classifier.setOutputMode("MULTIPROBABILITY");
    fireRiskProb = featureStack
      .classify(probClassifier)
      .arrayGet([1])
      .toFloat()
      .rename("FireRiskProb")
      .updateMask(regionMask)
      .clip(regionGeom);
  } else if (outputMode === "PROBABILITY") {
    const probClassifier = classifier.setOutputMode("PROBABILITY");
    fireRiskProb = featureStack
      .classify(probClassifier)
      .toFloat()
      .rename("FireRiskProb")
      .updateMask(regionMask)
      .clip(regionGeom);
  } else if (outputMode === "CLASSIFICATION") {
    const classClassifier = classifier.setOutputMode("CLASSIFICATION");
    fireRiskProb = featureStack
      .classify(classClassifier)
      .toFloat()
      .rename("FireRiskProb")
      .updateMask(regionMask)
      .clip(regionGeom);
  } else {
    throw new Error(
      `Unsupported EE_CLASSIFIER_OUTPUT_MODE: ${outputMode}. Use CLASSIFICATION, PROBABILITY, or MULTIPROBABILITY.`
    );
  }

  return createRiskOutputsFromProbability(fireRiskProb, regionGeom, regionMask, config);
}

function createRiskOutputs(featureStack, regionGeom, regionMask, config, classifierAssetId) {
  const effectiveClassifierAssetId = classifierAssetId || config.eeClassifierAssetId;
  if (!effectiveClassifierAssetId) {
    throw new Error("EE_CLASSIFIER_ASSET_ID is required for daily asset export.");
  }

  const classifier = ee.Classifier.load(effectiveClassifierAssetId);
  return createRiskOutputsFromClassifier(featureStack, regionGeom, regionMask, config, classifier);
}

function normalize01(image, minValue, maxValue) {
  return image
    .subtract(minValue)
    .divide(ee.Number(maxValue).subtract(minValue))
    .clamp(0, 1);
}

function createRiskOutputsFromHeuristic(featureStack, regionGeom, regionMask, config) {
  const maxDistance = Number(config.eeMaxDistanceMeters || 50000);

  const lstScore = normalize01(featureStack.select("LST"), 10, 50);
  const airTempScore = normalize01(featureStack.select("AIR_TEMP"), 0, 40);
  const rhScore = ee.Image.constant(1).subtract(normalize01(featureStack.select("RH"), 10, 100));
  const ndmiScore = ee.Image.constant(1).subtract(normalize01(featureStack.select("NDMI"), -0.4, 0.4));
  const windScore = normalize01(featureStack.select("WIND_SPEED"), 0, 15);
  const slopeScore = normalize01(featureStack.select("SLOPE"), 0, 60);
  const nightLightsScore = normalize01(featureStack.select("NIGHTLIGHTS"), 0, 20);
  const corridorScore = ee.Image.constant(1).subtract(
    normalize01(featureStack.select("DIST_FIRE_CORRIDOR"), 0, maxDistance)
  );

  const fireRiskProb = ee.Image(0)
    .add(lstScore.multiply(0.22))
    .add(airTempScore.multiply(0.16))
    .add(rhScore.multiply(0.16))
    .add(ndmiScore.multiply(0.14))
    .add(windScore.multiply(0.10))
    .add(slopeScore.multiply(0.07))
    .add(nightLightsScore.multiply(0.07))
    .add(corridorScore.multiply(0.08))
    .clamp(0, 1)
    .rename("FireRiskProb")
    .updateMask(regionMask)
    .clip(regionGeom);

  return createRiskOutputsFromProbability(fireRiskProb, regionGeom, regionMask, config);
}

function buildTrainingLabel(runEndDate, regionGeom, config, options = {}) {
  const labelWindowDays = Math.max(
    30,
    Number(options.labelWindowDays || config.eeLabelWindowDays || 365)
  );
  const fireExpandPixels = Math.max(
    0,
    Number(
      options.fireExpandPixels === undefined
        ? (config.eeFireExpandPixels || 1)
        : options.fireExpandPixels
    )
  );
  const labelStartDate = runEndDate.advance(-labelWindowDays, "day");

  const burnedArea = ee.ImageCollection("MODIS/061/MCD64A1")
    .filterBounds(regionGeom)
    .filterDate(labelStartDate, runEndDate)
    .select(["BurnDate"]);

  const burnedLabel = ee.Image(burnedArea.max())
    .gt(0)
    .toByte()
    .rename("Fire")
    .clip(regionGeom);

  const burnedPixelsRaw = burnedLabel.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: regionGeom,
    scale: Number(config.eeScale || 1000),
    maxPixels: 1e12,
    tileScale: 4
  }).get("Fire");
  const burnedPixels = ee.Number(ee.Algorithms.If(burnedPixelsRaw, burnedPixelsRaw, 0));

  const firmsCollection = ee.ImageCollection("FIRMS")
    .filterBounds(regionGeom)
    .filterDate(labelStartDate, runEndDate)
    .select(["T21"]);
  let firmsFallbackLabel = ee.Image(firmsCollection.max())
    .gt(0);

  if (fireExpandPixels > 0) {
    firmsFallbackLabel = firmsFallbackLabel.focalMax(fireExpandPixels);
  }

  firmsFallbackLabel = firmsFallbackLabel
    .toByte()
    .rename("Fire")
    .clip(regionGeom);
  let fireLabel = ee.Image(ee.Algorithms.If(burnedPixels.gt(0), burnedLabel, firmsFallbackLabel));

  if (fireExpandPixels > 0) {
    fireLabel = fireLabel.focalMax(fireExpandPixels);
  }

  return fireLabel.unmask(0).toByte().rename("Fire").clip(regionGeom);
}

async function createRiskOutputsFromDynamicTraining(
  featureStack,
  regionGeom,
  regionMask,
  runEndDate,
  config
) {
  const trainSamplesPerClass = Math.max(200, Number(config.eeTrainSamplesPerClass || 1200));
  const negToPosRatio = Math.max(1, Number(config.eeTrainNegToPosRatio || 1));
  const trainNegPoints = Math.max(1, Math.round(trainSamplesPerClass * negToPosRatio));
  const trainPosPoints = Math.max(1, Math.round(trainSamplesPerClass));
  const trainSeed = Number(config.eeTrainSeed || 42);
  const minSamplesPerClass = Math.max(10, Number(config.eeTrainMinSamplesPerClass || 50));
  const baseWindowDays = Math.max(30, Number(config.eeLabelWindowDays || 365));
  const windowCandidates = Array.from(new Set([
    baseWindowDays,
    baseWindowDays * 2,
    baseWindowDays * 3,
    1825
  ].map((value) => Math.round(value)).filter((value) => value >= 30))).sort((a, b) => a - b);

  const baseExpand = Math.max(0, Number(config.eeFireExpandPixels || 1));
  const expandCandidates = Array.from(new Set([
    baseExpand,
    1,
    2,
    4,
    8,
    12
  ].map((value) => Math.round(value)).filter((value) => value >= 0))).sort((a, b) => a - b);

  let bestAttempt = null;
  let totalAttempts = 0;

  for (const labelWindowDays of windowCandidates) {
    const baseFireLabel = buildTrainingLabel(runEndDate, regionGeom, config, {
      labelWindowDays,
      fireExpandPixels: 0
    });

    for (const expandPixels of expandCandidates) {
      let fireLabel = baseFireLabel;
      if (expandPixels > 0) {
        fireLabel = baseFireLabel.focalMax(expandPixels).toByte().rename("Fire").clip(regionGeom);
      }

      const trainSet = featureStack.addBands(fireLabel).stratifiedSample({
        numPoints: 0,
        classBand: "Fire",
        classValues: [0, 1],
        classPoints: [trainNegPoints, trainPosPoints],
        region: regionGeom,
        scale: Number(config.eeScale || 1000),
        seed: trainSeed,
        dropNulls: true,
        geometries: false,
        tileScale: 8
      }).map((feature) => feature.set("Fire", ee.Number(feature.get("Fire")).toInt()))
        .filter(ee.Filter.notNull(FEATURE_BANDS.concat(["Fire"])));

      const trainHistogram = ee.Dictionary(trainSet.aggregate_histogram("Fire"));
      const trainStats = await evaluateObject(ee.Dictionary({
        train_size: trainSet.size(),
        class_0: dictGetNumber(trainHistogram, "0"),
        class_1: dictGetNumber(trainHistogram, "1")
      }));

      totalAttempts += 1;
      const enrichedStats = {
        ...trainStats,
        label_window_days: labelWindowDays,
        fire_expand_pixels: expandPixels
      };

      if (!bestAttempt || Number(enrichedStats.class_1 || 0) > Number(bestAttempt.class_1 || 0)) {
        bestAttempt = enrichedStats;
      }

      if (
        Number(enrichedStats.class_0 || 0) >= minSamplesPerClass &&
        Number(enrichedStats.class_1 || 0) >= minSamplesPerClass
      ) {
        const classifier = ee.Classifier.smileRandomForest(Number(config.eeFallbackRfTrees || 80))
          .train({
            features: trainSet,
            classProperty: "Fire",
            inputProperties: FEATURE_BANDS
          });

        return {
          outputs: createRiskOutputsFromClassifier(featureStack, regionGeom, regionMask, config, classifier),
          trainStats: {
            ...enrichedStats,
            attempts_used: totalAttempts
          }
        };
      }
    }
  }

  throw new Error(
    "Insufficient training samples for dynamic fallback after adaptive attempts. " +
    `Need >= ${minSamplesPerClass} per class; ` +
    `best class_0=${bestAttempt?.class_0 || 0}, class_1=${bestAttempt?.class_1 || 0}, ` +
    `label_window_days=${bestAttempt?.label_window_days || "n/a"}, ` +
    `fire_expand_pixels=${bestAttempt?.fire_expand_pixels || "n/a"}, ` +
    `attempts=${totalAttempts}.`
  );
}

async function validateRiskOutputs(outputs, regionGeom, config, classifierAssetId) {
  // Force a lightweight server evaluation so invalid classifier assets fail fast.
  const probe = outputs.riskProb.reduceRegion({
    reducer: ee.Reducer.first(),
    geometry: regionGeom.centroid(100),
    scale: Number(config.eeScale || 1000),
    maxPixels: 1e6
  });

  try {
    await evaluateObject(probe);
  } catch (error) {
    const message = error?.message || String(error);
    throw new Error(`Risk output source '${classifierAssetId}' failed validation: ${message}`);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getTaskState(taskId) {
  const statuses = await ee.data.getTaskStatus(taskId);
  const status = Array.isArray(statuses) ? statuses[0] : statuses;
  return status || { id: taskId, state: "UNKNOWN" };
}

async function waitForExportTasks(taskIds, config) {
  if (!taskIds.length) {
    return [];
  }

  const pollSeconds = Math.max(5, Number(config.eeExportPollSeconds || 30));
  const timeoutMinutes = Math.max(5, Number(config.eeExportTimeoutMinutes || 180));
  const deadline = Date.now() + timeoutMinutes * 60 * 1000;

  const completed = new Map();

  while (Date.now() < deadline) {
    const statuses = await Promise.all(taskIds.map((taskId) => getTaskState(taskId)));

    for (const status of statuses) {
      const state = String(status?.state || "UNKNOWN").toUpperCase();
      const taskId = status?.id || status?.name || "unknown";

      if (state === "COMPLETED") {
        completed.set(taskId, status);
        continue;
      }

      if (state === "FAILED" || state === "CANCELLED") {
        const message = status?.error_message || status?.error_message?.message || "Unknown export failure";
        throw new Error(`Export task ${taskId} failed (${state}): ${message}`);
      }
    }

    if (completed.size === taskIds.length) {
      return statuses;
    }

    await sleep(pollSeconds * 1000);
  }

  throw new Error(
    `Export tasks timed out after ${timeoutMinutes} minutes. Pending task IDs: ${taskIds.join(", ")}`
  );
}

function startImageExportTask({ image, description, assetId, region, config }) {
  const task = ee.batch.Export.image.toAsset(
    image,
    description,
    assetId,
    null,
    null,
    region,
    Number(config.eeScale || 1000),
    null,
    null,
    1e13,
    null,
    null,
    Boolean(config.eeExportOverwrite)
  );

  task.start();

  if (!task.id) {
    throw new Error(`Failed to start export task for ${assetId}`);
  }

  return task.id;
}

export async function exportOperationalAssets({ runDate } = {}) {
  const config = getConfig();
  const effectiveRunDate = runDate || getTodayString();

  await initializeEarthEngine(config);
  await ensureAssetRootExists(config);

  const { featureStack, regionGeom, regionMask, featureWindowDays, runEndDate } = buildOperationalFeatureStack(
    effectiveRunDate,
    config
  );
  // Export.image.* in the Node client can exceed process argument limits when the
  // region geometry is serialized as a complex polygon. A bounded rectangle keeps
  // the request small, while clipping above still preserves the true output shape.
  const exportRegion = await evaluateObject(regionGeom.bounds(1000));
  const requestedRiskOutputStrategy = String(
    config.eeRiskOutputStrategy || "dynamic_training_first"
  ).toLowerCase();
  const supportedRiskOutputStrategies = new Set([
    "dynamic_training_first",
    "dynamic_training_only",
    "classifier_asset_first",
    "classifier_asset_only"
  ]);
  const riskOutputStrategy = supportedRiskOutputStrategies.has(requestedRiskOutputStrategy)
    ? requestedRiskOutputStrategy
    : "dynamic_training_first";
  const classifierCandidates = Array.from(
    new Set([config.eeClassifierAssetId, config.eeClassifierFallbackAssetId].filter(Boolean))
  );

  let outputs = null;
  let classifierAssetUsed = "";
  let outputSource = "";
  let dynamicTrainingStats = null;
  const classifierErrors = [];

  if (riskOutputStrategy !== requestedRiskOutputStrategy) {
    classifierErrors.push({
      assetId: "EE_RISK_OUTPUT_STRATEGY",
      message: `Unsupported strategy '${requestedRiskOutputStrategy}'. Falling back to '${riskOutputStrategy}'.`
    });
  }

  const tryClassifierAssets = async () => {
    if (outputs || riskOutputStrategy === "dynamic_training_only") {
      return;
    }

    if (!classifierCandidates.length) {
      classifierErrors.push({
        assetId: "EE_CLASSIFIER_ASSET_ID",
        message: "No classifier assets configured."
      });
      return;
    }

    for (const candidate of classifierCandidates) {
      try {
        const candidateOutputs = createRiskOutputs(
          featureStack,
          regionGeom,
          regionMask,
          config,
          candidate
        );
        await validateRiskOutputs(candidateOutputs, regionGeom, config, candidate);
        outputs = candidateOutputs;
        classifierAssetUsed = candidate;
        outputSource = OUTPUT_SOURCE.CLASSIFIER_ASSET;
        break;
      } catch (error) {
        const message = error?.message || String(error);
        classifierErrors.push({ assetId: candidate, message });
      }
    }
  };

  const tryDynamicTraining = async () => {
    if (
      outputs ||
      riskOutputStrategy === "classifier_asset_only" ||
      !config.eeAllowDynamicTrainingFallback
    ) {
      return;
    }

    try {
      const dynamicOutputs = await createRiskOutputsFromDynamicTraining(
        featureStack,
        regionGeom,
        regionMask,
        runEndDate,
        config
      );
      await validateRiskOutputs(
        dynamicOutputs.outputs,
        regionGeom,
        config,
        OUTPUT_SOURCE.DYNAMIC_TRAINING
      );
      outputs = dynamicOutputs.outputs;
      classifierAssetUsed = OUTPUT_SOURCE.DYNAMIC_TRAINING;
      outputSource = OUTPUT_SOURCE.DYNAMIC_TRAINING;
      dynamicTrainingStats = dynamicOutputs.trainStats;
    } catch (error) {
      const message = error?.message || String(error);
      classifierErrors.push({ assetId: OUTPUT_SOURCE.DYNAMIC_TRAINING, message });
    }
  };

  if (riskOutputStrategy === "dynamic_training_first" || riskOutputStrategy === "dynamic_training_only") {
    await tryDynamicTraining();
    await tryClassifierAssets();
  } else {
    await tryClassifierAssets();
    await tryDynamicTraining();
  }

  if (!outputs && config.eeAllowHeuristicFallback) {
    try {
      const heuristicOutputs = createRiskOutputsFromHeuristic(
        featureStack,
        regionGeom,
        regionMask,
        config
      );
      await validateRiskOutputs(
        heuristicOutputs,
        regionGeom,
        config,
        OUTPUT_SOURCE.HEURISTIC_FALLBACK
      );
      outputs = heuristicOutputs;
      classifierAssetUsed = OUTPUT_SOURCE.HEURISTIC_FALLBACK;
      outputSource = OUTPUT_SOURCE.HEURISTIC_FALLBACK;
    } catch (error) {
      const message = error?.message || String(error);
      classifierErrors.push({ assetId: OUTPUT_SOURCE.HEURISTIC_FALLBACK, message });
    }
  }

  if (!outputs) {
    const detail = classifierErrors
      .map((item) => `${item.assetId}: ${item.message}`)
      .join(" | ");
    throw new Error(
      "All risk output strategies failed. " +
      `${detail} | ` +
      `Current EE_RISK_OUTPUT_STRATEGY='${riskOutputStrategy}'. ` +
      "Set a healthy EE_CLASSIFIER_ASSET_ID, or keep EE_ALLOW_DYNAMIC_TRAINING_FALLBACK=true, " +
      "or keep EE_ALLOW_HEURISTIC_FALLBACK=true."
    );
  }

  const assetIds = {
    risk_prob: buildAssetId(effectiveRunDate, config, "risk_prob"),
    risk_class: buildAssetId(effectiveRunDate, config, "risk_class"),
    risk_binary: buildAssetId(effectiveRunDate, config, "risk_binary")
  };

  const exportSpecs = [
    {
      kind: "risk_prob",
      image: outputs.riskProb.float(),
      description: `${config.eeAssetNamePrefix}_risk_prob_asset_${dateToTag(effectiveRunDate)}`,
      assetId: assetIds.risk_prob
    },
    {
      kind: "risk_class",
      image: outputs.riskClass.toByte(),
      description: `${config.eeAssetNamePrefix}_risk_class_asset_${dateToTag(effectiveRunDate)}`,
      assetId: assetIds.risk_class
    },
    {
      kind: "risk_binary",
      image: outputs.riskBinary.toByte(),
      description: `${config.eeAssetNamePrefix}_risk_binary_asset_${dateToTag(effectiveRunDate)}`,
      assetId: assetIds.risk_binary
    }
  ];

  const tasks = [];
  const skipped = [];

  for (const spec of exportSpecs) {
    const existing = await getAssetSafe(spec.assetId);
    if (existing && !config.eeExportOverwrite) {
      skipped.push({ kind: spec.kind, assetId: spec.assetId, reason: "already_exists" });
      continue;
    }

    if (existing && config.eeExportOverwrite) {
      await ee.data.deleteAsset(spec.assetId);
    }

    const taskId = startImageExportTask({
      image: spec.image,
      description: spec.description,
      assetId: spec.assetId,
      region: exportRegion,
      config
    });

    tasks.push({ kind: spec.kind, taskId, assetId: spec.assetId });
  }

  await waitForExportTasks(tasks.map((item) => item.taskId), config);

  return {
    runDate: effectiveRunDate,
    featureWindowDays,
    riskOutputStrategy,
    outputSource,
    classifierAssetUsed,
    dynamicTrainingStats,
    fallbackDiagnostics: classifierErrors,
    assetIds,
    tasksStarted: tasks.length,
    tasksSkipped: skipped.length,
    tasks,
    skipped,
    overwrite: Boolean(config.eeExportOverwrite)
  };
}

async function runRealEarthEngineInference({ runDate, config }) {
  await initializeEarthEngine(config);
  const { assetDateUsed, assetSelectionMode } = await resolveAssetDate(runDate, config);

  const level1 = ee.FeatureCollection("FAO/GAUL/2015/level1");
  const level2 = ee.FeatureCollection("FAO/GAUL/2015/level2");

  const regionFc = level1
    .filter(ee.Filter.eq("ADM0_NAME", config.eeRegionCountry))
    .filter(ee.Filter.eq("ADM1_NAME", config.eeRegionLevel1));

  const districts = level2
    .filter(ee.Filter.eq("ADM0_NAME", config.eeRegionCountry))
    .filter(ee.Filter.eq("ADM1_NAME", config.eeRegionLevel1));

  const regionFeature = ee.Feature(ee.FeatureCollection(regionFc).first());
  const regionGeom = regionFeature.geometry();
  const pixelAreaHa = ee.Image.pixelArea().divide(10000);
  const totalAreaHaImage = ee.Image.constant(1).rename("TotalArea").multiply(pixelAreaHa);

  const riskProb = ee.Image(buildAssetId(assetDateUsed, config, "risk_prob"))
    .rename("FireRiskProb")
    .clip(regionGeom);
  const riskClass = ee.Image(buildAssetId(assetDateUsed, config, "risk_class"))
    .rename("RiskClass")
    .clip(regionGeom);
  const highRiskMask = riskClass.gte(4).rename("HighRiskMask");

  const districtSummaryFc = districts.map((district) => {
    const geom = district.geometry();
    const centroid = geom.centroid(100);
    const coords = ee.List(centroid.coordinates());

    const meanDict = riskProb.reduceRegion({
      reducer: ee.Reducer.mean(),
      geometry: geom,
      scale: Number(config.eeScale || 1000),
      maxPixels: 1e12
    });
    const maxDict = riskProb.reduceRegion({
      reducer: ee.Reducer.max(),
      geometry: geom,
      scale: Number(config.eeScale || 1000),
      maxPixels: 1e12
    });
    const modeDict = riskClass.reduceRegion({
      reducer: ee.Reducer.mode(),
      geometry: geom,
      scale: Number(config.eeScale || 1000),
      maxPixels: 1e12
    });
    const highRiskAreaDict = highRiskMask.multiply(pixelAreaHa).reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: Number(config.eeScale || 1000),
      maxPixels: 1e12
    });
    const totalAreaDict = totalAreaHaImage.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: geom,
      scale: Number(config.eeScale || 1000),
      maxPixels: 1e12
    });

    const totalAreaHa = dictGetNumber(totalAreaDict, "TotalArea");
    const highRiskAreaHa = dictGetNumber(highRiskAreaDict, "HighRiskMask");
    const highRiskPct = ee.Number(ee.Algorithms.If(
      totalAreaHa.gt(0),
      highRiskAreaHa.divide(totalAreaHa).multiply(100),
      0
    ));

    return ee.Feature(null, {
      district_name: district.get("ADM2_NAME"),
      mean_risk: dictGetNumber(meanDict, "FireRiskProb"),
      max_fire_prob: dictGetNumber(maxDict, "FireRiskProb"),
      high_or_very_high_area_pct: highRiskPct,
      dominant_risk_class_value: dictGetNumber(modeDict, "RiskClass"),
      lat: coords.get(1),
      lon: coords.get(0)
    });
  });

  const [districtSummary, mapConfig, alertRules] = await Promise.all([
    evaluateObject(districtSummaryFc),
    readCollection("mapConfig"),
    readCollection("alertRules")
  ]);

  const districtsOut = (districtSummary?.features || []).map((feature) => {
    const props = feature.properties || {};
    const districtName = props.district_name || "Unknown";
    const districtId = slugifyDistrictName(districtName);

    return {
      district_id: districtId,
      district_name: districtName,
      lat: Number(props.lat || 0),
      lon: Number(props.lon || 0),
      mean_risk: Number(props.mean_risk || 0),
      max_fire_prob: Number(props.max_fire_prob || 0),
      high_or_very_high_area_pct: Number(props.high_or_very_high_area_pct || 0),
      dominant_risk_class: buildRiskClassLabel(props.dominant_risk_class_value),
      hotspot_count_24h: 0,
      updated_at: toIsoWithOffset(runDate)
    };
  });

  const warningProbability = Number(alertRules?.probability_warning_min || 0.7);
  const warningAreaPct = Number(alertRules?.high_or_very_high_area_pct_min || 10);

  const warningDistricts = districtsOut.filter(
    (district) => (
      district.max_fire_prob >= warningProbability ||
      district.high_or_very_high_area_pct >= warningAreaPct
    )
  ).length;

  const run = {
    run_id: `run_${runDate}`,
    run_date: runDate,
    status: "completed",
    selected_model: config.eeSelectedModel,
    selected_threshold: config.eeSelectedThreshold,
    label_source: "OPERATIONAL_ASSET_INGESTION",
    label_status: "OK",
    started_at: toIsoWithOffset(runDate),
    finished_at: toIsoWithOffset(runDate),
    feature_window_days: getFeatureWindowDays(config),
    window_mode: config.eeWindowMode,
    fire_f1: config.eeApprovedFireF1,
    fire_precision: 0,
    fire_recall: 0,
    balanced_accuracy: config.eeApprovedBalancedAccuracy,
    critical_districts: 0,
    warning_districts: warningDistricts,
    active_fire_districts: 0,
    asset_date_used: assetDateUsed,
    asset_selection_mode: assetSelectionMode,
    app_url: config.publicAppUrl,
    download_urls: buildDownloadUrls(assetDateUsed, config)
  };

  return {
    run,
    districtRiskDaily: districtsOut,
    activeFireDaily: [],
    mapConfig: {
      ...(mapConfig || {}),
      gee_app_url: config.publicAppUrl || mapConfig?.gee_app_url || ""
    }
  };
}

async function runMockEarthEngineInference({ runDate }) {
  const latestRun = await readCollection("latestRun");
  const districtRiskDaily = await readCollection("districtRiskDaily");
  const activeFireDaily = await readCollection("activeFireDaily");
  const mapConfig = await readCollection("mapConfig");

  const stampedRun = {
    ...latestRun,
    run_id: `run_${runDate}`,
    run_date: runDate,
    started_at: toIsoWithOffset(runDate),
    finished_at: toIsoWithOffset(runDate)
  };

  const stampedDistricts = districtRiskDaily.map((district) => ({
    ...district,
    updated_at: toIsoWithOffset(runDate)
  }));

  const stampedFires = activeFireDaily.map((fire, index) => ({
    ...fire,
    fire_id: `firms_${runDate.replaceAll("-", "")}_${String(index + 1).padStart(3, "0")}`
  }));

  return {
    run: stampedRun,
    districtRiskDaily: stampedDistricts,
    activeFireDaily: stampedFires,
    mapConfig
  };
}

export async function runOperationalInference({ runDate, useMockEarthEngine = true }) {
  const config = getConfig();

  if (useMockEarthEngine) {
    return runMockEarthEngineInference({ runDate });
  }

  return runRealEarthEngineInference({ runDate, config });
}
