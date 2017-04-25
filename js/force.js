var FORCE = FORCE || {};
/*
    Force layout to show the relative energy release of earthquakes
    Based on: http://vallandingham.me/bubble_charts_in_d3.html
*/
FORCE.earthquakeBubble = function(options) {
  var divTag = options.divTag === undefined ? 'chart' : options.divTag
    , divSizeTag = options.divSizeTag === undefined ? options.divTag : options.divSizeTag
    , width  = null
    , height = null
    , yTarget = 0 
    , defaultDuration = 250 
    , maxEarthquakeMagnitude = 9.5 
    , earthquakeRadiusScale 
    // color scale for the earthquakes
    // color scale from: http://colorbrewer2.org/?type=sequential&scheme=OrRd&n=9
    , eqDomain = [0, 1, 2, 3, 4, 5, 6, 7, 9 ]
    , eqTimeScale
    , eqDepthScale
    , simulation // the main force simulation
    // @v4 strength to apply to the position forces
    , forceStrength = 0.03
    , svg = d3.select("#"+divTag).insert("svg",":first-child")
    , bubbles = null
    , nodes = []
    , popupDiv // div to attach a popup to display earthquake info
  ;
  
  var chart = function chart() {
  };
  
  chart.updateWidthHeight = function() {
    var bbox = d3.select("#"+divSizeTag).node().getBoundingClientRect();
    
    if( d3.select("#"+divSizeTag) === undefined ) {
      width = 200;
      height = 200;
    }
    else {
      width = d3.select("#"+divSizeTag).node().getBoundingClientRect().width;
      height = d3.select("#"+divSizeTag).node().getBoundingClientRect().height; 
    }
    
    yTarget = 0.9 * height;
    
    svg.attr("width", width)
       .attr("height", height)
       ;
       
    updateRadiusScale(maxEarthquakeMagnitude);
    chart.updateTimeScale();
    chart.updateDepthScale();
  }
  
  chart.updateDepthScale = function() {
      var min = d3.min(nodes, function(d){return d.depth; });
      var max = d3.max(nodes,function(d){ return d.depth; });
      if( min === undefined || max === undefined )
          return chart;
    
      var scaleHeight = (height - yTarget) * 2;
      var halfHeight = scaleHeight * 0.5;
      var bottomPad = halfHeight * 0.1;
      var depthAxisTop = yTarget - halfHeight - bottomPad;
      var depthAxisBottom = yTarget + halfHeight - bottomPad;
      
      eqDepthScale = d3.scaleLinear()
                       .domain( [min , max])
                       .range([ depthAxisTop, depthAxisBottom]);
      
      var leftAxis = width * 0.125;
      var fontsize = width * 0.10; // percent
      svg.selectAll(".depth-scale").remove();
      
      depthScaleG = svg.append("g")
                    .attr("class","depth-scale");
                    
        // Add the y Axis
      depthScaleG.append("g")
          .attr('class','depth-scale-labels')
          .style('font-size',fontsize+'%')
          .call(d3.axisLeft(eqDepthScale).ticks(5,'s').tickFormat(function(d){return d+" km";}))
          .attr("transform",
                  "translate(" + leftAxis + "," + 0 + ")");
          
      // text label for the y axis
      depthScaleG.append("text")
          .attr('class','depth-scale-labels')
          .style('font-size',fontsize+'%')
          .attr("transform", "translate("+(leftAxis - fontsize / 5 )+","+(depthAxisTop - fontsize / 4) +")")
          .attr("dy", "1em")
          .style("text-anchor", "middle")
          .text("Depth"); 
      
      return chart;
  }
  
  chart.updateTimeScale = function() {
      var min = d3.min(nodes, function(d){return d.time; });
      var max = d3.max(nodes,function(d){ return d.time; });
    
      eqTimeScale = d3.scaleLinear()
                       .domain( [min , max])
                       .range([width*0.15,width*0.85]);
      function addTimeLabel(label,x,y) {
          svg.append("text")
                  .attr('class','date-labels')
                  .style("font-size", width * 0.11  + "%" )
                  .attr("transform","translate("+x+","+y+")")
                  .text(label);
      }
      var minD = new Date(min);
      var maxD = new Date(max);
      svg.selectAll(".date-labels").remove();
      
      var leftP = width*0.04;
      addTimeLabel("Oldest",leftP,yTarget-30);
      if( minD.toLocaleDateString() !== "Invalid Date") {
          addTimeLabel(minD.toLocaleDateString(),leftP,yTarget-10);
          addTimeLabel(minD.toLocaleTimeString(),leftP,yTarget+10);
      }
      var rightP = width*0.96;
      addTimeLabel("Youngest",rightP,yTarget-30);
      if( maxD.toLocaleDateString() !== "Invalid Date") {
          addTimeLabel(maxD.toLocaleDateString(),rightP,yTarget-10);
          addTimeLabel(maxD.toLocaleTimeString(),rightP,yTarget+10);
      }
      
      return chart;
  }
    
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
    return -Math.pow(d.radius, 2) * forceStrength / 2; 
  }
  
  // offset y target by 1/2 the radius to allow larger circles to be higher
  function radiusOffsetY(d) {
//      return yTarget - d.radius * 0.25;
      return eqDepthScale(d.depth);
  }
  
  function timeSort(d) {
      return eqTimeScale(d.time);
  }
  
  function init() {
      chart.updateWidthHeight();

      popupDiv = d3.select("#"+divTag)
                  .append("div")
                  .attr("class","tooltip")
                  .style("opacity", 0 );
                  
      // Here we create a force layout and
      // @v4 We create a force simulation now and
      //  add forces to it.
      simulation = d3.forceSimulation()
        .velocityDecay(0.7)
        .force('y', d3.forceY().strength(forceStrength*5).y(radiusOffsetY))
        .force('charge', d3.forceManyBody().strength(charge))
        .force('timealign', d3.forceX().strength(forceStrength*3).x(timeSort))
        .on('tick', ticked);

      // @v4 Force starts up automatically,
      //  which we don't want as there aren't any nodes yet.
      simulation.stop();
  
  }
  init();
   
  function updateRadiusScale(newMax) {
      var largerDim = width > height ? width : height;
      earthquakeRadiusScale = d3.scaleLinear()
                                .domain([0, magToEnergy(newMax)])
                                .range([1, largerDim * 0.13 ]);
                                    
      maxEarthquakeMagnitude = newMax;

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
                radius: d.startRadius,
                place: d.properties.place,
                startX: d.startX,
                startY: d.startY,
                x: d.startX,
                y: d.startY,
      }
  
      if( newbub.magnitude > maxEarthquakeMagnitude )
      {
          maxEarthquakeMagnitude = newbub.magnitude;
          updateRadiusScale(newbub.magnitude);
      }
      nodes.push(newbub);
      // keep array sorted by magnitude to ensure that big circles don't occlude smaller ones
      nodes.sort(function(a,b){return b.magnitude - a.magnitude; });
      
      
      // Bind nodes data to what will become DOM elements to represent them.
      chart.updateTimeScale();
      chart.updateDepthScale();
      bubbles = svg.selectAll('.bubble')
        .data(nodes,function(d){return d.id; });
        
      // Create new circle elements each with class `bubble`.
      // There will be one circle.bubble for each object in the nodes array.
      // Initially, their radius (r attribute) will be 0.
      // @v4 Selections are immutable, so lets capture the
      //  enter selection to apply our transtition to below.
      var bubblesE = bubbles.enter().append('g')
        .classed('bubble', true)
        ;
      
      bubblesE
          // append an <a> to provide a link upon click to the USGS url
          .append("a")
          // add the usgs link as an attribute
          .attr("xlink:href", function(d) { return d.url; })
          // open link in new window
          .attr("target","_blank")
          .append('circle')
          .attr('class','bubble-circle')
          .attr('fill', d.fill )
          .on("mouseover", function(d) {		
              d3.select(this).style('stroke-width',2);
              popupDiv.transition()		
                  .duration(200)		
                  .style("opacity", .9);		
              var date = new Date(d.time);
              var placeSplit = d.place.split(" of ");
              var date = new Date(d.time);
              popupDiv.html("<strong>M" + d.magnitude + "</strong> at <strong>"
                        + Math.round(d.depth) + "km </strong> depth<br/>"
                        + placeSplit.join(" of <br/>") 
                        + "<br/>" + date.toLocaleDateString()+ " "
                        + date.toLocaleTimeString() 
//                        + "(click for info)"
                        )
                       .style("overflow","hidden")
                       .style("left", (d.x+5) + "px")
                       .style("top", (d.y-50) + "px");	
              d3.select(this.parentNode)
                 .append("line")
                 .attr("class","bubble-connector-line")
                 .attr("x1",d.startX-d.x)
                 .attr("y1",d.startY-d.y)
                 .attr("x2",0)
                 .attr("y2",0);
              })					
          .on("mouseout", function(d) {		
              d3.select(this).style('stroke-width',0.5);
              
              d3.select(this.parentNode).selectAll("line").remove();
              
              popupDiv.transition()		
                  .duration(500)		
                  .style("opacity", 0);
              })
        ;
        
     bubblesE.append("text")
              .attr('class','bubble-text')
              .style("font-size", "0px" )
              .text("H")
              .attr("dy", function(d) { return "." + Math.round(d.radius/3.5) + "em"; });
      ;
      
      // @v4 Merge the original empty selection and the enter selection
      bubbles = bubbles.merge(bubblesE);
      
      // Set the simulation's nodes to our newly created nodes array.
      // @v4 Once we set the nodes, the simulation will start running automatically!
      simulation.nodes(nodes);
      
      simulation.alphaTarget(1).restart();
 
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
          
      bubbles
        .select("a")
        .select("line")
        .attr("x1",function(d){return d.startX-d.x;})
        .attr("y1",function(d){return d.startY-d.y;});
  
      // update bubble size 
      bubbles
        .select("a")
        .select("circle")
        .transition()
        .duration(defaultDuration)
        .attr('r', function (d) {
                d.radius = magToRadius(d.magnitude);
                return d.radius;
            });
        
      // returns a nice magnitude string 4 or 4.6, not 4. , rounds up
      function magSubString(d) {
          var l = Math.floor(d.radius/2);
          switch(l) {
                case 0:
                    return "";
                    break;
                case 1:
                    return (""+d.magnitude).substring(0, l);
                    break;
                case 2:
                    return Math.round(d.magnitude);
                    break;
                default:
                    return (""+d.magnitude).substring(0, 3);
            }
      }
      
      // returns the correct font size based on radius
      function fontSize(d) {
          d.fontsize = Math.floor(d.radius/3);
          return d.fontsize + "px";
      }
      
      // scale the text appropriately
      bubbles.select("text")
        .transition()
        .duration(defaultDuration)
        .style("font-size", fontSize)
        .text(magSubString)
        .attr("dy", function(d) { return d.fontsize / 2 + "px"; });
        
      // move the base "g" elements to the appropriate location based on force
      bubbles
        .attr("transform", function (d) {
            var k = "translate(" + d.x + "," + d.y + ")";
            return k;
        }) ;
  }
  
  return chart;
};

