"""
Build a small review workbook for leadership from the full synthetic dataset.
Calls and orders: September 2026 only (the last full month before 'today', 20 October 2026).
Run after generate_synthetic_data.py:  python scripts/build_review_pack.py
"""
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
CSV = ROOT / "Data" / "csv"
OUT = ROOT / "Data" / "review" / "Optus_Telesales_Synthetic_Data_v1_REVIEW.xlsx"

def rd(name):
    return pd.read_csv(CSV / f"{name}.csv", dtype=str, keep_default_na=False, na_values=[""])

calls_all = rd("Telesales_Calls_Fact")
orders_all = rd("Sales_Orders")
calls = calls_all[calls_all.Month == "2026-09"]      # the last full month before "today" (20 Oct 2026)
orders = orders_all[orders_all.Month == "2026-09"]
elevate = rd("Elevate_Audits"); elevate = elevate[elevate.Call_Date.str.startswith("2026-09")]
fcr = rd("FCR_Audits"); fcr = fcr[fcr.Call_Date.str.startswith("2026-09")]

# --- Summary: what the data shows against the Optus / Concentrix figures --------------------------
n = len(calls)
cat = orders.Sales_Category.value_counts()
new = cat.reindex(["Postpaid Voice - New Connection", "Total Home - New Connection",
                   "Connected Device - New Connection"]).fillna(0).sum()
locked = calls_all[(calls_all.FCR_Locked_Flag == "Y") & (calls_all.FCR_Flag != "N/A")]
fo = locked.FCR_Outcome.value_counts(normalize=True) * 100
lost = calls_all[calls_all.Lost_Sale_Flag == "Y"].Lost_Sale_Driver.value_counts(normalize=True) * 100
jarvis_pts = ((calls_all.Jarvis_Error_Flag == "Y") & (calls_all.Lost_Sale_Flag == "Y")).mean() * 100
wk_calls = calls_all.groupby("Week_Ending").size()
wk = orders_all.groupby(["Week_Ending", "Sales_Category"]).size().unstack(fill_value=0)
def wconv(we, catname):
    return round(wk.loc[we, catname] / wk_calls[we] * 100, 2)
mtd = calls_all[calls_all.Month == "2026-10"]
mtd_new = orders_all[(orders_all.Month == "2026-10") & orders_all.Sales_Category.str.endswith("New Connection")].shape[0]

rows = [
    ("Today (Tue 20 Oct 2026): October new sales conversion so far %", round(mtd_new / len(mtd) * 100, 1), "4.0 MTD", "Sales Conversion slide (MTD vs 5.4% target)"),
    ("September calls handled", n, "about 16,000 a month (derived)", "Worked back from Optus's October sales and the slide conversion"),
    ("September new sales conversion %", round(new / n * 100, 1), "4.0 (8-week average)", "Sales Conversion slide"),
]
for we, label, pv, home in [("2026-09-11", "WE1109", 0.6, 4.5), ("2026-09-18", "WE1809", 0.9, 2.4), ("2026-09-25", "WE2509", 1.2, 2.7)]:
    rows += [(f"{label} Postpaid Voice new connection conversion %", wconv(we, "Postpaid Voice - New Connection"), str(pv), "Sales Conversion slide"),
             (f"{label} Home new connection conversion %", wconv(we, "Total Home - New Connection"), str(home), "Sales Conversion slide")]
rows += [
    ("FCR achieved % (whole year, locked)", round(fo.get("Achieved", 0), 1), "about 42", "FCR slide"),
    ("Repeat only %", round(fo.get("Repeat", 0), 1), "about 31", "FCR slide"),
    ("Transfer only %", round(fo.get("Transfer", 0), 1), "about 18", "FCR slide"),
    ("Transfer & repeat %", round(fo.get("Transfer & Repeat", 0), 1), "about 8", "FCR slide"),
    ("Lost sales - Customer driver %", round(lost.get("Customer", 0), 1), "43.3", "Michelle's email"),
    ("Lost sales - People driver %", round(lost.get("People", 0), 1), "25.8", "Michelle's email"),
    ("Lost sales - System error driver %", round(lost.get("System", 0), 1), "30.9", "Review meeting: the remaining share is system error"),
    ("Conversion lost to Jarvis errors (pts)", round(jarvis_pts, 2), "0.6", "Michelle's email / Sales Conversion slide"),
]
summary = pd.DataFrame(rows, columns=["Measure", "In the synthetic data", "Optus / Concentrix figure", "Source"])

readme = pd.DataFrame({"About this file": [
    "LensS Telesales for Optus - synthetic demo data, version 1 (for review).",
    "All calls, sales and audits here are synthetic. Consultant names are the real roster from the FCR file; team lead names are synthetic. All figures are synthetic. Customer IDs are synthetic.",
    "It is shaped to match what Optus and our TLs shared: Michelle's email and plan sheet, the FCR audit file, and the FCR and Sales Conversion slides.",
    "The full dataset covers 1 Nov 2025 to Tue 20 Oct 2026 ('today' in the demo: leaders review with 11 days left in the month): about 182,000 calls and 13,300 sales. To keep this file small, the call, sales and audit sheets show September 2026, the last full month.",
    "Sheets: Summary (our numbers vs Optus's), Questions (with the answers from the review meeting), Calls_Sep2026, Sales_Sep2026, Product_Catalog, Consultants, Targets, Quality_Audits_Sep2026, FCR_Audits_Sep2026, Data_Dictionary, Scenarios, Sample_Questions.",
    "Each call row shows the reason for the call, its result, whether it sold, and why a sale was lost (Customer / People / System). It also shows Jarvis errors, cross-sell, transfers and repeat calls.",
    "Placeholder values (some targets, post-promo prices, Connected Device plans, the smaller transfer queues' shares) are labelled 'Assumed' and listed in the Questions sheet.",
    "Updated after the review meeting: call results are Sale / Callback / No Answer / Rejected only; cross-sell starts in August 2026 (new, consultants in training); October Home new connections follow the slide; lost-sale drivers are Customer / People / System; transfers use Optus's queue list.",
]})

questions = pd.DataFrame([
    (1, "How many calls do we handle a month, and what is conversion measured against?",
     "I've assumed about 16,000 handled calls a month, with conversion measured across all of them. That's what makes October's sales line up with the slide's 4.0% new sales and 3.3% renewals conversion, and it fits the '134 of 3,716 contacts' on the FCR slide.",
     "Michelle's plan sheet (October sales); Sales Conversion slide; FCR slide"),
    (2, "What are our actual targets?",
     "The only target I could confirm is 5.4% new sales conversion. The meeting notes mention 'conversion at 4.2 against a 5.1 target' for mobile, and I'm not sure which measure that is. Renewals, FCR, cross-sell and handle-time targets are placeholders for now.",
     "Sales Conversion slide; meeting minutes email"),
    (3, "For October, should we go by Optus's sales table or the slide?",
     "Michelle's table gives October sales by category. The slide's weekly rates suggest about 10% more Home sales than that. I've used Michelle's table.",
     "Michelle's plan sheet vs Sales Conversion slide"),
    (4, "Can Optus fill the pricing gaps?",
     "The plan screenshots only show promo prices, so I've assumed what customers pay after the promo ends. There's nothing on Connected Device plans (tablets, watches), so those are placeholders. Revenue is the monthly plan price only, with no device repayments. Should device sales count?",
     "Plan screenshots in Michelle's plan sheet"),
    (5, "What call outcomes do we actually record?",
     "The meeting notes list Sale, Callback, No Answer and Rejected. I've added Transferred, Not Eligible, Order Failed (Jarvis), Disconnected and Resolved - No Sale to cover the issues Optus raised. Can we get the real list from the dialler or CRM?",
     "Meeting minutes email; Sales Conversion slide drivers"),
    (6, "When did the revised Elevate form start capturing cross-sell?",
     "The data has cross-sell attempted, effectiveness and reasons for the whole year. If the form changed recently, earlier months should be blank.",
     "Meeting minutes email (quality audits)"),
    (7, "Can we show real team lead names in the demo?",
     "The team shape follows the FCR file (8 TLs, about 71 consultants), but all names are synthetic because Optus asked for anonymised data.",
     "FCR audit file; meeting minutes email"),
    (8, "Is there any other data we can get?",
     "We have no CSAT/tNPS, queue wait times, or data on customers moving to other channels, though the meeting notes mention more callbacks and channel switching.",
     "Meeting minutes email"),
    (9, "Is the People 25.8% / Customer 43.3% split about lost sales or FCR failures?",
     "I've used it as the split of lost sales.",
     "Michelle's email; Sales Conversion slide"),
    (10, "Besides Retention, Service Voice and Service Prepaid, where else do transfers go?",
     "The other destinations and their shares are assumed (Tech Support, Billing, Account Security, Business Sales, Other).",
     "FCR slide"),
], columns=["#", "Question", "What I've assumed for now", "Where it comes from"])
questions["Answer / comments"] = [
    "PENDING: to be confirmed.",
    "CONFIRMED: 5.4% new sales conversion. Other targets stay placeholders.",
    "CONFIRMED: the slide's ~10% higher Home figure is correct. October Total Home new connections now follow the slide (459 for the full month).",
    "DEFERRED.",
    "CONFIRMED: Sale, Callback, No Answer and Rejected are the only outcomes. Call results now use these four; transfers, Jarvis errors and eligibility stay as their own columns.",
    "Cross-sell is still new, consultants under training. Cross-sell now starts in August 2026 and builds month by month; Elevate cross-sell fields are blank before August.",
    "Team lead names stay synthetic. Consultant names come from the FCR file (65 consultants in the same 8 teams). PENDING: confirm real consultant names are fine.",
    "CONFIRMED: no CSAT or NPS.",
    "CONFIRMED: the remaining 30.9% is system error. Drivers are now Customer 43.3% / People 25.8% / System 30.9%.",
    "Queues shared (Retention Voice, Service Voice, Service Prepaid Voice, Tech Assurance, SMB, Hardship, Payment Support, Messaging, 26 in all), now used. PENDING: share per queue.",
]

sheets = {
    "README": readme, "Summary": summary, "Questions": questions,
    "Calls_Sep2026": calls, "Sales_Sep2026": orders, "Product_Catalog": rd("Product_Catalog"),
    "Consultants": rd("Agent_Dim"), "Targets": rd("Targets"),
    "Quality_Audits_Sep2026": elevate, "FCR_Audits_Sep2026": fcr,
    "Data_Dictionary": rd("Data_Dictionary"), "Scenarios": rd("Scenario_Guide"), "Sample_Questions": rd("Sample_BI_Questions"),
}
OUT.parent.mkdir(parents=True, exist_ok=True)
with pd.ExcelWriter(OUT, engine="xlsxwriter") as xw:
    wb = xw.book
    hdr = wb.add_format({"bold": True, "bg_color": "#DDEBF7", "border": 1, "text_wrap": True, "valign": "top"})
    wrap = wb.add_format({"text_wrap": True, "valign": "top"})
    for name, df in sheets.items():
        df.to_excel(xw, sheet_name=name, index=False)
        ws = xw.sheets[name]
        ws.write_row(0, 0, list(df.columns), hdr)
        ws.freeze_panes(1, 0)
        if name in ("README",):
            ws.set_column(0, 0, 140, wrap)
        elif name == "Questions":
            ws.set_column(0, 0, 4); ws.set_column(1, 1, 45, wrap); ws.set_column(2, 2, 70, wrap)
            ws.set_column(3, 3, 40, wrap); ws.set_column(4, 4, 45, wrap)
        elif name == "Summary":
            ws.set_column(0, 0, 48); ws.set_column(1, 2, 24); ws.set_column(3, 3, 55)
        else:
            ws.autofilter(0, 0, len(df), len(df.columns) - 1)
            for c, col in enumerate(df.columns):
                w = df[col].head(200).astype(str).str.len().max() if len(df) else 10
                ws.set_column(c, c, min(55, max(10, len(col) + 2, int(w) + 2)))
print(f"Wrote {OUT} ({OUT.stat().st_size / 1e6:.1f} MB)")
print(summary.to_string(index=False))
