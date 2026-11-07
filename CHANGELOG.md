# Changelog

## 1.0.1 – 2026-11-07
- MIDI: Fußschalter werden robuster erkannt. Jeder CC-Wert > 0 zählt als Tritt, auch bei Controllern, die immer denselben Wert oder keinen Loslass-Wert senden.
- MIDI-Learn akzeptiert jeden Wert.
- Diagnose: Zähler der empfangenen MIDI-Nachrichten; klarere Meldung bei verweigertem Zugriff.

## 1.0.0 – 2026-11-07
Erste Veröffentlichung / First release
- A/B-Loop mit ziehbaren Grenzen, Zoom und Feinkorrektur
- Tempo 25–200 % ohne Tonhöhenänderung, Schnellwahl, Speed-Trainer, Pause zwischen Durchgängen
- Gespeicherte Loops pro Video
- MIDI-Fußsteuerung mit MIDI-Learn (CC/Note/PC, Taster/rastend), Smart-Taste, Expression-Pedal → Tempo
- Tastaturkürzel (Alt/⌥)
- Manueller Sprung aus dem Loop-Bereich schaltet den Loop automatisch aus
