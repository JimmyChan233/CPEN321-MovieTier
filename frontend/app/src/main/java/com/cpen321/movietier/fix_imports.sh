#!/bin/bash

# Fix common imports that moved to core
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.utils\.LocationHelper/import com.cpen321.movietier.core.util.LocationHelper/g' \
  -e 's/import com\.cpen321\.movietier\.ui\.util\.TimeFormat/import com.cpen321.movietier.core.util.TimeFormat/g' \
  {} \;

# Fix theme imports to shared
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.ui\.theme\./import com.cpen321.movietier.shared.components./' \
  {} \;

# Fix component imports to shared
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.ui\.components\./import com.cpen321.movietier.shared.components./' \
  {} \;

# Fix model imports to shared
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.data\.model\./import com.cpen321.movietier.shared.models./' \
  {} \;

# Fix DataStore imports
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.data\.local\.TokenManager/import com.cpen321.movietier.core.datastore.TokenManager/g' \
  -e 's/import com\.cpen321\.movietier\.data\.local\.SettingsManager/import com.cpen321.movietier.core.datastore.SettingsManager/g' \
  {} \;

# Fix network/API imports
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.data\.api\.SseClient/import com.cpen321.movietier.core.network.SseClient/g' \
  -e 's/import com\.cpen321\.movietier\.data\.api\.ApiService/import com.cpen321.movietier.core.network.ApiService/g' \
  {} \;

# Fix di module imports
find . -name "*.kt" -type f -exec sed -i '' \
  -e 's/import com\.cpen321\.movietier\.di\.NetworkModule/import com.cpen321.movietier.core.di.NetworkModule/g' \
  {} \;

echo "Common imports fixed"
