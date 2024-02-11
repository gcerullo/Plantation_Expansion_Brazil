#code for creating bivariate map showing restoration plantation potential versus 
#plantation expansion probability at biome and country scale. Plots are built in R for 
# replicability ; finally manuscript figures were built in Qgis. 

rm(list = ls())

#packages ####
devtools::install_github("mauriciovancine/bivarmap", ref = "HEAD")
library(bivarmap)
library(raster)
library(sp)
library(tidyverse)
library(sf)
library(rgdal)
library(cowplot)
library(viridis)
library(ggpubr)
library(rdgal)
library(terra)

#set wd to where plantation expansion layer and restoration benefit layer are located. 
setwd("C:/Users/Gianluca Cerullo/OneDrive - University of Cambridge/PhD/Chapter_1_Eucalyptus_Expansion/Complete_folder/Bivariate")

#output maps path 
path <- "C:/Users/Gianluca Cerullo/OneDrive - University of Cambridge/PhD/Chapter_1_Eucalyptus_Expansion/Complete_folder/Bivariate/OutputMaps"

#read in dependencies #####
#1. read in the best-fitting probability surface for expansion 2020-2030
#This RF prob surface was built in GEE and the  best model evaluated and selected using the supplied R scripts 

exp2030 <- stack('Data/RFP2030expansion_05TR_4.tif') 
plot(exp2030)
prob <- exp2030[[ "layer"]]

#2. #Read read in Strassburg avoided extinctions from ecosystem restoration;
#NOTE I upsscaled this to ~10km2 in GEE 
ext_km <- raster("Data/Moll_Avoided_extinction_per_10km2.tif")
ext_km <- raster::mask(ext_km, prob) # mask to Braz outline 


#DEFINE PARAMS  
display.brewer.all(colorblindFriendly = TRUE)
my.pallete <- brewer.pal(n = 9, name = "YlOrRd")

#define functions ####

minValFun <- function(x){
  x %>% as.data.frame() %>% na.omit() %>% min()
}

maxValFun <- function(x){
  x %>% as.data.frame() %>% na.omit() %>% max()
}

# write a function for rescaling the raster 
rescale_raster <- function(raster) {

  # get min and max values from raster
  raster_min <- raster::minValue(raster)
  raster_max <- raster::maxValue(raster)

  # rescale raster values between 0 and 1
  raster_rescaled <- (raster - raster_min) / (raster_max - raster_min)

  # return rescaled raster
  return(raster_rescaled)
}


# Brazil-scale Bivariate analysis ####

#rescale exinctions between 0-1 at Brazil scale ####
minRaster <- minValFun(ext_km)
maxRaster <- maxValFun(ext_km)
ext_km_sc <- rescale_raster(ext_km)
plot(ext_km_sc,  col = my.pallete, axes=FALSE, box=FALSE)

# color matrix
full_legend <- bivarmap::bivarmap_colmatrix(nbreaks = 10,
                                          xlab = element_blank(),
                                          ylab = element_blank())


# create bivariate raster
raster_col <- bivarmap::bivarmap_raster(rasterx = prob,
                                        rastery = ext_km_sc,
                                        colmatrix = full_legend,
                                                                                export.colour.matrix = TRUE)
# plot map for visualisation only - final figure is constructed in Qgis
bivarmap::bivarmap_map(bivarmap = raster_col,
                       colmat = full_legend,
                       x_legend_pos = .18,
                       y_legend_pos = .18,
                       x_legend_size = .26,
                       y_legend_size = .26) 

#Export raster to QGis for final plotting
writeRaster(raster_col, filename = paste0(path, "//Brazil_bivar.tif"))

#Biome level   ####


#Read in ShapeFiles for different biomes 
Amazon <- readOGR("Data/Individual_Biomes/Amazon.shp")
Pantanal <- readOGR("Data/Individual_Biomes/Pantanal.shp")
Cerrado <- readOGR("Data/Individual_Biomes/Cerrado.shp")
MataAtl <- readOGR("Data/Individual_Biomes/AtlanticForest.shp")
Caatinga <- readOGR("Data/Individual_Biomes/Caatinga.shp")
Pampas <- readOGR("Data/Individual_Biomes/Pampas.shp")

#ensure the crs are the same 
Amazon <- spTransform(Amazon, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m")
Pantanal <- spTransform(Pantanal, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m")
Cerrado <- spTransform(Cerrado, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m")
MataAtl <- spTransform(MataAtl, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m")
Caatinga <- spTransform(Caatinga, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m")
Pampas <- spTransform(Pampas, "+proj=moll +lon_0=0 +x_0=0 +y_0=0 +ellps=WGS84 +units=m")


#1. Mask probability of plantation expansion for each biome ####...then crop to zoom into biome shape
Amazon_prob <- mask(prob, Amazon) %>% crop(Amazon)
Pantanal_prob <- mask(prob, Pantanal) %>% crop(Pantanal)
Cerrrado_prob <- mask(prob, Cerrado) %>% crop(Cerrado)
MataAtl_prob <- mask(prob, MataAtl) %>% crop(MataAtl)
Caatinga_prob <- mask(prob, Caatinga) %>% crop(Caatinga)
Pampas_prob <- mask(prob, Pampas) %>% crop(Pampas)

plot(Amazon_prob)
plot(Pantanal_prob)
plot(Cerrrado_prob)
plot(MataAtl_prob)
plot(Caatinga_prob)
plot(Pampas_prob)

#2. Mask benefits of UNSCALED restoration in terms of avoided extinctions for each biome ####
Amazon_ext <- mask(ext_km, Amazon) %>% crop(Amazon)
Pantanal_ext <- mask(ext_km, Pantanal) %>% crop(Pantanal)
Cerrrado_ext <- mask(ext_km, Cerrado) %>% crop(Cerrado)
MataAtl_ext <- mask(ext_km, MataAtl) %>% crop(MataAtl)
Caatinga_ext <- mask(ext_km, Caatinga) %>% crop(Caatinga)
Pampas_ext <- mask(ext_km, Pampas) %>% crop(Pampas)

plot(Amazon_ext)
plot(Pantanal_ext)
plot(Cerrrado_ext)
plot(MataAtl_ext)
plot(Caatinga_ext)
plot(Pampas_ext)

#3. Rescale the importance of restoration in terms of avoided extinctions for each biome ####

minRaster <- minValFun(Amazon_ext)
maxRaster <- maxValFun(Amazon_ext)
Amazon_ext <-setMinMax(Amazon_ext, minValue = minRaster, maxValue =  maxRaster)
Amazon_ext <- rescale_raster(Amazon_ext)

minRaster <- minValFun(Pantanal_ext)
maxRaster <- maxValFun(Pantanal_ext)
Pantanal_ext <-setMinMax(Pantanal_ext, minValue = minRaster, maxValue =  maxRaster)
Pantanal_ext <- rescale_raster(Pantanal_ext)

minRaster <- minValFun(Cerrrado_ext)
maxRaster <- maxValFun(Cerrrado_ext)
Cerrrado_ext <-setMinMax(Cerrrado_ext, minValue = minRaster, maxValue =  maxRaster)
Cerrrado_ext <- rescale_raster(Cerrrado_ext)

minRaster <- minValFun(MataAtl_ext)
maxRaster <- maxValFun(MataAtl_ext)
MataAtl_ext <-setMinMax(MataAtl_ext, minValue = minRaster, maxValue =  maxRaster)
MataAtl_ext <- rescale_raster(MataAtl_ext)

minRaster <- minValFun(Caatinga_ext)
maxRaster <- maxValFun(Caatinga_ext)
Caatinga_ext <-setMinMax(Caatinga_ext, minValue = minRaster, maxValue =  maxRaster)
Caatinga_ext <- rescale_raster(Caatinga_ext)

minRaster <- minValFun(Pampas_ext)
maxRaster <- maxValFun(Pampas_ext)
Pampas_ext <-setMinMax(Pampas_ext, minValue = minRaster, maxValue =  maxRaster)
Pampas_ext <- rescale_raster(Pampas_ext)

plot(Amazon_ext)
plot(Pantanal_ext)
plot(Cerrrado_ext)
plot(MataAtl_ext)
plot(Caatinga_ext)
plot(Pampas_ext)


#4. Calculate bivariate values  each of prob and avoided extinction (the bivariate values recalculate value based on colormatrix argument) 
biv_Amazon <- bivarmap::bivarmap_raster(rasterx = Amazon_prob,
                                     rastery = Amazon_ext,
                                     colmatrix = full_legend)

biv_Pantanal <- bivarmap::bivarmap_raster(rasterx = Pantanal_prob,
                                    rastery = Pantanal_ext,
                                    colmatrix = full_legend)



biv_Cerrado <- bivarmap::bivarmap_raster(rasterx = Cerrrado_prob,
                                          rastery = Cerrrado_ext,
                                          colmatrix = full_legend)


biv_Atl <- bivarmap::bivarmap_raster(rasterx = MataAtl_prob,
                                        rastery = MataAtl_ext,
                                        colmatrix = full_legend)


biv_Caatinga <- bivarmap::bivarmap_raster(rasterx = Caatinga_prob,
                                     rastery = Caatinga_ext,
                                     colmatrix = full_legend)

biv_Pampas <- bivarmap::bivarmap_raster(rasterx = Pampas_prob,
                                        rastery = Pampas_ext,
                                        colmatrix = full_legend)


plot(biv_Amazon)
plot(biv_Pantanal)
plot(biv_Cerrado)
plot(biv_Atl)
plot(biv_Caatinga)
plot(biv_Pampas)


#write each of these rasters so that we can make nice maps in Qgis 
writeRaster(biv_Amazon,
            filename = paste0(path, "//biv_Amazon.tif"))
writeRaster(biv_Pantanal,
            filename = paste0(path, "//biv_Pantanal.tif"))
writeRaster(biv_Cerrado,
            filename = paste0(path, "//biv_Cerrado.tif"))
writeRaster(biv_Atl,
            filename = paste0(path, "//biv_Atl.tif"))
writeRaster(biv_Caatinga,
            filename = paste0(path, "//biv_Caatinga.tif"))
writeRaster(biv_Pampas,
            filename = paste0(path, "//biv_Pampas.tif"))



#5. Plot the bivariate maps for each Brazilian Biome 
#- for visualisation only; final figure is plotted in Qgis
p1 <- bivarmap::bivarmap_map(bivarmap = biv_Amazon,
                        colmat = full_legend,
                        x_legend_pos = -.16,
                        y_legend_pos = .16,
                        x_legend_size = .0,
                        y_legend_size = .0) 


p2 <- bivarmap::bivarmap_map(bivarmap = biv_Pantanal,
                             colmat = full_legend,
                             x_legend_pos = .16,
                             y_legend_pos = .16,
                             x_legend_size = .0,
                             y_legend_size = .0) 

p3 <- bivarmap::bivarmap_map(bivarmap = biv_Cerrado,
                             colmat = full_legend,
                             x_legend_pos = .16,
                             y_legend_pos = .16,
                             x_legend_size = .0,
                             y_legend_size = .0) 

p4 <- bivarmap::bivarmap_map(bivarmap = biv_Atl,
                             colmat = full_legend,
                             x_legend_pos = .16,
                             y_legend_pos = .16,
                             x_legend_size = .0,
                             y_legend_size = .0) 

p5 <- bivarmap::bivarmap_map(bivarmap = biv_Caatinga,
                             colmat = full_legend,
                             x_legend_pos = .16,
                             y_legend_pos = .16,
                             x_legend_size = .0,
                             y_legend_size = .0) 

p6 <- bivarmap::bivarmap_map(bivarmap = biv_Pampas,
                            colmat = full_legend,
                            x_legend_pos = .16,
                            y_legend_pos = .16,
                            x_legend_size = .0,
                            y_legend_size = .0) 


#for visualisation only - final figure is constructed in Qgis.
bivmap <- plot_grid(p1, p2, p3, p4, p5, p6)
bivmap 
#,labels = c("Amazon", "Pantanal", "Cerrado", "Atlantic Forest", "Caatinga", "Pampas")) #---> remove bracket at end of last code line if yoy want to plot with labels
