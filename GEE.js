// =====================================================
// 0) Run parameters (operational / configurable)
// =====================================================

var PARAMS = {
  regionCountry: 'Turkey',
  regionLevel1: 'Antalya',

  // Ready-to-run stable historical date with strong summer fire signal.
  runDate: '2024-08-15',
  windowMode: 'weekly',   // 'daily' | 'weekly' | 'custom'
  customWindowDays: 30,
  labelWindowDays: 365,
  corridorLookbackYears: 5,

  cloudThreshold: 20,
  scale: 1000,

  trainSamplesPerClass: 2500,
  evalSamplesPerClass: 600,
  trainNegToPosRatio: 1,
  seedTrain: 42,
  seedEval: 99,

  // Model 1: Random Forest
  rfTrees: 80,

  // Model 2: Gradient Tree Boost (XGBoost-like in GEE)
  gbtTrees: 80,
  runGbtModel: false,

  // Probability threshold for binary alarm map and eval.
  riskThreshold: 0.50,
  autoTuneThreshold: false,
  thresholdTuneFraction: 0.50,
  thresholdCandidates: [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80],

  // Five-class risk breaks: Very Low / Low / Medium / High / Very High
  classBreak1: 0.20,
  classBreak2: 0.40,
  classBreak3: 0.60,
  classBreak4: 0.80,

  // Used only for fallback FIRMS label smoothing.
  fireExpandPixels: 1,

  // Optional road distance support.
  useRoadDistance: false,
  roadsAssetPath: '',
  maxDistanceMeters: 50000,

  exportToDrive: false,
  // Production worker uses dynamic training directly.
  exportToAsset: false,
  exportTablesToDrive: false,
  evalExportRows: 1000,
  exportFolder: 'GEE_FireRisk',
  exportPrefix: 'antalya_fire_risk',
  assetRoot: 'projects/wildfire-540/assets/fire_risk_ops',
  assetNamePrefix: 'antalya_fire_risk',

  // Reduce server load during first operational run.
  showDebugLayers: false,
  verboseConsole: false
};


// =====================================================
// 1) Region and time windows
// =====================================================

var admin = ee.FeatureCollection('FAO/GAUL/2015/level1');
var regionFc = ee.FeatureCollection(
  admin
    .filter(ee.Filter.eq('ADM0_NAME', PARAMS.regionCountry))
    .filter(ee.Filter.eq('ADM1_NAME', PARAMS.regionLevel1))
);
var regionFeature = ee.Feature(regionFc.first());
var regionGeom = regionFeature.geometry();

function formatDateUtc(dateObj) {
  return dateObj.toISOString().slice(0, 10);
}

function shiftDateByDays(dateString, days) {
  var dateObj = new Date(dateString + 'T00:00:00Z');
  dateObj.setUTCDate(dateObj.getUTCDate() + days);
  return formatDateUtc(dateObj);
}

function shiftDateByYears(dateString, years) {
  var dateObj = new Date(dateString + 'T00:00:00Z');
  dateObj.setUTCFullYear(dateObj.getUTCFullYear() + years);
  return formatDateUtc(dateObj);
}

var runDateString = PARAMS.runDate || formatDateUtc(new Date());
var assetDateTag = runDateString.replace(/-/g, '');
var runEndDate = runDateString;
var featureWindowDays = PARAMS.windowMode === 'daily'
  ? 1
  : (PARAMS.windowMode === 'weekly' ? 7 : PARAMS.customWindowDays);
var featureStartDate = shiftDateByDays(runDateString, -featureWindowDays);
var labelStartDate = shiftDateByDays(runDateString, -PARAMS.labelWindowDays);
var corridorStartDate = shiftDateByYears(runDateString, -PARAMS.corridorLookbackYears);
var s2FallbackStartDate = shiftDateByDays(runDateString, -45);
var viirsFallbackStartDate = shiftDateByDays(runDateString, -365);

function vprint(label, value) {
  if (PARAMS.verboseConsole) {
    print(label, value);
  }
}

function addOptionalLayer(eeObject, visParams, name) {
  if (PARAMS.showDebugLayers) {
    Map.addLayer(eeObject, visParams, name, false);
  }
}

Map.setCenter(30.7, 36.9, 8);
Map.addLayer(regionGeom, {color: '#ff0000'}, 'Region boundary', false);

print('Run end date:', runDateString);
print('Feature window days:', featureWindowDays);
vprint('Region:', regionFc);
vprint('Feature start:', featureStartDate);
vprint('Label start:', labelStartDate);
print('Run settings:', ee.Dictionary({
  window_mode: PARAMS.windowMode,
  cloud_threshold: PARAMS.cloudThreshold,
  scale_m: PARAMS.scale,
  train_per_class: PARAMS.trainSamplesPerClass,
  eval_per_class: PARAMS.evalSamplesPerClass,
  rf_trees: PARAMS.rfTrees,
  gbt_trees: PARAMS.gbtTrees,
  run_gbt_model: PARAMS.runGbtModel,
  risk_threshold: PARAMS.riskThreshold,
  auto_tune_threshold: PARAMS.autoTuneThreshold,
  threshold_tune_fraction: PARAMS.thresholdTuneFraction,
  export_to_asset: PARAMS.exportToAsset,
  asset_root: PARAMS.assetRoot
}));


// =====================================================
// 2) Dynamic environmental features (rolling window)
// =====================================================

var lstCollection = ee.ImageCollection('MODIS/061/MOD11A1')
  .filterDate(featureStartDate, runEndDate);
lstCollection = ee.ImageCollection(lstCollection.select(['LST_Day_1km']));

var lstKelvinRaw = ee.Image(lstCollection.mean());

var lstCelsius = lstKelvinRaw
  .multiply(0.02)
  .subtract(273.15)
  .rename('LST')
  .clip(regionGeom);

var s2Primary = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(featureStartDate, runEndDate)
  .filterBounds(regionGeom)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', PARAMS.cloudThreshold));

// Fallback window if short rolling window has zero Sentinel-2 images.
var s2Fallback = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterDate(s2FallbackStartDate, runEndDate)
  .filterBounds(regionGeom)
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', PARAMS.cloudThreshold));

var s2Collection = ee.ImageCollection(
  ee.Algorithms.If(ee.Number(s2Primary.size()).gt(0), s2Primary, s2Fallback)
);
var s2 = ee.Image(ee.ImageCollection(s2Collection).median()).clip(regionGeom);
var ndvi = s2.normalizedDifference(['B8', 'B4']).rename('NDVI');
var ndmi = s2.normalizedDifference(['B8', 'B11']).rename('NDMI');

// Meteorological variables from ERA5-Land hourly.
var era5 = ee.ImageCollection('ECMWF/ERA5_LAND/HOURLY')
  .filterDate(featureStartDate, runEndDate)
  .filterBounds(regionGeom);

var era5TempCollection = ee.ImageCollection(era5.select(['temperature_2m']));
var airTemp = ee.Image(era5TempCollection.mean())
  .subtract(273.15)
  .rename('AIR_TEMP')
  .clip(regionGeom);
var era5DewCollection = ee.ImageCollection(era5.select(['dewpoint_temperature_2m']));
var dewTemp = ee.Image(era5DewCollection.mean())
  .subtract(273.15)
  .rename('DEW_TEMP')
  .clip(regionGeom);
var relHumidity = airTemp.expression(
  '100 * exp((17.625 * td) / (243.04 + td) - (17.625 * t) / (243.04 + t))',
  {
    t: airTemp,
    td: dewTemp
  }
).clamp(0, 100).rename('RH');

var era5U10Collection = ee.ImageCollection(era5.select(['u_component_of_wind_10m']));
var u10 = ee.Image(era5U10Collection.mean())
  .rename('U10');
var era5V10Collection = ee.ImageCollection(era5.select(['v_component_of_wind_10m']));
var v10 = ee.Image(era5V10Collection.mean())
  .rename('V10');
var windSpeed = u10.pow(2).add(v10.pow(2)).sqrt().rename('WIND_SPEED').clip(regionGeom);
var era5PrecipCollection = ee.ImageCollection(era5.select(['total_precipitation_hourly']));
var precip = ee.Image(era5PrecipCollection.sum())
  .multiply(1000)
  .rename('PRECIP_MM')
  .clip(regionGeom);

// Human activity dynamic proxy (nightlights; telecom fallback proxy).
var viirsPrimary = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
  .filterDate(featureStartDate, runEndDate)
  .filterBounds(regionGeom);
var viirsFallback = ee.ImageCollection('NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG')
  .filterDate(viirsFallbackStartDate, runEndDate)
  .filterBounds(regionGeom);
var viirsCollection = ee.ImageCollection(
  ee.Algorithms.If(ee.Number(viirsPrimary.size()).gt(0), viirsPrimary, viirsFallback)
);
var viirsRadCollection = ee.ImageCollection(viirsCollection.select(['avg_rad']));
var nightLights = ee.Image(ee.Algorithms.If(
  ee.Number(viirsCollection.size()).gt(0),
  ee.Image(viirsRadCollection.mean()),
  ee.Image.constant(0)
))
  .rename('NIGHTLIGHTS')
  .unmask(0)
  .clip(regionGeom);

addOptionalLayer(lstCelsius, {
  min: 15,
  max: 50,
  palette: ['#313695', '#74add1', '#ffffbf', '#fdae61', '#a50026']
}, 'LST (C)');
addOptionalLayer(ndvi, {
  min: 0,
  max: 1,
  palette: ['#8c510a', '#f6e8c3', '#1b7837']
}, 'NDVI');
addOptionalLayer(ndmi, {
  min: -0.5,
  max: 0.5,
  palette: ['#b2182b', '#f7f7f7', '#2166ac']
}, 'NDMI');
addOptionalLayer(airTemp, {
  min: 0,
  max: 40,
  palette: ['#313695', '#74add1', '#ffffbf', '#f46d43', '#a50026']
}, 'Air temperature (C)');
addOptionalLayer(relHumidity, {
  min: 10,
  max: 100,
  palette: ['#a50026', '#fdae61', '#ffffbf', '#74add1', '#313695']
}, 'Relative humidity (%)');
addOptionalLayer(windSpeed, {
  min: 0,
  max: 15,
  palette: ['#f7fbff', '#6baed6', '#08306b']
}, 'Wind speed (m/s)');
addOptionalLayer(precip, {
  min: 0,
  max: 80,
  palette: ['#f7fcf0', '#74c476', '#00441b']
}, 'Precipitation (mm)');

vprint('Sentinel-2 images (primary):', s2Primary.size());
vprint('Sentinel-2 images (used):', s2Collection.size());
vprint('ERA5 hourly records:', era5.size());
vprint('Nightlights images (primary):', viirsPrimary.size());
vprint('Nightlights images (used):', viirsCollection.size());


// =====================================================
// 3) Static features (topography + land cover + human influence)
// =====================================================

var dem = ee.Image('USGS/SRTMGL1_003')
  .select('elevation')
  .clip(regionGeom)
  .rename('ELEV');
var terrain = ee.Terrain.products(dem);
var slope = terrain.select('slope').rename('SLOPE');
var aspect = terrain.select('aspect').rename('ASPECT');
var aspectRad = aspect.multiply(Math.PI / 180.0);
var aspectSin = aspectRad.sin().rename('ASPECT_SIN');
var aspectCos = aspectRad.cos().rename('ASPECT_COS');

// Land cover classes from ESA WorldCover.
var worldCover = ee.Image(ee.ImageCollection('ESA/WorldCover/v200')
  .first())
  .select('Map')
  .clip(regionGeom);
var lcForest = worldCover.eq(10).or(worldCover.eq(95)).rename('LC_FOREST');
var lcShrub = worldCover.eq(20).rename('LC_SHRUB');
var lcCrop = worldCover.eq(40).rename('LC_CROP');
var lcUrban = worldCover.eq(50).rename('LC_URBAN');

// Distance to settlements (built-up class).
var distSettlement = lcUrban.selfMask()
  .distance(ee.Kernel.euclidean(PARAMS.maxDistanceMeters, 'meters'))
  .unmask(PARAMS.maxDistanceMeters)
  .rename('DIST_SETTLEMENT')
  .clip(regionGeom);

// Optional distance to roads if user provides a valid roads asset.
var distRoad = ee.Image.constant(PARAMS.maxDistanceMeters)
  .rename('DIST_ROAD')
  .clip(regionGeom);
if (PARAMS.useRoadDistance && PARAMS.roadsAssetPath) {
  var roadsFc = ee.FeatureCollection(PARAMS.roadsAssetPath).filterBounds(regionGeom);
  var roadsRaster = ee.Image().byte().paint(roadsFc, 1).selfMask();
  distRoad = roadsRaster
    .distance(ee.Kernel.euclidean(PARAMS.maxDistanceMeters, 'meters'))
    .unmask(PARAMS.maxDistanceMeters)
    .rename('DIST_ROAD')
    .clip(regionGeom);
}

// Distance to historical fire-prone corridors.
var corridorCollection = ee.ImageCollection('MODIS/061/MCD64A1')
  .filterBounds(regionGeom)
  .filterDate(corridorStartDate, runEndDate)
  .select(['BurnDate']);
var corridorFireMask = ee.Image(ee.ImageCollection(corridorCollection.map(function(img) {
  return ee.Image(img).gt(0);
})).sum())
  .gte(2)
  .rename('FIRE_CORRIDOR');

var distFireCorridor = corridorFireMask.selfMask()
  .distance(ee.Kernel.euclidean(PARAMS.maxDistanceMeters, 'meters'))
  .unmask(PARAMS.maxDistanceMeters)
  .rename('DIST_FIRE_CORRIDOR')
  .clip(regionGeom);

addOptionalLayer(dem, {
  min: 0,
  max: 3000,
  palette: ['#edf8e9', '#74c476', '#00441b']
}, 'Elevation');
addOptionalLayer(slope, {
  min: 0,
  max: 60,
  palette: ['#f7fcfd', '#66c2a4', '#00441b']
}, 'Slope');
addOptionalLayer(worldCover, {}, 'WorldCover');
addOptionalLayer(distSettlement, {
  min: 0,
  max: PARAMS.maxDistanceMeters,
  palette: ['#67000d', '#fcae91', '#fee5d9']
}, 'Distance to settlements (m)');
addOptionalLayer(distFireCorridor, {
  min: 0,
  max: PARAMS.maxDistanceMeters,
  palette: ['#084081', '#43a2ca', '#f7fcf0']
}, 'Distance to fire corridors (m)');

vprint('Road distance enabled:', PARAMS.useRoadDistance);


// =====================================================
// 4) Feature stack
// =====================================================

var featureStack = ee.Image.cat([
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

var featureBands = [
  'LST',
  'NDVI',
  'NDMI',
  'AIR_TEMP',
  'RH',
  'WIND_SPEED',
  'PRECIP_MM',
  'NIGHTLIGHTS',
  'ELEV',
  'SLOPE',
  'ASPECT_SIN',
  'ASPECT_COS',
  'LC_FOREST',
  'LC_SHRUB',
  'LC_CROP',
  'LC_URBAN',
  'DIST_SETTLEMENT',
  'DIST_ROAD',
  'DIST_FIRE_CORRIDOR'
];
var regionMask = ee.Image.constant(1).clip(regionGeom).mask();
vprint('Feature bands:', featureBands);
vprint('FeatureStack:', featureStack);


// =====================================================
// 5) Fire labels (MCD64A1 primary + FIRMS fallback)
// =====================================================

var burnedArea = ee.ImageCollection('MODIS/061/MCD64A1')
  .filterBounds(regionGeom)
  .filterDate(labelStartDate, runEndDate)
  .select(['BurnDate']);

var burnedLabel = ee.Image(burnedArea.max())
  .gt(0)
  .toByte()
  .rename('Fire')
  .clip(regionGeom);

var burnedPixelsRaw = burnedLabel.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: regionGeom,
  scale: PARAMS.scale,
  maxPixels: 1e12,
  tileScale: 4
}).get('Fire');
var burnedPixels = ee.Number(ee.Algorithms.If(burnedPixelsRaw, burnedPixelsRaw, 0));

var firmsCollection = ee.ImageCollection('FIRMS')
  .filterBounds(regionGeom)
  .filterDate(labelStartDate, runEndDate)
  .select(['T21']);
var firmsFallbackLabel = ee.Image(firmsCollection.max())
  .gt(0)
  .focalMax(PARAMS.fireExpandPixels)
  .toByte()
  .rename('Fire')
  .clip(regionGeom);

var fireLabel = ee.Image(
  ee.Algorithms.If(burnedPixels.gt(0), burnedLabel, firmsFallbackLabel)
).unmask(0).toByte().rename('Fire');

var labelSourceUsed = ee.String(
  ee.Algorithms.If(burnedPixels.gt(0), 'MCD64A1', 'FIRMS_fallback')
);

var labelPixelsRaw = fireLabel.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: regionGeom,
  scale: PARAMS.scale,
  maxPixels: 1e12,
  tileScale: 4
}).get('Fire');
var labelPixels = ee.Number(ee.Algorithms.If(labelPixelsRaw, labelPixelsRaw, 0));
var labelStatus = ee.String(ee.Algorithms.If(labelPixels.gt(0), 'OK', 'NO_POSITIVE_PIXELS'));

print('Label status:', labelStatus);
vprint('Burned pixels (MCD64A1):', burnedPixels);
vprint('Label source used:', labelSourceUsed);
vprint('Final label positive pixels:', labelPixels);


// =====================================================
// 6) Build train/eval samples (lightweight + reproducible)
// =====================================================

var labeledImage = featureStack.addBands(fireLabel);
var trainNegPoints = Math.max(1, Math.round(PARAMS.trainSamplesPerClass * PARAMS.trainNegToPosRatio));
var trainPosPoints = Math.max(1, PARAMS.trainSamplesPerClass);

var trainSet = labeledImage.stratifiedSample({
  numPoints: 0,
  classBand: 'Fire',
  classValues: [0, 1],
  classPoints: [trainNegPoints, trainPosPoints],
  region: regionGeom,
  scale: PARAMS.scale,
  seed: PARAMS.seedTrain,
  dropNulls: true,
  geometries: false,
  tileScale: 8
}).map(function(f) {
  return f.set('Fire', ee.Number(f.get('Fire')).toInt());
})
.filter(ee.Filter.notNull(featureBands.concat(['Fire'])));

var evalSet = labeledImage.stratifiedSample({
  numPoints: 0,
  classBand: 'Fire',
  classValues: [0, 1],
  classPoints: [PARAMS.evalSamplesPerClass, PARAMS.evalSamplesPerClass],
  region: regionGeom,
  scale: PARAMS.scale,
  seed: PARAMS.seedEval,
  dropNulls: true,
  geometries: false,
  tileScale: 8
}).map(function(f) {
  return f.set('Fire', ee.Number(f.get('Fire')).toInt());
})
.filter(ee.Filter.notNull(featureBands.concat(['Fire'])));

print('Train size:', trainSet.size());
print('Eval size:', evalSet.size());
vprint('Train class distribution:', trainSet.aggregate_histogram('Fire'));
vprint('Eval class distribution:', evalSet.aggregate_histogram('Fire'));


// =====================================================
// 7) Train models (RF + GBT as XGBoost-like)
// =====================================================

var rfClassifier = ee.Classifier.smileRandomForest(PARAMS.rfTrees)
  .train({
    features: trainSet,
    classProperty: 'Fire',
    inputProperties: featureBands
  });

var rfProbClassifier = rfClassifier.setOutputMode('MULTIPROBABILITY');
var gbtClassifier = null;
var gbtProbClassifier = null;

if (PARAMS.runGbtModel) {
  gbtClassifier = ee.Classifier.smileGradientTreeBoost(PARAMS.gbtTrees)
    .train({
      features: trainSet,
      classProperty: 'Fire',
      inputProperties: featureBands
    });
  gbtProbClassifier = gbtClassifier.setOutputMode('MULTIPROBABILITY');
}

print('RF classifier:', rfClassifier);
vprint('GBT classifier (XGBoost-like):', gbtClassifier);


// =====================================================
// 8) Model evaluation helpers
// =====================================================

function addProbOnly(fc, probClassifier) {
  return fc.classify(probClassifier).map(function(f) {
    var probs = ee.Array(f.get('classification'));
    var p1 = ee.Number(probs.get([1]));
    return f.set('FireProb', p1);
  });
}

function addPredWithThreshold(probFc, threshold) {
  threshold = ee.Number(threshold);
  return probFc.map(function(f) {
    var p1 = ee.Number(f.get('FireProb'));
    var pred = ee.Number(ee.Algorithms.If(p1.gte(threshold), 1, 0));
    return f.set('PredClass', pred);
  });
}

function safeDivide(num, den) {
  return ee.Number(
    ee.Algorithms.If(ee.Number(den).gt(0), ee.Number(num).divide(den), 0)
  );
}

function metricsFromEval(evalPredFc) {
  var cm = evalPredFc.errorMatrix('Fire', 'PredClass');
  var tn = ee.Number(evalPredFc
    .filter(ee.Filter.eq('Fire', 0))
    .filter(ee.Filter.eq('PredClass', 0))
    .size());
  var fp = ee.Number(evalPredFc
    .filter(ee.Filter.eq('Fire', 0))
    .filter(ee.Filter.eq('PredClass', 1))
    .size());
  var fn = ee.Number(evalPredFc
    .filter(ee.Filter.eq('Fire', 1))
    .filter(ee.Filter.eq('PredClass', 0))
    .size());
  var tp = ee.Number(evalPredFc
    .filter(ee.Filter.eq('Fire', 1))
    .filter(ee.Filter.eq('PredClass', 1))
    .size());

  var firePrecision = safeDivide(tp, tp.add(fp));
  var fireRecall = safeDivide(tp, tp.add(fn));
  var fireF1 = safeDivide(
    firePrecision.multiply(fireRecall).multiply(2),
    firePrecision.add(fireRecall)
  );
  var specificity = safeDivide(tn, tn.add(fp));
  var balancedAccuracy = fireRecall.add(specificity).divide(2);

  return ee.Dictionary({
    confusion_matrix: cm,
    accuracy: cm.accuracy(),
    kappa: cm.kappa(),
    tn: tn,
    fp: fp,
    fn: fn,
    tp: tp,
    fire_precision: firePrecision,
    fire_recall: fireRecall,
    fire_f1: fireF1,
    specificity: specificity,
    balanced_accuracy: balancedAccuracy
  });
}

function buildThresholdGrid(evalProbFc, thresholdList, modelName) {
  return ee.FeatureCollection(ee.List(thresholdList).map(function(t) {
    var threshold = ee.Number(t);
    var predFc = addPredWithThreshold(evalProbFc, threshold);
    var m = metricsFromEval(predFc);
    return ee.Feature(null, {
      model: modelName,
      threshold: threshold,
      fire_f1: ee.Number(m.get('fire_f1')),
      balanced_accuracy: ee.Number(m.get('balanced_accuracy')),
      fire_precision: ee.Number(m.get('fire_precision')),
      fire_recall: ee.Number(m.get('fire_recall'))
    });
  }));
}


// =====================================================
// 9) Compare models and select best by fire F1
// =====================================================

var evalTuneSet = ee.FeatureCollection([]);
var evalReportSet = evalSet;
if (PARAMS.autoTuneThreshold) {
  var evalClass0 = evalSet
    .filter(ee.Filter.eq('Fire', 0))
    .randomColumn('split0', PARAMS.seedEval + 10)
    .sort('split0');
  var evalClass1 = evalSet
    .filter(ee.Filter.eq('Fire', 1))
    .randomColumn('split1', PARAMS.seedEval + 11)
    .sort('split1');

  var evalClass0Size = evalClass0.size();
  var evalClass1Size = evalClass1.size();
  var evalClass0TuneCount = ee.Number(evalClass0Size)
    .multiply(PARAMS.thresholdTuneFraction)
    .floor()
    .max(1);
  var evalClass1TuneCount = ee.Number(evalClass1Size)
    .multiply(PARAMS.thresholdTuneFraction)
    .floor()
    .max(1);

  var evalClass0Tune = evalClass0.limit(evalClass0TuneCount);
  var evalClass1Tune = evalClass1.limit(evalClass1TuneCount);
  var evalClass0Report = evalClass0.limit(
    ee.Number(evalClass0Size).subtract(evalClass0TuneCount).max(1),
    'split0',
    false
  );
  var evalClass1Report = evalClass1.limit(
    ee.Number(evalClass1Size).subtract(evalClass1TuneCount).max(1),
    'split1',
    false
  );

  evalTuneSet = evalClass0Tune.merge(evalClass1Tune);
  evalReportSet = evalClass0Report.merge(evalClass1Report);
}

vprint('Eval tune size:', evalTuneSet.size());
vprint('Eval report size:', evalReportSet.size());
vprint('Eval tune class distribution:', evalTuneSet.aggregate_histogram('Fire'));
vprint('Eval report class distribution:', evalReportSet.aggregate_histogram('Fire'));

var rfTuneWithProb = addProbOnly(evalTuneSet, rfProbClassifier);
var gbtTuneWithProb = ee.FeatureCollection([]);

var rfBestThreshold = ee.Number(PARAMS.riskThreshold);
var gbtBestThreshold = ee.Number(PARAMS.riskThreshold);
var rfThresholdGrid = ee.FeatureCollection([]);
var gbtThresholdGrid = ee.FeatureCollection([]);

if (PARAMS.autoTuneThreshold) {
  rfThresholdGrid = buildThresholdGrid(
    rfTuneWithProb,
    PARAMS.thresholdCandidates,
    'RF'
  );

  var rfBestRow = rfThresholdGrid
    .sort('balanced_accuracy', false)
    .sort('fire_f1', false)
    .first();

  rfBestThreshold = ee.Number(rfBestRow.get('threshold'));

  vprint('RF threshold tuning table:', rfThresholdGrid);
}

if (PARAMS.autoTuneThreshold && PARAMS.runGbtModel) {
  gbtTuneWithProb = addProbOnly(evalTuneSet, gbtProbClassifier);
  gbtThresholdGrid = buildThresholdGrid(
    gbtTuneWithProb,
    PARAMS.thresholdCandidates,
    'GBT'
  );
  var gbtBestRow = gbtThresholdGrid
    .sort('balanced_accuracy', false)
    .sort('fire_f1', false)
    .first();
  gbtBestThreshold = ee.Number(gbtBestRow.get('threshold'));
  vprint('GBT threshold tuning table:', gbtThresholdGrid);
}

print('RF threshold used:', rfBestThreshold);
vprint('GBT threshold used:', gbtBestThreshold);

var rfEvalWithProb = addPredWithThreshold(
  addProbOnly(evalReportSet, rfProbClassifier),
  rfBestThreshold
).map(function(f) {
  return f.set('Model', 'RF');
});

var gbtEvalWithProb = ee.FeatureCollection([]);
if (PARAMS.runGbtModel) {
  gbtEvalWithProb = addPredWithThreshold(
    addProbOnly(evalReportSet, gbtProbClassifier),
    gbtBestThreshold
  ).map(function(f) {
    return f.set('Model', 'GBT');
  });
}

var rfMetrics = metricsFromEval(rfEvalWithProb);
var gbtMetrics = ee.Dictionary({
  confusion_matrix: null,
  accuracy: -1,
  kappa: -1,
  tn: -1,
  fp: -1,
  fn: -1,
  tp: -1,
  fire_precision: -1,
  fire_recall: -1,
  fire_f1: -1,
  specificity: -1,
  balanced_accuracy: -1
});
if (PARAMS.runGbtModel) {
  gbtMetrics = metricsFromEval(gbtEvalWithProb);
}

print('RF metrics:', rfMetrics);
vprint('GBT metrics:', gbtMetrics);

var rfFireF1 = ee.Number(rfMetrics.get('fire_f1'));
var gbtFireF1 = PARAMS.runGbtModel ? ee.Number(gbtMetrics.get('fire_f1')) : ee.Number(-1);
var useRF = PARAMS.runGbtModel ? rfFireF1.gte(gbtFireF1) : true;
var selectedModelName = ee.String(ee.Algorithms.If(useRF, 'RandomForest', 'GradientTreeBoost'));
var selectedThreshold = ee.Number(ee.Algorithms.If(useRF, rfBestThreshold, gbtBestThreshold));
var thresholdMode = PARAMS.autoTuneThreshold ? ee.String('AUTO_TUNED') : ee.String('FIXED');
print('Selected model (max Fire F1):', selectedModelName);
print('Selected threshold:', selectedThreshold);
print('Threshold mode:', thresholdMode);


// =====================================================
// 10) Output products from selected model
// =====================================================

var rfRiskProb = featureStack
  .classify(rfProbClassifier)
  .arrayGet([1])
  .rename('RF_RiskProb')
  .updateMask(regionMask)
  .clip(regionGeom);

var gbtRiskProb = rfRiskProb.rename('GBT_RiskProb');
if (PARAMS.runGbtModel) {
  gbtRiskProb = featureStack
    .classify(gbtProbClassifier)
    .arrayGet([1])
    .rename('GBT_RiskProb')
    .updateMask(regionMask)
    .clip(regionGeom);
}

var fireRiskProb = ee.Image(ee.Algorithms.If(useRF, rfRiskProb, gbtRiskProb))
  .rename('FireRiskProb')
  .updateMask(regionMask)
  .clip(regionGeom);

var riskBinary = fireRiskProb
  .gte(selectedThreshold)
  .toByte()
  .rename('RiskBinary')
  .updateMask(regionMask)
  .clip(regionGeom);

var riskClasses = fireRiskProb.expression(
  '(p < b1) ? 1 : (p < b2) ? 2 : (p < b3) ? 3 : (p < b4) ? 4 : 5',
  {
    p: fireRiskProb,
    b1: PARAMS.classBreak1,
    b2: PARAMS.classBreak2,
    b3: PARAMS.classBreak3,
    b4: PARAMS.classBreak4
  }
).toByte().rename('RiskClass')
  .updateMask(regionMask)
  .clip(regionGeom);

var riskProbVis = {
  min: 0,
  max: 1,
  palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']
};
var riskClassVis = {
  min: 1,
  max: 5,
  palette: ['#4575b4', '#91bfdb', '#ffffbf', '#fdae61', '#d73027']
};

var riskProbLayer = ui.Map.Layer(fireRiskProb, riskProbVis, 'Fire-risk probability', true, 0.9);
var riskClassLayer = ui.Map.Layer(riskClasses, riskClassVis, 'Thresholded risk classes', true, 0.85);
var riskBinaryLayer = ui.Map.Layer(riskBinary.selfMask(), {palette: ['#ff00ff']}, 'Thresholded binary risk', false, 0.9);
var labelLayer = ui.Map.Layer(fireLabel.selfMask(), {palette: ['#ff0000']}, 'Label (Fire)', false, 0.8);

Map.layers().add(riskProbLayer);
Map.layers().add(riskClassLayer);
Map.layers().add(riskBinaryLayer);
Map.layers().add(labelLayer);


// =====================================================
// 11) Final selected-model validation report
// =====================================================

var useRFNumber = ee.Number(ee.Algorithms.If(useRF, 1, 0));
var rfEvalTagged = rfEvalWithProb.map(function(f) {
  return f.set({
    Model: 'RF',
    is_selected: useRFNumber
  });
});
var gbtEvalTagged = gbtEvalWithProb.map(function(f) {
  return f.set({
    Model: 'GBT',
    is_selected: ee.Number(1).subtract(useRFNumber)
  });
});

var evalWithProb = rfEvalTagged
  .merge(gbtEvalTagged)
  .filter(ee.Filter.eq('is_selected', 1));
var selectedMetrics = metricsFromEval(evalWithProb);
var confusionMatrix = evalWithProb.errorMatrix('Fire', 'PredClass');

print('Selected confusion matrix:', confusionMatrix);
print('Selected accuracy:', selectedMetrics.get('accuracy'));
print('Selected kappa:', selectedMetrics.get('kappa'));
print('TN/FP/FN/TP:', ee.Dictionary({
  TN: selectedMetrics.get('tn'),
  FP: selectedMetrics.get('fp'),
  FN: selectedMetrics.get('fn'),
  TP: selectedMetrics.get('tp')
}));
print('Fire precision:', selectedMetrics.get('fire_precision'));
print('Fire recall:', selectedMetrics.get('fire_recall'));
print('Fire F1:', selectedMetrics.get('fire_f1'));
print('Specificity (class 0):', selectedMetrics.get('specificity'));
print('Balanced accuracy:', selectedMetrics.get('balanced_accuracy'));

var rfExplain = ee.Dictionary(rfClassifier.explain());
var gbtExplain = ee.Dictionary({});
if (PARAMS.runGbtModel) {
  gbtExplain = ee.Dictionary(gbtClassifier.explain());
}
var rfImportance = ee.Dictionary(rfExplain.get('importance'));
var gbtImportance = ee.Dictionary(
  ee.Algorithms.If(gbtExplain.contains('importance'), gbtExplain.get('importance'), ee.Dictionary({}))
);
var selectedImportance = ee.Dictionary(ee.Algorithms.If(useRF, rfImportance, gbtImportance));
print('Selected feature importance:', selectedImportance);

var importanceFc = ee.FeatureCollection(selectedImportance.keys().map(function(k) {
  var key = ee.String(k);
  return ee.Feature(null, {
    feature: key,
    importance: ee.Number(selectedImportance.get(key))
  });
}));

var runReport = ee.FeatureCollection([
  ee.Feature(null, {
    run_date: runDateString,
    feature_window_days: featureWindowDays,
    label_window_days: PARAMS.labelWindowDays,
    cloud_threshold: PARAMS.cloudThreshold,
    scale_m: PARAMS.scale,
    label_source: labelSourceUsed,
    label_status: labelStatus,
    train_size: trainSet.size(),
    eval_size: evalSet.size(),
    eval_tune_size: evalTuneSet.size(),
    eval_report_size: evalReportSet.size(),
    selected_model: selectedModelName,
    threshold_mode: thresholdMode,
    rf_threshold: rfBestThreshold,
    gbt_threshold: gbtBestThreshold,
    selected_threshold: selectedThreshold,
    rf_fire_f1: rfMetrics.get('fire_f1'),
    gbt_fire_f1: gbtMetrics.get('fire_f1'),
    rf_balanced_acc: rfMetrics.get('balanced_accuracy'),
    gbt_balanced_acc: gbtMetrics.get('balanced_accuracy'),
    accuracy: selectedMetrics.get('accuracy'),
    kappa: selectedMetrics.get('kappa'),
    fire_precision: selectedMetrics.get('fire_precision'),
    fire_recall: selectedMetrics.get('fire_recall'),
    fire_f1: selectedMetrics.get('fire_f1'),
    specificity: selectedMetrics.get('specificity'),
    balanced_accuracy: selectedMetrics.get('balanced_accuracy'),
    risk_threshold_input: PARAMS.riskThreshold,
    class_break1: PARAMS.classBreak1,
    class_break2: PARAMS.classBreak2,
    class_break3: PARAMS.classBreak3,
    class_break4: PARAMS.classBreak4
  })
]);
print('Run report preview:', runReport);

var evalPredictionsRaw = evalWithProb
  .limit(PARAMS.evalExportRows)
  .map(function(f) {
    return ee.Feature(null, {
      Fire: ee.Number(f.get('Fire')),
      FireProb: ee.Number(f.get('FireProb')),
      PredClass: ee.Number(f.get('PredClass')),
      Model: ee.String(f.get('Model'))
    });
  });

// Add/remove one schema row so Console and CSV keep explicit columns.
var evalSchemaRow = ee.Feature(null, {
  Fire: -1,
  FireProb: -1,
  PredClass: -1,
  Model: 'SCHEMA_ROW'
});

var evalPredictionsFc = ee.FeatureCollection([evalSchemaRow])
  .merge(evalPredictionsRaw)
  .filter(ee.Filter.neq('Model', 'SCHEMA_ROW'))
  .select(['Fire', 'FireProb', 'PredClass', 'Model']);
print('Eval predictions columns:', ee.Feature(evalPredictionsFc.first()).propertyNames());
print('Eval predictions preview:', evalPredictionsFc.limit(10));


// =====================================================
// 12) Simple UI controls + legend
// =====================================================

var controlPanel = ui.Panel({
  style: {
    position: 'top-right',
    width: '330px',
    padding: '8px'
  }
});

controlPanel.add(ui.Label('Fire-Risk Controls', {
  fontWeight: 'bold',
  fontSize: '14px'
}));
var selectedModelUiLabel = ui.Label('Selected model: computing...');
var selectedThresholdUiLabel = ui.Label('Selected threshold: computing...');
controlPanel.add(selectedModelUiLabel);
controlPanel.add(selectedThresholdUiLabel);
controlPanel.add(ui.Label('Threshold mode: ' + (PARAMS.autoTuneThreshold ? 'AUTO_TUNED' : 'FIXED')));
controlPanel.add(ui.Label('Window mode: ' + PARAMS.windowMode));
controlPanel.add(ui.Label('Run date: ' + runDateString));
controlPanel.add(ui.Label('Cloud threshold: ' + PARAMS.cloudThreshold + '%'));
controlPanel.add(ui.Label('Scale: ' + PARAMS.scale + ' m'));

var thresholdLabel = ui.Label('Risk threshold: ' + PARAMS.riskThreshold.toFixed(2));
var thresholdSlider = ui.Slider({
  min: 0,
  max: 1,
  value: PARAMS.riskThreshold,
  step: 0.01,
  onChange: function(v) {
    thresholdLabel.setValue('Risk threshold: ' + v.toFixed(2));
    var updatedBinary = fireRiskProb.gte(ee.Number(v)).selfMask().toByte();
    riskBinaryLayer.setEeObject(updatedBinary);
  }
});

selectedModelName.evaluate(function(v) {
  selectedModelUiLabel.setValue('Selected model: ' + v);
});
selectedThreshold.evaluate(function(v) {
  var t = Number(v);
  if (!isNaN(t)) {
    selectedThresholdUiLabel.setValue('Selected threshold: ' + t.toFixed(2));
    thresholdLabel.setValue('Risk threshold: ' + t.toFixed(2));
    thresholdSlider.setValue(t);
  }
});

var probToggle = ui.Checkbox({
  label: 'Show probability layer',
  value: true,
  onChange: function(v) { riskProbLayer.setShown(v); }
});
var classToggle = ui.Checkbox({
  label: 'Show risk classes layer',
  value: true,
  onChange: function(v) { riskClassLayer.setShown(v); }
});
var binaryToggle = ui.Checkbox({
  label: 'Show binary threshold layer',
  value: false,
  onChange: function(v) { riskBinaryLayer.setShown(v); }
});
var labelToggle = ui.Checkbox({
  label: 'Show fire label layer',
  value: false,
  onChange: function(v) { labelLayer.setShown(v); }
});

controlPanel.add(thresholdLabel);
controlPanel.add(thresholdSlider);
controlPanel.add(probToggle);
controlPanel.add(classToggle);
controlPanel.add(binaryToggle);
controlPanel.add(labelToggle);
Map.add(controlPanel);

var legend = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 10px'
  }
});
legend.add(ui.Label('Risk Classes', {fontWeight: 'bold'}));

function addLegendRow(color, name) {
  var colorBox = ui.Label('', {
    backgroundColor: color,
    padding: '8px',
    margin: '0 0 4px 0'
  });
  var desc = ui.Label(name, {margin: '0 0 4px 6px'});
  legend.add(ui.Panel([colorBox, desc], ui.Panel.Layout.Flow('horizontal')));
}

addLegendRow('#4575b4', '1 = Very Low');
addLegendRow('#91bfdb', '2 = Low');
addLegendRow('#ffffbf', '3 = Medium');
addLegendRow('#fdae61', '4 = High');
addLegendRow('#d73027', '5 = Very High');
Map.add(legend);


// =====================================================
// 13) Exports (GeoTIFF + CSV)
// =====================================================

var assetIds = {
  riskProb: PARAMS.assetRoot
    ? PARAMS.assetRoot + '/' + PARAMS.assetNamePrefix + '_risk_prob_' + assetDateTag
    : '',
  riskClass: PARAMS.assetRoot
    ? PARAMS.assetRoot + '/' + PARAMS.assetNamePrefix + '_risk_class_' + assetDateTag
    : '',
  riskBinary: PARAMS.assetRoot
    ? PARAMS.assetRoot + '/' + PARAMS.assetNamePrefix + '_risk_binary_' + assetDateTag
    : ''
};

print('Operational asset IDs:', ee.Dictionary(assetIds));

if (PARAMS.exportToDrive) {
  Export.image.toDrive({
    image: fireRiskProb.float(),
    description: PARAMS.exportPrefix + '_risk_prob_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_risk_prob_' + runDateString,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  Export.image.toDrive({
    image: riskClasses.toByte(),
    description: PARAMS.exportPrefix + '_risk_class_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_risk_class_' + runDateString,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  Export.image.toDrive({
    image: riskBinary.toByte(),
    description: PARAMS.exportPrefix + '_risk_binary_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_risk_binary_' + runDateString,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  Export.image.toDrive({
    image: fireLabel.toByte(),
    description: PARAMS.exportPrefix + '_label_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_label_' + runDateString,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  Export.image.toDrive({
    image: featureStack.float(),
    description: PARAMS.exportPrefix + '_inputs_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_inputs_' + runDateString,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  print('Image export tasks created in the Tasks tab.');
} else {
  print('Image exports disabled. Set PARAMS.exportToDrive = true.');
}

if (PARAMS.exportToAsset && PARAMS.assetRoot) {
  Export.image.toAsset({
    image: fireRiskProb.float(),
    description: PARAMS.assetNamePrefix + '_risk_prob_asset_' + assetDateTag,
    assetId: assetIds.riskProb,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  Export.image.toAsset({
    image: riskClasses.toByte(),
    description: PARAMS.assetNamePrefix + '_risk_class_asset_' + assetDateTag,
    assetId: assetIds.riskClass,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  Export.image.toAsset({
    image: riskBinary.toByte(),
    description: PARAMS.assetNamePrefix + '_risk_binary_asset_' + assetDateTag,
    assetId: assetIds.riskBinary,
    region: regionGeom,
    scale: PARAMS.scale,
    maxPixels: 1e13
  });

  print('Asset export tasks created in the Tasks tab.');
} else {
  print('Asset exports disabled. Set PARAMS.exportToAsset = true and PARAMS.assetRoot.');
}

if (PARAMS.exportTablesToDrive) {
  Export.table.toDrive({
    collection: runReport,
    description: PARAMS.exportPrefix + '_run_report_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_run_report_' + runDateString,
    fileFormat: 'CSV'
  });

  Export.table.toDrive({
    collection: importanceFc,
    description: PARAMS.exportPrefix + '_feature_importance_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_feature_importance_' + runDateString,
    fileFormat: 'CSV'
  });

  Export.table.toDrive({
    collection: evalPredictionsFc,
    description: PARAMS.exportPrefix + '_eval_predictions_' + runDateString,
    folder: PARAMS.exportFolder,
    fileNamePrefix: PARAMS.exportPrefix + '_eval_predictions_' + runDateString,
    fileFormat: 'CSV'
  });

  print('Table export tasks created in the Tasks tab.');
} else {
  print('Table exports disabled. Set PARAMS.exportTablesToDrive = true.');
}
