# One-time builder for the Sulawesi ancestry map on the projects page.
# Run manually: `Rscript scripts/build-sulawesi.R` — outputs are committed.
#
# Sources (from the Bunomys phylogeny manuscript project):
#   - data/mapping/sulawesi_srtm_light.tif        SRTM GL3 relief
#   - data/mapping/sulawesi_aoe_boundaries.kml    area-of-endemism boundary zones
#   - data/admixture/dominator/                   PopCluster K = 4 (run 5) Q-matrix
#                                                 and K summary (DLK2 per K)
#   - results/locality_counts.csv                 locality coordinates + AOE codes
#   - results/bunomys_species_haplotypes_distribution.csv
#                                                 specimen elevations (R/sampling-distribution.Rmd)
#
# Outputs:
#   src/assets/graphics/sulawesi-relief.png   shaded relief, transparent sea
#   src/data/sulawesi-dominator.json          boundaries, localities, ancestry
#   src/data/bunomys-elevation.json           elevational ranges per species/haplogroup

BUNOMYS <- path.expand("~/Codes/R/bunomys-phylogeny-ms")
src <- function(...) file.path(BUNOMYS, ...)

# ---- 1. Relief ------------------------------------------------------------
dem <- terra::rast(src("data", "mapping", "sulawesi_srtm_light.tif"))
# Crop the empty sea to the north and east so the island fills the frame.
dem <- terra::crop(dem, terra::ext(118.75, 125.45, -6.05, 1.95))
dem <- terra::aggregate(dem, fact = 4, fun = "mean", na.rm = TRUE)

slope <- terra::terrain(dem, "slope", unit = "radians")
aspect <- terra::terrain(dem, "aspect", unit = "radians")
shade <- terra::shade(slope, aspect, angle = 40, direction = 315)

elev <- terra::as.matrix(dem, wide = TRUE)
hs <- terra::as.matrix(shade, wide = TRUE)
hs[is.na(hs)] <- 1
hs <- (hs - min(hs)) / (max(hs) - min(hs))

# Muted hypsometric tint in the site's forest/moss tones.
breaks <- c(0, 300, 800, 1500, 2200, 2800, 3500)
tints <- grDevices::col2rgb(c(
  "#c9d6b0", "#a9c08a", "#86a26b", "#6c8659", "#8d8a6c", "#b7b19e", "#ecebe4"
)) / 255
tint <- function(ch) {
  stats::approx(breaks, tints[ch, ], xout = pmin(pmax(elev, 0), 3500), rule = 2)$y
}
light <- 0.45 + 0.65 * hs
land <- !is.na(elev) & elev > 0

img <- array(0, dim = c(nrow(elev), ncol(elev), 4))
for (ch in 1:3) img[, , ch] <- pmin(matrix(tint(ch), nrow(elev)) * light, 1)
img[, , 4] <- land * 1
img[is.na(img)] <- 0
png::writePNG(img, "src/assets/graphics/sulawesi-relief.png")

ext <- as.vector(terra::ext(dem))
bbox <- list(xmin = ext[["xmin"]], xmax = ext[["xmax"]], ymin = ext[["ymin"]], ymax = ext[["ymax"]])

# ---- 2. Localities --------------------------------------------------------
localities <- readr::read_csv(src("results", "locality_counts.csv"), show_col_types = FALSE)

# ---- 3. Ancestry (same cleaning as R/admixture.Rmd) -----------------------
q <- readr::read_csv(
  src("data", "admixture", "dominator", "dominator_redo.K.4.R.5_Q"),
  col_names = FALSE, show_col_types = FALSE
)
ids <- readr::read_lines(src("data", "admixture", "dominator", "sample_names.txt"))
stopifnot(nrow(q) == length(ids))

parts <- do.call(rbind, strsplit(ids, "_"))
loc <- parts[, 4]
loc <- sub("^Gandang$", "Gandangdewata", loc)
loc <- sub("^Ilomata", "Boganinani", loc)
loc <- sub("^SaluTiwo", "Salutiwo", loc)
stopifnot(all(loc %in% localities$locality_id))

qm <- as.matrix(q[, -1])
individuals <- lapply(seq_along(ids), function(i) {
  list(id = ids[i], catalog = parts[i, 3], locality = loc[i], q = unname(round(qm[i, ], 3)))
})

used <- localities[localities$locality_id %in% loc, ]
locs_out <- lapply(seq_len(nrow(used)), function(i) {
  list(id = used$locality_id[i], lon = used$longitude[i], lat = used$latitude[i], aoe = used$aoe[i])
})

# ---- 3b. Choosing K: DLK2 per K from the PopCluster summary --------------
k_lines <- readr::read_lines(src("data", "admixture", "dominator", "dominator_redo.K"))
k_end <- which(k_lines == "")[1] - 1
k_tab <- utils::read.table(
  text = k_lines[2:k_end], na.strings = "-",
  col.names = c("K", "BestRun", "LogL_Mean", "LogL_Min", "LogL_Max", "DLK1", "DLK2", "FST_FIS")
)
best_k <- as.integer(sub(".*DLK2\\s+", "", grep("^\\s*DLK2\\s+\\d+", k_lines, value = TRUE)))
choose_k <- list(
  bestK = best_k,
  dlk2 = lapply(which(!is.na(k_tab$DLK2)), function(i) list(k = k_tab$K[i], value = round(k_tab$DLK2[i], 3)))
)

# ---- 4. AOE boundary zones and label anchors ------------------------------
aoe <- sf::st_read(src("data", "mapping", "sulawesi_aoe_boundaries.kml"), quiet = TRUE)
boundaries <- lapply(seq_len(nrow(aoe)), function(i) {
  xy <- sf::st_coordinates(aoe[i, ])[, 1:2]
  list(name = aoe$Name[i], ring = unname(round(xy, 4)))
})

# Hand-placed on land, near the centre of each area of endemism.
aoe_labels <- list(
  list(aoe = "NW", name = "Northwest", lon = 121.2, lat = 0.62),
  list(aoe = "NC", name = "North-central", lon = 123.4, lat = 0.42),
  list(aoe = "NE", name = "Northeast", lon = 124.75, lat = 0.95),
  list(aoe = "WC", name = "West-central", lon = 119.85, lat = -2.0),
  list(aoe = "EC", name = "East-central", lon = 122.3, lat = -1.0),
  list(aoe = "SE", name = "Southeast", lon = 121.95, lat = -3.85),
  list(aoe = "SW", name = "Southwest", lon = 119.75, lat = -4.75)
)

jsonlite::write_json(
  list(
    bbox = bbox,
    image = list(width = ncol(elev), height = nrow(elev)),
    boundaries = boundaries,
    aoeLabels = aoe_labels,
    localities = locs_out,
    individuals = individuals,
    chooseK = choose_k
  ),
  "src/data/sulawesi-dominator.json",
  auto_unbox = TRUE, digits = NA, pretty = FALSE
)

message("Wrote ", length(individuals), " individuals from ", length(locs_out), " localities")

# ---- 5. Elevational ranges (same filters as R/sampling-distribution.Rmd) --
specimens <- readr::read_csv(
  src("results", "bunomys_species_haplotypes_distribution.csv"),
  show_col_types = FALSE
)
specimens <- specimens[
  !is.na(specimens$minimum_elevation) &
    !is.na(specimens$locality_id) &
    specimens$genus != "Rattus",
]
specimens$label <- sub(" \\(N = \\d+\\)$", "", specimens$species)

records <- stats::aggregate(
  list(n = rep(1L, nrow(specimens))),
  by = specimens[, c("label", "locality_id", "aoe", "minimum_elevation", "max_elevation")],
  FUN = sum
)

groups <- c("Lowland", "Widespread", "Montane")
taxa <- unique(specimens[, c("label", "genus", "elev_distribution")])
taxa <- lapply(seq_len(nrow(taxa)), function(i) {
  sp <- specimens[specimens$label == taxa$label[i], ]
  rec <- records[records$label == taxa$label[i], ]
  rec <- rec[order(rec$minimum_elevation, rec$max_elevation), ]
  list(
    label = taxa$label[i],
    genus = taxa$genus[i],
    group = taxa$elev_distribution[i],
    n = nrow(sp),
    min = min(sp$minimum_elevation),
    max = max(sp$max_elevation),
    aoes = I(sort(unique(sp$aoe))),
    records = lapply(seq_len(nrow(rec)), function(j) {
      list(
        locality = rec$locality_id[j], aoe = rec$aoe[j],
        min = rec$minimum_elevation[j], max = rec$max_elevation[j], n = rec$n[j]
      )
    })
  )
})
# Lowland -> widespread -> montane, then by lower range limit.
ord <- order(
  match(vapply(taxa, `[[`, "", "group"), groups),
  vapply(taxa, `[[`, 0, "min"),
  vapply(taxa, `[[`, 0, "max")
)

jsonlite::write_json(
  list(
    threshold = 1000,
    groups = groups,
    aoes = sort(unique(specimens$aoe)),
    nSpecimens = nrow(specimens),
    taxa = taxa[ord]
  ),
  "src/data/bunomys-elevation.json",
  auto_unbox = TRUE, digits = NA, pretty = FALSE
)

message("Wrote ", length(taxa), " taxa from ", nrow(specimens), " specimens")

