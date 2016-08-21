# ArcGIS-JavaScript-Webmap-Tool
The map tool takes in .csv (comma delimited) files with latitudinal and longitudinal points in decimal degrees and displays it on a map. 
The displayed point's shape, color, size can then be changed. Colors can also be changed by attributes within 
appropriate fields with three different color sets. If the points are colored by attributes then a legend depicting 
those attributes and colors can be enabled. The map can execute simple querying (e.g. one field & one attribute).
If a date/time field is detected and the listed data has appropriate date/time formatting then the data can be queried
with a time range. There are nine basemaps provided by esri that the user can select. The toolbar can be moved (Click 
and hold the top of the toolbar), hidden (Click hide at the bottom of the toolbar), and redisplayed (mouse over the
toolbar's last position).


.CSV File setup
There are only two fields required one containing latitudinal points and one containing longitudinal points. Make sure
there are no graphs or filters on in your file. The first entered row of data are the fields and every row underneath
are the respective attributes.
Appropriate Field Names:
Latitude - "lat", "latitude", "Latitude", "y", "ycenter", "XCOOR", "geo_x"
Longitude - "lon", "long", "longitude", "Longitude", "x", "xcenter", "YCOOR", "geo_y"

Date/Time query
The map allows you to query your data by date if you have an appropriate date field and appropriately formatted data. 
If your date/time data isn't already sorted in your .csv file the Webmap will sort it for you. 
Appropriate Field names:
'Date/Time','Date','Time','mm/dd/yyyy', 'mm/dd/yy', 'date/time', 'Date/time', 'date', 'time', 'Dates', 'dates'
Appropiate Date/Time formats:
http://www.w3schools.com/js/js_date_formats.asp

## Note:
This is the **first** applicaion I created a few weeks after starting to learn HTLM/CSS/JavaScript. The code does not utilize proper separation of concerns making it very difficult to build on from.

Created: 08/07/2015
