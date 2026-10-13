"""
Generate a professional, high-impact 16:9 widescreen presentation (PPTX)
for the AI-Powered IT Asset Management & Predictive Hardware Diagnostics project.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

# Initialize Presentation
prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)

# Color Palette Constants
BG_COLOR = RGBColor(15, 23, 42)        # Slate 900 (Deep Navy)
CARD_BG = RGBColor(30, 41, 59)         # Slate 800 (Card background)
CARD_BORDER = RGBColor(51, 65, 85)     # Slate 700 (Border)
TEXT_WHITE = RGBColor(248, 250, 252)   # Slate 50
TEXT_MUTED = RGBColor(148, 163, 184)   # Slate 400
TEXT_BODY = RGBColor(226, 232, 240)    # Slate 200
CYAN_ACCENT = RGBColor(56, 189, 248)   # Sky 400
INDIGO_ACCENT = RGBColor(129, 140, 248)# Indigo 400
GREEN_ACCENT = RGBColor(52, 211, 153)  # Emerald 400
AMBER_ACCENT = RGBColor(251, 191, 36)  # Amber 400
ROSE_ACCENT = RGBColor(251, 113, 133)  # Rose 400

blank_layout = prs.slide_layouts[6] # Blank slide layout

def add_header(slide, title_text, category_text="ENTERPRISE IT ASSET MANAGEMENT"):
    """Adds a standardized top banner and title to a slide"""
    # Background fill
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
    bg.fill.solid()
    bg.fill.fore_color.rgb = BG_COLOR
    bg.line.fill.background()
    
    # Category badge
    cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.4))
    tf_cat = cat_box.text_frame
    tf_cat.word_wrap = True
    p_cat = tf_cat.paragraphs[0]
    p_cat.text = category_text.upper()
    p_cat.font.size = Pt(11)
    p_cat.font.bold = True
    p_cat.font.color.rgb = CYAN_ACCENT
    
    # Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.7), Inches(11.7), Inches(0.7))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    p_title = tf_title.paragraphs[0]
    p_title.text = title_text
    p_title.font.size = Pt(26)
    p_title.font.bold = True
    p_title.font.color.rgb = TEXT_WHITE
    
    # Decorative line under header
    line = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(0.8), Inches(1.45), Inches(11.733), Inches(0.02))
    line.fill.solid()
    line.fill.fore_color.rgb = RGBColor(38, 55, 85)
    line.line.fill.background()

def create_card(slide, left, top, width, height, title, items, badge="", badge_color=CYAN_ACCENT):
    """Draws a rounded dark card with a title, optional badge, and bullet items"""
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_BG
    card.line.color.rgb = CARD_BORDER
    card.line.width = Pt(1)
    
    tb = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.2), width - Inches(0.4), height - Inches(0.4))
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
    
    p_head = tf.paragraphs[0]
    if badge:
        r_badge = p_head.add_run()
        r_badge.text = f"[{badge}] "
        r_badge.font.size = Pt(12)
        r_badge.font.bold = True
        r_badge.font.color.rgb = badge_color
        
    r_title = p_head.add_run()
    r_title.text = title
    r_title.font.size = Pt(17)
    r_title.font.bold = True
    r_title.font.color.rgb = TEXT_WHITE
    p_head.space_after = Pt(12)
    
    for item in items:
        p = tf.add_paragraph()
        p.space_after = Pt(8)
        
        if isinstance(item, tuple):
            lead, body = item
            r1 = p.add_run()
            r1.text = "• " + lead + ": "
            r1.font.bold = True
            r1.font.size = Pt(13)
            r1.font.color.rgb = CYAN_ACCENT
            
            r2 = p.add_run()
            r2.text = body
            r2.font.bold = False
            r2.font.size = Pt(13)
            r2.font.color.rgb = TEXT_BODY
        else:
            r = p.add_run()
            r.text = "• " + item
            r.font.size = Pt(13)
            r.font.color.rgb = TEXT_BODY

# ==============================================================================
# SLIDE 1: TITLE SLIDE
# ==============================================================================
slide1 = prs.slides.add_slide(blank_layout)
bg1 = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
bg1.fill.solid()
bg1.fill.fore_color.rgb = BG_COLOR
bg1.line.fill.background()

# Title accent glow box
glow = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.0), Inches(10.333), Inches(5.5))
glow.fill.solid()
glow.fill.fore_color.rgb = CARD_BG
glow.line.color.rgb = CYAN_ACCENT
glow.line.width = Pt(1.5)

tb_main = slide1.shapes.add_textbox(Inches(2.0), Inches(1.5), Inches(9.333), Inches(4.5))
tf_main = tb_main.text_frame
tf_main.word_wrap = True

p_badge = tf_main.paragraphs[0]
p_badge.alignment = PP_ALIGN.CENTER
r_badge = p_badge.add_run()
r_badge.text = "B.TECH INTERNSHIP PROJECT  •  FULL-STACK & AI SYSTEMS"
r_badge.font.size = Pt(12)
r_badge.font.bold = True
r_badge.font.color.rgb = CYAN_ACCENT
p_badge.space_after = Pt(16)

p_h1 = tf_main.add_paragraph()
p_h1.alignment = PP_ALIGN.CENTER
r_h1 = p_h1.add_run()
r_h1.text = "AI-Powered Enterprise IT Asset Management\n& Predictive Hardware Diagnostics"
r_h1.font.size = Pt(28)
r_h1.font.bold = True
r_h1.font.color.rgb = TEXT_WHITE
p_h1.space_after = Pt(14)

p_sub = tf_main.add_paragraph()
p_sub.alignment = PP_ALIGN.CENTER
r_sub = p_sub.add_run()
r_sub.text = "Proactive Hardware Health Recalibration, Multilingual LLM Assistant & Automated Enterprise Lifecycle System"
r_sub.font.size = Pt(14)
r_sub.font.color.rgb = TEXT_MUTED
p_sub.space_after = Pt(28)

p_pres = tf_main.add_paragraph()
p_pres.alignment = PP_ALIGN.CENTER
r_pres = p_pres.add_run()
r_pres.text = "Presented by: Tushar Mahapatra\n"
r_pres.font.size = Pt(16)
r_pres.font.bold = True
r_pres.font.color.rgb = GREEN_ACCENT

r_tech = p_pres.add_run()
r_tech.text = "Tech Stack: Node.js • Express • Google Gemini 1.5 Flash • Chart.js • Tesseract OCR • Nodemailer\nLive Demo: Deployed on Vercel Serverless"
r_tech.font.size = Pt(12)
r_tech.font.color.rgb = TEXT_MUTED

# ==============================================================================
# SLIDE 2: 1. PROBLEM
# ==============================================================================
slide2 = prs.slides.add_slide(blank_layout)
add_header(slide2, "1. Problem: Challenges in Contemporary IT Hardware Tracking")

w = Inches(3.64)
h = Inches(5.2)
top = Inches(1.7)

create_card(slide2, Inches(0.8), top, w, h, "Fragmented Record-Keeping", [
    ("Spreadsheet Chaos", "Critical enterprise hardware tracked across disconnected Excel/Google Sheets."),
    ("Data Inconsistencies", "Duplicate serial numbers, missing employee assignments, and untracked peripherals."),
    ("Ghost Assets", "Laptops and servers remain on books even after disposal or unrecovered offboarding."),
    ("Manual Overhead", "IT admins spend up to 45 mins manually cataloging every new batch of devices.")
], "PAIN POINT 1", ROSE_ACCENT)

create_card(slide2, Inches(4.84), top, w, h, "Catastrophic Failures", [
    ("Purely Reactive IT", "Zero advance warning before critical SSD, motherboard, or battery breakdown occurs."),
    ("Employee Work Disruption", "Sudden device failure stalls developer/executive productivity for 3–5 days."),
    ("Rush Procurement", "Forced emergency replacements at premium retail prices with no repair triage."),
    ("Zero RUL Visibility", "No scientific Remaining Useful Life (RUL) metrics computed for aging hardware.")
], "PAIN POINT 2", ROSE_ACCENT)

create_card(slide2, Inches(8.88), top, w, h, "Manual Ingestion & Triage", [
    ("Tedious Paper Ingestion", "Manual typing of complex tax invoices, vendors, warranty terms, and MAC addresses."),
    ("Inconsistent Damage Triage", "Technicians lack standardized root-cause diagnostic guides for physical incidents."),
    ("Financial Leakage", "Missed OEM warranty claims and inaccurate depreciation book valuation."),
    ("No Audit Trail", "Absence of timestamped email/SMS acknowledgments for allocated hardware.")
], "PAIN POINT 3", ROSE_ACCENT)

# ==============================================================================
# SLIDE 3: 2. WHY THE PROBLEM MATTERS
# ==============================================================================
slide3 = prs.slides.add_slide(blank_layout)
add_header(slide3, "2. Why the Problem Matters: Impact on Cost, Security & Ops")

# 4 Quadrants
qw = Inches(5.66)
qh = Inches(2.45)

create_card(slide3, Inches(0.8), Inches(1.7), qw, qh, "Severe Financial Leakage", [
    ("Ghost Asset Carrying Cost", "Enterprises pay 15–20% excess in software licenses & support on lost/untracked hardware."),
    ("Expired Warranty Losses", "Organizations pay full out-of-pocket OEM repair bills due to missed 30-day warranty expiry windows."),
    ("Inaccurate Balance Sheets", "Without automated Double-Declining depreciation, tax reporting and asset write-offs are flawed.")
], "CAPITAL DRAIN", AMBER_ACCENT)

create_card(slide3, Inches(6.86), Inches(1.7), qw, qh, "Unplanned Downtime & Productivity Loss", [
    ("High Developer Idle Time", "Engineers lose 20+ billable hours waiting for replacement machine provisioning."),
    ("Client Deliverable Delays", "Critical hardware failures during sprints trigger missed SLAs and customer dissatisfaction."),
    ("IT Helpdesk Burnout", "Technicians are overwhelmed by firefighting emergency hardware tickets instead of strategic work.")
], "OPERATIONAL RISK", AMBER_ACCENT)

create_card(slide3, Inches(0.8), Inches(4.45), qw, qh, "Safety Hazards & Hardware Risks", [
    ("Lithium Battery Swelling", "Unmonitored laptop batteries expand, posing thermal runaway, fire, and chassis cracking hazards."),
    ("Motherboard Short Circuits", "Unreported minor fluid ingress corrodes PMIC circuitry, turning fixable units into total write-offs."),
    ("Thermal Throttling", "Degraded thermal paste causes severe CPU degradation and hardware life halving.")
], "SAFETY & COMPLIANCE", ROSE_ACCENT)

create_card(slide3, Inches(6.86), Inches(4.45), qw, qh, "Corporate Compliance & Audit Failures", [
    ("Audit Discrepancies", "Failure to produce complete asset custodial logs during ISO/SOC2 enterprise audits."),
    ("Data Leakage Risk", "Unrecovered laptops during employee resignation leave corporate IP and customer data vulnerable."),
    ("Lack of Proof of Delivery", "Disputes between staff and HR regarding device receipt without timestamped notification logs.")
], "LEGAL & SECURITY", ROSE_ACCENT)

# ==============================================================================
# SLIDE 4: 3. PROPOSED SOLUTION
# ==============================================================================
slide4 = prs.slides.add_slide(blank_layout)
add_header(slide4, "3. Proposed Solution: The Intelligent Asset Management Platform")

w3 = Inches(3.64)
h3 = Inches(5.2)

create_card(slide4, Inches(0.8), top, w3, h3, "1. Proactive Predictive AI", [
    ("Multi-Factor Health Modeling", "Dynamic 0–100% health score continuously computed based on age, category stress, and warranty."),
    ("Remaining Useful Life (RUL)", "Accurate algorithmic forecasting of operational months remaining before EOL."),
    ("Failure Probability %", "Categorizes assets into Low, Moderate, High, and Critical risk tiers."),
    ("Actionable Directives", "Automated alerts for thermal repasting, battery recalibration, and preventive service.")
], "PREDICTIVE CORE", GREEN_ACCENT)

create_card(slide4, Inches(4.84), top, w3, h3, "2. Incident Triage & Damage AI", [
    ("Interactive Damage Reporting", "Standardized incident intake across Display, Power, Chassis, Ports, Fluid, and Storage."),
    ("Real-Time Recalibration", "Instant comparison of Prior vs. Post-Incident health scores (e.g. 85% -> 52%)."),
    ("Root Cause Mechanism", "AI identifies internal failure mechanisms (e.g., solder micro-fracture, PMIC overvoltage)."),
    ("Safety & Cost Estimation", "Identifies fire hazards and estimates OEM repair expenses in Indian Rupees (₹ INR).")
], "SMART DIAGNOSTICS", CYAN_ACCENT)

create_card(slide4, Inches(8.88), top, w3, h3, "3. Zero-Friction Enterprise Ops", [
    ("Invoice OCR Scanner", "Client-side Tesseract.js WASM engine extracts serial, vendor, and price directly from invoices."),
    ("Automated SMTP & SMS", "1-click employee allocation dispatches professional transactional emails via Nodemailer."),
    ("AssetBot Bilingual LLM", "Bilingual (English/Hindi) assistant with strict guardrails backed by Gemini 1.5 Flash."),
    ("Audit-Ready PDF Exports", "One-click landscape PDF generation formatted with tables, badges, and financial depreciation.")
], "AUTOMATION SUITE", INDIGO_ACCENT)

# ==============================================================================
# SLIDE 5: 4. HOW YOUR SYSTEM WORKS
# ==============================================================================
slide5 = prs.slides.add_slide(blank_layout)
add_header(slide5, "4. How Your System Works: End-to-End Operational Workflow")

flow_w = Inches(2.7)
flow_h = Inches(5.2)

create_card(slide5, Inches(0.8), top, flow_w, flow_h, "Stage 1: Ingestion", [
    ("Invoice Upload", "IT staff uploads hardware purchase invoice (PNG/JPG)."),
    ("Client-side OCR", "Tesseract.js extracts serial numbers, pricing, and warranty dates."),
    ("Auto-Populate", "Asset master form pre-fills with zero manual typing."),
    ("Catalog Store", "Persisted in atomic DB with initial 100% health baseline.")
], "STEP 01", CYAN_ACCENT)

create_card(slide5, Inches(3.8), top, flow_w, flow_h, "Stage 2: Allocation", [
    ("Employee Matching", "Admin selects asset and assigns to employee (e.g., Aarav Sharma)."),
    ("Specification Check", "Verifies department suitability and warranty status."),
    ("Instant SMTP Email", "Dispatches professional HTML confirmation notice."),
    ("Status Transition", "Status instantly updates from Available to Allocated.")
], "STEP 02", INDIGO_ACCENT)

create_card(slide5, Inches(6.8), top, flow_w, flow_h, "Stage 3: Monitoring", [
    ("Predictive Engine", "Evaluates wear factors, operating hours, and warranty days left."),
    ("Live Health Dashboard", "Interactive Chart.js visualizations track fleet degradation."),
    ("Warranty Alerting", "Flags assets expiring within 30 days or already expired."),
    ("DDB Depreciation", "Calculates monthly book value amortization in ₹ INR.")
], "STEP 03", GREEN_ACCENT)

create_card(slide5, Inches(9.8), top, flow_w, flow_h, "Stage 4: Triage & Recal", [
    ("Incident Intake", "User reports damage with category & severity picker."),
    ("AI Diagnostics", "Diagnoses internal failure and computes new health score."),
    ("Safety Assessment", "Flags battery swelling or electrical short hazards."),
    ("OEM Repair Triage", "Recommends repair vs. scrap with local cost estimate.")
], "STEP 04", AMBER_ACCENT)

# ==============================================================================
# SLIDE 6: 5. AI/ML USED
# ==============================================================================
slide6 = prs.slides.add_slide(blank_layout)
add_header(slide6, "5. AI & Machine Learning Architecture: Hybrid Intelligence")

mw = Inches(5.66)
mh = Inches(2.45)

create_card(slide6, Inches(0.8), Inches(1.7), mw, mh, "Google Gemini 1.5 Flash (Cloud LLM)", [
    ("Sub-Second Inference", "Processes complex multilingual user queries and unstructured hardware defect narratives."),
    ("Bilingual NLP Comprehension", "Native fluency in English, Hindi, and colloquial Hinglish (e.g., 'Kaunse laptops damaged hain?')."),
    ("Strict Scope Guardrails", "Strict system instructions block off-topic prompts (sports, general coding) to ensure enterprise utility.")
], "CLOUD COGNITION", CYAN_ACCENT)

create_card(slide6, Inches(6.86), Inches(1.7), mw, mh, "Deterministic Offline Rule & NLP Engine", [
    ("Zero-Cost Fallback", "Automatically activates if internet is down or Gemini API key is missing—guaranteeing 100% uptime."),
    ("Regex & Keyword Tokenizer", "Parses natural language requests for asset counts, employee allocations, and damaged devices."),
    ("Standardized Diagnostics", "Applies OEM engineering failure matrices for consistent, reproducible incident evaluations.")
], "EDGE RESILIENCE", GREEN_ACCENT)

create_card(slide6, Inches(0.8), Inches(4.45), mw, mh, "Multi-Factor Predictive Health & RUL Model", [
    ("Non-Linear Aging Algorithm", "Calculates wear score combining Age Ratio (current age vs. expected lifecycle) & Category Stress."),
    ("Incident Penalty Multipliers", "Deducts weighted health points based on past damage severity and recurrence frequency."),
    ("Remaining Useful Life (RUL)", "RUL (months) = Expected Lifespan * (Health Score / 100) * Warranty Factor.")
], "MATHEMATICAL ML", INDIGO_ACCENT)

create_card(slide6, Inches(6.86), Inches(4.45), mw, mh, "Financial Depreciation Algorithms", [
    ("Double-Declining Balance (DDB)", "DDB Rate = (2 / Useful Life Years) applied to declining book value for realistic tech asset curves."),
    ("Straight-Line Benchmark", "Computes linear write-off comparison to assist corporate tax planning and salvage projections."),
    ("Fleet Valuation Forecaster", "Live aggregation of ₹21,35,000 total inventory value against current residual book value.")
], "FINANCIAL ML", AMBER_ACCENT)

# ==============================================================================
# SLIDE 7: 6. TECHNOLOGY USED
# ==============================================================================
slide7 = prs.slides.add_slide(blank_layout)
add_header(slide7, "6. Technology Stack: Lightweight, Scalable & Serverless-Ready")

tw = Inches(2.7)
th = Inches(5.2)

create_card(slide7, Inches(0.8), top, tw, th, "Backend & APIs", [
    ("Node.js (v18+)", "High-concurrency asynchronous runtime."),
    ("Express.js v4", "RESTful routing, JSON parsers, and static asset middleware."),
    ("Nodemailer", "Enterprise SMTP transporter for automated allocation receipts."),
    ("Atomic DB (JSON)", "Zero-configuration persistent storage ready for serverless.")
], "BACKEND", CYAN_ACCENT)

create_card(slide7, Inches(3.8), top, tw, th, "Frontend & UI", [
    ("Vanilla ES6+ JS", "Ultra-fast DOM rendering with zero heavy framework bloat."),
    ("Glassmorphic CSS3", "Modern design tokens, responsive cards, and dark/light themes."),
    ("Responsive Grid", "Tailored for desktop laptops, tablets, and mobile field techs."),
    ("Zero Dependencies", "Instant sub-100ms client page load times.")
], "FRONTEND", INDIGO_ACCENT)

create_card(slide7, Inches(6.8), top, tw, th, "AI & Computer Vision", [
    ("Google Gemini 1.5", "Cloud LLM for complex reasoning and natural dialogue."),
    ("Tesseract.js WASM", "Client-side OCR in web workers for instant invoice scanning."),
    ("Custom Heuristic ML", "Offline degradation models & damage diagnostic engine."),
    ("Intent Parsers", "Rule-based bilingual NLP tokenizer.")
], "INTELLIGENCE", GREEN_ACCENT)

create_card(slide7, Inches(9.8), top, tw, th, "Visualization & DevOps", [
    ("Chart.js v4", "Canvas-based live doughnut & gradient degradation charts."),
    ("jsPDF + AutoTable", "Audit-grade landscape PDF report generator."),
    ("GitHub CI/CD", "Automated code synchronization and version control."),
    ("Vercel Hosting", "Zero-cost serverless cloud hosting with global edge CDN.")
], "DEVOPS & ANALYTICS", AMBER_ACCENT)

# ==============================================================================
# SLIDE 8: 7. SCREENSHOTS & LIVE DEMO
# ==============================================================================
slide8 = prs.slides.add_slide(blank_layout)
add_header(slide8, "7. System Demo: Interactive User Interface & AI Dashboards")

img_top = Inches(1.65)
img_w = Inches(5.6)
img_h = Inches(2.65)

# Image 1: Home Dashboard
card_img1 = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), img_top, Inches(5.7), Inches(2.75))
card_img1.fill.solid()
card_img1.fill.fore_color.rgb = CARD_BG
card_img1.line.color.rgb = CYAN_ACCENT

img_p1 = "screenshots/01_home_dashboard.png"
if os.path.exists(img_p1):
    slide8.shapes.add_picture(img_p1, Inches(0.85), img_top + Inches(0.05), img_w, img_h)

tb_l1 = slide8.shapes.add_textbox(Inches(0.8), img_top + Inches(2.78), Inches(5.7), Inches(0.3))
p_l1 = tb_l1.text_frame.paragraphs[0]
p_l1.text = "Figure 1: Main Executive Dashboard & Asset Inventory Table"
p_l1.font.size = Pt(11)
p_l1.font.bold = True
p_l1.font.color.rgb = CYAN_ACCENT

# Image 2: ML Damage Diagnostic Result
card_img2 = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.83), img_top, Inches(5.7), Inches(2.75))
card_img2.fill.solid()
card_img2.fill.fore_color.rgb = CARD_BG
card_img2.line.color.rgb = AMBER_ACCENT

img_p2 = "screenshots/03_ml_damage_diagnostic_result.png"
if os.path.exists(img_p2):
    slide8.shapes.add_picture(img_p2, Inches(6.88), img_top + Inches(0.05), img_w, img_h)

tb_l2 = slide8.shapes.add_textbox(Inches(6.83), img_top + Inches(2.78), Inches(5.7), Inches(0.3))
p_l2 = tb_l2.text_frame.paragraphs[0]
p_l2.text = "Figure 2: Real-Time AI Hardware Damage Recalibration & Triage Card"
p_l2.font.size = Pt(11)
p_l2.font.bold = True
p_l2.font.color.rgb = AMBER_ACCENT

# Image 3: Predictive Fleet Health
card_img3 = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(4.7), Inches(5.7), Inches(2.4))
card_img3.fill.solid()
card_img3.fill.fore_color.rgb = CARD_BG
card_img3.line.color.rgb = GREEN_ACCENT

img_p3 = "screenshots/06_predictive_fleet_health.png"
if os.path.exists(img_p3):
    slide8.shapes.add_picture(img_p3, Inches(0.85), Inches(4.75), img_w, Inches(2.3))

tb_l3 = slide8.shapes.add_textbox(Inches(0.8), Inches(7.12), Inches(5.7), Inches(0.3))
p_l3 = tb_l3.text_frame.paragraphs[0]
p_l3.text = "Figure 3: Multi-Factor Predictive Health & RUL Degradation Gauges"
p_l3.font.size = Pt(11)
p_l3.font.bold = True
p_l3.font.color.rgb = GREEN_ACCENT

# Image 4: AssetBot AI Chatbot
card_img4 = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(6.83), Inches(4.7), Inches(5.7), Inches(2.4))
card_img4.fill.solid()
card_img4.fill.fore_color.rgb = CARD_BG
card_img4.line.color.rgb = INDIGO_ACCENT

img_p4 = "screenshots/09_assetbot_ai_chatbot.png"
if os.path.exists(img_p4):
    slide8.shapes.add_picture(img_p4, Inches(6.88), Inches(4.75), img_w, Inches(2.3))

tb_l4 = slide8.shapes.add_textbox(Inches(6.83), Inches(7.12), Inches(5.7), Inches(0.3))
p_l4 = tb_l4.text_frame.paragraphs[0]
p_l4.text = "Figure 4: AssetBot Bilingual Conversational AI Assistant with Guardrails"
p_l4.font.size = Pt(11)
p_l4.font.bold = True
p_l4.font.color.rgb = INDIGO_ACCENT

# ==============================================================================
# SLIDE 9: 8. RESULTS
# ==============================================================================
slide9 = prs.slides.add_slide(blank_layout)
add_header(slide9, "8. Results & Empirical Outcomes: Measurable Performance")

rw = Inches(2.7)
rh = Inches(5.2)

create_card(slide9, Inches(0.8), top, rw, rh, "90% Faster Ingestion", [
    ("Client OCR Speed", "Reduces invoice entry from ~8 minutes manual typing to <10 seconds automated OCR extraction."),
    ("High Field Accuracy", "Correctly extracts serial number, purchase price, vendor, and warranty dates."),
    ("Zero Typo Errors", "Eliminates duplicate or erroneous serial numbers on the company balance sheet.")
], "EFFICIENCY", CYAN_ACCENT)

create_card(slide9, Inches(3.8), top, rw, rh, "100% System Uptime", [
    ("Hybrid Resiliency", "Zero downtime during internet disconnects or API rate limits via local offline rule engine fallback."),
    ("Sub-150ms Response", "Instant local heuristic calculations for health scores, depreciation, and allocations."),
    ("Zero Cloud Cost", "Runs efficiently on free serverless cloud tiers with zero continuous billing.")
], "RELIABILITY", GREEN_ACCENT)

create_card(slide9, Inches(6.8), top, rw, rh, "Proactive Triage", [
    ("Instant Diagnostics", "Recalibrates health score immediately upon defect submission with internal mechanism analysis."),
    ("Safety Protection", "100% of swelling battery and thermal short risks flagged before hardware burns out."),
    ("Cost Estimation", "Provides repair estimates in ₹ INR to prevent vendor overcharging.")
], "DIAGNOSTICS", AMBER_ACCENT)

create_card(slide9, Inches(9.8), top, rw, rh, "Enterprise Ready", [
    ("Real Indian Fleet", "20 active high-end devices and 16 employee allocations across Bengaluru, Mumbai, Pune, Delhi."),
    ("Full Audit Trail", "Complete historical logs of damage, email dispatches, and device return receipts."),
    ("Landscape PDF Export", "Executive audit reports generated with single click formatted for management review.")
], "SCALE", INDIGO_ACCENT)

# ==============================================================================
# SLIDE 10: 9. BENEFITS
# ==============================================================================
slide10 = prs.slides.add_slide(blank_layout)
add_header(slide10, "9. Benefits: Enterprise Value Proposition")

bw = Inches(3.64)
bh = Inches(5.2)

create_card(slide10, Inches(0.8), top, bw, bh, "Financial Benefits", [
    ("Eliminates Ghost Assets", "Stops paying unnecessary software licenses and asset tax on retired machines (~15% savings)."),
    ("Maximizes Warranty Value", "Alerts admins 30 days before warranty expiry to claim free OEM repairs before expiration."),
    ("Optimized Capex Budgeting", "Double-declining depreciation provides accurate future hardware replacement capital requirements."),
    ("Prevents Overcharging", "AI repair cost benchmarking protects against inflated vendor servicing quotes.")
], "FINANCIAL ROI", GREEN_ACCENT)

create_card(slide10, Inches(4.84), top, bw, bh, "Operational Benefits", [
    ("Zero Emergency Disruptions", "Predictive RUL allows scheduling laptop replacements weeks before catastrophic breakdown."),
    ("1-Click Automated Workflows", "Instant employee assignment accompanied by professional transactional HTML emails."),
    ("Standardized Defect Triage", "Junior technicians get expert-level diagnostic guidance and safety hazard flags."),
    ("Bilingual Voice & Text AI", "Non-technical managers can query fleet status in natural Hindi or English anytime.")
], "OPERATIONAL EXCELLENCE", CYAN_ACCENT)

create_card(slide10, Inches(8.88), top, bw, bh, "Security & Compliance", [
    ("Full Custodial Accountability", "Exact timestamped record of which employee holds which asset serial and MAC address."),
    ("Offboarding Security", "Guarantees company-owned devices and sensitive data are recovered upon employee resignation."),
    ("Audit-Grade Reporting", "Instant PDF reports with table grids ready for ISO 27001, SOC 2, and financial auditors."),
    ("Workplace Safety", "Isolates expanding lithium batteries and shorted chargers to protect employee physical safety.")
], "GOVERNANCE & SAFETY", INDIGO_ACCENT)

# ==============================================================================
# SLIDE 11: 10. FUTURE SCOPE
# ==============================================================================
slide11 = prs.slides.add_slide(blank_layout)
add_header(slide11, "10. Future Scope & Roadmap: Next Horizons")

fw = Inches(3.64)
fh = Inches(5.2)

create_card(slide11, Inches(0.8), top, fw, fh, "1. Mobile QR / Barcode App", [
    ("Physical Equipment Tagging", "Auto-generate dynamic 2D QR codes and barcodes for all physical hardware chassis."),
    ("Mobile Camera Scanner", "PWA mobile scanner for IT warehouse staff to audit 100+ physical assets in minutes."),
    ("Instant Check-in / Check-out", "Employees scan QR code with smartphone to acknowledge physical pickup or return."),
    ("Physical Audit Verification", "Geotagged physical inventory audits to eliminate location mismatches.")
], "HARDWARE TAGGING", CYAN_ACCENT)

create_card(slide11, Inches(4.84), top, fw, fh, "2. Live Hardware Telemetry", [
    ("OS Background Agent", "Lightweight daemon for Windows, macOS, and Linux streaming live diagnostic telemetry."),
    ("Battery Health Telemetry", "Real-time battery cycle count, design capacity degradation, and temperature monitoring."),
    ("SSD SMART Health", "Proactive alerts on SSD bad sectors, reallocated blocks, and high operating temperatures."),
    ("Thermal Profiling", "Flags CPU throttling to trigger fan cleaning and thermal paste reapplication.")
], "IOT TELEMETRY", GREEN_ACCENT)

create_card(slide11, Inches(8.88), top, fw, fh, "3. Enterprise RBAC & ERP", [
    ("Role-Based Access Control", "JWT authentication with Granular Roles (Super Admin, IT Tech, HR Manager, Employee, Auditor)."),
    ("HRMS Integration", "Native webhooks syncing with Workday, BambooHR, and SAP SuccessFactors for automated offboarding."),
    ("ITSM Integration", "Direct integration with Jira Service Management and ServiceNow for automatic ticket creation."),
    ("Procurement Workflow", "Multi-stage purchase request approvals with automated vendor purchase order generation.")
], "ENTERPRISE INTEGRATION", INDIGO_ACCENT)

# ==============================================================================
# SLIDE 12: CONCLUSION & Q&A
# ==============================================================================
slide12 = prs.slides.add_slide(blank_layout)
bg12 = slide12.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
bg12.fill.solid()
bg12.fill.fore_color.rgb = BG_COLOR
bg12.line.fill.background()

card12 = slide12.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.0), Inches(10.333), Inches(5.5))
card12.fill.solid()
card12.fill.fore_color.rgb = CARD_BG
card12.line.color.rgb = GREEN_ACCENT
card12.line.width = Pt(1.5)

tb12 = slide12.shapes.add_textbox(Inches(2.0), Inches(1.5), Inches(9.333), Inches(4.5))
tf12 = tb12.text_frame
tf12.word_wrap = True

p_c1 = tf12.paragraphs[0]
p_c1.alignment = PP_ALIGN.CENTER
r_c1 = p_c1.add_run()
r_c1.text = "CONCLUSION & DEMO SUMMARY"
r_c1.font.size = Pt(13)
r_c1.font.bold = True
r_c1.font.color.rgb = CYAN_ACCENT
p_c1.space_after = Pt(14)

p_c2 = tf12.add_paragraph()
p_c2.alignment = PP_ALIGN.CENTER
r_c2 = p_c2.add_run()
r_c2.text = "AI-Driven Lifecycle Tracking Redefining IT Operations"
r_c2.font.size = Pt(26)
r_c2.font.bold = True
r_c2.font.color.rgb = TEXT_WHITE
p_c2.space_after = Pt(16)

p_c3 = tf12.add_paragraph()
p_c3.alignment = PP_ALIGN.CENTER
r_c3 = p_c3.add_run()
r_c3.text = "A production-tested synthesis of Full-Stack Web Architecture, Predictive Hardware Degradation Models, and Generative AI—built to eliminate downtime and prevent enterprise hardware capital leakage."
r_c3.font.size = Pt(14)
r_c3.font.color.rgb = TEXT_BODY
p_c3.space_after = Pt(28)

p_c4 = tf12.add_paragraph()
p_c4.alignment = PP_ALIGN.CENTER
r_c4 = p_c4.add_run()
r_c4.text = "GitHub Repository: https://github.com/tusharmahapatra1234-ship-it/-IT-Asset-Management\n"
r_c4.font.size = Pt(13)
r_c4.font.color.rgb = CYAN_ACCENT

r_c5 = p_c4.add_run()
r_c5.text = "Developer: Tushar Mahapatra  •  Open for Questions & Viva Discussion"
r_c5.font.size = Pt(15)
r_c5.font.bold = True
r_c5.font.color.rgb = GREEN_ACCENT

output_path = "IT_Asset_Management_Presentation.pptx"
prs.save(output_path)
print(f"Presentation successfully created and saved to {output_path}")
