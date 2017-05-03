/**
 * represents a leaflet basemap with an overlay showing earthquakes from the USGS
 * requires: d3, version 4, bootstrap-slider.js, and usgsQuery.js
 */
function BasemapWithEarthquakes(options)
{
    var self = this;
    
    self.options = options;
    
    // underlying basemap
    self.basemap = new LeafletBasemap(options);
    
    // build the earthquake map
    init();
    
    // PUBLIC
    self.basemap.setEarthquakeQuery = function(d,doFlyTo)
    {
        // set the earthquake parameters
        self.qparams = d;
        
        updateLegend();
        
        // add the leaflet map to the parameters to query the view bounds
        self.qparams.leafletmap = self.basemap.leafletmap();
    
        // set the leaflet map's zoom and center to initiate the flyTo
        if( doFlyTo === undefined || doFlyTo === true )
        {
            self.basemap.mapCenter(d.center)
                .mapZoomLevel(d.zoom);
        }
        else
        {
            self.basemap();
        }
    
        return self.basemap;
    };
    
    // function to set a callback when an earthquake is added
    self.basemap.onStartRenderCallback = function(d)
    {
        if( !arguments.length ) {
            return self.onStartRenderCallback;
        }
        
        self.onStartRenderCallback = d;
        
        return self.basemap;
    };
    
    // function to set a callback when an earthquake is added
    self.basemap.onAddEarthquakeCallback = function(d)
    {
        if( !arguments.length ) {
            return self.onAddEarthquakeCallback;
        }
    
        self.onAddEarthquakeCallback = d;
        
        return self.basemap;
    };
    
    self.basemap.earthquakeColorScale = function(d)
    {
        if( !arguments.length ) {
            return self.eqColorScale;
        }
        
        self.eqColorScale = d;
        
        return self.basemap;
    };
    
    self.basemap.transitionDuration = function(d)
    {
        if( !arguments.length ) {
            return self.options.transitionDuration;
        }
        
        self.options.transitionDuration = d;
        
        return self.basemap;
    };
    
    self.basemap.transitionDelay = function(d)
    {
        if( !arguments.length ) {
            return self.options.transitionDelay;
        }
        
        self.options.transitionDelay = d;
        
        return self.basemap;
    };
    
    // PRIVATE

    // init builds the map
    function init()
    {
        // MEMBER VARIABLES
        self.options.transitionDuration = 1000;
        self.options.transitionDelay = 200;
        
        //  ensure some default parameters for the current usgs earthquake API query
        self.qparams =  { label: "Earthquakes in the last 24 hours", center: [41.991341, -115.782354],
            zoom: 5, days: 1, date: undefined, eventType: "earthquake", leafletmap: self.basemap.leafletmap() };

        // color scale for the earthquakes
        // color scale from: http://colorbrewer2.org/?type=sequential&scheme=OrRd&n=9
        self.eqDomain = [1, 2, 3, 4, 5, 6, 7, 8, 9 ];
        self.eqColorScale = d3.scaleLinear()
            .domain(self.eqDomain) // domain for the earthquakes
            .range(['#fff7ec','#fee8c8',
                '#fdd49e','#fdbb84',
                '#fc8d59','#ef6548',
                '#d7301f','#b30000','#7f0000' ]);
        
        // APPEND the SVG to the Leaflet map pane
        self.svg = d3.select(self.basemap.leafletmap().getPanes().overlayPane).append("svg")
            .attr("class", "leaflet-zoom-hide")
            .attr("id","mapped-quakes");

        // g (group) element will be inside the svg, and will contain the earthquakes
        self.svg.append("g")
            .attr("id","earthquake-circles");

        self.popupDiv = d3.selectAll(".leaflet-pane")
            .filter(".leaflet-popup-pane")
            .append("div")
            .attr("class","tooltip")
            .style("opacity", 0 );
        
        // PROJECTION AND TRANSFORMATION
        // function using leaflet's functions to convert from lat/long to points in the map
        // we do this to allow leaflet to govern the map projection, which we will overlay
        // points/vectors onto
        function projectPoint(x, y) {
            var point = self.basemap.leafletmap().latLngToLayerPoint(new L.LatLng(y, x));
            this.stream.point(point.x, point.y);
        }
        
        //  create a d3.geo.path to convert GeoJSON to SVG (in d3 version 4, d3.geo.path becomes d3.geoPath)
        // this is used to calculate a bounding box for the earthquakes below
        // -> the point transformation is passed a function called projectionPoint()
        var transform = d3.geoTransform({point: projectPoint});
        self.path = d3.geoPath().projection(transform);
        
        // SETUP TRIGGERS
        
        // erase the circles on movestart because we have to rebuild the time sequence anyway
        self.basemap.leafletmap().on("movestart", removeEarthquakeCircles);

        // set this render callback to the parent basemap
        self.basemap.renderCallBack(renderEarthquakes);
        
        // Re-draw on reset, this keeps the earthquake circles where they should be on reset/zoom
        self.basemap.leafletmap().on("moveend", self.basemap); // call the superclass's main method, which will do what it needs to,
                                             // then call the local render method
    
        // ensure that the canvas is the appropriate size on resize of the basemap
        self.basemap.leafletmap().on("resize", onWindowResize);
        onWindowResize();

        // add some earthquakes!
        self.basemap();
    }

    function removeEarthquakeCircles()
    {
        // interrupt to kill the transition chains
        self.svg.selectAll(".earthquake")
            .interrupt();
        
        // remove existing earthquakes
        self.svg.select("g")
            .selectAll("#earthquake-a")
            .remove();
    }

    function renderEarthquakes()
    {
        // because we're doing a time series, we must remove all of the existing
        // earthquakes in order for the time sequence to be valid
        removeEarthquakeCircles();
        
        // clear the popup
        onEarthquakeCircleMouseout();
        
        // DRAW EARTHQUAKES
        // build a query using the usgsQuery module
        var eqQuery = QUERY.usgs.earthquakeURLMapBoundsJSON(self.qparams);
        d3.json(eqQuery, function(err, json) {
            if (err) {
                var errString = "<h5>Server error. </br>Try selecting a smaller range of magnitudes,</br> a smaller range of dates, </br> or a smaller area on the map.</h5>";
                onErrorPopup(errString);
                return;
            }
        
            // Filter out any data with no geometry info
            var earthquakes = json.features.filter(
                function(d) {
                    return d.geometry !== null && d.properties.mag > 0;
                }
            );
        
            if( earthquakes.length < 1 )
            {
                var errString = "<h5>No earthquakes in this area.</br> Try selecting a larger range of magnitudes </br>or a wider area on the map</h5>";
                onErrorPopup(errString);
                return;
            }
                
            if( self.onStartRenderCallback !== undefined )
            {
                self.onStartRenderCallback(earthquakes);
            }
            
            buildEarthquakeCircles(earthquakes,json);
            
            // redraw the magnitude legend to show which magnitudes are restricted
            updateLegend();
        });
        
    }

    // builds the earthquake circles from the earthquakes data array,
    // within the bounds of the json data
    function buildEarthquakeCircles(earthquakes,json)
    {
        // get the bounding box of all of the earthquakes in the selection
        // the bounds function utilizes the transform we created above
        // to get the bounding box of the earthquakes.
        //  -> notice that the bounding box is in SVG coordinates <-
        var bounds = self.path.bounds(json);

        // get the top left and bottom right as [x,y] arrays,
        // AND add in some padding to allow for the extra earthquake scale
        // (this is is basically growing the bounding box by maxEarthquakeRadius on all sides)
        var topLeft = [ bounds[0][0] - self.maxEarthquakeRadius, bounds[0][1] - self.maxEarthquakeRadius ]
            , bottomRight = [ bounds[1][0] + self.maxEarthquakeRadius, bounds[1][1] + self.maxEarthquakeRadius ]

        // set the width, height, top, and left of the svg to position it
        self.svg.attr("width", bottomRight[0] - topLeft[0] )
            .attr("height", bottomRight[1] - topLeft[1] )
            .style("left", topLeft[0] + "px")
            .style("top", topLeft[1] + "px");

        // add the new earthquake series
        getALinks(earthquakes) // creates a links to USGS page
            .append("circle") // append circles to each link
                // here we translate LOCALLY within the svg, and, of course, we have to add the padding value to
                .attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")")
                .attr("class", "earthquake")
                .attr("cx", function(d) {
                    // define x and y here to avoid multiple calls to latLngToLayerPoint()
                    var ll = L.latLng(d.geometry.coordinates[1],d.geometry.coordinates[0]);
                    var latlng = self.basemap.leafletmap().latLngToLayerPoint(ll);
                    d.x = latlng.x;
                    d.y = latlng.y;
                    return d.x; })
                .attr("cy", function(d) {
                    return d.y; })
                .attr("r", 0)
                .on("mouseover", function(d){ onEarthquakeCircleMouseover(d,this); })
                .on("mouseout", function(d) { onEarthquakeCircleMouseout(d,this); })
            .transition()
                .on("start", function(d) { onEarthquakeCircleStartTransition(d,this); })
                .duration(self.options.transitionDuration)
                .delay(function(d,i){ return self.options.transitionDelay*i; })
                .ease(d3.easeElastic)
                .attr("r", function(d) {
                    return self.eqSizeScale(d.properties.mag);
                })
                .style("fill", function(d) {
                    return self.eqColorScale(d.properties.mag);
                })
                ;
    }

    // creates "a" tags on the first "g" tag in self.svg,
    // adds a link to the USGS earthquake page for each,
    // then returns the "a" selection
    function getALinks(data)
    {
        return self.svg.select("g")
            .selectAll("a")
            .data(data, function(d) { return d.id; })
            .enter()
            // append an <a> to provide a link upon click to the USGS url
            .append("a")
            // add the usgs link as an attribute
            .attr("xlink:href", function(d) { return d.properties.url; })
            // open link in new window
            .attr("target","_blank")
            .attr("id","earthquake-a");
    }

    // sets any stored member variables related to layout size, etc
    function onWindowResize()
    {
        
        // select the outer container div (to allow for resizing and overlapping the map with other SVG overlays)
        if( self.options.outerContainerId === undefined ) {
            self.canvasRect = d3.select("#" + self.options.mapDivId).node().getBoundingClientRect(); }
        else {
            self.canvasRect = d3.select("#"+self.options.outerContainerId).node().getBoundingClientRect(); }
        
        // formatting
        // earthquake size should scale relative to the container
        // and this variable will allow for padding around the SVG to allow for the
        // extra radius of the earthquake's size scale, otherwise
        // earthquake circles will be cut off near the edges of the SVG
        // we'll use the largest earthquake size to govern this padding value
        self.maxEarthquakeRadius = d3.min([self.canvasRect.width, self.canvasRect.height]) * 0.02;
    
        // size scale for earthquakes
        self.eqSizeScale = d3.scaleLinear()
            .domain([-1,10])
            .range([0, self.maxEarthquakeRadius]);
    
        renderMagnitudeLegend();
    }
    
    function onEarthquakeCircleMouseover(d,circle)
    {
        d3.select(circle)
            .style('stroke-width',2);
        
        self.popupDiv.transition()
            .duration(200)
            .style("opacity", 0.9);
        var date = new Date(d.properties.time);
        self.popupDiv.html("Magnitude: <strong>" + d.properties.mag + "</strong><br/>"
                + "Depth: <strong>" + d.geometry.coordinates[2] + " km</strong><br/>"
                + date.toLocaleDateString()+"<br/>"
                + date.toLocaleTimeString()+"<br/>"
                + "(click for USGS Page)" )
            .style("left", (d.x+5) + "px")
            .style("top", (d.y-10) + "px");
    }

    function onEarthquakeCircleMouseout(d,circle)
    {
        d3.select(circle).style('stroke-width',0.5);
        self.popupDiv.transition()
            .duration(500)
            .style("opacity", 0);
    }

    // called when each circle is added to the map
    function onEarthquakeCircleStartTransition(d,circle)
    {
        var cR = d3.select(circle).node().getBoundingClientRect();
        var x = cR.left - self.canvasRect.left;
        var y = cR.top - self.canvasRect.top;
        d.fill = self.eqColorScale(+d.properties.mag);
        d.startX = x;
        d.startY = y;
        d.startRadius = self.eqSizeScale(+d.properties.mag);
        
        if( self.onAddEarthquakeCallback !== undefined )
            self.onAddEarthquakeCallback(d);
    }
    
    function onErrorPopup(htmlString) {
    
        var canvasRect = d3.select("#" + self.options.mapDivId).node().getBoundingClientRect();
        
        self.popupDiv.transition()
            .duration(200)
            .style("opacity", .9);
        self.popupDiv.html(htmlString)
            .style("left", canvasRect.width / 2 + "px")
            .style("top", canvasRect.height / 2 + "px");
        setTimeout(function(){
            self.popupDiv.transition()
                .duration(200)
                .style("opacity", 0);
        }, 4000);
    }
    
    // builds an interactive magnitude legend that scales nicely with different screen sizes
    // by overlaying a hidden boostrap slider over an SVG with earthquake circles of varying size
    // TODO: replace the boostrap slider ticks with earthquake circles as svg objects
    function renderMagnitudeLegend()
    {
        // use d3 to select the appropriate div element on the control layer
        // here we grab the div with class=leaflet-control-container, then the top right div container
        var container = d3.select(".leaflet-control-container")
            // selects "leaflet-bottom leaflet-left" AND "leaflet-bottom leaflet-right"
            .selectAll(".leaflet-top")
            // filter the selection by ONLY the leaflet-right
            .filter(".leaflet-right");
        
        // just delete the old container and start over every time
        container.select("svg").remove();
        container.selectAll(".magnitude-legend-selector").remove();
    
        container = container
            .insert("div",":first-child")
            .attr("class","magnitude-legend-selector leaflet-control");
        
        // create a list of objects representing a legend entry
        // so we can add x,y coordinates to each object and apply text
        // to each magnitude circle:
        // example here: http://stackoverflow.com/questions/11857615/placing-labels-at-the-center-of-nodes-in-d3-js
        var legendObjs = [];
        self.eqDomain.forEach(function(d,i) {
            legendObjs[i] = { mag: d, isSelected: magnitudeIsSelected(d) };
        });
        
        // some sizing and location info (in px)
        var lNodeSize = 2 * self.maxEarthquakeRadius;
        var legendWidth = (legendObjs.length * (lNodeSize + 1));
        var legendHeight = lNodeSize * 2;
        var lTopLeft = [0, 0];
        var lBottomRight = [lTopLeft[0] + legendWidth, lTopLeft[1] + legendHeight];
        var svgWidth = lBottomRight[0] - lTopLeft[0];
        var svgHeight = lBottomRight[1] - lTopLeft[1];
        
       // add an svg to the bottom left control element
        var lSvg = container.append("svg")
            // size the element width to the size of the earthquake legend
            .attr("width", svgWidth +"px")
            .attr("height", svgHeight + "px");
        
        // g (group) element will be inside the legend svg, and will contain
        // a bounding rectangle, some circles representing earthquake sizes, and text
        // to indicate the magnitude of each circle
        var lG = lSvg.append("g");
        
        // add a bounding rectangle
        lG.append("svg:rect")
            .attr("id", "eq-legend")
            .attr("class", "legend-box")
            .attr("width", legendWidth + "px")
            .attr("height", legendHeight * 0.9 + "px")
            .attr("transform","translate("+lTopLeft[0]+","+(lTopLeft[1])+")");
        
        // append the data and get the enter selection
        self.lnodes = lG.append("svg:g")
            .selectAll("g")
            .data(legendObjs, function(d,i){ return d.mag; })
            .enter();
        
        self.lnodes.append("circle")
            .attr("r", function(d){ return self.eqSizeScale(d.mag); })
            .attr("id", "eq-legend")
            .attr("class", "earthquake")
            .style("fill", function(d){ return self.eqColorScale(d.mag); })
            // use opacity to highlight which earthquakes are shown
            .style("opacity", function(d) {
                return d.isSelected ? 1 : 0.2;
            })
            .attr("transform", function(d, i) {
                d.x = lTopLeft[0] + (2 * lNodeSize / 3 + lNodeSize * i);
                d.y = lBottomRight[1] - lNodeSize * 0.9;
                return "translate("
                    + d.x + ","+ d.y
                    + ")";
            });
        
        // append the text to each "svg:g" node, which also contains a circle
        self.lnodes.append("text")
            .text(function(d) { return "M"+d.mag; })
            .attr("id", "eq-legend")
            .attr("class", "legend-mag-text")
            .attr("text-anchor", "middle" )
            .style('font-size', self.maxEarthquakeRadius * 7 +'%')
            // the transform here contains an offset from the
            // middle of the g element, which is also the middle of the circle
            .attr("transform", function(d) {
                return "translate("
                    + d.x + ","
                    + (d.y-lNodeSize*0.55) + ")"; });
    
        var globalMinMag = self.eqDomain[0];
        var globalMaxMag = 9;
        var minMag = self.qparams.minmagnitude === undefined ? 1 : self.qparams.minmagnitude;
        var maxMag = self.qparams.maxmagnitude === undefined ? 10 : self.qparams.maxmagnitude;
        
        // build a boostrap-slider to pick the earthquake magnitude range
        container.selectAll("#ex2").remove();
        container.append("input")
            .attr("id","ex2");
    
        var sliderOptions = {
            value: [minMag,maxMag],
            step: 1,
            min: globalMinMag,
            max: globalMaxMag,
            tooltip: "show",
            tooltip_position: "bottom",
            handle: "custom"
        };
        // build a slider behind the legend (css to the rescue!)
        self.magSlider = new Slider('#ex2', sliderOptions);
        self.magSlider.on('slideStop', updateLegend );
    }
    
    // checks whether the specified magnitude is in the range selected by the magnitude slider
    function magnitudeIsSelected(d) {
        if( self.magSlider === undefined )
            return true;
        var range = self.magSlider.getValue();
        return d >= range[0] && d <= range[1];
    }
    
    // updates the interactive legend
    // (if d is defined, do trigger the rendering update, if not don't, to correspond to whether the
    //    min/max magnitudes are being set, or are updating the slider to reflect change to the self. values)
    function updateLegend(d)
    {
        if( d !== undefined )
        {
            self.qparams.minmagnitude = d[0];
            self.qparams.maxmagnitude = d[1];
            // set off the map update
            self.basemap.setEarthquakeQuery(self.qparams, false, false);
        }
        
        if(self.magSlider !== undefined)
        {
            var maxMag = self.qparams.maxmagnitude === undefined ? 10 : self.qparams.maxmagnitude;
            var minMag = self.qparams.minmagnitude === undefined ? 1 : self.qparams.minmagnitude;
            self.magSlider.setValue([minMag, maxMag]);
        }
        
        // update legend highlight
        self.lnodes.selectAll('circle')
            // use opacity to highlight which earthquakes are shown
            .style("opacity", function(d) {
                return magnitudeIsSelected(d.mag) ? 1 : 0.2;
            });
    }
    
    // expose the public methods
    return self.basemap;
};
    


