"""
Synthetic data generator for LensS Telesales Intelligence for Optus (v1).

Every call, sale and audit is synthetic. Consultant names and IDs are the real roster from the
Optus FCR file (Optus approved, Nov 2026); team lead names are synthetic (Optus asked us not to
use the real ones). Performance, hire dates and every call are synthetic. Customer IDs are synthetic. Volumes, rates and plan prices are
calibrated to what Optus and Concentrix shared (and confirmed in the review meeting, Nov 2026):
  - TELESALESservices.docx: plan catalogue and prices, October 2026 sales by category
  - image (1).png: weekly FCR (achieved / repeat / transfer / both), transfer destinations
  - image (2).png: weekly new-sales and renewals conversion by product, lost-sale drivers
  - emails.txt: targets, Jarvis impact (0.6 pt), driver split (People 25.8%, Customer 43.3%)
  - FCR as of 101426 (1).xlsx: team shape (8 team leads, about 71 agents), FCR audit fields

Run:  python scripts/generate_synthetic_data.py
Out:  Data/Optus_GenBI_Telesales_Demo_Data_v1.xlsx  and  Data/csv/*.csv
"""
from __future__ import annotations

import datetime as dt
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20261109
rng = np.random.default_rng(SEED)

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "Data"
CSV_DIR = OUT_DIR / "csv"
XLSX = OUT_DIR / "Optus_GenBI_Telesales_Demo_Data_v1.xlsx"

START = dt.date(2025, 11, 1)
END = dt.date(2026, 11, 6)           # last day generated; weeks run Saturday to Friday
# "Today" for the demo: leaders review the dashboard with 11 days left in the month. Everything after the
# cutoff is removed at the end (section 14b), so the history before it stays exactly as calibrated.
CUTOFF = dt.date(2026, 10, 20)       # Tuesday 20 October 2026
DATA_END_TS = pd.Timestamp(END) + pd.Timedelta(hours=23, minutes=59, seconds=59)

# ----------------------------------------------------------------------------------
# 1. Reference data: plan catalogue (from TELESALESservices.docx screenshots)
# ----------------------------------------------------------------------------------
# Price_Source: "Optus plan sheet" where the price is in the document, "Assumed" otherwise.
CATALOG = [
    # code, product_line, plan_name, data/speed, promo_price, promo_months, standard_price,
    # min_cost, modem_term_months, new_services_only, inclusions, price_source
    ("MOB-S-PROMO", "Postpaid Mobile (SIM only)", "Small Promo Plan", "100GB for 12 months, then 60GB", 39, 12, 60, None, None, "Y",
     "No lock-in contract; no excess data charges", "Optus plan sheet"),
    ("MOB-S-CP", "Postpaid Mobile (SIM only)", "Small Choice Plus Plan", "60GB", 60, 0, 60, None, None, "N",
     "No lock-in contract; no excess data charges", "Optus plan sheet"),
    ("MOB-PROMO", "Postpaid Mobile (SIM only)", "Promo Plan", "360GB", 69, 12, 79, None, None, "N",
     "$10/month subscription credit for 12 months; international calls included", "Optus plan sheet (price after 12 months assumed)"),
    ("MOB-M-CP", "Postpaid Mobile (SIM only)", "Medium Choice Plus Plan", "240GB", 70, 0, 70, None, None, "N",
     "Stream videos regularly and call family overseas", "Optus plan sheet"),
    ("MOB-L-CP", "Postpaid Mobile (SIM only)", "Large Choice Plus Plan", "480GB", 90, 0, 90, None, None, "N",
     "$20/month subscription credit while on plan", "Optus plan sheet"),
    ("NBN-25", "NBN", "Basic Plan", "25 Mbps", 73, 12, 83, 379, 24, "N",
     "Ultra WiFi Modem (Gen 2) $0 over 24 months; unlimited data; 4G backup", "Optus plan sheet (price after 12 months assumed)"),
    ("NBN-50", "NBN", "Everyday Plan", "50 Mbps", 87, 12, 97, 393, 24, "N",
     "Ultra WiFi Modem (Gen 2) $0 over 24 months; unlimited data; 4G backup", "Optus plan sheet (price after 12 months assumed)"),
    ("NBN-500", "NBN", "Fast Plan", "500 Mbps (FTTP, HFC)", 89, 12, 99, 395, 24, "N",
     "Ultra WiFi Modem (Gen 2) $0 over 24 months; unlimited data; 4G backup", "Optus plan sheet (price after 12 months assumed)"),
    ("NBN-500-PROMO", "NBN", "Promo Plus Plan", "500 Mbps (FTTP, HFC)", 69, 6, 89, 375, 24, "N",
     "$10/month subscription credit; Ultra WiFi Modem $0 over 24 months; 4G backup", "Optus plan sheet (price after 6 months assumed = Fast Plan)"),
    ("NBN-820", "NBN", "Ultrafast Plan", "820 Mbps (FTTP, HFC)", 119, 12, 129, 425, 24, "N",
     "Ultra WiFi Modem (Gen 2) $0 over 24 months; unlimited data; 4G backup", "Optus plan sheet (price after 12 months assumed)"),
    ("5G-50", "5G Home Internet", "Everyday Plan", "50 Mbps", 59, 12, 69, 527, 36, "N",
     "5G modem $0 over 36 months; unlimited data; 40 Mbps satisfaction guarantee", "Optus plan sheet (price after 12 months assumed)"),
    ("5G-93", "5G Home Internet", "Fast Plan", "93 Mbps", 69, 12, 79, 537, 36, "N",
     "5G modem $0 over 36 months; unlimited data; 50 Mbps satisfaction guarantee", "Optus plan sheet (price after 12 months assumed)"),
    ("5G-93-PROMO", "5G Home Internet", "Promo Plan", "93 Mbps", 45, 6, 69, 513, 36, "N",
     "$10/month subscription credit; 5G modem $0 over 36 months", "Optus plan sheet (price after 6 months assumed = Fast Plan)"),
    ("5G-230", "5G Home Internet", "Superfast Plan", "230 Mbps", 89, 12, 99, 557, 36, "N",
     "5G modem $0 over 36 months; uncapped speed; Netflix included", "Optus plan sheet (price after 12 months assumed)"),
    ("4G-15", "4G Home Internet", "Everyday Basic 4G Plan", "15 Mbps", 49, 12, 59, 265, 24, "N",
     "Plug & play 4G modem $0 over 24 months; unlimited data", "Optus plan sheet"),
    ("CD-WATCH", "Connected Device", "Smartwatch Plan", "Shares mobile number", 10, 0, 10, None, None, "N",
     "Placeholder: no connected-device plans were supplied", "Assumed"),
    ("CD-TAB-30", "Connected Device", "Tablet Data Plan 30GB", "30GB", 35, 0, 35, None, None, "N",
     "Placeholder: no connected-device plans were supplied", "Assumed"),
    ("CD-TAB-100", "Connected Device", "Tablet Data Plan 100GB", "100GB", 45, 0, 45, None, None, "N",
     "Placeholder: no connected-device plans were supplied", "Assumed"),
]
CAT_COLS = ["Plan_Code", "Product_Line", "Plan_Name", "Data_or_Speed", "Promo_Monthly_Price", "Promo_Months",
            "Standard_Monthly_Price", "Minimum_Cost", "Modem_Term_Months", "New_Services_Only", "Inclusions", "Price_Source"]
catalog = pd.DataFrame(CATALOG, columns=CAT_COLS)
PRICE = catalog.set_index("Plan_Code")

# Optus's five reporting categories (TELESALESservices.docx tables)
CATS = ["Postpaid Voice - New Connection", "Postpaid Voice - Renewal", "Total Home - New Connection",
        "Home - Renewal", "Connected Device - New Connection"]
PV_NC, PV_RN, HM_NC, HM_RN, CD_NC = CATS

PLAN_MIX = {
    PV_NC: (["MOB-S-PROMO", "MOB-S-CP", "MOB-PROMO", "MOB-M-CP", "MOB-L-CP"], [0.36, 0.08, 0.30, 0.12, 0.14]),
    PV_RN: (["MOB-S-CP", "MOB-PROMO", "MOB-M-CP", "MOB-L-CP"], [0.24, 0.32, 0.24, 0.20]),
    HM_NC: (["NBN-25", "NBN-50", "NBN-500", "NBN-500-PROMO", "NBN-820", "5G-50", "5G-93", "5G-93-PROMO", "5G-230", "4G-15"],
            [0.06, 0.20, 0.13, 0.18, 0.09, 0.06, 0.06, 0.08, 0.05, 0.09]),
    HM_RN: (["NBN-25", "NBN-50", "NBN-500", "NBN-820", "5G-50", "5G-93", "5G-230", "4G-15"],
            [0.10, 0.30, 0.20, 0.10, 0.08, 0.10, 0.05, 0.07]),
    CD_NC: (["CD-WATCH", "CD-TAB-30", "CD-TAB-100"], [0.45, 0.35, 0.20]),
}

# ----------------------------------------------------------------------------------
# 2. Calibration targets
# ----------------------------------------------------------------------------------
# October 2026 sales from TELESALESservices.docx (hit exactly). Total Home new connections follow the
# slide instead: Optus confirmed its weekly rates (about 10% above the table's 417) are correct.
OCT_TARGET = {CD_NC: 27, HM_RN: 202, HM_NC: 459, PV_NC: 186, PV_RN: 329}
# Cross-sell is new (consultants still in training): it starts in August 2026 and builds up.
XSELL_START = dt.date(2026, 8, 1)
XSELL_RAMP = {"2026-08": 0.75, "2026-09": 1.0, "2026-10": 1.12, "2026-11": 1.15}

# Weekly conversion (% of handled calls) from image (2).png, week ending Friday
WEEKLY_CONV = {  # week_end: (PV NC, Home NC, PV Ren, Home Ren)
    "2026-09-11": (0.60, 4.50, 1.30, 1.70),
    "2026-09-18": (0.90, 2.40, 1.30, 1.40),
    "2026-09-25": (1.20, 2.70, 2.10, 1.20),
    "2026-10-02": (1.20, 2.40, 1.90, 1.00),
    "2026-10-09": (1.20, 3.00, 2.50, 1.50),
    "2026-10-16": (1.10, 3.00, 2.50, 1.20),
    "2026-10-23": (1.00, 2.80, 1.90, 1.00),
    "2026-10-30": (1.40, 2.60, 2.20, 0.80),
}
# Weekly FCR mix from image (1).png: achieved, repeat only, transfer only, transfer & repeat
WEEKLY_FCR = {
    "2026-09-11": (42.4, 33.0, 18.0, 6.6), "2026-09-18": (44.8, 32.6, 14.5, 8.1),
    "2026-09-25": (43.0, 31.4, 17.6, 8.1), "2026-10-02": (41.9, 30.7, 18.5, 8.9),
    "2026-10-09": (39.6, 30.9, 20.1, 9.4), "2026-10-16": (40.8, 29.5, 20.5, 9.2),
    "2026-10-23": (41.7, 28.7, 21.0, 8.6), "2026-10-30": (41.7, 29.0, 21.5, 8.4),  # locked-equivalent
}
# Monthly handled-call volume (about 16k gives the October slide figures)
MONTH_VOL = {(2025, 11): 15800, (2025, 12): 17400, (2026, 1): 14600, (2026, 2): 14200, (2026, 3): 15400,
             (2026, 4): 14900, (2026, 5): 15200, (2026, 6): 16300, (2026, 7): 15100, (2026, 8): 15300,
             (2026, 9): 16900, (2026, 10): 16100, (2026, 11): 16300}
# Baseline conversion % by month before the slide weeks (PV NC, Home NC, PV Ren, Home Ren, CD NC)
BASE_CONV = {(2025, 11): (0.95, 3.10, 1.80, 1.40), (2025, 12): (1.25, 3.30, 2.10, 1.30), (2026, 1): (0.85, 2.90, 1.60, 1.30),
             (2026, 2): (0.90, 2.80, 1.70, 1.35), (2026, 3): (0.95, 3.00, 1.75, 1.40), (2026, 4): (0.90, 2.85, 1.70, 1.30),
             (2026, 5): (0.95, 2.90, 1.80, 1.35), (2026, 6): (1.10, 3.20, 2.00, 1.45), (2026, 7): (0.90, 2.80, 1.70, 1.30),
             (2026, 8): (0.95, 2.95, 1.80, 1.35), (2026, 9): (1.05, 2.90, 1.90, 1.30), (2026, 10): (1.15, 2.80, 2.20, 1.10),
             (2026, 11): (1.30, 2.70, 2.10, 1.10)}
CD_CONV = 0.17

# ----------------------------------------------------------------------------------
# 3. Agents and team leads (fictional names, team sizes from the FCR file)
# ----------------------------------------------------------------------------------
FIRST = ["Aira", "Bea", "Carlo", "Dana", "Enzo", "Faye", "Gab", "Hana", "Ivan", "Jules", "Kai", "Lia", "Marco", "Nina",
         "Owen", "Pia", "Quin", "Rhea", "Sam", "Tess", "Uri", "Vince", "Wren", "Xia", "Yna", "Zed", "Abby", "Ben",
         "Cass", "Drew", "Elle", "Finn", "Gwen", "Hugo", "Isla", "Jon", "Kris", "Lou", "Mia", "Noel", "Ola", "Paolo",
         "Rafa", "Sky", "Toni", "Val", "Wes", "Yuri", "Zoe", "Ali", "Bryn", "Cleo", "Dex", "Eve", "Gio", "Hal", "Ines",
         "Joy", "Kit", "Lex", "Moe", "Nat", "Ria", "Seb", "Tim", "Una", "Vic", "Will", "Yas", "Ana", "Bo", "Cyd"]
LAST = ["Alcaraz", "Belmonte", "Cabrera", "Dizon", "Estrada", "Fajardo", "Garcia", "Herrera", "Ilagan", "Javier",
        "Katigbak", "Lacson", "Mendoza", "Navarro", "Ocampo", "Padilla", "Quiambao", "Ramos", "Santos", "Tolentino",
        "Umali", "Valdez", "Wong", "Yap", "Zamora", "Aquino", "Bautista", "Castillo", "Domingo", "Evangelista",
        "Flores", "Gonzaga", "Hidalgo", "Infante", "Jimenez", "Lim", "Morales", "Nolasco", "Ortega", "Pascual",
        "Reyes", "Salazar", "Torres", "Villanueva"]
FCR_FILE = ROOT / "FCR as of 101426 (1).xlsx"

def load_roster():
    """Team leads and consultants (name, ID) from the RAW sheet of the Optus FCR file. A consultant
    listed under more than one team lead goes to the one with most of their rows."""
    import re, warnings
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        raw = pd.read_excel(FCR_FILE, sheet_name="RAW", dtype=str)
    raw = raw.dropna(subset=["Agent", "Team Lead"])
    rows = []
    for ag, tl in zip(raw.Agent, raw["Team Lead"]):
        first = str(ag).split(",")[0].strip()
        m = re.match(r"^(.*?)\s*\((\d+)", first)
        if m:
            rows.append((m.group(1).strip(), m.group(2), str(tl).strip()))
    r = pd.DataFrame(rows, columns=["name", "id", "tl"])
    best = (r.groupby(["id", "tl"]).size().rename("n").reset_index()
              .sort_values(["id", "n"], ascending=[True, False]).drop_duplicates("id"))
    names = r.drop_duplicates("id").set_index("id").name
    best["name"] = best.id.map(names)
    tls = sorted(best.tl.unique())
    return tls, {t: list(best[best.tl == t].sort_values("id")[["name", "id"]].itertuples(index=False, name=None)) for t in tls}

_REAL_TLS, _ROSTER = load_roster()
# Team leads keep the FCR file's teams but synthetic names (Optus: no real team lead names)
SYNTH_TL = ["Marisol Aguinaldo", "Rico Bernabe", "Lorna Castro", "Dennis Velasco",
            "Joanna Medina", "Paulo Serrano", "Katrina Uy", "Arnel Vergara"]
TL_NAMES = SYNTH_TL[:len(_REAL_TLS)]
ROSTER = {SYNTH_TL[k]: _ROSTER[t] for k, t in enumerate(_REAL_TLS)}

def make_agents():
    names_used = set()
    rows = []
    aid = 5100100
    for t, tl_name in enumerate(TL_NAMES):
        tl_id = f"TL-{t + 1:02d}"
        team = ROSTER[tl_name]
        n_exited = 1 if t % 3 == 0 else 0
        size = len(team)
        for k in range(size + n_exited):
            exited = k >= size
            if not exited:
                nm, real_id = team[k]
                agent_id = f"AG{real_id}"
            else:   # former consultants are not in the FCR file: synthetic names, labelled as such
                while True:
                    nm = f"{rng.choice(FIRST)} {rng.choice(LAST)} (former)"
                    if nm not in names_used:
                        names_used.add(nm)
                        break
                aid += int(rng.integers(1, 9))
                agent_id = f"AG{aid}"
            u = rng.random()
            if u < 0.12:          # recent hires (in nesting at some point in the window)
                hire = END - dt.timedelta(days=int(rng.integers(30, 150)))
            elif u < 0.30:
                hire = START + dt.timedelta(days=int(rng.integers(30, 200)))
            else:
                hire = START - dt.timedelta(days=int(rng.integers(60, 1500)))
            exit_date = START + dt.timedelta(days=int(rng.integers(90, 300))) if exited else None
            if exit_date and hire >= exit_date:
                hire = START - dt.timedelta(days=int(rng.integers(200, 700)))
            skill = float(np.exp(rng.normal(0, 0.28)))
            rows.append(dict(
                Agent_ID=agent_id, Agent_Name=nm, Team_Lead_ID=tl_id, Team_Lead=tl_name,
                Hire_Date=hire, Exit_Date=exit_date, Status="Exited" if exited else "Active",
                _skill=skill,
                _xsell=float(np.clip(rng.beta(2.2, 4.5), 0.05, 0.85)),
                _discovery=float(np.clip(3.2 + 0.9 * np.log(skill) / 0.28 * 0.4 + rng.normal(0, 0.35), 1.6, 4.9)),
                _transfer=float(np.exp(rng.normal(0, 0.22))),
                _repeat=float(np.exp(rng.normal(0, 0.18))),
                _aht=float(np.exp(rng.normal(0, 0.12))),
            ))
    return pd.DataFrame(rows)

agents = make_agents()

# ----------------------------------------------------------------------------------
# 4. Call skeleton: date, time, agent, direction
# ----------------------------------------------------------------------------------
STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"]
STATE_P = [0.31, 0.26, 0.20, 0.10, 0.07, 0.02, 0.02, 0.02]
HOURS = np.arange(8, 20)
HOUR_P = np.array([4, 7, 10, 11, 10, 9, 9, 8, 8, 9, 9, 6], dtype=float); HOUR_P /= HOUR_P.sum()
DOW_W = {0: 1.15, 1: 1.18, 2: 1.12, 3: 1.10, 4: 1.08, 5: 0.45, 6: 0.42}  # Mon..Sun

def week_end(d: dt.date) -> dt.date:
    return d + dt.timedelta(days=(4 - d.weekday()) % 7)   # Friday on or after

days = pd.date_range(START, END, freq="D")
day_rows = []
for d in days:
    month_days = pd.date_range(d.replace(day=1), d + pd.offsets.MonthEnd(0), freq="D")   # full calendar month
    wsum = sum(DOW_W[x.weekday()] for x in month_days)
    exp = MONTH_VOL[(d.year, d.month)] * DOW_W[d.weekday()] / wsum
    day_rows.append((d.date(), int(rng.poisson(exp))))

recs = []
call_id = 718000000000
for d, n in day_rows:
    active = agents[(agents.Hire_Date <= d) & (agents.Exit_Date.isna() | (agents.Exit_Date > d))]
    # weekend: about half the floor works
    if d.weekday() >= 5:
        active = active.sample(frac=0.5, random_state=int(rng.integers(1e9)))
    w = np.ones(len(active))
    ag = rng.choice(active.Agent_ID.values, size=n, p=w / w.sum())
    hrs = rng.choice(HOURS, size=n, p=HOUR_P)
    secs = rng.integers(0, 3600, size=n)
    for i in range(n):
        call_id += int(rng.integers(1500, 40000))
        recs.append((str(call_id), pd.Timestamp(d) + pd.Timedelta(hours=int(hrs[i]), seconds=int(secs[i])), ag[i]))

calls = pd.DataFrame(recs, columns=["Call_ID", "Call_Start", "Agent_ID"]).sort_values("Call_Start").reset_index(drop=True)
# Call IDs ascend with time, like the Genesys conversation IDs in the FCR file
calls["Call_ID"] = sorted(calls["Call_ID"].astype(np.int64))
calls["Call_ID"] = calls["Call_ID"].astype(str)
N = len(calls)
calls["Call_Date"] = calls.Call_Start.dt.date
calls["Week_Ending"] = calls.Call_Date.map(week_end)
calls["Month"] = calls.Call_Start.dt.to_period("M").astype(str)
A = agents.set_index("Agent_ID")
calls = calls.join(A[["Team_Lead", "_skill", "_xsell", "_discovery", "_transfer", "_repeat", "_aht", "Hire_Date"]], on="Agent_ID")
tenure_days = (pd.to_datetime(calls.Call_Date) - pd.to_datetime(calls.Hire_Date)).dt.days
calls["Agent_Tenure_Months"] = (tenure_days / 30.4).round().astype(int)
nesting = calls.Agent_Tenure_Months < 3
calls.loc[nesting, "_skill"] *= 0.70
calls.loc[nesting, "_transfer"] *= 1.25

calls["Call_Direction"] = np.where(rng.random(N) < 0.11, "Outbound (callback)", "Inbound")
outbound = calls.Call_Direction.eq("Outbound (callback)").values
no_answer = outbound & (rng.random(N) < 0.38)

# ----------------------------------------------------------------------------------
# 5. FCR: transfer and repeat flags by week, then link repeat contacts
# ----------------------------------------------------------------------------------
def fcr_mix(we: dt.date):
    key = we.isoformat()
    if key in WEEKLY_FCR:
        a, r, t, b = WEEKLY_FCR[key]
    else:
        a, r, t, b = 43.5 + rng.normal(0, 1.5), 31.0 + rng.normal(0, 1.2), 17.0 + rng.normal(0, 1.2), 8.0 + rng.normal(0, 0.6)
    s = a + r + t + b
    return r / s, t / s, b / s

mix = {we: fcr_mix(we) for we in calls.Week_Ending.unique()}
R = np.array([mix[w][0] for w in calls.Week_Ending]); T = np.array([mix[w][1] for w in calls.Week_Ending])
B = np.array([mix[w][2] for w in calls.Week_Ending])
p_transfer = np.clip((T + B) * calls._transfer.values, 0, 0.9)
transfer = (rng.random(N) < p_transfer) & ~no_answer
p_rep_given_t = B / (T + B)
p_rep_given_nt = R / (1 - T - B)
p_repeat = np.where(transfer, p_rep_given_t, p_rep_given_nt) * calls._repeat.values
want_repeat = (rng.random(N) < np.clip(p_repeat, 0, 0.95)) & ~no_answer

# Link: the repeat contact is a later call in the data from the same customer
starts = calls.Call_Start.values.astype("datetime64[s]").astype(np.int64)
is_target = np.zeros(N, bool)
prev_of = np.full(N, -1)
next_of = np.full(N, -1)
timeline = np.array([None] * N, dtype=object)
order = np.arange(N)
for i in order[want_repeat]:
    if rng.random() < 0.68:
        delta = int(rng.integers(3 * 60, 59 * 60))
        tl = "<1hr"
    else:
        delta = int(min(rng.exponential(2.2 * 86400) + 3600, 14 * 86400 - 60))
        tl = ">1hr"
    j = int(np.searchsorted(starts, starts[i] + delta))
    # find the next free call (not already linked, not an unanswered outbound)
    tries = 0
    while j < N and (is_target[j] or no_answer[j] or j == i) and tries < 50:
        j += 1; tries += 1
    if j >= N or starts[j] - starts[i] > 14 * 86400 or tries >= 50:
        continue   # repeat would fall after the data ends: the 14-day window is not closed (unlocked)
    is_target[j] = True
    prev_of[j] = i
    next_of[i] = j
    timeline[i] = tl
repeat = next_of >= 0

# ----------------------------------------------------------------------------------
# 6. Customers and call reasons
# ----------------------------------------------------------------------------------
REASONS = [  # reason, share, sale category it can convert to (None = service/non-sale)
    ("New Mobile Plan / Port In", 0.150, PV_NC),
    ("Prepaid to Postpaid", 0.030, PV_NC),
    ("New NBN Service", 0.140, HM_NC),
    ("New 5G/4G Home Internet", 0.055, HM_NC),
    ("Mobile Recontract / Device Upgrade", 0.130, PV_RN),
    ("Home Internet Recontract", 0.075, HM_RN),
    ("Connected Device / Tablet", 0.030, CD_NC),
    ("NBN Relocation", 0.060, None),
    ("Plan Change", 0.055, None),
    ("Order Status", 0.050, None),
    ("Billing Inquiry", 0.060, None),
    ("Tech Issue", 0.040, None),
    ("Prepaid Inquiry", 0.035, None),
    ("Cancellation", 0.030, None),
    ("Change of Ownership", 0.015, None),
    ("Misrouted / Other", 0.045, None),
]
r_names = [r[0] for r in REASONS]; r_p = np.array([r[1] for r in REASONS]); r_p /= r_p.sum()
REASON_CAT = {r[0]: r[2] for r in REASONS}
reason = rng.choice(r_names, size=N, p=r_p).astype(object)

cust_seq = 10000000
cust = np.empty(N, dtype=object)
state = rng.choice(STATES, size=N, p=STATE_P).astype(object)
for i in range(N):
    if prev_of[i] >= 0:
        p = prev_of[i]
        cust[i] = cust[p]; state[i] = state[p]
        # most repeat contacts are the same concern
        if rng.random() < 0.82:
            reason[i] = reason[p]
    else:
        cust_seq += int(rng.integers(1, 40))
        cust[i] = f"OPT-{cust_seq}"

sale_intent_cat = np.array([REASON_CAT[r] for r in reason], dtype=object)
# Existing relationship depends on the reason
existing = np.empty(N, dtype=object)
for i in range(N):
    cat = sale_intent_cat[i]
    u = rng.random()
    if cat in (PV_RN,):
        existing[i] = "Mobile" if u < 0.70 else "Mobile + Home Internet"
    elif cat in (HM_RN,):
        existing[i] = "Home Internet" if u < 0.62 else "Mobile + Home Internet"
    elif cat == PV_NC:
        existing[i] = "No Optus services" if u < 0.62 else ("Home Internet" if u < 0.80 else ("Prepaid" if u < 0.95 else "Mobile"))
    elif cat == HM_NC:
        existing[i] = "No Optus services" if u < 0.55 else ("Mobile" if u < 0.72 else ("Prepaid" if u < 0.80 else "Home Internet"))
    elif cat == CD_NC:
        existing[i] = "Mobile" if u < 0.70 else ("Mobile + Home Internet" if u < 0.90 else "No Optus services")
    else:
        existing[i] = rng.choice(["Mobile", "Home Internet", "Mobile + Home Internet", "Prepaid", "No Optus services"],
                                 p=[0.38, 0.22, 0.18, 0.14, 0.08])
for i in range(N):
    if prev_of[i] >= 0:
        existing[i] = existing[prev_of[i]]
if True:
    # Prepaid to Postpaid means the customer is on prepaid
    m = reason == "Prepaid to Postpaid"
    existing[m] = "Prepaid"
cust_type = np.where(existing == "No Optus services", "New to Optus", "Existing Optus customer")

# ----------------------------------------------------------------------------------
# 7. Primary sales: per day and category, conversion target x calls
# ----------------------------------------------------------------------------------
def conv_for(we: dt.date, ym):
    k = we.isoformat()
    if k in WEEKLY_CONV:
        pv, hm, pvr, hmr = WEEKLY_CONV[k]
    else:
        pv, hm, pvr, hmr = BASE_CONV[ym]
        pv, hm, pvr, hmr = [x * float(np.exp(rng.normal(0, 0.08))) for x in (pv, hm, pvr, hmr)]
    return {PV_NC: pv, HM_NC: hm, PV_RN: pvr, HM_RN: hmr, CD_NC: CD_CONV * float(np.exp(rng.normal(0, 0.15)))}

week_conv = {}
for we, grp in calls.groupby("Week_Ending"):
    ym = (grp.Call_Start.iloc[len(grp) // 2].year, grp.Call_Start.iloc[len(grp) // 2].month)
    week_conv[we] = conv_for(we, ym)

sale = np.zeros(N, bool)
sale_cat = np.array([None] * N, dtype=object)
eligible_base = ~transfer & ~no_answer
skill = calls._skill.values
rep_w = np.where(is_target, 0.35, 1.0)        # contacts that follow an unresolved call convert less
for we, idx in calls.groupby("Week_Ending").indices.items():
    nweek = len(idx)
    for cat in CATS:
        rate = week_conv[we][cat] / 100.0
        # cross-sell lines also count towards PV NC and Home NC; leave room for them
        if we >= XSELL_START and cat == PV_NC:
            rate *= 0.86
        elif we >= XSELL_START and cat == HM_NC:
            rate *= 0.985
        if we.isoformat() in WEEKLY_CONV:
            k = int(round(rate * nweek))          # slide weeks: reproduce the slide
        else:
            k = int(rng.poisson(rate * nweek))
        pool = idx[eligible_base[idx] & (sale_intent_cat[idx] == cat) & ~sale[idx]]
        if k == 0 or len(pool) == 0:
            continue
        k = min(k, len(pool))
        w = skill[pool] * rep_w[pool]
        pick = rng.choice(pool, size=k, replace=False, p=w / w.sum())
        sale[pick] = True
        sale_cat[pick] = cat

# Credit / ID / port-in for new connections that close must have passed
# ----------------------------------------------------------------------------------
# 8. Cross-sell on sale calls (Elevate: opportunity, attempted, outcome)
# ----------------------------------------------------------------------------------
xs_opp = np.zeros(N, bool); xs_att = np.zeros(N, bool); xs_sold = np.zeros(N, bool)
xs_prod = np.array([None] * N, dtype=object)
xs_prop = calls._xsell.values
week_idx = (pd.to_datetime(calls.Week_Ending) - pd.Timestamp(START)).dt.days.values / 7.0
call_month = calls.Month.values
call_day = calls.Call_Date.values
for i in np.where(sale)[0]:
    if call_day[i] < XSELL_START:
        continue            # cross-sell not yet introduced
    c = sale_cat[i]
    if c == HM_NC and existing[i] in ("No Optus services", "Home Internet", "Prepaid"):
        xs_opp[i] = True; xs_prod[i] = "Postpaid Mobile (SIM only)"
        att_p = xs_prop[i] * 0.85
    elif c == PV_NC and existing[i] in ("No Optus services", "Mobile", "Prepaid"):
        xs_opp[i] = True; xs_prod[i] = "Home Internet (NBN/5G)"
        att_p = xs_prop[i] * 0.55
    elif c in (PV_RN,) and existing[i] == "Mobile":
        xs_opp[i] = rng.random() < 0.6; xs_prod[i] = "Home Internet (NBN/5G)" if xs_opp[i] else None
        att_p = xs_prop[i] * 0.45
    elif c == HM_RN and existing[i] == "Home Internet":
        xs_opp[i] = rng.random() < 0.7; xs_prod[i] = "Postpaid Mobile (SIM only)" if xs_opp[i] else None
        att_p = xs_prop[i] * 0.6
    else:
        continue
    att_p *= XSELL_RAMP.get(call_month[i], 1.0)      # training is landing month by month
    if xs_opp[i] and rng.random() < att_p:
        xs_att[i] = True
        succ = 0.24 if xs_prod[i].startswith("Postpaid") else 0.12
        xs_sold[i] = rng.random() < succ * min(skill[i], 1.6)

def xsell_cat(i):
    return PV_NC if xs_prod[i].startswith("Postpaid") else HM_NC

# ----------------------------------------------------------------------------------
# 9. Hit Optus's October 2026 totals exactly
# ----------------------------------------------------------------------------------
def hit_totals(mask, targets):
    """Add or drop primary sales inside `mask` until sales lines (primary + cross-sell) per category
    equal `targets` exactly."""
    for _ in range(3):
        for cat, want in targets.items():
            prim = mask & sale & (sale_cat == cat)
            xs = mask & xs_sold & np.array([xs_prod[i] is not None and xs_sold[i] and xsell_cat(i) == cat for i in range(N)])
            diff = want - (prim.sum() + xs.sum())
            if diff > 0:
                pool = np.where(mask & eligible_base & ~sale & (sale_intent_cat == cat))[0]
                w = skill[pool] * rep_w[pool]
                add = rng.choice(pool, size=min(diff, len(pool)), replace=False, p=w / w.sum())
                sale[add] = True; sale_cat[add] = cat
            elif diff < 0:
                pool = np.where(prim & ~xs_sold)[0]
                drop = rng.choice(pool, size=min(-diff, len(pool)), replace=False)
                sale[drop] = False; sale_cat[drop] = None
                xs_opp[drop] = False; xs_att[drop] = False; xs_prod[drop] = None

# The September slide weeks reproduce the slide exactly, cross-sell lines included
wk_str = calls.Week_Ending.astype(str).values
for wk in ("2026-09-11", "2026-09-18", "2026-09-25"):
    wmask = wk_str == wk
    nweek = int(wmask.sum())
    pv, hm, pvr, hmr = WEEKLY_CONV[wk]
    hit_totals(wmask, {PV_NC: int(round(pv / 100 * nweek)), HM_NC: int(round(hm / 100 * nweek)),
                       PV_RN: int(round(pvr / 100 * nweek)), HM_RN: int(round(hmr / 100 * nweek))})
# Then Optus's October totals
oct_mask = (calls.Month == "2026-10").values
hit_totals(oct_mask, OCT_TARGET)

# ----------------------------------------------------------------------------------
# 10. Lost sales, credit / ID / port-in, Jarvis errors, call result
# ----------------------------------------------------------------------------------
DRIVERS = {
    "Customer": (0.433, [("Failed credit check", 0.36), ("Failed ID verification", 0.24),
                         ("Port-in: previous provider account number unavailable", 0.20),
                         ("Price / comparing other providers", 0.12), ("Wants to think about it", 0.08)]),
    "People": (0.258, [("Insufficient discovery and probing - irrelevant plan recommended", 0.42),
                       ("No ownership - deferred to promised callback", 0.28),
                       ("Objection not handled", 0.13), ("Incorrect information given", 0.09),
                       ("Transferred to Retention without checking other plans", 0.08)]),
    # Optus: the remaining 30.9% is system error. Jarvis reasons are 47% of it, so Jarvis-blocked
    # sales stay about 0.6% of calls (the 0.6 pt in the email).
    "System": (0.309, [("Jarvis error - order could not be submitted", 0.38), ("Jarvis slow / timed out", 0.09),
                       ("Call disconnected / audio issue", 0.15), ("Credit check service unavailable", 0.08),
                       ("IVR misrouted the call", 0.18), ("Serviceability / stock lookup failed", 0.12)]),
}
drv_names = list(DRIVERS); drv_p = np.array([DRIVERS[d][0] for d in drv_names]); drv_p /= drv_p.sum()

sales_intent = np.array([c is not None for c in sale_intent_cat])
lost = np.zeros(N, bool)
lost_driver = np.array([None] * N, dtype=object); lost_reason = np.array([None] * N, dtype=object)
cand = np.where(sales_intent & ~sale & ~no_answer & ~transfer)[0]
# Lost sales = 4.1% of calls, so Jarvis-blocked sales (System 30.9% x Jarvis reasons 47%) are
# about 0.6% of calls: the 0.6 pt conversion impact in the email. Calls that bring the customer back
# are more likely to be lost sales.
n_lost = int(round(0.041 * N))
w = np.where(repeat[cand], 1.6, 1.0)
lost_idx = rng.choice(cand, size=n_lost, replace=False, p=w / w.sum())
# Driver counts in the exact shares; People drivers go mostly to weaker consultants
n_drv = {d: int(round(DRIVERS[d][0] * n_lost)) for d in drv_names}
n_drv["Customer"] += n_lost - sum(n_drv.values())
remaining = lost_idx.copy()
wp = 1.0 / skill[remaining] ** 2
people = rng.choice(remaining, size=n_drv["People"], replace=False, p=wp / wp.sum())
remaining = np.setdiff1d(remaining, people)
rng.shuffle(remaining)
assign = {"People": people}
pos = 0
for d in ("Customer", "System"):
    assign[d] = remaining[pos:pos + n_drv[d]]; pos += n_drv[d]
for d, idxs in assign.items():
    reasons, rp = zip(*DRIVERS[d][1])
    rp = np.array(rp) / sum(rp)
    for i in idxs:
        rs = rng.choice(reasons, p=rp)
        if rs == "Transferred to Retention without checking other plans":
            transfer[i] = True
        lost[i] = True; lost_driver[i] = d; lost_reason[i] = rs

# Credit check, ID verification, port-in
credit = np.array(["Not run"] * N, dtype=object)
idv = np.array(["Not run"] * N, dtype=object)
port_req = np.zeros(N, bool); port_status = np.array([None] * N, dtype=object)
nc_cats = (PV_NC, HM_NC, CD_NC)
for i in range(N):
    c = sale_intent_cat[i]
    if c is None or no_answer[i]:
        continue
    reached_order = sale[i] or lost[i] or rng.random() < 0.35
    if c in nc_cats and reached_order:
        idv[i] = "Pass"; credit[i] = "Eligible"
    elif c in (PV_RN, HM_RN) and reached_order:
        idv[i] = "Pass"; credit[i] = "Eligible" if rng.random() < 0.5 else "Not run"
    if c == PV_NC and reason[i] == "New Mobile Plan / Port In" and rng.random() < 0.58:
        port_req[i] = True; port_status[i] = "Completed" if sale[i] else ("Not started" if not lost[i] else "Not started")
    if lost[i]:
        if lost_reason[i] == "Failed credit check":
            credit[i] = "Not eligible"
        elif lost_reason[i] == "Failed ID verification":
            idv[i] = "Fail"; credit[i] = "Not run"
        elif lost_reason[i] == "Credit check service unavailable":
            credit[i] = "Service unavailable"
        elif lost_reason[i].startswith("Port-in"):
            port_req[i] = True; port_status[i] = "Failed - account number unavailable"
    # some sales also had a referral (passed after review)
    if sale[i] and c in nc_cats and rng.random() < 0.04:
        credit[i] = "Eligible after referral"

# Jarvis errors: all Jarvis lost sales, plus errors worked around on other calls
jarvis = np.array([lost_reason[i] is not None and lost_reason[i].startswith("Jarvis") for i in range(N)])
extra = (sale & (rng.random(N) < 0.035)) | (~sale & ~no_answer & (rng.random(N) < 0.008))
jarvis |= extra
JARVIS_TYPES = ["Order submission failed", "Serviceability lookup failed", "Session timeout", "Plan not loading",
                "Credit check API error"]
jarvis_type = np.array([None] * N, dtype=object)
ticket = np.array([None] * N, dtype=object); ticket_days = np.full(N, np.nan)
tk = 4100000
for i in np.where(jarvis)[0]:
    if lost_reason[i] == "Jarvis slow / timed out":
        jarvis_type[i] = "Session timeout"
    else:
        jarvis_type[i] = rng.choice(JARVIS_TYPES, p=[0.48, 0.20, 0.12, 0.12, 0.08])
    if lost[i] or rng.random() < 0.35:   # errors that blocked a sale are always ticketed
        tk += int(rng.integers(1, 30))
        ticket[i] = f"INC{tk}"
        ticket_days[i] = int(min(1 + rng.gamma(1.8, 1.9), 21))
# A Jarvis error that blocks a sale often brings the customer back
for i in np.where(jarvis & lost)[0]:
    pass

# Transfer destination and validity (image (1).png)
DEST_SHARES = [  # Optus's transfer queues. Top three from the FCR slide; the rest assumed until Optus shares them
    ("Retention Voice", 37.72), ("Service Voice", 15.78), ("Service Prepaid Voice", 13.88),
    ("Service Account Security", 4.5), ("Tech Assurance Fixed Voice", 4.5), ("Tech Onboarding Voice", 2.5),
    ("Back Office Sales Fulfillment", 2.2), ("Sales Voice", 2.0), ("Hardship Voice", 1.8), ("SMB Sales Voice", 1.8),
    ("Tech Assurance Mobile Voice", 1.8), ("SMB Care Voice", 1.4), ("Tech 5G Connections Voice", 1.4),
    ("Payment Support Voice", 1.6), ("Enhanced Specialist Care Voice", 1.2), ("Tech Support Mobile Voice", 1.2),
    ("SMB Retention Voice", 0.8), ("Support Training", 0.6), ("Service Shield", 0.6), ("Service Messaging", 0.6),
    ("SMB Complex Care NBN Voice", 0.5), ("Sales Messaging", 0.4), ("Enhanced Specialist Care Messaging", 0.3),
    ("Hardship Messaging", 0.3), ("Payment Support SMB Voice", 0.3), ("SMB Case Mgmnt NBN", 0.3),
]
DEST = [d for d, _ in DEST_SHARES]
DEST_P = np.array([x for _, x in DEST_SHARES]); DEST_P /= DEST_P.sum()
TECH_Q = (["Tech Assurance Fixed Voice", "Tech Support Mobile Voice", "Tech Assurance Mobile Voice", "Tech 5G Connections Voice"],
          [0.50, 0.20, 0.15, 0.15])
BILL_Q = (["Service Voice", "Payment Support Voice", "Hardship Voice"], [0.45, 0.35, 0.20])
dest = np.array([None] * N, dtype=object); valid = np.array([None] * N, dtype=object)
invalid_reason = np.array([None] * N, dtype=object)
for i in np.where(transfer)[0]:
    if lost_reason[i] == "Transferred to Retention without checking other plans":
        dest[i] = "Retention Voice"; valid[i] = "N"
        invalid_reason[i] = "Sent to Retention without checking other plans"
        continue
    r = reason[i]
    if r == "Prepaid Inquiry":
        dest[i] = "Service Prepaid Voice"
    elif r == "Tech Issue":
        dest[i] = rng.choice(TECH_Q[0], p=TECH_Q[1])
    elif r == "Cancellation":
        dest[i] = "Retention Voice"
    elif r == "Billing Inquiry":
        dest[i] = rng.choice(BILL_Q[0], p=BILL_Q[1])
    else:
        dest[i] = rng.choice(DEST, p=DEST_P)
    if rng.random() < 0.15 * calls._transfer.values[i]:
        valid[i] = "N"
        if dest[i] == "Retention Voice":
            invalid_reason[i] = "Sent to Retention without checking other plans"
        elif dest[i] in ("Payment Support Voice", "Service Voice"):
            invalid_reason[i] = "Basic billing question the consultant could resolve"
        else:
            invalid_reason[i] = rng.choice(["Basic billing question the consultant could resolve",
                                            "Sent to Retention without checking other plans",
                                            "Plan change the consultant could process"])
    else:
        valid[i] = "Y"

# Call result
result = np.array([None] * N, dtype=object)
callback_promised = np.zeros(N, bool)
for i in range(N):
    if no_answer[i]:
        result[i] = "No Answer"
    # Optus records four outcomes only: Sale, Callback, No Answer, Rejected (no sale). Transfers,
    # Jarvis errors and eligibility stay visible through their own columns.
    elif sale[i]:
        result[i] = "Sale"
    elif lost[i] and not transfer[i] and lost_reason[i] in ("No ownership - deferred to promised callback", "Wants to think about it",
                                                            "Port-in: previous provider account number unavailable",
                                                            "Serviceability / stock lookup failed"):
        result[i] = "Callback"
    elif sales_intent[i] and not lost[i] and not transfer[i] and rng.random() < 0.22:
        result[i] = "Callback"
    else:
        result[i] = "Rejected"
    if result[i] == "Callback":
        callback_promised[i] = True

# Recompute repeat for calls whose link exists (transfer may have changed above; links stay)
fcr = ~transfer & ~repeat & ~no_answer
locked = (calls.Call_Start + pd.Timedelta(days=14) <= DATA_END_TS).values
fcr_outcome = np.where(no_answer, "Not applicable (no answer)",
               np.where(transfer & repeat, "Transfer & Repeat",
               np.where(transfer, "Transfer", np.where(repeat, "Repeat", "Achieved"))))

# Handle time
aht = np.zeros(N); hold = np.zeros(N)
for i in range(N):
    if no_answer[i]:
        aht[i] = rng.integers(20, 75); hold[i] = 0; continue
    if sale[i]:
        base = {HM_NC: 1850, PV_NC: 1500, PV_RN: 1250, HM_RN: 1300, CD_NC: 1150}[sale_cat[i]]
    elif transfer[i]:
        base = 520
    elif lost[i]:
        base = 1100
    elif sales_intent[i]:
        base = 720
    else:
        base = 560
    if jarvis[i]:
        base += 420
    if xs_att[i]:
        base += 180
    aht[i] = max(60, base * calls._aht.values[i] * np.exp(rng.normal(0, 0.30)))
    hold[i] = max(0, aht[i] * rng.beta(1.4, 9) + (240 if jarvis[i] else 0))
aht = aht.round().astype(int); hold = np.minimum(hold.round().astype(int), aht - 10).clip(0)

# ----------------------------------------------------------------------------------
# 11. Assemble the call fact
# ----------------------------------------------------------------------------------
call_ids = calls.Call_ID.values
fact = pd.DataFrame({
    "Call_ID": call_ids,
    "Call_Start_Datetime": calls.Call_Start.dt.strftime("%Y-%m-%d %H:%M:%S"),
    "Call_Date": calls.Call_Date.astype(str),
    "Week_Ending": calls.Week_Ending.astype(str),
    "Month": calls.Month,
    "Agent_ID": calls.Agent_ID,
    "Team_Lead": calls.Team_Lead,
    "Agent_Tenure_Months": calls.Agent_Tenure_Months,
    "Customer_ID": cust,
    "Customer_Type": cust_type,
    "Existing_Optus_Products": existing,
    "State": state,
    "Call_Direction": calls.Call_Direction,
    "Call_Reason": reason,
    "Sales_Opportunity_Flag": np.where(sales_intent, "Y", "N"),
    "Handle_Time_Seconds": aht,
    "Hold_Time_Seconds": hold,
    "Call_Result": result,
    "Sale_Flag": np.where(sale, "Y", "N"),
    "Sales_Category": sale_cat,
    "Credit_Check_Result": credit,
    "ID_Verification_Result": idv,
    "Port_In_Requested_Flag": np.where(port_req, "Y", "N"),
    "Port_In_Status": port_status,
    "Lost_Sale_Flag": np.where(lost, "Y", "N"),
    "Lost_Sale_Driver": lost_driver,
    "Lost_Sale_Reason": lost_reason,
    "Callback_Promised_Flag": np.where(callback_promised, "Y", "N"),
    "Jarvis_Error_Flag": np.where(jarvis, "Y", "N"),
    "Jarvis_Error_Type": jarvis_type,
    "Jarvis_Ticket_ID": ticket,
    "Jarvis_Ticket_Resolution_Days": ticket_days,
    "Cross_Sell_Opportunity_Flag": np.where(xs_opp & sale, "Y", "N"),
    "Cross_Sell_Product": np.where(xs_opp & sale, xs_prod, None),
    "Cross_Sell_Attempted_Flag": np.where(xs_opp & sale, np.where(xs_att, "Y", "N"), "N/A"),
    "Cross_Sell_Outcome": np.where(~(xs_opp & sale), "N/A", np.where(xs_sold, "Sold", np.where(xs_att, "Declined", "Not attempted"))),
    "Transfer_Flag": np.where(transfer, "Y", "N"),
    "Transfer_Destination": dest,
    "Transfer_Valid_Flag": valid,
    "Invalid_Transfer_Reason": invalid_reason,
    "Repeat_14D_Flag": np.where(repeat, "Y", "N"),
    "Repeat_Timeline": timeline,
    "Next_Contact_Call_ID": [call_ids[j] if j >= 0 else None for j in next_of],
    "Is_Repeat_Contact_Flag": np.where(is_target, "Y", "N"),
    "Previous_Call_ID": [call_ids[j] if j >= 0 else None for j in prev_of],
    "FCR_Outcome": fcr_outcome,
    "FCR_Flag": np.where(no_answer, "N/A", np.where(fcr, "Y", "N")),
    "FCR_Locked_Flag": np.where(locked, "Y", "N"),
})
# Repeat flags need a closed 14-day window to be final
fact.loc[fact.Cross_Sell_Outcome.eq("Sold") & fact.Sale_Flag.ne("Y"), "Cross_Sell_Outcome"] = "N/A"

# ----------------------------------------------------------------------------------
# 12. Sales order lines (one per product sold; cross-sells are their own line)
# ----------------------------------------------------------------------------------
lines = []
oid = 30000000
for i in np.where(sale)[0]:
    for src, cat in [("Primary", sale_cat[i])] + ([("Cross-sell", xsell_cat(i))] if xs_sold[i] else []):
        codes, ps = PLAN_MIX[cat]
        ps = np.array(ps)
        if cat == PV_NC and existing[i] not in ("No Optus services", "Prepaid", "Home Internet"):
            # Small Promo is for new services only: still allowed (a new service on an existing account)
            pass
        code = rng.choice(codes, p=ps / ps.sum())
        p = PRICE.loc[code]
        oid += int(rng.integers(1, 12))
        device = "N"
        if cat == PV_RN and rng.random() < 0.42:
            device = "Y"
        lines.append(dict(
            Order_ID=f"ORD-{oid}", Call_ID=call_ids[i], Order_Date=str(calls.Call_Date.iat[i]),
            Week_Ending=str(calls.Week_Ending.iat[i]), Month=calls.Month.iat[i],
            Agent_ID=calls.Agent_ID.iat[i], Team_Lead=calls.Team_Lead.iat[i], Customer_ID=cust[i], State=state[i],
            Sale_Source=src, Sales_Category=cat, Product_Line=p.Product_Line, Plan_Code=code, Plan_Name=p.Plan_Name,
            Promo_Applied_Flag="Y" if p.Promo_Months > 0 else "N",
            Monthly_Revenue=float(p.Promo_Monthly_Price), Standard_Monthly_Price=float(p.Standard_Monthly_Price),
            Promo_Months=int(p.Promo_Months),
            First_12M_Revenue=float(p.Promo_Monthly_Price * min(12, p.Promo_Months or 12)
                                    + p.Standard_Monthly_Price * max(0, 12 - (p.Promo_Months or 12))),
            Device_Included_Flag=device,
            Jarvis_Error_During_Order_Flag="Y" if jarvis[i] else "N",
        ))
sales = pd.DataFrame(lines)

# ----------------------------------------------------------------------------------
# 13. Elevate quality audits (sales calls and lost opportunities, about 5 per agent per month)
# ----------------------------------------------------------------------------------
COMMENTS_XS = {
    "Effective": ["Linked mobile offer to household usage found in discovery; customer accepted the SIM-only bundle.",
                  "Positioned the Promo Plan with the subscription credit; clear benefit statement.",
                  "Good bridging from the NBN order to the mobile offer before closing."],
    "Partially effective": ["Offered mobile but only at the end of the call; no benefit linked to the customer's needs.",
                            "Mentioned the bundle discount but did not handle the 'happy with current provider' objection.",
                            "Attempted the cross-sell but quoted the wrong plan inclusions."],
    "Not effective": ["Cross-sell read as a script line; no probing on current mobile provider or spend.",
                      "Offer made after the customer had already disengaged."],
}
COMMENTS_NA = {
    "Did not probe for other services": "Customer has no Optus mobile; consultant did not ask about current provider.",
    "Focused on completing the order (Jarvis issue)": "Jarvis error took most of the call; cross-sell not raised.",
    "Customer short on time": "Customer asked to keep the call short; consultant noted it for a follow-up.",
    "Assumed customer not interested": "Customer mentioned their phone contract; consultant did not check the end date.",
    "Customer not eligible (credit)": "Credit check outcome limited the offer; noted correctly.",
}
aud_rows = []
aud_id = 900000
fact_idx = fact.reset_index()
cand_idx = np.where((sale | lost | (sales_intent & ~no_answer)) & ~transfer)[0]
cand_month = calls.Month.values[cand_idx]
cand_agent = calls.Agent_ID.values[cand_idx]
cdf = pd.DataFrame({"i": cand_idx, "m": cand_month, "a": cand_agent})
for (m, a), g in cdf.groupby(["m", "a"]):
    k = min(len(g), int(rng.integers(4, 7)))
    # audits favour sales and lost opportunities
    w = np.where(sale[g.i.values], 3.0, np.where(lost[g.i.values], 2.0, 1.0))
    pick = rng.choice(g.i.values, size=k, replace=False, p=w / w.sum())
    for i in pick:
        aud_id += 1
        disc = float(np.clip(calls._discovery.values[i] + rng.normal(0, 0.55), 1, 5))
        prodk = float(np.clip(disc + rng.normal(0.3, 0.5), 1, 5))
        obj = float(np.clip(disc + rng.normal(-0.2, 0.6), 1, 5))
        owner = "N" if lost_reason[i] == "No ownership - deferred to promised callback" else ("Y" if rng.random() < 0.9 else "N")
        if calls.Call_Date.iat[i] < XSELL_START:
            opp = "N/A"; att = "N/A"          # the revised form's cross-sell fields came in with cross-sell
        elif sale[i] and xs_opp[i]:
            opp = "Y"; att = "Y" if xs_att[i] else "N"
        elif not sale[i] and sales_intent[i] and existing[i] in ("No Optus services", "Prepaid") and rng.random() < 0.5:
            opp = "Y"; att = "Y" if rng.random() < calls._xsell.values[i] * 0.5 else "N"
        else:
            opp = "N"; att = "N/A"
        if opp == "Y" and att == "Y":
            eff = "Effective" if xs_sold[i] else rng.choice(["Partially effective", "Not effective"], p=[0.6, 0.4])
            why = None
            com = rng.choice(COMMENTS_XS[eff])
        elif opp == "Y":
            eff = "N/A"
            opts = list(COMMENTS_NA)
            pw = np.array([0.42, 0.12 if not jarvis[i] else 0.6, 0.14, 0.22, 0.10])
            if lost_reason[i] == "Failed credit check":
                why = "Customer not eligible (credit)"
            else:
                why = rng.choice(opts, p=pw / pw.sum())
            com = COMMENTS_NA[why]
        elif opp == "N/A":
            eff = "N/A"; why = None
            com = rng.choice(["Needs confirmed before recommending a plan.", "Discovery adequate for the request.",
                              "Clear plan comparison; confirmed the customer's usage."])
        else:
            eff = "N/A"; why = None
            com = rng.choice(["No cross-sell opportunity identified on this call.",
                              "Needs confirmed before recommending a plan.",
                              "Discovery adequate for the request."])
        if lost_reason[i] == "Insufficient discovery and probing - irrelevant plan recommended":
            disc = min(disc, float(rng.uniform(1.0, 2.6)))
            com = "Plan recommended without confirming usage or household size. " + com
        score = round(float(np.clip(20 * (0.35 * disc + 0.25 * prodk + 0.2 * obj + 0.2 * (5 if owner == "Y" else 2))
                                    + rng.normal(0, 3), 35, 100)), 1)
        aud_rows.append(dict(
            Audit_ID=f"ELV-{aud_id}", Call_ID=call_ids[i],
            Audit_Date=str(calls.Call_Date.iat[i] + dt.timedelta(days=int(rng.integers(1, 6)))),
            Call_Date=str(calls.Call_Date.iat[i]), Agent_ID=calls.Agent_ID.iat[i], Team_Lead=calls.Team_Lead.iat[i],
            Call_Reason=reason[i], Sale_Flag="Y" if sale[i] else "N",
            Overall_Score_Pct=score, Discovery_Probing_Score=round(disc), Product_Knowledge_Score=round(prodk),
            Objection_Handling_Score=round(obj), Ownership_Flag=owner,
            Cross_Sell_Opportunity_Flag=opp, Cross_Sell_Attempted_Flag=att, Cross_Sell_Effectiveness=eff,
            Cross_Sell_Not_Attempted_Reason=why, Compliance_Pass_Flag="Y" if rng.random() < 0.95 else "N",
            Auditor_Comments=com,
        ))
audits = pd.DataFrame(aud_rows)
# audits can't be dated after the data ends
audits = audits[audits.Audit_Date <= END.isoformat()].reset_index(drop=True)

# ----------------------------------------------------------------------------------
# 14. FCR audits (structure of the Optus FCR file; about 6% of repeat/transfer calls)
# ----------------------------------------------------------------------------------
FCR_IDENT = {
    "New Mobile Plan / Port In": ["Sale - new postpaid service", "Port In", "Mobile Plan"],
    "Prepaid to Postpaid": ["Prepaid to Postpaid"],
    "New NBN Service": ["Sale - new NBN service", "New NBN", "NBN Order"],
    "New 5G/4G Home Internet": ["4G/5G Sales Inquiry", "Sale - new wireless BB"],
    "Mobile Recontract / Device Upgrade": ["Mobile Recontract", "Upgrading phone", "Mobile Upgrade"],
    "Home Internet Recontract": ["NBN Recontract", "Recontract"],
    "Connected Device / Tablet": ["iPad Purchase", "Connected device inquiry"],
    "NBN Relocation": ["NBN Relocation"], "Plan Change": ["Rate Plan Change", "Mobile Plan Change"],
    "Order Status": ["Order Status"], "Billing Inquiry": ["Billing Inquiry", "Bill increase"],
    "Tech Issue": ["NBN Tech", "Technical Issue"], "Prepaid Inquiry": ["Prepaid Inquiry", "Prepaid SIM activation"],
    "Cancellation": ["Account Cancellation"], "Change of Ownership": ["CHOWN"], "Misrouted / Other": ["Misrouted Call", "Ghost call"],
}
SUMMARY = {
    "New Mobile Plan / Port In": "Customer wants a SIM-only plan and to port their number. {x}",
    "Prepaid to Postpaid": "Customer wants to move from prepaid to postpaid. {x}",
    "New NBN Service": "Customer wants a new NBN service at their address. {x}",
    "New 5G/4G Home Internet": "Customer asking about 5G home internet availability. {x}",
    "Mobile Recontract / Device Upgrade": "Customer wants to recontract and upgrade their phone. {x}",
    "Home Internet Recontract": "Customer's NBN plan is ending and wants a better rate. {x}",
    "Connected Device / Tablet": "Customer asking about an iPad and a data plan. {x}",
    "NBN Relocation": "Requested an NBN relocation; earlier request unsuccessful. {x}",
    "Plan Change": "Customer wants to change their plan's data allowance. {x}",
    "Order Status": "Customer following up an order placed last week. {x}",
    "Billing Inquiry": "Customer asking about a higher bill this month. {x}",
    "Tech Issue": "Customer reporting a dropping connection. {x}",
    "Prepaid Inquiry": "Prepaid customer asking about recharge options. {x}",
    "Cancellation": "Customer wants to cancel their service. {x}",
    "Change of Ownership": "Customer wants to transfer the account to a family member. {x}",
    "Misrouted / Other": "Call misdirected through the IVR. {x}",
}
OPP_TEXT = {
    "People": ["Consultant did not probe for the underlying need.", "Consultant promised a callback instead of completing the request.",
               "Improper hold; customer disconnected while waiting."],
    "Technology": ["Jarvis error stopped the order being submitted.", "Call disconnected while on hold.",
                   "No audio from the consultant after taking the call off hold."],
    "Customer": ["Customer needed the previous provider's account number for the port-in.", "Customer failed ID verification.",
                 "Customer needed to check with the account holder."],
    "Process": ["Transferred to Retention before other plans were checked.", "Call misrouted to the wrong queue.",
                "Order needed a technician appointment that could not be booked on the call."],
}
CALLBACK_TEXT = ["Same concern", "Called back for the same reason", "Unsuccessful transfer; called back to continue",
                 "Called back to complete the order", "Customer unable to reach the original consultant", "Different concern"]
fcr_rows = []
fid = 500000
nonfcr = np.where((transfer | repeat) & ~no_answer)[0]
pick = rng.choice(nonfcr, size=int(len(nonfcr) * 0.06), replace=False)
for i in sorted(pick):
    fid += 1
    if lost_driver[i] == "System":
        opp = "Process" if lost_reason[i] in ("IVR misrouted the call", "Serviceability / stock lookup failed") else "Technology"
    elif lost_driver[i] is not None:
        opp = lost_driver[i]
    else:
        opp = rng.choice(["Customer", "People", "Technology", "Process"], p=[0.34, 0.33, 0.20, 0.13])
    j = next_of[i]
    fcr_rows.append(dict(
        FCR_Audit_ID=f"FCR-{fid}", Call_ID=call_ids[i], Call_Date=str(calls.Call_Date.iat[i]),
        Agent_ID=calls.Agent_ID.iat[i], Team_Lead=calls.Team_Lead.iat[i], FCR_Outcome=fcr_outcome[i],
        Transfer_Destination=dest[i], Transfer_Valid_Flag=valid[i],
        Next_Contact_Call_ID=call_ids[j] if j >= 0 else None,
        Next_Contact_Datetime=calls.Call_Start.iat[j].strftime("%Y-%m-%d %H:%M:%S") if j >= 0 else None,
        Repeat_Timeline=timeline[i],
        Call_Reason_Summary=SUMMARY[reason[i]].format(x=rng.choice(OPP_TEXT[opp])),
        Callback_Reason=rng.choice(CALLBACK_TEXT) if j >= 0 else None,
        Opportunity_Identifier=opp,
        FCR_Identifier=rng.choice(FCR_IDENT[reason[i]]),
        Avoidable_Flag="Y" if (valid[i] == "N" or opp in ("People", "Process")) else "N",
    ))
fcr_audits = pd.DataFrame(fcr_rows)

# ----------------------------------------------------------------------------------
# 14b. Cut the data at "today" (CUTOFF). Calls whose repeat contact came after the cutoff lose
# that link (the repeat hasn't happened yet), and FCR is locked only once 14 days have passed.
# ----------------------------------------------------------------------------------
cut = CUTOFF.isoformat()
fact = fact[fact.Call_Date <= cut].reset_index(drop=True)
kept_ids = set(fact.Call_ID)
gone = fact.Next_Contact_Call_ID.notna() & ~fact.Next_Contact_Call_ID.isin(kept_ids)
fact.loc[gone, ["Next_Contact_Call_ID", "Repeat_Timeline"]] = None
fact.loc[gone, "Repeat_14D_Flag"] = "N"
answered = fact.FCR_Flag.ne("N/A")
tr = fact.Transfer_Flag.eq("Y"); rp = fact.Repeat_14D_Flag.eq("Y")
fact.loc[answered, "FCR_Outcome"] = [("Transfer & Repeat" if t and r else "Transfer" if t else "Repeat" if r else "Achieved")
                                     for t, r in zip(tr[answered], rp[answered])]
fact.loc[answered, "FCR_Flag"] = (~tr & ~rp)[answered].map({True: "Y", False: "N"})
cut_end = pd.Timestamp(CUTOFF) + pd.Timedelta(hours=23, minutes=59, seconds=59)
fact["FCR_Locked_Flag"] = (pd.to_datetime(fact.Call_Start_Datetime) + pd.Timedelta(days=14) <= cut_end).map({True: "Y", False: "N"})
sales = sales[sales.Order_Date <= cut].reset_index(drop=True)
audits = audits[(audits.Call_Date <= cut) & (audits.Audit_Date <= cut)].reset_index(drop=True)
fcr_audits = fcr_audits[fcr_audits.Call_Date <= cut].reset_index(drop=True)
fcr_audits.loc[~fcr_audits.Next_Contact_Call_ID.isin(kept_ids), ["Next_Contact_Call_ID", "Next_Contact_Datetime", "Callback_Reason", "Repeat_Timeline"]] = None
print(f"Cut at {cut}: {len(fact):,} calls, {len(sales):,} order lines; {int(gone.sum()):,} repeat links fall after the cutoff (unlocked)")

# ----------------------------------------------------------------------------------
# 15. Targets (weekly and monthly)
# ----------------------------------------------------------------------------------
tgt_rows = []
for ym in sorted(fact.Month.unique()):
    tgt_rows += [
        dict(Period_Type="Month", Period=ym, Metric="New Sales Conversion %", Target=5.4,
             Source="Concentrix slide: MTD new sales conversion target 5.4%"),
        dict(Period_Type="Month", Period=ym, Metric="Postpaid Voice (Mobile) New Conversion %", Target=1.6,
             Source="Assumed - to confirm (email mentions a 5.1 mobile target)"),
        dict(Period_Type="Month", Period=ym, Metric="Renewals Conversion %", Target=3.5, Source="Assumed - to confirm"),
        dict(Period_Type="Month", Period=ym, Metric="FCR Achieved %", Target=50.0, Source="Assumed - to confirm"),
        dict(Period_Type="Month", Period=ym, Metric="Cross-sell Attempt Rate %", Target=60.0, Source="Assumed - to confirm"),
        dict(Period_Type="Month", Period=ym, Metric="Average Handle Time (seconds)", Target=900, Source="Assumed - to confirm"),
    ]
targets = pd.DataFrame(tgt_rows)

# ----------------------------------------------------------------------------------
# 16. Agent dimension (public columns only)
# ----------------------------------------------------------------------------------
agent_dim = agents[["Agent_ID", "Agent_Name", "Team_Lead_ID", "Team_Lead", "Hire_Date", "Exit_Date", "Status"]].copy()
agent_dim["Hire_Date"] = agent_dim.Hire_Date.astype(str)
agent_dim["Exit_Date"] = agent_dim.Exit_Date.map(lambda d: d.isoformat() if isinstance(d, dt.date) else None)
agent_dim["Tenure_Months_At_Data_End"] = agents.apply(
    lambda r: round(((r.Exit_Date or END) - r.Hire_Date).days / 30.4), axis=1)
agent_dim["Tenure_Band"] = pd.cut(agent_dim.Tenure_Months_At_Data_End, [-1, 2, 6, 12, 1000],
                                  labels=["Nesting (<3m)", "3-6m", "6-12m", "12m+"]).astype(str)

# ----------------------------------------------------------------------------------
# 17. Data dictionary, scenarios, sample questions, assumptions and questions
# ----------------------------------------------------------------------------------
def vals_or_range(s: pd.Series, dtype: str):
    s = s.dropna()
    if s.empty:
        return ""
    if dtype in ("Integer", "Float (AUD)", "Float") :
        return f"{s.min():,.0f} - {s.max():,.0f}" if dtype != "Float" else f"{s.min():.1f} - {s.max():.1f}"
    if dtype in ("Date", "Datetime"):
        return f"{s.min()} to {s.max()}"
    u = s.astype(str).unique()
    if len(u) <= 16:
        return " / ".join(sorted(u))
    return f"{len(u):,} distinct values"

DICT = [
    # sheet, field, type, category, description
    ("Telesales_Calls_Fact", "Call_ID", "String", "Core", "Unique call / conversation ID (12 digits, ascending with time)"),
    ("Telesales_Calls_Fact", "Call_Start_Datetime", "Datetime", "Core", "Call start, Australian Eastern time (YYYY-MM-DD HH:MM:SS)"),
    ("Telesales_Calls_Fact", "Call_Date", "Date", "Core", "Date of the call"),
    ("Telesales_Calls_Fact", "Week_Ending", "Date", "Core", "Reporting week ending Friday (weeks run Saturday to Friday, e.g. WE3010 = 2026-10-30)"),
    ("Telesales_Calls_Fact", "Month", "String", "Core", "Calendar month (YYYY-MM)"),
    ("Telesales_Calls_Fact", "Agent_ID", "String", "Agent", "Consultant ID (join to Agent_Dim)"),
    ("Telesales_Calls_Fact", "Team_Lead", "String", "Agent", "Consultant's team lead"),
    ("Telesales_Calls_Fact", "Agent_Tenure_Months", "Integer", "Agent", "Consultant tenure on the call date, in months (under 3 = nesting)"),
    ("Telesales_Calls_Fact", "Customer_ID", "String", "Customer", "Synthetic Optus customer ID (OPT-XXXXXXXX); repeat contacts share the ID"),
    ("Telesales_Calls_Fact", "Customer_Type", "String", "Customer", "New to Optus / Existing Optus customer"),
    ("Telesales_Calls_Fact", "Existing_Optus_Products", "String", "Customer", "Services the customer already holds with Optus at the time of the call"),
    ("Telesales_Calls_Fact", "State", "String", "Customer", "Australian state/territory"),
    ("Telesales_Calls_Fact", "Call_Direction", "String", "Core", "Inbound, or Outbound (callback) made by the consultant"),
    ("Telesales_Calls_Fact", "Call_Reason", "String", "Core", "Why the customer called (standardised from the FCR audit identifiers)"),
    ("Telesales_Calls_Fact", "Sales_Opportunity_Flag", "Y/N", "Sales", "Y if the call reason is a sales reason (new service, recontract, connected device)"),
    ("Telesales_Calls_Fact", "Handle_Time_Seconds", "Integer", "Core", "Talk + hold + wrap time in seconds"),
    ("Telesales_Calls_Fact", "Hold_Time_Seconds", "Integer", "Core", "Time on hold in seconds"),
    ("Telesales_Calls_Fact", "Call_Result", "String", "Sales", "Disposition: Sale / Callback / No Answer / Rejected (the four Optus records; Rejected = no sale)"),
    ("Telesales_Calls_Fact", "Sale_Flag", "Y/N", "Sales", "Y if the call closed at least one sale (see Sales_Orders for lines)"),
    ("Telesales_Calls_Fact", "Sales_Category", "String", "Sales", "Optus reporting category of the primary sale (null if no sale)"),
    ("Telesales_Calls_Fact", "Credit_Check_Result", "String", "Eligibility", "Jarvis eligibility result. Jarvis shows eligibility only, no credit score"),
    ("Telesales_Calls_Fact", "ID_Verification_Result", "String", "Eligibility", "Pass / Fail / Not run"),
    ("Telesales_Calls_Fact", "Port_In_Requested_Flag", "Y/N", "Eligibility", "Customer asked to bring their number from another provider"),
    ("Telesales_Calls_Fact", "Port_In_Status", "String", "Eligibility", "Completed / Not started / Failed - account number unavailable (null if no port-in)"),
    ("Telesales_Calls_Fact", "Lost_Sale_Flag", "Y/N", "Lost sales", "Y if the customer intended to buy and the sale did not close for an identified reason"),
    ("Telesales_Calls_Fact", "Lost_Sale_Driver", "String", "Lost sales", "Customer / People / System (null if not a lost sale)"),
    ("Telesales_Calls_Fact", "Lost_Sale_Reason", "String", "Lost sales", "Structured reason within the driver"),
    ("Telesales_Calls_Fact", "Callback_Promised_Flag", "Y/N", "Lost sales", "Consultant promised the customer a callback"),
    ("Telesales_Calls_Fact", "Jarvis_Error_Flag", "Y/N", "System", "A Jarvis error happened on the call"),
    ("Telesales_Calls_Fact", "Jarvis_Error_Type", "String", "System", "Type of Jarvis error (null if none)"),
    ("Telesales_Calls_Fact", "Jarvis_Ticket_ID", "String", "System", "Incident ticket raised for the error (null if not ticketed)"),
    ("Telesales_Calls_Fact", "Jarvis_Ticket_Resolution_Days", "Integer", "System", "Days from ticket to resolution"),
    ("Telesales_Calls_Fact", "Cross_Sell_Opportunity_Flag", "Y/N", "Cross-sell", "On a sale call, the customer lacks the complementary Optus service. Cross-sell started in August 2026: N before then"),
    ("Telesales_Calls_Fact", "Cross_Sell_Product", "String", "Cross-sell", "The product that could be cross-sold"),
    ("Telesales_Calls_Fact", "Cross_Sell_Attempted_Flag", "Y/N/NA", "Cross-sell", "Consultant offered the cross-sell. N/A if no opportunity"),
    ("Telesales_Calls_Fact", "Cross_Sell_Outcome", "String", "Cross-sell", "Sold / Declined / Not attempted / N/A"),
    ("Telesales_Calls_Fact", "Transfer_Flag", "Y/N", "FCR", "Call transferred to another team"),
    ("Telesales_Calls_Fact", "Transfer_Destination", "String", "FCR", "Optus queue the call was transferred to (Retention Voice, Service Voice, Service Prepaid Voice, ...)"),
    ("Telesales_Calls_Fact", "Transfer_Valid_Flag", "Y/N", "FCR", "N if the consultant could have resolved it (avoidable transfer)"),
    ("Telesales_Calls_Fact", "Invalid_Transfer_Reason", "String", "FCR", "Why the transfer was avoidable"),
    ("Telesales_Calls_Fact", "Repeat_14D_Flag", "Y/N", "FCR", "Same customer called again within 14 days"),
    ("Telesales_Calls_Fact", "Repeat_Timeline", "String", "FCR", "<1hr / >1hr between this call and the repeat contact"),
    ("Telesales_Calls_Fact", "Next_Contact_Call_ID", "String", "FCR", "Call ID of the repeat contact"),
    ("Telesales_Calls_Fact", "Is_Repeat_Contact_Flag", "Y/N", "FCR", "This call is itself a repeat of an earlier unresolved call"),
    ("Telesales_Calls_Fact", "Previous_Call_ID", "String", "FCR", "Earlier call this one repeats"),
    ("Telesales_Calls_Fact", "FCR_Outcome", "String", "FCR", "Achieved / Repeat / Transfer / Transfer & Repeat (as in the Concentrix FCR slide)"),
    ("Telesales_Calls_Fact", "FCR_Flag", "Y/N/NA", "FCR", "Y if not transferred and no repeat within 14 days. N/A for unanswered outbound calls"),
    ("Telesales_Calls_Fact", "FCR_Locked_Flag", "Y/N", "FCR", "Y once the 14-day repeat window has closed (FCR is final). N = unlocked"),
    ("Sales_Orders", "Order_ID", "String", "Core", "Unique order line"),
    ("Sales_Orders", "Call_ID", "String", "Core", "Call the sale was made on"),
    ("Sales_Orders", "Sale_Source", "String", "Sales", "Primary (what the customer called for) or Cross-sell"),
    ("Sales_Orders", "Sales_Category", "String", "Sales", "Optus reporting category"),
    ("Sales_Orders", "Product_Line", "String", "Sales", "Postpaid Mobile / NBN / 5G Home / 4G Home / Connected Device"),
    ("Sales_Orders", "Plan_Code", "String", "Sales", "Join to Product_Catalog"),
    ("Sales_Orders", "Monthly_Revenue", "Float (AUD)", "Revenue", "Monthly plan price at sale (promo price where a promo applies)"),
    ("Sales_Orders", "Standard_Monthly_Price", "Float (AUD)", "Revenue", "Monthly price after the promo ends"),
    ("Sales_Orders", "First_12M_Revenue", "Float (AUD)", "Revenue", "Plan revenue over the first 12 months"),
    ("Sales_Orders", "Device_Included_Flag", "Y/N", "Sales", "Recontract included a phone (device price not in the data)"),
    ("Elevate_Audits", "Overall_Score_Pct", "Float", "Quality", "Elevate audit score (%)"),
    ("Elevate_Audits", "Discovery_Probing_Score", "Integer", "Quality", "1 (poor) to 5 (excellent)"),
    ("Elevate_Audits", "Cross_Sell_Effectiveness", "String", "Quality", "Effective / Partially effective / Not effective / N/A (cross-sell fields are N/A before August 2026)"),
    ("Elevate_Audits", "Cross_Sell_Not_Attempted_Reason", "String", "Quality", "Structured reason when an opportunity was not attempted"),
    ("Elevate_Audits", "Auditor_Comments", "String", "Quality", "Free-text comment"),
    ("FCR_Audits", "Opportunity_Identifier", "String", "FCR", "People / Technology / Customer / Process"),
    ("FCR_Audits", "FCR_Identifier", "String", "FCR", "Topic of the unresolved call (as in the Optus FCR file)"),
    ("FCR_Audits", "Avoidable_Flag", "Y/N", "FCR", "Y if the repeat or transfer was within the consultant's or process's control"),
]
sheet_df = {"Telesales_Calls_Fact": fact, "Sales_Orders": sales, "Elevate_Audits": audits, "FCR_Audits": fcr_audits}
dd = pd.DataFrame([dict(Sheet=s, Field_Name=f, Data_Type=t, Category=c, Description=d,
                        Values_or_Range=vals_or_range(sheet_df[s][f], t)) for s, f, t, c, d in DICT])

def cnt(mask):
    return int(fact.loc[mask, "Customer_ID"].nunique())

f = fact
latest = f.Month.eq("2026-09")   # the last full month before the cutoff
s1 = latest & f.Sales_Category.eq(HM_NC) & f.Cross_Sell_Opportunity_Flag.eq("Y") & f.Cross_Sell_Attempted_Flag.eq("N")
s2 = latest & f.Jarvis_Error_Flag.eq("Y") & f.Lost_Sale_Flag.eq("Y")
s3 = latest & f.Repeat_14D_Flag.eq("Y") & f.Sales_Opportunity_Flag.eq("Y") & f.Sale_Flag.eq("N") & f.Is_Repeat_Contact_Flag.eq("N")
s4 = latest & f.Transfer_Valid_Flag.eq("N")
s5 = latest & f.Lost_Sale_Driver.eq("Customer")
scen = pd.DataFrame([
    dict(Scenario="Scenario 1: Missed Mobile Cross-Sell on NBN Sales",
         Business_Question="Home internet sales where the customer has no Optus mobile and the consultant did not offer one",
         Filter_Logic="Sales_Category='Total Home - New Connection' AND Cross_Sell_Opportunity_Flag='Y' AND Cross_Sell_Attempted_Flag='N'",
         Sep_2026_Calls=int(s1.sum())),
    dict(Scenario="Scenario 2: Jarvis Errors Blocking Sales",
         Business_Question="Sales lost to Jarvis errors: how many, which error types, how long tickets take, revenue at risk",
         Filter_Logic="Jarvis_Error_Flag='Y' AND Lost_Sale_Flag='Y'", Sep_2026_Calls=int(s2.sum())),
    dict(Scenario="Scenario 3: Lost Sales from Unresolved First Calls",
         Business_Question="First calls with a sales reason that did not close and brought the customer back within 14 days",
         Filter_Logic="Repeat_14D_Flag='Y' AND Sales_Opportunity_Flag='Y' AND Sale_Flag='N' AND Is_Repeat_Contact_Flag='N'",
         Sep_2026_Calls=int(s3.sum())),
    dict(Scenario="Scenario 4: Avoidable Transfers",
         Business_Question="Transfers the consultant could have resolved (Retention without checking plans, basic billing) and the FCR uplift from fixing them",
         Filter_Logic="Transfer_Valid_Flag='N'", Sep_2026_Calls=int(s4.sum())),
    dict(Scenario="Scenario 5: Customer Eligibility Blockers",
         Business_Question="Sales lost to failed credit check, failed ID verification or a missing port-in account number, by product and state",
         Filter_Logic="Lost_Sale_Driver='Customer'", Sep_2026_Calls=int(s5.sum())),
    dict(Scenario="Analytical: Conversion vs Target",
         Business_Question="Weekly new-sales and renewals conversion against target, by product, team lead and consultant",
         Filter_Logic="SUM(sales by category) / COUNT(calls) by Week_Ending vs Targets", Sep_2026_Calls="Analytical"),
    dict(Scenario="Analytical: Discovery Coaching",
         Business_Question="Consultants with low conversion and low Elevate discovery scores: who to coach first",
         Filter_Logic="Elevate_Audits.Discovery_Probing_Score <= 2 joined to conversion by Agent_ID", Sep_2026_Calls="Analytical"),
])

questions = pd.DataFrame([
    ("Trend", "What is the daily new sales conversion this month, and how does it compare with the 5.4% target?"),
    ("Trend", "Show weekly conversion for Postpaid Voice and Home new connections over the last 8 weeks."),
    ("Product", "Which product categories sold most last month, and what monthly revenue did they bring?"),
    ("Cross-sell", "How many NBN sales last month had no mobile cross-sell offered, and what would a 20% take-up be worth?"),
    ("Cross-sell", "Which consultants have the lowest cross-sell attempt rate on home internet sales?"),
    ("System", "How many sales were lost to Jarvis errors this month, and what is the conversion impact in points?"),
    ("System", "What is the average Jarvis ticket resolution time by error type?"),
    ("Lost sales", "Break down lost sales by driver (Customer, People, System) and reason."),
    ("Eligibility", "Which states have the highest failed credit check rate on new connections?"),
    ("FCR", "What is FCR achieved, repeat and transfer % by week ending?"),
    ("FCR", "What are the top transfer destinations and what share of transfers were avoidable?"),
    ("FCR", "How many repeat contacts closed a sale, and what is their conversion?"),
    ("Coaching", "Which team leads' teams have the lowest discovery scores in Elevate audits?"),
    ("Agent", "Do nesting consultants (under 3 months) convert less than tenured ones?"),
    ("Efficiency", "What is the average handle time for sale calls vs non-sale calls, by product?"),
], columns=["Theme", "Natural_Language_Question"])

assume = pd.DataFrame([
    ("Volume", "About 16,000 handled calls a month (about 3,700 a week)", "Derived: October sales at the slide's 4.0% new-sales and 3.3% renewals conversion; matches '134 of 3,716 contacts'", "PENDING (Optus to confirm): real monthly call volume, and is conversion over all handled calls?"),
    ("Period", "1 Nov 2025 to Tue 20 Oct 2026: 'today' is 20 October, with 11 days left in the month; September is the last full month; weeks Saturday to Friday", "Leaders review the dashboard in the last 10 days of the month; slide week labels (WE1109 = Fri 11 Sep 2026)", "-"),
    ("Sales", "October follows Optus's table (CD 27, Home Renewals 202, PV NC 186, PV Renewals 329) except Total Home NC, which follows the slide (459, about 10% above the table's 417); with the cut at 20 October only the first 20 days are shown", "TELESALESservices.docx; image (2).png", "CONFIRMED: the slide's Home figure (about 10% higher) is correct"),
    ("Sales", "The September slide weeks follow the slide's conversion by product exactly", "image (2).png", "-"),
    ("FCR", "Weekly FCR mix follows the slide (Achieved / Repeat / Transfer / Both); repeats within 14 days; <1hr 68% of repeats", "image (1).png, FCR file Timeline", "-"),
    ("FCR", "Transfer destinations: Optus's 26 queues. Retention Voice 37.7%, Service Voice 15.8%, Service Prepaid Voice 13.9% (slide); the other queues' shares are synthetic; about 15% avoidable", "image (1).png; Optus queue list (review meeting)", "PENDING (Optus to share): the share of transfers per queue"),
    ("Lost sales", "Drivers: Customer 43.3%, People 25.8%, System 30.9%; Jarvis-blocked sales about 0.6% of calls", "Michelle's email; review meeting", "CONFIRMED: the remaining 30.9% is system error"),
    ("Targets", "New sales conversion target 5.4%. Mobile 1.6%, renewals 3.5%, FCR 50%, cross-sell attempt 60%, AHT 900s are placeholders", "Slide (confirmed) + assumed", "CONFIRMED 5.4%. Other targets still placeholders"),
    ("Prices", "Mobile, NBN, 5G and 4G prices from the plan sheet; prices after the promo period are assumed (+$10, or the matching non-promo plan)", "TELESALESservices.docx screenshots", "DEFERRED: post-promo prices"),
    ("Prices", "Connected Device plans (Smartwatch $10, Tablet 30GB $35, Tablet 100GB $45) are placeholders", "Assumed", "DEFERRED: connected-device plans and prices"),
    ("Revenue", "Revenue = monthly plan price; no device repayments, one-off fees or modem charges", "Email asks for 'Monthly revenue'", "DEFERRED: device sales / repayments"),
    ("Call result", "Sale, Callback, No Answer, Rejected only. Transfers, Jarvis errors and eligibility are their own columns", "Meeting minutes email; review meeting", "CONFIRMED: these are the only call outcomes"),
    ("Cross-sell", "Cross-sell is new and consultants are in training: it starts in August 2026 and the attempt rate builds month by month; Elevate cross-sell fields are N/A before August", "Review meeting", "CONFIRMED: cross-sell is new, under training"),
    ("Team", "8 teams as in the FCR file: consultant names and IDs are real; team lead names are synthetic; performance, hire dates and calls synthetic; 3 former consultants with synthetic names", "FCR file; review meeting", "CONFIRMED: no real team lead names. PENDING: confirm real consultant names are fine"),
    ("Eligibility", "Credit check shows eligibility only (no credit score), as in Jarvis", "Email", "-"),
    ("Not in the data", "No CSAT/NPS, no in-call prompts, no channel shift to other channels, no IVR/queue wait time", "Email; review meeting", "CONFIRMED: no CSAT or NPS"),
], columns=["Area", "What_the_data_does", "Basis", "Question_for_the_team"])

# ----------------------------------------------------------------------------------
# 18. Write
# ----------------------------------------------------------------------------------
OUT_DIR.mkdir(exist_ok=True); CSV_DIR.mkdir(exist_ok=True)
sheets = {
    "Telesales_Calls_Fact": fact, "Sales_Orders": sales, "Product_Catalog": catalog, "Agent_Dim": agent_dim,
    "Targets": targets, "Elevate_Audits": audits, "FCR_Audits": fcr_audits,
    "Data_Dictionary": dd, "Scenario_Guide": scen, "Sample_BI_Questions": questions,
    "Assumptions_and_Questions": assume,
}
import xlsxwriter

# Streamed row by row (constant_memory) so a 190k-row sheet fits in little RAM
wb = xlsxwriter.Workbook(str(XLSX), {"constant_memory": True, "strings_to_numbers": False, "strings_to_urls": False})
hdr = wb.add_format({"bold": True, "bg_color": "#DDEBF7", "border": 1})
for name, df in sheets.items():
    ws = wb.add_worksheet(name)
    ws.freeze_panes(1, 0)
    ws.autofilter(0, 0, max(len(df), 1), len(df.columns) - 1)
    for c, col in enumerate(df.columns):
        sample = df[col].head(200).astype(str).str.len().max() if len(df) else 10
        ws.set_column(c, c, min(60, max(10, len(col) + 2, int(sample) + 2)))
    ws.write_row(0, 0, list(df.columns), hdr)
    for r, row in enumerate(df.itertuples(index=False, name=None), start=1):
        for c, v in enumerate(row):
            if v is None or (isinstance(v, float) and np.isnan(v)):
                continue
            if isinstance(v, (np.integer,)):
                v = int(v)
            elif isinstance(v, (np.floating,)):
                v = float(v)
            elif isinstance(v, (dt.date, pd.Timestamp)):
                v = str(v)
            ws.write(r, c, v)
wb.close()
for name, df in sheets.items():
    df.to_csv(CSV_DIR / f"{name}.csv", index=False)

print(f"Wrote {XLSX}")
for name, df in sheets.items():
    print(f"  {name:28s} {len(df):>8,} rows x {len(df.columns)} cols")
