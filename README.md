# Enfrentá tu miedo — Feria de Ciencias

Experiencia web de 4 pasos + consigna de dibujo **en papel**. No usa frameworks, npm, CDNs, analíticas ni recursos externos. No guarda datos de los estudiantes.

## Preparación (una sola vez, antes de la feria)

1. El video local debe estar en `assets/video/bogart.mp4` (preferentemente H.264 + AAC, contenedor MP4). La app lo reproduce con controles nativos, intenta iniciarlo al entrar a la escena y avanza al terminar. Si el navegador bloquea la reproducción automática con audio, aparece el botón «Reproducir escena». Si falta, aparece una pantalla informativa y se puede continuar sin él.
2. Para usar las tipografías previstas, conseguí los archivos oficiales de **Cormorant Garamond** y **Work Sans** (por ejemplo, del repositorio Google Fonts, licencia OFL) y guardalos con estos nombres exactos:
   - `assets/fonts/CormorantGaramond-Regular.ttf`
   - `assets/fonts/CormorantGaramond-Italic.ttf`
   - `assets/fonts/WorkSans-Regular.ttf`
   - `assets/fonts/WorkSans-SemiBold.ttf`
   Los archivos **no vienen incluidos**. La web igualmente funciona offline sin ellos, con alternativas del sistema: Georgia y Arial. No hace ninguna consulta a Google Fonts.
3. Probá la reproducción del video y el audio con el navegador y los parlantes de la notebook.

## Abrir la experiencia

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
python3 server.py
```

Abrí `http://127.0.0.1:8000` en Chrome. En Windows, el comando puede ser `py server.py`. Este servidor incluido responde solicitudes HTTP Range para que el navegador pueda cargar y recorrer el MP4 eficazmente. Si Python no está instalado, **instalalo antes de llevar la notebook**; durante la feria no se requiere internet. No abras el HTML directamente con `file://`.

### Modo kiosco opcional

Con el servidor ya ejecutándose, en Linux:

```bash
google-chrome --kiosk --no-first-run --disable-session-crashed-bubble http://127.0.0.1:8000
```

En Windows, usando Chrome instalado en la ubicación habitual:

```powershell
& 'C:\Program Files\Google\Chrome\Application\chrome.exe' --kiosk --no-first-run --disable-session-crashed-bubble http://127.0.0.1:8000
```

Para salir del modo kiosco: `Alt+F4` (Linux o Windows). Para volver a portada desde la app, botón «Volver al inicio» o tecla `Esc`.

## Publicación en GitHub Pages

El proyecto está preparado para GitHub Pages sin compilación: las rutas de recursos son relativas y el flujo de `.github/workflows/deploy-pages.yml` se ejecuta manualmente desde la pestaña **Actions**.

Antes de publicar:

1. Confirmá por escrito que `assets/video/bogart.mp4` puede distribuirse públicamente por Internet. Una autorización para proyectarlo en la feria no alcanza necesariamente.
2. Si existe autorización, agregalo al repositorio y verificá que el archivo (aprox. 63 MB) siga por debajo del límite de 100 MB de GitHub. GitHub Pages lo sirve como archivo estático; no usar Git LFS para este caso.
3. Creá o vinculá el repositorio, subí la rama principal y habilitá **Settings → Pages → Build and deployment → GitHub Actions**. Luego ejecutá el workflow **Deploy static site to GitHub Pages**.
4. Comprobá la URL que GitHub muestra al finalizar el despliegue; será `https://<usuario>.github.io/<repositorio>/`. No la supongas antes de ese paso.

Mientras el video esté excluido, la página publicada sigue siendo navegable: muestra el aviso de escena no disponible y permite continuar. Esto sirve para revisar la interfaz sin distribuir el audiovisual.

## Próxima etapa: aplicación local para macOS

No está implementada todavía. Deberá reutilizar esta misma experiencia y sus recursos, abrirse con doble clic, funcionar sin red ni caché y reproducir `bogart.mp4` localmente. Evaluar una aplicación `.app` nativa o un contenedor liviano antes de considerar Electron.

## Comportamiento en el stand

- No es necesario tocar la pantalla: todos los controles son para mouse/trackpad.
- Mientras el video se reproduce no se cuenta la inactividad.
- Reinicio tras **60 segundos** sin interacción en las pantallas intermedias. Aparece una advertencia los últimos 15 segundos.
- La consigna final de dibujo en **papel** permanece durante **5 minutos** sin interacción, para no interrumpir la actividad.
- La portada permanece visible indefinidamente.
- Al reiniciar se pausa el video, vuelve al principio y se restaura la esfera/hechizo.
- No requiere internet: todos los recursos están referenciados localmente, incluido el efecto gráfico de partículas.

## Archivos

- `index.html`: pantallas y contenido.
- `styles.css`: diseño y fuentes locales.
- `script.js`: navegación, efectos y tiempos.
- `server.py`: servidor local offline con soporte para video MP4 y HTTP Range.
- `assets/video/`: `bogart.mp4` y portada de reserva. Verificá los permisos de distribución antes de incluir el video en un repositorio público, GitHub Pages o paquetes publicados.
- `assets/fonts/`: tipografías locales opcionales.

## Verificación final antes del evento

Desactivá Wi-Fi y datos, reiniciá el navegador, levantá el servidor y recorré todas las pantallas. Verificá que el video se escuche, que al terminar avance, que el hechizo se active una sola vez y que el reinicio borre el estado anterior. Mantené la notebook enchufada y desactivá la suspensión automática durante la feria.

**Nota:** el material audiovisual, su uso y eventuales permisos son responsabilidad de quien organiza la actividad. La explicación educativa usa una metáfora; no presenta el hechizo como tratamiento clínico.
