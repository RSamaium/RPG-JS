# Blackscreen-Fehler Diagnose

## Identifizierte Probleme

### 1. **Fade-Komponente Timing-Problem**
- In `config.client.ts` wird die Fade-Komponente mit 5000ms Dauer angezeigt
- Nach Login wird `gui.display('fade', { fadeIn: false, duration: 5000 })` aufgerufen
- Das Problem: `fadeIn: false` bedeutet, dass der Fade NICHT eingeblendet wird, sondern der Bildschirm schwarz bleibt
- Die Komponente wartet dann 5 Sekunden, bevor sie versteckt wird

### 2. **Scene-Rendering-Verzögerung**
- In `sceneMap.onAfterLoading` wird `await new Promise(resolve => setTimeout(resolve, 5000))` aufgerufen
- Dies verzögert das Rendering um 5 Sekunden nach dem Laden der Map

### 3. **Fehlende Canvas-Größen-Initialisierung**
- In `fade.ce` wird `element.props.context.canvasSize()` aufgerufen, aber die Canvas-Größe könnte nicht initialisiert sein

## Lösungen

1. **Fade-Logik korrigieren**: `fadeIn: true` setzen, um den Fade korrekt einzublenden
2. **Timing optimieren**: Verzögerung auf 1000ms reduzieren
3. **Canvas-Größe sicherstellen**: Fallback-Werte hinzufügen
4. **Mobile-Responsivität**: Canvas-Größe an Viewport anpassen
