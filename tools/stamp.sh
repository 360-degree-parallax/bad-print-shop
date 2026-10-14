#!/bin/sh
# Stamp every stylesheet/script URL in index.html with ?v=<build> so phones and
# browsers that cached older files fetch the new ones on the next load.
# Usage: sh tools/stamp.sh            (build = current time, e.g. 202610140945)
cd "$(dirname "$0")/.." || exit 1
v=$(date -u +%Y%m%d%H%M)
sed -i -E "s#(href=\"style\.css|src=\"[a-z-]+\.js)(\?v=[0-9]+)?\"#\1?v=$v\"#g" index.html
sed -i -E "s#^const BUILD=\"[0-9]*\";#const BUILD=\"$v\";#" app.js
echo "stamped $v"
