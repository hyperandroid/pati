rm build/all.js
npm run build
echo "" >> build/all.js
echo "require('Main');" >> build/all.js
