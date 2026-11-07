# Riff Looper – Anleitung

## Erste Schritte
Öffne ein beliebiges YouTube-Video. Oben links im Player erscheint das Panel **🎸 Riff Looper**. Du kannst es an der Kopfzeile verschieben und mit ▾ einklappen (oder Alt+G drücken). Es funktioniert auch im Vollbild.

## Bedienung

| Element | Funktion |
|---|---|
| **[ A** / **B ]** | Start- und Endpunkt an der aktuellen Position setzen. Mit B startet der Loop automatisch. |
| Timeline | Klicken springt an die Stelle. Die gelben (A) und blauen (B) Griffe lassen sich ziehen. |
| **🔍 Zoom** | Die Timeline zeigt nur noch den Loop-Bereich, damit man die Griffe auch bei langen Videos fein ziehen kann. |
| **− / +** neben A/B | Grenze um 0,1 s verschieben (mit Shift: 1 s). Bei B wird kurz vor dem Ende angespielt, damit man den Schnitt hört. |
| **⟲ Loop** | Loop an/aus. Der Zähler oben zeigt die Durchgänge. |
| Tempo | Regler 25–200 %, Schritte ±5 %, Vorgaben 50–100 %. Doppelklick auf die Prozentzahl setzt 100 %. |
| 💾 Speichern | Speichert den Loop samt Tempo für dieses Video. Ein Klick auf einen gespeicherten Loop lädt ihn. |

Wenn du bei laufendem Loop an eine Stelle außerhalb des Loops springst (Timeline, YouTube-Fortschrittsbalken), schaltet sich der Loop automatisch aus. Mit ⟲ Loop kommst du zurück.

## ⚙ Üben
- **Pause zwischen Durchgängen**: Zeit zum Durchatmen bzw. Umgreifen vor dem nächsten Durchgang.
- **A-Vorlauf**: A wird etwas früher gesetzt, als du drückst oder trittst. Das gleicht die Reaktionszeit aus, damit der erste Ton nicht abgeschnitten wird.
- **Speed-Trainer**: z. B. +5 % alle 3 Durchgänge, bis 100 % erreicht sind. Beginn etwa bei 60 %.

## Tastatur (Alt bzw. ⌥ + Taste)
| Taste | Funktion |
|---|---|
| A / B | A bzw. B setzen |
| L | Loop an/aus |
| S | Smart (A → B → aus) |
| J | Zurück zu A |
| ↑ / ↓ | Tempo ±5 % |
| , / . | Vorheriger / nächster gespeicherter Loop |
| Z | Zoom |
| G | Panel ein-/ausklappen |

## 🎛 MIDI-Fußschalter
1. Fußschalter per USB (oder über ein MIDI-Interface) anschließen, dann die YouTube-Seite neu laden.
2. Im Panel **🎛 MIDI-Fußschalter** aufklappen und **MIDI verbinden** klicken. Der Browser fragt einmalig, ob youtube.com auf MIDI-Geräte zugreifen darf: **Zulassen**.
3. Bei der gewünschten Funktion **Lernen** klicken und den Schalter treten. Fertig. Die Zuordnung wird gespeichert und gilt für alle Videos.

Unterstützt werden Control Change (CC), Note-On und Program Change. Unter „Letzte Nachricht“ siehst du, was dein Gerät sendet.

**Auswertung (bei CC):**
- *Standard*: Jeder Wert über 0 zählt als Tritt, der Loslass-Wert 0 wird ignoriert. Das passt für die meisten Fußschalter.
- *Jede Nachricht = Tritt*: für rastende Schalter, die abwechselnd 127 und 0 senden. Hier umstellen, falls nur jeder zweite Tritt wirkt.

**Empfohlene Belegungen**
- **Ein Schalter:** *Smart-Taste*. 1. Tritt = A, 2. Tritt = B und Loop läuft, 3. Tritt = Loop aus. Danach beginnt es wieder von vorn.
- **Zwei Schalter:** Smart-Taste + *Zurück zu A* (oder Play/Pause).
- **Vier Schalter:** Smart-Taste, Zurück zu A, Tempo −5 %, Tempo +5 %.
- **Expression-Pedal:** *Expression-Pedal → Tempo*, z. B. Bereich 40–100 %.

Die MIDI-Steuerung funktioniert auch, wenn ein anderes Fenster im Vordergrund ist. Der YouTube-Tab sollte aber sichtbar sein, sonst drosselt der Browser die Wiedergabe.

## Fehlersuche
- **Kein Panel zu sehen:** Seite neu laden. Unter `chrome://extensions` prüfen, ob die Erweiterung aktiv ist.
- **„kein Gerät gefunden“:** Gerät vor dem Laden der Seite anschließen, dann neu laden. Auf dem Mac prüfen, ob das Gerät im Programm *Audio-MIDI-Setup* erscheint.
- **„Zugriff verweigert“:** Auf das Schloss-Symbol links in der Adressleiste klicken, MIDI-Geräte auf *Zulassen* stellen, neu laden.
- **Werbung:** Während eines Werbespots ist der Loop pausiert.
- **Safari / Firefox** werden derzeit nicht unterstützt. Getestet sind Chrome, Edge und Brave.
