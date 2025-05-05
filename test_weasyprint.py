#!/usr/bin/env python
from weasyprint import HTML, CSS
import os

def test_weasyprint():
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Test PDF</title>
    </head>
    <body>
        <h1>WeasyPrint Test</h1>
        <p>If you can see this PDF, WeasyPrint is working!</p>
    </body>
    </html>
    """
    
    try:
        # Create a simple PDF
        pdf = HTML(string=html).write_pdf()
        
        # Save it to a file
        with open('test.pdf', 'wb') as f:
            f.write(pdf)
        
        print("SUCCESS: PDF created successfully at", os.path.abspath('test.pdf'))
        return True
    except Exception as e:
        print("ERROR:", str(e))
        return False

if __name__ == "__main__":
    test_weasyprint() 