import os
import csv
import logging
import PyPDF2

logger = logging.getLogger("ecomind.services.document_parser")

class DocumentParserService:
    """Service to extract text from various file formats for agent analysis."""
    
    @staticmethod
    def parse_file(file_path: str) -> str:
        """Parses a file and returns its extracted text."""
        if not os.path.exists(file_path):
            logger.error(f"File not found: {file_path}")
            return "Error: File not found."
            
        ext = os.path.splitext(file_path)[1].lower()
        
        try:
            if ext == '.pdf':
                return DocumentParserService._parse_pdf(file_path)
            elif ext == '.csv':
                return DocumentParserService._parse_csv(file_path)
            elif ext in ['.txt', '.md', '.json']:
                return DocumentParserService._parse_text(file_path)
            else:
                logger.warning(f"Unsupported file type: {ext}")
                return f"Error: Unsupported file type '{ext}'."
        except Exception as e:
            logger.error(f"Failed to parse {file_path}: {e}")
            return f"Error parsing file: {str(e)}"
            
    @staticmethod
    def _parse_pdf(file_path: str) -> str:
        text = []
        with open(file_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text.append(page_text)
        return "\n\n".join(text)

    @staticmethod
    def _parse_csv(file_path: str) -> str:
        lines = []
        with open(file_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            for row in reader:
                lines.append(", ".join(row))
        return "\n".join(lines)

    @staticmethod
    def _parse_text(file_path: str) -> str:
        with open(file_path, "r", encoding="utf-8") as f:
            return f.read()
