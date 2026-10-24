from fastapi import FastAPI


def create_app(db_path=None, secret=None):
    return FastAPI(title="Car Inventory")
