import os
import csv
import json
import base64
import pandas as pd
import xml.dom.minidom
from PIL import Image
from docx import Document

SUPPORTED_TYPES = {
    "text": ["txt", "md", "json", "csv", "xml", "html", "css", "js", "py", "r"],
    "image": ["jpg", "jpeg", "png", "gif", "tif", "tiff", "bmp", "svg"],
    "document": ["docx", "xlsx", "pdf"],
    "archive": ["zip", "tar", "gz", "rar"],  # Archive files
    "other": [],
}


def is_supported_type(extension, size=None):
    """Check if file extension is supported for preview

    Args:
        extension (str): File extension without the dot
        size (int, optional): File size in bytes. Defaults to None.

    Returns:
        bool: True if the file type is supported and not too large
    """
    # Check size first if provided
    if size is not None:
        # 100MB size limit (104,857,600 bytes)
        MAX_SIZE = 104857600
        if size > MAX_SIZE:
            return False

    # Check if it's an archive file (recognized but not previewable)
    if extension.lower() in SUPPORTED_TYPES["archive"]:
        return False

    # Check file extension
    for category, extensions in SUPPORTED_TYPES.items():
        if extension.lower() in extensions:
            return True

    return False


def get_file_type(extension):
    """Get the file type category"""
    extension = extension.lower() if extension else ""
    for category, extensions in SUPPORTED_TYPES.items():
        if extension in extensions:
            return category
    return "other"


def get_file_preview(file_path, extension):
    """Generate preview data based on file type"""
    file_type = get_file_type(extension)

    try:
        if file_type == "text":
            return get_text_preview(file_path, extension)
        elif file_type == "image":
            return get_image_preview(file_path, extension)
        elif file_type == "document":
            if extension == "docx":
                return get_docx_preview(file_path)
            elif extension == "xlsx":
                return get_xlsx_preview(file_path)
            elif extension == "pdf":
                return {"type": "pdf", "preview": "PDF preview not available"}
        elif file_type == "archive":
            return {
                "type": "zip",
                "preview": f"Archive files cannot be previewed. Please download to view contents.",
            }

        # Default response for unsupported file types
        return {
            "type": "unsupported",
            "preview": f"Preview not available for {extension} files",
        }

    except Exception as e:
        return {"type": "error", "preview": f"Error generating preview: {str(e)}"}


def get_text_preview(file_path, extension):
    """Get preview for text-based files"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read(10000)  # Limit preview size

        if extension == "json":
            # Format JSON for better display
            try:
                parsed = json.loads(content)
                content = json.dumps(parsed, indent=2)
            except:
                pass
            
        elif extension == 'csv':
            # Convert CSV to formatted table data
            try:
                # Try reading with pandas first
                try:
                    df = pd.read_csv(file_path, nrows=100)
                    return {
                        'type': 'csv',
                        'preview': {
                            'columns': df.columns.tolist(),
                            'data': df.head(100).values.tolist()
                        }
                    }
                except Exception as csv_err:
                    print(f"Error using pandas to read CSV: {str(csv_err)}")
                    
                    # Fall back to manual CSV processing with csv module
                    import csv
                    rows = []
                    columns = []
                    
                    with open(file_path, 'r', newline='', encoding='utf-8') as csvfile:
                        reader = csv.reader(csvfile)
                        for i, row in enumerate(reader):
                            if i == 0:
                                columns = row
                            else:
                                rows.append(row)
                            if i >= 100:  # Limit to 100 rows
                                break
                    
                    return {
                        'type': 'csv',
                        'preview': {
                            'columns': columns,
                            'data': rows
                        }
                    }
            except Exception as e:
                print(f"Error processing CSV file: {str(e)}")
                # If all else fails, just return as text
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read(10000)
                return {
                    'type': 'text',
                    'preview': content,
                    'extension': 'txt'
                }

        elif extension == "xml":
            # Format XML for better display
            try:
                dom = xml.dom.minidom.parse(file_path)
                content = dom.toprettyxml()
            except:
                pass

        return {"type": "text", "preview": content, "extension": extension}

    except UnicodeDecodeError:
        # If not a text file or encoding issues
        return {
            "type": "binary",
            "preview": "This appears to be a binary file and cannot be previewed as text",
        }


# Improved get_image_preview function with better error handling for TIF files
def get_image_preview(file_path, extension):
    """Get preview for image files"""
    try:
        # Special handling for TIF/TIFF files
        if extension.lower() in ["tif", "tiff"]:
            try:
                with Image.open(file_path) as img:
                    # Convert TIFF to PNG for web display
                    # Resize very large images for preview
                    max_size = (800, 800)
                    if img.width > max_size[0] or img.height > max_size[1]:
                        img.thumbnail(max_size, Image.LANCZOS)

                    # Save to bytes as PNG
                    import io

                    buffer = io.BytesIO()
                    img.save(buffer, format="PNG")
                    img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

                    return {
                        "type": "image",
                        "preview": img_str,
                        "mime": "image/png",  # Always use PNG for TIFFs
                    }
            except Exception as e:
                print(f"Error processing TIF/TIFF file: {str(e)}")
                return {
                    "type": "error",
                    "preview": f"Error processing TIF/TIFF file: {str(e)}",
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
            img.save(buffer, format=img.format or "PNG")
            img_str = base64.b64encode(buffer.getvalue()).decode("utf-8")

            return {
                "type": "image",
                "preview": img_str,
                "mime": f'image/{img.format.lower() if img.format else "png"}',
            }
    except Exception as e:
        return {"type": "error", "preview": f"Error processing image: {str(e)}"}


def get_docx_preview(file_path):
    """Get preview for DOCX files"""
    try:
        doc = Document(file_path)
        content = []

        for para in doc.paragraphs:
            content.append(para.text)

        return {
            "type": "docx",
            "preview": "\n".join(content[:100]),  # Limit to first 100 paragraphs
        }
    except Exception as e:
        return {"type": "error", "preview": f"Error parsing DOCX file: {str(e)}"}


def get_xlsx_preview(file_path):
    """Get preview for XLSX files"""
    try:
        # Read the first sheet with pandas
        df = pd.read_excel(file_path, sheet_name=0, nrows=100)

        return {
            "type": "xlsx",
            "preview": {
                "columns": df.columns.tolist(),
                "data": df.head(100).values.tolist(),
            },
        }
    except Exception as e:
        return {"type": "error", "preview": f"Error parsing XLSX file: {str(e)}"}
