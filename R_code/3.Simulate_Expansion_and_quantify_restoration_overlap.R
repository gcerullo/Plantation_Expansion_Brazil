# This codes simulates expansion in plantation based on the probability of expansion surface, and then explores the extent of overlap
# with restoration priority areas for terrestrial vertebrates in Brazil, as defined in Strassburg et al. 2020. 
# The probability of expansion surface is developed as described in GEE code, using random forest models that use
# biophysical, economic and spatial-contagion predictors. 

rm(list = ls())
#expansion under different scenarios
#library(raster)
library(sp)
library(dplyr)
library(ggpointdensity)
library(tidyverse)
library(caret)
library(cowplot)
library(yardstick)
library(sf)
library(ggpubr)
library(raster)


#sedWd
setwd("C:/Users/Gianluca Cerullo/OneDrive - University of Cambridge/PhD/Chapter_1_Eucalyptus_Expansion/Complete_folder/DifferentExpansionAmounts")


#read in dependencies ####
#read in best-fitting 2030 probability of expansion map, generated from random forest model.  
prob <- raster("Data/RFP2030expansion_05TR_4.tif")
##read in restoration importance map for terrestrial vertebrates 
avoidedExt <- raster("Data/Moll_Avoided_extinction_per_10km2.tif")
plot(avoidedExt)
plot(prob)


#set params ####

#Set what percentage of expansion is asigned to each pixel
n = 12


#build dataframe ####


#mask avoided extinctions to clip to prob (Braz Outline)
avoidedExt <- raster::mask(avoidedExt,prob)
plot(avoidedExt)

#turn probability layer(s) into dataframe
prob_df <- as.data.frame(prob)
avoidedEXt_df <- as.data.frame(avoidedExt)

#make dataframe of expansion prob and restoration priority 
full_data <- cbind(prob_df, avoidedEXt_df) %>% 
  rename(ExpansionProb = 1, 
         AvoidedExt = 2) %>% 
  na.omit() %>% 
  #remove cells that cannot be restored
  filter(!AvoidedExt == 0) %>% 
  
  mutate(CellID = row_number()) %>%  # give each cell a Unique ID 
  relocate(CellID, .before = ExpansionProb ) #put cellID first 
  
#Calculate top restoration areas ####

#turn restoration into 1% percentiles 
full_data <-full_data %>% mutate(AvoidedExt_tiles = ntile(AvoidedExt, 100))


#calculate top 30% percentile of restoration area (binary 1,0) - new col
full_data <- full_data %>% mutate(top30Restore = case_when(
  AvoidedExt_tiles >= 70 ~ 1, #if > or equal to 70th percentile,1
  AvoidedExt_tiles < 70 ~ 0 #if not, 0
))

#calculate top 10% perctile of restoration area (binary 1,0) - new col
full_data <- full_data %>% mutate(top10Restore = case_when(
  AvoidedExt_tiles >= 90 ~ 1, 
  AvoidedExt_tiles < 90 ~ 0
))

#calculate top 1% perctile of restoration area (binary 1,0) - new col
full_data <- full_data %>% mutate(top1Restore = case_when(
  AvoidedExt_tiles >= 99 ~ 1, 
  AvoidedExt_tiles < 99 ~ 0
))

#calculate the bottom 30% worst areas for restoration (i.e. areas where expansion 
#could take place with limited impacts on biod. co-benefits)
#calculate top 1% perctile of restoration area (binary 1,0) - new col
full_data <- full_data %>% mutate(bottom30Restore = case_when(
  AvoidedExt_tiles <31  ~ 1, 
  AvoidedExt_tiles > 31 ~ 0
))

#add a column that says land area per pixel expanded into
full_data <- full_data %>% mutate(ha_per_cell = (1000/100)*n) 

#sort probability of expansion into 1000 quintiles
full_data <- full_data %>% mutate(ExpProb_tiles = ntile(ExpansionProb, 1000)) 


#summarise the expansion potential of restoration priorities 



x1<- full_data %>% filter(top1Restore == 1) %>%
  summarise(meanProb = mean(ExpansionProb),
            se = sd(ExpansionProb)/sqrt(n())) %>% cbind(TopRestore = "Top 1%" )

x10 <- full_data %>% filter(top10Restore == 1) %>% 
                  summarise(meanProb = mean(ExpansionProb),
                            se = sd(ExpansionProb)/sqrt(n())) %>% cbind(TopRestore = "Top 10%" )

x30<- full_data %>% filter(top30Restore == 1) %>%
  summarise(meanProb = mean(ExpansionProb),
            se = sd(ExpansionProb)/sqrt(n())) %>% cbind(TopRestore = "Top 30%" )

xb30 <- full_data %>% filter(bottom30Restore == 1) %>%
  summarise(meanProb = mean(ExpansionProb),
            se = sd(ExpansionProb)/sqrt(n())) %>% cbind(TopRestore = "Bottom 30%" )

all  <- full_data %>% 
  summarise(meanProb = mean(ExpansionProb),
            se = sd(ExpansionProb)/sqrt(n())) %>% cbind(TopRestore = "All" )


restExp <- rbind(all, x1,x10,x30, xb30)


#plot 
my_colours <- c("#73D055FF","#440154FF","#1F968BFF","#FDE725FF","red")
restExp %>% ggplot(aes(x = TopRestore, y = meanProb,colour = TopRestore)) +
  geom_point(size = 4, alpha = 0.8) +
  geom_errorbar(aes(ymin = meanProb - se, ymax = meanProb + se),
                width = 0.2) +
  xlab("Restorable Area") +
  ylab("Plantation Expansion Probability") +
  scale_color_manual(values = my_colours) +
  theme_pubr(base_size = 16)+
  theme(legend.position = "none")


# Simulate expansion  ####


#make a function that filters <  different quantiles of expansion, and calculates
#(1) the total amount of expansion
#(2) the amount of expansion into restoration areas 
#This function works by filtering cells lower than a given expansion quintlile 
# and summing the number: 
#(a)  of 1 (or 1s) in the top 1,10,30 of expansion 
#(b) the total area of expansion 

# top 30% ####
#make empty dataframe 
top30_df <- data.frame()
#initiate forloop 
for(i in seq(1:999)){

overlap30 <-  full_data %>% 
  #
  filter(ExpProb_tiles > i) %>% 
   mutate(TOTAL_cell_exp = n(),
         RESTORE_cell_overlap = sum(top30Restore),
         TOTAL_exp_ha = sum(ha_per_cell)) %>% 
  filter(top30Restore ==1) %>% mutate(
         OVERLAP_ha = sum(ha_per_cell)) %>% 
  dplyr::select(TOTAL_cell_exp, RESTORE_cell_overlap,TOTAL_exp_ha, OVERLAP_ha) %>% 
  unique() 

#append each row to dataframe
 top30_df <- bind_rows(top30_df,overlap30)
 
#calculate percentage of expansion area that is high restoration priority 
 top30_df <- top30_df %>% mutate(
   percent_overlap = OVERLAP_ha/TOTAL_exp_ha*100) %>% 
 #add a column telling us what priority restoration areas we've looked at
     mutate(TopRestore = 30)
 }

# top 10%####
#make empty dataframe 
top10_df <- data.frame()
#initiate for loop 

for(i in seq(1:999)){
  
  overlapN <-  full_data %>% 
    #
    filter(ExpProb_tiles > i) %>% 
    mutate(TOTAL_cell_exp = n(),
           RESTORE_cell_overlap = sum(top10Restore),
           TOTAL_exp_ha = sum(ha_per_cell)) %>% 
    filter(top10Restore ==1) %>% mutate(
      OVERLAP_ha = sum(ha_per_cell)) %>% 
    dplyr::select(TOTAL_cell_exp, RESTORE_cell_overlap,TOTAL_exp_ha, OVERLAP_ha) %>% 
    unique() 
  
  #append each row to dataframe 
  top10_df <- bind_rows(top10_df,overlapN)
  
  #calculate percentage of expansion area that is high restoration priority 
  top10_df <- top10_df %>% mutate(
    percent_overlap = OVERLAP_ha/TOTAL_exp_ha*100) %>% 
  #add a column telling us what priority restoration areas we've looked at
   mutate(TopRestore = 10)
}


#top 1%####
#make empty dataframe 
top1_df <- data.frame()
#initiate forloop 
for(i in seq(1:999)){
  
  overlapN <-  full_data %>% 
    #
    filter(ExpProb_tiles > i) %>% 
    mutate(TOTAL_cell_exp = n(),
           RESTORE_cell_overlap = sum(top1Restore),
           TOTAL_exp_ha = sum(ha_per_cell)) %>% 
    filter(top1Restore ==1) %>% mutate(
      OVERLAP_ha = sum(ha_per_cell)) %>% 
    #selecting only columns we need 
   dplyr::select(TOTAL_cell_exp, RESTORE_cell_overlap,TOTAL_exp_ha, OVERLAP_ha) %>% 
    #filer unique 
    unique() 
  
  #append each row to dataframe 
  top1_df <- bind_rows(top1_df,overlapN)
  
  #calculate percentage of expansion area that is high restoration priority 
  top1_df <- top1_df %>% mutate(
    percent_overlap = OVERLAP_ha/TOTAL_exp_ha*100) %>% 
    #add a column telling us what priority restoration areas we've looked at
     mutate(TopRestore = 1)
}

#bottom 30%####
#make empty dataframe 
bottom30_df <- data.frame()
#initiate forloop 
for(i in seq(1:999)){
  
  overlapN <-  full_data %>% 
    #
    filter(ExpProb_tiles > i) %>% 
    #calculate cell level overlap 
    mutate(TOTAL_cell_exp = n(),
           RESTORE_cell_overlap = sum(bottom30Restore),
           #totalamount of expansion per hectre
           TOTAL_exp_ha = sum(ha_per_cell)) %>% 
    #total amount of overlap with restoration areas
    filter(bottom30Restore ==1) %>% mutate(
      OVERLAP_ha = sum(ha_per_cell)) %>% 
    #selecting only columns we need 
    dplyr::select(TOTAL_cell_exp, RESTORE_cell_overlap,TOTAL_exp_ha, OVERLAP_ha) %>% 
    #filer unique 
    unique() 
  
  #append each row to dataframe 
  bottom30_df <- bind_rows(bottom30_df,overlapN)
  
  #calculate percentage of expansion area that is high restoration priority 
  bottom30_df <- bottom30_df %>% mutate(
    percent_overlap = OVERLAP_ha/TOTAL_exp_ha*100) %>% 
    #add a column telling us what priority restoration areas we've looked at
    mutate(TopRestore = 70)
}

#combine top30, top 10 and top 1 results#### 
expansion_outcomes = rbind(top1_df,top10_df,top30_df,bottom30_df) #%>% 

#add a column that shows what exact overlap would look like (e.g. whether overlap is exactly proporortional, so that if
#if 1,000,000 hectares of expansion happens, we would expect 30% of this to occur in the top 30% areas)
#Nb; ProportionateExpansion for bottom 30 is incorrect (ingnore - is actually same as top30)
expansion_outcomes <- expansion_outcomes %>% 
  mutate(ProportionateExpansion = TOTAL_exp_ha/100*TopRestore)
expansion_outcomes$TopRestore <- as.character(expansion_outcomes$TopRestore )


#summaries for manuscript 
Sum <- expansion_outcomes %>% filter(TOTAL_exp_ha > 2800000 & TOTAL_exp_ha < 2810000)

Sum2 <- expansion_outcomes %>% filter(TOTAL_exp_ha > 4000000 & TOTAL_exp_ha < 4010000)

Sum3 <- expansion_outcomes %>% filter(TOTAL_exp_ha > 1000000 & TOTAL_exp_ha < 1010000)

sum4 <- expansion_outcomes %>% filter(TOTAL_exp_ha > 2000000 & TOTAL_exp_ha < 2010000)

sum5 <- expansion_outcomes %>% filter(TOTAL_exp_ha > 3000000 & TOTAL_exp_ha < 3010000)

#HOW MUCH OVERLAP FOR 2 TO 3 MHA OF EXPANSION
MH_2_3 <- sum5$OVERLAP_ha - sum4$OVERLAP_ha
MH_2_3_propOverlap = (MH_2_3/1000000)*100

#visualise results; how does overlap and expansion vary with diff expansion ####

#FOR REFERENCE 
#2801155 - expansion between 2010-2020 in Brazilian timber plantations 

#remove scientific notation
 options(scipen=999)

 # graph results

#look at percentage overlap
ylims_list <- list(
  ylim = c(0,7),
  ylim=c(0,40), 
  ylim= c(0,80)
)
 
 
 
#add 0 to df to help with plotting and ensuring free_scales starts at 0 
zeros <- data.frame(TOTAL_exp_ha = c(0, 0, 0), 
                    percent_overlap = c(0, 0, 0), 
                    TopRestore = as.character(c("1", "10", "30")))

hlines <- data.frame(TopRestore = as.character(c("Top 1 %", "Top 10 %", "Top 30 %")), 
                          hline = c(1,10,30))

expansion_outcomes <- expansion_outcomes %>% bind_rows(zeros)

#show percentage overlap with increasing expansion ####
p1 <-  expansion_outcomes %>% 
  filter(TopRestore < 50) %>%  #remove plotting for bottom 70%
  mutate(TopRestore = case_when(TopRestore == 1 ~ "Top 1 %", 
                                TopRestore == 10 ~ "Top 10 %", 
                                TopRestore == 30 ~ "Top 30 %"))  %>% 
  #convert to Mha
  mutate(TOTAL_exp_ha = TOTAL_exp_ha/1000000) %>% 
  ggplot(aes(TOTAL_exp_ha, percent_overlap, group= TopRestore,colour = TopRestore, fill = TopRestore))+
   #geom_point()+
   geom_line(linewidth = 3)+
   xlab("Amount of Plantation Expansion (Mha)")+
   ylab("Amount of Overlap (%)")+
   xlim(0, 4)+
   facet_wrap(~TopRestore, scales = "free_y")+
   geom_vline(xintercept = 2801155/1000000, linetype = "dashed",  size = 1.5, alpha =0.2)+
   scale_colour_viridis_d(name = "Top restoration area (%)") +
   scale_fill_viridis_d(name = "Top restoration area (%)") +
   theme_pubr(base_size = 20)+
   theme(legend.position="none", 
         legend.text = element_text(size = 10, face = "bold"))+
  geom_hline(data = hlines, aes(yintercept = hline), linetype = "dashed",  size = 1.5, colour = "black")


#show also cumulative overlap (in ha)
p2 <- expansion_outcomes %>% 
  filter(TopRestore < 50) %>%  #remove plotting for bottom 70%
  mutate(TopRestore = case_when(TopRestore == 1 ~ "Top 1 %", 
                                TopRestore == 10 ~ "Top 10 %", 
                                TopRestore == 30 ~ "Top 30 %"))  %>% 
  mutate(TOTAL_exp_ha = TOTAL_exp_ha/1000000) %>% 
  ggplot(aes(TOTAL_exp_ha, OVERLAP_ha,colour = TopRestore))+
  geom_smooth(size = 2)+
  #add another line showing how much overlap we'd expect if it was proportional
  geom_smooth(aes(TOTAL_exp_ha, ProportionateExpansion),  se = FALSE, alpha =0.01, linetype = "dashed",  size = 1.5, colour = "black")+
  facet_wrap(~TopRestore, scales = "free_y")+
  xlab("Amount of Plantation Expansion (Mha)")+
  ylab("Cumulative Overlap (ha)")+
  xlim(0,4) +
  geom_vline(xintercept = 2801155/1000000, linetype = "dashed",  size = 1.5, alpha =0.2)+
  #annotate(x=6,2801155, y= Inf,label="Extrapolated Expansion",geom="label", vjust = 2, hjust =-0.2)+
  scale_colour_viridis_d(name = "Top restoration priority area (%)") +
  scale_fill_viridis_d(name = "Top restoration priority area (%)") +
  theme_pubr(base_size = 24)+
  theme(legend.position = "none")
        #,panel.grid = element_blank())


#Simulate expansion randomly with different starting seeds ####

df<- full_data %>% filter(ExpansionProb > 0.01)   #NEED TO CHANGE THIS IN THE LOOP TOO
#max amount of expansion we can assign 
sum(df$ha_per_cell)

##max number of cells we can assign 
sum(df$ha_per_cell)
#repeat this 100 times - with different random starting points

# Set up initial values
#how many hectares of expansion to simulation
j <- 4000000

# Create an empty list to store the results
results_list <- list()


# Outer loop for  bootstraps, which allcates expansion randomly over cells in different orders 
for (i in 1:500) {
print(i)
set.seed(i)
#iteration gives the total number of cells expanded into 
iteration <- 1
total_exp_ha <- 0
top1_sum <- 0
top10_sum <- 0
top30_sum <- 

df<- full_data %>% filter(ExpansionProb > 0.01)   #NEED TO CHANGE THIS IN THE LOOP TOO


# Set up empty results dataframe - with cells empty and ready to be populated 
emptycol <- integer(length = j/(n*10)+1)
results <- tibble(
  iteration = emptycol,
  total_exp_ha = emptycol,
  top1_sum = emptycol,
  top10_sum = emptycol,
  top30_sum = emptycol,
  bootstrap = emptycol
  
)


# Loop over additional cells
#while (TRUE) {
  while (TRUE ) {
  # Randomly select a row
   idx <- df[sample(nrow(df), 1), ]
   #store the cell ID of that row 
   Cid <- idx$CellID
  #remove that row based in the cell id 
   df <- df %>% filter(!CellID == Cid)
   
  # Update summary statistics
  total_exp_ha <- total_exp_ha + idx$ha_per_cell
  top1_sum <- top1_sum + idx$top1Restore
  top10_sum <- top10_sum + idx$top10Restore
  top30_sum <- top30_sum + idx$top30Restore

    
  # Add results to dataframe
    
  results[iteration,] <- 
    t(c(iteration = iteration,
      total_exp_ha = total_exp_ha,
      top1_sum = top1_sum,
      top10_sum = top10_sum,
      top30_sum = top30_sum,
      #store the bootstrap 
      bootstrap = i))
    
  
  # Increment iteration counter
  iteration <- iteration + 1

 # #  Check if we have reached a stopping condition (e.g. total_sum >= expansionsion_amount_specified)
   if (total_exp_ha >= j) {
     break
   }
} # end of while loop


# Store the results in the list
results_list[[i]] <-  results
results_list     
}

saveRDS(results_list, "bootstrap_random_expansion")

#Read back in bootstraps of expansion ####
results_list <- readRDS("bootstrap_random_expansion")
all_results <- do.call("rbind", results_list)

#pivot dataframes to correct format 
pivot_fun <- function(x){
# build figure-ready dataframe 
x %>% 
  pivot_longer(cols = c(top1_sum, top10_sum, top30_sum), 
                               names_to = "TopRestore", 
                               values_to = "OverlapCells") %>% 
  mutate(OVERLAP_ha = OverlapCells*(n*10)) %>% 
  mutate(TopRestore = case_when(
    TopRestore == "top1_sum" ~ 1, 
    TopRestore == "top10_sum" ~10, 
    TopRestore == "top30_sum" ~30
  )) %>% 
  #add a line showing proportionate restoration expansion
  mutate(ProportionateExpansion = total_exp_ha/100*TopRestore) %>% 
  #mutate(TopRestore = as.factor(TopRestore)) %>% 
  #remove cells where total_exp_ha = 0; these were an artefact to get the loop to run 
  filter(!total_exp_ha == 0)
}

#apply piv function to list 
boot_list <- lapply(results_list, pivot_fun) 


#filter only a subset of the data to make plotting simpler
filt_seq <- as.data.frame(seq(1, 33001, by = 100)) %>% rename(iteration =1 )
filt_fun <- function(x){
  filt_seq %>%  left_join(x, by = "iteration")
}

boot_list <- lapply(boot_list, filt_fun)
boot_df <- do.call("rbind", boot_list)

#add proportionate col
boot_df <- boot_df %>% mutate(ProportionateExpansion = total_exp_ha/100*TopRestore) %>% drop_na()


#remove scientific notation
options(scipen=999)

library(ggdist)
#plot with percentiles
p3 <- boot_df %>% 
  mutate(TopRestore = as.factor(TopRestore)) %>% 
  mutate(TopRestore = case_when(TopRestore == 1 ~ "Top 1 %", 
                                TopRestore == 10 ~ "Top 10 %", 
                                TopRestore == 30 ~ "Top 30 %")) %>% 
  mutate(total_exp_ha = total_exp_ha/1000000) %>% 
  ggplot(aes(x = total_exp_ha, y = OVERLAP_ha)) +
  stat_lineribbon(.width = c(0.05, 0.25,0.5, 0.75, 0.95))+
  facet_wrap(~TopRestore, scales = "free_y")+
  geom_line(aes(x = total_exp_ha, y = ProportionateExpansion),linetype = "dashed", colour = "black") +
   # geom_errorbar(aes(ymin = lower_ci, ymax = upper_ci)) +
  xlab("Amount of Plantation Expansion (ha)")+
  ylab("Cumulative Overlap (Mha)")+
  #xlim(0,4000000) +
  geom_vline(xintercept = 2801155/1000000, linetype = "dotted", size = 1.5, alpha =0.2)+
  
  theme_pubr(base_size = 16)+
  theme(legend.title = element_blank())
