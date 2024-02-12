//avoided extinctions per 10km2 from ecosystem restoration 

//1. this code resamples the Strassburg et al layer showing avoided extinction per hectare
//for terrestrial vertebrates from ecosystem restoration. 

//I resample this to determine the extinctions avoided per 10km2 from ecosystem restoration

//get base scale 
var base_raster = ee.Image('users/GEE_tutorial/BaseScaleRasters/baseRaster10km2Molleweide');
var base_rasterProjection = base_raster.projection();
var base_scale = base_raster.projection().nominalScale();
var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil')).geometry().bounds();


//import Strassburg avoided extinctions per ha 
var ext_per_ha = ee.Image('users/GEE_tutorial/Strassburg2020_rasters/avoided_extinction_per_ha')
Map.addLayer(ext_per_ha, {}, 'ext_per_ha', true);

var ext_per_10km = ext_per_ha
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.sum(),
    
      bestEffort:true
    })
    // Request the data at the scale and projection of the base image.
    .reproject({crs: base_rasterProjection}) 


//visualise the results 
Map.addLayer(ext_per_10km,  {min:0, max:0.05, palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
'ext_per_10km', true);


Export.image.toDrive({
  image: ext_per_10km,
  description: 'Moll_Avoided_extinction_per_10km2',
  scale: base_scale.getInfo(),
  region: Brazil,
  maxPixels: 10000000000000,
  
});
