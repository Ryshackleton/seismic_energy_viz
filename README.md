# Seismic Energy Visualization
#### This visualization displays a map view and a dynamic force layout representing the seismic energy release from current and past earthquakes.  The vizualization was inspired by [this video](https://www.facebook.com/GreatShakeOut/videos/10154330904266759/), and illustrates how the logarithmic moment magnitude scale discorts our thinking about earthquakes of different sizes.

#### D3 is used to parse earthquakes from a [USGS JSON feed](https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php), which are animated as circles of varying size on a Leaflet slippy map. D3 is also used to create and update a force layout showing the relative energy release as earthquakes are added to the map.  This is also a good example of how to trigger and interrupt transitions in D3.

##### The animation shows the order of earthquakes in the viewing area (not scaled by the actual time between earthquakes).  The background map is a the ESRI Ocean Basemap, which has global bathymetry.  Smaller (lower magnitude) earthquakes are only displayed for specific regions as determined by the USGS data feed.

#### [See the live site here](https://ryshackleton.github.io/seismic_energy_viz/)
