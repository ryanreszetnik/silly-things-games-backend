#!/bin/bash

# Generate OpenAPI client
openapi-generator-cli generate \
  -i ./openapi-spec.json \
  -g typescript-axios \
  -o ../silly-things-games-frontend/src/lib \
  -c openapi-generator-config.json

# Copy socket interface file
cp ./src/shared/interfaces/socket.interface.ts ../silly-things-games-frontend/src/services/socket.interface.ts

# Update import statements
if [[ "$OSTYPE" == "darwin"* ]]; then
  # macOS
  sed -i '' "s|from '\.\.\/\.\.\/.*'|from '../lib'|g" ../silly-things-games-frontend/src/services/socket.interface.ts
else
  # Linux and Windows (Git Bash)
  sed -i "s|from '\.\.\/\.\.\/.*'|from '../lib'|g" ../silly-things-games-frontend/src/services/socket.interface.ts
fi


echo "Client generation and interface update complete."