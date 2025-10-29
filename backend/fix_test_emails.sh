#!/bin/bash

# Function to generate unique email based on filename
generate_unique_users() {
  local file=$1
  local basename=$(basename "$file" .unmocked.test.ts)
  local email_prefix=$(echo "$basename" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]//g')
  
  # Create unique user creation with proper email
  sed -i.bak "/user = await User.create(mockUsers.validUser);/c\\
    user = await User.create({\\
      ...mockUsers.validUser,\\
      email: '${email_prefix}user@example.com',\\
      googleId: 'google-${email_prefix}user'\\
    });" "$file"
  
  sed -i.bak "/user1 = await User.create(mockUsers.validUser);/c\\
    user1 = await User.create({\\
      ...mockUsers.validUser,\\
      email: '${email_prefix}user1@example.com',\\
      googleId: 'google-${email_prefix}user1'\\
    });" "$file"
  
  # Add cleanup in afterAll if not present
  if ! grep -q "await User.deleteMany" "$file"; then
    sed -i.bak "/afterAll(async () => {/a\\
    await User.deleteMany({});" "$file"
  fi
  
  echo "Fixed $file"
}

# Process all unmocked test files
for file in tests/unmocked/*.unmocked.test.ts; do
  if [ -f "$file" ]; then
    generate_unique_users "$file"
  fi
done

echo "All files processed"
