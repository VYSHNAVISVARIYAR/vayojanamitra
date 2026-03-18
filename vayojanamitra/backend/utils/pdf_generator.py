from io import BytesIO
from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_application_pdf(draft_data: dict, user_name: str) -> bytes:
    """Generate a clean PDF application draft."""
    
    # Create buffer
    buffer = BytesIO()
    
    # Create PDF document
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=72,
        leftMargin=72,
        topMargin=72,
        bottomMargin=18
    )
    
    # Get styles
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=30,
        alignment=TA_CENTER,
        textColor=colors.darkblue
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        spaceAfter=12,
        spaceBefore=20,
        textColor=colors.black
    )
    
    body_style = ParagraphStyle(
        'CustomBody',
        parent=styles['Normal'],
        fontSize=10,
        spaceAfter=6,
        leading=14
    )
    
    highlight_style = ParagraphStyle(
        'Highlight',
        parent=styles['Normal'],
        fontSize=10,
        backColor=colors.yellow,
        borderColor=colors.black,
        borderWidth=1,
        borderPadding=5,
        spaceAfter=6
    )
    
    # Build content
    content = []
    
    # Header
    content.append(Paragraph("Vayojanamitra.ai — Application Draft", title_style))
    content.append(Paragraph(f"Generated on: {datetime.now().strftime('%d %B %Y')}", styles['Normal']))
    content.append(Spacer(1, 20))
    
    # Applicant and scheme info
    scheme_title = draft_data.get('scheme', {}).get('title', 'Scheme Name')
    content.append(Paragraph(f"<b>Applicant:</b> {user_name}", body_style))
    content.append(Paragraph(f"<b>Scheme:</b> {scheme_title}", body_style))
    content.append(Spacer(1, 20))
    
    # Draft letter text
    content.append(Paragraph("Application Letter", heading_style))
    
    draft_text = draft_data.get('draft_text', 'Draft text not available')
    
    # Highlight fields to fill
    fields_to_fill = draft_data.get('fields_to_fill', [])
    highlighted_text = draft_text
    
    for field in fields_to_fill:
        # Replace field placeholders with highlighted versions
        highlighted_text = highlighted_text.replace(
            f"[{field}]", 
            f'<font backcolor="yellow">[{field}]</font>'
        )
        # Also handle common variations
        highlighted_text = highlighted_text.replace(
            field.lower(), 
            f'<font backcolor="yellow">[{field}]</font>'
        )
    
    content.append(Paragraph(highlighted_text, body_style))
    content.append(Spacer(1, 20))
    
    # Fields to fill section
    if fields_to_fill:
        content.append(Paragraph("Fields to Fill Before Submission", heading_style))
        
        fields_table_data = [["Field", "Description"]]
        for field in fields_to_fill:
            field_desc = get_field_description(field)
            fields_table_data.append([f"<b>{field}</b>", field_desc])
        
        fields_table = Table(fields_table_data, colWidths=[2*inch, 3*inch])
        fields_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        content.append(fields_table)
        content.append(Spacer(1, 20))
    
    # Submit to information
    submit_to = draft_data.get('submit_to', 'Government Office')
    content.append(Paragraph("Submit To", heading_style))
    content.append(Paragraph(f"🏛️ {submit_to}", body_style))
    content.append(Spacer(1, 20))
    
    # Important notes
    important_notes = draft_data.get('important_notes', [])
    if important_notes:
        content.append(Paragraph("Important Notes", heading_style))
        
        for note in important_notes:
            content.append(Paragraph(f"⚠️ {note}", highlight_style))
        
        content.append(Spacer(1, 20))
    
    # Footer
    content.append(Spacer(1, 30))
    footer_text = "This is a draft. Visit your nearest office for official submission."
    content.append(Paragraph(footer_text, styles['Normal']))
    
    # Build PDF
    doc.build(content)
    
    # Get PDF bytes
    buffer.seek(0)
    pdf_bytes = buffer.getvalue()
    buffer.close()
    
    return pdf_bytes

def get_field_description(field: str) -> str:
    """Get description for common application fields."""
    descriptions = {
        "Phone number": "Your mobile number for communication",
        "Ward number": "Your local ward/municipal ward number",
        "Bank account number": "Your bank account number for benefit transfer",
        "IFSC code": "Bank branch IFSC code",
        "PAN card": "Permanent Account Number for identity verification",
        "Ration card": "Ration card number for address proof",
        "Voter ID": "Voter identification card number",
        "Email address": "Email for official communications"
    }
    return descriptions.get(field, "Required information for application")
