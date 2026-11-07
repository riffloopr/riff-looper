# Checkliste: Veröffentlichung im Chrome Web Store und bei Edge Add-ons

Alle Texte zum Hineinkopieren stehen unten. Die Platzhalter in eckigen Klammern musst du vorher ausfüllen.

## 0. Vorbereitung (einmalig)

- [ ] Eine **eigene E-Mail-Adresse** für das Projekt anlegen, z. B. riff.looper@gmail.com. Sie wird im Store öffentlich als Kontakt angezeigt.
- [ ] Diese Adresse in `PRIVACY.md` an beiden Stellen bei „[E-Mail-Adresse eintragen]“ eintragen.
- [ ] Ein **GitHub-Repository** anlegen und den Inhalt dieses Ordners hochladen (siehe Abschnitt „GitHub“ ganz unten).
- [ ] Die URL der Datenschutzerklärung notieren: `https://github.com/[DEIN-GITHUB-NAME]/riff-looper/blob/main/PRIVACY.md`
- [ ] Das Upload-Paket bauen: `./scripts/build.sh` erzeugt `dist/riff-looper-1.0.0.zip`. Darin liegt `manifest.json` direkt auf oberster Ebene, wie der Store es verlangt.
- [ ] Vor dem Einreichen einige Tage selbst auf dem echten YouTube testen, idealerweise auch mit 2–3 Testpersonen und anderen Fußschaltern.

## 1. Chrome Web Store

1. https://chrome.google.com/webstore/devconsole aufrufen, mit dem Projekt-Google-Konto anmelden, die Entwicklervereinbarung akzeptieren und die **einmalige Gebühr von 5 US-Dollar** zahlen.
2. Im Konto (Account) die Kontakt-E-Mail eintragen und bestätigen.
3. **Händlerstatus (EU):** „Nicht-Händler“ (non-trader) wählen. Das gilt, solange die Erweiterung kostenlos ist und du damit kein Geschäft betreibst.
4. **„Neues Element“** wählen und `dist/riff-looper-1.0.0.zip` hochladen.

### Tab „Store-Eintrag“
| Feld | Inhalt |
|---|---|
| Beschreibung | Aus `listing-de.md` (Abschnitt „Ausführliche Beschreibung“) |
| Kategorie | **Bildung** (Education). Alternativ „Unterhaltung“. |
| Sprache | Deutsch. Danach unter „Sprachen“ zusätzlich **Englisch** hinzufügen und die Beschreibung aus `listing-en.md` einfügen. |
| Store-Symbol | `extension/icons/icon128.png` |
| Screenshots | `screenshots/01-loop.png`, `02-midi.png`, `03-trainer.png` (je 1280×800) |
| Kleine Werbekachel | `promo-small-440x280.png` |
| Marquee-Kachel (optional) | `promo-marquee-1400x560.png` |
| Offizielle URL / Homepage | `https://github.com/[DEIN-GITHUB-NAME]/riff-looper` |
| Support-URL | `https://github.com/[DEIN-GITHUB-NAME]/riff-looper/issues` |

### Tab „Datenschutz“ (Privacy practices)
**Einziger Zweck (Single purpose):**
> Riff Looper hilft beim Üben von Musikinstrumenten mit YouTube-Videos: Es stellt im YouTube-Player ein Bedienfeld bereit, mit dem man Abschnitte in Schleife abspielen, das Tempo ändern und diese Funktionen per Tastatur oder MIDI-Fußschalter steuern kann.

**Begründung für die Berechtigung `storage`:**
> Speichert die Einstellungen des Nutzers, seine MIDI-Zuordnungen und die von ihm benannten Loops pro Video lokal im Browser, damit sie beim nächsten Besuch erhalten bleiben.

**Begründung für den Host-Zugriff (`https://www.youtube.com/*`, über das Content Script):**
> Das Bedienfeld wird in den YouTube-Player eingefügt und steuert dort das Video-Element (Abspielposition, Wiedergabegeschwindigkeit). Ohne Zugriff auf youtube.com kann die Erweiterung ihren einzigen Zweck nicht erfüllen. Es werden keine Seiteninhalte ausgelesen oder übertragen.

**Remote-Code:** „Nein, ich verwende keinen Remote-Code.“

**Datennutzung:** **Keine** der Datenkategorien ankreuzen. Danach die drei Erklärungen bestätigen (kein Verkauf an Dritte, keine zweckfremde Nutzung, keine Nutzung zur Kreditwürdigkeitsprüfung).

**Datenschutzerklärung (URL):** `https://github.com/[DEIN-GITHUB-NAME]/riff-looper/blob/main/PRIVACY.md`

### Tab „Vertrieb“ (Distribution)
- Sichtbarkeit: **Öffentlich**. Für einen Testlauf mit Freunden vorher „Nicht gelistet“ wählen; dann kann nur installieren, wer den Link hat.
- Regionen: alle

5. **„Zur Überprüfung senden“** klicken. Die Prüfung dauert meist wenige Tage. Den Status siehst du im Dashboard, außerdem kommt eine E-Mail.

## 2. Microsoft Edge Add-ons (kostenlos)

1. https://partner.microsoft.com/dashboard/microsoftedge/overview aufrufen, mit einem Microsoft- oder GitHub-Konto registrieren und als Kontotyp **„Individual“** wählen.
2. **„Create new extension“** wählen und dieselbe ZIP-Datei hochladen.
3. Verfügbarkeit: „Public“, alle Märkte
4. Eigenschaften:
   - Kategorie: „Entertainment“ oder „Education“
   - Datenschutzerklärung erforderlich: **Ja**, dieselbe URL wie bei Chrome
   - Website und Support-URL wie bei Chrome
5. Store-Eintrag:
   - Deutsch und Englisch, dieselben Texte und Bilder wie bei Chrome
   - Store-Logo: `docs/logo512.png` oder `icon128.png`
   - Kleine Kachel: `promo-small-440x280.png`
6. Bei „Notes for certification“ zum Beispiel eintragen:
   > Open any YouTube video page. The panel appears in the top-left corner of the player. MIDI is optional; all features also work with the on-screen buttons.
7. Absenden. Die Zertifizierung dauert bis zu 7 Werktage.

## 3. Updates veröffentlichen

1. In `extension/manifest.json` die `version` erhöhen (z. B. 1.0.1) und `CHANGELOG.md` ergänzen.
2. `./scripts/build.sh` ausführen.
3. Im Chrome-Dashboard unter „Paket“ die neue ZIP hochladen und einreichen. Bei Edge funktioniert das genauso über „Update“.
4. Die Nutzer erhalten das Update automatisch.

## Hinweise zu häufigen Ablehnungsgründen

- **Markenname:** „YouTube“ steht nur beschreibend am Ende des Namens („für YouTube“). So handhaben es viele Erweiterungen. Falls Google trotzdem beanstandet, den Namen auf „Riff Looper – Gitarren-Loop-Trainer“ ändern (in beiden `_locales/*/messages.json`).
- **Screenshots** zeigen kein fremdes Video und keine YouTube-Logos, sondern ein selbst gezeichnetes Motiv. Das bitte so lassen.
- **Beschreibung und Funktion müssen übereinstimmen.** Neue Funktionen also immer auch in der Beschreibung ergänzen.

## GitHub einrichten

Der Ordner ist bereits ein Git-Repository mit einem ersten Commit.

**Variante Terminal** (Mac):
1. Auf github.com → **New repository**, Name `riff-looper`, **Public**, *ohne* README/Lizenz anlegen.
2. Im Terminal:
   ```bash
   cd ~/Pfad/zu/riff-looper
   git remote add origin https://github.com/[DEIN-GITHUB-NAME]/riff-looper.git
   git push -u origin main
   ```
3. Erstes Release: auf GitHub **Releases → Draft a new release**, Tag `v1.0.0`, `dist/riff-looper-1.0.0.zip` anhängen und veröffentlichen.

**Variante ohne Terminal:** GitHub Desktop installieren, über *File → Add local repository* den Ordner wählen und *Publish repository* klicken. Dabei „Keep this code private“ abwählen.

Nach dem Upload ist die Datenschutzerklärung unter
`https://github.com/[DEIN-GITHUB-NAME]/riff-looper/blob/main/PRIVACY.md` erreichbar.
Sobald die Store-Links da sind, trägst du sie in der `README.md` bei „Installation“ ein.
