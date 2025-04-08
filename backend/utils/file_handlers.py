import os
import csv
import json
import base64
import pandas as pd
import xml.dom.minidom
from PIL import Image
from docx import Document

SUPPORTED_TYPES = {
    'text': ['txt', 'md', 'json', 'csv', 'xml', 'html', 'css', 'js', 'py', 'r'],
    'image': ['jpg', 'jpeg', 'png', 'gif', 'tif', 'tiff', 'bmp', 'svg'],
    'document': ['docx', 'xlsx', 'pdf'],
    'other': []
}

def is_supported_type(extension):
    """Check if file extension is supported for preview"""
    for category in SUPPORTED_TYPES:
        if extension in SUPPORTED_TYPES[category]:
            return True
    return False

def get_file_type(extension):
    """Get the file type category"""
    for category, extensions in SUPPORTED_TYPES.items():
        if extension in extensions:
            return category
    return 'other'

def get_file_preview(file_path, extension):
    """Generate preview data based on file type"""
    file_type = get_file_type(extension)
    
    try:
        if file_type == 'text':
            return get_text_preview(file_path, extension)
        elif file_type == 'image':
            return get_image_preview(file_path, extension)
        elif file_type == 'document':
            if extension == 'docx':
                return get_docx_preview(file_path)
            elif extension == 'xlsx':
                return get_xlsx_preview(file_path)
            elif extension == 'pdf':
                return {'type': 'pdf', 'preview': 'PDF preview not available'}
        
        # Default response for unsupported file types
        return {
            'type': 'unsupported',
            'preview': f'Preview not available for {extension} files'
        }
        
    except Exception as e:
        return {
            'type': 'error',
            'preview': f'Error generating preview: {str(e)}'
        }

def get_text_preview(file_path, extension):
    """Get preview for text-based files"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read(10000)  # Limit preview size
        
        if extension == 'json':
            # Format JSON for better display
            try:
                parsed = json.loads(content)
                content = json.dumps(parsed, indent=2)
            except:
                pass
        
        elif extension == 'csv':
            # Convert CSV to formatted table data
            try:
                df = pd.read_csv(file_path, nrows=100)
                return {
                    'type': 'csv',
                    'preview': {
                        'columns': df.columns.tolist(),
                        'data': df.head(100).values.tolist()
                    }
                }
            except:
                pass
        
        elif extension == 'xml':
            # Format XML for better display
            try:
                dom = xml.dom.minidom.parse(file_path)
                content = dom.toprettyxml()
            except:
                pass
        
        return {
            'type': 'text',
            'preview': content,
            'extension': extension
        }
    
    except UnicodeDecodeError:
        # If not a text file or encoding issues
        return {
            'type': 'binary',
            'preview': 'This appears to be a binary file and cannot be previewed as text'
        }

def get_image_preview(file_path, extension):
    """Get preview for image files"""
    try:
        # Special handling for TIF/TIFF files
        if extension.lower() in ['tif', 'tiff']:
            with Image.open(file_path) as img:
                # Convert TIFF to PNG for web display
                # Resize very large images for preview
                max_size = (800, 800)
                if img.width > max_size[0] or img.height > max_size[1]:
                    img.thumbnail(max_size, Image.LANCZOS)
                
                # Save to bytes as PNG
                import io
                buffer = io.BytesIO()
                img.save(buffer, format='PNG')
                img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
                
                return {
                    'type': 'image',
                    'preview': img_str,
                    'mime': 'image/png'  # Always use PNG for TIFFs
                }
        
        # Regular handling for other image types
        with Image.open(file_path) as img:
            # Resize very large images for preview
            max_size = (800, 800)
            if img.width > max_size[0] or img.height > max_size[1]:
                img.thumbnail(max_size, Image.LANCZOS)
            
            # Save to bytes
            import io
            buffer = io.BytesIO()
            img.save(buffer, format=img.format or 'PNG')
            img_str = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            return {
                'type': 'image',
                'preview': img_str,
                'mime': f'image/{img.format.lower() if img.format else "png"}'
            }
    except Exception as e:
        return {
            'type': 'error',
            'preview': f'Error processing image: {str(e)}'
        }

def get_docx_preview(file_path):
    """Get preview for DOCX files"""
    try:
        doc = Document(file_path)
        content = []
        
        for para in doc.paragraphs:
            content.append(para.text)
        
        return {
            'type': 'docx',
            'preview': '\n'.join(content[:100])  # Limit to first 100 paragraphs
        }
    except Exception as e:
        return {
            'type': 'error',
            'preview': f'Error parsing DOCX file: {str(e)}'
        }

def get_xlsx_preview(file_path):
    """Get preview for XLSX files"""
    try:
        # Read the first sheet with pandas
        df = pd.read_excel(file_path, sheet_name=0, nrows=100)
        
        return {
            'type': 'xlsx',
            'preview': {
                'columns': df.columns.tolist(),
                'data': df.head(100).values.tolist()
            }
        }
    except Exception as e:
        return {
            'type': 'error',
            'preview': f'Error parsing XLSX file: {str(e)}'
        }