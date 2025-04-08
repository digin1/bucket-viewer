# S3 Bucket Viewer (GitHub Pages Version)

A static web application for browsing and previewing files in public S3 buckets, deployable to GitHub Pages.

## Features
- Browse bucket folders and files
- Preview various file types (text, images, CSV)
- Download files directly
- Configure custom S3 endpoints and buckets
- No backend required - runs entirely in the browser

## Live Demo
Check out the live demo: [https://digin1.github.io/s3-bucket-viewer](https://digin1.github.io/s3-bucket-viewer)

## How It Works
This application is a client-side only version of the S3 Bucket Viewer that works without a backend server. It uses:

- AWS SDK for JavaScript to directly communicate with S3 buckets
- Client-side file processing for previews
- Local storage for saving configuration

## Important Security Notes
- This application is designed for **PUBLIC** S3 buckets only
- No AWS credentials are stored or used
- All operations use unsigned requests (equivalent to `--no-sign-request` in AWS CLI)

## Usage
1. Visit the application URL
2. Enter your S3 endpoint URL and bucket name
3. Browse and preview files in the bucket

You can also pass the endpoint and bucket via URL parameters:
```
https://digin1.github.io/s3-bucket-viewer?endpoint=https://s3.example.com&bucket=my-bucket
```

## File Types Supported for Preview
- Text files (txt, md, json, xml, html, css, js, py, r)
- Images (jpg, jpeg, png, gif, svg)
- Data (csv)

## Deploying Your Own Version
1. Fork this repository
2. Enable GitHub Pages in your repository settings
3. Update `homepage` in `package.json` to match your GitHub Pages URL
4. Push changes to trigger the deployment workflow

## Local Development
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start
```

## Building for Deployment
```bash
# Build the production version
npm run build

# Deploy to GitHub Pages
npm run deploy
```