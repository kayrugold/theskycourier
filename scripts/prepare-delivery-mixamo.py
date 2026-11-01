"""Reuse the verified mesh-only, explicit-diffuse Mixamo packaging workflow."""
from pathlib import Path
import zipfile

template = Path(__file__).with_name('prepare-packagethief-mixamo.py').read_text()
for name in ['package_giver', 'package_receiver']:
    root=Path(__file__).resolve().parents[1]/'assets/characters'/name
    destination=root/name
    with zipfile.ZipFile(root/(name+'.zip')) as archive:
        for member in archive.infolist():
            target=(destination/member.filename).resolve()
            assert target.is_relative_to(destination.resolve()), 'Unsafe archive path'
        archive.extractall(destination)
    script = template.replace('packagethief', name).replace('PackageThief', name)
    exec(compile(script, __file__, 'exec'), {'__file__': __file__})
