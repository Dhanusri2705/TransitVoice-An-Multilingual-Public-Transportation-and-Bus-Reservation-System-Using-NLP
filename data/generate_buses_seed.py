import json
import csv
import random
from datetime import datetime, timedelta

cities_coords = {
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Trichy": (10.7905, 78.7047),
    "Salem": (11.6643, 78.1460),
    "Bangalore": (12.9716, 77.5946),
    "Mysore": (12.2958, 76.6394),
    "Tiruppur": (11.1085, 77.3411),
    "Erode": (11.3410, 77.7172),
    "Tirunelveli": (8.7139, 77.7567),
    "Thoothukudi": (8.7642, 78.1348),
    "Kochi": (9.9312, 76.2673),
    "Hyderabad": (17.3850, 78.4867),
    "Pondicherry": (11.9416, 79.8083)
}

operators = [
    ("OP-101", "SRS Travels"),
    ("OP-102", "KPN Travels"),
    ("OP-103", "VRL Travels"),
    ("OP-104", "Orange Travels"),
    ("OP-105", "IntrCity SmartBus"),
    ("OP-106", "Parveen Travels")
]

bus_types = [
    ("AC Sleeper", 1100, 30),
    ("Non-AC Sleeper", 750, 32),
    ("AC Seater", 650, 40),
    ("Non-AC Seater", 450, 44),
    ("Volvo Multi-Axle", 1250, 36),
    ("Electric Bus", 900, 36)
]

amenities_pool = ["WiFi", "Charging Point", "Water Bottle", "Blanket", "Reading Light", "Emergency Exit", "Live Tracking", "CCTV", "Snacks"]

routes_pair = [
    ("Chennai", "Coimbatore"), ("Coimbatore", "Chennai"),
    ("Chennai", "Madurai"), ("Madurai", "Chennai"),
    ("Bangalore", "Chennai"), ("Chennai", "Bangalore"),
    ("Bangalore", "Coimbatore"), ("Coimbatore", "Bangalore"),
    ("Chennai", "Trichy"), ("Trichy", "Chennai"),
    ("Coimbatore", "Madurai"), ("Madurai", "Coimbatore"),
    ("Bangalore", "Hyderabad"), ("Hyderabad", "Bangalore"),
    ("Chennai", "Pondicherry"), ("Pondicherry", "Chennai"),
    ("Chennai", "Salem"), ("Salem", "Chennai"),
    ("Bangalore", "Mysore"), ("Mysore", "Bangalore"),
    ("Coimbatore", "Kochi"), ("Kochi", "Coimbatore"),
    ("Madurai", "Tirunelveli"), ("Tirunelveli", "Madurai")
]

buses = []

random.seed(42)

for i in range(1, 125):
    bus_id = f"TV-{i:05d}"
    tn_num = f"TN-{random.randint(10,99)}-{chr(65+random.randint(0,25))}{chr(65+random.randint(0,25))}-{random.randint(1000,9999)}"
    op_id, op_name = random.choice(operators)
    b_type, base_fare, total_seats = random.choice(bus_types)
    src, dst = random.choice(routes_pair)
    
    # Departure times
    dep_hour = random.choice([6, 7, 8, 9, 13, 15, 17, 19, 20, 21, 22, 23])
    dep_min = random.choice([0, 15, 30, 45])
    duration_hrs = random.randint(5, 11)
    
    dep_time_str = f"{dep_hour:02d}:{dep_min:02d}"
    arr_hour = (dep_hour + duration_hrs) % 24
    arr_min = (dep_min + random.choice([0, 15, 30])) % 60
    arr_time_str = f"{arr_hour:02d}:{arr_min:02d}"
    duration_str = f"{duration_hrs}h {random.randint(10,50)}m"
    
    fare = base_fare + random.randint(-50, 150)
    avail_seats = random.randint(5, total_seats - 2)
    
    # Boarding points
    b_pts = [f"{src} Main Stand", f"{src} Bypass", f"{src} Toll Gate"]
    d_pts = [f"{dst} Central Bus Terminus", f"{dst} Bypass Drop", f"{dst} City Center"]
    
    selected_amenities = random.sample(amenities_pool, random.randint(4, 7))
    rating = round(random.uniform(4.0, 4.9), 1)
    reviews_cnt = random.randint(45, 320)
    
    src_lat, src_lng = cities_coords[src]
    dst_lat, dst_lng = cities_coords[dst]
    
    # Current simulated bus position halfway
    progress = random.uniform(0.1, 0.9)
    cur_lat = round(src_lat + (dst_lat - src_lat) * progress, 4)
    cur_lng = round(src_lng + (dst_lng - src_lng) * progress, 4)
    
    bus_record = {
        "bus_id": bus_id,
        "bus_number": tn_num,
        "operator_id": op_id,
        "operator_name": op_name,
        "bus_type": b_type,
        "source": src,
        "destination": dst,
        "route": f"{src} -> {dst}",
        "departure_date": "2026-10-01",
        "departure_time": dep_time_str,
        "arrival_time": arr_time_str,
        "journey_duration": duration_str,
        "fare": fare,
        "available_seats": avail_seats,
        "total_seats": total_seats,
        "boarding_points": b_pts,
        "dropping_points": d_pts,
        "amenities": selected_amenities,
        "rating": rating,
        "review_count": reviews_cnt,
        "bus_status": random.choice(["ON TIME", "ON TIME", "ON TIME", "DELAYED 15 MIN", "EN ROUTE"]),
        "latitude": cur_lat,
        "longitude": cur_lng,
        "src_latitude": src_lat,
        "src_longitude": src_lng,
        "dst_latitude": dst_lat,
        "dst_longitude": dst_lng,
        "estimated_arrival": f"{duration_hrs - 1} hrs remaining",
        "cancellation_policy": "Full refund up to 24 hrs prior to departure. 50% refund 6-24 hrs prior.",
        "contact_number": "+91 9876543210"
    }
    buses.append(bus_record)

with open("c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/data/buses.json", "w", encoding="utf-8") as f:
    json.dump(buses, f, indent=2)

# Write CSV as well for pandas / NLP QA
with open("c:/Users/dhanu/OneDrive/Desktop/TransitVoiceA/data/buses.csv", "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=list(buses[0].keys()))
    writer.writeheader()
    for b in buses:
        row = b.copy()
        row["boarding_points"] = "|".join(row["boarding_points"])
        row["dropping_points"] = "|".join(row["dropping_points"])
        row["amenities"] = "|".join(row["amenities"])
        writer.writerow(row)

print(f"Generated {len(buses)} realistic bus records successfully.")
