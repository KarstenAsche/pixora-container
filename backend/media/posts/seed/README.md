# DevSecOps Seed-Bilder

40 Bilder, 1080x1080 PNG, 10 Themen-Accounts x 4 Motive
(2x Poster, 1x Terminal-Screenshot, 1x Diagramm).

Ordner = ein Account. `manifest.json` enthaelt pro Bild:
account_index, topic, folder, file, style, caption_hint.

## Einbau in seed_db.py (Vorschlag)

Bilder liegen unter MEDIA_ROOT/posts/seed/<ordner>/. Damit reicht es,
den relativen Pfad direkt in das ImageField zu schreiben:

```python
import json
from pathlib import Path
from django.conf import settings

SEED_DIR = Path(settings.MEDIA_ROOT) / 'posts' / 'seed'
MANIFEST = json.loads((SEED_DIR / 'manifest.json').read_text())

# nach account_index gruppieren -> 10 Buckets mit je 4 Bildern
buckets = {}
for entry in MANIFEST:
    buckets.setdefault(entry['account_index'], []).append(entry)

# in der User-Schleife: jedem User ein Themen-Bucket zuweisen
for idx, user in enumerate(users, start=1):
    images = buckets[idx]
    for entry in images[:random.randint(POSTS_PER_USER_MIN, POSTS_PER_USER_MAX)]:
        Post.objects.create(
            owner=user,
            caption=fake.text(max_nb_chars=200),
            image=f"posts/seed/{entry['folder']}/{entry['file']}",
        )
```

Hinweis: `image=<str>` setzt nur den Pfad, es wird keine Datei kopiert -
genau richtig fuer einen Seed. Wer echte Uploads simulieren will, nutzt
stattdessen `django.core.files.File` und `post.image.save(...)`.

## Themen

- 01 CONTAINERS & IMAGES (01-containers)
- 02 CI / CD PIPELINES (02-cicd)
- 03 INFRASTRUCTURE AS CODE (03-iac)
- 04 GOOGLE CLOUD PLATFORM (04-gcp)
- 05 APPLICATION SECURITY (05-appsec)
- 06 KUBERNETES & GITOPS (06-kubernetes)
- 07 OBSERVABILITY (07-observability)
- 08 LANGUAGES & TOOLING (08-languages)
- 09 SUPPLY CHAIN SECURITY (09-supply-chain)
- 10 OFFENSIVE SECURITY (10-offensive)

Alle Motive sind Eigenentwuerfe (Typografie + Geometrie), keine Herstellerlogos.
