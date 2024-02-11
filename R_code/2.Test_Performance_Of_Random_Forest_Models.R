#This code calculates how well different random forest models predict true plantation expansion
#these model were trained on 2000-2010 data to predict 2010-2020 expansion 
#First we read in the 2020 RFP probability surfaces created to predict: 
#(i) different amounts of exansion - 5,10,15%;
#(ii) using differnt training ratios of presence and absensce points.  


#tested are: 
#5,10,15% plantation expansion thresholds
#1,2,4,8,16 times the true ratio of 0s and 1s in the 2000-2010 period, provided as training points 
#Note that in all cases we provide all expansion points (1) and then provide absence points (0) in different ratios

rm(list = ls())

library(raster)
library(sp)
library(caret)
library(dplyr)
library(tidyverse)
library(cowplot)
library(yardstick)
library(sf)
library(measures)
library(viridis)
library(biscale)
library(ggpubr)
library(ModelMetrics)
library(precrec)
library(Metrics)

setwd("C:/Users/Gianluca Cerullo/OneDrive - University of Cambridge/PhD/Chapter_1_Eucalyptus_Expansion/Complete_folder/RF_performance")

#import dependencies ####

#read in Probability surfaces for 2010-2020 generated in GEE 
#each probability surface is created from a different RF model that uses a different combination of expansion thresholds (5,10,15%)
#and ratio of expanded to unexpanded training points (see GEE code). 

#AUC and Brier are threshold independent performance metric (auc_roc, auc_pr, brier), so we give the full probability data and see how well this predicts binary outcomes (0,1)
Prob_files<-list.files('Data/2020RFPs_AllTrainingRatio/',
                         pattern = '*.tif',
                         full.names = TRUE)

#read in GEE binary probability outputs outputs - for testing threshold independent-performance metrics (Precision, Recall, F1)
#also generated in GEE
Prob_files_bin<-list.files('Data/2020RFPs_BinaryRFPS/',
                           pattern = '*.tif',
                           full.names = TRUE)
print(Prob_files)
print(Prob_files_bin)
Prob_data <-lapply(Prob_files, raster::stack)


#Other dependencies  ####
#logistic results for threshold-independent metrics - generated in logistic regression script
logist_results <- read.csv("LogisticRegression_BrierAUC_Results_2.csv") %>% dplyr::select(-X) 

#logistics results after converted probability to binary using Bernoulli distribution - generated in logistic regression script
logistic_binary_results <- read.csv("BinaryPrecision_Recall_F1_Logistic2.csv") %>% dplyr::select(-X) 

#make a dataframe to populate Brier and AUC scores with 
#(make sure this matches the order of probability surface data read in)
training_ratio <- data.frame(training_ratio = c(16,1,2,4,8,
                                                16,1,2,4,8,
                                                16,1,2,4,8))

expansion <-  data.frame(expansion = rep(c(5, 10, 15), each = 5)) 

#dataframe of expansion thresholds and training ratios
results <- cbind(expansion, training_ratio)
result1 <- cbind(expansion, training_ratio)


#turn rasters to csv for each training ratio; rename RFP surface as "prediction" and actual 2010-2020 expansion as "actual"
df_fun <- function(x){
  x %>% as.data.frame() %>% na.omit() %>% 
    rename(predictions = 1, actual = 2) 
}

RFP2020_dfs <- lapply(Prob_data,df_fun)# 


#COMPUTE PERFORMANCE METRICS ####

#BRIER ####

# Brier of actual and predicted prob for 2010-2020
Brier_fun <- function(x){
# x <- x %>% mutate(predictions = predictions/max(predictions))
  x <- x %>% mutate(predictions = predictions/100)
  
  ModelMetrics::brier(x$predictions,     #remember we have to rescale our prediction between 0-1 to run the Brier test. 
        x$actual, 
        0,1)
}

#apply Brier function to each 2020 RFP
Brier<- lapply(RFP2020_dfs, Brier_fun)
#save Brier as dataframe 
Brier_df  <- data.frame(brier = unlist(Brier))

#add to results for Brier 
Brier_results <- results %>% unique() %>%  cbind(Brier_df)

#AUC #### 
AUC_fun <- function(x){
  precrec_obj<-  precrec::evalmod(scores = x$predictions, labels = x$actual)
  precrec::auc(precrec_obj)
}

AUC <- lapply(RFP2020_dfs, AUC_fun)
AUC_df  <- data.frame(AUC = bind_rows(AUC))

#clean up to tidy format
AUC_df_filt <- AUC_df  %>% dplyr::select(AUC.aucs,AUC.curvetypes) %>% rename(AUC= 1)  
AUC_pr <- AUC_df_filt %>%  filter(AUC.curvetypes == "PRC") %>% cbind(results)
AUC_roc <- AUC_df_filt %>%  filter(AUC.curvetypes == "ROC") %>% cbind(results)
results <- rbind(AUC_pr, AUC_roc) %>%
  left_join(Brier_results, by = c("expansion","training_ratio"))  %>% 
  cbind(Method = "RandomForest")

results$training_ratio <- as.factor(results$training_ratio)

#add logistic results 
results <- results %>% rbind(logist_results)


#plot Brier
BrierPlot <- results %>% dplyr::select(expansion, training_ratio, brier,Method) %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%")) %>% 
  mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  brier, fill = Method))+
  geom_bar(stat = "identity", position = "dodge")+
  facet_wrap(~expansion)+
  ylab("Brier Score")+
  xlab(element_blank())+
  scale_fill_viridis_d(alpha = 0.9)+
  theme_pubr() +
  theme(legend.position = "none", 
        text =element_text(size= 20))


#comparison of ROCs and Precision Recall Curves: https://machinelearningmastery.com/roc-curves-and-precision-recall-curves-for-classification-in-python/
#ROC 
AUCPlot <- results %>% filter(AUC.curvetypes == "ROC") %>%  dplyr::select(expansion, training_ratio, AUC,Method)  %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%"))  %>%
  mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  AUC, fill = Method))+
  geom_bar(stat = "identity", position = "dodge")+
  facet_wrap(~expansion)+
  ylab("ROC_AUC")+
  xlab(element_blank())+
  scale_fill_viridis_d(alpha = 0.9)+
  theme_pubr() +
  theme(legend.position = "none", 
        text =element_text(size= 20))

#PRC - precision recall curves (better for imbalanced datasets, does not incorporate correct 
#classification of "true negatives" - it's focused on accurate description of positives 


PRC_Plot <- results %>% filter(AUC.curvetypes == "PRC") %>%  dplyr::select(expansion, training_ratio, AUC,Method)  %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%"))  %>%
  mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  AUC, fill = Method))+
  geom_bar(stat = "identity", position = "dodge", alpha = 0.9)+
  facet_wrap(~expansion)+
  ylab("PR_AUC")+
  xlab(element_blank())+
  scale_fill_viridis_d()+
  theme_pubr()+
  theme(legend.position = "none", 
        text =element_text(size= 20))

plot_grid(AUCPlot,PRC_Plot,BrierPlot, nrow = 3)

#THRESHOLD INDEPENDENT METRICS USING A BINARISED RFP CALCULATED IN EARTH ENGINE
Prob_data_bin <-lapply(Prob_files_bin, raster::stack)

#turn rasters to csv for each training ratio; rename RFP surface as prediction and actual 2010-2020 expansion as actual

Bin_RFP2020_dfs <- lapply(Prob_data_bin,df_fun)


#for BINARY probability layers created in earth engine -already binarised, just have to replace 100 with 1 
RFP2020_bin_fun <- function(x){
x <- x %>%   mutate(predictions = predictions/100)
x
}
RFP2020_bin <- lapply(Bin_RFP2020_dfs, RFP2020_bin_fun)


AUC_bin <- lapply(RFP2020_bin, AUC_fun)
AUC_bin  <- data.frame(AUC_bin = bind_rows(AUC_bin))


#precision ####
 precision_fun <- function(x){
 precision(x$actual, x$predictions)
}
precision <- lapply(RFP2020_bin, precision_fun)
precision <- as.data.frame(precision %>% unlist()) %>% rename(precision = 1)

#recall#### 
recall_fun <- function(x){
recall(x$actual, x$predictions)
}
recall <- lapply(RFP2020_bin, recall_fun)
recall <- as.data.frame(recall %>% unlist()) %>% rename(recall = 1)

#view precision-recall 
P_R <- result1 %>% cbind(precision) %>%  cbind(recall)

#calculate F-measure 
P_R <- P_R %>% mutate(FMeasure =  (2*precision*recall)/(precision+recall))
P_R <- P_R %>% cbind(Method = "RandomForest")

#add in logistic binary performance 
binary_results <- rbind(P_R,logistic_binary_results)
binary_results$training_ratio <- as.factor(binary_results$training_ratio)

recall_Plot <- binary_results %>%   select(expansion, training_ratio, recall,Method)  %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%")) %>% 
mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  recall, fill = Method))+
  geom_bar(stat = "identity", position = "dodge", alpha = 0.9)+
  facet_wrap(~expansion)+
  ylab("Recall")+
  xlab("Ratio of no-expansion points")+
  scale_fill_viridis_d(alpha = 0.9)+
  theme_pubr() +
  theme(legend.position = "none", 
        text =element_text(size= 20))


precision_Plot <- binary_results %>%   select(expansion, training_ratio, precision,Method)  %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%"))  %>%
  mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  precision, fill = Method))+
  geom_bar(stat = "identity", position = "dodge", alpha = 0.9)+
  facet_wrap(~expansion)+
  ylab("Precision")+
  xlab("Ratio of no-expansion points")+
  scale_fill_viridis_d(alpha = 0.9)+
  theme_pubr() +
  theme(legend.position = "none", 
        text =element_text(size= 20))



F1_Plot <- binary_results %>%   select(expansion, training_ratio, FMeasure,Method)  %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%"))  %>%
  mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  FMeasure, fill = Method))+
  geom_bar(stat = "identity", position = "dodge", alpha = 0.9)+
  facet_wrap(~expansion)+
  ylab("F1_Measure")+
  xlab(element_blank())+
  scale_fill_viridis_d(alpha = 0.9)+
  theme_pubr() +
  theme(legend.position = "none", 
        text =element_text(size= 20))


#FINAL PERFORMANCE METRIC PLOT
all_perform <- plot_grid(AUCPlot,PRC_Plot,F1_Plot,BrierPlot,precision_Plot,recall_Plot, nrow = 3)

#get legend 
with_legend <- results %>% select(expansion, training_ratio, brier,Method)  %>% 
  mutate(expansion = case_when(
    expansion == 5 ~ "5%",
    expansion == 10 ~ "10%",
    expansion == 15 ~ "15%"))  %>%
  mutate(across(expansion, factor, levels=c("5%","10%","15%"))) %>%
  ggplot(aes(training_ratio,  brier, fill = Method))+
  geom_bar(stat = "identity", position = "dodge", alpha = 0.9)+
  facet_wrap(~expansion)+
  scale_fill_viridis_d()+
  theme(legend.position = "bottom", 
        text =element_text(size= 20))


plot_legend <- get_legend(with_legend)

#add legend 
plot_grid(all_perform, plot_legend, ncol = 1, rel_heights = c(1, .05))

