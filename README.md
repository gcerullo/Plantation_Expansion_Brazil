# Plantation_Expansion_Brazil
This code is to support the findings of Cerullo et al 2024, Global Change Biology. This code generates the probability of plantation expansion models across Brazil 2020-2030, evaluates model performs, and then uses best-performing models to simulate future exspansion and explore overlap with priority restoration areas. 

Random forest models were built in GEE. Thus processing of predictors, interfacing with the MapBiomas platform, and construction of random forest models is carried out using code presented in the GEE folder. 

Random forest model performance, comparisons to logistic regressions, and then selection of the best fitting model for predicting plantation expansion probability is then carried out in R. We also simulate plantation expansion and explore overlap with restoration priority areas using code provided in the R script folder. 

For presentational purposes, final mapped figures were generated in Qgis, but can be replicated using the provided R-code. 
