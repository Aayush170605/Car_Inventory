"""Local administrative commands; no public endpoint can grant admin access."""
import argparse
import os
from decimal import Decimal
from dotenv import load_dotenv
from .database import DomainError, Store
from .models import VehicleCreate

SAMPLES = [
    ("Toyota", "Camry", "Sedan", "28900.00", 6),
    ("Volvo", "XC60", "SUV", "47900.00", 3),
    ("BMW", "320i", "Sedan", "44200.00", 4),
    ("Volkswagen", "Golf", "Hatchback", "26900.00", 0),
    ("Hyundai", "Ioniq 5", "Electric", "41900.00", 5),
    ("Land Rover", "Defender", "SUV", "58900.00", 2),
]


def main():
    load_dotenv()
    parser = argparse.ArgumentParser(description="Manage your local Motorlane database")
    commands = parser.add_subparsers(dest="command", required=True)
    promote = commands.add_parser("promote", help="Promote an already registered account to admin")
    promote.add_argument("email")
    commands.add_parser("seed", help="Add six illustrative vehicles to an empty inventory")
    args = parser.parse_args()
    store = Store(os.getenv("DATABASE_PATH", "./inventory.db"))
    try:
        if args.command == "promote":
            store.promote(args.email)
            print(f"Administrator access granted to {args.email}")
        else:
            if store.list_vehicles():
                parser.exit(message="Inventory is not empty; seed skipped.\n")
            for make, model, category, price, quantity in SAMPLES:
                store.create_vehicle(VehicleCreate(make=make, model=model, category=category, price=Decimal(price), quantity=quantity))
            print("Added six demo vehicles. Prices are illustrative, not market quotations.")
    except DomainError as error:
        parser.exit(1, error.detail + "\n")


if __name__ == "__main__":
    main()
