# Animaciones de revelación archivadas

Estas animaciones se quitaron de `modulos/competencia/competencia.html` pero se conservan aquí para usarlas después.

- v4.29: `titanes.css` / `titanes.js` («Duelo de Titanes») y `arcade.css` / `arcade.js` («Arcade 8 bits»).
- v4.33: `baraja.css` / `baraja.js` («La Baraja»), `lluvia.css` / `lluvia.js` («Lluvia de cartas») y `ruleta.css` / `ruleta.js` («Ruleta»).

Hoy la única propuesta activa es el **Abanico** (`introAb` / `duelAb`).

Cómo volver a activar una:
1. Pega el CSS dentro del `<style>` de `competencia.html` y el JS junto a las otras funciones `intro*/duel*` (justo antes de `const INTRO=`).
2. Agrega su `intro` y su `duel` a los arreglos `INTRO` y `DUEL`, y su nombre a `RV_NAMES`.
3. Usan las funciones comunes (`rvSide`, `rvQ`, `rvImpact`, `rvSmoke`, `rvCap`, `rvRtag`, `rvRec`, `SFX`). Las de cartas también usan `BJ_IMG`, `bjCard`, `bjFrame` y `bjBurst`; la Ruleta además usa `fnFly`, `fnFlip` y `fnW` (del Abanico). Si cambian, hay que ajustarlas.
4. Arcade usa la fuente «Press Start 2P» (revisa que el HTML la cargue).
5. Los `data-t` del CSS (`#rv[data-t="N"]`) deben coincidir con la posición en `RV_NAMES`. Ojo: desde la v4.33 el tamaño base (`--fnw` y `--bjw`) es el del Abanico; las propuestas que necesiten otra medida deben fijarla bajo su `data-t`. Las medidas originales de la Baraja están en `baraja.css`.
6. Lluvia y Ruleta se escribieron cuando la carta con foto medía igual que el abanico (antes de la v4.33, `--bjw` = `--fnw`). Si se reactivan, conviene poner `--bjw:var(--fnw)` bajo su `data-t`.
