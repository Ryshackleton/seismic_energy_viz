// build a list of typical earthquake views
// with a label, lat/long zoom level, number of days,
// and end date
var quakeViews = [
    {
        divId: 'intro1',
        params: {
            label: "Visualization Tour",
            longlabel: "A short tour of the graphical elements in this page",
            center: [0, 20],
            zoom: 1.5,
            days: 0.3,
            date: "2017-05-01T05:40:00",
            eventType: "earthquake",
            minmagnitude: 5.2
        }
    }
    ,
    {
      divId: 'west-coast-now', 
      params: 
        {
          label: "Earthquakes in the last 24 hours",
          longlabel: "Not showing explosions or quarry blasts. See the magnitude legend for which magnitudes are included.",
          center: [0, 20],
          zoom: 1.5,
          days: 1,
          date: undefined,
          eventType: "earthquake"
        }
    }
    ,
    {
      divId: 'west-coast-two-week', 
      params: 
        {
          label: "Earthquakes in the past 2 weeks",
          longlabel: "Not showing explosions or quarry blasts. See the magnitude legend for which magnitudes are included.",
          center: [0, 20],
          zoom: 1.5,
          days: 14,
          date: undefined,
          eventType: "earthquake",
          minmagnitude: 3.0 
        }
    }
    ,
    {
      divId: 'all-biggest', 
      params: 
        {
          label: "Big Earthquakes in the last 100 years",
          longlabel: "Earthquakes Magnitude 8 and greater" ,
          center: [0, 20],
          zoom: 1.5,
          days: 365 * 100,
          date: undefined,
          eventType: "earthquake",
          minmagnitude: 7.9 
          
        }
    }
    ,
    {
      divId: 'valdivia-1960', 
      params: 
        {
          label: "M9.5 - 1960 Chilean Earthquake",
          longlabel: "Magnitude 9.5 near Valdivia, Chile.  This is the largest ever earthquake recorded by modern instruments.",
          center: [-39.827338, -73.247785],
          zoom: 6,
          days: 4,
          date: "1960-05-23T23:59:59" ,
          eventType: "earthquake"
        }
    }
    ,
    {
      divId: 'great-alaska-1964', 
      params: 
        {
          label: "M9.2 - 1964 Great Alaska Earthquake",
          longlabel: "Magnitude 9.2 rupture beneath Prince William Sound in southern Alaska. The earthquake lasted approximately 4.5 minutes and is the most powerful recorded earthquake in U.S. history.",
          link: "https://earthquake.usgs.gov/earthquakes/events/alaska1964/",
          center: [59.385651, -147.024957],
          zoom: 5,
          days: 4,
          date: "1964-03-28T23:59:59",
          eventType: "earthquake"
        }
    }
    ,
    {
      divId: 'sumatra-2004', 
      params: 
        {
          label: "M9.1 - 2004 Sumatra/Indian Ocean Earthquake",
          longlabel: "This undersea megathrust earthquake triggered a series of devastating tsunamis along the coasts of most landmasses bordering the Indian Ocean, killing 230,000–280,000 people in 14 countries, and inundating coastal communities with waves up to 30 metres (100 ft) high. It was one of the deadliest natural disasters in recorded history.",
          center: [7.655104, 94.012632],
          zoom: 6,
          days: 2,
          date: "2004-12-26T23:59:59",
          eventType: "earthquake"
        }
    }
    ,
    {
      divId: 'denali-fault-2002', 
      params: 
        {
          label: "M7.9 - 2002 Denali Fault Earthquake",
          longlabel: "Magnitude 7.9 rupture on the Denali Fault in central Alaska. This quake and subsequent earthquakes ruptured a total fault length of 211 miles. This earthquake was preceded by a M6.7, 10 days prior.",
          center: [62.006110, -146.780242],
          zoom: 6,
          days: 15,
          date: "2002-11-06T23:59:59",
          eventType: "earthquake",
          minmagnitude: 3
        }
    }
  ];
