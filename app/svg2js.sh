#!/bin/sh

ARGS="ed -O -N svg=http://www.w3.org/2000/svg"
DELETE="-d //comment() -d //svg:defs -d //svg:title -d //svg:desc -d //@fill -d //@stroke -d //@stroke-width -d //@fill-rule -d //@width -d //@height"

process_svg () {
    NAME=$1
    ID=$(basename $NAME | sed -e 's/.svg//')

    DATA=$(cat $NAME | xmlstarlet fo -D -N | xmlstarlet $ARGS $DELETE | sed -e 's+xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" ++')
    printf "ICONS[\"$ID\"] = \`$DATA\`;\n"
}

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 svg_directory"
  exit 1
fi

IMAGES=$(find "$1" -name "*.svg")

printf "let ICONS={};\n"
for i in $IMAGES; do
    process_svg $i
done
printf "export default ICONS;\n"
