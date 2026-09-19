"""
Seeds a starter catalog (categories -> subcategories -> services) if the
categories table is empty. Safe to import/call on every startup — it's a
no-op once any category exists, so an admin's own edits are never
overwritten by a redeploy.
"""
from sqlalchemy.orm import Session

from app.models import Category, Subcategory, Service, PricingType

SEED = [
    {
        "name": "Home Repair", "slug": "home-repair", "icon": "🔧",
        "subcategories": [
            {"name": "Electrical", "slug": "electrical", "services": [
                {"name": "Electrician (general)", "slug": "electrician", "pricing_type": PricingType.HOURLY, "starting_price": 200},
                {"name": "Fan Installation", "slug": "fan-installation", "pricing_type": PricingType.FIXED, "starting_price": 250},
                {"name": "Inverter Installation", "slug": "inverter-installation", "pricing_type": PricingType.QUOTE},
            ]},
            {"name": "Plumbing", "slug": "plumbing", "services": [
                {"name": "Plumber (general)", "slug": "plumber", "pricing_type": PricingType.HOURLY, "starting_price": 200},
                {"name": "Leak Repair", "slug": "leak-repair", "pricing_type": PricingType.INSPECTION},
            ]},
            {"name": "Appliance Repair", "slug": "appliance-repair", "services": [
                {"name": "AC Repair", "slug": "ac-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "Refrigerator Repair", "slug": "refrigerator-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "Washing Machine Repair", "slug": "washing-machine-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "Geyser Repair", "slug": "geyser-repair", "pricing_type": PricingType.INSPECTION},
            ]},
        ],
    },
    {
        "name": "Cleaning", "slug": "cleaning", "icon": "🧹",
        "subcategories": [
            {"name": "Home Cleaning", "slug": "home-cleaning", "services": [
                {"name": "Full Home Cleaning", "slug": "full-home-cleaning", "pricing_type": PricingType.QUOTE},
                {"name": "Bathroom Cleaning", "slug": "bathroom-cleaning", "pricing_type": PricingType.FIXED, "starting_price": 300},
                {"name": "Sofa Cleaning", "slug": "sofa-cleaning", "pricing_type": PricingType.PER_UNIT, "starting_price": 150},
            ]},
            {"name": "Pest & Garden", "slug": "pest-garden", "services": [
                {"name": "Pest Control", "slug": "pest-control", "pricing_type": PricingType.QUOTE},
                {"name": "Gardener", "slug": "gardener", "pricing_type": PricingType.HOURLY, "starting_price": 150},
            ]},
        ],
    },
    {
        "name": "Vehicle Services", "slug": "vehicle-services", "icon": "🚗",
        "subcategories": [
            {"name": "Two Wheeler", "slug": "two-wheeler", "services": [
                {"name": "Bike Repair", "slug": "bike-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "Bike Wash", "slug": "bike-wash", "pricing_type": PricingType.FIXED, "starting_price": 100},
                {"name": "Puncture Repair", "slug": "puncture-repair", "pricing_type": PricingType.FIXED, "starting_price": 50},
            ]},
            {"name": "Four Wheeler", "slug": "four-wheeler", "services": [
                {"name": "Car Repair", "slug": "car-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "Car Wash", "slug": "car-wash", "pricing_type": PricingType.FIXED, "starting_price": 200},
                {"name": "Towing", "slug": "towing", "pricing_type": PricingType.PER_KM},
                {"name": "Battery/Jumper Service", "slug": "battery-jumper", "pricing_type": PricingType.QUOTE},
            ]},
        ],
    },
    {
        "name": "Health", "slug": "health", "icon": "🩺",
        "subcategories": [
            {"name": "Medical", "slug": "medical", "services": [
                {"name": "Doctor (home visit)", "slug": "doctor", "pricing_type": PricingType.FIXED, "starting_price": 500},
                {"name": "Nurse", "slug": "nurse", "pricing_type": PricingType.HOURLY},
                {"name": "Physiotherapist", "slug": "physiotherapist", "pricing_type": PricingType.HOURLY},
                {"name": "Lab Test / Sample Collection", "slug": "lab-test", "pricing_type": PricingType.FIXED},
                {"name": "Ambulance", "slug": "ambulance", "pricing_type": PricingType.QUOTE},
            ]},
        ],
    },
    {
        "name": "Personal Services", "slug": "personal-services", "icon": "💇",
        "subcategories": [
            {"name": "Grooming", "slug": "grooming", "services": [
                {"name": "Barber", "slug": "barber", "pricing_type": PricingType.FIXED, "starting_price": 100},
                {"name": "Beautician", "slug": "beautician", "pricing_type": PricingType.QUOTE},
                {"name": "Makeup Artist", "slug": "makeup-artist", "pricing_type": PricingType.QUOTE},
            ]},
            {"name": "Household Help", "slug": "household-help", "services": [
                {"name": "Cook", "slug": "cook", "pricing_type": PricingType.NEGOTIABLE},
                {"name": "Maid", "slug": "maid", "pricing_type": PricingType.NEGOTIABLE},
                {"name": "Tailor", "slug": "tailor", "pricing_type": PricingType.PER_UNIT},
                {"name": "Laundry / Dry Cleaning", "slug": "laundry", "pricing_type": PricingType.PER_UNIT},
            ]},
        ],
    },
    {
        "name": "Events", "slug": "events", "icon": "🎉",
        "subcategories": [
            {"name": "Celebrations", "slug": "celebrations", "services": [
                {"name": "Birthday Decoration", "slug": "birthday-decoration", "pricing_type": PricingType.QUOTE},
                {"name": "Photographer", "slug": "photographer", "pricing_type": PricingType.QUOTE},
                {"name": "DJ / Sound System", "slug": "dj-sound", "pricing_type": PricingType.QUOTE},
                {"name": "Catering", "slug": "catering", "pricing_type": PricingType.PER_UNIT},
                {"name": "Pandit / Priest", "slug": "pandit", "pricing_type": PricingType.FIXED},
            ]},
        ],
    },
    {
        "name": "Technology", "slug": "technology", "icon": "💻",
        "subcategories": [
            {"name": "Repair", "slug": "tech-repair", "services": [
                {"name": "Mobile Repair", "slug": "mobile-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "Laptop Repair", "slug": "laptop-repair", "pricing_type": PricingType.INSPECTION},
                {"name": "CCTV Installation", "slug": "cctv-installation", "pricing_type": PricingType.QUOTE},
                {"name": "Wi-Fi / Internet Setup", "slug": "wifi-setup", "pricing_type": PricingType.QUOTE},
            ]},
        ],
    },
    {
        "name": "Local & Transport", "slug": "local-transport", "icon": "🚚",
        "subcategories": [
            {"name": "Moving & Delivery", "slug": "moving-delivery", "services": [
                {"name": "Packers & Movers", "slug": "packers-movers", "pricing_type": PricingType.QUOTE},
                {"name": "Local Delivery", "slug": "local-delivery", "pricing_type": PricingType.PER_KM},
                {"name": "Water Tanker", "slug": "water-tanker", "pricing_type": PricingType.FIXED},
                {"name": "Tractor / JCB", "slug": "tractor-jcb", "pricing_type": PricingType.HOURLY},
            ]},
        ],
    },
    {
        "name": "Fitness, Sports & Coaching", "slug": "fitness-sports-coaching", "icon": "🏋️",
        "subcategories": [
            {"name": "Fitness Training", "slug": "fitness-training", "services": [
                {"name": "Gym Trainer", "slug": "gym-trainer", "pricing_type": PricingType.HOURLY, "starting_price": 300},
                {"name": "Personal Trainer (home visit)", "slug": "personal-trainer", "pricing_type": PricingType.HOURLY, "starting_price": 400},
                {"name": "Yoga Instructor", "slug": "yoga-instructor", "pricing_type": PricingType.HOURLY, "starting_price": 250},
                {"name": "Zumba/Aerobics Trainer", "slug": "zumba-trainer", "pricing_type": PricingType.HOURLY},
            ]},
            {"name": "Sports Coaching", "slug": "sports-coaching", "services": [
                {"name": "Sports Trainer (general)", "slug": "sports-trainer", "pricing_type": PricingType.HOURLY, "starting_price": 300},
                {"name": "Cricket Coach", "slug": "cricket-coach", "pricing_type": PricingType.HOURLY},
                {"name": "Football Coach", "slug": "football-coach", "pricing_type": PricingType.HOURLY},
                {"name": "Badminton Coach", "slug": "badminton-coach", "pricing_type": PricingType.HOURLY},
                {"name": "Swimming Instructor", "slug": "swimming-instructor", "pricing_type": PricingType.HOURLY, "starting_price": 350},
            ]},
            {"name": "Performing Arts", "slug": "performing-arts", "services": [
                {"name": "Dance Teacher", "slug": "dance-teacher", "pricing_type": PricingType.HOURLY, "starting_price": 300},
                {"name": "Music Teacher", "slug": "music-teacher", "pricing_type": PricingType.HOURLY, "starting_price": 300},
                {"name": "Singing Coach", "slug": "singing-coach", "pricing_type": PricingType.HOURLY},
            ]},
        ],
    },
    {
        "name": "Education & Tutoring", "slug": "education-tutoring", "icon": "📚",
        "subcategories": [
            {"name": "Academic", "slug": "academic-tutoring", "services": [
                {"name": "Home Tutor (school subjects)", "slug": "home-tutor", "pricing_type": PricingType.HOURLY, "starting_price": 200},
                {"name": "Spoken English Coach", "slug": "spoken-english", "pricing_type": PricingType.HOURLY},
                {"name": "Computer Classes", "slug": "computer-classes", "pricing_type": PricingType.HOURLY},
                {"name": "Competitive Exam Coaching", "slug": "exam-coaching", "pricing_type": PricingType.HOURLY},
            ]},
        ],
    },
]


def seed_catalog_if_empty(db: Session) -> None:
    if db.query(Category).first() is not None:
        return  # already seeded (or an admin has already started managing it) — never overwrite

    for order, cat_data in enumerate(SEED):
        category = Category(
            name=cat_data["name"], slug=cat_data["slug"], icon=cat_data["icon"], sort_order=order,
        )
        db.add(category)
        db.flush()  # get category.id without a full commit

        for sub_order, sub_data in enumerate(cat_data["subcategories"]):
            subcategory = Subcategory(
                category_id=category.id, name=sub_data["name"], slug=sub_data["slug"], sort_order=sub_order,
            )
            db.add(subcategory)
            db.flush()

            for svc_order, svc_data in enumerate(sub_data["services"]):
                db.add(Service(
                    subcategory_id=subcategory.id,
                    name=svc_data["name"],
                    slug=svc_data["slug"],
                    pricing_type=svc_data["pricing_type"],
                    starting_price=svc_data.get("starting_price"),
                    sort_order=svc_order,
                ))

    db.commit()
