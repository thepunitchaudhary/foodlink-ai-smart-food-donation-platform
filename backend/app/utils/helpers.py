import math
from datetime import datetime


def format_datetime(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def km_to_readable(km: float) -> str:
    if km < 1:
        return f"{int(km * 1000)}m"
    return f"{round(km, 1)}km"
