import { BrowserRouter, Route, Routes } from "react-router-dom";
import Home from "./pages/Home.tsx";
import Register from "./pages/Register.tsx";
import Admin from "./pages/Admin.tsx";
import Judge from "./pages/Judge.tsx";
import Leaderboard from "./pages/Leaderboard.tsx";
import Stage from "./pages/Stage.tsx";

// All four phases are in. This file stays the one place that says what exists.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/judge" element={<Judge />} />
        <Route path="/stage" element={<Stage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  );
}
