window.onload = function() {
  // build the quake map!
  var options = {
    mapDivTag: 'map-canvas',
  };

  var eqMap = new LEAFLET_CUSTOM.d3EarthquakeMap(options)
                      .addESRIWorldImageryBaseMapLayer()
                      .addESRIOceanBaseMapLayer()
                      .addUSGSFaultsOverlay()
                      .addTectonicPlateBoundariesOverlay()
                      .addGeologicMapOverlay();
                      
//  var bubble = FORCE.earthquakeBubbleMapLinked({ divTag: "force-canvas"});
//  bubble.leafletmap(eqMap.leafletmap());
  
  // build a button and a click response for each view
  // (attached to a div with id='earthquake-view-list'
  quakeViews.forEach(function(v,i){
    // get the div that holds the earthquake buttons
    d3.select('#earthquake-view-list')
            .append('div')
            .attr('class',"panel panel-default")
              .append('div')
                .attr('class', "panel-heading")
                .attr('id', v.divId)
                .append("a")
                  .attr("href","#")
                  .text(v.params.label);
                

//    d3.select('#earthquake-view-list')
//                .append("p")
//                  .style("padding-left","5px") 
//                  .text(v.params.longlabel);

    d3.select('#earthquake-view-list')
                .append("hr");

    d3.select("#"+v.divId)
                .on('click', function()
                      {
                        d3.select('#events-title')
                            .text(v.params.label);
      
                        eqMap.setEarthquakeQuery(v.params);
                        //bubble.setEarthquakeQuery(v.params);

                      }
                   );
    
    // trigger the earthquake query for the first view in the list
    if( i < 1){
      d3.select("#"+v.divId).on('click')();
    }
  });
};

