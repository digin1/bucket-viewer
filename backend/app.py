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

# Default configuration stored in memory
config = {
    'endpoint_url': '',
    'bucket_name': ''
}

# Function to create S3 client using the in-memory config
def get_s3_client():
    return boto3.client(
        's3',
        endpoint_url=config.get('endpoint_url'),
        aws_access_key_id='', 
        aws_secret_access_key='',
        config=Config(signature_version=UNSIGNED)
    )

# Get the current bucket name from the in-memory config
def get_bucket_name():
    return config.get('bucket_name')

@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    global config
    
    if request.method == 'GET':
        # Optionally override with URL parameters
        endpoint_url = request.args.get('endpoint')
        bucket_name = request.args.get('bucket')
        
        # Update config temporarily if parameters are provided
        temp_config = config.copy()
        if endpoint_url and bucket_name:
            temp_config['endpoint_url'] = endpoint_url
            temp_config['bucket_name'] = bucket_name
        
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
        
        # Update the in-memory config (no file persistence)
        config.update(new_config)
        
        return jsonify({"message": "Configuration updated successfully", "status": "success"})

@app.route('/api/list', methods=['GET'])
def list_objects():
    prefix = request.args.get('prefix', '')
    
    # Allow URL parameters to override the in-memory config
    endpoint_url = request.args.get('endpoint')
    bucket_name = request.args.get('bucket')
    
    try:
        if endpoint_url and bucket_name:
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
        
        response = s3_client.list_objects_v2(
            Bucket=current_bucket,
            Prefix=prefix,
            Delimiter='/'
        )
        
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
                'supported': is_supported_type(file_ext)
            })
        
        return jsonify({
            'currentPrefix': prefix,
            'folders': folders,
            'files': files
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/file', methods=['GET'])
def get_file():
    file_path = request.args.get('path', '')
    preview = request.args.get('preview', 'false').lower() == 'true'
    
    endpoint_url = request.args.get('endpoint')
    bucket_name = request.args.get('bucket')
    
    if not file_path:
        return jsonify({'error': 'File path is required'}), 400
    
    try:
        if endpoint_url and bucket_name:
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
        
        if preview:
            # Determine the file extension
            file_ext = os.path.splitext(file_path)[1].lower()[1:]
            
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
            # For full file download, create a temporary file
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
        
        file_info = {
            'name': file_name,
            'path': file_path,
            'size': response.get('ContentLength', 0),
            'lastModified': response.get('LastModified', '').isoformat() if hasattr(response.get('LastModified', ''), 'isoformat') else '',
            'type': 'file',
            'extension': file_ext,
            'supported': is_supported_type(file_ext),
            'metadata': {k: v for k, v in response.items() if k not in ['ResponseMetadata']}
        }
        
        return jsonify(file_info)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
