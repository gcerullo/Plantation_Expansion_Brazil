
//29.01.2024

//This code calculates the following annual predictors at ~10km2 by directly interfacing with the MapBiomas portal (verson 7): 
//note. plantation cover, 100km buff, 50 km buff, cropland cover, pasture cover, opportunity cost, and eucalyptus suitability 

//Note; this requires the reading in of assets defining: 
//1. The basescale and resolution
//2. Opportunity costs seperately calculated for pasture and croplands from Strassburg et al. 2020. 
//3. Biophyical suitability for forestry, calculated from Freitas et al. 2018


//==========================================================================================
//IMPORT DEPENDENCEIS 
//==========================================================================================

var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil')).geometry().bounds();
Map.addLayer(Brazil, {}, 'Brazil', false);
//import a 10KM raster as the base 
var base_raster = ee.Image('users/GRC95/BaseScaleRasters/baseRaster10km2Molleweide');
Map.addLayer(base_raster, {}, 'base_raster', false);
var base_rasterProjection = base_raster.projection();
//print('base raster projection:', base_rasterProjection);
var base_scale = base_raster.projection().nominalScale();
//print('base raster scale:', base_scale);

//===========================================================================================
// INTERFACE WITH AND READ IN THE MAPBIOMAS PLATFORM DATA 
//===========================================================================================
var plant_ras = ee.Image('projects/mapbiomas-workspace/public/collection7/mapbiomas_collection70_integration_v2')

Map.addLayer(plant_ras, {}, 'plant_ras', false);


//==========================================================================================
// WRITE A FUNCTION THAT RENAMES ANUAL BAND NAMES FROM MAPBIOMAS AND CREATES IMAGE COLLECTION
//==========================================================================================

var band_nms = plant_ras.bandNames();  // tells me what the bands are called from mapbiomas
print(band_nms);

var seq = ee.List.sequence(0, 36, 1); /// create a series to select the years 

var band_image = function(m) { /// function goes through each of the sequence and selects the band and turns into an image
  var ind = ee.Image(plant_ras.select([m]));
  return ind.rename('class');  
};

var plant_ras_col = ee.ImageCollection.fromImages(seq.map(band_image)); // create the Image Collection, of one band images for each year 
Map.addLayer(plant_ras_col, {}, 'plant_ras collection', false);

//==========================================================================================
//CALCUATION PROPORTIONAL COVER OF DIFERENT LAND USES TO BINARY PROPORTIONAL COVER 
//==========================================================================================

//caclculate cropland 
var cropland_fun = function(img){ /// this function converts all the Mabbiomas classifcations we want to 1s and the rest to 0s
  var bin = img.remap({
  from: [19,39,20,41,36,21],  //CROPLAND 19 = temp crop, 39 = sybean 20 = sugarcane, 41 = other temp crops , 36 = perrenial crop, 21 = mosaic agriculture and pasture  
  to: [1,1,1,1,1,1],   //nb,  needs same number as 1s as classified land covers from line above
  defaultValue: ee.Number(0) 
  });
  return bin;
};


//caclculate plantation 
var plantation_fun = function(img){ /// this function converts all the Mabbiomas classifcations I want to 1s and the rest to 0s
  var bin = img.remap({
  from: [9],  //plantation
  to: [1],
  defaultValue: ee.Number(0) 
  });
  return bin;
};

//calculate pasture
var pasture_fun = function(img){ /// this function converts all the Mabbiomas classifcations I want to 1s and the rest to 0s
  var bin = img.remap({
  from: [15],  // pasture 
  to: [1],
  defaultValue: ee.Number(0) 
  });
  return bin;
};



//map each function to calculate land-use per anum 
var cropland_ras_binary = plant_ras_col.map(cropland_fun); 
var plant_ras_binary = plant_ras_col.map(plantation_fun); 
var past_ras_binary = plant_ras_col.map(pasture_fun); 



//==========================================================================================
///// CHANGE THE RESOLUTION BY RESAMPLING TO A LARGER SCALE 
//==========================================================================================

var res = function(img2){ /// this function changes the resolution 
  var img_10km = img2
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      //maxPixels: 1000000000000,
      bestEffort:true
    })
    // Request the data at the scale and projection of the base image.
    .reproject({
      crs: base_rasterProjection
    });
  return img_10km;
  };

var cropland_10km = cropland_ras_binary.map(res)
var plantation_10km = plant_ras_binary.map(res);
var pasture_10km = past_ras_binary.map(res)


// Display the aggregated, reprojected forest cover data.
//Map.addLayer(plantation_10km, {max: 1}, 'plantation at 10km scale', false);

var cropland_10km_img = cropland_10km.toBands().rename(band_nms);  //a 10km image with 36 bands in it 
var plantation_10km_img = plantation_10km.toBands().rename(band_nms);  //a 10km image with 36 bands in it 
var pasture_10km_img = pasture_10km.toBands().rename(band_nms);  //a 10km image with 36 bands in it 


///////////////////////////////////////////
///// EXPORT THE IMAGEs
///////////////////////////////////////////


Export.image.toAsset({
  image: cropland_10km_img,
  description: 'cropland_1Okm',
  scale: base_scale.getInfo(),
  region: Brazil, //// Brazil shapefile
});

Export.image.toAsset({
  image: plantation_10km_img,
 description: 'plantation_1Okm',
 scale: base_scale.getInfo(),
  region: Brazil, //// Brazil shapefile
});

Export.image.toAsset({
  image: pasture_10km_img,
 description: 'pasture_1Okm',
 scale: base_scale.getInfo(),
  region: Brazil, //// Brazil shapefile
});

///////////////////////////////////////////
///// CALCULATE THE BUFFER
///////////////////////////////////////////

var buffer_5 = function(img3){ // this function creates the buffer 
  var buff_50km = img3.reduceNeighborhood({
  reducer: ee.Reducer.mean(),
  kernel: ee.Kernel.circle(5),
  });
  return buff_50km;
}; 

var plantation_50km_buffer = plantation_10km.map(buffer_5); 
//Map.addLayer(plantation_50km_buffer, {max: 1}, 'plantation at 50km scale buffer', false);

var plantation_50km_buffer_img = plantation_50km_buffer.toBands().rename(band_nms);
//Map.addLayer(plantation_50km_buffer_img, {max: 1}, 'plantation at 50km scale buffer image');

//bigger buffer
var buffer_10 = function(img3){ // this function creates the buffer 
  var buff_100km = img3.reduceNeighborhood({
  reducer: ee.Reducer.mean(),
  kernel: ee.Kernel.circle(10),
  });
  return buff_100km;
}; 

var plantation_100km_buffer = plantation_10km.map(buffer_10); 

var plantation_100km_buffer_img = plantation_100km_buffer.toBands().rename(band_nms);



//==========================================================================================
///// EXPORT THE BUFFERS  
//==========================================================================================


Export.image.toAsset({
  image: plantation_50km_buffer_img,
  description: '50km_buffer_plantation',
  scale: base_scale.getInfo(),
  maxPixels: 10000000000000,
  region: Brazil, //// Brazil shapefile
});

Export.image.toAsset({
  image: plantation_100km_buffer_img,
  description: '100km_buffer_plantation',
  scale: base_scale.getInfo(),
  maxPixels: 10000000000000,
  region: Brazil, //// Brazil shapefile
});

//==========================================================================================
///HINDCAST OPPORTUNITY COST 
//==========================================================================================

///add the data to GEE from assets showing single-year opp cost  

var opppast = ee.Image('users/GRC95/eucalyptus_expansion/op_cost_grassland')
var oppcrop = ee.Image('users/GRC95/eucalyptus_expansion/op_cost_cropland')


//read in annual coverage of pasture and cropland 
var pasture = ee.Image('users/GRC95/10km_analysis/pasture_1Okm')
var agriculture = ee.Image('users/GRC95/10km_analysis/cropland_1Okm')


//play with display colouration
var viridis = {min: 0, max: 60000, palette: ["#440154FF", "#481568FF", "#482677FF", "#453781FF", "#3F4788FF", "#39558CFF",
      "#32648EFF", "#2D718EFF", "#287D8EFF", "#238A8DFF", "#1F968BFF", "#20A386FF", "#29AF7FFF", "#3CBC75FF", "#56C667FF",
      "#74D055FF", "#94D840FF", "#B8DE29FF", "#DCE318FF", "#FDE725FF"]};
      

//hindcast pasture opportunity cost and name 'opppast_anual'
//this works by multiplying the 1km proportional cover for pasture for each year by Strassburg pasture opportunity cost
var opppast_anual = pasture.multiply(opppast) 

//hindcast cropland opportunity through time and name "opcrop_mult 
var opcrop_anual = agriculture.multiply(oppcrop)

//average the pasture opportunity cost and the cropland opportunity cost 
var comb_op_cost = opppast_anual.add(opcrop_anual).divide(ee.Number(2))

//take this and sum it over at a resampled and coarser resolution
var oppcost_10km = comb_op_cost
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.sum(),
      maxPixels: 100, 
      bestEffort:true
    })

// Display the aggregated, reprojected forest cover data.
Map.addLayer(oppcost_10km, {max: 1}, 'oppcost at 10km scale', false);


//==========================================================================================
///EXPORT HINDCASTed OPPORTUNITY COST 
//==========================================================================================

//COMBINED OPPCOST 
Export.image.toAsset({
  image: oppcost_10km,
  description: '10km_anual_opportunity_cost',
  scale: base_scale.getInfo(),
  maxPixels: 10000000000000,
  region: Brazil, //// Brazil shapefile
});

//PASTURE OPCOST 

Export.image.toAsset({
  image: opppast_anual,
  description: '10km_anual_pasture_opportunity_cost',
  scale: base_scale.getInfo(),
  maxPixels: 10000000000000,
  region: Brazil, //// Brazil shapefile
});

///CROPLAND OP COST

Export.image.toAsset({
  image: opcrop_anual,
  description: '10km_anual_cropland_opportunity_cost',
  scale: base_scale.getInfo(),
  maxPixels: 10000000000000,
  region: Brazil, //// Brazil shapefile
});

//==========================================================================================
// BIOPHYSICAL SUITABILITY
//==========================================================================================
//recalculate eucalyptus at 10km scale
var eucalypt = ee.Image('users/GRC95/eucalyptus_expansion/outputs/resampled_suitability_euc');

var eucalypt_10km = eucalypt
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 100, 
      bestEffort:true
    })
    // Request the data at the scale and projection of the base image.
    .reproject({crs: base_rasterProjection}     ) 


// Display the aggregated, reprojected eucaly cover data.
//Map.addLayer(oppcost_10km, {max: 1}, 'oppcost at 10km scale', false);


//Export eucalyptus suitability (fixed annually; so just a single band )
Export.image.toAsset({
  image: eucalypt_10km,
  description: '10km_eucalypt',
  scale: base_scale.getInfo(),
  maxPixels: 10000000000000,
  region: Brazil, //// Brazil shapefile
})

