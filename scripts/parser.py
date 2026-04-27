import sys
import json
from pdfminer.high_level import extract_text

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided", "success": False}))
        sys.exit(1)

    file_path = sys.argv[1]
    
    try:
        text = extract_text(file_path)
        print(json.dumps({"text": text, "success": True}))
    except Exception as e:
        print(json.dumps({"error": str(e), "success": False}))

if __name__ == "__main__":
    main()
