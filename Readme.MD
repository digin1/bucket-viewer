# S3 Bucket Viewer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

A modern, user-friendly web application for browsing, previewing, and downloading files from public Amazon S3 buckets and S3-compatible storage services.

![S3 Bucket Viewer Screenshot](https://raw.githubusercontent.com/digin1/s3-bucket-viewer/refs/heads/main/images/screenshot1.png)

## 🚀 Features

- **Browse & Navigate** - Easily explore S3 buckets with folder navigation and breadcrumbs
- **File Preview** - Built-in viewers for multiple file formats:
  - Text files (TXT, JSON, XML, HTML, CSS, JS, Python)
  - Markdown with syntax highlighting
  - Images (JPG, PNG, GIF, TIFF, BMP, SVG)
  - Documents (DOCX, XLSX)
  - CSV with tabular view
- **Batch Download** - Generate AWS CLI commands to download entire directories
- **Custom Endpoints** - Compatible with any S3-compatible storage service
- **Public Access Only** - Designed for no-auth access to public buckets
- **Responsive Design** - Fully responsive UI with Tailwind CSS
- **Docker Ready** - Easy deployment with Docker and Docker Compose

## 🛠️ Tech Stack

- **Frontend**: React.js, Tailwind CSS, Axios
- **Backend**: Flask (Python), Boto3
- **Containerization**: Docker & Docker Compose
- **File Processing**: Pandas, PIL, python-docx, openpyxl

## 📋 Prerequisites

- Docker and Docker Compose
- Or: Node.js 16+ and Python 3.9+

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/digin1/s3-bucket-viewer.git
cd s3-bucket-viewer

# Start the application
docker-compose up
```

The application will be available at http://localhost:8080

### Manual Setup

#### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

#### Frontend

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

## 🔧 Configuration

Configure the application through the UI:

1. Click the "Settings" button in the top-right corner
2. Enter your S3 endpoint URL (default: https://s3.amazonaws.com)
3. Enter your bucket name
4. Click "Connect to Bucket"

## 🌐 URL Parameters

Share specific bucket views with URL parameters:

- `endpoint` - S3 endpoint URL
- `bucket` - Bucket name
- `path` - Directory path within the bucket

Example:
```
http://localhost:8080?endpoint=https://s3.amazonaws.com&bucket=my-public-bucket&path=images/
```

## 💻 Development

### Project Structure

```
├── backend/               # Flask API
│   ├── app.py             # Main API application
│   ├── utils/             # Helper utilities
│   │   └── file_handlers.py  # File type processing
│   ├── requirements.txt   # Python dependencies
│   └── Dockerfile         # Backend container
├── frontend/              # React application
│   ├── src/               # Source code
│   │   ├── components/    # UI components
│   │   │   ├── FileTypeHandlers/  # File type viewers
│   │   │   └── ...
│   │   ├── App.js         # Main application
│   │   └── ...
│   ├── public/            # Static assets
│   ├── package.json       # Node dependencies
│   └── Dockerfile         # Frontend container
└── docker-compose.yml     # Container orchestration
```

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🔒 Security Note

This application is designed for public S3 buckets only. It uses the `--no-sign-request` equivalent in boto3 and does not support authentication. For private buckets, consider using the official AWS Console or AWS CLI.

---

Made with ❤️ by [Digin Dominic]