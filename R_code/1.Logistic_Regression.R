# This code test permformance of logistic regression models only using contagion variables. 

rm(list = ls())

library(raster)
library(sp)
library(tidyverse)
library(caret)
library(cowplot)
library(yardstick)
library(sf)
library(measures)
library(viridis)
library(ggpubr)
library(ModelMetrics)
library(precrec)
library(Metrics)

setwd("C:/Users/Gianluca Cerullo/OneDrive - University of Cambridge/PhD/Chapter_1_Eucalyptus_Expansion/Complete_folder/LogisticRegression/")

#import dependencies ####

#read in:
#1. the training points 2000-2010, for different expansion thresholds and ratios of
#expanded to unexpanded points, generated from GEE
#2. Actual 2010 expansion and predictors for 2010-2020 logistic regres predictions -also from GEE 


Training_list<-list.files('Data/AllLogisticTrainingData',
                      pattern = '*.csv',
                      full.names = TRUE)

training_pts <-lapply(Training_list, read.csv)

#getting names of files and check the order they're read in 
print(Training_list)

#read in the predictor variables for 2010-2020, and the actual expansion, for running logistic regression models 
Pred2010_2020 <- stack('Data/BRAZ_Predictors_2010_2020_ForLogistic.tif')

# Define key params ####

#make a dataframe to populate model performance with
#(make sure this matches the order of training point data read in)
training_ratio <- data.frame(training_ratio = c(1,16,2,4,8,
                                                1,16,2,4,8,
                                                1,16,2,4,8))

expansion <-  data.frame(expansion = rep(c(10, 15,5), each = 5)) 

#cbind
results <- cbind(expansion, training_ratio)
result1 <- cbind(expansion, training_ratio)

#determine predictors for logistic model ####
#here we only consider contagion predictors from yr t

Selectors_df <- data.frame(Selectors = c("buff0", "buff10_0",  "BuffChange_t3_t0","Buff10Change_t3_t0",'X10_yr_ex'))
Selectors <- Selectors_df$Selectors

#select these cols from training data to make model with
predictors_fun <- function(x){
  x %>% select(all_of(Selectors)) 
}

training_pts <- lapply(training_pts,predictors_fun)

# Determine predictors and actual expansion #### 
Pred2010_2020 <- as.data.frame(Pred2010_2020) %>% na.omit()

#expansion under different thresholds 
expansion_act5pc <- Pred2010_2020 %>% select("X5pcExpansion") %>% rename("actual" =1)
expansion_act10pc <- Pred2010_2020 %>% select("X10pcExpansion") %>% rename("actual" =1)
expansion_act15pc <- Pred2010_2020 %>% select("X15pcExpansion") %>% rename("actual" =1)
list5pc <- replicate(5, expansion_act5pc, simplify = FALSE)
list10pc <- replicate(5, expansion_act10pc, simplify = FALSE)
list15pc <- replicate(5, expansion_act15pc, simplify = FALSE)

#join all three lists in CORRECT order
print(Training_list)
actual_expansion <- do.call(rbind, list(list10pc,list15pc,list5pc))

#predictors - select same predictors as  training data to apply 2010-2020 
Selectors <-  Selectors_df %>% filter(!Selectors == "X10_yr_ex")
Selectors <- as.character(Selectors$Selectors)

#select only those variable we are interested in 
Pred2010_2020 <- Pred2010_2020 %>% select(all_of(Selectors)) 
  
#Run logistic regression models for 2000-2010 based on training data####

#run logistic regression with different training ratios 
LogisticFun <- function(x){
 glm(X10_yr_ex~., family="binomial", data= x)
}

#this creates a different model for each training ratio 
models<- lapply(training_pts, LogisticFun)

#disable scientific notation for model summary
options(scipen=999)

#Predict 2010-2020 expansion ####
predictionsFun <- function(x){
 as.data.frame(predict(x, Pred2010_2020, type="response"))
}

predictions<- lapply(models, predictionsFun)

#combine actual 2010-2020expansion back in
# create an empty list to store the results
ToTest <- list()
for (i in 1:length(predictions)) {
  ToTest[[i]] <- cbind(predictions[[i]], actual_expansion[[i]])
}

colnames(ToTest[[12]])

#rename
rename_fun <- function(x){
  x %>% rename(predict = 1)
}

ToTest <-lapply(ToTest,rename_fun)

#Check logistic model performance #####

#BRIER ####

# Brier of actual and predicted prob for 2010-2020
Brier_fun <- function(x){
#  brier(x$predict,   #predictions must be scaled between 0-1 
 x <- x %>% mutate(predict <-predict/max(predict)) #convert  between 0-1
 brier(x$predict,   #predictions must be scaled between 0-1 
   x$actual, 
  0,1)
}

Brier <- lapply(ToTest, Brier_fun)

#save Brier as dataframe 
Brier_df  <- data.frame(brier = unlist(Brier))

#add to results for Brier 
Brier_results <- results %>% unique() %>%  cbind(Brier_df)
Brier_results$training_ratio <- as.factor(Brier_results$training_ratio)

#AUC-ROC and AUC-PR #### 
AUC_fun <- function(x){
  precrec_obj<-  precrec::evalmod(scores = x$predict, labels = x$actual)
  precrec::auc(precrec_obj)
}


AUC <- lapply(ToTest, AUC_fun)

#clean up to tidy format
AUC_df  <- data.frame(AUC = bind_rows(AUC))
AUC_df_filt <- AUC_df  %>% dplyr::select(AUC.aucs,AUC.curvetypes) %>% rename(AUC= 1)  
AUC_pr <- AUC_df_filt %>%  filter(AUC.curvetypes == "PRC") %>% cbind(results)
AUC_roc <- AUC_df_filt %>%  filter(AUC.curvetypes == "ROC") %>% cbind(results)
results <- rbind(AUC_pr, AUC_roc) %>%
  mutate(training_ratio = as.factor(training_ratio)) %>% 
  left_join(Brier_results, by = c("expansion","training_ratio"))  %>% 
  cbind(Method = "LogisticRegression")

write.csv(results, "LogisticRegression_BrierAUC_Results_2.csv")
getwd()



#for precision, recall and F1 use Bernoulli approach ####

#convert our continuous  probability prediction into a binary 0 or 1 layer in R,using a Bernoulli distribution 
Binarise_fun <- function(x){
  x <- x %>% mutate(predict = predict/max(predict)) #convert RFP layer between 0-1
  x$predict <- rbinom(n = nrow(x), size = 1, prob = x$predict) # convert to binary using Bernoulli distribution
  x
}


ToTest_bin <- lapply(ToTest, Binarise_fun)


#precision 
precision_fun <- function(x){
  precision(x$actual, x$predict)
}
precision <- lapply(ToTest_bin, precision_fun)
precision <- as.data.frame(precision %>% unlist()) %>% rename(precision = 1)

#recall 
recall_fun <- function(x){
  #  x <- x %>% mutate(predictions = predictions/max(predictions)) #convert RFP layer between 0-1
  recall(x$actual, x$predict)
}
recall <- lapply(ToTest_bin, recall_fun)
recall <- as.data.frame(recall %>% unlist()) %>% rename(recall = 1)

#view precision-recall 
P_R <- result1 %>% cbind(precision) %>%  cbind(recall)

#calculate F-measure 
P_R <- P_R %>% mutate(FMeasure =  (2*precision*recall)/(precision+recall))
P_R <- P_R %>% cbind(Method = "LogisticRegression")

##export Precision, Recall and Accuracy 
write.csv(P_R, "BinaryPrecision_Recall_F1_Logistic2.csv")






