# MinIO Setup Guide

MinIO is required for profile picture uploads in the MovieTier backend.

## Quick Start with Docker

### Option 1: Docker Run (Simple)
```bash
docker run -d \
  -p 9000:9000 \
  -p 9001:9001 \
  --name movietier-minio \
  -e "MINIO_ROOT_USER=minioadmin" \
  -e "MINIO_ROOT_PASSWORD=minioadmin" \
  minio/minio server /data --console-address ":9001"
```

### Option 2: Docker Compose (Recommended)

Create a `docker-compose.yml` file in the backend directory:

```yaml
version: '3.8'

services:
  minio:
    image: minio/minio
    container_name: movietier-minio
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

volumes:
  minio-data:
```

Then run:
```bash
docker-compose up -d
```

## Accessing MinIO

- **API Endpoint**: http://localhost:9000
- **Console (Web UI)**: http://localhost:9001
- **Default Credentials**:
  - Username: `minioadmin`
  - Password: `minioadmin`

## Environment Configuration

The backend uses these environment variables (already set in `.env.example`):

```env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=movietier
```

## Production Setup

For production, you should:

1. **Change default credentials**:
   ```env
   MINIO_ACCESS_KEY=your-secure-access-key
   MINIO_SECRET_KEY=your-secure-secret-key
   ```

2. **Enable SSL**:
   ```env
   MINIO_USE_SSL=true
   ```

3. **Use a cloud MinIO instance** or deploy MinIO on your server with persistent storage.

## Verification

Once MinIO is running, the backend will automatically:
1. Connect to MinIO on startup
2. Create the `movietier` bucket if it doesn't exist
3. Set the bucket policy to public-read for images

You should see this in the logs:
```
✓ MinIO bucket "movietier" created
✓ MinIO bucket policy set to public-read
```

## Troubleshooting

**Connection Refused Error**:
- Make sure MinIO container is running: `docker ps`
- Check MinIO logs: `docker logs movietier-minio`
- Verify port 9000 is not in use: `lsof -i :9000`

**Bucket Not Created**:
- Check MinIO console at http://localhost:9001
- Manually create bucket named `movietier`
- Set bucket policy to public or anonymous read

**Images Not Loading**:
- Verify the bucket policy allows public read access
- Check that the MinIO endpoint is accessible from your frontend
- Ensure `MINIO_ENDPOINT` in `.env` matches your deployment setup
