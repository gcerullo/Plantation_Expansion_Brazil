//This code runs the random forest models, testing different expansion thresholds (5,10,15%)
//and with different ratios of expansion to no-expansion cells across Brazil. 

//This code outputs: 
//(1) Different random-forest generated probability surfaces (2010-2020) for plantation expansion, based on different thresholds and training point ratios 
//(2) Training point data for running logistic regression models in R. 
//which then allows model performance to be evaluated using R.scripts. 
//(3) Based on R-script determined best-fitting RF model, this code also generates probability of expansion 2020-2030



//------------------------------------------------------------------------------------------------------------
// IMPORT DEPENDENCIES 
//------------------------------------------------------------------------------------------------------------
var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil'))
Map.addLayer(Brazil, {}, 'Brazil', true);
//import image with all annual predictors and depependent variable stored in a single image
var merged = ee.Image('users/GRC95/10km_analysis/10km_full_RF_data');

//get base scale 
var base_raster = ee.Image('users/GRC95/BaseScaleRasters/baseRaster10km2Molleweide');
var base_rasterProjection = base_raster.projection();
var base_scale = base_raster.projection().nominalScale();
var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil')).geometry().bounds();

//amount of cropland and pasture in a cell 
//amount of cropland in a cell 
var croplandProp =  ee.Image('users/GRC95/10km_analysis/cropland_1Okm')

//amount of pasture in a cell
var pastureProp = ee.Image('users/GRC95/10km_analysis/pasture_1Okm')



//------------------------------------------------------------------------------------------------------------
// DEFINE KEY PARAMETRES
//------------------------------------------------------------------------------------------------------------

//1. How much expansion do we want to be able to predict in the cell (5%, aprox 500m, 10% approx 1sqkm, or 15% approx 1.5sqm km )
//simply change here to test other amounts of expansion [this will automatically change the name of the file upon export ]


//HARD-CODED-decision; for each expansion threshold, re-run code
var expansion = 0.05   //predict 5% expanson between 2000-10
//var expansion = 0.1    //predict 10% expanson between 2000-10
//var expansion = 0.15   //predict 15% expanson between 2000-10

//1. decide what surface we want to stratify the training sample by


var BandToStratifyOn = '10_yr_ex'           //stratify just based on binary expansion or not 0 -1   


//define the unexpanded classs
var Unexpanded = 0     // the value of the majority class

//------------------------------------------------------------------------------------------------------------
// CALCULATE KEY VARIABLES
//------------------------------------------------------------------------------------------------------------


//FOR THE YEAR 2010 CALCULATE THE PREVIOUS 10 YEARS OF PLANTATION CHANGE 
var Pchange_2000_10 =  merged.select("plant_2010").subtract(merged.select('plant_2000')).rename(['Pchange_2000_10']);
//Map.addLayer(Pchange_2000_10, {}, 'Pchange_2000_10', false);

//Make a change between 2010-20 latyer to test  future predictability for 10-year model 
var Pchange_2010_20 =  merged.select("plant_2020").subtract(merged.select('plant_2010')).rename(['Pchange_2010_20'])

var Pchange_2020_21 =  merged.select("plant_2021").subtract(merged.select('plant_2020')).rename(['Pchange_2020_21'])

//Add these bands for to a new image collected called merged_2010   
var merged_2010 =  merged.addBands(Pchange_2000_10).addBands(Pchange_2010_20).addBands(Pchange_2020_21)



//............................................................................................................
//PREDICTORS 1A  -  process additional predictors we wish to consider
//.............................................................................................................

//PLANTATION EXPANSION DYNAMICS WITHIN THE CELL IN PREVIOUS YEARS

//3yrs
var PlantChange_97_2000 = merged.select('plant_2000').subtract(merged.select('plant_1997')).rename('PlantChange_97_2000')
var PlantChange_07_2010 = merged.select('plant_2010').subtract(merged.select('plant_2007')).rename('PlantChange_07_2010')
var PlantChange_17_2020 = merged.select('plant_2020').subtract(merged.select('plant_2017')).rename('PlantChange_17_2020')

//5yrs
var PlantChange_95_2000 = merged.select('plant_2000').subtract(merged.select('plant_1995')).rename('PlantChange_95_2000')
var PlantChange_05_2010 = merged.select('plant_2010').subtract(merged.select('plant_2005')).rename('PlantChange_05_2010')
var PlantChange_15_2020 = merged.select('plant_2020').subtract(merged.select('plant_2015')).rename('PlantChange_15_2020')


//PLANTATION EXPANSION DYNAMICS WITHIN THE SURROUNDING BUFFER
//calculate the amount of change around a plantation cell in the three years previous to our startpoint 


//for 2000-10
//3 yr change 
var BuffChange_97_2000 = merged.select('buff_2000').subtract(merged.select('buff_1997')).rename('BuffChange_97_2000')
var  Buff10Change_97_2000 = merged.select('buff10_2000').subtract(merged.select('buff10_1997')).rename('Buff10Change_97_2000')
//5 yr change 
var BuffChange_95_2000 = merged.select('buff_2000').subtract(merged.select('buff_1995')).rename('BuffChange_95_2000')
var Buff10Change_95_2000 = merged.select('buff_2000').subtract(merged.select('buff_1995')).rename('Buff10Change_95_2000')


//for 2010-20
//3 yr change 
var BuffChange_07_2010 = merged.select('buff_2010').subtract(merged.select('buff_2007')).rename('BuffChange_07_2010')
var  Buff10Change_07_2010 = merged.select('buff10_2010').subtract(merged.select('buff10_2007')).rename('Buff10Change_07_2010')
//5 yr change 
var BuffChange_05_2010 = merged.select('buff_2010').subtract(merged.select('buff_2005')).rename('BuffChange_05_2010')
var  Buff10Change_05_2010 = merged.select('buff10_2010').subtract(merged.select('buff10_2005')).rename('Buff10Change_05_2010')

//for 2020-30

//3 yr change 
var BuffChange_17_2020 = merged.select('buff_2020').subtract(merged.select('buff_2017')).rename('BuffChange_17_2020')
var  Buff10Change_17_2020 = merged.select('buff10_2020').subtract(merged.select('buff10_2017')).rename('Buff10Change_17_2020')

//5 yr change 
var BuffChange_15_2020 = merged.select('buff_2020').subtract(merged.select('buff_2015')).rename('BuffChange_15_2020')
var  Buff10Change_15_2020 = merged.select('buff10_2020').subtract(merged.select('buff10_2015')).rename('Buff10Change_15_2020')

//add these bands 
merged_2010 = merged_2010.addBands(PlantChange_97_2000).addBands(BuffChange_97_2000).addBands(Buff10Change_97_2000).addBands(
  PlantChange_95_2000).addBands(BuffChange_95_2000).addBands(Buff10Change_95_2000).addBands(
  
  PlantChange_07_2010).addBands(Buff10Change_07_2010).addBands(BuffChange_07_2010).addBands(
  PlantChange_05_2010).addBands(Buff10Change_05_2010).addBands(BuffChange_05_2010).addBands(  
   
  PlantChange_17_2020).addBands(Buff10Change_17_2020).addBands(BuffChange_17_2020).addBands(
  PlantChange_15_2020).addBands(Buff10Change_15_2020).addBands(BuffChange_15_2020) 
      
print(merged_2010.bandNames())

// CROPLAND COVER
//select the startYear as the year we are interested in 
var croplandProp2000 = croplandProp.select('classification_2000').rename('croplandProp2000')
var croplandProp2010 = croplandProp.select('classification_2010').rename('croplandProp2010')
var croplandProp2020 = croplandProp.select('classification_2020').rename('croplandProp2020')

// PASTURE COVER
//select the startYear as the year we are interested in 
var pastureProp2000 = pastureProp.select('classification_2000').rename('pastureProp2000')
var pastureProp2010 = pastureProp.select('classification_2010').rename('pastureProp2010')
var pastureProp2020 = pastureProp.select('classification_2020').rename('pastureProp2020')

//............................................................................................................
//PREDICTORS 1B  -  calculate or import additional predictors we wish to consider
//.............................................................................................................

//add annualised productivity of eucalyptus at municipality scales Brazil. 
var productivity2000 = ee.Image('users/GRC95/10km_analysis/Productivity10kmAnual/Productivity2000')
var productivity2010 = ee.Image('users/GRC95/10km_analysis/Productivity10kmAnual/Productivity2010')
var productivity2020 = ee.Image('users/GRC95/10km_analysis/Productivity10kmAnual/Productivity2020')

//PROXIMITY TO MARKET
var proxMarket = ee.Image("Oxford/MAP/accessibility_to_healthcare_2019").select('accessibility').rename('proxMarket')

//aggregate proximity to market to the correct scale
var proxMarket = proxMarket
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 100, 
      bestEffort:true
    })
    // Request the data at the scale and projection of the base image.
    .reproject({crs: base_rasterProjection}).rename('proxMarket')


//COVERAGE OF FARMS IN MUNICIPALITY 
//Proportional area coverage of farms >100 ha in a Municipality 
var mun100Farms = ee.Image("users/GRC95/10km_analysis/100haMunicipalityFarmArea")
var mun100Farms  = mun100Farms
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 100, 
      bestEffort:true
    })
//    Request the data at the scale and projection of the base image.
    .reproject({crs: base_rasterProjection}).rename('mun100Farms')
    
 
//SLOPE
var slope = ee.Image("MERIT/DEM/v1_0_3")

var slope  = slope
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 100, 
      bestEffort:true
    })
//    Request the data at the scale and projection of the base image.
    .reproject({crs: base_rasterProjection}).rename('slope')
 
 
//POPULATION 
//
var populationImageColl = ee.ImageCollection("CIESIN/GPWv411/GPW_Population_Count")

//make list of image names in image collection 
var populationList=ee.ImageCollection(populationImageColl).toList(5);

var population2000 =ee.Image(ee.List(populationList).get(0)).rename('population2000'); //note index 0 is the first image
var population2005 =ee.Image(ee.List(populationList).get(1)).rename('population2005'); //note index 0 is the first image
var population2010 =ee.Image(ee.List(populationList).get(1)).rename('population2010'); //note index 0 is the first image
var population2015 =ee.Image(ee.List(populationList).get(3)).rename('population2015'); //note index 0 is the first image
var population2020 =ee.Image(ee.List(populationList).get(4)).rename('population2020'); //note index 0 is the first image

print(population2020, 'Dictpopulation2020')
//reduce resolution for key population predictor years

var population2000 = population2000.unmask()
var population2010 = population2010.unmask()
var population2020 = population2020.unmask()

//bring population to the correct scale and CRS; must do BEFORE reducing resolution
var population2000 = population2000.reproject({
  crs: base_rasterProjection,
      scale: base_scale
    }).reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 10,
    }) 

var population2010 = population2010.reproject({
      crs: base_rasterProjection,
      scale: base_scale
    }).reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 10,
    }) 

var population2020 = population2020.reproject({
      crs: base_rasterProjection,
      scale: base_scale
    }).reduceResolution({
      reducer: ee.Reducer.mean(),

      maxPixels: 10,
    })

//--------------------------------------------------------------------------------------------------------    
//add additional predictors as bands 
//--------------------------------------------------------------------------------------------------------    
//add additional predictors as bands 
var merged_2010 = merged_2010.addBands(croplandProp2000).addBands(croplandProp2010).addBands(croplandProp2020).addBands(
  pastureProp2000).addBands(pastureProp2010).addBands(pastureProp2020).addBands(
    proxMarket).addBands(slope).addBands(mun100Farms).addBands(population2000).addBands(
      population2010).addBands(population2020).addBands(productivity2000).addBands(
        productivity2010).addBands(productivity2020)
print(merged_2010.bandNames(), 'merged_2010')



//.............................................................................................................
//WHAT ARE WE PREDICTING - now we specify what we want our model to be able to predict
//.............................................................................................................


//for 2000-2010
//This is predicting plantation expansion of >EXPANSION [expansion threshold defined at top of script] between 2000-2010
var Pexpand_2000_10 = merged_2010.select('Pchange_2000_10').gt(expansion).rename('Pexpand_2000_10')
//Map.addLayer(Pexpand_2000_10, {}, 'Pexpand_2000_10', false);

//for 2010-20
var Pexpand_2010_20 = merged_2010.select('Pchange_2010_20').gt(expansion).rename('Pexpand_2010_20')
//Map.addLayer(Pexpand_2010_20, {}, 'Pexpand_2010_20', false);

//add the band that we are predicting 
merged_2010 = merged_2010.addBands(Pexpand_2000_10)

//set default projection 
var merged_2010 = merged_2010.setDefaultProjection(base_rasterProjection.atScale(base_scale))

//.............................................................................................................
// NOW WE SPECIFY THE MODEL STRUCTURE AND PREDICTORS FOR EACH OF THE PERIODS: we must provide these in a unified relative-time format 
//nb: the variable we retain are based removing correlated predictors based on correlation analysis in R.script TestCorrelations
//2000-2010
//2010-2020
//2020-2030 
//.............................................................................................................

//...............................................................................................
//FOR EACH time period, filter the variables we want to use from the full dataset and rename them to relative.time format
//.............................................................................................


//>>>>>>>>>>>>>>>>>>>>>>>
//2000- 2010 
//>>>>>>>>>>>>>>>>>>>>>>>

var RFbands2010 = merged_2010.select(
//SELECT DEPENDENT VARIABLE 
// //ten year model
'Pexpand_2000_10', //  any cell that undergoes a given threshold of expansion between 2000-2010 [defined at the beggining of the script] is what I am trying to predict

//SELECT PREDICTORS
'oppcost_2000',
'buff_2000',
'buff10_2000',  
'BuffChange_97_2000', 
'Buff10Change_97_2000', 
'plant_2000',
'PlantChange_97_2000',
'eucalypt','productivity_2000',
'croplandProp2000', 'pastureProp2000', 'proxMarket',  
'slope',
'mun100Farms',
'population2000').bandNames() ;
//print(RFbands2010, 'RFbands2010')  


//make a subset of full data that contains only these bands AND rename them to relative time format
var relative_time_format_2010  = merged_2010.select(RFbands2010).rename(
  '10_yr_ex',
  'opcost0',
  'buff0',
  'buff10_0', 
  'BuffChange_t3_t0', 
  'Buff10Change_t3_t0',   
  'plant0',
  'plant_change_t3_t0', 
  'eucalypt', 'productivity_t0',
  'croplandProp0', 'pastureProp0', 'proxMarket', 
  'slope',
  'mun100Farms',
  'population')
  
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//2010-2020
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//select relevent predictors; THESE MUST MATCH STRUCTURE AND NUMBER OF BANDS OF TRAINED CLASSIFIER 
var RFbands2020 = merged_2010.select(
  
//SELECT PREDICTORS
'oppcost_2010',
'buff_2010',
'buff10_2010',  
'BuffChange_07_2010', 
'Buff10Change_07_2010', 
'plant_2010',
'PlantChange_07_2010',
'eucalypt', 'productivity_2010',
'croplandProp2010', 'pastureProp2010','proxMarket',
'slope', 
'mun100Farms',
'population2010' 
).bandNames() ;
//print(RFbands2020, 'RFbands2020')  

//make an image of these predictors and rename to relative time format - this image is what
//we are going to train our classifier on, and we must be able to recognise names. 

var relative_time_format_2020  = merged_2010.select(RFbands2020).rename(
  'opcost0',
  'buff0',
  'buff10_0', 
  'BuffChange_t3_t0', 
  'Buff10Change_t3_t0',  
  'plant0',
  'plant_change_t3_t0',  
  'eucalypt', 'productivity_t0',
  'croplandProp0', 'pastureProp0', 'proxMarket',
  'slope',
  'mun100Farms',
  'population')

//save these as band names subset them lower down
var RFbands2020_rel_time =  relative_time_format_2020.bandNames()


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//2020-2030
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>


// Select correct predictors 
var RFbands2030 = merged_2010.select(
//SELECT PREDICTORS
'oppcost_2020',
'buff_2020',
'buff10_2010',  
'BuffChange_17_2020',
'Buff10Change_17_2020', 
'plant_2020',
'PlantChange_17_2020', 
'eucalypt', 'productivity_2020',
'croplandProp2020', 'pastureProp2020', 'proxMarket',
'slope',
'mun100Farms',
'population2020'  
).bandNames() ;
//print(RFbands2030, 'RFbands2030')  

//make an image of these predictors and rename to relative time format - this image is what
//we are going to train our classifier on, and we must be able to recognise names. 

var relative_time_format_2030  = merged_2010.select(RFbands2030).rename(
  'opcost0',
  'buff0',
  'buff10_0', 
  'BuffChange_t3_t0',   
  'Buff10Change_t3_t0', 
  'plant0',
  'plant_change_t3_t0',  
  'eucalypt', 'productivity_t0',
  'croplandProp0', 'pastureProp0', 'proxMarket',
  'slope',
  'mun100Farms',
  'population')


//.............................................................................................................
// CALCULATE TOTAL AMOUNT OF EXPANSION  and OF NO EXPANSION - e.g. number of 1s and 0s for 2000-2010
//..............................................................................................................

var NoPixelsOfExpansion = Pexpand_2000_10.eq(1).selfMask().reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Brazil,
  crs: base_rasterProjection,
  maxPixels: 1e9,
});
//actually extract and store this number as an object so that we can call it in sums lower down in the script
var NoPixelsOfExpansion = NoPixelsOfExpansion.getNumber('Pexpand_2000_10')


var NoPixelsWithoutExpansion = Pexpand_2000_10.eq(0).selfMask().reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Brazil,
  crs: base_rasterProjection,
  maxPixels: 1e9,
});
//actually extract and store this number as an object so that we can call it in sums lower down in the script
var NoPixelsWithoutExpansion = NoPixelsWithoutExpansion.getNumber('Pexpand_2000_10')


//.............................................................................................................
// NOW WE DEFINE MODEL PARAMS; SPECIFICALLY regarding STRATIFICATION OF TRAINING POINTS for 2000-2010
//.............................................................................................................

//what is the proportion of 0s to 1s in the real data?
var truePercentageExpandedUnexpanded = NoPixelsOfExpansion.divide(NoPixelsWithoutExpansion).multiply(100)

//how many more 0s are there than 1s?
var multiplicationFactor = NoPixelsWithoutExpansion.divide(NoPixelsOfExpansion)
print (NoPixelsOfExpansion, 'NoPixelsOfExpansion')
print(NoPixelsWithoutExpansion, 'NoPixelsWithoutExpansion')
print(truePercentageExpandedUnexpanded,'truePercentageExpandedUnexpanded')
print(multiplicationFactor,'multiplicationFactor')



//........................................................................................................
//now we build different random forest classifiers, each built using a different training ratio of 0s (fixed) and 1s (changes above and below the true ratio)
//we also export all of the training points for 2000-2010, to use for logistc regression 

// Create an empty list to store the classifiers
var classifiers = [];
// Create a second empty list to store the training points 
var all_training_points = [];


// Define the different values of RatioAdjuster to test using extra absenece points
//note that where RatioAdjuster = 1, there are is the same number of 0 to 1s

var RATIO_ADJUSTERS = [1, 2, 4, 8, 16];

// Loop over all RatioAdjuster values and train a random forest for each
for (var i = 0; i < RATIO_ADJUSTERS.length; i++) {
  var RatioAdjuster = RATIO_ADJUSTERS[i];

// Decide number of training points to assign to each of the different values in BandToStratifyOn  

//this approach takes all of the expansion points and then varies the number of non-expansion (0s) above this
var NumExpandedTrainingPoints = ee.Number(NoPixelsOfExpansion)

//number of non-expansion point as a multiple (ratio Adjuster) of unexpanded points
var NumUnexpandedTrainingPoints = NumExpandedTrainingPoints.multiply(RatioAdjuster).toInt()


//show how our training points are split
print(NumExpandedTrainingPoints, 'NumExpandedTrainingPoints')
print(NumUnexpandedTrainingPoints, 'UnexpandedTrainingPoints')


//stratify the points 
var training = relative_time_format_2010.stratifiedSample({ 
region: Brazil, 
classBand: BandToStratifyOn,           
scale: 10000,
numPoints: NumExpandedTrainingPoints, // number of points from the class 
classValues: [Unexpanded],  // majority class [in this case 0]
classPoints: [NumUnexpandedTrainingPoints], // number of training points from majority class
geometries: true

})//  

//print(training, 'training ')
//visualuise the training points
//Map.addLayer(training, {}, 'training', false);

//push training points, made up of different ratios of 0s and 1s into the list  
 all_training_points.push(training);
 
//remove the actual expansion as a predictor
var RFbands2010_rel_time =  relative_time_format_2010.bandNames().remove('10_yr_ex')

//.............................................................................................................
//TRAIN THE CLASSIFIER on 2000-2010
//.............................................................................................................

//ten-year model 


//fit a classifier that creates a probability of expansion for each training ratio 
var CalculateProbClassifier = ee.Classifier.smileRandomForest(500).
setOutputMode('PROBABILITY')
.train({
  features: training,
  classProperty: '10_yr_ex',   //We train our classifer to predict expansion in 10 years 
//  classProperty: 'threshold',
  inputProperties: RFbands2010_rel_time})


//push each new classifier (each classifier training on a differnt training sample)
// to the empty list called classifier  
 classifiers.push(CalculateProbClassifier);

//edit filenames so as to remove ".", and allow export 
var TableDescription =  "LogisticTRpoint_"+ "expansion_"+expansion*100 +"_"+ "TR"+ RatioAdjuster;
TableDescription = TableDescription.replace(/\./g, '_');
var TablefileNamePrefix = "LogisticTRpoint_"+ "expansion_"+expansion*100 +"_"+ "TR"+ RatioAdjuster;
TablefileNamePrefix = TablefileNamePrefix.replace(/\./g, '_');


// //Export all training points for 2000-2010 for logistic regression  
var ExportTableParams  = {
  collection: training,
  description: TableDescription,
  fileNamePrefix: TablefileNamePrefix,
  folder: "AllLogisticTrainingData",
 
};

// // Export the Table of training points to Drive for logistic regression analyses 
 Export.table.toDrive(ExportTableParams)
 
// }

}

//This above code returns a list containing  classifiers,
//each trained on 2000-2010 data with a different set of training points.
//You can access each classifier by its index in the list, for example, classifiers[0] would return the classifier made with a RatioAdjuster of 0.25.

// display the classifiers list 
print(classifiers,'six2010_classifiers');
//display the training points
print(all_training_points,"all_training_points")

//=======================================================================================
//---------------------------------------------------------------------------------------
// Now we apply all classifiers from 2000-2010 to the 2010-2020 period using the same model structure...
// we then need to export the output of each of these classifiers, and test how well it performs in predicting true
//2010-2020 expansion in R
//---------------------------------------------------------------------------------------
//=======================================================================================

//create an empty list to store the output maps of applying each classifer to the 2010-2020 data
var RFPs2020 = [];

//calculate which bands underwent expansion and add this band to the 2020 RFP so that we can 
//test the performance of each RFP in R 
var Pexpand_2010_2020 = merged.select("plant_2020").subtract(merged.select('plant_2010')).gt(expansion).rename('Pexpand_2010_2020')


// Apply each classifier over 2010-2020 predictors and add an index name so that we know which training
//ratio has been applied 

for (var i = 0; i < classifiers.length; i++) {
  var classifier = classifiers[i];
  var classified_prob_2020 = relative_time_format_2020.classify(classifier)
  .unitScale(0,1).multiply(100)
  .rename('classified_prob_2020');

  //add an index showing which classifier of which ration of training points we used 
  var ratio_adj_index = RATIO_ADJUSTERS[i];
  
  //add all 2020 RFP to MapViewer
  Map.addLayer(classified_prob_2020, {min:0, max:100, palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
    "RFP 2020_"+ "expansion_"+expansion+'0%_1_'+ ratio_adj_index +"TR" );
    
    //add the actual areas of plantation expansion as a band so that we can test RFP performance 
     var classified_prob_2020 = classified_prob_2020.addBands(Pexpand_2010_2020).toFloat();
    //push the output (RFP image) of applying each classifier into the empty list called RFPs2020
     RFPs2020.push(classified_prob_2020);

//define export Params 

//set the filename prefix and desciptopm, removing dots from names to enable rapid export 
 var   fileNamePrefix =  "RFP2020_"+ "expansion_"+expansion+'0_1_'+ ratio_adj_index +"TR";
 fileNamePrefix = fileNamePrefix.replace(/\./g, '_');
 var   description =  "RFP2020_"+ "expansion_"+expansion+'0_1_'+ ratio_adj_index +"TR";
 description = description.replace(/\./g, '_');
 
 //full export params 
 var exportParams = {
  image: classified_prob_2020,
  description: description,
  fileNamePrefix: fileNamePrefix,
  scale: base_scale.getInfo(),
  region: Brazil,
  folder: "2020RFPs_AllTrainingRatio",
  maxPixels: 10000000000000
};

// Export the image to Drive
Export.image.toDrive(exportParams)
 
}

print(RFPs2020,"RFPs2020")

//NB; Checking of model performance in carried out in R. See scripts provided in Cerullo et al. 2024. 

///////////////////////////////////////////////////////////////////////
// Based on R analysis, the best model structure is: 
//.....................................................................
//---------------------------------------------------------------------
//                          An expansion threshold of 5%, with a 1:4 expansion/no-expansion split of training data. 
//---------------------------------------------------------------------
//.....................................................................
//////////////////////////////////////////////////////////////////////


//assign the best classifier (NB: Must ensure that I assign expansion properly at the top, and then index the correct classifier
//from the list of classifiers ); 0-4 (0 = 1:1,   1 = 1:2, 2 = 1:4, 3 = 1:8, 4 = 1:16 )
var CalculateProbClassifier = classifiers[2];

//===================================================================================
// WE therefore now apply this model to predict TO PREDICT 2020-2030 expansion
//===================================================================================

//apply the classifier that we trainined on 2000-2010 data and tested on 2010-2020 data 
//to predcit 2020-30 expansion...and visualise outcome 
//var classified_prob_2030 = relative_time_format_2030.classify(CalculateProbClassifier).unitScale(0,1).multiply(100).rename('classified_prob_2030')
var classified_prob_2030 = relative_time_format_2030.classify(CalculateProbClassifier).rename('classified_prob_2030');
Map.addLayer(classified_prob_2030,
//  {min:0, max:100, palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
  {palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
  "Random Forest Probability 2030");

//--------------------------------------------------------------------------------------
//export 2030 probability prediction 
//--------------------------------------------------------------------------------------

//export probability layer
Export.image.toDrive({
  image: classified_prob_2030,
  description: "classified_prob_2030",
  scale: base_scale.getInfo(),
  region: Brazil,
  maxPixels: 10000000000000,
});


//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
//export LOGISTIC REGRESSION analysis outputs (training point for all training tatio + predictor surface for 2010) 
//>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//export predictions surface for 2020

var relative_time_format_2020 = relative_time_format_2020.addBands(Pchange_2010_20).toInt()

Export.image.toDrive({
image: relative_time_format_2020,
description:  "BRAZ_Predictors_2010_2020_ForLogistic",
scale: base_scale.getInfo(),
region: Brazil,
maxPixels: 10000000000000,
folder: "AllLogisticTrainingData"
});


// calculate importance values showing the importance of each variable in the model
var dict = CalculateProbClassifier.explain();
print('Explain:',dict);
var variable_importance = ee.Feature(null, ee.Dictionary(dict).get('importance'));
var chart =
  ui.Chart.feature.byProperty(variable_importance)
    .setChartType('ColumnChart')
    .setOptions({
      title: 'Random Forest Variable Importance',
      legend: {position: 'none'},
      hAxis: {title: 'Bands'},
      vAxis: {title: 'Importance'}
    });
//print(chart);



