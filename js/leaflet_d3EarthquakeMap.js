var LEAFLET_CUSTOM = LEAFLET_CUSTOM || {};

LEAFLET_CUSTOM.d3EarthquakeMap = function(options) {
    var map = LEAFLET_CUSTOM.map(options) // build the parent map
                       .renderCallBack(renderEarthquakes)// and set the parent's callback function
                                             // to this class's "render" function
    //  parameters for the current usgs earthquake API query
    , qparams =  { label: "Earthquakes in the last 24 hours", center: [41.991341, -115.782354],
                    zoom: 5, days: 1, date: undefined, eventType: "earthquake", leafletmap: map.leafletmap() }
    , svg // save a selection for the svg within the map
    , path // used to collect the bounding box, in svg space, of objects on the map
    , popupDiv // div to attach a popup to display earthquake info
    // color scale for the earthquakes
    // color scale from: http://colorbrewer2.org/?type=sequential&scheme=OrRd&n=9
    , eqDomain = [-1, 0, 1, 2, 3, 4, 5, 6, 9 ]
    , eqColorScale = d3.scaleLinear()
                         .domain(eqDomain)
                         .range(['#fff7ec','#fee8c8',
                               '#fdd49e','#fdbb84',
                               '#fc8d59','#ef6548',
                                 '#d7301f','#b30000','#7f0000'
                                ])
    // size scale for earthquakes
    , eqSizeScale = d3.scaleLinear()
                      .domain(eqDomain)
                      .range([1,1,1.5,3,4.5,6,7.5,9,13.5])
    , bubble = FORCE.earthquakeBubble({ divTag: "force-canvas"})
    ;
  // build the map
  init();
  
  // public method
  map.setEarthquakeQuery = function(d) {
    
    // set the earthquake parameters
    qparams = d;
    // add the leaflet map to the parameters to query the view bounds
    qparams.leafletmap = map.leafletmap();
    
    // set the leaflet map's zoom and center to initiate the flyTo
    map.mapCenter(d.center)
       .mapZoomLevel(d.zoom);
    
    return map;
  };
  
  map.bubbleLayout = function(d) {
    if( !arguments.length ) return bubble;

    bubble = value;
    return map;
  
  }
 
  // private
  function init() {
    // PROJECTION AND TRANSFORMATION 
    //  create a d3.geo.path to convert GeoJSON to SVG (in d3 version 4, d3.geo.path becomes d3.geoPath)
    // this is used to calculate a bounding box for the earthquakes below
    // -> the point transformation is passed a function called projectionPoint(),
    //    which is defined below
    var transform = d3.geoTransform({point: projectPoint});
    path = d3.geoPath().projection(transform);

    // function using leaflet's functions to convert from lat/long to points in the map
    // we do this to allow leaflet to govern the map projection, which we will overlay
    // points/vectors onto
    function projectPoint(x, y) {
       var point = map.leafletmap().latLngToLayerPoint(new L.LatLng(y, x));
       this.stream.point(point.x, point.y);
    }
    
    
//    bubble.leafletmap(map.leafletmap());
    
    // APPEND the SVG to the Leaflet map pane
    svg = d3.select(map.leafletmap().getPanes().overlayPane).append("svg")
            .attr("class", "leaflet-zoom-hide");
    // g (group) element will be inside the svg, and will contain the earthquakes
    svg.append("g")
       .attr("class", "leaflet-zoom-hide");

    popupDiv = d3.selectAll(".leaflet-pane")
              .filter(".leaflet-popup-pane")
              .append("div")
              .attr("class","tooltip")
              .style("opacity", 0 );

    // add a magnitude legend to the bottom right control layer
    addMagnitudeLegend();

    // SETUP TRIGGERS
    // just erase the circles on movestart because we have to rebuild the sequence anyway
    map.leafletmap().on("movestart", removeEarthquakeCircles);

    // Re-draw on reset, this keeps the earthquake circles where they should be on reset/zoom
    // TODO: leaflet repeated fires moveend fires upon flyTo(), causing 
    // earthquakes to partially render before the "flight" is done.
    // These pages claim that the problem is fixed, but I still see the behavior:
    // https://github.com/Leaflet/Leaflet/pull/3278
    
    map.leafletmap().on("moveend", map); // call the superclass's main method, which will do what it needs to,
                                         // then call the local render method
    
    // add some earthquakes!
    map();
  }
  
  function removeEarthquakeCircles() {
  
      // interrupt to kill the transition chains
      svg.selectAll(".earthquake")
          .interrupt();
      var exit = svg.select("g")
        .selectAll("#earthquake-a").remove();
        
      bubble.clearNodes();
  }

  function renderEarthquakes() {
    // because we're doing a time series, we must remove all of the existing
    // earthquakes in order for the time sequence to be valid
    removeEarthquakeCircles();
    
    // DRAW EARTHQUAKES 
   // build a query using the usgsQuery module
    var eqQuery = QUERY.usgs.earthquakeURLMapBoundsJSON(qparams);
    d3.json(eqQuery, function(err, json) {
     if (err) {
        throw err;
      }
      
      // Filter out any data with no geometry info 
      var earthquakes = json.features.filter(
        function(d) {
          return d.geometry !== null && d.properties.mag > 0;
        }
      );
      
      if( earthquakes.length < 1 )
        return;
        
      // get the bounding box of all of the earthquakes in the selection
      // the bounds function utilizes the transform we created above
      // to get the bounding box of the earthquakes.
      //  -> notice that the bounding box is in SVG coordinates <-
      var bounds = path.bounds(json);
      
      // we need to add some padding around the SVG to allow for the
      // extra radius of the earthquake's size scale, otherwise
      // earthquake circles will be cut off near the edges of the SVG
      // we'll use the largest earthquake size to govern this padding value
      var svgPadding = d3.max(eqSizeScale.range()) * 1.10;  
      
      // get the top left and bottom right as [x,y] arrays,
      // AND add in some padding to allow for the extra earthquake scale
      // (this is is basically growing the bounding box by svgPadding on all sides)
      var topLeft = [ bounds[0][0] - svgPadding, bounds[0][1] - svgPadding ] 
        , bottomRight = [ bounds[1][0] + svgPadding, bounds[1][1] + svgPadding ]
      
      // set the width, height, top, and left of the svg to position it
      svg.attr("width", bottomRight[0] - topLeft[0] )
        .attr("height", bottomRight[1] - topLeft[1] )
        .style("left", topLeft[0] + "px")
        .style("top", topLeft[1] + "px");
      
      // add the new earthquake series
      svg.select("g")
        .selectAll("a")
          .data(earthquakes, function(d) { return d.id; })
        .enter()
          // append an <a> to provide a link upon click to the USGS url
          .append("a")
          // add the usgs link as an attribute
          .attr("xlink:href", function(d) { return d.properties.url; })
          // open link in new window
          .attr("target","_blank")
          .attr("id","earthquake-a")
          .append("circle")
          // here we translate LOCALLY within the svg, and, of course, we have to add the padding value to
          .attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")")
          .attr("class", "earthquake")
          .attr("cx", function(d) {
                        var ll = L.latLng(d.geometry.coordinates[1],d.geometry.coordinates[0]);
                        d.x = map.leafletmap().latLngToLayerPoint(ll).x;
                        return d.x; })
          .attr("cy", function(d) {
                        var ll = L.latLng(d.geometry.coordinates[1],d.geometry.coordinates[0]);
                        d.y = map.leafletmap().latLngToLayerPoint(ll).y;
                        return d.y; })
          .attr("r", 0)
          .on("mouseover", function(d) {		
              d3.select(this).style('stroke-width',2);
              popupDiv.transition()		
                  .duration(200)		
                  .style("opacity", .9);		
              var date = new Date(d.properties.time);
              popupDiv.html("Magnitude: <strong>" + d.properties.mag + "</strong><br/>"
                        + "Depth: <strong>" + d.geometry.coordinates[2] + " km</strong><br/>"
                        + date.toLocaleDateString()+"<br/>"
                        + date.toLocaleTimeString()+"<br/>"
                        + "(click for info)" )	
                       .style("left", (d.x+5) + "px")
                       .style("top", (d.y-10) + "px");	
              })					
          .on("mouseout", function(d) {		
              d3.select(this).style('stroke-width',0.5);
              popupDiv.transition()		
                  .duration(500)		
                  .style("opacity", 0);
              })
          .transition()
          .on("end", function(d) {
              bubble.addEarthquakeBubble(d);
          })
          .duration(1000)
          .delay(function(d,i){ return 200*i; })
          .ease(d3.easeElastic)
          .attr("r", function(d) {
                return eqSizeScale(d.properties.mag);
              }) 
          .style("fill", function(d) {
                  return eqColorScale(d.properties.mag);
              })
              ;
      });      
  }
  
  // builds a magnitude legend on top of a legend SVG
  function addMagnitudeLegend()
  {
    // create a list of objects representing a legend entry
    // so we can add x,y coordinates to each object and apply text
    // to each magnitude circle:
    // example here: http://stackoverflow.com/questions/11857615/placing-labels-at-the-center-of-nodes-in-d3-js
    var legendObjs = [];
    eqDomain.forEach(function(d,i) {
       legendObjs[i] = { mag: d };
    });
    
    // some sizing and location info (in px)
    var lNodeSize = 40;
    var lPadding = 5;
    var legendWidth = (legendObjs.length * (lNodeSize + 1));
    var legendHeight = lNodeSize * 1.5;
    var lTopLeft = [lPadding, 0]; 
    var lBottomRight = [lTopLeft[0] + legendWidth, lTopLeft[1] + legendHeight]; 

    // use d3 to select the appropriate div element on the control layer
    // here we grab the div with class=leaflet-control-container, then the bottom right div container
    // within that control container, which has class=leaflet-bottom leaflet-left
    var lSvg = d3.select(".leaflet-control-container")
                    // selects "leaflet-bottom leaflet-left" AND "leaflet-bottom leaflet-right"
                    .selectAll(".leaflet-bottom")
                    // filter the selection by ONLY the leaflet-left
                    .filter(".leaflet-left")
                    // add an svg to the bottom left control element
                    .append("svg")
                  // size the element width to the size of the earthquake legend
                  .attr("width", lBottomRight[0] - lTopLeft[0] + 2*lPadding +"px")
                  .attr("height", lBottomRight[1] - lTopLeft[1] + 3*lPadding + "px");
  
    // g (group) element will be inside the legend svg, and will contain 
    // a bounding rectangle, some circles representing earthquake sizes, and text
    // to indicate the magnitude of each circle
    var lG = lSvg.append("g");

    // add a bounding rectangle
    lG.append("svg:rect")
        .attr("id", "eq-legend")
        .attr("class", "legend-box")
        .attr("width", legendWidth + "px")
        .attr("height", legendHeight + "px")
        .attr("transform","translate("+lTopLeft[0]+","+(2*lPadding+lTopLeft[1])+")");
     
    // append the data and get the enter selection
    var lnodes = lG.append("svg:g")
        .selectAll("g") 
        .data(legendObjs, function(d,i){ return d.mag; })
        .enter();
            
    // append the circles to the enter selection
    lnodes.append("circle")
          .attr("r", function(d){ return eqSizeScale(d.mag); })
          .attr("id", "eq-legend")
          .attr("class", "earthquake")
          .style("fill", function(d){ return eqColorScale(d.mag); })
          .attr("transform", function(d, i) {
                                 d.x = lTopLeft[0] + (2 * lNodeSize / 3 + lNodeSize * i);
                                 d.y = lBottomRight[1] - lNodeSize / 2 + lPadding;
                                 return "translate("
                                          + d.x + ","+ d.y 
                                          + ")";
                              });

    // append the text to each "svg:g" node, which also contains a circle
    lnodes.append("text")
          .text(function(d) { return "M"+d.mag; })
          .attr("id", "eq-legend")
          .attr("class", "legend-mag-text")
          .attr("text-anchor", "middle" )
          // the transform here contains an offset from the
          // middle of the g element, which is also the middle of the circle
          .attr("transform", function(d) {
                                  return "translate("
                                     + d.x + ","
                                     + (d.y-15) + ")"; });
  }
  
  return map;
  
};
