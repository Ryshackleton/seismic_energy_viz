/**
 * Created by ryshackleton on 4/30/17.
 */

function LeafletBasemap ( options ) {
    var self = this;
    
    self.options = options;
    
    // build the basemap
    init();
    
    // PUBLIC
    // main rendering update function to expose the API
    function map() {
        // timeout function to prevent repeat rendering on short time intervals
        if ( self.timeOut !== null) {
            clearTimeout( self.timeOut );
        }
        
        self.timeOut = setTimeout(function(){
            if( self.renderCallback !== undefined ) {
                self.renderCallback();
            }
        }, self.options.minTimeOut);
    }
    
    // sets the render callback function, to be called on map change
    map.renderCallBack = function(value) {
        if( !arguments.length ) { return self.renderCallback; }
        
        self.renderCallback = value;
        
        return map;
    };
    
    // Base and Overlay Layer Options
    map.addESRIOceanBaseMapLayer = function() {
        // background tile layer from: https://leaflet-extras.github.io/leaflet-providers/preview/
        var Esri_OceanBasemap =  L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Ocean_Basemap/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 13
        }).addTo(self.leafletmap);
        
        self.layerControl.addBaseLayer(Esri_OceanBasemap,"ESRI Oceans");
        
        return map;
    };
    
    // Esri world imagery base layer option
    map.addESRIWorldImageryBaseMapLayer = function() {
        // background tile layer from: https://leaflet-extras.github.io/leaflet-providers/preview/
        var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            attribution: 'Tiles &copy; Esri'
        }).addTo(self.leafletmap);
        
        self.layerControl.addBaseLayer(Esri_WorldImagery,"ESRI World Imagery");
        
        return map;
    };
    
    // USGS faults overlay option
    map.addUSGSFaultsOverlay = function() {
        // faults from USGS earthquakes hazards website
        var faults = L.tileLayer("https://earthquake.usgs.gov/basemap/tiles/faults/{z}/{x}/{y}.png", {
            attribution: "<a href=\"https://earthquake.usgs.gov/arcgis/rest/services/eq/map_faults/MapServer\">USGS</a>",
            maxZoom: 13,
            opacity: 0.5,
        }).addTo(self.leafletmap);
        
        self.layerControl.addOverlay(faults,"US Faults");
        
        return map;
    };
    
    // tectonic plate boundary layer option
    map.addTectonicPlateBoundariesOverlay = function() {
        var plateBoundaries = L.tileLayer("https://earthquake.usgs.gov/basemap/tiles/plates/{z}/{x}/{y}.png", {
            attribution: "<a href=\"https://earthquake.usgs.gov/arcgis/rest/services/eq/map_faults/MapServer\">USGS</a>",
            maxZoom: 13,
            opacity: 0.5,
        }).addTo(self.leafletmap);
        
        
        self.layerControl.addOverlay(plateBoundaries,"Tectonic Plate Boundaries");
        
        return map;
    };
    
    // geologic map layer
    map.addGeologicMapOverlay = function() {
        // geology from Macrostrat.org
        var geology = L.tileLayer("https://macrostrat.org/api/v2/maps/burwell/emphasized/{z}/{x}/{y}/tile.png", {
            attribution: "<a href=https://macrostrat.org>Macrostrat.org</a>",
            maxZoom: 13,
            opacity: 0.25,
        });
        
        self.layerControl.addOverlay(geology,"Geology");
        
        return map;
    };
    
    // custom basemap
    map.addCustomBaseMap = function(url,nameString,options) {
        // geology from Macrostrat.org
        var custom = L.tileLayer(url,options);
        
        self.layerControl.addBaseLayer(custom,nameString);
        
        return map;
    };
    
    // custom overlay
    map.addCustomOverlay = function(url,nameString,options) {
        // geology from Macrostrat.org
        var custom = L.tileLayer(url,options);
        
        self.layerControl.addOverlay(custom,nameString);
        
        return map;
    };
    
    // get/set the leaflet map
    map.leafletmap = function(value) {
        if( !arguments.length ) return self.leafletmap;
        
        self.leafletmap = value;
        return map;
    };
    
    // get leaflet's layer control (because they don't seem to have a getter for this??)
    map.layerControl = function(value) {
        if( !arguments.length ) return self.layerControl;
        
        self.layerControl = value;
        return map;
    };
    
    // get/set the timeout
    map.timeout = function(value) {
        if( !arguments.length ) return self.timeOut;
        
        self.timeOut = value;
        return map;
    };
    
    // get/set the map center
    map.mapCenter = function(value) {
        if( !arguments.length ) return self.options.mapCenter;
        
        self.options.mapCenter = value;
        if( self.leafletmap !== undefined ) {
            flyToView(self.options.mapCenter,self.options.mapZoomLevel);
        }
        return map;
    };
    
    // get set the map zoom layer
    map.mapZoomLevel = function(value) {
        if( !arguments.length ) return self.options.mapZoomLevel;
        
        self.options.mapZoomLevel = value;
        if( self.leafletmap !== undefined ) {
            flyToView(self.options.mapCenter,self.options.mapZoomLevel);
        }
        return map;
    };
    
    // PRIVATE
    // init builds the map
    function init()
    {
        // ensure valid defaults and set up some variables for reuse
        self.options.mapCenter = self.options.mapCenter === undefined ? [0,20] : self.options.mapCenter;
        self.options.mapZoomLevel = self.options.mapZoomLevel === undefined ? 1.5 : self.options.mapZoomLevel;
    
        self.options.minTimeOut = self.options.minTimeOut === undefined ? 500 : self.options.minTimeOut;
        
        // CREATE THE LEAFLET MAP
        self.leafletmap = new L.map(self.options.mapDivId, { minZoom: 1, maxZoom: 11 })
            .setView(self.options.mapCenter,self.options.mapZoomLevel);
        
        // create an empty layer control that we'll add components to
        self.layerControl = L.control.layers({},{}).addTo(self.leafletmap);
        
        if( options.renderCallBack !== undefined ) {
            self.renderCallback = options.renderCallBack;
        }
    }
    
    function flyToView(center,zoomlevel) {
        self.leafletmap.flyTo(center,zoomlevel,
            { "animate": true,
                "pan": {
                    "duration": 5
                }
            }
        );
    }
    
    // return a reference to the map
    // function object to expose the public API methods
    return map;
};
