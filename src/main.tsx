import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("APP START");

createRoot(document.getElementById("root")!).render(<App />);
