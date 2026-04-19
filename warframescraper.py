import json
import re
from bs4 import BeautifulSoup

def scrape_warframe_data(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        soup = BeautifulSoup(f, 'html.parser')

    all_data = []
    current_category = "General"
    
    # Common mission types to look for in strings
    mission_types = ["Survival", "Defense", "Interception", "Spy", "Excavation", "Defection", "Disruption", "Exterminate", "Assassination"]

    for element in soup.body.find_all(['h3', 'table']):
        if element.name == 'h3':
            current_category = element.get_text(strip=True).replace(':', '')
            continue
            
        if element.name == 'table':
            current_location = "Unknown"
            current_rotation = "N/A"
            
            rows = element.find_all('tr')
            for row in rows:
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
                if len(td_cells) < 2: continue
                
                # Logic to split Planet, Mission, and Type
                planet = "Other"
                mission_name = current_location
                found_type = "Misc"

                if "/" in current_location:
                    parts = current_location.split('/', 1)
                    planet = parts[0].strip()
                    mission_name = parts[1].strip()

                # Extract mission type from brackets or string
                for m_type in mission_types:
                    if m_type.lower() in current_location.lower():
                        found_type = m_type
                        break

                item_name = td_cells[1].get_text(strip=True) if len(td_cells) >= 3 and td_cells[0].get_text(strip=True) == "" else td_cells[0].get_text(strip=True)
                drop_chance = td_cells[2].get_text(strip=True) if len(td_cells) >= 3 and td_cells[0].get_text(strip=True) == "" else td_cells[1].get_text(strip=True)

                all_data.append({
                    "category": current_category,
                    "planet": planet,
                    "mission": mission_name,
                    "type": found_type,
                    "rotation": current_rotation,
                    "item": item_name,
                    "chance": drop_chance
                })
    return all_data

if __name__ == "__main__":
    data = scrape_warframe_data('drops.html')
    with open('warframe_data.json', 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)