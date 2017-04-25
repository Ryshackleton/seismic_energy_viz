var LEAFLET_CUSTOM = LEAFLET_CUSTOM || {};
  
LEAFLET_CUSTOM.map = function(options) {
  'use strict';
  
  var mapDivTag = options.mapDivTag === undefined ? 'map' : options.mapDivTag
    // CREATE THE LEAFLET MAP
    , mapCenter = options.mapCenter === undefined ? [47.598877, -122.330916] : options.mapCenter
    , mapZoomLevel = options.mapZoomLevel === undefined ? 5 : options.mapZoomLevel
    , leafletmap = new L.map(mapDivTag, { minZoom: 1, maxZoom: 11 }) 
                    .setView(mapCenter,mapZoomLevel)
    , timeOut = null // timeout to prevent the map from updating on repeated resize events
    // create an empty layer control that we'll add components to
    , layerControl = L.control.layers({},{}).addTo(leafletmap)
    , renderCallback; // callback function to be defined by subclasses
  
  // main update function to expose the API
  function map() {
    if (timeOut !== null)
      clearTimeout(timeOut);
    
    timeOut = setTimeout(function(){
      if( renderCallback !== undefined ) {
        renderCallback();
      }
    }, 500);
  }
  
  // Base and Overlay Layer Options
  map.addESRIOceanBaseMapLayer = function() {
    // background tile layer from: https://leaflet-extras.github.io/leaflet-providers/preview/
    var Esri_OceanBasemap =  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 13
    }).addTo(leafletmap);
      
    layerControl.addBaseLayer(Esri_OceanBasemap,"ESRI Oceans");
    
    return map;
  };
  
  map.addESRIWorldImageryBaseMapLayer = function() {
    // background tile layer from: https://leaflet-extras.github.io/leaflet-providers/preview/
    var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    }).addTo(leafletmap);
    
    layerControl.addBaseLayer(Esri_WorldImagery,"ESRI World Imagery");
    
    return map;
  };
  
  
  map.addUSGSFaultsOverlay = function() {
    // faults from USGS earthquakes hazards website
    var faults = L.tileLayer("https://earthquake.usgs.gov/basemap/tiles/faults/{z}/{x}/{y}.png", {
      attribution: "<a href=\"https://earthquake.usgs.gov/arcgis/rest/services/eq/map_faults/MapServer\">USGS</a>",
      maxZoom: 13,
      opacity: 0.5,
    }).addTo(leafletmap);
    
    layerControl.addOverlay(faults,"US Faults");
    
    return map;
  };
  
  map.addTectonicPlateBoundariesOverlay = function() {
    var plateBoundaries = L.tileLayer("https://earthquake.usgs.gov/basemap/tiles/plates/{z}/{x}/{y}.png", {
      attribution: "<a href=\"https://earthquake.usgs.gov/arcgis/rest/services/eq/map_faults/MapServer\">USGS</a>",
      maxZoom: 13,
      opacity: 0.5,
    }).addTo(leafletmap);
    
    
    layerControl.addOverlay(plateBoundaries,"Tectonic Plate Boundaries");
    
    return map;
  };
  
  map.addGeologicMapOverlay = function() {
    // geology from Macrostrat.org 
    var geology = L.tileLayer("https://macrostrat.org/api/v2/maps/burwell/emphasized/{z}/{x}/{y}/tile.png", {
      attribution: "<a href=https://macrostrat.org>Macrostrat.org</a>",
      maxZoom: 13,
      opacity: 0.25,
    });
    
      layerControl.addOverlay(geology,"Geology");
    
    return map;
  };
  
  map.addCustomBaseMap = function(url,nameString,options) {
    // geology from Macrostrat.org 
    var custom = L.tileLayer(url,options);
    
    layerControl.addBaseLayer(custom,nameString);
    
    return map;
  };
  
  map.addCustomOverlay = function(url,nameString,options) {
    // geology from Macrostrat.org 
    var custom = L.tileLayer(url,options);
    
    layerControl.addOverlay(custom,nameString);
    
    return map;
  };

  // get/set the leaflet map
  map.leafletmap = function(value) {
    if( !arguments.length ) return leafletmap;

    leafletmap = value;
    return map;
  };
 
  // get leaflet's layer control (because they don't seem to have a getter for this??)
  map.layerControl = function(value) {
    if( !arguments.length ) return layerControl;

    layerControl = value;
    return map;
  };
  
  // get/set the timeout 
  map.timeout = function(value) {
    if( !arguments.length ) return timeout;

    timeout = value;
    return map;
  };
  
  // get/set the map center
  map.mapCenter = function(value) {
    if( !arguments.length ) return mapCenter;

    mapCenter = value;
    if( leafletmap !== undefined ) {
      flyToView(mapCenter,mapZoomLevel);
    }
    return map;
  };

  map.mapZoomLevel = function(value) {
    if( !arguments.length ) return mapZoomLevel;

    mapZoomLevel = value;
    if( leafletmap !== undefined ) {
      flyToView(mapCenter,mapZoomLevel);
    }
    return map;
  };
  
  // sets the render callback function
  map.renderCallBack = function(value) {
    if( !arguments.length ) return renderCallback;

    renderCallback = value;
    return map;
  };
  
  // private methods
  var flyToView = function(center,zoomlevel) {
    leafletmap.flyTo(mapCenter,mapZoomLevel,
                        { "animate": true,
                        "pan": {
                            "duration": 5 
                          }
                        }
                      );
  };
  
  // return a reference to the map
  // function object to expose the public API methods
  return map;
};
