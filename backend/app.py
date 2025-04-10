from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
import boto3
import os
import tempfile
import json
from utils.file_handlers import get_file_preview, is_supported_type
from botocore import UNSIGNED
from botocore.config import Config

app = Flask(__name__)
CORS(app)

# Helper function to ensure endpoint has protocol
def ensure_endpoint_has_protocol(endpoint_url):
    """Ensure the endpoint URL has a protocol (http:// or https://)"""
    if endpoint_url and not endpoint_url.startswith(('http://', 'https://')):
        # Default to https:// for security
        return f'https://{endpoint_url}'
    return endpoint_url

# Default configuration stored in memory
config = {
    'endpoint_url': '',
    'bucket_name': ''
}

# Function to create S3 client using the in-memory config
def get_s3_client():
    endpoint = ensure_endpoint_has_protocol(config.get('endpoint_url'))
    return boto3.client(
        's3',
        endpoint_url=endpoint,
        aws_access_key_id='', 
        aws_secret_access_key='',
        config=Config(signature_version=UNSIGNED)
    )

# Get the current bucket name from the in-memory config
def get_bucket_name():
    return config.get('bucket_name')

@app.route('/api/config', methods=['GET', 'POST', 'DELETE'])
def handle_config():
    global config
    
    if request.method == 'GET':
        # Optionally override with URL parameters
        endpoint_url = request.args.get('endpoint')
        bucket_name = request.args.get('bucket')
        
        # If no endpoint or bucket in URL, return current config
        if not endpoint_url or not bucket_name:
            # Return a copy of current config
            safe_config = config.copy()
            if 'aws_secret_access_key' in safe_config:
                safe_config['aws_secret_access_key'] = '********' if safe_config['aws_secret_access_key'] else ''
            return jsonify(safe_config)
        
        # Update config temporarily if parameters are provided
        temp_config = {
            'endpoint_url': ensure_endpoint_has_protocol(endpoint_url),
            'bucket_name': bucket_name
        }
        
        # Remove sensitive information (if any) for frontend purposes
        safe_config = temp_config.copy()
        if 'aws_secret_access_key' in safe_config:
            safe_config['aws_secret_access_key'] = '********' if safe_config['aws_secret_access_key'] else ''
        
        return jsonify(safe_config)
    
    elif request.method == 'POST':
        new_config = request.json
        
        # Preserve secret if masked
        if new_config.get('aws_secret_access_key') == '********' and config.get('aws_secret_access_key'):
            new_config['aws_secret_access_key'] = config.get('aws_secret_access_key')
        
        # Ensure endpoint has protocol
        if new_config.get('endpoint_url'):
            new_config['endpoint_url'] = ensure_endpoint_has_protocol(new_config['endpoint_url'])
        
        # Update the in-memory config (no file persistence)
        config.update(new_config)
        
        return jsonify({"message": "Configuration updated successfully", "status": "success"})
    
    elif request.method == 'DELETE':
        # Reset the configuration to default values
        config.clear()
        config.update({
            'endpoint_url': '',
            'bucket_name': ''
        })
        return jsonify({"message": "Configuration cleared successfully", "status": "success"})

@app.route('/api/list', methods=['GET'])
def list_objects():
    prefix = request.args.get('prefix', '')
    
    # Get continuation token for pagination
    continuation_token = request.args.get('continuation_token')
    
    # Allow URL parameters to override the in-memory config
    endpoint_url = request.args.get('endpoint')
    bucket_name = request.args.get('bucket')
    
    try:
        if endpoint_url and bucket_name:
            # Apply the protocol fix here
            endpoint_url = ensure_endpoint_has_protocol(endpoint_url)
            
            s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id='', 
                aws_secret_access_key='',
                config=Config(signature_version=UNSIGNED)
            )
            current_bucket = bucket_name
        else:
            s3_client = get_s3_client()
            current_bucket = get_bucket_name()
            
            # Return empty result if no bucket configured
            if not current_bucket:
                return jsonify({
                    'currentPrefix': prefix,
                    'folders': [],
                    'files': []
                })
        
        # Set up listing parameters
        list_params = {
            'Bucket': current_bucket,
            'Prefix': prefix,
            'Delimiter': '/',
            'MaxKeys': 500  # Reduce from default 1000 to more manageable chunks
        }
        
        # Add continuation token if provided
        if continuation_token:
            list_params['ContinuationToken'] = continuation_token
        
        # Call S3 with appropriate parameters
        response = s3_client.list_objects_v2(**list_params)
        
        # Extract folders and files from the S3 response
        folders = []
        files = []
        
        for item in response.get('CommonPrefixes', []):
            folder_name = item['Prefix'].rstrip('/').split('/')[-1] + '/'
            folders.append({
                'name': folder_name,
                'path': item['Prefix'],
                'type': 'folder'
            })
        
        for item in response.get('Contents', []):
            # Skip if this key is the prefix itself or if it represents a folder
            if item['Key'] == prefix or item['Key'].endswith('/'):
                continue
            
            file_name = item['Key'].split('/')[-1]
            file_ext = os.path.splitext(file_name)[1].lower()[1:]
            
            files.append({
                'name': file_name,
                'path': item['Key'],
                'size': item['Size'],
                'lastModified': item['LastModified'].isoformat(),
                'type': 'file',
                'extension': file_ext,
                'supported': is_supported_type(file_ext, item['Size'])
            })
        
        # Collect S3 response information for pagination
        result = {
            'currentPrefix': prefix,
            'folders': folders,
            'files': files
        }
        
        # Add total item count info from S3
        # KeyCount includes both files and folders
        if 'KeyCount' in response:
            result['keyCount'] = response['KeyCount']
        
        # Also pass the total found count if available (may not be fully accurate for large buckets)
        if 'MaxKeys' in response:
            result['maxKeys'] = response['MaxKeys']
        
        # Add continuation token if more results exist
        if response.get('IsTruncated'):
            result['continuationToken'] = response.get('NextContinuationToken')
            result['isTruncated'] = True
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file', methods=['GET'])
def get_file():
    file_path = request.args.get('path', '')
    preview = request.args.get('preview', 'false').lower() == 'true'
    
    # Get file size from request parameter (if available)
    file_size_str = request.args.get('size', '')
    file_size = int(file_size_str) if file_size_str and file_size_str.isdigit() else None
    
    endpoint_url = request.args.get('endpoint')
    bucket_name = request.args.get('bucket')
    
    if not file_path:
        return jsonify({'error': 'File path is required'}), 400
    
    try:
        if endpoint_url and bucket_name:
            # Apply the protocol fix here
            endpoint_url = ensure_endpoint_has_protocol(endpoint_url)
            
            s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id='', 
                aws_secret_access_key='',
                config=Config(signature_version=UNSIGNED)
            )
            current_bucket = bucket_name
        else:
            s3_client = get_s3_client()
            current_bucket = get_bucket_name()
        
        file_name = file_path.split('/')[-1]
        file_ext = os.path.splitext(file_name)[1].lower()[1:]
        
        # For preview requests only, check file size and type
        if preview:
            # Get file metadata only if size wasn't provided in request
            if file_size is None:
                try:
                    response = s3_client.head_object(
                        Bucket=current_bucket,
                        Key=file_path
                    )
                    file_size = response.get('ContentLength', 0)
                except Exception as e:
                    # If head_object fails, continue and try to get the file anyway
                    print(f"Error getting file metadata: {str(e)}")
                    file_size = 0
            
            # Check if file is too large for preview (100MB = 104,857,600 bytes)
            MAX_PREVIEW_SIZE = 104857600
            if file_size and file_size > MAX_PREVIEW_SIZE:
                # Format size for human-readable display
                size_display = format_file_size(file_size)
                return jsonify({
                    'type': 'too_large',
                    'preview': f'This file is {size_display}, which exceeds the preview size limit.',
                    'size': file_size
                })
            
            # Special handling for archive files
            if file_ext.lower() in ['zip', 'tar', 'gz', 'rar']:
                return jsonify({
                    'type': 'zip',
                    'preview': 'Archive files cannot be previewed. Please download to view contents.',
                    'size': file_size or 0
                })
            
            # Create a temporary file with the correct suffix
            with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{file_ext}') as temp:
                temp_path = temp.name
            
            # Download the file from S3
            s3_client.download_file(current_bucket, file_path, temp_path)
            
            # Get a preview of the file based on its type
            preview_data = get_file_preview(temp_path, file_ext)
            
            # Clean up the temporary file
            os.unlink(temp_path)
            
            return jsonify(preview_data)
        else:
            # For direct downloads, always allow regardless of size
            with tempfile.NamedTemporaryFile(delete=False) as temp:
                temp_path = temp.name
            
            s3_client.download_file(current_bucket, file_path, temp_path)
            
            return send_file(
                temp_path,
                as_attachment=True,
                download_name=os.path.basename(file_path)
            )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/fileinfo', methods=['GET'])
def get_file_info():
    file_path = request.args.get('path', '')
    
    endpoint_url = request.args.get('endpoint')
    bucket_name = request.args.get('bucket')
    
    if not file_path:
        return jsonify({'error': 'File path is required'}), 400
    
    try:
        if endpoint_url and bucket_name:
            # Apply the protocol fix here
            endpoint_url = ensure_endpoint_has_protocol(endpoint_url)
            
            s3_client = boto3.client(
                's3',
                endpoint_url=endpoint_url,
                aws_access_key_id='', 
                aws_secret_access_key='',
                config=Config(signature_version=UNSIGNED)
            )
            current_bucket = bucket_name
        else:
            s3_client = get_s3_client()
            current_bucket = get_bucket_name()
        
        response = s3_client.head_object(
            Bucket=current_bucket,
            Key=file_path
        )
        
        file_name = file_path.split('/')[-1]
        file_ext = os.path.splitext(file_name)[1].lower()[1:]
        file_size = response.get('ContentLength', 0)
        
        file_info = {
            'name': file_name,
            'path': file_path,
            'size': file_size,
            'lastModified': response.get('LastModified', '').isoformat() if hasattr(response.get('LastModified', ''), 'isoformat') else '',
            'type': 'file',
            'extension': file_ext,
            'supported': is_supported_type(file_ext, file_size),
            'metadata': {k: v for k, v in response.items() if k not in ['ResponseMetadata']}
        }
        
        return jsonify(file_info)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Helper function to format file size
def format_file_size(bytes):
    if bytes == 0:
        return '0 B'
    
    # Define size units and thresholds
    units = ['B', 'KB', 'MB', 'GB', 'TB']
    i = 0
    
    # Find the appropriate unit
    while bytes >= 1024 and i < len(units) - 1:
        bytes /= 1024
        i += 1
    
    # Format with decimal places for GB and TB, rounded for smaller units
    if i >= 3:  # GB or TB
        return f"{bytes:.2f} {units[i]}"
    else:
        return f"{int(bytes)} {units[i]}"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)