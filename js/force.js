var FORCE = FORCE || {};
/*
    Force layout to show the relative energy release of earthquakes
    Based on: http://vallandingham.me/bubble_charts_in_d3.html
*/
FORCE.earthquakeBubble = function(options) {
  var divTag = options.divTag === undefined ? 'chart' : options.divTag
    , width  = null
    , height = null
    , center = { x: 0, y: 0 }
    , defaultDuration = 75 
    , maxEarthquakeMagnitude = 9.5 
    , earthquakeRadiusScale = d3.scaleLinear()
                                .domain([-1, magToEnergy(maxEarthquakeMagnitude)])
                                .range([0.5, width ])
    // color scale for the earthquakes
    // color scale from: http://colorbrewer2.org/?type=sequential&scheme=OrRd&n=9
    , eqDomain = [-1, 0, 1, 2, 3, 4, 5, 6, 9.5 ]
    , eqColorScale = d3.scaleLinear()
                         .domain(eqDomain)
                         .range(['#fff7ec','#fee8c8',
                               '#fdd49e','#fdbb84',
                               '#fc8d59','#ef6548',
                                 '#d7301f','#b30000','#7f0000'
                                ])                                
  
    // @v4 strength to apply to the position forces
    , forceStrength = 0.03

    , svg = d3.select("#"+divTag).append('svg')
 
    , bubbles = null
    , nodes = []
    , popupDiv // div to attach a popup to display earthquake info
  ;
  
  var chart = function chart() {
  };
  
  chart.updateWidthHeight = function() {
    var bbox = d3.select("#"+divTag).node().getBoundingClientRect();
    
    if( d3.select("#"+divTag) === undefined ) {
      width = 200;
      height = 200;
    }
    else {
      width = 0.9 * d3.select("#"+divTag).node().getBoundingClientRect().width;
      height = d3.select("#"+divTag).node().getBoundingClientRect().height; 
    }
    center = { x: width / 2, y: height / 3 };
    
    svg.attr("width", width)
       .attr("height", height);
       
    updateRadiusScale(maxEarthquakeMagnitude);
  }
  
  chart.updateWidthHeight();

  popupDiv = d3.select("#"+divTag)
          .append("div")
          .attr("class","tooltip .leaflet-popup-pane")
          .style("opacity", 0 );
  
  // Charge function that is called for each node.
  // As part of the ManyBody force.
  // This is what creates the repulsion between nodes.
  //
  // Charge is proportional to the diameter of the
  // circle (which is stored in the radius attribute
  // of the circle's associated data.
  //
  // This is done to allow for accurate collision
  // detection with nodes of different sizes.
  //
  // Charge is negative because we want nodes to repel.
  // @v4 Before the charge was a stand-alone attribute
  //  of the force layout. Now we can use it as a separate force!
  function charge(d) {
    return -Math.pow(d.radius, 2.0) * forceStrength;
  }

  // Here we create a force layout and
  // @v4 We create a force simulation now and
  //  add forces to it.
  var simulation = d3.forceSimulation()
    .velocityDecay(0.25)
    .force('x', d3.forceX().strength(forceStrength).x(center.x))
    .force('y', d3.forceY().strength(forceStrength).y(center.y))
    .force('charge', d3.forceManyBody().strength(charge))
    .on('tick', ticked);

  // @v4 Force starts up automatically,
  //  which we don't want as there aren't any nodes yet.
  simulation.stop();
  
  function updateRadiusScale(newMax) {
      var largerDim = width > height ? width : height;
      earthquakeRadiusScale = d3.scaleLinear()
                                .domain([-1, magToEnergy(newMax)])
                                .range([0.5, largerDim * 0.13 ]);
                                    
      maxEarthquakeMagnitude = newMax;
      center = { x: width / 2, y: height / 3 };

      nodes.forEach(function(d){ d.radius = magToRadius(d.magnitude); });
    
  }
   
  // converts an earthquake magnitude to energy in joules
  function magToEnergy(mag) {
    // E = 10 ^ (11.8 + 1.5M) -> https://earthquake.usgs.gov/learn/topics/measure.php
    var e = Math.pow(10,11.8 + 1.5 * mag);
    // convert to joules and return
    // (ergs to joules: 1 erg = 10-7 Joules)
    return e * 1e-7;
  }
  
  function magToRadius(mag) {
      return earthquakeRadiusScale(magToEnergy(mag));
  }
   
  chart.addEarthquakeBubble = function(d) {
      var newbub = {
                id: d.id,
                url: d.properties.url,
                time: d.properties.time,
                depth: +d.geometry.coordinates[2],
                magnitude: +d.properties.mag,
                radius: d.properties.mag,
                place: d.properties.place,
                x: 0,
                y: 0 
      }
  
      if( newbub.magnitude > maxEarthquakeMagnitude )
      {
          maxEarthquakeMagnitude = newbub.magnitude;
          updateRadiusScale(newbub.magnitude);
      }
      newbub.x = width / 2;
      newbub.y = height / 10;
      newbub.radius = magToRadius(newbub.magnitude);
      
      // Bind nodes data to what will become DOM elements to represent them.
      nodes.push(newbub);
      bubbles = svg.selectAll('.bubble')
        .data(nodes);
        
      // Create new circle elements each with class `bubble`.
      // There will be one circle.bubble for each object in the nodes array.
      // Initially, their radius (r attribute) will be 0.
      // @v4 Selections are immutable, so lets capture the
      //  enter selection to apply our transtition to below.
      var bubblesE = bubbles.enter().append('g')
        .classed('bubble', true)
        // start translated to the center
        .attr("transform", function (d) {
            var k = "translate(" + d.x + "," + d.y + ")";
            return k;
        }) ;
      
      var svgrect = svg.node().getBBox();
      bubblesE
          // append an <a> to provide a link upon click to the USGS url
          .append("a")
          // add the usgs link as an attribute
          .attr("xlink:href", function(d) { return d.url; })
          // open link in new window
          .attr("target","_blank")
          .append('circle')
          .attr('class','bubble-circle')
          .attr('fill', function (d) { return eqColorScale(d.magnitude); })
          .on("mouseover", function(d) {		
              d3.select(this).style('stroke-width',2);
              popupDiv.transition()		
                  .duration(200)		
                  .style("opacity", .9);		
              var date = new Date(d.time);
              var placeSplit = d.place.split(" of ");
              popupDiv.html("Magnitude: <strong>" + d.magnitude + "</strong><br/>"
                        + placeSplit.join(" of <br/>") 
                        + "<br/>(click for info)" )	
                       .style("overflow","hidden")
                       .style("left", (d.x*0.5) + "px")
                       .style("top", (svgrect.y+d.y) + "px");	
              })					
          .on("mouseout", function(d) {		
              d3.select(this).style('stroke-width',0.5);
              popupDiv.transition()		
                  .duration(500)		
                  .style("opacity", 0);
              })
        ;
        
     bubblesE.append("text")
              .attr('class','bubble-text');
      ;
      
      // @v4 Merge the original empty selection and the enter selection
      bubbles = bubbles.merge(bubblesE);
      
      // Set the simulation's nodes to our newly created nodes array.
      // @v4 Once we set the nodes, the simulation will start running automatically!
      simulation.nodes(nodes);
      
      // Set initial layout to single group.
      groupBubbles();
 
  }
  
  chart.clearNodes = function() {
  
      simulation.stop();
          
      svg.selectAll('.bubble').remove();
      nodes = [];
      updateRadiusScale(2);
            
      return chart;
            
  }
  
  /*
   * Callback function that is called after every tick of the
   * force simulation.
   * Here we do the acutal repositioning of the SVG circles
   * based on the current x and y values of their bound node data.
   * These x and y values are modified by the force simulation.
   */
  function ticked() {
      if( bubbles === null )
          return;
  
      // update bubble size 
      bubbles
        .select("a")
        .select("circle")
        .transition()
        .duration(defaultDuration)
        .attr('r', function (d) { return d.radius; });
        
      // scale the text appropriately
      bubbles.select("text")
        .style("font-size", function(d) { return Math.round(d.radius/2)+'px'; })
        .text(function(d) { return (""+d.magnitude).substring(0, d.radius / 2); })
        .attr("dy", function(d) { return "." + Math.round(d.radius/3) + "em"; });
        
      // move the base "g" elements to the appropriate location based on force
      bubbles
        .attr("transform", function (d) {
            var k = "translate(" + d.x + "," + d.y + ")";
            return k;
        }) ;
  }
  
  function groupBubbles() {
    // @v4 Reset the 'x' force to draw the bubbles to the center.
    simulation.force('x', d3.forceX().strength(forceStrength).x(center.x));

    // @v4 We can reset the alpha value and restart the simulation
    simulation.alphaTarget(1).restart();
  }
  
  return chart;
};

