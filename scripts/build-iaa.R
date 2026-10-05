# One-time builder for the Pleistocene low sea-level map on the projects page.
# Run manually: `Rscript scripts/build-iaa.R` — outputs are committed.
#
# Base map: src/assets/graphics/IAA_ForBLack.svg (Illustrator export, plate
# carrée). Its pixel grid was fitted to coastlines (Sumatra, Sulawesi):
#   x = 33 + 11.647 * (lon - 95.2)      y = 175.3 + 11.6 * (5.65 - lat)
#
# Source: NOAA ETOPO1 1 arc-minute relief (public domain), via ERDDAP.
#
# Output: src/data/iaa-shelves.json — for each sea level below today, the
# land exposed at that level as an SVG path in the base map's coordinates.

LEVELS <- c(-40, -80, -120)
STRIDE <- 3 # arc-minutes

to_x <- function(lon) 33 + 11.647 * (lon - 95.2)
to_y <- function(lat) 175.3 + 11.6 * (5.65 - lat)
to_lon <- function(x) 95.2 + (x - 33) / 11.647
to_lat <- function(y) 5.65 - (y - 175.3) / 11.6

# Extent of the SVG viewBox (0 0 741.1 467.6), with a small margin.
bb <- list(
  west = to_lon(-10), east = to_lon(751),
  north = to_lat(-10), south = to_lat(478)
)

csv <- file.path(Sys.getenv("TMPDIR", "/tmp"), sprintf("etopo-iaa-%d.csv", STRIDE))
if (!file.exists(csv)) {
  url <- paste0(
    "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude",
    utils::URLencode(sprintf(
      "[(%.3f):%d:(%.3f)][(%.3f):%d:(%.3f)]",
      bb$south, STRIDE, bb$north, bb$west, STRIDE, bb$east
    ), reserved = TRUE)
  )
  message("Downloading ETOPO1 …")
  utils::download.file(url, csv, quiet = TRUE, mode = "wb")
}

etopo <- utils::read.csv(csv, skip = 2, header = FALSE, col.names = c("lat", "lon", "alt"))
dem <- terra::rast(etopo[, c("lon", "lat", "alt")], type = "xyz", crs = "EPSG:4326")

path_of <- function(level) {
  land <- terra::classify(dem > level, cbind(0, NA))
  polys <- terra::as.polygons(land, dissolve = TRUE)
  polys <- terra::disagg(polys)
  # Drop specks smaller than ~500 km².
  polys <- polys[terra::expanse(polys, unit = "km") > 500]
  polys <- terra::simplifyGeom(polys, tolerance = 0.07, preserveTopology = TRUE)
  geom <- as.data.frame(terra::geom(polys))
  # One subpath per ring (outer rings and holes; fill-rule evenodd). Holes of
  # the same part share an id, so split again wherever a ring closes.
  groups <- split(geom, list(geom$geom, geom$part, geom$hole), drop = TRUE)
  rings <- unlist(lapply(groups, function(g) {
    out <- list()
    start <- 1
    for (i in seq_len(nrow(g))[-1]) {
      if (i > start + 2 && g$x[i] == g$x[start] && g$y[i] == g$y[start]) {
        out[[length(out) + 1]] <- g[start:i, ]
        start <- i + 1
      }
    }
    if (start < nrow(g)) out[[length(out) + 1]] <- g[start:nrow(g), ]
    out
  }), recursive = FALSE)
  paste(vapply(rings, function(r) {
    paste0(
      "M", paste(sprintf("%.1f %.1f", to_x(r$x), to_y(r$y)), collapse = "L"), "Z"
    )
  }, ""), collapse = "")
}

shelves <- lapply(LEVELS, function(l) list(level = l, d = path_of(l)))

jsonlite::write_json(
  list(
    viewBox = c(0, 0, 741.1, 467.6),
    transform = "x = 33 + 11.647 * (lon - 95.2); y = 175.3 + 11.6 * (5.65 - lat)",
    shelves = shelves
  ),
  "src/data/iaa-shelves.json",
  auto_unbox = TRUE, pretty = FALSE
)
message("Wrote ", length(shelves), " sea levels; ",
        round(file.size("src/data/iaa-shelves.json") / 1024), " KB")
