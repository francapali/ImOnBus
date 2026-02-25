"""
Process the safety datasets and output a JSON file for the frontend.
"""
import pandas as pd
import json
import math

BASE = r"c:\Users\Blue\Documents\UNIVERSITA\delete\...____AI\ImOnBus\dataset"

# ============================================================
# 1) Survey data - neighborhood risk scores
# ============================================================
df = pd.read_csv(f"{BASE}/resource_sicurezza.csv")

# Find the quartiere column
quartiere_col = [c for c in df.columns if 'quartiere_abita' in c.lower() or 'quale_quartiere' in c.lower()]
print("Quartiere columns found:", quartiere_col)

# Find safety-relevant problem columns ("scala_1" columns are the yes/no, "scala_2" are the intensity)
problem_cols_yes = [c for c in df.columns if 'problemiquartiere' in c.lower() and 'scala_1' in c.lower()]
problem_cols_intensity = [c for c in df.columns if 'problemiquartiere' in c.lower() and 'scala_2' in c.lower()]

print(f"\nFound {len(problem_cols_yes)} problem yes/no columns")
print(f"Found {len(problem_cols_intensity)} problem intensity columns")

# Key safety columns for child routing
# We focus on: spaccio, famiglie criminali, ragazzini in strada, scarsa illuminazione, degrado marciapiedi
key_problems = {
    'spaccio': [c for c in problem_cols_yes if 'spaccio' in c.lower()],
    'criminali': [c for c in problem_cols_yes if 'criminal' in c.lower()],
    'ragazzini': [c for c in problem_cols_yes if 'ragazzini' in c.lower()],
    'illuminazione': [c for c in problem_cols_yes if 'illuminaz' in c.lower()],
    'degrado_marciapiedi': [c for c in problem_cols_yes if 'marciapiedi' in c.lower()],
    'barboni': [c for c in problem_cols_yes if 'barboni' in c.lower()],
}

key_intensity = {
    'spaccio': [c for c in problem_cols_intensity if 'spaccio' in c.lower()],
    'criminali': [c for c in problem_cols_intensity if 'criminal' in c.lower()],
    'ragazzini': [c for c in problem_cols_intensity if 'ragazzini' in c.lower()],
    'illuminazione': [c for c in problem_cols_intensity if 'illuminaz' in c.lower()],
    'degrado_marciapiedi': [c for c in problem_cols_intensity if 'marciapiedi' in c.lower()],
    'barboni': [c for c in problem_cols_intensity if 'barboni' in c.lower()],
}

print("\nKey problem columns:")
for k, v in key_problems.items():
    print(f"  {k}: {v}")

# Use the first quartiere column
q_col = quartiere_col[0] if quartiere_col else None
if not q_col:
    # Fallback: search for quartiere in all columns
    for c in df.columns:
        if 'quartiere' in c.lower():
            q_col = c
            break

print(f"\nUsing quartiere column: {q_col}")
print(f"Unique neighborhoods: {df[q_col].nunique()}")

# For each neighborhood, compute risk score
# intensity mapping: "Molto" -> 1.0, "Abbastanza" -> 0.7, "Poco" -> 0.3, "Per nulla" -> 0.0
intensity_map = {
    'Molto': 1.0,
    'Moltissimo': 1.0,
    'Abbastanza': 0.7,
    'Poco': 0.3,
    'Per nulla': 0.0,
}

# yes/no mapping
yes_map = {'Sì': 1.0, 'No': 0.0, 'Si': 1.0}

neighborhood_scores = {}

for quartiere, group in df.groupby(q_col):
    scores = {}
    
    for problem_name, cols in key_problems.items():
        if cols:
            # Count "Sì" responses
            col = cols[0]
            yes_rate = group[col].map(yes_map).mean()
            scores[f'{problem_name}_rate'] = round(yes_rate, 3) if not pd.isna(yes_rate) else 0.0
    
    for problem_name, cols in key_intensity.items():
        if cols:
            col = cols[0]
            intensity = group[col].map(intensity_map).mean()
            scores[f'{problem_name}_intensity'] = round(intensity, 3) if not pd.isna(intensity) else 0.0
    
    # Compute overall risk score (0-1, higher = more dangerous)
    weights = {
        'spaccio_rate': 0.25,
        'criminali_rate': 0.25,
        'ragazzini_rate': 0.15,
        'illuminazione_rate': 0.15,
        'degrado_marciapiedi_rate': 0.10,
        'barboni_rate': 0.10,
    }
    
    risk = sum(scores.get(k, 0) * w for k, w in weights.items())
    scores['risk_score'] = round(risk, 3)
    scores['count'] = len(group)
    
    neighborhood_scores[quartiere] = scores

# Print sorted by risk
print("\n=== NEIGHBORHOOD RISK SCORES ===")
for q, s in sorted(neighborhood_scores.items(), key=lambda x: x[1]['risk_score'], reverse=True):
    print(f"  {q:30s} risk={s['risk_score']:.3f} (n={s['count']})")

# ============================================================
# 2) Incident data 2023 - lat/lon grid
# ============================================================
df_2023 = pd.read_csv(f"{BASE}/incidenti_2023.csv")
lat_col = [c for c in df_2023.columns if 'latit' in c.lower()][0]
lon_col = [c for c in df_2023.columns if 'longit' in c.lower()][0]

# Filter to Bari area
mask = (df_2023[lat_col] >= 41.02) & (df_2023[lat_col] <= 41.17) & \
       (df_2023[lon_col] >= 16.72) & (df_2023[lon_col] <= 17.08)
df_bari = df_2023[mask].copy()

print(f"\n2023 incidents in Bari: {len(df_bari)}")

# Create grid (0.003 lat x 0.004 lon ≈ 330m x 350m)
GRID_LAT = 0.003
GRID_LON = 0.004

def grid_key(lat, lon):
    glat = round(math.floor(lat / GRID_LAT) * GRID_LAT, 4)
    glon = round(math.floor(lon / GRID_LON) * GRID_LON, 4)
    return f"{glat},{glon}"

grid_counts = {}
for _, row in df_bari.iterrows():
    key = grid_key(row[lat_col], row[lon_col])
    grid_counts[key] = grid_counts.get(key, 0) + 1

print(f"Grid cells with incidents: {len(grid_counts)}")
print(f"Max incidents in a cell: {max(grid_counts.values())}")

# Also extract raw incident points for heatmap (just lat, lon)
incident_points = []
for _, row in df_bari.iterrows():
    incident_points.append([round(row[lat_col], 5), round(row[lon_col], 5)])

# ============================================================
# 3) Sinistri 2017 - street danger scores
# ============================================================
df_2017 = pd.read_csv(f"{BASE}/sinistri_2017.csv")
street_col = [c for c in df_2017.columns if 'denominaz' in c.lower()][0]

street_incidents = df_2017[street_col].value_counts().to_dict()
# Only keep streets with 2+ incidents
street_danger = {k: v for k, v in street_incidents.items() if v >= 2 and pd.notna(k)}
print(f"\nStreets with 2+ incidents (2017): {len(street_danger)}")

# ============================================================
# 4) Unsafe places from survey
# ============================================================
unsafe_places_cols = [c for c in df.columns if 'luoghiinsicurezza' in c.lower()]
print(f"\nUnsafe places columns: {len(unsafe_places_cols)}")

unsafe_places = {}
for col in unsafe_places_cols:
    # Extract place name from column
    parts = col.split('_')
    # Count "Selezionato" responses
    selected = (df[col] == 'Selezionato').sum()
    unsafe_places[col] = selected

print("Unsafe places (selected count):")
for k, v in sorted(unsafe_places.items(), key=lambda x: x[1], reverse=True):
    print(f"  {k}: {v}")

# ============================================================
# 5) Output JSON
# ============================================================
output = {
    'neighborhoodScores': neighborhood_scores,
    'incidentGrid': grid_counts,
    'gridConfig': {'latStep': GRID_LAT, 'lonStep': GRID_LON},
    'dangerousStreets': street_danger,
    'incidentPoints2023': incident_points[:500],  # First 500 for heatmap
}

output_path = r"c:\Users\Blue\Documents\UNIVERSITA\delete\...____AI\ImOnBus\src\data\safetyData.json"
import os
os.makedirs(os.path.dirname(output_path), exist_ok=True)

with open(output_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"\nOutput written to {output_path}")
print(f"File size: {os.path.getsize(output_path) / 1024:.1f} KB")
