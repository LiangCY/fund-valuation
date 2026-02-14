import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Market from "@/pages/Market";
import DCA from "@/pages/DCA";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/market" element={<Market />} />
          <Route path="/dca" element={<DCA />} />
        </Route>
      </Routes>
    </Router>
  );
}
