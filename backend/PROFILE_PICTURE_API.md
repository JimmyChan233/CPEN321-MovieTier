# Profile Picture API Documentation

This document explains how the profile picture feature works with MinIO object storage.

## Architecture Overview

The profile picture system uses a **two-step upload flow**:

1. **Upload image to MinIO** → Receive public URL
2. **Update user profile** → Save URL to database

This separation allows for:
- Direct access to images via public URLs
- No database bloat (only URLs stored, not binary data)
- Easy migration to other cloud storage (S3, Azure Blob, etc.)
- Better performance and scalability

## API Endpoints

### 1. Upload Media File

**Endpoint**: `POST /api/media/upload`

**Authentication**: Required (JWT token in Authorization header)

**Content-Type**: `multipart/form-data`

**Request Body**:
```
file: <binary file data>
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:9000/movietier/images/1729734123456_a1b2c3d4e5f6g7h8.jpg",
    "filename": "profile.jpg",
    "size": 45678,
    "mimetype": "image/jpeg"
  }
}
```

**Error Response** (400/500):
```json
{
  "success": false,
  "message": "No file provided"
}
```

**Example cURL**:
```bash
curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "file=@/path/to/image.jpg"
```

---

### 2. Update User Profile

**Endpoint**: `PUT /api/users/profile`

**Authentication**: Required (JWT token)

**Content-Type**: `application/json`

**Request Body**:
```json
{
  "name": "John Doe",              // Optional
  "profilePicture": "http://..."   // Optional: URL from media upload
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "email": "user@example.com",
    "name": "John Doe",
    "profileImageUrl": "http://localhost:9000/movietier/images/1729734123456_a1b2c3d4e5f6g7h8.jpg"
  }
}
```

**Special Values for profilePicture**:
- `null` or `""` or `"REMOVE"` → Resets to Google profile picture
- Valid HTTP(S) URL → Sets as profile picture

**Example cURL**:
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "profilePicture": "http://localhost:9000/movietier/images/123456789_abc123.jpg"
  }'
```

---

## Complete Upload Flow

### Step-by-Step Example

#### 1. User selects an image on frontend
```kotlin
// Android/Kotlin example
val imageBytes = getImageBytesFromUri(uri)
```

#### 2. Frontend uploads to media endpoint
```kotlin
val requestFile = RequestBody.create(MediaType.parse("image/jpeg"), imageBytes)
val body = MultipartBody.Part.createFormData("file", "profile.jpg", requestFile)
val response = apiService.uploadMedia(body)
```

**Backend receives request** → Uploads to MinIO → Returns public URL:
```json
{
  "success": true,
  "data": {
    "url": "http://localhost:9000/movietier/images/1729734123456_abc123def456.jpg"
  }
}
```

#### 3. Frontend updates profile with the URL
```kotlin
val imageUrl = uploadResponse.data.url
val updateRequest = UpdateProfileRequest(profilePicture = imageUrl)
val profileResponse = apiService.updateProfile(updateRequest)
```

**Backend receives request** → Saves URL to user document → Returns updated user:
```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "name": "John Doe",
    "profileImageUrl": "http://localhost:9000/movietier/images/1729734123456_abc123def456.jpg"
  }
}
```

#### 4. Frontend displays the image
```kotlin
AsyncImage(
    model = user.profileImageUrl,  // Direct URL to MinIO
    contentDescription = "Profile Picture"
)
```

---

## Backend Implementation Details

### MinIO Service (`src/services/minio.service.ts`)

**Key Features**:
- Automatic bucket creation on startup
- Public-read bucket policy for images
- Unique filename generation (timestamp + random hash)
- Content-Type detection from file extension
- Graceful handling when MinIO is unavailable

**File Naming Convention**:
```
{folder}/{timestamp}_{randomHash}.{extension}
Example: images/1729734123456_a1b2c3d4e5f6g7h8.jpg
```

**Public URL Format**:
```
{protocol}://{endpoint}:{port}/{bucket}/{objectName}
Example: http://localhost:9000/movietier/images/1729734123456_abc123.jpg
```

### Media Controller (`src/controllers/mediaController.ts`)

Handles file uploads:
1. Validates file presence
2. Uploads to MinIO via `minioService.uploadFile()`
3. Returns public URL and metadata

### User Routes (`src/routes/userRoutes.ts`)

**Profile Update Logic**:
- Accepts `profilePicture` field (URL or special value)
- If new URL provided: Deletes old MinIO image (if exists)
- If `null`/`"REMOVE"`: Deletes old MinIO image, resets to Google picture
- Updates user document with new URL

**Automatic Cleanup**:
- Old MinIO images are deleted when updating/removing profile pictures
- Google profile pictures are never deleted
- Only deletes images from MinIO bucket (checks `isMinioUrl()`)

---

## Frontend Implementation (Android/Kotlin)

### Repository Pattern

**AuthRepository.kt**:
```kotlin
suspend fun uploadProfilePicture(imageBytes: ByteArray): Result<User> {
    // Step 1: Upload to MinIO
    val uploadResponse = apiService.uploadMedia(multipartBody)
    val imageUrl = uploadResponse.data.url

    // Step 2: Update profile
    return updateProfile(name = null, profilePicture = imageUrl)
}

suspend fun deleteProfilePicture(): Result<User> {
    return updateProfile(name = null, profilePicture = "REMOVE")
}
```

### ViewModel

**AuthViewModel.kt**:
```kotlin
fun uploadProfilePicture(imageBytes: ByteArray) {
    viewModelScope.launch {
        when (val result = authRepository.uploadProfilePicture(imageBytes)) {
            is Result.Success -> {
                // Update UI with new user data
                _uiState.value = _uiState.value.copy(
                    user = result.data,
                    successMessage = "Profile picture updated"
                )
            }
            is Result.Error -> {
                // Show error
            }
        }
    }
}
```

### UI (Compose)

**EditProfileScreen.kt**:
```kotlin
val pickImage = rememberLauncherForActivityResult(
    contract = ActivityResultContracts.PickVisualMedia()
) { uri ->
    uri?.let {
        val imageBytes = processImage(uri)  // Resize and compress
        authViewModel.uploadProfilePicture(imageBytes)
    }
}

// Display
AsyncImage(
    model = user.profileImageUrl,
    modifier = Modifier.size(120.dp).clip(CircleShape)
)
```

---

## Error Handling

### Common Errors

**1. MinIO Not Running**
```json
{
  "success": false,
  "message": "MinIO is not available. Please ensure MinIO server is running."
}
```
**Solution**: Start MinIO using Docker (see MINIO_SETUP.md)

**2. File Too Large**
```json
{
  "success": false,
  "message": "File too large"
}
```
**Solution**: Images are limited to 5MB. Resize/compress before upload.

**3. Invalid URL Format**
```json
{
  "success": false,
  "message": "Invalid profile picture URL format"
}
```
**Solution**: Ensure URL starts with `http://` or `https://`

**4. Authentication Required**
```json
{
  "success": false,
  "message": "Unauthorized"
}
```
**Solution**: Include valid JWT token in Authorization header

---

## Configuration

### Environment Variables

Required in `.env`:
```env
# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=movietier
```

### File Upload Limits

**Backend** (`src/middleware/upload.ts`):
```typescript
limits: {
  fileSize: 5 * 1024 * 1024  // 5MB max
}
```

**Allowed File Types**:
- image/jpeg
- image/png
- image/gif
- image/webp

---

## Testing

### Manual Testing with cURL

**1. Upload Image**:
```bash
TOKEN="your_jwt_token_here"

curl -X POST http://localhost:3000/api/media/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-image.jpg"
```

**2. Update Profile**:
```bash
IMAGE_URL="http://localhost:9000/movietier/images/123456_abc.jpg"

curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"profilePicture\": \"$IMAGE_URL\"}"
```

**3. Remove Profile Picture**:
```bash
curl -X PUT http://localhost:3000/api/users/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"profilePicture": "REMOVE"}'
```

---

## Migration Notes

### From Local Filesystem to MinIO

Previous implementation stored files in `/uploads/profile-pictures/` directory.

**Migration Steps**:
1. Old local files are no longer used
2. No automatic migration needed
3. Users will need to re-upload profile pictures
4. Old files in `/uploads/` can be deleted

### To AWS S3 or Other S3-Compatible Storage

MinIO uses S3-compatible API, making migration easy:

1. Update `.env` with S3 credentials:
   ```env
   MINIO_ENDPOINT=s3.amazonaws.com
   MINIO_USE_SSL=true
   MINIO_ACCESS_KEY=your_aws_access_key
   MINIO_SECRET_KEY=your_aws_secret_key
   MINIO_BUCKET_NAME=your-bucket-name
   ```

2. No code changes required!

---

## Security Considerations

1. **Public Access**: Images are publicly accessible via direct URL
   - Anyone with the URL can view the image
   - URLs are not easily guessable (timestamp + random hash)

2. **File Validation**:
   - File type checked by multer
   - File size limited to 5MB
   - Only authenticated users can upload

3. **Automatic Cleanup**:
   - Old images deleted when replaced
   - Prevents storage bloat

4. **Production Recommendations**:
   - Use HTTPS in production (`MINIO_USE_SSL=true`)
   - Change default MinIO credentials
   - Consider adding rate limiting to upload endpoint
   - Implement image scanning for malware

---

## Troubleshooting

### Images Not Loading

**Check**:
1. MinIO is running: `docker ps | grep minio`
2. Bucket exists and is public: Visit http://localhost:9001
3. URL format is correct: Should start with `http://localhost:9000/movietier/`

### Upload Fails

**Check**:
1. File size < 5MB
2. File is an image type
3. JWT token is valid
4. MinIO container is running

### Old Images Not Deleted

**Check**:
1. `profileImageUrl` in database contains MinIO URL
2. MinIO service `isMinioUrl()` returns true
3. Check backend logs for deletion errors

---

## Additional Resources

- **MinIO Setup**: See `MINIO_SETUP.md`
- **MinIO Docs**: https://min.io/docs/
- **Frontend Implementation**: See `frontend/app/src/main/java/com/cpen321/movietier/`
- **API Reference**: See individual endpoint documentation above
