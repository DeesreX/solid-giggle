import argparse
import json
import os
from bs4 import BeautifulSoup

MISSION_TYPES = [
    "Survival", "Defense", "Interception", "Spy", "Excavation", "Defection",
    "Disruption", "Exterminate", "Assassination", "Capture", "Rescue",
    "Sabotage", "Hijack", "Pursuit", "Mobile Defense", "Alchemy", "Arena"
]

MANUAL_NODE_FALLBACKS = [
    {"planet": "Earth", "mission": "E Prime (Exterminate)", "type": "Exterminate"},
    {"planet": "Neptune", "mission": "Neso (Exterminate)", "type": "Exterminate"}
]


def infer_type(location_text):
    lowered = location_text.lower()
    for mission_type in MISSION_TYPES:
        if mission_type.lower() in lowered:
            return mission_type
    return "Misc"


def scrape_warframe_data(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    all_data = []
    current_category = "General"

    for element in soup.body.find_all(['h3', 'table']):
        if element.name == 'h3':
            current_category = element.get_text(strip=True).replace(':', '')
            continue

        current_location = "Unknown"
        current_rotation = "N/A"

        for row in element.find_all('tr'):
            th_cells = row.find_all('th')
            if th_cells:
                header_text = th_cells[0].get_text(strip=True)
                if any(rot in header_text for rot in ['Rotation A', 'Rotation B', 'Rotation C']):
                    current_rotation = header_text
                else:
                    current_location = header_text
                    current_rotation = "N/A"
                continue

            td_cells = row.find_all('td')
            if len(td_cells) < 2:
                continue

            planet = "Other"
            mission_name = current_location
            found_type = infer_type(current_location)

            if "/" in current_location:
                parts = current_location.split('/', 1)
                planet = parts[0].strip()
                mission_name = parts[1].strip()

            if len(td_cells) >= 3 and td_cells[0].get_text(strip=True) == "":
                item_name = td_cells[1].get_text(strip=True)
                drop_chance = td_cells[2].get_text(strip=True)
            else:
                item_name = td_cells[0].get_text(strip=True)
                drop_chance = td_cells[1].get_text(strip=True)

            all_data.append({
                "category": current_category,
                "planet": planet,
                "mission": mission_name,
                "type": found_type,
                "rotation": current_rotation,
                "item": item_name,
                "chance": drop_chance
            })

    mission_keys = {(entry['planet'], entry['mission']) for entry in all_data}
    for fallback in MANUAL_NODE_FALLBACKS:
        key = (fallback['planet'], fallback['mission'])
        if key in mission_keys:
            continue
        all_data.append({
            "category": "Node fallback",
            "planet": fallback['planet'],
            "mission": fallback['mission'],
            "type": fallback['type'],
            "rotation": "N/A",
            "item": "No drop rewards left",
            "chance": "N/A",
            "isNoDropPlaceholder": True
        })

    return all_data


def resolve_input_path(cli_value):
    if cli_value:
        return cli_value

    for candidate in ['Warframe PC Drops.html', 'drops.html']:
        if os.path.exists(candidate):
            return candidate

    raise FileNotFoundError('No input HTML found. Provide --input or add drops.html.')


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Scrape warframe drop table HTML into JSON.')
    parser.add_argument('--input', help='Path to source HTML file')
    parser.add_argument('--output', default='warframe_data.json', help='Output JSON path')
    args = parser.parse_args()

    input_path = resolve_input_path(args.input)
    data = scrape_warframe_data(input_path)

    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
