import type { CSSProperties } from "react";
import { loadFont as loadPlayfair } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";

export const FPS = 30;
export const BPM = 112;

// Beat number → frame. Every timing in the reel is written as a shotlist beat
// (core/shotlist.md), so the code and the shotlist can be read side by side.
export const b = (beat: number) => Math.round((beat * 60 * FPS) / BPM);
export const DURATION = b(56);

// Copied from src/index.css so the reel and the app share one palette.
export const C = {
  base: "#210100",
  primary: "#8C0902",
  secondary: "#B14136",
  gold: "#E6A341",
  goldLight: "#FECE79",
  text: "#FBF3E7",
};

export const textA = (o: number) => `rgb(251 243 231 / ${o})`;
export const goldA = (o: number) => `rgb(230 163 65 / ${o})`;

export const R = { button: 12, card: 20, pill: 999 };

const glassBase: CSSProperties = {
  backdropFilter: "blur(16px)",
  border: "1px solid rgb(255 255 255 / 0.15)",
};
export const glass: CSSProperties = { ...glassBase, background: "rgb(255 255 255 / 0.08)" };
export const glassDense: CSSProperties = { ...glassBase, background: "rgb(255 255 255 / 0.14)" };

// The app's body::before wash, so every mock screen sits on the same stage.
export const screenBg = [
  "radial-gradient(ellipse 90% 55% at 50% -10%, rgb(140 9 2 / 0.55), transparent 70%)",
  "radial-gradient(ellipse 70% 45% at 50% 105%, rgb(177 65 54 / 0.22), transparent 70%)",
  C.base,
].join(", ");

// Reel type follows the shotlist (Playfair + Inter); the mock screens use the
// app's own faces (Oswald + Archivo Black) so they read as the real thing.
export const F = {
  playfair: loadPlayfair("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily,
  inter: loadInter("normal", { weights: ["400", "600"], subsets: ["latin"] }).fontFamily,
  display: loadOswald("normal", { weights: ["600"], subsets: ["latin"] }).fontFamily,
  heavy: loadArchivoBlack("normal", { weights: ["400"], subsets: ["latin"] }).fontFamily,
};
