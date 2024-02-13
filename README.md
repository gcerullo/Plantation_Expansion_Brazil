# Plantation_Expansion_Brazil
This code is to support the findings of Cerullo et al 2024, Global Change Biology. This code generates the probability of plantation expansion models across Brazil 2020-2030, evaluates model performance, and then uses best-performing models to simulate future exspansion and explore overlap with priority restoration areas. 

Random forest models were built in GEE. Thus processing of most predictors, interfacing with the MapBiomas platform, and construction of random forest models is carried out using code presented in the GEE folder. 

Random forest model performance, comparisons to logistic regressions, and then selection of the best fitting model for predicting plantation expansion probability is then carried out in R. We also simulate plantation expansion and explore overlap with restoration priority areas using code provided in the R script folder. For presentational purposes, final mapped figures were generated in Qgis, but can be replicated using the provided R-code. 

Full descriptions of what each script does is as follows. 

All data-layers not openly avaialble through GEE or else constructed in the following code are openly available at: 
https://zenodo.org/records/10650174

-----------
GEE code 
-----------

1_ProcessMabiomas_data_and_calculate_predictors.js

This code calculates key predictors for RF models and interfaces with the Mapbiomas portal. 

2_BuildMultiBandRaster_of_Predictors.js

This code takes the predictors and land-use coverage data calculated in script one, and produces
a single image where each year of data is provided as a band.

3_RunRandomForest.js

This code runs the random forest models, testing different expansion thresholds (5,10,15%)
and with different ratios of expansion to no-expansion cells across Brazil. 

4_ProcessRestorationLayer.js

This code resamples the Strassburg et al layer showing avoided extinction per hectare
for terrestrial vertebrates from ecosystem restoration. 

-----------
R Code
-----------

1a. BuildFarmSizeByMunicipalityRasters.R

This code caclulates the proportion of each Brazilian municipality covered by farms >100 ha 

1b.Logistic_Regression.R

This code tests permformance of logistic regression models only using contagion variables. 

2.Test_Performance_Of_Random_Forest_Models.R

This code calculates how well different random forest models predict true plantation expansion

3.Simulate_Expansion_and_quantify_restoration_overlap.R

This codes simulates expansion in plantation based on the probability of expansion surface,
and then explores the extent of overlap with restoration priority areas for terrestrial vertebrates in Brazil. 

4.MakingBivariateRastersForBrazAndBiome.R

This code creates bivariate maps showing restoration plantation potential versus 
plantation expansion probability at biome and country scale. Plots are built in R for 
replicability ; finally manuscript figures were built in Qgis. 
