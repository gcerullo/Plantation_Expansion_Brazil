//29/01.24

//This code takes the predictors and land-use coverage data calculated in script one, and produces
//a single image where each year of data is provided as a band.



//==========================================================================================================
//Import dependecies 
//==========================================================================================================
//get base scale 
var base_raster = ee.Image('users/GEE_tutorial/BaseScaleRasters/baseRaster10km2Molleweide');
var base_rasterProjection = base_raster.projection();
var base_scale = base_raster.projection().nominalScale();
var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil')).geometry().bounds();


//============================================================================================
 //read in layers to combine 
//============================================================================================
 var plantation = ee.Image('users/GEE_tutorial/10km_analysis/plantation_1Okm');
 var oppcost = ee.Image('users/GEE_tutorial/10km_analysis/10km_anual_opportunity_cost');
 var buffer5 = ee.Image('users/GEE_tutorial/10km_analysis/50km_buffer_plantation');
 var buffer10 = ee.Image('users/GEE_tutorial/10km_analysis/100km_buffer_plantation');
 var eucalypt = ee.Image('users/GEE_tutorial/10km_analysis/10km_eucalypt');  //biophysical suitability

//////////////////////////
//rename image bands in the multiband raster so that each band has a unique name 

var oppcost = oppcost.rename('oppcost_1985','oppcost_1986','oppcost_1987', 'oppcost_1988', 'oppcost_1989', 'oppcost_1990','oppcost_1991','oppcost_1992','oppcost_1993', 'oppcost_1994', 'oppcost_1995', 'oppcost_1996', 'oppcost_1997', 'oppcost_1998', 'oppcost_1999', 'oppcost_2000', 'oppcost_2001', 'oppcost_2002', 'oppcost_2003', 'oppcost_2004', 'oppcost_2005', 'oppcost_2006', 'oppcost_2007', 'oppcost_2008', 'oppcost_2009', 'oppcost_2010', 'oppcost_2011', 'oppcost_2012', 'oppcost_2013', 'oppcost_2014', 'oppcost_2015', 'oppcost_2016', 'oppcost_2017', 'oppcost_2018', 'oppcost_2019', 'oppcost_2020', 'oppcost_2021');
var opp_nms = oppcost.bandNames(); //store band of opnames--I will need this later 


var plantation = plantation.rename('plant_1985','plant_1986','plant_1987', 'plant_1988', 'plant_1989', 'plant_1990','plant_1991','plant_1992','plant_1993', 'plant_1994', 'plant_1995', 'plant_1996', 'plant_1997', 'plant_1998', 'plant_1999', 'plant_2000', 'plant_2001', 'plant_2002', 'plant_2003', 'plant_2004', 'plant_2005', 'plant_2006', 'plant_2007', 'plant_2008', 'plant_2009', 'plant_2010', 'plant_2011', 'plant_2012', 'plant_2013', 'plant_2014', 'plant_2015', 'plant_2016', 'plant_2017', 'plant_2018', 'plant_2019',  'plant_2020', 'plant_2021');
var plant_nms = plantation.bandNames(); //store names of bands


var buffer5 = buffer5.rename('buff_1985','buff_1986','buff_1987', 'buff_1988', 'buff_1989', 'buff_1990','buff_1991','buff_1992','buff_1993', 'buff_1994', 'buff_1995', 'buff_1996', 'buff_1997', 'buff_1998', 'buff_1999', 'buff_2000', 'buff_2001', 'buff_2002', 'buff_2003', 'buff_2004', 'buff_2005', 'buff_2006', 'buff_2007', 'buff_2008', 'buff_2009', 'buff_2010', 'buff_2011', 'buff_2012', 'buff_2013', 'buff_2014', 'buff_2015', 'buff_2016', 'buff_2017', 'buff_2018', 'buff_2019', 'buff_2020', 'buff_2021');
var buff5_nms = buffer5.bandNames(); //store names of bands

var buffer10 = buffer10.rename('buff10_1985','buff10_1986','buff10_1987','buff10_1988', 'buff10_1989', 'buff10_1990','buff10_1991','buff10_1992','buff10_1993', 'buff10_1994', 'buff10_1995', 'buff10_1996', 'buff10_1997', 'buff10_1998', 'buff10_1999', 'buff10_2000', 'buff10_2001', 'buff10_2002', 'buff10_2003', 'buff10_2004', 'buff10_2005', 'buff10_2006', 'buff10_2007', 'buff10_2008', 'buff10_2009', 'buff10_2010', 'buff10_2011', 'buff10_2012', 'buff10_2013', 'buff10_2014', 'buff10_2015', 'buff10_2016', 'buff10_2017', 'buff10_2018', 'buff10_2019', 'buff10_2020', 'buff10_2021');
var buff10_nms = buffer10.bandNames(); //store names of bands

var eucalypt = eucalypt.rename('eucalypt');
var euc_nms = eucalypt.bandNames(); //store names of band

//////////////////////////
//join the images from different bands of a multiband image to make one image 

//OPCOST
var seq = ee.List.sequence(0, 36, 1); 
var oppImage = function(m) { /// function goes through each of the sequences and selects the band and turns into an image
  var ind = ee.Image(oppcost.select([m]));
  return ind.rename('class');  
};

var opp_col = ee.ImageCollection.fromImages(seq.map(oppImage));

//PLANTATION
var seq = ee.List.sequence(0, 36, 1); 
var plantImage = function(m) { /// function goes through each of the sequences and selects the band and turns into an image
  var ind = ee.Image(plantation.select([m]));
  return ind.rename('class');  
};

var plant_col = ee.ImageCollection.fromImages(seq.map(plantImage));

//BUFFER 50KM
var seq = ee.List.sequence(0, 36, 1); 
var buff5Image = function(m) { /// function goes through each of the sequences and selects the band and turns into an image
  var ind = ee.Image(buffer5.select([m]));
  return ind.rename('class');  
};

var buff5_col = ee.ImageCollection.fromImages(seq.map(buff5Image));

//BUFFER 100km
var seq = ee.List.sequence(0, 36, 1); 
var buff10Image = function(m) { /// function goes through each of the sequences and selects the band and turns into an image
  var ind = ee.Image(buffer10.select([m]));
  return ind.rename('class');  
};

var buff10_col = ee.ImageCollection.fromImages(seq.map(buff10Image));


/////////////////////////////////
//now combine the imjage collections into one big image collection 
//In this step, the images lose all their names 
var merged = plant_col.merge(opp_col); //can only merge two imageCollections at a time, so repeat iteratively below 
var merged = merged.merge(buff5_col);
var merged = merged.merge(buff10_col); 
var merged = merged.merge(eucalypt);
print(merged);

///////////////////////////////////
//create a string telling me the band names, and givig the correct band values, so that I can apply the band names to my images
var all_names = plant_nms.cat(opp_nms).cat(buff5_nms).cat(buff10_nms).cat(euc_nms); //combines all these names in one 
print('all_names', all_names);

//turn my big image collection into a single image with 149 (0-140) bands (37 plantation, 37 opp, 37 buff5, 37 buff10, 1 eucalypt) 
var merged_img_10km = merged.toBands().rename(all_names); 
print(merged_img_10km);//a 1km image with 141 bands in it 

//export my merged image so that I can have a seperate script for running my random forest

//export
Export.image.toAsset({
  image: merged_img_10km,
  description: '10km_full_RF_data',
  scale: base_scale.getInfo(),
   region: Brazil,
  maxPixels: 10000000000000,
  
});







