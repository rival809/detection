def levenshtein(a: str, b: str) -> int:
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a):
        curr = [i + 1]
        for j, cb in enumerate(b):
            curr.append(min(prev[j + 1] + 1, curr[j] + 1, prev[j] + (ca != cb)))
        prev = curr
    return prev[-1]


def deduplicate(detections: list[dict], similarity_threshold: int = 2) -> list[dict]:
    """
    detections: list of { plate_number, confidence, ... }
    Returns one detection per unique plate (highest confidence wins).
    Plates with edit distance <= similarity_threshold are treated as the same plate.
    """
    groups: list[list[dict]] = []

    for det in detections:
        plate = det["plate_number"]
        matched = False
        for group in groups:
            rep = group[0]["plate_number"]
            if levenshtein(plate, rep) <= similarity_threshold:
                group.append(det)
                matched = True
                break
        if not matched:
            groups.append([det])

    return [max(group, key=lambda d: d["confidence"]) for group in groups]
