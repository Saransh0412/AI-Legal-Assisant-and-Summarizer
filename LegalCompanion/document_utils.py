import os
import uuid
import logging
from pathlib import Path
import PyPDF2
from werkzeug.utils import secure_filename

logger = logging.getLogger(__name__)

# Configure upload folder
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'txt', 'doc', 'docx'}

def allowed_file(filename):
    """Check if a file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def save_document(file):
    """
    Save an uploaded document to disk with a secure filename
    
    Args:
        file: Flask file object
        
    Returns:
        tuple: (filename, original_filename, mime_type, size)
    """
    try:
        if file and allowed_file(file.filename):
            # Secure original filename
            original_filename = secure_filename(file.filename)
            
            # Generate a unique filename
            file_extension = original_filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{uuid.uuid4().hex}.{file_extension}"
            
            # Create path and save file
            file_path = UPLOAD_FOLDER / unique_filename
            file.save(file_path)
            
            # Get file size
            size = os.path.getsize(file_path)
            
            return unique_filename, original_filename, file.content_type, size
        else:
            raise ValueError("Invalid file type. Allowed types: PDF, TXT, DOC, DOCX")
    except Exception as e:
        logger.error(f"Error saving document: {str(e)}")
        raise

def extract_text_from_document(filename):
    """
    Extract text content from a document
    
    Args:
        filename: The filename of the saved document
        
    Returns:
        str: Extracted text content
    """
    try:
        file_path = UPLOAD_FOLDER / filename
        file_extension = filename.rsplit('.', 1)[1].lower()
        
        if file_extension == 'pdf':
            return extract_text_from_pdf(file_path)
        elif file_extension == 'txt':
            return extract_text_from_txt(file_path)
        elif file_extension in ['doc', 'docx']:
            # Note: This would require additional libraries like python-docx
            # For now, return a message about limited support
            return "Document text extraction for DOC/DOCX files is limited. Consider uploading a PDF or TXT file for better results."
        else:
            return "Unsupported file format for text extraction."
    except Exception as e:
        logger.error(f"Error extracting text from document: {str(e)}")
        return f"Error extracting text: {str(e)}"

def extract_text_from_pdf(file_path):
    """Extract text from a PDF file"""
    text = ""
    try:
        with open(file_path, 'rb') as file:
            pdf_reader = PyPDF2.PdfReader(file)
            for page_num in range(len(pdf_reader.pages)):
                page = pdf_reader.pages[page_num]
                text += page.extract_text() + "\n\n"
        return text
    except Exception as e:
        logger.error(f"Error extracting text from PDF: {str(e)}")
        raise

def extract_text_from_txt(file_path):
    """Extract text from a TXT file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except UnicodeDecodeError:
        # Try with a different encoding
        try:
            with open(file_path, 'r', encoding='latin-1') as file:
                return file.read()
        except Exception as e:
            logger.error(f"Error extracting text from TXT with latin-1 encoding: {str(e)}")
            raise
    except Exception as e:
        logger.error(f"Error extracting text from TXT: {str(e)}")
        raise

def delete_document(filename):
    """
    Delete a document file from disk
    
    Args:
        filename: The filename to delete
    """
    try:
        file_path = UPLOAD_FOLDER / filename
        if os.path.exists(file_path):
            os.remove(file_path)
            logger.info(f"Deleted document: {filename}")
        else:
            logger.warning(f"File not found for deletion: {filename}")
    except Exception as e:
        logger.error(f"Error deleting document: {str(e)}")
        raise
