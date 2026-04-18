// =====================================================
// Final Operational Earth Engine App
// Ready for the exported Antalya assets dated 2024-08-15.
// =====================================================

var CONFIG = {
  regionCountry: 'Turkey',
  regionLevel1: 'Antalya',

  // Fixed to the successful operational export date.
  runDate: '2024-08-15',

  // Project asset root.
  assetRoot: 'projects/wildfire-540/assets/fire_risk_ops',
  assetNamePrefix: 'antalya_fire_risk',

  // Explicit asset IDs for the current published run.
  riskProbAssetId: 'projects/wildfire-540/assets/fire_risk_ops/antalya_fire_risk_risk_prob_20240815',
  riskClassAssetId: 'projects/wildfire-540/assets/fire_risk_ops/antalya_fire_risk_risk_class_20240815',
  riskBinaryAssetId: 'projects/wildfire-540/assets/fire_risk_ops/antalya_fire_risk_risk_binary_20240815',

  selectedModel: 'RandomForest',
  selectedThreshold: 0.50,
  alertThreshold: 0.70,
  highRiskClassMin: 4,
  watchThreshold: 0.55,
  scale: 1000
};

var runDateString = CONFIG.runDate;
var assetDateTag = runDateString.replace(/-/g, '');
var runDate = ee.Date(runDateString);
var activeFireStart = runDate.advance(-1, 'day');

var level1 = ee.FeatureCollection('FAO/GAUL/2015/level1');
var level2 = ee.FeatureCollection('FAO/GAUL/2015/level2');

var regionFc = level1
  .filter(ee.Filter.eq('ADM0_NAME', CONFIG.regionCountry))
  .filter(ee.Filter.eq('ADM1_NAME', CONFIG.regionLevel1));

var districts = level2
  .filter(ee.Filter.eq('ADM0_NAME', CONFIG.regionCountry))
  .filter(ee.Filter.eq('ADM1_NAME', CONFIG.regionLevel1));

var regionGeom = regionFc.geometry();
var emptyMask = ee.Image.constant(0).updateMask(ee.Image.constant(0));

function buildAssetId(kind) {
  return CONFIG.assetRoot + '/' + CONFIG.assetNamePrefix + '_' + kind + '_' + assetDateTag;
}

var derivedAssetIds = {
  riskProb: CONFIG.riskProbAssetId || buildAssetId('risk_prob'),
  riskClass: CONFIG.riskClassAssetId || buildAssetId('risk_class'),
  riskBinary: CONFIG.riskBinaryAssetId || buildAssetId('risk_binary')
};

function loadImage(assetId, bandName) {
  return ee.Image(assetId).rename(bandName).clip(regionGeom);
}

var riskProb = loadImage(derivedAssetIds.riskProb, 'FireRiskProb');
var riskClass = loadImage(derivedAssetIds.riskClass, 'RiskClass');
var riskBinary = loadImage(derivedAssetIds.riskBinary, 'RiskBinary');

var activeFireImages = ee.ImageCollection('FIRMS')
  .filterBounds(regionGeom)
  .filterDate(activeFireStart, runDate);

var activeFireMask = ee.Image(ee.Algorithms.If(
  activeFireImages.size().gt(0),
  activeFireImages.select('T21').max().gt(0).selfMask().rename('ActiveFire'),
  emptyMask.rename('ActiveFire')
)).clip(regionGeom);

var activeFirePoints = ee.FeatureCollection(ee.Algorithms.If(
  activeFireImages.size().gt(0),
  activeFireImages.map(function(img) {
    return img.select('T21').gt(0).selfMask().reduceToVectors({
      geometry: regionGeom,
      scale: 1000,
      geometryType: 'centroid',
      maxPixels: 1e12
    }).map(function(feature) {
      return feature.set('detected_at', img.date().format('YYYY-MM-dd HH:mm'));
    });
  }).flatten(),
  ee.FeatureCollection([])
));

var highRiskMask = riskClass.gte(CONFIG.highRiskClassMin).rename('HighRiskMask');
var pixelAreaHa = ee.Image.pixelArea().divide(10000);
var totalAreaHaImage = ee.Image.constant(1).rename('TotalArea').multiply(pixelAreaHa);

function safeNumber(value) {
  return ee.Number(ee.Algorithms.If(value, value, 0));
}

var districtSummary = districts.map(function(district) {
  var geom = district.geometry();

  var meanRisk = safeNumber(riskProb.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: geom,
    scale: CONFIG.scale,
    maxPixels: 1e12
  }).get('FireRiskProb'));

  var maxRisk = safeNumber(riskProb.reduceRegion({
    reducer: ee.Reducer.max(),
    geometry: geom,
    scale: CONFIG.scale,
    maxPixels: 1e12
  }).get('FireRiskProb'));

  var highRiskAreaHa = safeNumber(highRiskMask.multiply(pixelAreaHa).reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geom,
    scale: CONFIG.scale,
    maxPixels: 1e12
  }).get('HighRiskMask'));

  var totalAreaHa = safeNumber(totalAreaHaImage.reduceRegion({
    reducer: ee.Reducer.sum(),
    geometry: geom,
    scale: CONFIG.scale,
    maxPixels: 1e12
  }).get('TotalArea'));

  var highRiskPct = ee.Number(ee.Algorithms.If(
    totalAreaHa.gt(0),
    highRiskAreaHa.divide(totalAreaHa).multiply(100),
    0
  ));

  var hotspotCount = activeFirePoints.filterBounds(geom).size();
  var severity = ee.String(ee.Algorithms.If(
    hotspotCount.gt(0).and(maxRisk.gte(CONFIG.alertThreshold)),
    'Critical',
    ee.Algorithms.If(
      maxRisk.gte(CONFIG.alertThreshold).or(highRiskPct.gte(10)),
      'Warning',
      ee.Algorithms.If(maxRisk.gte(CONFIG.watchThreshold), 'Watch', 'Normal')
    )
  ));

  return district.set({
    district_name: district.get('ADM2_NAME'),
    mean_risk: meanRisk,
    max_fire_prob: maxRisk,
    high_or_very_high_area_pct: highRiskPct,
    hotspot_count_24h: hotspotCount,
    severity: severity
  });
});

var topDistrict = districtSummary.sort('max_fire_prob', false).first();

Map.centerObject(regionFc, 8);
Map.setOptions('TERRAIN');

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

var riskProbLayer = ui.Map.Layer(riskProb, riskProbVis, 'Fire-risk probability', true, 0.90);
var riskClassLayer = ui.Map.Layer(riskClass, riskClassVis, 'Risk classes', true, 0.85);
var riskBinaryLayer = ui.Map.Layer(
  riskBinary.selfMask(),
  {palette: ['#ff00ff']},
  'Binary alert map',
  false,
  0.90
);
var activeFireLayer = ui.Map.Layer(
  activeFireMask,
  {palette: ['#ff2200']},
  'Active fires (24h)',
  true,
  0.95
);
var districtLayer = ui.Map.Layer(districts.style({
  color: '#222222',
  fillColor: '00000000',
  width: 1
}), {}, 'District boundaries', false);

Map.layers().reset([
  riskProbLayer,
  riskClassLayer,
  riskBinaryLayer,
  activeFireLayer,
  districtLayer
]);

var panel = ui.Panel({
  style: {
    position: 'top-right',
    width: '370px',
    padding: '10px'
  }
});

panel.add(ui.Label('Antalya Fire-Risk App', {
  fontWeight: 'bold',
  fontSize: '16px'
}));
panel.add(ui.Label('Run date: ' + runDateString));
panel.add(ui.Label('Model: ' + CONFIG.selectedModel));
panel.add(ui.Label('Selected threshold: ' + CONFIG.selectedThreshold.toFixed(2)));
panel.add(ui.Label('Alert threshold: ' + CONFIG.alertThreshold.toFixed(2)));

var togglesTitle = ui.Label('Layers', {fontWeight: 'bold', margin: '10px 0 4px 0'});
panel.add(togglesTitle);

function addToggle(label, layer, initialValue) {
  panel.add(ui.Checkbox({
    label: label,
    value: initialValue,
    onChange: function(v) {
      layer.setShown(v);
    }
  }));
}

addToggle('Show probability layer', riskProbLayer, true);
addToggle('Show risk classes layer', riskClassLayer, true);
addToggle('Show binary alert layer', riskBinaryLayer, false);
addToggle('Show active fires (24h)', activeFireLayer, true);
addToggle('Show district boundaries', districtLayer, false);

panel.add(ui.Label('District summary', {
  fontWeight: 'bold',
  margin: '10px 0 4px 0'
}));

var infoPanel = ui.Panel();
panel.add(infoPanel);

function renderDistrictInfo(feature) {
  infoPanel.clear();
  if (!feature || !feature.properties) {
    infoPanel.add(ui.Label('No district selected.'));
    return;
  }

  var props = feature.properties;
  infoPanel.add(ui.Label(props.district_name, {
    fontWeight: 'bold',
    fontSize: '14px'
  }));
  infoPanel.add(ui.Label('Severity: ' + props.severity));
  infoPanel.add(ui.Label('Mean risk: ' + Number(props.mean_risk || 0).toFixed(2)));
  infoPanel.add(ui.Label('Max probability: ' + Number(props.max_fire_prob || 0).toFixed(2)));
  infoPanel.add(ui.Label(
    'High/very-high area %: ' + Number(props.high_or_very_high_area_pct || 0).toFixed(1)
  ));
  infoPanel.add(ui.Label('Hotspots (24h): ' + props.hotspot_count_24h));
}

topDistrict.evaluate(function(feature) {
  renderDistrictInfo(feature);
});

var districtNames = ee.List(districtSummary.aggregate_array('district_name')).sort().getInfo();
var districtSelect = ui.Select({
  items: districtNames,
  placeholder: 'Select district',
  onChange: function(name) {
    var selected = districtSummary.filter(ee.Filter.eq('district_name', name)).first();
    selected.evaluate(function(feature) {
      renderDistrictInfo(feature);
    });
    Map.centerObject(ee.Feature(selected), 10);
  }
});
panel.add(districtSelect);

var topRiskPanel = ui.Panel();
topRiskPanel.add(ui.Label('Top 5 districts', {
  fontWeight: 'bold',
  margin: '10px 0 4px 0'
}));

districtSummary
  .sort('max_fire_prob', false)
  .limit(5)
  .evaluate(function(fc) {
    if (!fc || !fc.features) {
      return;
    }
    fc.features.forEach(function(feature) {
      var props = feature.properties;
      topRiskPanel.add(ui.Label(
        props.district_name +
        ' | p=' + Number(props.max_fire_prob || 0).toFixed(2) +
        ' | hotspots=' + props.hotspot_count_24h +
        ' | ' + props.severity
      ));
    });
  });

panel.add(topRiskPanel);

var assetsPanel = ui.Panel();
assetsPanel.add(ui.Label('Published assets', {
  fontWeight: 'bold',
  margin: '10px 0 4px 0'
}));
assetsPanel.add(ui.Label('Probability: ' + derivedAssetIds.riskProb));
assetsPanel.add(ui.Label('Risk classes: ' + derivedAssetIds.riskClass));
assetsPanel.add(ui.Label('Binary risk: ' + derivedAssetIds.riskBinary));
panel.add(assetsPanel);

var legend = ui.Panel({
  style: {
    margin: '10px 0 0 0'
  }
});
legend.add(ui.Label('Risk classes', {fontWeight: 'bold'}));

function addLegendRow(color, label) {
  var box = ui.Label('', {
    backgroundColor: color,
    padding: '8px',
    margin: '0 0 4px 0'
  });
  var text = ui.Label(label, {margin: '0 0 4px 6px'});
  legend.add(ui.Panel([box, text], ui.Panel.Layout.Flow('horizontal')));
}

addLegendRow('#4575b4', '1 = Very Low');
addLegendRow('#91bfdb', '2 = Low');
addLegendRow('#ffffbf', '3 = Medium');
addLegendRow('#fdae61', '4 = High');
addLegendRow('#d73027', '5 = Very High');

panel.add(legend);
Map.add(panel);

print('Operational run date:', runDateString);
print('Expected asset IDs:', ee.Dictionary(derivedAssetIds));
print('Operational district summary:', districtSummary);
print('Active fire points (24h):', activeFirePoints.limit(20));
