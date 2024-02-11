#calculate proportion of each municipality that is covered with farms >100 ha

#---- packages -----------------------------------------------------------------

library(dplyr)
library(geobr)
library(sf)
library(raster)
library(fasterize)
library(sidrar)
library(tidyr)


setwd("C:/Users/Gianluca Cerullo/OneDrive - University of Cambridge/PhD/Chapter_1_Eucalyptus_Expansion/Complete_folder/Small_farm_proportions/Data")

# Download municipality data ####
# municipalities boundaries for 2020

mun <- geobr::read_municipality(year = "2020")

# select columns of interest
mun_df <- mun[,1:2]

# get rid of the geometry

st_geometry (mun_df) <- NULL

# n of groups to stratify the access to the API
num_groups = 20

list_df <- mun_df %>% 
  group_by((row_number()-1) %/% (n()/num_groups)) %>%
  nest %>% pull(data)
#listing mun code

mun_code <- lapply(list_df,function(x)as.character(unique(x$code_muni)))

# table
df <- 6754

# check parameter for specific table
info_sidra(df, wb = TRUE)

# filters for ibge datasets
period <- c('2017')
territorial_level <- "City"
variable <- c(184) #  ?rea dos estabelecimentos agropecu?rios (Hectares) - casas decimais: padr?o = 0, m?ximo = 3
classific <- "c220" #Grupos de ?rea total(20):

f <- function(x)get_sidra(x = df,variable = variable,period = period,classific = c("c220"),geo=territorial_level,geo.filter = list(x))

property_data <- lapply(mun_code,f)

# combining the data again
property_data_df <- as.data.frame(do.call(rbind,property_data))

# checking doubles!

property_data_df <- property_data_df[!duplicated(property_data_df),]

write.csv(property_data_df,"farm_size_per_mun.csv",row.names = F)

#-------------------------------------------------------------------------------
#Analyze municipality-level farmsize data ####
# opening farm size data

df <- read.csv("farm_size_per_mun.csv")

# filtering total area of each mun
total_area <- df %>%
  filter(Grupos.de.área.total..Código.=='110085')

farm_sizes <- df %>%
  filter(!Grupos.de.área.total..Código.=='110085')

# get table with size classes and codes -- to get a clear view

area_cat <- unique(farm_sizes[,c(12,13)])

# define a treshold for farm sizes (here >100ha), 
area_cat$farm_sizes_bin <- NA
area_cat$farm_sizes_bin[1:12] <- "<100ha"
area_cat$farm_sizes_bin[13:19] <- ">=100ha"

# add this new column to the dataframe
farm_sizes <- left_join(farm_sizes,area_cat)

# summarise data to get proportions
farm_sizes_bin <- farm_sizes %>%
  group_by_at(c(6,7,8,20))%>% 
  summarise(total_area_ha = sum(Valor,na.rm = T))%>%
  # adding column of the area of all property groups
  left_join(total_area[,5:8])%>%
  # changing name
  rename(mun_area=Valor)%>%
  #calculating the proportional area of each bin class
  mutate(prop_area_bin=round(total_area_ha/mun_area,2))

# spatializing the results

# municipalities boundaries for 2020

mun <- geobr::read_municipality(year = "2020")

names(farm_sizes_bin)[1] <- "code_muni"

# add proportion of the area of the mun covered by large farms
mun <- left_join(mun,farm_sizes_bin[farm_sizes_bin$farm_sizes_bin=='>=100ha',])


# transform in raster (using municipality boundary)

CRS = ("+proj=moll +lon_0=0 +x_0=0 +y_0=0")
mun_pj <- st_transform(x = mun,crs=CRS)
r <- raster(mun_pj, res = 10000)
mun_r <- fasterize(mun_pj, r, field = "prop_area_bin", fun="first")
plot(mun_r)
mun_r

writeRaster(mun_r, "100haMunicipalityFarmArea.tif")

