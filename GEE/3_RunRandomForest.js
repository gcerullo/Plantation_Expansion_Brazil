//10.10.2022

//make sure you define expansion - this will determine the threshold of plantation expansion you want to predict...
//also make sure you define the proportion the number of 0 and 1s provided in the training set...as this 
//will have a big influence to the overall probability surface created.


//this code will test the creation of a plantation probability layer based on averaged plantation change across 10 
//years. 

//This model works by building lots of RF models to predict 2000-2010 expansion based on stratification 
//then I apply the ten classifiers and the 10 models of same structure to 2010-2020...and pick the best one. 
//this best model is then the one I am going to use to predict 2020-2030. 

//------------------------------------------------------------------------------------------------------------
// IMPORT DEPENDENCIES 
//------------------------------------------------------------------------------------------------------------
var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil'))
Map.addLayer(Brazil, {}, 'Brazil', true);
//import image with all predictor and depependent variable stored in a single image
var merged = ee.Image('users/GEE_tutorial/10km_analysis/10km_full_RF_data');

//get base scale 
var base_raster = ee.Image('users/GEE_tutorial/BaseScaleRasters/baseRaster10km2Molleweide');
var base_rasterProjection = base_raster.projection();
var base_scale = base_raster.projection().nominalScale();
var Brazil = ee.FeatureCollection('USDOS/LSIB_SIMPLE/2017').filter(ee.Filter.eq('country_na', 'Brazil')).geometry().bounds();



//------------------------------------------------------------------------------------------------------------
// DEFINE KEY PARAMETRES
//------------------------------------------------------------------------------------------------------------

//1. How much expansion do we want to be able to predict in the cell (5%, aprox 500m, 10% approx 1sqkm, or 15% approx 1.5sqm km )
//simply change here to test other amounts of expansion [this will automatically change the name of the file upon export ]

//var expansion = 0.05   //predict 5% expanson between 2000-10
// var expansion = 0.1    //predict 10% expanson between 2000-10
var expansion = 0.15   //predict 15% expanson between 2000-10

//1. decide what surface we want to stratify the training sample by

// BandToStratifyOn = 'Pchange_Type_10_2010'      //stratify based on amount and type of expansion [e.g. 0-1 or 1-1; small or large] 

var BandToStratifyOn = '10_yr_ex'           //stratify just based on binary expansion or not 0 -1   


//Now we define the ratio of 0s and 1s in the training set. We keep the 0s fixed, and alter that 1s according to their true ratio  

//first we decide the fixed number of points that are going to go 0s (unexpanded training cells )
var UnexpandedTrainingPoints = 10000 //#No. points that go to the the 0 majority class

//next we define how many expansion cells we are going to give in the training data. This varies from 1 being in true proportion... to 
//proportions above or below the true ratio... 
//BE CAREFUL THAT IN EXP_RATIO > 1 THAT WE DON'T INCLUDE MORE EXPANSION POINTS THAN ACTUALLY OCCURED...ELSE WE WILL DUPLICATE THE SAME EXPANSION POINT

//var EXP_RATIO = 0.25
//var EXP_RATIO = 0.5
var EXP_RATIO = 1
//var EXP_RATIO = 2
//var EXP_RATIO = 4

// //2. What ratio of of presence to absence training points do we want to assign 
// //This determine the proportion of 0 to 1 training points that are provided for fitting the model

// var UNEX = 1  //provides a 1:1 ratio of 0;1 training points
// //var UNEX = 4
// var UNEX = 8  //provides an 8:1 ratio of 0;1 training points
// //var UNEX = multiplicationFactor //provides 0s in true ratio to observed in reality; NEED TO RUN THIS FURTHER DOWN




//------------------------------------------------------------------------------------------------------------
// CALCULATE KEY VARIABLES
//------------------------------------------------------------------------------------------------------------

//note this code has two models; you need to go through and test the one you want
//Either to predict ten year plantation expansion (2000-2010) with a subsequent 2010-2020 test
// OR predict five year plantation expansion (2005-2010) with a subsequent 2010- 2015 test 


//print the names of the bands 
print(merged.bandNames())

//ten-year model 

//FOR THE YEAR 2010 CALCULATE THE PREVIOUS 10 YEARS OF PLANTATION CHANGE 
var Pchange_2000_10 =  merged.select("plant_2010").subtract(merged.select('plant_2000')).rename(['Pchange_2000_10']);

//Map.addLayer(Pchange_2000_10, {}, 'Pchange_2000_10', false);
//Make a change between 2010-20 latyer to test  future predictability for 10-year model 
var Pchange_2010_20 =  merged.select("plant_2020").subtract(merged.select('plant_2010')).rename(['Pchange_2010_20'])

var Pchange_2020_21 =  merged.select("plant_2021").subtract(merged.select('plant_2020')).rename(['Pchange_2020_21'])


//NEXT UP WE CALCULATE TWO LAYERS DESCRIBING THE DYNAMICS OF PLANTATION CHANGE - TRAN AND BINS; 
//THESE TOGaETHER GO ON TO FORM THE LAYER WE USE TO STRATIFY TRAINING POINTS IN OUR MODEL 


//..........................................................................................................
//TRANS - Showing ehther or not a cell is undergoing a 0-1, 0-0, 1-1, or 1-0 transition
//..........................................................................................................
// ADD A BAND THAT DETERMINES IF A CELL UNDERGOES a binary transition BETWEEN 2000-2010
//2 = SHRINK (from >0.05 to <0.05) - WHITE ---> 1>>0
//1 = MAINTAINS PLANT (from >0.05 to >0.05) - LIGHT GREY ---> 1>>1
//0 = REMAINS UNPLANTATIONED (from <0.05 to <0.05) - DARK GRAY  ---> 0>>0
//-1 = EXPANSION (from <0.05 to > 0.05) -BLACK   ---> 0>>1

// //10-year model 

var tran_2000_10 = merged.select('plant_2000').gt(expansion).multiply(ee.Image(2)).subtract(merged.select('plant_2010').gt(expansion)).rename('tran_2000_10')


//var tran_2000_10 = merged.select('plant_2000').gt(0.05).multiply(ee.Image(2)).subtract(merged.select('plant_2010').gt(0.05)).rename('tran_2000_10')
Map.addLayer(tran_2000_10, {}, 'tran_2000_10', false);  //determines what type of land-cover transition or remaining the same happens (e.g. classifies 0-1, 1-1 transitions)
//Add these bands 
var merged_2010 =  merged.addBands(tran_2000_10).addBands(Pchange_2000_10).addBands(Pchange_2010_20).addBands(Pchange_2020_21)
print(merged_2010.bandNames())


//..........................................................................................................
//BINS OF AMOUNT OF CHANGE - showing the amount of plantation expansion or contraction occuring in each pixel
//..........................................................................................................

////Create a band that determines the AMOUNT of plantation expansion that occurs in each pixel pver 10 yrs. 
//(e.g. not just whether there is a transition...but how much actual change...)

// ASSIGN TRAINING POINT BASED ON 10- Year Patterns 
var bins_10_2010 = merged_2010.select("Pchange_2000_10")
          .where(Pchange_2000_10.gt(-0.05).and(Pchange_2000_10.lte(0.05)), 0)     // no change (0)  ---> GREEN
          .where(Pchange_2000_10.gt(0.05).and(Pchange_2000_10.lte(0.3)), 1)       //small increases (1) --> BLUE
          .where(Pchange_2000_10.gt(0.3).and(Pchange_2000_10.lte(1)), 2)          //large increase (2)  ---> PURPLE
          .where(Pchange_2000_10.gt(-0.3).and(Pchange_2000_10.lte(-0.05)), -1)    //small decrease(-1) ---> YELLOW
          .where(Pchange_2000_10.gt(-1).and(Pchange_2000_10.lte(-0.3)), -2)       //large decrease (-2) ---> ORANGE
          .rename(['bins_10_2010'])//.toInt32();  //renames bins correctly and ensure they're in integer format  

//Map.addLayer(bins_10_2010, {min: -2, max: 2, palette: ["Orange","#FDE725FF", "#35B779FF", "#31688EFF", "#440154FF"]}, 'bins_2010', false); 

//add  bin band 
var merged_2010 =  merged_2010.addBands(bins_10_2010)


//OR


// //add  bin band 
// var merged_2010 =  merged_2010.addBands(bins_5_2010)

//..........................................................................................................
// CHANGE -- consider transition (TRANS)...AND...amount of change (BIN) within a pixel.
//..........................................................................................................
//we make this layer to show different types of plantation expansion (e.g. expansion within newly plantation-
//occupied cells, expansion within already-occupied cells, and no expansion)..in order to stratify training points


//our stratification layer is created using  an ifelse expression where;

    //TRAN          BIN          THEN         DECRIPTION                         LAYER COLOUR
//    0              0            0           (unplanted, no change              orange 
//   -1              1            1           (new expansion, small increase)    yellow
//   -1              2            2           (new expansion, large increase);   green 
//    1              1            3           (maintain plant, small increase)   blue
//    1              2            4           (maintain plant, large increase);  purple
// all other TRAN * BIN combos = -1 ; white 




//for 10-year model
var Pchange_Type_10_2010 = merged_2010.expression(
  'b("tran_2000_10") == 0 && b("bins_10_2010") == 0 ? 0 : (b("tran_2000_10") == -1 && b("bins_10_2010") == 1 ? 1 : (b("tran_2000_10") == -1 && b("bins_10_2010") == 2 ? 2 : (b("tran_2000_10") == 1 &&  b("bins_10_2010") == 1 ? 3 : (b("tran_2000_10") == 1 &&  b("bins_10_2010") == 2 ? 4 : -1))))'
  
  ).rename('Pchange_Type_10_2010')

//visualise layer with colour scheme 
Map.addLayer(Pchange_Type_10_2010, {min: -1, max: 4, palette: ["White","Orange","#FDE725FF", "#35B779FF", "#31688EFF", "#440154FF"]}, 'Pchange_Type_10_2010', false); 

//add this layer so that we can use it to stratify training points 
merged_2010 = merged_2010.addBands(Pchange_Type_10_2010)


//--------------------------------------------------------------------------------------------------------------------------------------------------
//how many are there of each of the Pchange types that we want to allocate training data by? 
//--------------------------------------------------------------------------------------------------------------------------------------------------


// Reduce the region. Specify as n the pixel value that you want to count the number of pixels of 
var n = 2

var countDictionary = Pchange_Type_10_2010.eq(n).selfMask().reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Brazil,
  crs: base_rasterProjection,
  maxPixels: 1e9,
});
  

// The result is a Dictionary.  Print it.
print(countDictionary, 'Number of Pixels');

//note 
// 0= 69762    1 (new expansion, small) =  596    2(new expansion, big) = 34    3(maintain plant, small in) = 496    4(maintin plant, large in) = 35      -1(all other) = 984



//.............................................................................................................
//WHAT ARE WE PREDICTING - now we specify what we want our model to be able to predict
//.............................................................................................................


// //ten-year model 

//for 2000-2010
//This is predicting plantation expansion of >EXPANSION [expansion threshold defined at top of script] between 2000-2010
var Pexpand_2000_10 = merged_2010.select('Pchange_2000_10').gt(expansion).rename('Pexpand_2000_10')
Map.addLayer(Pexpand_2000_10, {}, 'Pexpand_2000_10', false);

//for 2010-20
var Pexpand_2010_20 = merged_2010.select('Pchange_2010_20').gt(expansion).rename('Pexpand_2010_20')
Map.addLayer(Pexpand_2010_20, {}, 'Pexpand_2010_20', false);




//add the band that we are predicting 
merged_2010 = merged_2010.addBands(Pexpand_2000_10)

//.............................................................................................................
// CALCULATE TOTAL AMOUNT OF EXPANSION  and OF NO EXPANSION - e.g. number of 1s and 0s
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



//............................................................................................................
//PREDICTORS  - now we calculate any additional predictors we think will be important to consider
//.............................................................................................................

//ten year model

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


//............................................................................................................
//EXTRA PREDICTORS  - are there any other ADDITIONAL PREDICTORS we may want to add to the model? 
//.............................................................................................................

//amount of cropland in a cell 
var croplandProp =  ee.Image('users/GEE_tutorial/10km_analysis/cropland_1Okm')
//select the startYear as the year we are interested in 
var croplandProp2000 = croplandProp.select('classification_2000').rename('croplandProp2000')
var croplandProp2010 = croplandProp.select('classification_2010').rename('croplandProp2010')
var croplandProp2020 = croplandProp.select('classification_2020').rename('croplandProp2020')

//amount of pasture in a cell
var pastureProp = ee.Image('users/GEE_tutorial/10km_analysis/pasture_1Okm')
//select the startYear as the year we are interested in 
var pastureProp2000 = pastureProp.select('classification_2000').rename('pastureProp2000')
var pastureProp2010 = pastureProp.select('classification_2010').rename('pastureProp2010')
var pastureProp2020 = pastureProp.select('classification_2020').rename('pastureProp2020')



//proximity to market 
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



//Proportional area coverage of farms >100 ha in a Municipality 
var mun100Farms = ee.Image("users/GEE_tutorial/10km_analysis/100haMunicipalityFarmArea")
var mun100Farms  = mun100Farms
      // Force the next reprojection to aggregate instead of resampling.
    .reduceResolution({
      reducer: ee.Reducer.mean(),
      maxPixels: 100, 
      bestEffort:true
    })
//    Request the data at the scale and projection of the base image.
    .reproject({crs: base_rasterProjection}).rename('mun100Farms')
    
 

//slope 
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
 
 
 var visualization = {
  bands: ['slope'],
  min: -3,
  max: 10000,
  palette: ['000000', '478FCD', '86C58E', 'AFC35E', '8F7131',
           'B78D4F', 'E2B8A6', 'FFFFFF']
};
 
 Map.addLayer(slope, visualization, 'slope');
 
 
//................................................
//add in proportional population at 10km2 year t0 
//................................................

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
     // bestEffort: true,
      maxPixels: 10,
    })  // .reproject({crs: base_rasterProjection}).rename('population2000')

var population2010 = population2010.reproject({
      crs: base_rasterProjection,
      scale: base_scale
    }).reduceResolution({
      reducer: ee.Reducer.mean(),
     // bestEffort: true,
      maxPixels: 10,
    }) // .reproject({crs: base_rasterProjection}).rename('population2010')

var population2020 = population2020.reproject({
      crs: base_rasterProjection,
      scale: base_scale
    }).reduceResolution({
      reducer: ee.Reducer.mean(),
     // bestEffort: true,
      maxPixels: 10,
    })// .reproject({crs: base_rasterProjection}).rename('population2010')

    

//add additional predictors as bands 
var merged_2010 = merged_2010.addBands(croplandProp2000).addBands(croplandProp2010).addBands(croplandProp2020).addBands(pastureProp2000).addBands(pastureProp2010).addBands(pastureProp2020).addBands(proxMarket).addBands(slope).addBands(mun100Farms).addBands(population2000).addBands(population2010).addBands(population2020)
//print(merged_2010.bandNames(), 'merged_2010')


//set default projection 
var merged_2010 = merged_2010.setDefaultProjection(base_rasterProjection.atScale(base_scale))

//.............................................................................................................
// NOW WE DEFINE MODEL PARAMS; SPECIFICALLY regarding STRATIFICATION OF TRAINING POINTS 
//.............................................................................................................


//what is the proportion of 0s to 1s in the real data?
var truePercentageExpandedUnexpanded = NoPixelsOfExpansion.divide(NoPixelsWithoutExpansion).multiply(100)

//how many more 0s are there than 1s?
var multiplicationFactor = NoPixelsWithoutExpansion.divide(NoPixelsOfExpansion)
print (NoPixelsOfExpansion, 'NoPixelsOfExpansion')
print(NoPixelsWithoutExpansion, 'NoPixelsWithoutExpansion')
print(truePercentageExpandedUnexpanded,'truePercentageExpandedUnexpanded')
print(multiplicationFactor,'multiplicationFactor')


////Define params; Expansion and nonExpansion 


//2. Decide number of training points to assign to each of the different values in BandToStratifyOn  


//A. THIS APPROACH ADDS AN INCREASING NUMBER OF ZEROS, AND USES ALL THE 1 (EXPANSION POINTS)
// //a) assign 1s
// //diving my 1 gives us ALL of the expansion points to train on; this is fine, becuase our test is on the subsequent time-period
// var NumExpandedTrainingPoints = NoPixelsOfExpansion.divide(1).toInt()   //#No. points that go to eachOf expansion values in band Pchange_Type_10_2010

// //b) THIS IS DONE ABOVE BY DEFINING [UNEX] IN THE DEFINE KEY PARAMS SECTION AT SCRIPT TOP 
// //but to assign training points in proportion to reality, then need to run UNEX = multiplationFactor

// //var UNEX = multiplicationFactor //NEED TO UNCOMMENT THIS TO RUN TRUE PROPORTION


// print(UNEX, 'Check What Training Ration Im Applying')
 var Unexpanded = 0    //value of the majority unexpanded class   //this defines the class that we want to specifiy a differnt number of training points for
// //var UnexpandedTrainingPoints = NumExpandedTrainingPoints.multiply(UNEX).toInt() //#No. points that go to the the 0 majority class


//B. THIS APPROACH USES A FIXED NUMBER OF 0S (UNEXPANDED) AND VARIES THE PROPORTION OF 1S (EXPANDED) ABOVE AND BELOW THE TRUE RATIO 
////===============TRY NEW ALLOCATION


var NumExpandedTrainingPoints = ee.Number(UnexpandedTrainingPoints).divide(100).multiply(truePercentageExpandedUnexpanded.multiply(EXP_RATIO)).toInt()
//.multiply(truePercentageExpandedUnexpanded)


//show how our training points are split
print(NumExpandedTrainingPoints, 'NumExpandedTrainingPoints')
print(UnexpandedTrainingPoints, 'UnexpandedTrainingPoints')

//.............................................................................................................
// NOW WE SPECIFY THE MODEL STRUCTURE BASED ON THESE PARAMS 
//.............................................................................................................


//...............................................................................................
//filter the  variables we want to use from the full dataset and rename them to relative.time format
//.............................................................................................




var RFbands2010 = merged_2010.select(
//SELECT DEPENDENT VARIABLE 
// //ten year model
'Pexpand_2000_10', //  any cell that undergoes a given threshold of expansion between 2000-2010 [defined at the beggining of the script] is what I am trying to predict

//SELECT PREDICTORS
//'oppcost_1995',
//'oppcost_1996','oppcost_1997','oppcost_1998','oppcost_1999', 
'oppcost_2000',
//'buff_1995',
//'buff_1996','buff_1997','buff_1998','buff_1999', 
'buff_2000',
//'buff10_1995',
//'buff10_1996','buff10_1997','buff10_1998','buff10_1999',
'buff10_2000',  
'BuffChange_97_2000', 
//'BuffChange_95_2000',
'Buff10Change_97_2000', 
//'Buff10Change_95_2000',
//'plant_1995',
//'plant_1996','plant_1997','plant_1998','plant_1999',
'plant_2000',
'PlantChange_97_2000',
//'PlantChange_95_2000',
'eucalypt',

'croplandProp2000', 'pastureProp2000', 'proxMarket',  //add 'EXTRA' predictors 
'slope',
'mun100Farms',
'population2000',
'Pchange_Type_10_2010').bandNames() ;
//print(RFbands2010, 'RFbands2010')  


//make a subset of full data that contains only these bands AND rename them to relative time format
var relative_time_format_2010  = merged_2010.select(RFbands2010).rename(
  '10_yr_ex',
  //'opcost5',
  //'opcost4','opcost3','opcost2','opcost1',
  'opcost0',
  //'buff5',
  //'buff4','buff3','buff2','buff1', 
  'buff0',
  //'buff10_5',
  //'buff10_4','buff10_3','buff10_2', 'buff10_1', 
  'buff10_0', 
  'BuffChange_t3_t0', 
  //'BuffChange_t5_t0',
  'Buff10Change_t3_t0', 
  //'Buff10Change_t5_t0',
  //'plant5',
  //'plant4','plant3','plant2','plant1',
  'plant0',
  'plant_change_t3_t0', 
  //'plant_change_t5_t0',  
  'eucalypt', 
  'croplandProp0', 'pastureProp0', 'proxMarket', 
  'slope',
  'mun100Farms',
  'population',
  'Pchange_Type_10_2010')
  

//stratify the points across the band called Pchange_Type.
var training = relative_time_format_2010.stratifiedSample({ 
region: Brazil, 
classBand: BandToStratifyOn,           
scale: 10000,
numPoints: NumExpandedTrainingPoints, // number of points from the class 
classValues: [Unexpanded],  // majority class [in this case 0]
classPoints: [UnexpandedTrainingPoints], // number of training points from majority class
geometries: true
})//  
//print(training, 'training ')
//visualuise the training points
//Map.addLayer(training, {}, 'training', false);


//save the image bandnames containing only our covariate predictions below. WE MUST REMOVE THE CLASS 
//THAT WE ARE TRYING TO PREDICT (E.G. TEN YR EXPANSION)...as
var RFbands2010_rel_time =  relative_time_format_2010.bandNames().remove('10_yr_ex')


//.............................................................................................................
//TRAIN THE CLASSIFIER 
//.............................................................................................................

//ten-year model 

//remove Pchange_Type_10_2010 as a predictor in  the model; this was just to stratify training points

var RFbands2010_rel_time = RFbands2010_rel_time.remove('Pchange_Type_10_2010')





//fit a classifier that creates a probability of expansion 
var CalculateProbClassifier = ee.Classifier.smileRandomForest(500).
setOutputMode('PROBABILITY')
.train({
  features: training,
  classProperty: '10_yr_ex',   //We train our classifer to predict expansion in 10 years 
//  classProperty: 'threshold',
  inputProperties: RFbands2010_rel_time})



 

//Now apply our classifier (trained on our training data point to the rest of Brazil...making sure that 
//we remove the ClASS we were trying to predict (e.g. only provide covariates)... 
//RFbands2010_rel_time doesn't contain the 10_yr_ex variable 
//print(RFbands2010_rel_time, 'RFbands2010_rel_time')

var classified_prob_2010 = relative_time_format_2010.select(RFbands2010_rel_time).classify(CalculateProbClassifier).unitScale(0,1).multiply(100).rename('classified_prob')
Map.addLayer(classified_prob_2010,
  {min:0, max:100, palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
  "Random Forest Probability 2010");
  

//=======================================================================================
//---------------------------------------------------------------------------------------
// Now we apply the classifier to the 2010-2020 period using the same model structure...
//---------------------------------------------------------------------------------------
//=======================================================================================

//this is the proper test of the model because we are testing the model on completely unseen data
//to do this, we need to select the key predictor variables and rename them to the same format as our trained classifier 
//print(merged_2010,'merged_2010')
//select relevent predictors; THESE MUST MATCH STRUCTURE AND NUMBER OF BANDS OF TRAINED CLASSIFIER 
var RFbands2020 = merged_2010.select(
  
//SELECT PREDICTORS
//'oppcost_2005',
//'oppcost_2006','oppcost_2007','oppcost_2008','oppcost_2009', 
'oppcost_2010',
//'buff_2005',
//'buff_2006','buff_2007','buff_2008','buff_2009', 
'buff_2010',
//'buff10_2005',
//'buff10_2006','buff10_2007','buff10_2008','buff10_2009',
'buff10_2010',  
'BuffChange_07_2010', 
//'BuffChange_05_2010',
'Buff10Change_07_2010', 
//'Buff10Change_05_2010',
//'plant_2005',
//'plant_2006','plant_2007','plant_2008','plant_2009',
'plant_2010',
'PlantChange_07_2010',
//'PlantChange_05_2010',
'eucalypt',

'croplandProp2010', 'pastureProp2010', 'proxMarket', 'slope', 'mun100Farms', 'population2010' //add 'EXTRA' predictors 
).bandNames() ;
//print(RFbands2020, 'RFbands2020')  

//make an image of these predictors and rename to relative time format - this image is what
//we are going to train our classifier on, and we must be able to recognise names. 

var relative_time_format_2020  = merged_2010.select(RFbands2020).rename(
  //'opcost5',
  //'opcost4','opcost3','opcost2','opcost1',
  'opcost0',
  //'buff5',
  //'buff4','buff3','buff2','buff1', 
  'buff0',
  //'buff10_5',
  //'buff10_4','buff10_3','buff10_2', 'buff10_1',
  'buff10_0', 
  'BuffChange_t3_t0', 
  //'BuffChange_t5_t0', 
  'Buff10Change_t3_t0',  
  //'Buff10Change_t5_t0',
  //'plant5',
  //'plant4','plant3','plant2','plant1',
  'plant0',
  'plant_change_t3_t0',  
  //'plant_change_t5_t0', 
  'eucalypt', 
  'croplandProp0', 'pastureProp0', 'proxMarket','slope','mun100Farms','population')

//save these as band names subset them lower down
var RFbands2020_rel_time =  relative_time_format_2020.bandNames()
  
//apply the classifier that we taught on 2000-2010 data on 2010-2020 data and visualise performance 
var classified_prob_2020 = relative_time_format_2020.classify(CalculateProbClassifier).unitScale(0,1).multiply(100).rename('classified_prob_2020')
Map.addLayer(classified_prob_2020,
  {min:0, max:100, palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
  "Random Forest Probability 2020");


//print(CalculateProbClassifier,'CalculateProbClassifier')
//===================================================================================
// PICK THE BEST MODEL FROM ABOVE !!!!!!  - AND THEN WE CAN USE THIS TO PREDICT 2020-2030 
//===================================================================================

// Select correct predictors 
var RFbands2030 = merged_2010.select(
//SELECT PREDICTORS
//'oppcost_2015',
//'oppcost_2016','oppcost_2017','oppcost_2018','oppcost_2019',
'oppcost_2020',
//'buff_2015',
//'buff_2016','buff_2017','buff_2018','buff_2019', 
'buff_2020',
//'buff10_2015',
//'buff10_2016','buff10_2017','buff10_2008','buff10_2009',
'buff10_2010',  
'BuffChange_17_2020',
//'BuffChange_15_2020',
'Buff10Change_17_2020', 
//'Buff10Change_15_2020',
//'plant_2015',
//'plant_2016','plant_2017','plant_2018','plant_2019',
'plant_2020',
'PlantChange_17_2020', 
//'PlantChange_15_2020',
'eucalypt',

'croplandProp2020', 'pastureProp2020', 'proxMarket','slope','mun100Farms','population2020'  //add 'EXTRA' predictors 
).bandNames() ;
//print(RFbands2030, 'RFbands2030')  

//make an image of these predictors and rename to relative time format - this image is what
//we are going to train our classifier on, and we must be able to recognise names. 

var relative_time_format_2030  = merged_2010.select(RFbands2030).rename(
 // 'opcost5',
  //'opcost4','opcost3','opcost2','opcost1',
  'opcost0',
  //'buff5',
  //'buff4','buff3','buff2','buff1',
  'buff0',
  //'buff10_5',
  //'buff10_4','buff10_3','buff10_2', 'buff10_1', 
  'buff10_0', 
  'BuffChange_t3_t0',   
  //'BuffChange_t5_t0', 
  'Buff10Change_t3_t0', 
  //'Buff10Change_t5_t0',
 // 'plant5',
  //'plant4','plant3','plant2','plant1',
  'plant0',
  'plant_change_t3_t0',  
  //'plant_change_t5_t0', 
  'eucalypt', 
  'croplandProp0', 'pastureProp0', 'proxMarket','slope','mun100Farms', 'population')

//apply the classifier that we trainined on 2000-2010 data and tested on 2010-2020 data 
//to predcit 2020-30 expansion...and visualise outcome 
var classified_prob_2030 = relative_time_format_2030.classify(CalculateProbClassifier).unitScale(0,1).multiply(100).rename('classified_prob_2030')
Map.addLayer(classified_prob_2030,
  {min:0, max:100, palette: ['FFFFFF','C6AC94','8D8846','395315','031A00']},
  "Random Forest Probability 2030");


//.............................................................................................................
//CREATE SOME SUMMARIES ON THE PERFORMANCE OF THE PROBABILITY SURFACE
//.............................................................................................................
//var WhichProbSurface = classified_prob_2010
var WhichProbSurface = classified_prob_2020


//check the distribution of probability values 
var distribution = ui.Chart.image.histogram(WhichProbSurface, 
 Brazil, 
 base_scale) 
//10,
//2, 
//100)
.setOptions({
      title: 'Distribution of probabilities',
      minValue: 0,
      legend: {position: 'none'},
      hAxis: {title: 'Probability of expansion'},
      vAxis: {title: 'Number of cells'}
    });
//print(distribution)

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




//------------------------------------------------------------------------------------------------------------
//add other timescales that we need to be able to predict; specifically 2000-2020 and 2010-2020
//------------------------------------------------------------------------------------------------------------
// we actually need the probability surface we generated for 2000-2010 to perform well for post-2010 years, 
//as these are the years that we will be asking our model to predict from 2021 onwards 

//earlier we made a layer called  Pchange_2010_20 which calculate 2020plant - 2010plant. Let's select cells 
//the underwent a >10% expansion during the 2010-2020 period and visually assess how well our 2000-2010
//expansion surface performs over this subsequent period  

//filter plantation change to only show areas with >10% expansion 

//ten-year model (2000-2010)
var Pexpand_2000_2010 = Pchange_2000_10.gt(expansion).rename('Pexpand_2000_2010')
Map.addLayer(Pexpand_2000_2010, {}, 'Pexpand_2000_2010', false);

// 2010-20 (arguably the "true" test of the model)
var Pexpand_2010_2020 = merged.select("plant_2020").subtract(merged.select('plant_2010')).gt(expansion).rename('Pexpand_2010_2020')
Map.addLayer(Pexpand_2010_2020, {}, 'Pexpand_2010_2020', false);


//full twenty years 
var Pexpand_2000_2020= merged.select("plant_2020").subtract(merged.select('plant_2000')).gt(expansion).rename('Pexpand_2000_2020')
Map.addLayer(Pexpand_2000_2020, {}, 'Pexpand_2000_2020', false);

//---------------------------------------------------------------------------------------------------------------------------
// Add these bands so that we can export to R and test model performance. And select bands we care about for the export
//-------------------------------------------------------------------------------------------------------------------------
//The true test of our model is how well our model structure performs at predicting 2010-2020.  
var merged_2010 = merged_2010.addBands(classified_prob_2020).addBands(Pexpand_2010_2020).addBands(classified_prob_2030);


//select only those bands we are interested in testing performance with 
//var export_performance = merged_2010.select("classified_prob").select('Pexpand_10pc_2000_10').select('Pexpand_10pc_2010_2020').select('Pexpand_10pc_2010_2020')

//list of bands we want to export 

//export this if you want to test the model performance from 2010-2020
var toexportTestPerformance = merged_2010.select(['classified_prob_2020', 'Pexpand_2010_2020','classified_prob_2030']).bandNames();
//print(toexportTestPerformance,'toexportTestPerformance')
//export this if you want output JUST 2030 expansion probability surface: 
var toexport2030 = merged_2010.select(['classified_prob_2030']).bandNames();

//select by band list and turn to same format
var toexportTestPerformance = merged_2010.select(toexportTestPerformance).toFloat()
var toexport2030 = merged_2010.select(toexport2030).toFloat()


//-------------------------------------------------------------------------------------------------------------------------
//export ; MAKE SURE NAMES ARE CORRECT
//-------------------------------------------------------------------------------------------------------------------------

//filename for 2010-2020
var file_nameTestPerformance = "BRAZ_"+ expansion*100 + "_percent" + "_TrainingRatio_1_" + EXP_RATIO + "_expansion_10km_2010_2020_Probabilty_Surface_0_100" 

//filename for 2020-2030
var file_name2030 = "BRAZ_"+ expansion*100 + "_percent" + "_TrainingRatio_1_" + EXP_RATIO + "_expansion_10km_2020_2030_Probabilty_Surface_0_100" 

//USE THIS fileNAME TO RUN TRUE RATIO OF TRIANING POINTS; e.g. if UNEX = multiplicationFactor
//var file_name20 ="BRAZ_"+  expansion*100 + "_percent" + "_TrainingRatio_1_TR_expansion_10km_2010_2020_Probabilty_Surface_0_100" 
//var file_nameTestPerformance = "BRAZ_"+  expansion*100 + "_percent" + "_TrainingRatio_1_TR_expansion_10km_2020_2030_Probabilty_Surface_0_100" 


//export probability layer
Export.image.toDrive({
  image: toexport2030,
  description: file_name2030,
  scale: base_scale.getInfo(),
  region: Brazil,
  maxPixels: 10000000000000,
  
});

//export 2010-2020 actual and predicted for testing purposes
Export.image.toDrive({
  image: toexportTestPerformance,
  description: file_nameTestPerformance,
//  description: '10km_Exp_10pc_RF_2000_2010_2020_Probabilty_Surface_0_100',
  scale: base_scale.getInfo(),
  region: Brazil,
  maxPixels: 10000000000000,
  
});


//-----------------------------------------------------------------------------------------------------------------
// export training 2000-2010 and full 2000-2010 and 2010-2020 predicts to explore colinearity and run logistic regression in R 
//-----------------------------------------------------------------------------------------------------------------

//EXPORT EVERYTHING IN 2000-2010 MODEL (so that we can look at correlation between variables. 
//EXPORT THE TRAINING DATA FOR 2000-2010; NOTE THAT YOU NEED TO EXPORT THE TRAINING DATA FOR EACH POSSIBLE RATIO OF TRAINING POINTS 
//EXPORT THE RELATIVE TIME PREDICTORS FOR 2010-2020; NOTE YOU ONLY NEED TO EXPORT THIS ONCE....AS WE CAN THEN RUN EACH OF OUR TRAINING RATIONS AND EXPANSION AMOUNT MODELS OVER IT

// //training ALL 
Export.table.toDrive(training,
expansion*100+ 'pcExpTraining_2000_2010_ForLogistic'+'_TrainingRatio_1_'+ EXP_RATIO,
"Training_2000_2010_ForLogistic")
//print(training)


//2000-2010 ALL                                              //get rid of PchangeType band
var bandsToKeep = relative_time_format_2010.bandNames().remove('Pchange_Type_10_2010')
var relative_time_format_2010 = relative_time_format_2010.select(bandsToKeep).toFloat()
//print(relative_time_format_2010,'relative_time_format_2010')

//2010-2020 ALL
var Pexpand_2010_20 = Pexpand_2010_20.rename('10_yr_ex');
var relative_time_format_2020 = relative_time_format_2020.addBands(Pexpand_2010_20).toFloat();
//print(relative_time_format_2020, 'relative_time_format_2020');



// 
Export.image.toDrive({
image: relative_time_format_2020,
description:  "BRAZ_Predictors_2010_2020_ForLogistic",
scale: base_scale.getInfo(),
region: Brazil,
maxPixels: 10000000000000,
  
});

//===================================================================================
// Average amount of expansion aross cells that undergo expansion
//===================================================================================
//What is the average amount of expansion over ten years (filtered for cells >0.05 expansion, as this is the 
//miniminim threshold below which we might just be looking at satellite errors)? 

//print(merged_2010, 'TOEXPORT')
var ActualExpansion = merged_2010.select(['Pchange_2000_10', 'Pchange_2010_20']).toFloat()

Export.image.toDrive({
image: ActualExpansion,
description:  "ActualExpansion",
scale: base_scale.getInfo(),
region: Brazil,
maxPixels: 10000000000000,
  
});

