
echo "TSC"
tsc
echo "Browserify"
mkdir -p build
browserify -p tsify -d -r ./Main.js:Main > build/all.js

echo "" >> build/all.js
echo "require('Main');" >> build/all.js
