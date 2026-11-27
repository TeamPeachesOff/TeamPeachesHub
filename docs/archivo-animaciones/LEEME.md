# Animaciones de revelación archivadas

Estas animaciones se quitaron de `modulos/competencia/competencia.html` en la v4.29 pero se conservan aquí para usarlas después.

- `titanes.css` / `titanes.js`: «Duelo de Titanes» (pulso, rayos, VS).
- `arcade.css` / `arcade.js`: «Arcade 8 bits» (Peaches Fighters, selección de luchador).

Cómo volver a activarlas:
1. Pega el CSS dentro del `<style>` de `competencia.html` y el JS junto a las otras funciones `intro*/duel*` (justo antes de `const INTRO=`).
2. Agrega `introN` y `duelN` a los arreglos `INTRO` y `DUEL`, y su nombre a `RV_NAMES`.
3. Usan las funciones comunes (`rvSide`, `rvQ`, `rvImpact`, `rvSmoke`, `rvCap`, `rvRtag`, `rvRec`, `SFX`). Si cambian, hay que ajustarlas.
4. Arcade usa la fuente «Press Start 2P» (revisa que el HTML la cargue).
5. Los `data-t` del CSS (`#rv[data-t="0"]`, `#rv[data-t="3"]`) deben coincidir con la posición en `RV_NAMES`.
