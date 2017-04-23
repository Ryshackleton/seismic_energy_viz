/*!
 * Module to build queries the USGS earthquake database using their REST API
 * https://earthquake.usgs.gov/fdsnws/event/1/
 */
var QUERY = QUERY || {};
QUERY.usgs = (function(QUERY) {
    var baseURL = 'https://earthquake.usgs.gov/fdsnws/event/1/query&format=geojson';

  /* params { endtime: end time as a UTC date string, if undefined, will default to current time
           numSeconds: total seconds desired in the feed going back in time (86400 seconds = 1 day),
                        -error string if numSeconds is less than 1
           leafletmap: the leaflet map to query for bounds info */
  QUERY.earthquakeURLMapBoundsJSON = function( params ) { 
    if( params.days < 1 )
      throw new TypeError({ fileName: "usgsQuery.js", message: "earthquakeURLMapBounds(params) - params.days must be greater than 1" });
    
    // undefined date signifies "now" as endtime
    var endtime = (params.date === undefined)
          ? new Date() 
          : new Date(params.date);

    var starttime = new Date(endtime.getTime() - params.days * 86400 * 1000 ); // convert days to seconds, seconds to milliseconds
    
    // set up an array of strings to form a query (will join later with ?'s)
    var query = [ baseURL ];
    
    query.push("starttime=" + starttime.toISOString() );
    query.push("endtime=" + endtime.toISOString() );
    
    if( params.leafletmap === undefined )
      throw new TypeError({ fileName: "usgsQuery.js", message: "earthquakeURLMapBounds(params) - params.leafletmap undefined" });

    var bnds = params.leafletmap.getBounds();
    
    var minLat = Math.min(bnds.getSouth(),bnds.getNorth());
    var maxLat = Math.max(bnds.getSouth(), bnds.getNorth());
    var minLong = Math.min(bnds.getEast(), bnds.getWest());
    var maxLong = Math.max(bnds.getEast(), bnds.getWest());
    if( maxLong - minLong > 360 )
    {
        minLong = -180;
        maxLong = 180;
    }
    if( maxLat - minLat > 180 )
    {
        minLat = -90;
        maxLat = 90;
    }
    query.push("minlatitude=" + minLat );
    query.push("maxlatitude=" + maxLat ); 
    query.push("minlongitude=" + minLong ); 
    query.push("maxlongitude=" + maxLong ); 
    query.push("eventtype=" + params.eventType);
    if( params.minmagnitude !== undefined )
        query.push("minmagnitude="+params.minmagnitude);
    
    query.push("orderby=time-asc"); // order in time ascending
    
    return query.join("&");
  };

  return QUERY;

})(QUERY || {});

